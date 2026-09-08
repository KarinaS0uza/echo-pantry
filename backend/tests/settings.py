"""Setup-only Django settings. Add the real app settings in Phase 2, retaining DB isolation."""

SECRET_KEY = "test-only-no-application-credentials"
INSTALLED_APPS = []
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
