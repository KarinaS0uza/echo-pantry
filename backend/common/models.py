from django.conf import settings
from django.db import models


class OwnedModel(models.Model):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, db_index=True)

    class Meta:
        abstract = True


class DemoState(models.Model):
    """One explicitly shared local demo, separate from sample and account records."""

    items = models.JSONField(default=list)
    completions = models.JSONField(default=dict)
    ingredient_batches = models.JSONField(default=dict)
    points = models.PositiveIntegerField(default=0)
    meals_cooked = models.PositiveIntegerField(default=0)

    def __str__(self):
        return "Shared local demo pantry"


class MutationReceipt(OwnedModel):
    """Replay protection for explicitly keyed pantry writes after ambiguous responses."""

    key = models.UUIDField()
    fingerprint = models.CharField(max_length=64)
    response = models.JSONField()
    status = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["owner", "key"], name="mutation_owner_key")]

    def __str__(self):
        return str(self.key)
