from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle


class ClientThrottle(SimpleRateThrottle):
    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class SampleThrottle(ClientThrottle):
    scope = "sample"


class AuthThrottle(ClientThrottle):
    scope = "auth"


class UserThrottle(UserRateThrottle):
    scope = "user"
