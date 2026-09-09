# Echo Pantry: one-minute concept demo

For the spoken presentation, Q&A notes, and actual website recording requirements, use the [presentation kit](presentation-kit.md). This concept storyboard is reference material and does not satisfy the screen-recording requirement.

Prepared September 8, 2026, from a dedicated agent's repository review.

**Format:** timed narration and storyboard, approximately one minute at a natural speaking pace. Rehearse against the time marks and hold the final title until 1:00.

**Status:** the repository contains specifications, design references, prepared source data, and early scaffolding. It does not yet contain a runnable application. The visual cues below describe planned behavior, not captured app interactions. Keep **Concept walkthrough: planned experience** visible throughout.

## Timed script

| Time | Narration | On-screen direction |
|---|---|---|
| 0:00-0:08 | This is Echo Pantry, a planned app for deciding what to cook from food you already own, before you buy more. | Product name and tagline: **Cook from what you already have.** |
| 0:08-0:18 | Start with a sample pantry, without an account. Meals needing no shopping come first, with explanations of which ingredients need using soon. | Storyboard **Try a sample pantry** leading to Meals. Highlight complete matches and a readable urgency explanation. Do not invent a verified sample match. |
| 0:18-0:29 | Choose ingredients for today to focus the suggestions, then open a recipe to see what you have and what is missing. | Storyboard **Choose ingredients for today**, then a recipe's available and missing ingredient groups. |
| 0:29-0:45 | Here is a prepared egg salad example: two eggs are missing. The saved estimate shows three ninety-nine for a carton, or sixty-seven cents for the missing portion, with its store and date. | **Delicious Egg Salad, two servings.** Needs 4 eggs; example pantry has 2. **Carton: $3.99. Missing portion: $0.67.** Supporting text: **Saved Safeway pickup reference, September 7, 2026. Synthetic pantry example. Eggs only; full recipe total unavailable. Taxes and fees excluded.** |
| 0:45-0:56 | With your own account, the planned cooking flow lets you review actual ingredient use before updating your private pantry. | Explicit transition: **Your account**. Storyboard **I cooked this**, an editable ingredient-use review, then confirmation. Keep sample exploration read-only. |
| 0:56-1:00 | Echo Pantry: cook from what you already have. | Hold product name and tagline through 1:00. |

## Presenter notes

- The egg example is a separate prepared scenario, not a result of the preceding ingredient selection. Its pantry quantities are synthetic. The dated price is a saved reference, not a current store quote or full recipe total.
- The saved source recipe uses eight eggs for four servings. Two servings require four eggs; owning two leaves two missing. One twelve-egg carton costs $3.99 in the saved reference. The missing portion is $3.99 / 12 x 2 = $0.665, rounded to $0.67.
- Account creation is outside the timed walkthrough. The last scene illustrates the intended signed-in experience; it must not imply that the public sample can be edited.
- Use the existing warm porcelain and deep teal design direction for any later storyboard production. Avoid treating an unselected logo exploration as an adopted logo.
- Live AI assistance is a proposed follow-on feature. Generated recipes, guided cooking, and claims of measured savings are outside this walkthrough.

## Repository basis

- [Product overview](../../../README.md) and [frontend guide](../../../docs/frontend.md): product purpose, planned status, and navigation.
- [MVP specification](../../../specs/001-echo-pantry-mvp/spec.md): sample exploration, recommendation ordering, ingredient selection, and cooking review.
- [Implementation tasks](../../../specs/001-echo-pantry-mvp/tasks.md): unfinished application and data work.
- [Prepared price example](../../../data/demo/price-examples.json): `egg-salad-two-eggs-missing`, including synthetic quantities and expected cents.
- [Price data notes](../../../data/demo/README.md): source attribution, observation date, exclusions, and incomplete-total rules.
- [Design reference](../../../planning/design/design.md): approved visual direction and browser verification requirements.

## Before replacing the storyboard with a live recording

Implement and seed the application, start the frontend at `http://localhost:3000` and Django at `http://localhost:8000`, and verify the relevant flows in the actual browser. Follow the [required browser QA procedure](../../../docs/testing.md#required-browser-qa), save real screenshots and observations, and link that evidence from the acceptance checklist. This script is not browser QA evidence and does not complete any implementation or acceptance task.
