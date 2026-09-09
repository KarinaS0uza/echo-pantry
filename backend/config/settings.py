from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

from config.base import *  # noqa: F403
from config.environment import BASE_DIR, load_environment

env = load_environment()
SECRET_KEY = env("DJANGO_SECRET_KEY")
if not SECRET_KEY or SECRET_KEY.startswith("replace-"):
    raise ImproperlyConfigured("Set a local DJANGO_SECRET_KEY.")
SIMPLE_JWT = {**SIMPLE_JWT, "SIGNING_KEY": env("SIMPLE_JWT_SIGNING_KEY", default=SECRET_KEY)}  # noqa: F405
DEBUG = env.bool("DJANGO_DEBUG")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS")
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS")
database_path = Path(env("SQLITE_PATH", default=str(BASE_DIR / "db.sqlite3")))
if not database_path.is_absolute():
    raise ImproperlyConfigured("SQLITE_PATH must be an absolute path.")
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": database_path,
        "OPTIONS": {"transaction_mode": "IMMEDIATE", "timeout": 5},
        "ATOMIC_REQUESTS": False,
    }
}
