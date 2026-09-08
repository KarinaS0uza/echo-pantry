"""Checks for environment loading and test-database safety, not application acceptance."""

import sqlite3
from pathlib import Path

import environ
import pytest
from django.db import connection

from config import environment


def test_environment_loads_backend_file_from_another_directory(tmp_path, monkeypatch):
    backend = tmp_path / "backend"
    backend.mkdir()
    (backend / ".env").write_text(
        "DJANGO_SECRET_KEY=fixture-only\nDJANGO_DEBUG=true\n"
        "DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(environment, "BASE_DIR", backend)
    monkeypatch.setattr(environ.Env, "ENVIRON", {})
    monkeypatch.chdir(tmp_path)

    env = environment.load_environment()

    assert env("DJANGO_SECRET_KEY") == "fixture-only"
    assert env.bool("DJANGO_DEBUG") is True
    assert env.list("DJANGO_ALLOWED_HOSTS") == ["localhost", "127.0.0.1"]


def test_process_environment_takes_precedence(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text("DJANGO_DEBUG=true\n", encoding="utf-8")
    monkeypatch.setattr(environ.Env, "ENVIRON", {"DJANGO_DEBUG": "false"})
    assert environment.load_environment(env_file).bool("DJANGO_DEBUG") is False


def test_missing_environment_has_no_secret_fallback(tmp_path, monkeypatch):
    monkeypatch.setattr(environ.Env, "ENVIRON", {})
    env = environment.load_environment(tmp_path / "missing.env")
    assert env.bool("DJANGO_DEBUG") is False
    assert env.list("CORS_ALLOWED_ORIGINS") == ["http://localhost:3000"]
    with pytest.raises(environ.ImproperlyConfigured):
        env("DJANGO_SECRET_KEY")


@pytest.mark.django_db
def test_database_is_isolated_and_supports_json(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT json_valid(%s)", ['{"setup": true}'])
        assert cursor.fetchone() == (1,)
        cursor.execute("PRAGMA database_list")
        db_path = next(row[2] for row in cursor.fetchall() if row[1] == "main")
    if request.config.getoption("--sqlite-file"):
        assert Path(db_path).is_file()
        assert environment.BASE_DIR not in Path(db_path).parents
    else:
        assert db_path == ""
    assert connection.settings_dict["OPTIONS"]["transaction_mode"] == "IMMEDIATE"
    assert connection.settings_dict["ATOMIC_REQUESTS"] is False


@pytest.mark.sqlite_file
@pytest.mark.django_db(transaction=True)
def test_file_database_is_shared_by_independent_connections():
    db_path = Path(connection.settings_dict["NAME"])
    assert db_path.is_absolute() and db_path.is_file()
    with connection.cursor() as cursor:
        cursor.execute("CREATE TABLE setup_probe (value INTEGER NOT NULL)")
        cursor.execute("INSERT INTO setup_probe VALUES (1)")
    other = sqlite3.connect(f"{db_path.as_uri()}?mode=rw", uri=True, timeout=0)
    try:
        assert other.execute("SELECT value FROM setup_probe").fetchall() == [(1,)]
        with connection.cursor() as cursor:
            cursor.execute("BEGIN IMMEDIATE")
        try:
            with pytest.raises(sqlite3.OperationalError, match="locked"):
                other.execute("BEGIN IMMEDIATE")
        finally:
            connection.rollback()
        other.execute("UPDATE setup_probe SET value = 2")
        other.commit()
        with connection.cursor() as cursor:
            cursor.execute("SELECT value FROM setup_probe")
            assert cursor.fetchone() == (2,)
    finally:
        other.close()
        with connection.cursor() as cursor:
            cursor.execute("DROP TABLE setup_probe")
