from django.http import Http404


class OwnedViewSetMixin:
    """Filter before object lookup, including writes; never disclose another owner."""

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        return queryset.filter(owner=user) if user.is_authenticated else queryset.none()

    def get_object(self):
        try:
            return super().get_object()
        except Http404:
            raise Http404("Not found.") from None

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
