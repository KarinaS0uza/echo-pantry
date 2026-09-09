"""Recommendation priority rules independent of API, storage, and presentation."""

from dataclasses import replace
from datetime import date
from itertools import permutations

import pytest

from meals.domain.ranking import RankingInput, rank


def candidate(recipe_id, **values):
    return RankingInput(recipe_id=recipe_id, title=recipe_id, is_complete_match=True, **values)


def assert_before(first, second):
    for inputs in permutations((first, second)):
        assert rank(inputs) == [first, second]


def test_complete_match_always_beats_favorite_urgent_purchase():
    complete = candidate("complete")
    purchase = replace(
        candidate("purchase", favorite=True, urgency_tier="use_today"),
        is_complete_match=False,
        purchase_cost_cents=1,
    )
    assert_before(complete, purchase)


def test_fresh_ingredient_priority_precedes_date_and_favorite():
    assert_before(
        candidate("fresh", uses_short_lived_food=True),
        candidate("shelf", soonest_use_by_date=date(2026, 9, 8), favorite=True),
    )


def test_earlier_date_precedes_stock_age_and_favorite():
    assert_before(
        candidate("early", soonest_use_by_date=date(2026, 9, 8)),
        candidate(
            "later",
            soonest_use_by_date=date(2026, 9, 9),
            oldest_stock_date=date(2026, 1, 1),
            favorite=True,
        ),
    )


def test_unknown_date_sorts_last_and_is_preserved():
    unknown = candidate("unknown", favorite=True)
    assert_before(candidate("known", soonest_use_by_date=date(2026, 9, 20)), unknown)
    assert unknown.soonest_use_by_date is None
    assert unknown.urgency_tier == "unknown"


def test_old_stock_beats_new_favorite_on_equal_date():
    due = date(2026, 9, 10)
    assert_before(
        candidate("old", soonest_use_by_date=due, oldest_stock_date=date(2026, 9, 1)),
        candidate(
            "new", soonest_use_by_date=due, oldest_stock_date=date(2026, 9, 8), favorite=True
        ),
    )


def test_favorite_then_title_break_complete_ties():
    assert_before(candidate("Zulu", favorite=True), candidate("Alpha"))
    assert_before(candidate("Alpha"), candidate("Zulu"))


def purchase(recipe_id, **values):
    return replace(candidate(recipe_id, **values), is_complete_match=False)


def test_purchase_favorite_precedes_even_known_cheaper_total():
    assert_before(purchase("favorite", favorite=True), purchase("cheap", purchase_cost_cents=1))


def test_package_cost_precedes_missing_count_and_urgency():
    assert_before(
        purchase("cheap", purchase_cost_cents=100, missing_count=4),
        purchase("dear", purchase_cost_cents=200, missing_count=1, urgency_tier="use_today"),
    )


@pytest.mark.parametrize("favorite", [False, True])
def test_unavailable_cost_is_last_within_favorite_group(favorite):
    assert_before(
        purchase("priced", favorite=favorite, purchase_cost_cents=10000),
        purchase("unknown", favorite=favorite, missing_count=0),
    )


def test_missing_count_precedes_urgency_on_equal_cost():
    assert_before(
        purchase("fewer", purchase_cost_cents=100, missing_count=1),
        purchase("urgent", purchase_cost_cents=100, missing_count=2, urgency_tier="use_today"),
    )


def test_urgency_breaks_equal_purchase_ties():
    tiers = ["review", "use_today", "use_soon", "coming_up", "neutral", "unknown"]
    expected = [purchase(tier, urgency_tier=tier) for tier in tiers]
    assert rank(reversed(expected)) == expected


def test_rank_does_not_mutate_inputs_and_has_stable_identity_tie():
    first = candidate("a")
    second = replace(candidate("b"), title=first.title)
    inputs = [second, first]
    assert rank(inputs) == [first, second]
    assert inputs == [second, first]
    assert rank([]) == []


@pytest.mark.parametrize("cost", [-1, True, 1.5, "100"])
def test_invalid_exact_cost_is_rejected(cost):
    with pytest.raises(ValueError):
        purchase("invalid", purchase_cost_cents=cost)
