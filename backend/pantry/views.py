from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from common.idempotency import replayable
from meals.serializers import MealQuerySerializer
from pantry import services
from pantry.models import CookingLog, HistoryEntry, PantryCheck, PantryItem, SavedPreferences
from pantry.serializers import CookingWrite, PantryWrite, StockAction


class PantryView(APIView):
    def get(self, request, pk=None):
        rows = PantryItem.objects.filter(owner=request.user).select_related("food", "custom_food")
        if pk is not None:
            return Response(services.item_data(get_object_or_404(rows, pk=pk)))
        return Response({"items": [services.item_data(item) for item in rows.order_by("pk")]})

    @replayable
    def post(self, request):
        serializer = PantryWrite(data=request.data, context={"owner": request.user})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            item = PantryItem.objects.create(owner=request.user, **serializer.validated_data)
        return Response(services.item_data(item), status=201)

    def patch(self, request, pk):
        with transaction.atomic():
            item = get_object_or_404(PantryItem, owner=request.user, pk=pk)
            serializer = PantryWrite(
                item, data=request.data, partial=True, context={"owner": request.user}
            )
            serializer.is_valid(raise_exception=True)
            for key, value in serializer.validated_data.items():
                setattr(item, key, value)
            item.save(update_fields=[*serializer.validated_data.keys(), "updated_at"])
        return Response(services.item_data(item))

    def delete(self, request, pk):
        with transaction.atomic():
            get_object_or_404(PantryItem, owner=request.user, pk=pk).delete()
        return Response(status=204)


class StockView(APIView):
    @replayable
    def post(self, request, pk, action):
        if action == "undo":
            field = serializers.IntegerField(min_value=1)
            identifier = field.run_validation(request.data.get("historyEntry"))
            return Response(services.undo_stock(request.user, pk, identifier))
        serializer = StockAction(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            services.mark_stock(
                request.user,
                pk,
                serializer.validated_data,
                "used" if action == "mark-used" else "discarded",
            )
        )


class CookingReviewView(APIView):
    def get(self, request):
        serializer = MealQuerySerializer(data={"servings": request.query_params.get("servings", 2)})
        serializer.is_valid(raise_exception=True)
        return Response(
            services.cooking_review(
                request.user,
                request.query_params.get("recipe"),
                serializer.validated_data["servings"],
            )
        )


class CookingView(APIView):
    def post(self, request):
        key = serializers.UUIDField().run_validation(request.headers.get("Idempotency-Key"))
        serializer = CookingWrite(data=request.data)
        serializer.is_valid(raise_exception=True)
        result, created = services.cook(request.user, key, serializer.validated_data)
        return Response(result, status=201 if created else 200)

    def get(self, request, pk):
        return Response(get_object_or_404(CookingLog, owner=request.user, pk=pk).response_snapshot)


class HistoryPages(CursorPagination):
    page_size = 20
    page_size_query_param = "limit"
    max_page_size = 50
    ordering = "-created_at"


class HistoryView(APIView):
    def get(self, request, pk=None):
        rows = HistoryEntry.objects.filter(owner=request.user)
        if pk is not None:
            return Response(services.history_data(get_object_or_404(rows, pk=pk)))
        if "kind" in request.query_params:
            kind = serializers.ChoiceField(choices=["used", "discarded"]).run_validation(
                request.query_params["kind"]
            )
            rows = rows.filter(kind=kind)
        pages = HistoryPages()
        entries = pages.paginate_queryset(rows, request)
        link = pages.get_next_link()
        from urllib.parse import parse_qs, urlparse

        cursor = parse_qs(urlparse(link).query)["cursor"][0] if link else None
        return Response(
            {"results": [services.history_data(entry) for entry in entries], "next": cursor}
        )

    def delete(self, request, pk):
        get_object_or_404(HistoryEntry, owner=request.user, pk=pk).delete()
        return Response(status=204)


class SavedFilters(MealQuerySerializer):
    vegetarian = serializers.BooleanField(default=False)
    favorites = serializers.BooleanField(default=False)
    cuisine = serializers.ChoiceField(
        choices=["american", "korean", "indian", "brazilian"], allow_null=True, required=False
    )
    mealType = serializers.ChoiceField(
        choices=["breakfast", "lunch", "dinner", "side"], allow_null=True, required=False
    )

    def validate(self, attrs):
        return attrs


class PreferencesWrite(serializers.Serializer):
    defaultFilters = SavedFilters()
    theme = serializers.ChoiceField(choices=["system", "light", "dark"])
    lastFilter = serializers.DictField(required=False, default=dict)

    def validate_defaultFilters(self, value):
        from catalog.models import Food

        if set(value.get("avoid", [])) - set(Food.objects.values_list("pk", flat=True)):
            raise serializers.ValidationError("Select known foods.")
        return value


class PreferencesView(APIView):
    def get(self, request):
        row = SavedPreferences.objects.filter(owner=request.user).first()
        defaults = MealQuerySerializer(data={})
        defaults.is_valid(raise_exception=True)
        return Response(
            {
                "defaultFilters": row.default_filters if row else defaults.validated_data,
                "theme": row.theme if row else "system",
                "lastFilter": row.last_filter if row else {},
            }
        )

    def put(self, request):
        serializer = PreferencesWrite(data=request.data)
        serializer.is_valid(raise_exception=True)
        value = serializer.validated_data
        SavedPreferences.objects.update_or_create(
            owner=request.user,
            defaults={
                "default_filters": value["defaultFilters"],
                "theme": value["theme"],
                "last_filter": value["lastFilter"],
            },
        )
        return Response(value)


class CheckWrite(serializers.Serializer):
    kind = serializers.ChoiceField(choices=["whole", "selected"])
    items = serializers.ListField(child=serializers.IntegerField(min_value=1), default=list)


class ChecksView(APIView):
    @replayable
    def post(self, request):
        serializer = CheckWrite(data=request.data)
        serializer.is_valid(raise_exception=True)
        value = serializer.validated_data
        with transaction.atomic():
            items = list(PantryItem.objects.filter(owner=request.user, pk__in=value["items"]))
            if {item.pk for item in items} != set(value["items"]):
                raise serializers.ValidationError({"items": "Select known pantry items."})
            row = PantryCheck.objects.create(owner=request.user, kind=value["kind"])
            row.items.set(items)
        return Response({"id": row.pk, "kind": row.kind, "checkedAt": row.checked_at}, status=201)

    def get(self, request):
        last = (
            PantryCheck.objects.filter(owner=request.user, kind="whole")
            .order_by("-checked_at")
            .first()
        )
        edit = PantryItem.objects.filter(owner=request.user).order_by("-updated_at").first()
        return Response(
            {
                "lastWholeCheckAt": last.checked_at if last else None,
                "lastAnyEditAt": edit.updated_at if edit else None,
                "pantryCreatedAt": request.user.date_joined,
            }
        )
