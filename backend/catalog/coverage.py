from meals.domain.matching import match_recipe


def check_coverage(recipes, pantry):
    required = {
        line["foodId"]
        for recipe in recipes
        for line in recipe["ingredients"]
        if not line["optional"] and line["foodId"] != "water"
    }
    owned = {item["foodId"] for item in pantry}
    matched = [recipe for recipe in recipes if match_recipe(recipe, pantry, 2)["isCompleteMatch"]]
    fraction = len(required & owned) / len(required)
    report = {
        "servings": 2,
        "requiredIngredientCount": len(required),
        "coveredIngredientCount": len(required & owned),
        "distinctIngredientFraction": fraction,
        "completeMatchCount": len(matched),
        "matchedRecipeIds": sorted(recipe["id"] for recipe in matched),
    }
    failures = []
    if len(recipes) != 30:
        failures.append("Expected 30 recipes.")
    if len(matched) != 7:
        failures.append("Expected seven complete matches.")
    if len({recipe["cuisine"] for recipe in matched}) != 4:
        failures.append("Complete matches must include all four cuisines.")
    if (
        len(
            [
                recipe
                for recipe in matched
                if not recipe["isSide"] and {"lunch", "dinner"} & set(recipe["mealTypes"])
            ]
        )
        < 2
    ):
        failures.append("Expected at least two complete mains.")
    if failures:
        raise ValueError(f"{' '.join(failures)} Observed: {report}")
    return report
