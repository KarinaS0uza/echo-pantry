"""Story-level matching checks against the existing shared foundation matcher."""

from copy import deepcopy

import pytest

from meals.domain.matching import match_recipe


def line(food="rice", amount="100", unit="g", **values):
    return {
        "foodId": food,
        "amount": amount,
        "unit": unit,
        "optional": False,
        "toTaste": False,
        **values,
    }


def recipe(*ingredients, servings=4):
    return {"yieldServings": servings, "ingredients": list(ingredients)}


def stock(food="rice", quantity="50", unit="g"):
    return {"foodId": food, "quantity": quantity, "unit": unit}


def status(result):
    return {item["foodId"]: item["status"] for item in result["ingredients"]}


def test_default_two_servings_scales_from_published_yield():
    meal = recipe(line())
    assert match_recipe(meal, [stock()])["isCompleteMatch"]
    result = match_recipe(meal, [stock()], servings=4)
    assert not result["isCompleteMatch"]
    assert status(result) == {"rice": "missing"}


@pytest.mark.parametrize("servings", [0, 13, True, 2.5, "2", None])
def test_invalid_servings_rejected(servings):
    with pytest.raises(ValueError):
        match_recipe(recipe(line()), [], servings=servings)


@pytest.mark.parametrize("servings", [1, 12])
def test_serving_boundaries(servings):
    assert match_recipe(recipe(line()), [stock(quantity="300")], servings)["isCompleteMatch"]


def test_unit_conversion_and_separate_purchases_are_combined():
    assert match_recipe(
        recipe(line(amount="1000")), [stock(quantity="0.25", unit="kg"), stock(quantity="250")]
    )["isCompleteMatch"]


def test_repeated_ingredient_lines_are_not_double_counted_as_available():
    result = match_recipe(recipe(line(), line()), [stock()])
    assert status(result) == {"rice": "missing"}
    assert not result["isCompleteMatch"]


@pytest.mark.parametrize(
    "ingredient,owned",
    [
        (line(amount=None), stock()),
        (line(), stock(quantity=None)),
        (line(), stock(unit="cup")),
    ],
)
def test_uncertain_amount_or_cross_dimension_blocks_complete_match(ingredient, owned):
    result = match_recipe(recipe(ingredient), [owned])
    assert status(result) == {"rice": "check_quantity"}
    assert not result["isCompleteMatch"]


def test_optional_toppings_only_count_when_selected():
    meal = recipe(line(), line("sesame", optional=True))
    assert match_recipe(meal, [stock()])["isCompleteMatch"]
    selected = match_recipe(meal, [stock()], include_optional=["sesame"])
    assert status(selected)["sesame"] == "missing"
    assert not selected["isCompleteMatch"]


def test_to_taste_needs_presence_but_no_numeric_quantity():
    meal = recipe(line("salt", amount=None, toTaste=True))
    assert match_recipe(meal, [stock("salt", quantity=None)])["isCompleteMatch"]
    assert status(match_recipe(meal, [])) == {"salt": "missing"}
    assert status(match_recipe(meal, [stock("salt", quantity="0")])) == {"salt": "missing"}


def test_water_only_is_assumed_present():
    result = match_recipe(recipe(line("water"), line("oil")), [])
    assert status(result) == {"water": "available", "oil": "missing"}


def test_raw_and_cooked_food_are_distinct_and_inputs_unchanged():
    meal = recipe(line("rice-cooked"))
    pantry = [stock("rice-dry")]
    before = deepcopy((meal, pantry))
    assert status(match_recipe(meal, pantry)) == {"rice-cooked": "missing"}
    assert (meal, pantry) == before


@pytest.mark.parametrize("additional", [stock(quantity=None), stock(quantity="2", unit="item")])
def test_short_known_stock_with_uncertain_extra_batch_requires_quantity_check(additional):
    result = match_recipe(recipe(line(amount="100")), [stock(quantity="20"), additional])
    assert status(result) == {"rice": "check_quantity"}
    assert not result["isCompleteMatch"]


@pytest.mark.parametrize("additional", [stock(quantity=None), stock(quantity="2", unit="item")])
def test_sufficient_known_stock_stays_available_despite_uncertain_extra_batch(additional):
    result = match_recipe(recipe(line(amount="100")), [stock(quantity="100"), additional])
    assert status(result) == {"rice": "available"}
    assert result["isCompleteMatch"]
