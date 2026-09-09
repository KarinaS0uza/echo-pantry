"""Anonymous, rate-limited mutations of an isolated local demonstration pantry."""

from datetime import timedelta
from decimal import Decimal, InvalidOperation
from uuid import uuid4

from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from common.models import DemoState
from common.throttles import SampleThrottle
from sample.views import local_today


def seed_items():
    today = local_today()
    rows = [
        ("cherryTomatoes", "250", "g", "fridge", 1),
        ("burrata", "1", "item", "fridge", 2),
        ("basil", "1", "handful", "fridge", 2),
        ("pasta", "200", "g", "pantry", 180),
        ("garlic", "2", "cloves", "pantry", 14),
        ("oliveOil", "1", "tbsp", "pantry", 120),
        ("beans", "1", "can", "pantry", 180),
        ("lemon", "2", "whole", "fridge", 7),
        ("spinach", "150", "g", "fridge", 3),
    ]
    return [
        {
            "id": f"demo-{name}",
            "nameKey": f"demo.food.{name}",
            "quantity": quantity,
            "unit": unit,
            "storageLocation": location,
            "date": (today + timedelta(days=days)).isoformat(),
        }
        for name, quantity, unit, location, days in rows
    ]


def get_state():
    state, _ = DemoState.objects.get_or_create(pk=1, defaults={"items": seed_items()})
    return state


def payload(state):
    return {"items": state.items, "points": state.points, "mealsCooked": state.meals_cooked}


class IngredientSerializer(serializers.Serializer):
    nameKey = serializers.CharField(max_length=120)
    quantity = serializers.CharField(max_length=20)
    unit = serializers.CharField(max_length=24)
    storageLocation = serializers.ChoiceField(choices=["pantry", "fridge", "refrigerator", "freezer", "counter"])
    date = serializers.DateField(allow_null=True, required=False)

    def validate_quantity(self, value):
        try:
            number = Decimal(value)
            if not number.is_finite() or not 0 < number <= 999999:
                raise InvalidOperation
        except InvalidOperation as error:
            raise serializers.ValidationError("Enter a quantity greater than zero.") from error
        return value


class BatchSerializer(serializers.Serializer):
    entries = IngredientSerializer(many=True, allow_empty=False, max_length=30)
    requestId = serializers.CharField(max_length=100, required=False)


class CompletionSerializer(serializers.Serializer):
    dish = serializers.CharField(max_length=120)
    usedIds = serializers.ListField(child=serializers.CharField(max_length=100), max_length=100)
    completionId = serializers.CharField(max_length=100)


class DemoView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [SampleThrottle]


class DemoStateView(DemoView):
    def get(self, request):
        with transaction.atomic():
            return Response(payload(get_state()))


class DemoIngredientsView(DemoView):
    def post(self, request):
        serializer = BatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        entries = [
            {
                **row,
                "id": str(uuid4()),
                "date": row.get("date").isoformat() if row.get("date") else "",
            }
            for row in serializer.validated_data["entries"]
        ]
        with transaction.atomic():
            state = get_state()
            request_id = serializer.validated_data.get("requestId")
            signature = [
                {key: value for key, value in row.items() if key != "id"} for row in entries
            ]
            if request_id and request_id in state.ingredient_batches:
                if state.ingredient_batches[request_id] != signature:
                    raise ValidationError(
                        {"requestId": "This ingredient batch has already been saved."}
                    )
                return Response(payload(state))
            state.items = [*state.items, *entries]
            if request_id:
                state.ingredient_batches[request_id] = signature
            state.save()
            return Response(payload(state), status=201)


class DemoCompleteView(DemoView):
    def post(self, request):
        serializer = CompletionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        body = serializer.validated_data
        completion_id = body["completionId"]
        used_ids = sorted(set(body["usedIds"]))
        signature = {"dish": body["dish"], "usedIds": used_ids}
        with transaction.atomic():
            state = get_state()
            prior = state.completions.get(completion_id)
            if prior is not None and prior != signature:
                raise ValidationError({"completionId": "This completion has already been saved."})
            if prior is None:
                if set(used_ids) - {row["id"] for row in state.items}:
                    raise ValidationError(
                        {"usedIds": "Refresh your pantry and review the ingredients again."}
                    )
                state.items = [row for row in state.items if row["id"] not in used_ids]
                state.completions[completion_id] = signature
                state.points += 150
                state.meals_cooked += 1
                state.save()
            return Response({**payload(state), "pointsAwarded": 150})


class DemoResetView(DemoView):
    def post(self, request):
        with transaction.atomic():
            state = get_state()
            state.items = seed_items()
            state.completions = {}
            state.ingredient_batches = {}
            state.points = 0
            state.meals_cooked = 0
            state.save()
            return Response(payload(state))
