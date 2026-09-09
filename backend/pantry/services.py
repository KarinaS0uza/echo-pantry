"""Short IMMEDIATE transactions own every stock and history mutation."""

import hashlib
import json
from datetime import timedelta
from decimal import ROUND_DOWN, Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.exceptions import APIException, ValidationError

from catalog.models import Recipe, SamplePantrySeed
from catalog.selectors import local_today
from common.units import CHECK_QUANTITY, convert
from pantry.domain.urgency import urgency_tier
from pantry.models import CookingLog, CookingLogLine, HistoryEntry, PantryItem

PRECISION = Decimal("0.000001")
MAX_QUANTITY = Decimal("999999.999999")


def food_data(item):
    food = item.food or item.custom_food
    return {
        "id": item.food_id or f"custom:{food.pk}",
        "name": food.name,
        "category": food.category,
        "form": food.form,
    }


def item_data(item):
    today = local_today()
    return {
        "id": item.pk,
        "food": food_data(item) if item.food_id else None,
        "customFood": food_data(item) if item.custom_food_id else None,
        "quantity": str(item.quantity),
        "unit": item.unit,
        "storageLocation": item.storage_location,
        "date": item.date,
        "dateKind": item.date_kind,
        "estimateRule": item.estimate_rule_id,
        "anchorKind": item.anchor_kind,
        "anchorDate": item.anchor_date,
        "createdAt": item.created_at,
        "updatedAt": item.updated_at,
        "urgency": {
            "tier": urgency_tier(item.date, today=today),
            "daysRemaining": (item.date - today).days if item.date else None,
        },
    }


def history_data(entry):
    return {
        "id": entry.pk,
        "food": entry.food_snapshot,
        "quantity": str(entry.quantity),
        "unit": entry.unit,
        "kind": entry.kind,
        "sourceAction": entry.source_action,
        "cookingLog": entry.cooking_log_id,
        "createdAt": entry.created_at,
        "undoExpiresAt": entry.undo_expires_at,
        "committed": entry.undo_expires_at is None or entry.undo_expires_at <= timezone.now(),
    }


def initialize_pantry(owner):
    rows = []
    for seed in SamplePantrySeed.objects.all():
        values = {
            k: getattr(seed, k)
            for k in ("food_id", "quantity", "unit", "storage_location", "date", "date_kind")
        }
        rows.append(PantryItem.objects.create(owner=owner, **values))
    return len(rows)


def delta_in_unit(amount, unit, item):
    converted = convert(amount, unit, item.unit)
    if converted == CHECK_QUANTITY:
        raise ValidationError({"unit": "Use a comparable unit."})
    delta = converted.quantize(PRECISION)
    if delta <= 0 or delta > item.quantity:
        raise ValidationError({"quantity": f"Only {item.quantity} {item.unit} on hand."})
    return delta


def deduct(owner, item, delta, kind, source, log=None):
    item.quantity = (item.quantity - delta).quantize(PRECISION)
    item.save(update_fields=["quantity", "updated_at"])
    return HistoryEntry.objects.create(
        owner=owner,
        pantry_item=item,
        cooking_log=log,
        food_snapshot=food_data(item),
        quantity=delta,
        unit=item.unit,
        kind=kind,
        source_action=source,
        undo_expires_at=None if log else timezone.now() + timedelta(seconds=6),
    )


@transaction.atomic
def mark_stock(owner, pk, values, kind):
    item = get_object_or_404(PantryItem, owner=owner, pk=pk)
    delta = delta_in_unit(
        values.get("quantity", item.quantity), values.get("unit", item.unit), item
    )
    entry = deduct(owner, item, delta, kind, "mark_used" if kind == "used" else "mark_discarded")
    return {"pantryItem": item_data(item), "historyEntry": history_data(entry)}


@transaction.atomic
def undo_stock(owner, pk, history_id):
    item = get_object_or_404(PantryItem, owner=owner, pk=pk)
    entry = get_object_or_404(HistoryEntry, owner=owner, pantry_item=item, pk=history_id)
    if entry.undo_expires_at is None or entry.undo_expires_at <= timezone.now():
        raise ValidationError("This action can no longer be undone.")
    if entry.food_snapshot["id"] != food_data(item)["id"]:
        raise ValidationError(
            "This item now references a different food and cannot be restored by undo."
        )
    delta = convert(entry.quantity, entry.unit, item.unit)
    if delta == CHECK_QUANTITY or item.quantity + delta > MAX_QUANTITY:
        raise ValidationError(
            {"quantity": "Restore the original unit and available capacity before undoing."}
        )
    item.quantity = (item.quantity + delta).quantize(PRECISION)
    item.save(update_fields=["quantity", "updated_at"])
    entry.delete()
    return {"pantryItem": item_data(item)}


def reviewed_recipe(owner, identifier):
    from recipes.models import PersonalRecipe

    if isinstance(identifier, str) and identifier.startswith("personal:"):
        suffix = identifier.split(":", 1)[1]
        if not suffix.isdigit():
            from django.http import Http404

            raise Http404
        return get_object_or_404(PersonalRecipe, owner=owner, pk=suffix)
    return get_object_or_404(Recipe, pk=identifier)


def recipe_description(recipe):
    return {
        "id": recipe.pk,
        "kind": "curated" if isinstance(recipe, Recipe) else "personal",
        "title": recipe.name,
    }


def recipe_yield(recipe):
    return recipe.yield_servings if isinstance(recipe, Recipe) else Decimal(recipe.servings)


def ingredient_id(line):
    return line.food_id or f"custom:{line.custom_food_id}"


def cooking_review(owner, recipe_id, servings):
    recipe = reviewed_recipe(owner, recipe_id)
    stock = list(
        PantryItem.objects.filter(owner=owner, quantity__gt=0).order_by("created_at", "pk")
    )
    stock.sort(
        key=lambda item: (item.date is None, item.date or local_today(), item.created_at, item.pk)
    )
    remaining = {item.pk: item.quantity for item in stock}
    lines = []
    for line in recipe.ingredients.select_related("food").all():
        need = line.amount * Decimal(servings) / recipe_yield(recipe) if line.amount else None
        allocations = []
        if need and not line.to_taste and not line.optional:
            for item in stock:
                if food_data(item)["id"] != ingredient_id(line):
                    continue
                available = convert(remaining[item.pk], item.unit, line.unit)
                if available == CHECK_QUANTITY:
                    continue
                amount = convert(min(need, available), line.unit, item.unit).quantize(
                    PRECISION, rounding=ROUND_DOWN
                )
                if amount > 0:
                    allocations.append(
                        {
                            "pantryItem": item.pk,
                            "amount": str(amount),
                            "unit": item.unit,
                            "date": item.date,
                            "dateKind": item.date_kind,
                        }
                    )
                    remaining[item.pk] -= amount
                    need -= convert(amount, item.unit, line.unit)
        lines.append(
            {
                "food": ingredient_id(line),
                "name": (line.food or line.custom_food).name,
                "required": {
                    "amount": str(line.amount * Decimal(servings) / recipe_yield(recipe))
                    if line.amount
                    else None,
                    "unit": line.unit or None,
                },
                "proposedAllocation": allocations,
                "toTaste": line.to_taste,
                "optional": line.optional,
            }
        )
    return {
        "recipe": recipe_description(recipe),
        "servings": servings,
        "lines": lines,
    }


class IdempotencyConflict(APIException):
    status_code = 409
    default_detail = "This idempotency key was used with a different request."


@transaction.atomic
def cook(owner, key, values):
    canonical = json.loads(json.dumps(values, default=str))
    fingerprint = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    previous = CookingLog.objects.filter(owner=owner, idempotency_key=key).first()
    if previous:
        if previous.request_fingerprint != fingerprint:
            raise IdempotencyConflict()
        return previous.response_snapshot, False
    recipe = reviewed_recipe(owner, values["recipe"])
    expected = [ingredient_id(line) for line in recipe.ingredients.all()]
    supplied = [line["food"] for line in values["lines"]]
    if sorted(expected) != sorted(supplied):
        raise ValidationError({"lines": "Review every recipe ingredient exactly once."})
    log = CookingLog.objects.create(
        owner=owner,
        recipe=recipe if isinstance(recipe, Recipe) else None,
        personal_recipe=None if isinstance(recipe, Recipe) else recipe,
        title_snapshot=recipe.name,
        servings=values["servings"],
        cooked_at=values["cookedAt"],
        idempotency_key=key,
        request_fingerprint=fingerprint,
    )
    applied, history = [], []
    for line, snapshot in zip(values["lines"], canonical["lines"], strict=True):
        CookingLogLine.objects.create(
            cooking_log=log, food_id_snapshot=line["food"], review=snapshot
        )
        for deduction in line["deductions"]:
            item = get_object_or_404(PantryItem, owner=owner, pk=deduction["pantryItem"])
            if food_data(item)["id"] != (line["replaced"] or line["food"]):
                raise ValidationError({"lines": "The allocation must use the reviewed food."})
            delta = delta_in_unit(deduction["amount"], deduction["unit"], item)
            entry = deduct(owner, item, delta, "used", "cooking_review", log)
            applied.append(
                {
                    "pantryItem": item.pk,
                    "food": food_data(item)["id"],
                    "amount": str(delta),
                    "unit": item.unit,
                    "remaining": str(item.quantity),
                }
            )
            history.append(
                {"id": entry.pk, "kind": entry.kind, "sourceAction": entry.source_action}
            )
    response = {
        "id": log.pk,
        "recipe": recipe_description(recipe),
        "cookedAt": values["cookedAt"].isoformat(),
        "appliedDeductions": applied,
        "historyEntries": history,
    }
    log.response_snapshot = response
    log.save(update_fields=["response_snapshot"])
    return response, True
