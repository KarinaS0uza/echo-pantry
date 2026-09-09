import hashlib
import json
from functools import wraps

from django.db import transaction
from rest_framework import serializers
from rest_framework.exceptions import APIException
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from common.models import MutationReceipt


class Conflict(APIException):
    status_code = 409
    default_detail = "This idempotency key was used with a different request."


def replayable(method):
    """Opt-in, owner-scoped replay. The receipt commits with the original mutation."""

    @wraps(method)
    def invoke(self, request, *args, **kwargs):
        header = request.headers.get("Idempotency-Key")
        if not header:
            return method(self, request, *args, **kwargs)
        key = serializers.UUIDField().run_validation(header)
        canonical = json.dumps(
            [request.path, request.method, request.data], sort_keys=True, separators=(",", ":")
        )
        fingerprint = hashlib.sha256(canonical.encode()).hexdigest()
        with transaction.atomic():
            previous = MutationReceipt.objects.filter(owner=request.user, key=key).first()
            if previous:
                if previous.fingerprint != fingerprint:
                    raise Conflict()
                return Response(previous.response, status=previous.status)
            response = method(self, request, *args, **kwargs)
            if 200 <= response.status_code < 300:
                MutationReceipt.objects.create(
                    owner=request.user,
                    key=key,
                    fingerprint=fingerprint,
                    response=json.loads(JSONRenderer().render(response.data)),
                    status=response.status_code,
                )
            return response

    return invoke
