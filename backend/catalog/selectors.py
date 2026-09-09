from datetime import datetime
from zoneinfo import ZoneInfo

from django.conf import settings
from rest_framework.exceptions import ValidationError

from catalog.models import Food, SamplePantrySeed
from meals.serializers import MealQuerySerializer


def local_today():
    # The local demo runs in San Francisco. Kept separate from timestamp storage.
    return datetime.now(ZoneInfo(getattr(settings, "DEMO_TIME_ZONE", "America/Los_Angeles"))).date()


def reference_foods():
    return {
        food.pk: {
            "id": food.pk,
            "name": food.name,
            "category": food.category,
            "form": food.form,
            "aliases": food.aliases,
            "defaultUnits": food.default_units,
            "dietaryFlags": food.dietary_flags,
        }
        for food in Food.objects.all()
    }


def recipe_input(recipe):
    return {
        "id": recipe.pk,
        "title": recipe.name,
        "sourceName": recipe.source_name,
        "sourceUrl": recipe.source_url,
        "cuisine": recipe.cuisine,
        "mealTypes": recipe.meal_types,
        "isSide": recipe.is_side,
        "yieldServings": str(recipe.yield_servings),
        "totalTimeMinutes": recipe.total_time_minutes,
        "vegetarianVerified": recipe.vegetarian_verified,
        "ingredients": [
            {
                "foodId": line.food_id,
                "amount": line.amount,
                "unit": line.unit,
                "optional": line.optional,
                "toTaste": line.to_taste,
                "preparation": line.preparation,
            }
            for line in recipe.ingredients.all()
        ],
    }


def sample_stock():
    return [
        {
            "id": item.pk,
            "foodId": item.food_id,
            "quantity": item.quantity,
            "unit": item.unit,
            "storageLocation": item.storage_location,
            "date": item.date,
            "dateKind": item.date_kind,
        }
        for item in SamplePantrySeed.objects.all().order_by("pk")
    ]


def query_options(query, foods, pantry, recipes):
    repeated = {"avoid", "useToday", "includeOptional"}
    allowed = set(MealQuerySerializer().fields)
    unknown = set(query) - allowed
    if unknown:
        raise ValidationError({key: "Unknown filter." for key in sorted(unknown)})
    for key in set(query) - repeated:
        if len(query.getlist(key)) > 1:
            raise ValidationError({key: "Provide this filter once."})
    if "servings" in query and not query["servings"].isascii():
        raise ValidationError({"servings": "Use a whole number from 1 to 12."})
    if "servings" in query and not query["servings"].isdigit():
        raise ValidationError({"servings": "Use a whole number from 1 to 12."})
    values = {key: query.getlist(key) if key in repeated else query[key] for key in query}
    serializer = MealQuerySerializer(data=values)
    serializer.is_valid(raise_exception=True)
    options = serializer.validated_data
    stock_ids = {item["foodId"] for item in pantry}
    optional_ids = {
        recipe["id"] + ":" + line["foodId"]
        for recipe in recipes
        for line in recipe["ingredients"]
        if line["optional"]
    }
    for key, valid in (
        ("avoid", set(foods)),
        ("useToday", stock_ids),
        ("includeOptional", optional_ids),
    ):
        if set(options.get(key, [])) - valid:
            raise ValidationError({key: "Select a known ingredient."})
    return options
