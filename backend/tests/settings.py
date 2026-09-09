"""Real application configuration with isolated test credentials and storage."""

from config.base import *  # noqa: F403

SECRET_KEY = "test-only-no-application-credentials"
ALLOWED_HOSTS = ["testserver", "localhost"]
CORS_ALLOWED_ORIGINS = ["http://localhost:3000"]
SIMPLE_JWT = {**SIMPLE_JWT, "SIGNING_KEY": SECRET_KEY}  # noqa: F405
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
        "TEST": {"NAME": ":memory:"},
        "OPTIONS": {"transaction_mode": "IMMEDIATE", "timeout": 5},
        "ATOMIC_REQUESTS": False,
    }
}
