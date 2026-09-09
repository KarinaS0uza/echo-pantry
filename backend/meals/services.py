"""Read-only meal composition from supplied inputs, shared by sample and owned views."""

from datetime import date
from decimal import Decimal

from common.units import CHECK_QUANTITY, normalize
from meals.domain.explanation import explain
from meals.domain.matching import match_recipe
from meals.domain.ranking import RankingInput, rank

# Explicit identities from the reference catalogue. Sauces, mixes, prepared
# foods and generic oils remain composition-unknown without verified metadata.
SINGLE_INGREDIENTS = frozenset(
    "water salt sugar-white beef-ground-raw beef-raw chicken-breast-raw pork-belly-raw eggs-large-raw black-beans-dry chickpeas-dry lentils-red-dry moong-dal-dry rice-basmati-dry rice-long-grain-white-dry bay-leaf black-pepper-ground caraway-seeds cardamom-green cayenne chili-kashmiri-ground chili-red-dried chili-red-ground cinnamon-stick clove coriander-ground cumin-ground cumin-roasted-ground cumin-seeds fennel-ground fenugreek-dried garlic-powder gochugaru mace-strand mustard-seeds nutmeg oregano-dried paprika-ground parsley sesame-seeds star-anise turmeric".split()
)


def ingredient_composition(food_id, foods, ancestors=frozenset()):
    """Resolve every known nested ingredient; cycles cannot establish composition."""
    known = {food_id}
    if food_id in ancestors or food_id not in foods:
        return known, False
    food = foods[food_id]
    flags = food.get("dietaryFlags", {})
    single_food = (
        food.get("category") == "produce" and food.get("form") == "raw"
    ) or food_id in SINGLE_INGREDIENTS
    verified = flags.get("compositionVerified", single_food) is True
    children = flags.get("subIngredients", [])
    if not isinstance(children, list) or any(not isinstance(child, str) for child in children):
        return known, False
    for child in children:
        child_known, child_verified = ingredient_composition(child, foods, ancestors | {food_id})
        known.update(child_known)
        verified = verified and child_verified
    return known, verified


def recipe_summary(recipe):
    keys = (
        "id",
        "title",
        "cuisine",
        "mealTypes",
        "isSide",
        "yieldServings",
        "totalTimeMinutes",
        "vegetarianVerified",
        "sourceName",
        "sourceUrl",
    )
    return {"kind": "curated", **{key: recipe.get(key) for key in keys}}


def compose_meals(
    recipes,
    pantry,
    foods,
    *,
    today,
    servings=2,
    mealType=None,
    cuisine=None,
    maxTime="any",
    vegetarian=False,
    favorites=False,
    avoid=(),
    useToday=(),
    includeOptional=(),
    favorite_ids=(),
):
    """Apply exclusions before matching and use the exact same facts for explanations."""
    matches, facts, exclusions = {}, [], []
    selected, avoided = set(useToday), set(avoid)
    for recipe in recipes:
        if cuisine and recipe["cuisine"] != cuisine:
            continue
        if mealType and not (
            recipe["isSide"] if mealType == "side" else mealType in recipe["mealTypes"]
        ):
            continue
        if maxTime != "any" and (
            recipe["totalTimeMinutes"] is None or recipe["totalTimeMinutes"] > int(maxTime)
        ):
            continue
        if vegetarian and recipe["vegetarianVerified"] is not True:
            continue
        if favorites and recipe["id"] not in favorite_ids:
            continue
        ingredients = {line["foodId"] for line in recipe["ingredients"]}
        if not selected <= ingredients:
            continue
        if avoided:
            # Composition is verified only by explicit source metadata. An empty
            # dietaryFlags object is not evidence that a food has no subingredients.
            known = set(ingredients)
            verified = True
            for food_id in ingredients:
                child_known, child_verified = ingredient_composition(food_id, foods)
                known.update(child_known)
                verified = verified and child_verified
            if avoided & known or not verified:
                exclusions.append(
                    {
                        "recipeId": recipe["id"],
                        "reason": "avoided_ingredient"
                        if avoided & known
                        else "ingredient_information_incomplete",
                    }
                )
                continue
        optional = {
            value.split(":", 1)[1]
            for value in includeOptional
            if value.startswith(recipe["id"] + ":")
        }
        optional.update(
            selected & {line["foodId"] for line in recipe["ingredients"] if line["optional"]}
        )
        matched = match_recipe(recipe, pantry, servings, optional)
        explanation = explain(
            recipe,
            pantry,
            foods,
            matched,
            servings=servings,
            today=today,
            selected=selected,
            optional=optional,
        )
        used = {row["foodId"] for row in matched["ingredients"]}
        stock = [
            item
            for item in pantry
            if item["foodId"] in used
            and normalize(item["quantity"], item["unit"]) != CHECK_QUANTITY
            and Decimal(str(item["quantity"])) > 0
        ]
        # A conservative categorical priority, not a shelf-life or safety estimate.
        short_lived = any(
            item.get("storageLocation") != "freezer"
            and (
                foods[item["foodId"]].get("category") in ("produce", "dairy", "meat")
                or foods[item["foodId"]].get("form") == "cooked"
            )
            for item in stock
        )
        if short_lived:
            explanation["reasonSummary"] += " Uses fresh or shorter-lived pantry ingredients."
        ages = [item["addedDate"] for item in stock if item.get("addedDate")]
        facts.append(
            RankingInput(
                recipe_id=recipe["id"],
                title=recipe["title"],
                is_complete_match=matched["isCompleteMatch"],
                uses_short_lived_food=short_lived,
                soonest_use_by_date=date.fromisoformat(explanation["soonestUseByDate"])
                if explanation["soonestUseByDate"]
                else None,
                oldest_stock_date=min(ages) if ages else None,
                favorite=recipe["id"] in favorite_ids,
                missing_count=len(explanation["missing"]),
                urgency_tier=explanation["urgencyTier"],
            )
        )
        matches[recipe["id"]] = {
            "recipe": recipe_summary(recipe),
            "isCompleteMatch": matched["isCompleteMatch"],
            "explanation": explanation,
            "estimate": None
            if matched["isCompleteMatch"]
            else {
                "status": "incomplete",
                "purchaseCostCents": None,
                "portionCostCents": None,
                "lines": [],
                "estimateLabel": "Estimate unavailable",
                "excludes": "Taxes, deposits, bags, and shipping or service fees are excluded; order minimums are unverified.",
            },
        }
    result = {"servings": servings, "completeMatches": [], "purchaseNeeded": []}
    for position, fact in enumerate(rank(facts), 1):
        suggestion = {**matches[fact.recipe_id], "rank": position}
        result["completeMatches" if fact.is_complete_match else "purchaseNeeded"].append(suggestion)
    if not facts:
        result["emptyState"] = "no_selection_match" if selected else "no_filter_match"
    if exclusions:
        result["excludedRecipes"] = exclusions
    return result
