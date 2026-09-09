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
from catalog.views import custom_data
from meals.serializers import MealsResponseSerializer
from meals.services import compose_meals
from pantry.models import CustomFood
from pantry.selectors import owned_stock
from recipes.models import Favorite


class MealsView(APIView):
    def get(self, request):
        pantry = owned_stock(request.user)
        preview = not pantry
        if preview:
            pantry = sample_stock()
        foods = reference_foods()
        foods.update(
            {
                f"custom:{food.pk}": custom_data(food)
                for food in CustomFood.objects.filter(owner=request.user)
            }
        )
        recipes = [
            recipe_input(recipe) for recipe in Recipe.objects.prefetch_related("ingredients").all()
        ]
        options = query_options(request.query_params, foods, pantry, recipes)
        favorite_ids = set(
            Favorite.objects.filter(owner=request.user).values_list("curated_recipe_id", flat=True)
        )
        result = compose_meals(
            recipes, pantry, foods, today=local_today(), favorite_ids=favorite_ids, **options
        )
        return Response(
            {
                **MealsResponseSerializer({**result, "isSample": False}).data,
                "preview": preview,
                "prompt": "add_real_food" if preview else None,
            }
        )
