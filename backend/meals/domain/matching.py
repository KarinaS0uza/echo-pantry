"""Quantity-only matching shared by seed coverage and later recommendation services."""

from collections import defaultdict
from decimal import Decimal

from common.units import CHECK_QUANTITY, normalize


def match_recipe(recipe, pantry, servings=2, include_optional=()):
    if isinstance(servings, bool) or not isinstance(servings, int) or not 1 <= servings <= 12:
        raise ValueError("Servings must be an integer from 1 to 12.")
    scale = Decimal(servings) / Decimal(str(recipe["yieldServings"]))
    selected = set(include_optional)
    required = defaultdict(list)
    stock = defaultdict(list)
    for line in recipe["ingredients"]:
        if not line["optional"] or line["foodId"] in selected:
            required[line["foodId"]].append(line)
    for item in pantry:
        stock[item["foodId"]].append(normalize(item["quantity"], item["unit"]))
    results = []
    for food_id, lines in required.items():
        owned = stock[food_id]
        if food_id == "water":
            status = "available"
        elif not owned or all(value != CHECK_QUANTITY and value[1] == 0 for value in owned):
            status = "missing"
        else:
            needs = defaultdict(Decimal)
            uncertain = False
            for line in lines:
                if line["toTaste"]:
                    continue
                value = normalize(line["amount"], line["unit"])
                if value == CHECK_QUANTITY:
                    uncertain = True
                else:
                    needs[value[0]] += value[1] * scale
            status = CHECK_QUANTITY if uncertain else "available"
            for dimension, amount in needs.items():
                compatible = [
                    value[1] for value in owned if value != CHECK_QUANTITY and value[0] == dimension
                ]
                if not compatible:
                    status = CHECK_QUANTITY
                elif sum(compatible) < amount:
                    unmeasured_stock = any(
                        value == CHECK_QUANTITY or (value[0] != dimension and value[1] > 0)
                        for value in owned
                    )
                    if unmeasured_stock:
                        status = CHECK_QUANTITY
                    else:
                        status = "missing"
                        break
        results.append({"foodId": food_id, "status": status})
    return {
        "isCompleteMatch": all(row["status"] == "available" for row in results),
        "ingredients": results,
    }
