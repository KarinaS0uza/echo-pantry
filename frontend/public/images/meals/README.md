# Meal photographs

Matching finished-dish photographs retrieved on 2026-09-08 from the original pages of
all 30 curated recipes in `data/demo/recipes.json`, for the owner-requested local meal UI.
Each file uses the stable recipe ID. These are source photographs, not generated dishes.

`frontend/src/demo/meal-photos.json` records each recipe title, publisher, original recipe
page, original image URL, and local asset path. The image URL comes from the recipe page's
Open Graph image metadata. Original publishers retain ownership of their photographs.
Recipe details retain the source name and link to the original recipe.

Cards and details share `mealPhotos.ts` so opening a card preserves the selected meal's
photo. Local files avoid a runtime dependency on publisher image hosts. Framed treatment
uses the existing image aspect tokens, rounded corners, and same-size error fallback.
Card photos are decorative beside the recipe title; detail photos use that title as alt text.
