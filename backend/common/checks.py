from django.core.checks import Error, Tags, register
from django.db import DatabaseError, connections


@register(Tags.database)
def sqlite_capabilities(app_configs, databases=None, **kwargs):
    errors = []
    for alias in databases or []:
        connection = connections[alias]
        if connection.vendor != "sqlite":
            errors.append(Error("V1 requires Django SQLite.", id="echo.E001"))
            continue
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT json_valid('{\"ready\":true}')")
                valid = cursor.fetchone()[0] == 1
            if not valid:
                raise ValueError
        except (DatabaseError, ValueError):
            errors.append(Error("SQLite with JSON1 must be available.", id="echo.E002"))
    return errors
