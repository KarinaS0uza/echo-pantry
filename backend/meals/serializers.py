"""Validated query contract and shared recommendation response boundary."""

from rest_framework import serializers


class MealQuerySerializer(serializers.Serializer):
    servings = serializers.IntegerField(min_value=1, max_value=12, default=2)
    mealType = serializers.ChoiceField(
        choices=("breakfast", "lunch", "dinner", "side"), required=False
    )
    cuisine = serializers.ChoiceField(
        choices=("american", "korean", "indian", "brazilian"), required=False
    )
    maxTime = serializers.ChoiceField(choices=("any", "30", "60"), default="any")
    vegetarian = serializers.ChoiceField(choices=("true", "false"), required=False)
    favorites = serializers.ChoiceField(choices=("true", "false"), required=False)
    avoid = serializers.ListField(child=serializers.CharField(), required=False)
    useToday = serializers.ListField(child=serializers.CharField(), required=False)
    includeOptional = serializers.ListField(child=serializers.CharField(), required=False)

    def validate(self, attrs):
        for key in ("vegetarian", "favorites"):
            attrs[key] = attrs.get(key) == "true"
        return attrs


class ExplanationSerializer(serializers.Serializer):
    reasonSummary = serializers.CharField()
    available = serializers.ListField(child=serializers.DictField())
    missing = serializers.ListField(child=serializers.DictField())
    checkQuantity = serializers.ListField(child=serializers.DictField())
    soonestUseByDate = serializers.CharField(allow_null=True)
    urgencyTier = serializers.ChoiceField(
        choices=("review", "use_today", "use_soon", "coming_up", "neutral", "unknown")
    )
    usesExpiring = serializers.ListField(child=serializers.CharField())
    useFirst = serializers.CharField(allow_null=True)
    optionalAdditions = serializers.ListField(child=serializers.DictField())


class SuggestionSerializer(serializers.Serializer):
    recipe = serializers.DictField()
    rank = serializers.IntegerField(min_value=1)
    isCompleteMatch = serializers.BooleanField()
    explanation = ExplanationSerializer()
    estimate = serializers.DictField(allow_null=True)


class MealsResponseSerializer(serializers.Serializer):
    servings = serializers.IntegerField(min_value=1, max_value=12)
    completeMatches = SuggestionSerializer(many=True)
    purchaseNeeded = SuggestionSerializer(many=True)
    isSample = serializers.BooleanField(required=False)
    emptyState = serializers.CharField(required=False)
    excludedRecipes = serializers.ListField(child=serializers.DictField(), required=False)
