"""Upsert reviewed references only. No imports, signals or writes to owned models."""

import json
from collections import Counter
from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import models, transaction

from catalog.coverage import check_coverage
from catalog.models import (
    DateRule,
    Food,
    PriceReference,
    Recipe,
    RecipeIngredient,
    SamplePantrySeed,
)


def upsert(model, key, **values):
    for field in model._meta.fields:
        if isinstance(field, models.DecimalField) and values.get(field.name) is not None:
            values[field.name] = Decimal(str(values[field.name]))
    instance = model(pk=key, **values)
    instance.full_clean(validate_unique=False, validate_constraints=False)
    model.objects.update_or_create(pk=key, defaults=values)


class Command(BaseCommand):
    help = "Idempotently load reviewed reference data without touching owned records."

    def add_arguments(self, parser):
        parser.add_argument("--check-coverage", action="store_true")

    def handle(self, *args, **options):
        def read(name):
            try:
                return json.loads((settings.REFERENCE_DATA_DIR / name).read_text())
            except (OSError, ValueError) as exc:
                raise CommandError(f"Unable to load reference group {name}.") from exc

        foods = read("foods.json")["foods"]
        rules = read("date-rules.json")["rules"]
        recipes = read("recipes.json")["recipes"]
        pantry = read("sample-pantry.json")["items"]
        snapshots = [read("price-snapshot.json"), read("specialty-price-snapshot.json")]
        if Counter(r["cuisine"] for r in recipes) != {
            "american": 9,
            "korean": 7,
            "indian": 7,
            "brazilian": 7,
        }:
            raise CommandError("Reference recipes must retain the approved 9/7/7/7 distribution.")
        with transaction.atomic():
            for food in foods:
                upsert(
                    Food,
                    food["id"],
                    name=food["name"],
                    aliases=food["aliases"],
                    category=food["category"],
                    default_units=food["defaultUnits"],
                    form=food["form"],
                    is_custom=False,
                    dietary_flags=food.get("dietaryFlags", {}),
                )
        with transaction.atomic():
            for rule in rules:
                upsert(
                    DateRule,
                    rule["id"],
                    label=rule["label"],
                    published_range_low_days=rule["publishedRangeLow"],
                    published_range_high_days=rule["publishedRangeHigh"],
                    initial_reminder_days=rule["initialReminderDays"],
                    anchor_kind=rule["anchorKind"],
                    storage_condition=rule["storageCondition"],
                    applies_to=rule["appliesTo"],
                )
        with transaction.atomic():
            for recipe in recipes:
                rid = recipe["id"]
                upsert(
                    Recipe,
                    rid,
                    name=recipe["name"],
                    source_name=recipe["sourceName"],
                    source_url=recipe["sourceUrl"],
                    cuisine=recipe["cuisine"],
                    meal_types=recipe["mealTypes"],
                    is_side=recipe["isSide"],
                    yield_servings=recipe["yieldServings"],
                    total_time_minutes=recipe["totalTimeMinutes"],
                    vegetarian_verified=recipe["vegetarianVerified"],
                    retrieved_on=recipe["retrievedOn"],
                )
                kept = []
                for line in recipe["ingredients"]:
                    values = dict(
                        recipe_id=rid,
                        food_id=line["foodId"],
                        preparation=line["preparation"],
                        amount=line["amount"],
                        unit=line["unit"],
                        optional=line["optional"],
                        to_taste=line["toTaste"],
                        source_text=line["sourceText"],
                    )
                    RecipeIngredient(**values).full_clean(
                        validate_unique=False, validate_constraints=False
                    )
                    row, _ = RecipeIngredient.objects.update_or_create(
                        recipe_id=rid,
                        food_id=line["foodId"],
                        preparation=line["preparation"],
                        defaults=values,
                    )
                    kept.append(row.pk)
                RecipeIngredient.objects.filter(recipe_id=rid).exclude(pk__in=kept).delete()
        with transaction.atomic():
            for snapshot in snapshots:
                stores = {row["id"]: row for row in snapshot.get("stores", [snapshot.get("store")])}
                for price in snapshot["prices"]:
                    store = stores[price["storeId"]]
                    package = price["package"]
                    upsert(
                        PriceReference,
                        price["id"],
                        food_id=price["ingredientId"],
                        merchant=store["name"],
                        shopping_method=store["shoppingMethod"],
                        location_verified=store["shoppingMethod"] == "pickup",
                        location_label=store.get(
                            "address", (store.get("location") or {}).get("verifiedUiLabel", "")
                        ),
                        package_quantity=package["quantity"],
                        package_unit=package["unit"],
                        price_cents=price["priceCents"],
                        observed_promotional_price_cents=price["observedPromotionalPriceCents"],
                        observed_initial_range_cents=price.get("observedInitialRangeCents"),
                        source_url=price["sourceUrl"],
                        observed_page_url=price["observedPageUrl"],
                        observed_on=price["observedOn"],
                        automatic_estimate_eligible=package["automaticEstimateEligible"],
                    )
        with transaction.atomic():
            SamplePantrySeed.objects.all().delete()
            for index, item in enumerate(pantry, start=1):
                upsert(
                    SamplePantrySeed,
                    index,
                    food_id=item["foodId"],
                    quantity=item["quantity"],
                    unit=item["unit"],
                    storage_location=item["storageLocation"],
                    date=item["date"],
                    date_kind=item["dateKind"],
                )
        if options["check_coverage"]:
            # Query what was actually stored, catching truncated/missing seed fields.
            loaded = [
                {
                    "id": r.id,
                    "cuisine": r.cuisine,
                    "isSide": r.is_side,
                    "mealTypes": r.meal_types,
                    "yieldServings": r.yield_servings,
                    "ingredients": [
                        {
                            "foodId": i.food_id,
                            "amount": i.amount,
                            "unit": i.unit,
                            "optional": i.optional,
                            "toTaste": i.to_taste,
                        }
                        for i in r.ingredients.all()
                    ],
                }
                for r in Recipe.objects.prefetch_related("ingredients")
            ]
            stock = [
                {"foodId": row.food_id, "quantity": row.quantity, "unit": row.unit}
                for row in SamplePantrySeed.objects.all()
            ]
            try:
                report = check_coverage(loaded, stock)
            except ValueError as exc:
                raise CommandError(str(exc)) from exc
            self.stdout.write(json.dumps(report))
        self.stdout.write(self.style.SUCCESS("Reference data seeded. Owned records unchanged."))
