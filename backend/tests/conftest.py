"""Test storage never reads SQLITE_PATH or opens the demo database."""

from datetime import date
from decimal import Decimal
from itertools import count

import pytest


def pytest_addoption(parser):
    parser.addoption(
        "--sqlite-file",
        action="store_true",
        help="Use a fresh temporary SQLite file for independent connection/transaction tests.",
    )


def pytest_collection_modifyitems(config, items):
    if config.getoption("--sqlite-file"):
        return
    skip = pytest.mark.skip(reason="Independent connections require pytest --sqlite-file.")
    for item in items:
        if "sqlite_file" in item.keywords:
            item.add_marker(skip)


@pytest.fixture(scope="session")
def django_db_modify_db_settings(request, tmp_path_factory):
    """Override both names before pytest-django creates a database or opens a connection."""
    from django.conf import settings

    name = ":memory:"
    if request.config.getoption("--sqlite-file"):
        name = str(tmp_path_factory.mktemp("echo-pantry-db") / "test.sqlite3")
    # Django may already hold this dictionary in its connection handler. Mutate it
    # in place so both the settings and the cached connection select the same file.
    settings.DATABASES["default"].update(
        {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": name,
            "OPTIONS": {"transaction_mode": "IMMEDIATE", "timeout": 5},
            "ATOMIC_REQUESTS": False,
        }
    )
    settings.DATABASES["default"]["TEST"]["NAME"] = name


@pytest.fixture
def user_factory(db):
    from accounts.models import User

    ids = count(1)

    def create(**values):
        values.setdefault("email", f"cook{next(ids)}@example.test")
        values.setdefault("password", "test-kitchen-password")
        return User.objects.create_user(**values)

    return create


@pytest.fixture
def food_factory(db):
    from catalog.models import Food

    ids = count(1)

    def create(**values):
        defaults = {
            "id": f"test-food-{next(ids)}",
            "name": "Test food",
            "category": "pantry",
            "default_units": ["g"],
            "form": "na",
        }
        return Food.objects.create(**(defaults | values))

    return create


@pytest.fixture
def recipe_factory(db, food_factory):
    from catalog.models import Recipe, RecipeIngredient

    ids = count(1)

    def create(ingredients=None, **values):
        defaults = {
            "id": f"TEST-{next(ids)}",
            "name": "Test recipe",
            "source_name": "Test source",
            "source_url": "https://example.test/recipe",
            "cuisine": "american",
            "meal_types": ["dinner"],
            "yield_servings": Decimal("2"),
            "retrieved_on": date(2026, 9, 8),
        }
        recipe = Recipe.objects.create(**(defaults | values))
        for index, ingredient in enumerate(ingredients if ingredients is not None else [{}]):
            line = {
                "food": food_factory(),
                "amount": Decimal("100"),
                "unit": "g",
                "source_text": "100 g test food",
                "preparation": str(index),
            } | ingredient
            RecipeIngredient.objects.create(recipe=recipe, **line)
        return recipe

    return create


@pytest.fixture
def price_reference_factory(db, food_factory):
    from catalog.models import PriceReference

    ids = count(1)

    def create(**values):
        defaults = {
            "id": f"test-price-{next(ids)}",
            "food": food_factory(),
            "merchant": "Test store",
            "shopping_method": "pickup",
            "location_verified": True,
            "package_quantity": Decimal("500"),
            "package_unit": "g",
            "price_cents": 399,
            "source_url": "https://example.test/price",
            "observed_page_url": "https://example.test/price",
            "observed_on": date(2026, 9, 8),
            "automatic_estimate_eligible": True,
        }
        return PriceReference.objects.create(**(defaults | values))

    return create


@pytest.fixture
def pantry_item_factory(db, user_factory, food_factory):
    """Create isolated stock using the real owned schema, never a placeholder."""
    from pantry.models import PantryItem

    def create(**values):
        if "owner" not in values and "owner_id" not in values:
            values["owner"] = user_factory()
        if not any(key in values for key in ("food", "food_id", "custom_food", "custom_food_id")):
            values["food"] = food_factory()
        defaults = {
            "quantity": Decimal("1"),
            "unit": "g",
            "storage_location": "pantry",
            "date_kind": "user",
        }
        return PantryItem.objects.create(**(defaults | values))

    return create
