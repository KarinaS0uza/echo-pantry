"""Owned workflow contracts, transactional rollback and SQLite contention."""

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

import pytest
from django.core.cache import cache
from django.db import close_old_connections, connection, transaction
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from catalog.models import SamplePantrySeed
from pantry.models import CookingLog, HistoryEntry, PantryItem
from pantry.serializers import CookingWrite
from pantry.services import cook

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def clear_throttles():
    cache.clear()


@pytest.fixture
def client(user_factory):
    instance = APIClient()
    instance.user = user_factory()
    instance.force_authenticate(instance.user)
    return instance


def test_registration_seed_rotation_and_no_mail(food_factory, mailoutbox):
    food = food_factory()
    SamplePantrySeed.objects.create(
        id=1, food=food, quantity=2, unit="g", storage_location="pantry", date_kind="unknown"
    )
    client = APIClient()
    result = client.post(
        "/api/v1/auth/register",
        {"email": "NEW@example.test", "password": "Kitchen-unique-482!", "name": "Cook"},
        format="json",
    )
    assert result.status_code == 201, result.data
    assert result.data["pantrySeeded"] == 1
    client.credentials(HTTP_AUTHORIZATION="Bearer " + result.data["access"])
    assert client.get("/api/v1/pantry-items").data["items"][0]["food"]["id"] == food.pk
    assert not mailoutbox
    refresh = client.post(
        "/api/v1/auth/token/refresh", {"refresh": result.data["refresh"]}, format="json"
    )
    assert refresh.status_code == 200
    assert refresh.data["refresh"] != result.data["refresh"]
    assert (
        client.post(
            "/api/v1/auth/token/refresh", {"refresh": result.data["refresh"]}, format="json"
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/auth/register",
            {"email": "new@example.test", "password": "Kitchen-unique-482!"},
            format="json",
        ).status_code
        == 400
    )


def test_registration_rolls_back():
    client = APIClient()
    with patch("pantry.services.initialize_pantry", side_effect=RuntimeError("seed failed")):
        result = client.post(
            "/api/v1/auth/register",
            {"email": "rollback@example.test", "password": "Kitchen-unique-482!"},
            format="json",
        )
        assert result.status_code == 500
    assert not User.objects.filter(email="rollback@example.test").exists()


@pytest.mark.parametrize("password", ["short", "password"])
def test_weak_password(password):
    assert (
        APIClient()
        .post(
            "/api/v1/auth/register",
            {"email": "new@example.test", "password": password},
            format="json",
        )
        .status_code
        == 400
    )


def test_auth_throttle():
    client = APIClient()
    for _ in range(10):
        client.post(
            "/api/v1/auth/token",
            {"email": "unknown@example.test", "password": "wrong"},
            format="json",
        )
    result = client.post("/api/v1/auth/token", {}, format="json")
    assert result.status_code == 429
    assert result["Retry-After"]
    assert "retryAfter" in result.data


@pytest.mark.parametrize(
    "path",
    [
        "pantry-items",
        "foods",
        "favorites",
        "history",
        "preferences",
        "pantry-checks/status",
        "meals",
        "cooking-review",
    ],
)
def test_auth_required(path):
    assert APIClient().get("/api/v1/" + path).status_code == 401


@pytest.mark.parametrize("method", ["get", "patch", "delete"])
def test_item_isolation(client, pantry_item_factory, method):
    item = pantry_item_factory()
    assert (
        getattr(client, method)(f"/api/v1/pantry-items/{item.pk}", {}, format="json").status_code
        == 404
    )


@pytest.mark.parametrize(
    "quantity", ["-1", "0", "NaN", "Infinity", "1.0000001", "1000000", "letters"]
)
def test_quantity_validation(client, food_factory, quantity):
    food = food_factory()
    result = client.post(
        "/api/v1/pantry-items",
        {"food": food.pk, "quantity": quantity, "unit": "g", "storageLocation": "pantry"},
        format="json",
    )
    assert result.status_code == 400
    assert "quantity" in result.data["errors"]


def test_crud_validation_and_separate_purchases(client, food_factory):
    food = food_factory()
    body = {"food": food.pk, "quantity": "1.123456", "unit": "g", "storageLocation": "pantry"}
    first = client.post("/api/v1/pantry-items", body, format="json")
    second = client.post("/api/v1/pantry-items", body, format="json")
    assert first.status_code == second.status_code == 201
    assert first.data["id"] != second.data["id"]
    assert first.data["quantity"] == "1.123456"
    path = "/api/v1/pantry-items/" + str(first.data["id"])
    assert client.patch(path, {"date": "bad-date"}, format="json").status_code == 400
    assert (
        client.patch(path, {"storageLocation": "freezer"}, format="json").data["quantity"]
        == "1.123456"
    )
    assert client.delete(path).status_code == 204
    assert not HistoryEntry.objects.exists()
    assert (
        client.post("/api/v1/foods", {"name": " ", "category": "pantry"}, format="json").status_code
        == 400
    )


def test_fractional_deduction_undo_and_zero(client, pantry_item_factory):
    item = pantry_item_factory(owner=client.user, quantity=Decimal("1"), unit="item")
    path = f"/api/v1/pantry-items/{item.pk}"
    for _ in range(5):
        result = client.post(
            path + "/mark-used", {"quantity": "0.000001", "unit": "item"}, format="json"
        )
        assert result.status_code == 200
        undone = client.post(
            path + "/undo", {"historyEntry": result.data["historyEntry"]["id"]}, format="json"
        )
        assert undone.data["pantryItem"]["quantity"] == "1.000000"
    assert not HistoryEntry.objects.exists()
    result = client.post(path + "/mark-discarded", {}, format="json")
    assert result.data["pantryItem"]["quantity"] == "0.000000"
    assert PantryItem.objects.filter(pk=item.pk).exists()
    assert client.post(path + "/mark-used", {}, format="json").status_code == 400
    entry = HistoryEntry.objects.get()
    entry.undo_expires_at = timezone.now() - timedelta(seconds=1)
    entry.save()
    assert client.post(path + "/undo", {"historyEntry": entry.pk}, format="json").status_code == 400


@pytest.fixture
def cooking_case(client, food_factory, recipe_factory, pantry_item_factory):
    food = food_factory()
    recipe = recipe_factory(ingredients=[{"food": food, "amount": Decimal("1"), "unit": "item"}])
    item = pantry_item_factory(owner=client.user, food=food, unit="item", quantity=Decimal("2"))
    body = {
        "recipe": recipe.pk,
        "servings": 2,
        "cookedAt": timezone.now().isoformat(),
        "lines": [
            {
                "food": food.pk,
                "deductions": [{"pantryItem": item.pk, "amount": "0.5", "unit": "item"}],
            }
        ],
    }
    return recipe, item, body


def test_cooking_review_replay_conflict(client, cooking_case):
    recipe, item, body = cooking_case
    review = client.get("/api/v1/cooking-review", {"recipe": recipe.pk, "servings": 2})
    assert review.status_code == 200
    assert review.data["lines"][0]["proposedAllocation"][0]["pantryItem"] == item.pk
    item.refresh_from_db()
    assert item.quantity == 2
    key = str(uuid4())
    first = client.post("/api/v1/cooking-logs", body, format="json", HTTP_IDEMPOTENCY_KEY=key)
    second = client.post("/api/v1/cooking-logs", body, format="json", HTTP_IDEMPOTENCY_KEY=key)
    assert first.status_code == 201, first.data
    assert second.status_code == 200 and first.data == second.data
    body["servings"] = 3
    assert (
        client.post(
            "/api/v1/cooking-logs", body, format="json", HTTP_IDEMPOTENCY_KEY=key
        ).status_code
        == 409
    )
    item.refresh_from_db()
    assert item.quantity == Decimal("1.5") and HistoryEntry.objects.count() == 1


def test_cooking_rollback(client, cooking_case):
    _, item, body = cooking_case
    body["lines"][0]["deductions"].append({"pantryItem": item.pk, "amount": "3", "unit": "item"})
    result = client.post(
        "/api/v1/cooking-logs", body, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid4())
    )
    assert result.status_code == 400
    item.refresh_from_db()
    assert item.quantity == 2
    assert not HistoryEntry.objects.exists() and not CookingLog.objects.exists()


def test_favorites_history_isolation_and_stock(client, cooking_case, user_factory):
    recipe, item, body = cooking_case
    favorite = client.post("/api/v1/favorites", {"curatedRecipe": recipe.pk}, format="json")
    assert favorite.status_code == 201
    assert (
        client.post("/api/v1/favorites", {"curatedRecipe": recipe.pk}, format="json").status_code
        == 200
    )
    result = client.post(
        "/api/v1/cooking-logs", body, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid4())
    )
    stranger = APIClient()
    stranger.force_authenticate(user_factory())
    for resource, pk in [
        ("favorites", favorite.data["id"]),
        ("cooking-logs", result.data["id"]),
        ("history", result.data["historyEntries"][0]["id"]),
    ]:
        assert stranger.get(f"/api/v1/{resource}/{pk}").status_code == 404
        if resource != "cooking-logs":
            assert stranger.delete(f"/api/v1/{resource}/{pk}").status_code == 404
    assert (
        client.delete("/api/v1/history/" + str(result.data["historyEntries"][0]["id"])).status_code
        == 204
    )
    item.refresh_from_db()
    assert item.quantity == Decimal("1.5")


def test_checks_and_preferences(client, pantry_item_factory):
    item = pantry_item_factory(owner=client.user)
    assert (
        client.post(
            "/api/v1/pantry-checks", {"kind": "selected", "items": [item.pk]}, format="json"
        ).status_code
        == 201
    )
    assert client.get("/api/v1/pantry-checks/status").data["lastWholeCheckAt"] is None
    client.post("/api/v1/pantry-checks", {"kind": "whole"}, format="json")
    assert client.get("/api/v1/pantry-checks/status").data["lastWholeCheckAt"]
    value = client.get("/api/v1/preferences").data
    assert client.put("/api/v1/preferences", value, format="json").status_code == 200


@pytest.mark.sqlite_file
@pytest.mark.django_db(transaction=True)
def test_concurrent_cooking_once(client, cooking_case):
    _, item, body = cooking_case
    serializer = CookingWrite(data=body)
    serializer.is_valid(raise_exception=True)
    key = uuid4()
    owner_id = client.user.pk

    def submit():
        close_old_connections()
        try:
            return cook(User.objects.get(pk=owner_id), key, serializer.validated_data)
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: submit(), range(2)))
    assert sorted(created for _, created in results) == [False, True]
    assert results[0][0] == results[1][0]
    item.refresh_from_db()
    assert item.quantity == Decimal("1.5")
    assert HistoryEntry.objects.count() == 1


@pytest.mark.sqlite_file
@pytest.mark.django_db(transaction=True)
def test_lock_timeout_typed(client, cooking_case):
    _, _, body = cooking_case
    owner_id = client.user.pk

    def submit():
        close_old_connections()
        try:
            with connection.cursor() as cursor:
                cursor.execute("PRAGMA busy_timeout=30")
            api = APIClient()
            api.force_authenticate(User.objects.get(pk=owner_id))
            return api.post(
                "/api/v1/cooking-logs", body, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid4())
            )
        finally:
            close_old_connections()

    with transaction.atomic(), ThreadPoolExecutor(max_workers=1) as pool:
        result = pool.submit(submit).result()
    assert result.status_code == 503
    assert result.data["retryAfter"] == 1
    assert not CookingLog.objects.exists()


def test_item_creation_replays_once(client, food_factory):
    food = food_factory()
    body = {"food": food.pk, "quantity": "2", "unit": "g", "storageLocation": "pantry"}
    key = str(uuid4())
    first = client.post("/api/v1/pantry-items", body, format="json", HTTP_IDEMPOTENCY_KEY=key)
    second = client.post("/api/v1/pantry-items", body, format="json", HTTP_IDEMPOTENCY_KEY=key)
    assert first.status_code == second.status_code == 201
    assert first.data["id"] == second.data["id"]
    assert PantryItem.objects.count() == 1
    body["quantity"] = "3"
    assert (
        client.post(
            "/api/v1/pantry-items", body, format="json", HTTP_IDEMPOTENCY_KEY=key
        ).status_code
        == 409
    )


def test_personal_favorite_ownership(client, user_factory):
    from recipes.models import PersonalRecipe

    mine = PersonalRecipe.objects.create(owner=client.user, name="My recipe")
    other = PersonalRecipe.objects.create(owner=user_factory(), name="Other recipe")
    assert (
        client.post("/api/v1/favorites", {"personalRecipe": mine.pk}, format="json").status_code
        == 201
    )
    assert (
        client.post("/api/v1/favorites", {"personalRecipe": other.pk}, format="json").status_code
        == 404
    )


@pytest.mark.sqlite_file
@pytest.mark.django_db(transaction=True)
def test_competing_stock_actions_do_not_overspend(client, pantry_item_factory):
    item = pantry_item_factory(owner=client.user, quantity=Decimal("2"), unit="g")
    owner_id = client.user.pk

    def submit():
        close_old_connections()
        try:
            api = APIClient()
            api.force_authenticate(User.objects.get(pk=owner_id))
            return api.post(
                f"/api/v1/pantry-items/{item.pk}/mark-used",
                {"quantity": "2", "unit": "g"},
                format="json",
            ).status_code
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(lambda _: submit(), range(2)))
    assert sorted(statuses) == [200, 400]
    item.refresh_from_db()
    assert item.quantity == 0
    assert HistoryEntry.objects.count() == 1


def test_history_cursor_and_delete_do_not_change_stock(client, pantry_item_factory):
    item = pantry_item_factory(owner=client.user, quantity=Decimal("30"), unit="g")
    for _ in range(21):
        assert (
            client.post(
                f"/api/v1/pantry-items/{item.pk}/mark-used",
                {"quantity": "1", "unit": "g"},
                format="json",
            ).status_code
            == 200
        )
    first = client.get("/api/v1/history").data
    second = client.get("/api/v1/history", {"cursor": first["next"]}).data
    assert len(first["results"]) == 20 and len(second["results"]) == 1
    assert {row["id"] for row in first["results"]}.isdisjoint(
        {row["id"] for row in second["results"]}
    )
    client.delete("/api/v1/history/" + str(second["results"][0]["id"]))
    item.refresh_from_db()
    assert item.quantity == 9


def test_owned_meals_share_pipeline_and_preview(client):
    from django.core.management import call_command

    from pantry.services import initialize_pantry

    call_command("seed_reference_data", verbosity=0)
    initialize_pantry(client.user)
    stock = list(PantryItem.objects.values_list("pk", "quantity"))
    sample = APIClient().get("/api/v1/sample/meals").data
    owned = client.get("/api/v1/meals").data
    assert owned["isSample"] is False and owned["preview"] is False
    for group in ["completeMatches", "purchaseNeeded"]:
        assert [row["recipe"]["id"] for row in sample[group]] == [
            row["recipe"]["id"] for row in owned[group]
        ]
    assert len(owned["completeMatches"]) == 7
    assert list(PantryItem.objects.values_list("pk", "quantity")) == stock
    recipe = owned["completeMatches"][0]["recipe"]["id"]
    client.post("/api/v1/favorites", {"curatedRecipe": recipe}, format="json")
    favorites = client.get("/api/v1/meals", {"favorites": "true"}).data
    assert [row["recipe"]["id"] for row in favorites["completeMatches"]] == [recipe]
    PantryItem.objects.filter(owner=client.user).delete()
    preview = client.get("/api/v1/meals").data
    assert preview["preview"] is True and preview["prompt"] == "add_real_food"
    assert not HistoryEntry.objects.exists()


def test_expired_access_token(client):
    from rest_framework_simplejwt.tokens import AccessToken

    token = AccessToken.for_user(client.user)
    token.set_exp(lifetime=timedelta(seconds=-1))
    anonymous = APIClient()
    anonymous.credentials(HTTP_AUTHORIZATION="Bearer " + str(token))
    assert anonymous.get("/api/v1/pantry-items").status_code == 401


def test_personal_cooking_keeps_history_snapshot(
    client, food_factory, pantry_item_factory, user_factory
):
    from recipes.models import PersonalRecipe, PersonalRecipeIngredient

    food = food_factory()
    recipe = PersonalRecipe.objects.create(owner=client.user, name="Personal Rice", servings=2)
    PersonalRecipeIngredient.objects.create(recipe=recipe, food=food, amount=Decimal("1"), unit="g")
    item = pantry_item_factory(owner=client.user, food=food, quantity=Decimal("2"), unit="g")
    assert (
        client.get("/api/v1/cooking-review", {"recipe": f"personal:{recipe.pk}"}).status_code == 200
    )
    stranger = APIClient()
    stranger.force_authenticate(user_factory())
    assert (
        stranger.get("/api/v1/cooking-review", {"recipe": f"personal:{recipe.pk}"}).status_code
        == 404
    )
    body = {
        "recipe": f"personal:{recipe.pk}",
        "servings": 2,
        "cookedAt": timezone.now().isoformat(),
        "lines": [
            {"food": food.pk, "deductions": [{"pantryItem": item.pk, "amount": "1", "unit": "g"}]}
        ],
    }
    response = client.post(
        "/api/v1/cooking-logs", body, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid4())
    )
    assert response.status_code == 201, response.data
    recipe.delete()
    assert (
        client.get("/api/v1/cooking-logs/" + str(response.data["id"])).data["recipe"]["title"]
        == "Personal Rice"
    )


def test_custom_food_and_cooking_allocation_isolation(
    client, user_factory, cooking_case, pantry_item_factory
):
    from pantry.models import CustomFood

    other = user_factory()
    food = CustomFood.objects.create(owner=other, name="Private mix", category="pantry", form="na")
    assert all(
        row["id"] != f"custom:{food.pk}" for row in client.get("/api/v1/foods").data["results"]
    )
    result = client.post(
        "/api/v1/pantry-items",
        {
            "customFood": f"custom:{food.pk}",
            "quantity": "1",
            "unit": "g",
            "storageLocation": "pantry",
        },
        format="json",
    )
    assert result.status_code == 404
    _, item, body = cooking_case
    foreign_stock = pantry_item_factory(
        owner=other, food=item.food, unit="item", quantity=Decimal("3")
    )
    body["lines"][0]["deductions"][0]["pantryItem"] = foreign_stock.pk
    assert (
        client.post(
            "/api/v1/cooking-logs", body, format="json", HTTP_IDEMPOTENCY_KEY=str(uuid4())
        ).status_code
        == 404
    )
    assert not CookingLog.objects.exists()


def test_undo_does_not_restore_stock_to_a_different_food(client, pantry_item_factory, food_factory):
    item = pantry_item_factory(owner=client.user, quantity=Decimal("2"))
    result = client.post(
        f"/api/v1/pantry-items/{item.pk}/mark-used", {"quantity": "1", "unit": "g"}, format="json"
    )
    item.food = food_factory()
    item.save(update_fields=["food"])
    assert (
        client.post(
            f"/api/v1/pantry-items/{item.pk}/undo",
            {"historyEntry": result.data["historyEntry"]["id"]},
            format="json",
        ).status_code
        == 400
    )
    item.refresh_from_db()
    assert item.quantity == 1
