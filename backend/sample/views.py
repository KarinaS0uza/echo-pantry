"""Anonymous reference-data reads. No owned table or mutation is reachable here."""

from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Recipe
from catalog.selectors import (
    local_today,
    query_options,
    recipe_input,
    reference_foods,
    sample_stock,
)
from common.throttles import SampleThrottle
from meals.serializers import MealsResponseSerializer
from meals.services import compose_meals, recipe_summary
from pantry.domain.urgency import urgency_tier


class SampleReadView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [SampleThrottle]
    http_method_names = ["get", "head", "options"]


class SamplePantryView(SampleReadView):
    def get(self, request):
        foods, today = reference_foods(), local_today()
        items = []
        for item in sample_stock():
            food = foods[item.pop("foodId")]
            items.append(
                {
                    **item,
                    "quantity": str(item["quantity"]),
                    "food": {key: food[key] for key in ("id", "name", "category")},
                    "urgency": {
                        "tier": urgency_tier(item["date"], today=today),
                        "daysRemaining": (item["date"] - today).days if item["date"] else None,
                    },
                }
            )
        return Response({"items": items, "isSample": True})


class SampleFoodsView(SampleReadView):
    def get(self, request):
        return Response(
            {
                "results": sorted(reference_foods().values(), key=lambda food: food["name"]),
                "isSample": True,
            }
        )


class SampleMealsView(SampleReadView):
    def get(self, request):
        foods, pantry = reference_foods(), sample_stock()
        recipes = [
            recipe_input(recipe) for recipe in Recipe.objects.prefetch_related("ingredients").all()
        ]
        options = query_options(request.query_params, foods, pantry, recipes)
        result = compose_meals(recipes, pantry, foods, today=local_today(), **options)
        return Response(MealsResponseSerializer({**result, "isSample": True}).data)


class RecipeListView(SampleReadView):
    def get(self, request):
        recipes = [
            recipe_input(recipe) for recipe in Recipe.objects.prefetch_related("ingredients").all()
        ]
        permitted = {"cuisine", "mealType", "maxTime", "vegetarian"}
        if set(request.query_params) - permitted:
            raise ValidationError({"filters": "Unknown recipe filter."})
        options = query_options(request.query_params, reference_foods(), [], recipes)
        result = compose_meals(recipes, [], reference_foods(), today=local_today(), **options)
        return Response(
            {
                "recipes": [
                    item["recipe"]
                    for group in ("completeMatches", "purchaseNeeded")
                    for item in result[group]
                ]
            }
        )


class RecipeDetailView(SampleReadView):
    def get(self, request, recipe_id):
        if set(request.query_params) - {"servings"}:
            raise ValidationError({"filters": "Unknown recipe filter."})
        options = query_options(request.query_params, {}, [], [])
        recipe = recipe_input(
            get_object_or_404(Recipe.objects.prefetch_related("ingredients"), pk=recipe_id)
        )
        foods = reference_foods()
        servings = options["servings"]
        scale = Decimal(servings) / Decimal(recipe["yieldServings"])
        ingredients = [
            {
                "food": line["foodId"],
                "name": foods[line["foodId"]]["name"],
                "amount": format(line["amount"] * scale, "f")
                if line["amount"] is not None
                else None,
                **{key: line[key] for key in ("unit", "optional", "toTaste", "preparation")},
            }
            for line in recipe["ingredients"]
        ]
        return Response(
            {**recipe_summary(recipe), "requestedServings": servings, "ingredients": ingredients}
        )
