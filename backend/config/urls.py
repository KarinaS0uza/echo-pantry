from django.urls import path

from accounts.views import LoginView, MeView, RefreshView, RegisterView
from catalog.views import FoodsView
from common.demo import DemoCompleteView, DemoIngredientsView, DemoResetView, DemoStateView
from config.health import health
from meals.views import MealsView
from pantry.views import (
    ChecksView,
    CookingReviewView,
    CookingView,
    HistoryView,
    PantryView,
    PreferencesView,
    StockView,
)
from recipes.views import FavoritesView
from sample.views import (
    RecipeDetailView,
    RecipeListView,
    SampleFoodsView,
    SampleMealsView,
    SamplePantryView,
)

urlpatterns = [
    path("api/v1/demo/", DemoStateView.as_view()),
    path("api/v1/demo/ingredients", DemoIngredientsView.as_view()),
    path("api/v1/demo/complete", DemoCompleteView.as_view()),
    path("api/v1/demo/reset", DemoResetView.as_view()),
    path("api/v1/health", health),
    path("api/v1/sample/pantry", SamplePantryView.as_view()),
    path("api/v1/sample/meals", SampleMealsView.as_view()),
    path("api/v1/sample/foods", SampleFoodsView.as_view()),
    path("api/v1/recipes", RecipeListView.as_view()),
    path("api/v1/recipes/<str:recipe_id>", RecipeDetailView.as_view()),
]
handler404 = "common.exceptions.not_found"
handler500 = "common.exceptions.server_error"

urlpatterns += [
    path("api/v1/auth/register", RegisterView.as_view()),
    path("api/v1/auth/token", LoginView.as_view()),
    path("api/v1/auth/token/refresh", RefreshView.as_view()),
    path("api/v1/auth/me", MeView.as_view()),
    path("api/v1/foods", FoodsView.as_view()),
    path("api/v1/pantry-items", PantryView.as_view()),
    path("api/v1/pantry-items/<int:pk>", PantryView.as_view()),
    path("api/v1/cooking-review", CookingReviewView.as_view()),
    path("api/v1/cooking-logs", CookingView.as_view()),
    path("api/v1/cooking-logs/<int:pk>", CookingView.as_view()),
    path("api/v1/history", HistoryView.as_view()),
    path("api/v1/history/<int:pk>", HistoryView.as_view()),
    path("api/v1/preferences", PreferencesView.as_view()),
    path("api/v1/pantry-checks", ChecksView.as_view()),
    path("api/v1/pantry-checks/status", ChecksView.as_view()),
    path("api/v1/favorites", FavoritesView.as_view()),
    path("api/v1/favorites/<int:pk>", FavoritesView.as_view()),
    path("api/v1/meals", MealsView.as_view()),
]
for action in ("mark-used", "mark-discarded", "undo"):
    urlpatterns.append(
        path(f"api/v1/pantry-items/<int:pk>/{action}", StockView.as_view(), {"action": action})
    )
