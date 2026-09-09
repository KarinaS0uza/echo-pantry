"""Only recognized SQLite contention is retryable; unrelated failures keep their identity."""

import logging
import sqlite3

from django.db import OperationalError
from django.http import JsonResponse
from rest_framework.exceptions import Throttled, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


def is_sqlite_busy(exc):
    cause = exc.__cause__
    if not isinstance(exc, OperationalError) or not isinstance(cause, sqlite3.OperationalError):
        return False
    code = getattr(cause, "sqlite_errorcode", None)
    return code is not None and code & 0xFF in (sqlite3.SQLITE_BUSY, sqlite3.SQLITE_LOCKED)


def busy_response():
    return Response(
        {"detail": "Database busy. Retry shortly.", "errors": {}, "retryAfter": 1},
        status=503,
        headers={"Retry-After": "1"},
    )


def exception_handler(exc, context):
    # Views/services must let an atomic block unwind before reaching this handler.
    if is_sqlite_busy(exc):
        return busy_response()
    response = drf_exception_handler(exc, context)
    if response is None:
        logging.getLogger(__name__).error("Unhandled API exception", exc_info=exc)
        return Response({"detail": "Request failed.", "errors": {}}, status=500)
    errors = {}
    if isinstance(exc, ValidationError):
        errors = (
            response.data
            if isinstance(response.data, dict)
            else {"non_field_errors": response.data}
        )
        detail = "Please correct the highlighted fields."
    else:
        detail = response.data.get("detail", "Request failed.")
    response.data = {"detail": str(detail), "errors": errors}
    if isinstance(exc, Throttled) and exc.wait is not None:
        response.data["retryAfter"] = int(exc.wait)
        response["Retry-After"] = str(int(exc.wait))
    return response


def not_found(request, exception=None):
    return JsonResponse({"detail": "Not found.", "errors": {}}, status=404)


def server_error(request):
    return JsonResponse({"detail": "Request failed.", "errors": {}}, status=500)
