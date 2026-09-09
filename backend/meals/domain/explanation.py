"""Explain the same ingredient facts used by matching and ranking."""

from collections import defaultdict
from decimal import Decimal, InvalidOperation

from common.units import CHECK_QUANTITY, normalize
from pantry.domain.urgency import urgency_tier


def display_quantity(quantity, unit):
    try:
        number = Decimal(str(quantity))
    except (InvalidOperation, ValueError):
        return None
    if not number.is_finite() or number < 0:
        return None
    value = format(number, "f")
    if "." in value:
        value = value.rstrip("0").rstrip(".")
    return f"{value or '0'} {unit}" if unit else value


def explain(recipe, pantry, foods, match, *, servings, today, selected=(), optional=()):
    """Return source-language prose and explicit ingredient and date facts."""
    stock = defaultdict(list)
    for item in pantry:
        stock[item["foodId"]].append(item)
    scale = Decimal(servings) / Decimal(str(recipe["yieldServings"]))
    lines = defaultdict(list)
    for line in recipe["ingredients"]:
        if not line["optional"] or line["foodId"] in optional:
            lines[line["foodId"]].append(line)
    groups = {"available": [], "missing": [], "checkQuantity": []}
    for row in match["ingredients"]:
        food_id = row["foodId"]
        quantities = defaultdict(Decimal)
        uncertain = False
        to_taste = False
        for line in lines[food_id]:
            if line["toTaste"]:
                to_taste = True
            elif line["amount"] is None:
                uncertain = True
            else:
                quantities[line["unit"]] += Decimal(str(line["amount"])) * scale
        need = ", ".join(display_quantity(amount, unit) for unit, amount in quantities.items())
        item = {
            "food": food_id,
            "name": foods[food_id]["name"],
            "need": need or None,
            "toTaste": to_taste,
            "quantityUnknown": uncertain,
        }
        owned = stock[food_id]
        item["have"] = (
            ", ".join(filter(None, (display_quantity(s["quantity"], s["unit"]) for s in owned)))
            or None
        )
        key = "checkQuantity" if row["status"] == CHECK_QUANTITY else row["status"]
        groups[key].append(item)
    used = {row["foodId"] for row in match["ingredients"]}
    owned_used = [
        item
        for item in pantry
        if item["foodId"] in used
        and normalize(item["quantity"], item["unit"]) != CHECK_QUANTITY
        and Decimal(str(item["quantity"])) > 0
    ]
    dates = [item["date"] for item in owned_used if item.get("date")]
    soonest = min(dates) if dates else None
    expiring = sorted(
        {
            item["foodId"]
            for item in owned_used
            if item.get("date")
            and urgency_tier(item["date"], today=today)
            in ("review", "use_today", "use_soon", "coming_up")
        }
    )
    selected_stock = [item for item in owned_used if item["foodId"] in selected]
    selected_stock.sort(
        key=lambda item: (item.get("date") is None, item.get("date") or today, item["foodId"])
    )
    first = selected_stock[0]["foodId"] if selected_stock else None
    if first:
        summary = f"Start with your {foods[first]['name'].lower()}."
    elif expiring:
        summary = "Uses pantry ingredients with dates to review."
    elif match["isCompleteMatch"]:
        summary = "You have the required ingredients."
    elif groups["missing"]:
        summary = "Some required ingredients are missing."
    else:
        summary = "Check ingredient quantities before cooking."
    owned_ids = {
        item["foodId"]
        for item in pantry
        if normalize(item["quantity"], item["unit"]) != CHECK_QUANTITY
        and Decimal(str(item["quantity"])) > 0
    }
    additions = [
        {
            "food": line["foodId"],
            "name": foods[line["foodId"]]["name"],
            # Required ingredients are useful context for a selected-food search,
            # but only source-optional lines can be opted into matching.
            "selectable": line["optional"],
        }
        for line in recipe["ingredients"]
        if (selected or line["optional"])
        and line["foodId"] in owned_ids
        and line["foodId"] not in optional
        and line["foodId"] not in selected
    ]
    additions = list({item["food"]: item for item in additions}.values())
    return {
        **groups,
        "reasonSummary": summary,
        "soonestUseByDate": soonest.isoformat() if soonest else None,
        "urgencyTier": urgency_tier(soonest, today=today),
        "usesExpiring": expiring,
        "useFirst": first,
        "optionalAdditions": additions,
    }
