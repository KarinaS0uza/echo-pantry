"""Test storage never reads SQLITE_PATH or opens the demo database."""

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
