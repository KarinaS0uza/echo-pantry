from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from accounts.models import User
from catalog.models import Food
from pantry.models import CustomFood, PantryItem

pytestmark = pytest.mark.django_db


def test_factory_persists_separate_purchases_without_extra_owners_or_foods(
    pantry_item_factory, user_factory, food_factory
):
    owner, food = user_factory(), food_factory()
    first = pantry_item_factory(owner=owner, food=food, quantity=Decimal("0.123456"))
    second = pantry_item_factory(owner=owner, food=food)
    first.refresh_from_db()
    assert first.quantity == Decimal("0.123456")
    assert first.pk != second.pk and first.date is None
    assert User.objects.count() == Food.objects.count() == 1


def test_factory_defaults_are_independent(pantry_item_factory):
    first, second = pantry_item_factory(), pantry_item_factory()
    assert first.owner_id != second.owner_id
    assert first.food_id != second.food_id


def test_custom_food_factory_preserves_owner_and_rejects_cross_owner(
    pantry_item_factory, user_factory
):
    owner = user_factory()
    food = CustomFood.objects.create(owner=owner, name="Home mix", category="pantry")
    item = pantry_item_factory(owner=owner, custom_food=food)
    assert item.food_id is None and item.custom_food_id == food.pk
    with pytest.raises(ValidationError, match="belonging"):
        pantry_item_factory(custom_food=food)


@pytest.mark.parametrize(
    "values",
    [
        {"quantity": Decimal("-1")},
        {"quantity": Decimal("1000000")},
        {"quantity": Decimal("NaN")},
        {"quantity": Decimal("0.0000001")},
        {"unit": "bucket"},
        {"storage_location": "garage"},
        {"food": None},
        {"date_kind": "estimate"},
    ],
)
def test_invalid_stock_is_rejected(pantry_item_factory, values):
    with pytest.raises(ValidationError):
        pantry_item_factory(**values)
    assert not PantryItem.objects.exists()


def test_database_rejects_negative_stock_even_when_save_is_bypassed(pantry_item_factory):
    item = pantry_item_factory()
    with pytest.raises(IntegrityError), transaction.atomic():
        PantryItem.objects.filter(pk=item.pk).update(quantity=-1)
    item.refresh_from_db()
    assert item.quantity == 1
    item.quantity = Decimal("0")
    item.save()  # A future deduction can retain zero stock for history and undo.
    item.refresh_from_db()
    assert item.quantity == 0


def test_owner_deletion_cascades_custom_food_and_stock(pantry_item_factory, user_factory):
    owner = user_factory()
    custom = CustomFood.objects.create(owner=owner, name="Home mix", category="pantry")
    pantry_item_factory(owner=owner, custom_food=custom)
    owner.delete()
    assert not CustomFood.objects.exists() and not PantryItem.objects.exists()
