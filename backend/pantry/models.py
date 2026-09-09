"""Owned stock schema brought forward so foundation factories use real records.

API mutations, estimate calculation and cooking/history transactions remain story work.
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from catalog.models import ANCHORS, CATEGORIES, DATE_KINDS, FORMS, STORAGE, UNIT_CHOICES
from common.models import OwnedModel


class CustomFood(OwnedModel):
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORIES)
    form = models.CharField(max_length=10, choices=FORMS, default="na")
    aliases = models.JSONField(default=list, blank=True)

    def clean(self):
        if not isinstance(self.aliases, list) or any(
            not isinstance(alias, str) for alias in self.aliases
        ):
            raise ValidationError({"aliases": "Aliases must be a list of names."})


class PantryItem(OwnedModel):
    food = models.ForeignKey("catalog.Food", on_delete=models.PROTECT, null=True, blank=True)
    custom_food = models.ForeignKey(CustomFood, on_delete=models.RESTRICT, null=True, blank=True)
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=6,
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("999999.999999"))],
    )
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    storage_location = models.CharField(max_length=20, choices=STORAGE)
    date = models.DateField(null=True, blank=True)
    date_kind = models.CharField(max_length=10, choices=DATE_KINDS, default="user")
    estimate_rule = models.ForeignKey(
        "catalog.DateRule", on_delete=models.PROTECT, null=True, blank=True
    )
    anchor_date = models.DateField(null=True, blank=True)
    anchor_kind = models.CharField(max_length=10, choices=ANCHORS, blank=True, null=True)  # noqa: DJ001 - null means no confirmed anchor
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["owner", "food"], name="pantry_owner_food_idx"),
            models.Index(fields=["owner", "date"], name="pantry_owner_date_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(food__isnull=False, custom_food__isnull=True)
                    | models.Q(food__isnull=True, custom_food__isnull=False)
                ),
                name="pantry_exactly_one_food",
            ),
            models.CheckConstraint(
                condition=models.Q(quantity__gte=0, quantity__lte=Decimal("999999.999999")),
                name="pantry_quantity_bounds",
            ),
            models.CheckConstraint(
                condition=models.Q(unit__in=[v for v, _ in UNIT_CHOICES]), name="pantry_known_unit"
            ),
            models.CheckConstraint(
                condition=models.Q(storage_location__in=[v for v, _ in STORAGE]),
                name="pantry_known_storage",
            ),
            models.CheckConstraint(
                condition=models.Q(date_kind__in=[v for v, _ in DATE_KINDS]),
                name="pantry_known_date_kind",
            ),
        ]

    def clean(self):
        if self.custom_food_id and self.owner_id:
            if not CustomFood.objects.filter(
                pk=self.custom_food_id, owner_id=self.owner_id
            ).exists():
                raise ValidationError({"custom_food": "Select a food belonging to this pantry."})
        if self.date_kind == "estimate":
            if not (self.date and self.estimate_rule_id and self.anchor_date and self.anchor_kind):
                raise ValidationError({"date": "An estimate needs a rule and a confirmed anchor."})
            if self.storage_location != "refrigerator":
                raise ValidationError({"storage_location": "This estimate requires refrigeration."})
            if self.estimate_rule.anchor_kind != self.anchor_kind:
                raise ValidationError({"anchor_kind": "Use the rule's confirmed anchor kind."})
        elif self.estimate_rule_id:
            raise ValidationError({"estimate_rule": "Only estimated dates have an estimate rule."})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)


class PantryCheck(OwnedModel):
    kind = models.CharField(max_length=10, choices=[("whole", "whole"), ("selected", "selected")])
    items = models.ManyToManyField(PantryItem, blank=True)
    checked_at = models.DateTimeField(auto_now_add=True)


class SavedPreferences(OwnedModel):
    owner = models.OneToOneField("accounts.User", on_delete=models.CASCADE)
    default_filters = models.JSONField(default=dict)
    theme = models.CharField(max_length=10, default="system")
    last_filter = models.JSONField(default=dict)


class CookingLog(OwnedModel):
    personal_recipe = models.ForeignKey(
        "recipes.PersonalRecipe", null=True, on_delete=models.SET_NULL
    )
    recipe = models.ForeignKey("catalog.Recipe", null=True, on_delete=models.SET_NULL)
    title_snapshot = models.CharField(max_length=250)
    servings = models.PositiveSmallIntegerField()
    cooked_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    idempotency_key = models.UUIDField()
    request_fingerprint = models.CharField(max_length=64)
    response_snapshot = models.JSONField(default=dict)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["owner", "idempotency_key"], name="cooking_owner_key")
        ]
        indexes = [models.Index(fields=["owner", "-created_at"], name="cooking_owner_created")]


class CookingLogLine(models.Model):
    cooking_log = models.ForeignKey(CookingLog, on_delete=models.CASCADE, related_name="lines")
    food_id_snapshot = models.CharField(max_length=200)
    review = models.JSONField(default=dict)

    def __str__(self):
        return self.food_id_snapshot


class HistoryEntry(OwnedModel):
    pantry_item = models.ForeignKey(PantryItem, null=True, on_delete=models.SET_NULL)
    cooking_log = models.ForeignKey(CookingLog, null=True, on_delete=models.SET_NULL)
    food_snapshot = models.JSONField(default=dict)
    quantity = models.DecimalField(max_digits=12, decimal_places=6)
    unit = models.CharField(max_length=10)
    kind = models.CharField(max_length=10, choices=[("used", "used"), ("discarded", "discarded")])
    source_action = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    undo_expires_at = models.DateTimeField(null=True)

    class Meta:
        indexes = [models.Index(fields=["owner", "-created_at"], name="history_owner_created")]
