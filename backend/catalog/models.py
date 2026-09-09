from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models

from common.units import UNITS

UNIT_CHOICES = [(unit, unit) for unit in UNITS]
FORMS = [(value, value) for value in ("raw", "cooked", "na")]
CATEGORIES = [(value, value) for value in ("produce", "dairy", "meat", "pantry", "spice", "frozen")]
STORAGE = [(value, value) for value in ("refrigerator", "freezer", "pantry", "counter")]
DATE_KINDS = [(value, value) for value in ("label", "user", "estimate", "unknown")]
ANCHORS = [(value, value) for value in ("purchase", "opening", "cooking")]
POSITIVE = [MinValueValidator(Decimal("0.000001")), MaxValueValidator(Decimal("999999.999999"))]


class Food(models.Model):
    id = models.CharField(
        primary_key=True, max_length=100, validators=[RegexValidator(r"^[a-z0-9-]+$")]
    )
    name = models.CharField(max_length=200)
    aliases = models.JSONField(default=list, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    default_units = models.JSONField(default=list)
    form = models.CharField(max_length=10, choices=FORMS, default="na")
    is_custom = models.BooleanField(default=False)
    dietary_flags = models.JSONField(default=dict, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(is_custom=False), name="reference_food_not_custom"
            )
        ]

    def __str__(self):
        return self.name

    def clean(self):
        if (
            not isinstance(self.aliases, list)
            or any(not isinstance(a, str) or a != a.lower() for a in self.aliases)
            or len(set(self.aliases)) != len(self.aliases)
        ):
            raise ValidationError({"aliases": "Aliases must be unique lowercase strings."})
        if (
            not isinstance(self.default_units, list)
            or not self.default_units
            or any(unit not in UNITS for unit in self.default_units)
        ):
            raise ValidationError({"default_units": "Select supported units."})


class DateRule(models.Model):
    id = models.SlugField(primary_key=True)
    label = models.CharField(max_length=200)
    published_range_low_days = models.PositiveSmallIntegerField()
    published_range_high_days = models.PositiveSmallIntegerField()
    initial_reminder_days = models.PositiveSmallIntegerField()
    anchor_kind = models.CharField(max_length=10, choices=ANCHORS)
    storage_condition = models.CharField(
        max_length=20, default="refrigerator", choices=[("refrigerator", "refrigerator")]
    )
    applies_to = models.JSONField(default=list)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    published_range_high_days__gte=models.F("published_range_low_days"),
                    initial_reminder_days__gte=1,
                ),
                name="date_rule_range_valid",
            )
        ]

    def __str__(self):
        return self.label


class Recipe(models.Model):
    id = models.CharField(primary_key=True, max_length=10)
    name = models.CharField(max_length=200)
    source_name = models.CharField(max_length=100)
    source_url = models.URLField(max_length=500)
    cuisine = models.CharField(
        max_length=20, choices=[(v, v) for v in ("american", "korean", "indian", "brazilian")]
    )
    meal_types = models.JSONField(default=list)
    is_side = models.BooleanField(default=False)
    yield_servings = models.DecimalField(max_digits=12, decimal_places=6, validators=POSITIVE)
    total_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    vegetarian_verified = models.BooleanField(null=True, blank=True)
    retrieved_on = models.DateField()

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(yield_servings__gt=0), name="recipe_positive_yield"
            )
        ]

    def __str__(self):
        return self.name


class RecipeIngredient(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="ingredients")
    food = models.ForeignKey(Food, on_delete=models.PROTECT)
    amount = models.DecimalField(
        max_digits=12, decimal_places=6, validators=POSITIVE, null=True, blank=True
    )
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, null=True, blank=True)  # noqa: DJ001 - contract null means unknown
    optional = models.BooleanField(default=False)
    to_taste = models.BooleanField(default=False)
    preparation = models.CharField(max_length=1000, blank=True)
    source_text = models.CharField(max_length=1000)

    class Meta:
        ordering = ["pk"]
        constraints = [
            models.UniqueConstraint(
                fields=["recipe", "food", "preparation"], name="unique_recipe_ingredient"
            ),
            models.CheckConstraint(
                condition=models.Q(to_taste=False) | models.Q(amount__isnull=True),
                name="to_taste_no_amount",
            ),
            models.CheckConstraint(
                condition=models.Q(amount__isnull=True)
                | models.Q(amount__gt=0, unit__isnull=False),
                name="ingredient_quantity_valid",
            ),
        ]

    def __str__(self):
        return f"{self.recipe_id}: {self.food_id}"


class PriceReference(models.Model):
    id = models.CharField(primary_key=True, max_length=150)
    food = models.ForeignKey(Food, on_delete=models.PROTECT)
    merchant = models.CharField(max_length=100)
    shopping_method = models.CharField(
        max_length=20, choices=[(v, v) for v in ("pickup", "online_delivery", "online_shipping")]
    )
    location_verified = models.BooleanField(default=False)
    location_label = models.CharField(max_length=250, blank=True)
    package_quantity = models.DecimalField(
        max_digits=12, decimal_places=6, validators=POSITIVE, null=True, blank=True
    )
    package_unit = models.CharField(max_length=10, choices=UNIT_CHOICES, null=True, blank=True)  # noqa: DJ001 - contract null means unknown
    price_cents = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    observed_promotional_price_cents = models.PositiveIntegerField(null=True, blank=True)
    observed_initial_range_cents = models.JSONField(null=True, blank=True)
    source_url = models.URLField(max_length=500)
    observed_page_url = models.URLField(max_length=500)
    observed_on = models.DateField()
    automatic_estimate_eligible = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(price_cents__gt=0), name="price_positive"),
            models.CheckConstraint(
                condition=models.Q(automatic_estimate_eligible=False)
                | models.Q(
                    package_quantity__gt=0,
                    package_quantity__isnull=False,
                    package_unit__isnull=False,
                ),
                name="eligible_price_package_known",
            ),
        ]

    def __str__(self):
        return self.id


class SamplePantrySeed(models.Model):
    id = models.PositiveSmallIntegerField(primary_key=True)
    food = models.ForeignKey(Food, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=12, decimal_places=6, validators=POSITIVE)
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    storage_location = models.CharField(max_length=20, choices=STORAGE)
    date = models.DateField(null=True, blank=True)
    date_kind = models.CharField(max_length=10, choices=DATE_KINDS)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0), name="sample_quantity_positive"
            )
        ]

    def __str__(self):
        return f"Sample {self.food_id}"
