from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import CATEGORIES, FORMS
from catalog.selectors import reference_foods
from common.idempotency import replayable
from pantry.models import CustomFood


class CustomFoodWrite(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    category = serializers.ChoiceField(choices=CATEGORIES)
    form = serializers.ChoiceField(choices=FORMS, default="na")
    aliases = serializers.ListField(child=serializers.CharField(max_length=120), default=list)


def custom_data(food):
    return {
        "id": f"custom:{food.pk}",
        "name": food.name,
        "category": food.category,
        "form": food.form,
        "aliases": food.aliases,
        "defaultUnits": ["g", "ml", "item"],
        "isCustom": True,
    }


class FoodsView(APIView):
    def get(self, request):
        limit = serializers.IntegerField(min_value=1, max_value=500).run_validation(
            request.query_params.get("limit", 20)
        )
        foods = [{**food, "isCustom": False} for food in reference_foods().values()]
        foods.extend(custom_data(food) for food in CustomFood.objects.filter(owner=request.user))
        query = request.query_params.get("q", "").casefold()
        category = request.query_params.get("category")
        return Response(
            {
                "results": sorted(
                    [
                        food
                        for food in foods
                        if (not category or food["category"] == category)
                        and any(
                            query in name.casefold() for name in [food["name"], *food["aliases"]]
                        )
                    ],
                    key=lambda food: food["name"],
                )[:limit]
            }
        )

    @replayable
    def post(self, request):
        serializer = CustomFoodWrite(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            custom_data(CustomFood.objects.create(owner=request.user, **serializer.validated_data)),
            status=201,
        )
