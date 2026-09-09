from decimal import Decimal

from django.shortcuts import get_object_or_404
from rest_framework import serializers

from catalog.models import ANCHORS, DATE_KINDS, STORAGE, UNIT_CHOICES, Food
from pantry.models import CustomFood


class QuantityField(serializers.DecimalField):
    def __init__(self, **kwargs):
        super().__init__(max_digits=12, decimal_places=6, min_value=Decimal("0.000001"), **kwargs)


class PantryWrite(serializers.Serializer):
    food = serializers.PrimaryKeyRelatedField(
        queryset=Food.objects.all(), required=False, allow_null=True
    )
    customFood = serializers.CharField(required=False, allow_null=True)
    quantity = QuantityField(required=False)
    unit = serializers.ChoiceField(choices=UNIT_CHOICES, required=False)
    storageLocation = serializers.ChoiceField(
        choices=STORAGE, source="storage_location", required=False
    )
    date = serializers.DateField(required=False, allow_null=True)
    dateKind = serializers.ChoiceField(choices=DATE_KINDS, source="date_kind", required=False)
    anchorKind = serializers.ChoiceField(
        choices=ANCHORS, source="anchor_kind", required=False, allow_null=True
    )
    anchorDate = serializers.DateField(source="anchor_date", required=False, allow_null=True)

    def validate(self, values):
        if "customFood" in values:
            identifier = values.pop("customFood")
            if identifier is None:
                values["custom_food"] = None
            elif not identifier.startswith("custom:") or not identifier[7:].isdigit():
                raise serializers.ValidationError({"customFood": "Select a known food."})
            else:
                values["custom_food"] = get_object_or_404(
                    CustomFood, owner=self.context["owner"], pk=identifier[7:]
                )
        current = self.instance
        food = values.get("food", current.food if current else None)
        custom = values.get("custom_food", current.custom_food if current else None)
        if bool(food) == bool(custom):
            raise serializers.ValidationError({"food": "Select exactly one food."})
        if not current:
            for key in ("quantity", "unit", "storage_location"):
                if key not in values:
                    raise serializers.ValidationError(
                        {
                            "storageLocation"
                            if key == "storage_location"
                            else key: "This field is required."
                        }
                    )
        if values.get("date_kind") == "estimate" or (
            current
            and current.date_kind == "estimate"
            and any(k in values for k in ("food", "storage_location", "anchor_kind", "anchor_date"))
        ):
            values.update(date=None, date_kind="unknown", estimate_rule=None)
        if "date" in values and values["date"] is None:
            values["date_kind"] = "unknown"
        return values


class StockAction(serializers.Serializer):
    quantity = QuantityField(required=False)
    unit = serializers.ChoiceField(choices=UNIT_CHOICES, required=False)


class Deduction(serializers.Serializer):
    pantryItem = serializers.IntegerField(min_value=1)
    amount = QuantityField()
    unit = serializers.ChoiceField(choices=UNIT_CHOICES)


class ReviewLine(serializers.Serializer):
    food = serializers.CharField(max_length=200)
    deductions = Deduction(many=True)
    sourcedOutsidePantry = serializers.BooleanField(default=False)
    omitted = serializers.BooleanField(default=False)
    replaced = serializers.CharField(allow_null=True, default=None)
    noDeduction = serializers.BooleanField(default=False)

    def validate(self, values):
        if (
            any(values[k] for k in ("sourcedOutsidePantry", "omitted", "noDeduction"))
            and values["deductions"]
        ):
            raise serializers.ValidationError(
                "A line with no pantry use cannot contain deductions."
            )
        if not values["deductions"] and not any(
            values[k] for k in ("sourcedOutsidePantry", "omitted", "noDeduction")
        ):
            raise serializers.ValidationError("Enter an amount or explicitly choose no deduction.")
        return values


class CookingWrite(serializers.Serializer):
    recipe = serializers.CharField()
    servings = serializers.IntegerField(min_value=1, max_value=12)
    cookedAt = serializers.DateTimeField()
    lines = ReviewLine(many=True, allow_empty=False)
