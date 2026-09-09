from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Recipe
from recipes.models import Favorite, PersonalRecipe


def favorite_data(row):
    target = row.curated_recipe or row.personal_recipe
    return {
        "id": row.pk,
        "target": {
            "id": target.pk,
            "kind": "curated" if row.curated_recipe_id else "personal",
            "title": target.name,
        },
    }


class FavoritesView(APIView):
    def get(self, request, pk=None):
        rows = Favorite.objects.filter(owner=request.user).select_related(
            "curated_recipe", "personal_recipe"
        )
        if pk is not None:
            return Response(favorite_data(get_object_or_404(rows, pk=pk)))
        return Response({"favorites": [favorite_data(row) for row in rows]})

    def post(self, request):
        if bool(request.data.get("curatedRecipe")) == bool(request.data.get("personalRecipe")):
            raise ValidationError({"curatedRecipe": "Select exactly one recipe."})
        if request.data.get("personalRecipe"):
            recipe = get_object_or_404(
                PersonalRecipe, owner=request.user, pk=request.data["personalRecipe"]
            )
            target = {"personal_recipe": recipe}
        else:
            target = {
                "curated_recipe": get_object_or_404(Recipe, pk=request.data.get("curatedRecipe"))
            }
        row, created = Favorite.objects.get_or_create(owner=request.user, **target)
        return Response(favorite_data(row), status=201 if created else 200)

    def delete(self, request, pk):
        get_object_or_404(Favorite, owner=request.user, pk=pk).delete()
        return Response(status=204)
