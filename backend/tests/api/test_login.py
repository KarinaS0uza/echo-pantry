import pytest
from django.core.cache import cache
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_login_profile_and_refresh(user_factory):
    cache.clear()
    user_factory(email="login@example.test", first_name="Cook")
    client = APIClient()
    client.default_format = "json"
    assert client.get("/api/v1/auth/me").status_code == 401
    assert (
        client.post(
            "/api/v1/auth/token", {"email": "login@example.test", "password": "wrong"}
        ).status_code
        == 401
    )
    response = client.post(
        "/api/v1/auth/token", {"email": " LOGIN@example.test ", "password": "test-kitchen-password"}
    )
    assert response.status_code == 200
    tokens = response.data
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
    assert client.get("/api/v1/auth/me").data["name"] == "Cook"
    client.credentials()
    response = client.post("/api/v1/auth/token/refresh", {"refresh": tokens["refresh"]})
    assert response.status_code == 200
    assert response.data["refresh"] != tokens["refresh"]
    assert (
        client.post("/api/v1/auth/token/refresh", {"refresh": tokens["refresh"]}).status_code == 401
    )


@pytest.mark.django_db
def test_login_rate_limit():
    cache.clear()
    client = APIClient()
    client.default_format = "json"
    for _ in range(10):
        assert client.post("/api/v1/auth/token", {}).status_code == 400
    assert client.post("/api/v1/auth/token", {}).status_code == 429
    cache.clear()
