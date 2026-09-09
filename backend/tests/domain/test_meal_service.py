"""Behavioral integration of filters, matching, ranking and explanations."""

from copy import deepcopy
from datetime import date

import pytest

from meals.services import compose_meals

TODAY = date(2026, 9, 8)


def line(food, *, amount="10", unit="g", optional=False, to_taste=False):
    return dict(foodId=food, amount=amount, unit=unit, optional=optional, toTaste=to_taste)


def recipe(identifier, ingredients, **changes):
    return (
        dict(
            id=identifier,
            title=identifier,
            yieldServings="2",
            ingredients=ingredients,
            cuisine="american",
            mealTypes=["dinner"],
            isSide=False,
            totalTimeMinutes=30,
            vegetarianVerified=True,
        )
        | changes
    )


def stock(food, **changes):
    return (
        dict(foodId=food, quantity="100", unit="g", date=None, storageLocation="pantry") | changes
    )


def foods(*ids):
    return {
        identifier: dict(
            name=identifier.title(),
            category="pantry",
            form="na",
            dietaryFlags={"compositionVerified": True},
        )
        for identifier in ids
    }


def ids(result):
    return [row["recipe"]["id"] for row in result["completeMatches"] + result["purchaseNeeded"]]


@pytest.mark.parametrize(
    "limit,expected",
    [
        ("any", ["30", "31", "60", "61", "unknown"]),
        ("30", ["30"]),
        ("60", ["30", "31", "60"]),
    ],
)
def test_time_boundaries_and_unknown(limit, expected):
    recipes = [
        recipe(str(minutes), [line("rice")], totalTimeMinutes=minutes)
        for minutes in (30, 31, 60, 61)
    ]
    recipes.append(recipe("unknown", [line("rice")], totalTimeMinutes=None))
    assert (
        ids(compose_meals(recipes, [stock("rice")], foods("rice"), today=TODAY, maxTime=limit))
        == expected
    )


def test_filters_intersect_and_vegetarian_requires_verification():
    recipes = [
        recipe("wanted", [line("rice")], cuisine="indian"),
        recipe("unknown", [line("rice")], cuisine="indian", vegetarianVerified=None),
        recipe("other-cuisine", [line("rice")]),
        recipe("other-meal", [line("rice")], cuisine="indian", mealTypes=["breakfast"]),
    ]
    assert ids(
        compose_meals(
            recipes,
            [stock("rice")],
            foods("rice"),
            today=TODAY,
            vegetarian=True,
            cuisine="indian",
            mealType="dinner",
        )
    ) == ["wanted"]


def test_avoid_known_subingredients_and_unknown_composition():
    catalogue = foods("rice", "sauce", "mystery", "milk", "egg")
    catalogue["sauce"]["dietaryFlags"]["subIngredients"] = ["milk"]
    catalogue["mystery"]["dietaryFlags"] = {}
    recipes = [
        recipe(identifier, [line(identifier)]) for identifier in ("rice", "sauce", "mystery", "egg")
    ]
    result = compose_meals(recipes, [], catalogue, today=TODAY, avoid=["milk", "egg"])
    assert ids(result) == ["rice"]
    assert {row["recipeId"]: row["reason"] for row in result["excludedRecipes"]} == {
        "sauce": "avoided_ingredient",
        "egg": "avoided_ingredient",
        "mystery": "ingredient_information_incomplete",
    }


def test_all_selected_ingredients_and_actionable_empty_result():
    recipes = [recipe("both", [line("rice"), line("beans")]), recipe("one", [line("rice")])]
    pantry = [stock("rice", date=TODAY), stock("beans", date=date(2026, 9, 10)), stock("milk")]
    catalogue = foods("rice", "beans", "milk")
    result = compose_meals(recipes, pantry, catalogue, today=TODAY, useToday=["rice", "beans"])
    assert ids(result) == ["both"]
    explanation = result["completeMatches"][0]["explanation"]
    assert explanation["useFirst"] == "rice"
    assert "Rice".lower() in explanation["reasonSummary"].lower()
    result = compose_meals(recipes, pantry, catalogue, today=TODAY, useToday=["rice", "milk"])
    assert ids(result) == []
    assert result["emptyState"] == "no_selection_match"


def test_optional_selection_is_scoped_to_recipe_and_inputs_remain_unchanged():
    recipes = [
        recipe(identifier, [line("rice"), line("egg", optional=True)]) for identifier in ("A", "B")
    ]
    pantry, catalogue = [stock("rice")], foods("rice", "egg")
    before = deepcopy((recipes, pantry, catalogue))
    result = compose_meals(recipes, pantry, catalogue, today=TODAY, includeOptional=["A:egg"])
    assert [row["recipe"]["id"] for row in result["completeMatches"]] == ["B"]
    assert [row["recipe"]["id"] for row in result["purchaseNeeded"]] == ["A"]
    estimate = result["purchaseNeeded"][0]["estimate"]
    assert estimate["status"] == "incomplete"
    assert estimate["purchaseCostCents"] is None and estimate["portionCostCents"] is None
    assert (recipes, pantry, catalogue) == before
    assert len(compose_meals(recipes, pantry, catalogue, today=TODAY)["completeMatches"]) == 2


def test_explanation_partitions_and_serving_amount_agree_with_matching():
    recipes = [recipe("A", [line("rice"), line("milk"), line("beans")])]
    pantry = [stock("rice"), stock("beans", unit="item")]
    result = compose_meals(recipes, pantry, foods("rice", "milk", "beans"), today=TODAY, servings=4)
    assert not result["completeMatches"]
    explanation = result["purchaseNeeded"][0]["explanation"]
    assert [row["food"] for row in explanation["available"]] == ["rice"]
    assert [row["food"] for row in explanation["missing"]] == ["milk"]
    assert [row["food"] for row in explanation["checkQuantity"]] == ["beans"]
    assert explanation["available"][0]["need"] == "20 g"
    assert explanation["soonestUseByDate"] is None
    assert explanation["urgencyTier"] == "unknown"


def test_complete_precedes_favorite_and_unrelated_stock_cannot_change_rank():
    recipes = [recipe("complete", [line("rice")]), recipe("favorite", [line("milk")])]
    pantry = [stock("rice"), stock("unrelated", date=TODAY)]
    catalogue = foods("rice", "milk", "unrelated")
    catalogue["unrelated"]["category"] = "produce"
    result = compose_meals(recipes, pantry, catalogue, today=TODAY, favorite_ids=["favorite"])
    assert ids(result) == ["complete", "favorite"]
    assert result["completeMatches"][0]["explanation"]["urgencyTier"] == "unknown"
    assert [row["rank"] for row in result["completeMatches"] + result["purchaseNeeded"]] == [1, 2]


def test_no_sample_favorites():
    result = compose_meals(
        [recipe("A", [line("rice")])], [stock("rice")], foods("rice"), today=TODAY, favorites=True
    )
    assert ids(result) == []


def test_selection_explains_other_owned_ingredients_as_optional_additions():
    result = compose_meals(
        [recipe("A", [line("rice"), line("beans")])],
        [stock("rice"), stock("beans")],
        foods("rice", "beans"),
        today=TODAY,
        useToday=["rice"],
    )
    explanation = result["completeMatches"][0]["explanation"]
    assert {row["food"] for row in explanation["optionalAdditions"]} == {"beans"}
    assert explanation["optionalAdditions"][0]["selectable"] is False


def test_only_source_optional_additions_can_be_selected():
    result = compose_meals(
        [recipe("A", [line("rice"), line("beans"), line("egg", optional=True)])],
        [stock("rice"), stock("beans"), stock("egg", date=TODAY)],
        foods("rice", "beans", "egg"),
        today=TODAY,
        useToday=["rice"],
    )
    explanation = result["completeMatches"][0]["explanation"]
    assert {row["food"]: row["selectable"] for row in explanation["optionalAdditions"]} == {
        "beans": False,
        "egg": True,
    }
    assert "egg" not in {row["food"] for row in explanation["available"]}
    assert explanation["soonestUseByDate"] is None
    assert explanation["usesExpiring"] == []


def test_selected_optional_ingredient_is_matched_and_explained():
    result = compose_meals(
        [recipe("A", [line("rice"), line("egg", optional=True)])],
        [stock("rice"), stock("egg", quantity="1", date=TODAY)],
        foods("rice", "egg"),
        today=TODAY,
        useToday=["egg"],
    )
    assert not result["completeMatches"]
    explanation = result["purchaseNeeded"][0]["explanation"]
    assert {row["food"] for row in explanation["missing"]} == {"egg"}
    assert explanation["useFirst"] == "egg"
    assert all(row["food"] != "egg" for row in explanation["optionalAdditions"])


def test_explicit_unverified_composition_overrides_single_ingredient_assumption():
    catalogue = foods("salt", "milk")
    catalogue["salt"]["dietaryFlags"] = {"compositionVerified": False}
    result = compose_meals(
        [recipe("A", [line("salt")])], [stock("salt")], catalogue, today=TODAY, avoid=["milk"]
    )
    assert not ids(result)
    assert result["excludedRecipes"] == [
        {"recipeId": "A", "reason": "ingredient_information_incomplete"},
    ]


def test_avoid_reaches_nested_verified_ingredient():
    catalogue = foods("sauce", "seasoning", "milk")
    catalogue["sauce"]["dietaryFlags"]["subIngredients"] = ["seasoning"]
    catalogue["seasoning"]["dietaryFlags"]["subIngredients"] = ["milk"]
    result = compose_meals(
        [recipe("A", [line("sauce")])], [stock("sauce")], catalogue, today=TODAY, avoid=["milk"]
    )
    assert not ids(result)
    assert result["excludedRecipes"] == [{"recipeId": "A", "reason": "avoided_ingredient"}]


@pytest.mark.parametrize("child", ["unknown", "absent", "cycle", "malformed"])
def test_unverifiable_nested_composition_cannot_pass_avoidance(child):
    catalogue = foods("sauce", "seasoning", "milk")
    catalogue["sauce"]["dietaryFlags"]["subIngredients"] = ["seasoning"]
    if child == "unknown":
        catalogue["seasoning"]["dietaryFlags"] = {}
    elif child == "absent":
        del catalogue["seasoning"]
    elif child == "cycle":
        catalogue["seasoning"]["dietaryFlags"]["subIngredients"] = ["sauce"]
    else:
        catalogue["seasoning"]["dietaryFlags"]["subIngredients"] = "milk"
    result = compose_meals(
        [recipe("A", [line("sauce")])], [stock("sauce")], catalogue, today=TODAY, avoid=["milk"]
    )
    assert not ids(result)
    assert result["excludedRecipes"] == [
        {"recipeId": "A", "reason": "ingredient_information_incomplete"},
    ]


def test_shared_nested_ingredient_is_not_mistaken_for_composition_cycle():
    catalogue = foods("sauce", "seasoning", "salt", "milk")
    catalogue["sauce"]["dietaryFlags"]["subIngredients"] = ["seasoning", "salt"]
    catalogue["seasoning"]["dietaryFlags"]["subIngredients"] = ["salt"]
    result = compose_meals(
        [recipe("A", [line("sauce")])], [stock("sauce")], catalogue, today=TODAY, avoid=["milk"]
    )
    assert ids(result) == ["A"]
    assert "excludedRecipes" not in result
