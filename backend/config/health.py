from django.db import DatabaseError
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from catalog.models import Recipe
from common.exceptions import busy_response, is_sqlite_busy

RECIPE_IDS = {
    f"{prefix}-{n:02}"
    for prefix, count in (("US", 9), ("KR", 7), ("IN", 7), ("BR", 7))
    for n in range(1, count + 1)
}


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def health(request):
    try:
        ready = set(Recipe.objects.values_list("id", flat=True)) == RECIPE_IDS
    except DatabaseError as exc:
        if is_sqlite_busy(exc):
            return busy_response()
        ready = False
    if not ready:
        return Response({"detail": "Local service is not ready.", "errors": {}}, status=503)
    return Response({"status": "ok"})
