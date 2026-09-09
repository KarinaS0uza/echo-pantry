import json
import sqlite3
from decimal import Decimal
from io import StringIO

import pytest
from django.apps import apps
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db import OperationalError, connection, models, transaction
from rest_framework import serializers, viewsets
from rest_framework.exceptions import Throttled
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from catalog.models import (
    DateRule,
    Food,
    PriceReference,
    Recipe,
    RecipeIngredient,
    SamplePantrySeed,
)
from common.exceptions import exception_handler
from common.models import OwnedModel
from common.throttles import AuthThrottle, SampleThrottle
from common.units import CHECK_QUANTITY, convert, normalize, sufficient
from common.views import OwnedViewSetMixin
from meals.domain.matching import match_recipe


@pytest.mark.parametrize(
    "quantity,source,target,result",
    [
        (1, "lb", "g", "453.59237"),
        (1, "cup", "ml", "236.5882365"),
        (1, "tbsp", "tsp", "3"),
        (1, "oz", "g", "28.349523125"),
        (1, "fl oz", "ml", "29.5735295625"),
        (1, "kg", "g", "1000"),
        (1, "L", "ml", "1000"),
        (2, "item", "item", "2"),
    ],
)
def test_exact_conversions(quantity, source, target, result):
    assert convert(quantity, source, target) == Decimal(result)


@pytest.mark.parametrize(
    "quantity,unit",
    [
        (None, "g"),
        (True, "g"),
        ("NaN", "g"),
        ("Infinity", "g"),
        (-1, "g"),
        ("unknown", "g"),
        (1, "bunch"),
    ],
)
def test_unknown_quantities(quantity, unit):
    assert normalize(quantity, unit) == CHECK_QUANTITY


def test_sufficient_never_guesses_or_rounds_shortage():
    assert (
        sufficient({"quantity": "1", "unit": "g"}, {"quantity": "0.9999999", "unit": "g"})
        == "missing"
    )
    assert (
        sufficient({"quantity": "1", "unit": "g"}, {"quantity": "100", "unit": "item"})
        == CHECK_QUANTITY
    )
    assert sufficient({"quantity": "1", "unit": "g"}, None) == "missing"


@pytest.mark.django_db
def test_seed_repeat_preserves_users_and_reference_keys(user_factory):
    user = user_factory()
    user_before = type(user).objects.values().get(pk=user.pk)
    call_command("seed_reference_data", check_coverage=True, stdout=StringIO())
    first = {
        model.__name__: list(model.objects.order_by("pk").values())
        for model in (Food, DateRule, Recipe, RecipeIngredient, PriceReference, SamplePantrySeed)
    }
    call_command("seed_reference_data", check_coverage=True, stdout=StringIO())
    assert {
        model.__name__: list(model.objects.order_by("pk").values())
        for model in (Food, DateRule, Recipe, RecipeIngredient, PriceReference, SamplePantrySeed)
    } == first
    assert type(user).objects.values().get(pk=user.pk) == user_before
    assert Recipe.objects.count() == 30
    assert DateRule.objects.count() == 6
    assert PriceReference.objects.count() == 19
    assert PriceReference.objects.filter(package_quantity=Decimal("16.9")).exists()
    assert RecipeIngredient.objects.filter(amount__isnull=True, to_taste=False).exists()
    assert list(apps.get_app_config("meals").get_models()) == []


@pytest.mark.django_db
def test_health_requires_full_migrated_seed_and_is_public():
    client = APIClient()
    assert client.get("/api/v1/health").status_code == 503
    call_command("seed_reference_data", stdout=StringIO())
    response = client.get("/api/v1/health", HTTP_AUTHORIZATION="Bearer invalid")
    assert response.status_code == 200 and response.json() == {"status": "ok"}
    Recipe.objects.filter(pk="US-01").delete()
    assert client.get("/api/v1/health").status_code == 503


@pytest.mark.django_db
def test_health_storage_error_is_generic(monkeypatch):
    monkeypatch.setattr(
        Recipe.objects,
        "values_list",
        lambda *a, **k: (_ for _ in ()).throw(
            OperationalError("/private/file.sqlite3 unavailable")
        ),
    )
    response = APIClient().get("/api/v1/health")
    assert response.json() == {"detail": "Local service is not ready.", "errors": {}}


@pytest.mark.django_db
def test_cors_exact_origin_and_headers():
    client = APIClient()
    response = client.options(
        "/api/v1/health",
        HTTP_ORIGIN="http://localhost:3000",
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS="idempotency-key,authorization",
    )
    assert response["Access-Control-Allow-Origin"] == "http://localhost:3000"
    assert "idempotency-key" in response["Access-Control-Allow-Headers"]
    assert "Access-Control-Allow-Credentials" not in response
    assert "Access-Control-Allow-Origin" not in client.get(
        "/api/v1/health", HTTP_ORIGIN="http://unapproved.test"
    )


@pytest.mark.django_db
def test_user_email_auth_and_blacklist(user_factory):
    user = user_factory(email="  COOK@Example.Test ")
    assert user.email == "cook@example.test"
    assert user.check_password("test-kitchen-password")
    with pytest.raises(ValidationError):
        user_factory(email="Cook@example.test")
    refresh = RefreshToken.for_user(user)
    assert refresh.access_token.payload["exp"] - refresh.access_token.payload["iat"] == 15 * 60
    assert refresh.payload["exp"] - refresh.payload["iat"] == 14 * 24 * 60 * 60
    refresh.blacklist()
    from rest_framework_simplejwt.exceptions import TokenError

    with pytest.raises(TokenError):
        RefreshToken(str(refresh))


def test_throttle_limits_and_typed_envelope():
    cache.clear()
    request = APIRequestFactory().get("/")
    for cls, limit in ((AuthThrottle, 10), (SampleThrottle, 100)):
        throttle = cls()
        for _ in range(limit):
            assert throttle.allow_request(request, None)
        assert not throttle.allow_request(request, None)
        response = exception_handler(Throttled(wait=throttle.wait()), {})
        assert response.status_code == 429
        assert int(response["Retry-After"]) == response.data["retryAfter"]
    unrelated = exception_handler(OperationalError("unrelated SQL error"), {})
    assert unrelated.status_code == 500 and "retryAfter" not in unrelated.data


class OwnedProbe(OwnedModel):
    value = models.CharField(max_length=50)

    class Meta:
        app_label = "tests"


@pytest.mark.django_db(transaction=True)
def test_owned_lookups_hide_other_users_for_reads_and_writes(user_factory):
    class ProbeSerializer(serializers.ModelSerializer):
        class Meta:
            model = OwnedProbe
            fields = ["id", "value"]

    class ProbeView(OwnedViewSetMixin, viewsets.ModelViewSet):
        queryset = OwnedProbe.objects.all()
        serializer_class = ProbeSerializer

    with connection.schema_editor() as editor:
        editor.create_model(OwnedProbe)
    try:
        owner, other = user_factory(), user_factory()
        row = OwnedProbe.objects.create(owner=owner, value="private")
        factory = APIRequestFactory()
        for method, action in (
            ("get", "retrieve"),
            ("patch", "partial_update"),
            ("delete", "destroy"),
        ):
            request = getattr(factory, method)("/", {"value": "changed"}, format="json")
            force_authenticate(request, user=other)
            response = ProbeView.as_view({method: action})(request, pk=row.pk)
            assert response.status_code == 404 and response.data == {
                "detail": "Not found.",
                "errors": {},
            }
        row.refresh_from_db()
        assert row.value == "private"
    finally:
        with connection.schema_editor() as editor:
            editor.delete_model(OwnedProbe)


@pytest.mark.sqlite_file
@pytest.mark.django_db(transaction=True)
def test_real_sqlite_lock_is_retryable_after_rollback(food_factory):
    food = food_factory()
    holder = sqlite3.connect(connection.settings_dict["NAME"])
    try:
        holder.execute("BEGIN IMMEDIATE")
        holder.execute("UPDATE catalog_food SET name=? WHERE id=?", ("held", food.pk))
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA busy_timeout=10")
        try:
            with transaction.atomic():
                Food.objects.filter(pk=food.pk).update(name="lost")
        except OperationalError as error:
            assert not connection.in_atomic_block
            response = exception_handler(error, {})
        else:
            pytest.fail("A competing writer unexpectedly acquired the lock")
        assert response.status_code == 503 and response.data["retryAfter"] == 1
        holder.rollback()
        food.refresh_from_db()
        assert food.name == "Test food"
    finally:
        holder.close()
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA busy_timeout=5000")


@pytest.mark.django_db
@pytest.mark.parametrize("quantity", ["0.000001", "999999.999999", "1.123456"])
def test_sqlite_decimal_bounds(quantity, food_factory):
    row = SamplePantrySeed.objects.create(
        id=1,
        food=food_factory(),
        quantity=Decimal(quantity),
        unit="g",
        storage_location="pantry",
        date_kind="user",
    )
    row.refresh_from_db()
    assert row.quantity == Decimal(quantity)


def test_matcher_aggregates_duplicate_required_lines(settings):
    recipes = json.loads((settings.REFERENCE_DATA_DIR / "recipes.json").read_text())["recipes"]
    recipe = next(r for r in recipes if r["id"] == "US-01")
    recipe["ingredients"] = [
        dict(foodId="salt", amount="1", unit="tsp", optional=False, toTaste=False)
    ] * 2
    recipe["yieldServings"] = "2"
    assert not match_recipe(recipe, [{"foodId": "salt", "quantity": "1", "unit": "tsp"}])[
        "isCompleteMatch"
    ]
