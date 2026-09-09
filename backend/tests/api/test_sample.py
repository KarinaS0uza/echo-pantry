"""Real anonymous reference endpoints against an isolated seeded database."""

from datetime import date
from decimal import Decimal
from io import StringIO

import pytest
from django.core.cache import cache
from django.core.management import call_command
from rest_framework.test import APIClient

from catalog.models import Food, Recipe, SamplePantrySeed
from common.throttles import SampleThrottle
from meals.domain.matching import match_recipe
from pantry.models import CustomFood, PantryItem
from sample.views import recipe_input, sample_stock

pytestmark = pytest.mark.django_db


@pytest.fixture
def client(monkeypatch):
    cache.clear()
    monkeypatch.setattr("sample.views.local_today", lambda: date(2026, 9, 8))
    yield APIClient()
    cache.clear()


@pytest.fixture
def seeded(client):
    call_command("seed_reference_data", stdout=StringIO())
    return client


def result_ids(body):
    return [row["recipe"]["id"] for row in body["completeMatches"] + body["purchaseNeeded"]]


def test_anonymous_seeded_coverage_uses_real_matcher(seeded):
    response = seeded.get("/api/v1/sample/meals")
    assert response.status_code == 200
    body = response.json()
    complete, incomplete = body["completeMatches"], body["purchaseNeeded"]
    assert body["isSample"] is True and body["servings"] == 2
    assert len(complete) == 7 and len(incomplete) == 23
    assert len(complete) + len(incomplete) == Recipe.objects.count() == 30
    assert {row["recipe"]["cuisine"] for row in complete} == {
        "american",
        "korean",
        "indian",
        "brazilian",
    }
    assert sum(not row["recipe"]["isSide"] for row in complete) >= 2
    assert all(row["isCompleteMatch"] for row in complete)
    assert all(not row["isCompleteMatch"] for row in incomplete)
    assert [row["rank"] for row in complete + incomplete] == list(range(1, 31))
    pantry = sample_stock()
    expected = {
        recipe.pk
        for recipe in Recipe.objects.prefetch_related("ingredients")
        if match_recipe(recipe_input(recipe), pantry, servings=2)["isCompleteMatch"]
    }
    assert {row["recipe"]["id"] for row in complete} == expected
    for row in complete + incomplete:
        explanation = row["explanation"]
        assert explanation["reasonSummary"]
        assert explanation["urgencyTier"] in {
            "review",
            "use_today",
            "use_soon",
            "coming_up",
            "neutral",
            "unknown",
        }
        if row["isCompleteMatch"]:
            assert row["estimate"] is None
        else:
            assert row["estimate"]["status"] == "incomplete"
            assert row["estimate"]["purchaseCostCents"] is None
            assert row["estimate"]["portionCostCents"] is None
            assert row["estimate"]["estimateLabel"]


def test_public_pantry_and_food_catalog_do_not_expose_owned_food(seeded, user_factory):
    user = user_factory()
    private = CustomFood.objects.create(
        owner=user, name="Private family ingredient", category="pantry"
    )
    response = seeded.get("/api/v1/sample/pantry", HTTP_AUTHORIZATION="Bearer invalid")
    assert response.status_code == 200
    body = response.json()
    assert body["isSample"] is True
    assert len(body["items"]) == SamplePantrySeed.objects.count()
    assert all(set(row["food"]) == {"id", "name", "category"} for row in body["items"])
    catalogue = seeded.get("/api/v1/sample/foods").json()
    assert catalogue["isSample"] is True
    assert {row["id"] for row in catalogue["results"]} == set(
        Food.objects.values_list("pk", flat=True)
    )
    assert private.name not in str(catalogue)


def test_sample_reads_are_isolated_and_do_not_mutate(seeded, pantry_item_factory):
    food = Food.objects.first()
    owned = pantry_item_factory(food=food, quantity="999", date=date(2026, 9, 7))
    before_seed = list(SamplePantrySeed.objects.order_by("pk").values())
    before_owned = list(PantryItem.objects.order_by("pk").values())
    baseline = seeded.get("/api/v1/sample/meals").json()
    seeded.force_authenticate(owned.owner)
    assert seeded.get("/api/v1/sample/meals").json() == baseline
    assert result_ids(seeded.get("/api/v1/sample/meals?favorites=true").json()) == []
    for path in ("/api/v1/sample/pantry", "/api/v1/sample/meals", "/api/v1/sample/foods"):
        for method in ("post", "put", "patch", "delete"):
            assert (
                getattr(seeded, method)(path, {"quantity": "1"}, format="json").status_code == 405
            )
    assert seeded.get("/api/v1/sample/meals?servings=12").status_code == 200
    assert seeded.get("/api/v1/sample/meals?maxTime=30").status_code == 200
    assert seeded.get("/api/v1/recipes/US-01?servings=4").status_code == 200
    assert seeded.get("/api/v1/sample/meals").json() == baseline
    assert list(SamplePantrySeed.objects.order_by("pk").values()) == before_seed
    assert list(PantryItem.objects.order_by("pk").values()) == before_owned


def test_sample_throttle_typed_retry_and_client_isolation(client, monkeypatch):
    monkeypatch.setattr(SampleThrottle, "THROTTLE_RATES", {"sample": "2/min"})
    assert client.get("/api/v1/sample/pantry").status_code == 200
    assert client.get("/api/v1/sample/meals").status_code == 200
    response = client.get("/api/v1/sample/foods")
    assert response.status_code == 429
    assert set(response.json()) == {"detail", "errors", "retryAfter"}
    assert int(response["Retry-After"]) == response.json()["retryAfter"] > 0
    assert client.get("/api/v1/sample/pantry", REMOTE_ADDR="192.0.2.99").status_code == 200


@pytest.mark.parametrize(
    "query,field",
    [
        ("servings=0", "servings"),
        ("servings=13", "servings"),
        ("servings=1.5", "servings"),
        ("servings=2.0", "servings"),
        ("servings=oops", "servings"),
        ("maxTime=15", "maxTime"),
        ("cuisine=unknown", "cuisine"),
        ("vegetarian=yes", "vegetarian"),
        ("avoid=unknown", "avoid"),
        ("useToday=unknown", "useToday"),
        ("includeOptional=unknown:food", "includeOptional"),
        ("servings=1&servings=2", "servings"),
        ("extra=1", "extra"),
    ],
)
def test_invalid_filters_are_typed_field_errors(client, query, field):
    response = client.get("/api/v1/sample/meals?" + query)
    assert response.status_code == 400
    assert response.json()["detail"]
    assert field in response.json()["errors"]


@pytest.mark.parametrize("servings", [1, 2, 12])
def test_detail_scales_and_remains_reference_only(seeded, servings):
    response = seeded.get(f"/api/v1/recipes/US-01?servings={servings}")
    assert response.status_code == 200
    body = response.json()
    recipe = Recipe.objects.get(pk="US-01")
    assert body["requestedServings"] == servings
    assert body["sourceName"] == recipe.source_name and body["sourceUrl"] == recipe.source_url
    assert not {"instructions", "method", "steps", "photography"} & set(body)
    for actual, original in zip(body["ingredients"], recipe.ingredients.all(), strict=True):
        assert actual["food"] == original.food_id
        assert (Decimal(actual["amount"]) if actual["amount"] is not None else None) == (
            original.amount * Decimal(servings) / recipe.yield_servings
            if original.amount is not None
            else None
        )
    assert seeded.get("/api/v1/recipes/nonexistent").status_code == 404
    assert seeded.delete("/api/v1/recipes/US-01").status_code == 405


def test_repeated_selection_and_optional_params_reach_service(client, food_factory, recipe_factory):
    rice, beans, egg, milk = [
        food_factory(id=name, name=name.title(), dietary_flags={"compositionVerified": True})
        for name in ("rice", "beans", "egg", "milk")
    ]
    for index, food in enumerate((rice, beans), 1):
        SamplePantrySeed.objects.create(
            id=index, food=food, quantity=100, unit="g", storage_location="pantry", date_kind="user"
        )
    both = recipe_factory(
        id="BOTH",
        ingredients=[
            {"food": rice},
            {"food": beans},
            {"food": egg, "optional": True},
            {"food": milk, "optional": True},
        ],
    )
    recipe_factory(id="ONE", ingredients=[{"food": rice}])
    body = client.get("/api/v1/sample/meals?useToday=rice&useToday=beans").json()
    assert result_ids(body) == [both.pk]
    body = client.get(
        "/api/v1/sample/meals?includeOptional=BOTH:egg&includeOptional=BOTH:milk"
    ).json()
    target = next(row for row in body["purchaseNeeded"] if row["recipe"]["id"] == both.pk)
    assert {row["food"] for row in target["explanation"]["missing"]} == {"egg", "milk"}
    body = client.get("/api/v1/sample/meals?avoid=beans&avoid=rice").json()
    assert result_ids(body) == []


def test_unknown_time_and_selection_empty_state_through_api(client, food_factory, recipe_factory):
    rice, beans = [food_factory(id=name) for name in ("rice", "beans")]
    for index, food in enumerate((rice, beans), 1):
        SamplePantrySeed.objects.create(
            id=index, food=food, quantity=100, unit="g", storage_location="pantry", date_kind="user"
        )
    recipe_factory(id="UNKNOWN", ingredients=[{"food": rice}], total_time_minutes=None)
    recipe_factory(id="THIRTY", ingredients=[{"food": rice}], total_time_minutes=30)
    assert set(result_ids(client.get("/api/v1/sample/meals").json())) == {"UNKNOWN", "THIRTY"}
    assert result_ids(client.get("/api/v1/sample/meals?maxTime=30").json()) == ["THIRTY"]
    body = client.get("/api/v1/sample/meals?useToday=rice&useToday=beans").json()
    assert result_ids(body) == [] and body["emptyState"] == "no_selection_match"


def test_api_urgency_uses_local_calendar_and_preserves_unknown(client, food_factory):
    for index, item_date in enumerate((date(2026, 9, 7), date(2026, 9, 8), None), 1):
        SamplePantrySeed.objects.create(
            id=index,
            food=food_factory(),
            quantity=100,
            unit="g",
            storage_location="pantry",
            date_kind="user",
            date=item_date,
        )
    items = client.get("/api/v1/sample/pantry").json()["items"]
    assert [item["urgency"] for item in items] == [
        {"tier": "review", "daysRemaining": -1},
        {"tier": "use_today", "daysRemaining": 0},
        {"tier": "unknown", "daysRemaining": None},
    ]
    assert SamplePantrySeed.objects.count() == 3


def test_recipe_detail_preserves_unknown_quantity_and_source_flags(client, recipe_factory):
    recipe = recipe_factory(
        id="UNKNOWN",
        ingredients=[{"amount": None, "unit": None, "to_taste": False}],
        total_time_minutes=None,
        vegetarian_verified=None,
    )
    body = client.get(f"/api/v1/recipes/{recipe.pk}?servings=12").json()
    assert body["ingredients"][0]["amount"] is None
    assert body["ingredients"][0]["toTaste"] is False
    assert body["totalTimeMinutes"] is None
    assert body["vegetarianVerified"] is None


def test_curated_list_filters_use_verified_metadata(client, recipe_factory):
    recipe_factory(id="VERIFIED", total_time_minutes=30, vegetarian_verified=True)
    recipe_factory(id="UNKNOWN", total_time_minutes=None, vegetarian_verified=None)
    response = client.get("/api/v1/recipes?maxTime=30&vegetarian=true")
    assert response.status_code == 200
    assert [row["id"] for row in response.json()["recipes"]] == ["VERIFIED"]
    assert client.get("/api/v1/recipes?maxTime=30&maxTime=60").status_code == 400
    assert client.post("/api/v1/recipes", {}).status_code == 405
