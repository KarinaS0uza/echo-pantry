# Interactive kitchen simulation

**Superseded demo boundary:** The owner-requested end-to-end demo now uses SQLite-backed
inventory, six-step tomato and burrata pasta, reviewed deductions, and cooking rewards.
See [the current demo walkthrough](demo-walkthrough.md). The simulation boundaries below
describe the earlier implementation and are retained as historical context.

The owner-selected design reference is implemented at `http://localhost:3000/#/kitchen`.
The app root opens the simple landing page; the simulation remains at `#/kitchen`. Existing Meals, recipe, Pantry, and account
routes remain available. Kitchen is also available through the shared navigation menu.

The preview uses warm porcelain layers, transparent food imagery, teal pill controls,
large display type, an overlapping recipe surface, and an always-dark cooking panel.
At the desktop breakpoint, Kitchen, Recipe, and Cooking appear side by side, matching
the reference board. Below that breakpoint, actions move between individual views.
Phone views occupy the full screen without the desktop preview toolbar or outer frame.
Search shares the header with the menu; responsive type and imagery keep the headline on
two lines. Recipe actions stay reachable while scrolling, and changing views resets scroll
and focus. See [the phone follow-up](../artifacts/browser-qa/2026-09-08-kitchen-phone/report.md).
The selected view and recipe are encoded in the URL for reload and browser navigation.

## Working interactions

- Tomato and bean recipe selection through the featured card, quick ideas, or search.
- Search with a helpful empty state.
- Bookmarks for the current visit, with accessible selected states and feedback.
- Ingredients and Method tabs, keyboard tab selection, and ingredient checkboxes.
- Six cooking steps, previous/next controls, tips, and a completion state.
- Start, pause, resume, and reset for timed steps. The countdown uses a deadline so delayed
  browser callbacks cannot extend the timer. Completion is announced without a per-second
  live announcement.
- Light/dark appearance and English/Portuguese controls.
- Direct Pantry access and access to the existing API-backed sample Meals.

## Simulation boundary

This is the explicitly requested interactive UI simulation, not completion of the baseline
guided-cooking or owned-pantry workflows. The two demonstration recipes and generated images
are separate from the verified catalogue. There are no API writes or pantry deductions.
Bookmarks, ingredient checks, cooking progress, and timers last for the mounted preview
only and reset after a full reload. Theme and language use existing UI preferences.
Sample/preview labels and explanatory banners were removed from the user interface at the
owner's request on 2026-09-08. The data and functionality boundaries documented here remain
unchanged. See [the wording verification](../artifacts/browser-qa/2026-09-08-remove-sample-copy/report.md).

The user request authorizes these interactive design demonstrations, including the timer
shown in the reference. It does not complete or silently replace the baseline feature tasks.

## Implementation and evidence

- `frontend/src/components/KitchenPreview.tsx`: preview variants of the catalogue's
  RecipeCard, IdeaTile, RecipeDetail, CookMode, and Timer compositions.
- `frontend/src/design/KitchenStyles.tsx`: scoped responsive styling.
- `planning/design/tokens.ts`: named preview layout and depth tokens.
- `frontend/src/design/theme.tsx`: ThemeScope keeps Cooking dark without changing the
  document's selected theme.
- [Food images and exact generation prompts](../frontend/public/images/kitchen/README.md):
  four PNGs generated with the built-in imagegen tool and stored inside the project.
- [Browser verification](../artifacts/browser-qa/2026-09-08-kitchen-simulation/report.md).

No screen capture was used. The reference and generated image files were inspected directly;
the rendered app was checked through text and DOM interactions. Visual fidelity, contrast,
200% zoom, and real-device acceptance remain open until independently demonstrated.

## Pantry entry without sign-up

The Pantry action now opens an inline ingredient-entry form at `#/pantry`. The current
button reads "Add Ingredient". It accepts a name, positive quantity, unit, storage location,
and optional date. Added items are separate from the read-only sample and remain in memory
while navigating between screens during this visit. Reloading clears submitted items;
unfinished form fields use the existing local draft recovery and navigation warning.
The visible notice explains these limits and that recommendations do not use visit items.
Server-backed pantry saving remains part of Phase 4, which is not marked complete.
See [text-only entry verification](../artifacts/browser-qa/2026-09-08-pantry-entry/report.md).
