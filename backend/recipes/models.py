from django.db import models

from common.models import OwnedModel


class Favorite(OwnedModel):
    curated_recipe = models.ForeignKey("catalog.Recipe", null=True, on_delete=models.CASCADE)
    personal_recipe = models.ForeignKey("PersonalRecipe", null=True, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "personal_recipe"], name="favorite_owner_personal"
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(curated_recipe__isnull=False, personal_recipe__isnull=True)
                    | models.Q(curated_recipe__isnull=True, personal_recipe__isnull=False)
                ),
                name="favorite_exactly_one_target",
            ),
            models.UniqueConstraint(
                fields=["owner", "curated_recipe"], name="favorite_owner_recipe"
            ),
        ]


class PersonalRecipe(OwnedModel):
    """Relation target prepared for Phase 5 authoring; no authoring endpoint yet."""

    name = models.CharField(max_length=250)
    instructions = models.TextField(blank=True)
    servings = models.PositiveSmallIntegerField(default=2)
    total_time_minutes = models.PositiveIntegerField(null=True)
    categories = models.JSONField(default=list)
    source_url = models.URLField(blank=True)
    source_recipe = models.ForeignKey("catalog.Recipe", null=True, on_delete=models.SET_NULL)
    source_personal_recipe = models.ForeignKey("self", null=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class PersonalRecipeIngredient(models.Model):
    recipe = models.ForeignKey(PersonalRecipe, on_delete=models.CASCADE, related_name="ingredients")
    food = models.ForeignKey("catalog.Food", null=True, on_delete=models.PROTECT)
    custom_food = models.ForeignKey("pantry.CustomFood", null=True, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=12, decimal_places=6, null=True)
    unit = models.CharField(max_length=10, blank=True)
    optional = models.BooleanField(default=False)
    to_taste = models.BooleanField(default=False)
    preparation = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(food__isnull=False, custom_food__isnull=True)
                    | models.Q(food__isnull=True, custom_food__isnull=False)
                ),
                name="personal_ingredient_one_food",
            )
        ]

    def __str__(self):
        return str(self.food_id or self.custom_food_id)
