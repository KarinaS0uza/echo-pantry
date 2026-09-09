from datetime import date

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from catalog.models import SamplePantrySeed
from common.models import DemoState
from pantry.models import PantryItem

pytestmark = pytest.mark.django_db


@pytest.fixture
def client(monkeypatch):
    cache.clear()
    monkeypatch.setattr("common.demo.local_today", lambda: date(2026, 9, 8))
    yield APIClient()
    cache.clear()


def test_demo_add_complete_replay_and_reset_persist_isolated(client):
    original = client.get("/api/v1/demo/").json()
    assert len(original["items"]) == 9
    assert original["items"][0]["date"] == "2026-09-09"
    entry = {
        "nameKey": "Cucumber",
        "quantity": "1",
        "unit": "whole",
        "storageLocation": "fridge",
        "date": "2026-09-10",
    }
    assert (
        client.post("/api/v1/demo/ingredients", {"entries": [entry]}, format="json").status_code
        == 201
    )
    assert len(APIClient().get("/api/v1/demo/").json()["items"]) == 10
    body = {
        "dish": "tomato-burrata",
        "usedIds": ["demo-burrata", "demo-cherryTomatoes"],
        "completionId": "one",
    }
    result = client.post("/api/v1/demo/complete", body, format="json")
    assert result.status_code == 200
    assert result.json()["pointsAwarded"] == 150
    assert len(result.json()["items"]) == 8
    assert client.post("/api/v1/demo/complete", body, format="json").json()["points"] == 150
    assert DemoState.objects.get().meals_cooked == 1
    assert not SamplePantrySeed.objects.exists() and not PantryItem.objects.exists()
    assert client.post("/api/v1/demo/reset", {}, format="json").json() == original


@pytest.mark.parametrize("quantity", ["0", "-1", "NaN", "Infinity", "lots"])
def test_invalid_batch_does_not_persist(client, quantity):
    entry = {
        "nameKey": "Cucumber",
        "quantity": quantity,
        "unit": "whole",
        "storageLocation": "fridge",
    }
    assert (
        client.post("/api/v1/demo/ingredients", {"entries": [entry]}, format="json").status_code
        == 400
    )
    assert not DemoState.objects.exists()


def test_completion_validation_does_not_deduct_or_award(client):
    original = client.get("/api/v1/demo/").json()
    body = {"dish": "tomato-burrata", "usedIds": ["unknown"], "completionId": "one"}
    assert client.post("/api/v1/demo/complete", body, format="json").status_code == 400
    assert client.get("/api/v1/demo/").json() == original
    body["usedIds"] = ["demo-burrata"]
    assert client.post("/api/v1/demo/complete", body, format="json").status_code == 200
    body["usedIds"] = ["demo-pasta"]
    assert client.post("/api/v1/demo/complete", body, format="json").status_code == 400
    state = client.get("/api/v1/demo/").json()
    assert state["points"] == 150
    assert any(item["id"] == "demo-pasta" for item in state["items"])


def test_demo_writes_are_rate_limited(client, monkeypatch):
    monkeypatch.setattr("common.throttles.SampleThrottle.rate", "1/min", raising=False)
    assert client.get("/api/v1/demo/").status_code == 200
    assert client.post("/api/v1/demo/reset", {}, format="json").status_code == 429


def test_batch_retry_does_not_duplicate_ingredients(client):
    entry = {"nameKey": "Cucumber", "quantity": "1", "unit": "whole", "storageLocation": "fridge"}
    body = {"entries": [entry], "requestId": "batch-one"}
    first = client.post("/api/v1/demo/ingredients", body, format="json")
    assert first.status_code == 201
    assert client.post("/api/v1/demo/ingredients", body, format="json").json() == first.json()
    assert len(client.get("/api/v1/demo/").json()["items"]) == 10
    body["entries"][0]["quantity"] = "2"
    assert client.post("/api/v1/demo/ingredients", body, format="json").status_code == 400
