# UI

**Status:** Phase 2 shared components and five route scaffolds are implemented. The component
preview and route/overlay layouts were exercised in the local browser at 320 and 1024 widths
in both themes. T023-T025 remain open because the complete component-state, detail-template
and final account/FAB matrix is not recorded. Product and full device acceptance remain open.
See [browser evidence](../artifacts/browser-qa/2026-09-08-phase-2/report.md).

This guide brings together the current visual, component, and interaction requirements.
[Frontend](frontend.md) covers application structure and data integration. The
[constitution](../.specify/memory/constitution.md) governs scope and resolves differences
between older design examples and current requirements.

## Design references

| Reference | Purpose |
|---|---|
| [Design system](../planning/design/design.md) | Visual language and composition rules. |
| [Tokens](../planning/design/tokens.ts) | Authoritative visual values and semantic mappings. |
| [Component catalogue](../planning/design/components.md) | Components, variants, states, and templates. |
| [Reference implementations](../planning/design/code.md) | Theme and component examples for implementation. |
| [Patterns](../planning/design/patterns.md) | Detailed accessibility, motion, imagery, and copy patterns. |

These references include future component examples. V1 uses manual pantry entry, Meals,
Pantry with History, My Recipes, authentication, a thin landing screen, and shared entry
and cooking-review forms. Photo/barcode capture, guided cooking, timers, shopping lists,
rescued-items counters, and offline write queues remain outside this release. Apply the
current recovery rules below where older patterns describe queued offline changes.

## Visual language and tokens

The approved identity is Second Life + Echo Leaf, with the rings and leaf replacing the
lowercase o within Echo. Use `BrandLogo` in shared and kitchen headers and account forms;
use its compact variant beside the two mobile kitchen controls. The brand is charcoal
with a deep teal symbol in light mode and porcelain in dark mode. See the
[brand asset guide](../frontend/public/brand/README.md) for the vector master and SVG exports.

Use porcelain surfaces, deep teal accents, floating ingredient imagery, and quiet reading
areas. Content sits one level above the canvas; surface contrast supplies most of the
depth. Frosted controls belong over photography. Text over an image needs a scrim or
frosted surface with verified contrast.

- Use the shared token source for color, typography, spacing, radii, sizes, elevation,
  breakpoints, and motion. Map tokens into Gluestack without copying their values.
- Use Roboto at tokenized 400, 500, and 700 weights. Required body content is at least
  `type.body`; caption text cannot carry essential meaning by itself.
- Use rem for scalable sizes and pt for hairlines, icon strokes, and blur. Component
  styles must not introduce raw pixel values or independent visual constants.
- Keep structural surfaces neutral. Teal signals primary actions, active navigation,
  and links; urgency colors communicate dates. No pure white or pure black.
- Date estimates have a visible label and editing affordance. Past-date items use neutral
  treatment and wording that asks the user to check the food.

Both light and dark themes must meet the same requirements. Use the supplied dark-theme
surface and border tokens rather than carrying light-theme shadows over unchanged.

## Components and composition

Build from the catalogue's atoms, molecules, organisms, and templates. Wrap Gluestack
primitives in Echo Pantry components; screens import those wrappers and wire data into
templates. Screens contain no independent styling. Variants, sizes, and tones express
visual differences; `Stack` owns spacing and `Surface` owns containers.

The header and right-side navigation drawer are shared across widths. Meals, Pantry, and
My Recipes are the main destinations, with History inside Pantry. The Add item FAB is the
only floating action; lists reserve its safe area. A sample pantry is reachable without
an account, and signed-in visitors bypass the landing screen.

## Responsive layout and imagery

Use the existing `sm` 30rem, `md` 48rem, and `lg` 64rem breakpoints. Center content within
`layout.maxWidth` and keep prose within `measure.max`. Wider layouts gain columns and
space while preserving readable type, control sizes, and touch targets.

Images reserve their dimensions before loading. Use the prescribed floating or framed
treatment and keep name, time, and ingredient explanations available as text. Missing
images fall back to `CategoryIcon` without shifting the layout. Meaningful images have
alternative text; decorative imagery is hidden from assistive technology.

## Accessibility and interaction states

WCAG 2.2 AA is the project target in both themes. Verify text contrast, non-text contrast,
visible keyboard focus, 200% zoom, screen-reader labels, and the full browser/device matrix
in the [acceptance checklist](../planning/acceptance-checklist.md).

- Interactive controls define default, hover, focus-visible, pressed, disabled, and loading
  states, plus selected where applicable. Hover applies only to suitable pointers.
- Targets use `size.touchMin` with adequate separation. Icon-only actions need accessible
  labels. Inputs have visible labels and field errors; placeholders do not replace labels.
- Color never carries meaning alone. Urgency uses text, and errors appear beside their field.
- Sheets, dialogs, and the navigation drawer manage focus, support Escape, and restore focus.
- Loading keeps the control's label and width, shows scoped progress, and guards duplicates.
  Every data view accounts for empty, loading, and error states.

## Motion

Use the existing duration, easing, and spring tokens. Motion is at most 320ms, uses
transform and opacity, and never delays content or blocks input. Reduced-motion settings
remove movement and scaling. Focus rings appear immediately. Avoid decorative looping,
scroll-driven bounce, and staggered animation of lists already being scrolled.

## Recovery and feedback

Show API connection loss through a persistent `OfflineBanner`. Already-loaded data can
remain visible read-only with a clear not-live label. V1 has no offline queue. Failed
optimistic writes roll back, preserve input, and offer a safe retry.

Multi-field forms autosave unsent drafts and offer explicit restoration with Discard.
Preserve input through an expired session. The [frontend guide](frontend.md) owns storage,
timing, authentication recovery, and idempotency details.

Reversible actions provide `UndoToast` using the existing undo window. Direct mark-used
actions do not need a confirmation dialog; recipe cooking uses the required actual-use
review before stock deduction. Permanent destruction uses a dialog with the safe option
focused. Separate Mark used and Mark discarded controls and their visual emphasis.

## Copy and localization

Use sentence case, concrete action labels, and consistent vocabulary. Empty states explain
the next useful action. Errors state what happened and how to recover. Explain why a meal
matches the pantry and which ingredients need using soon. Label date and price estimates;
do not turn usage into claims of money saved or food waste prevented.

Keep user-facing strings in the i18n layer. English is the primary and default language;
Brazilian Portuguese is an optional secondary language selected explicitly through an
accessible control in the shared navigation menu. Remember the choice; do not auto-switch
based on browser language. Never instruct someone to throw food away or make unsupported
health or nutrition claims.

Place the existing language `Select` below drawer routes and above account actions; label it
Language / Idioma and keep the autonyms English / Português (Brasil). Keep the drawer open
and focus on the control after a change. Extend `AuthShell` with an optional in-layout menu
button so authentication forms keep their input during switching. Show storage failures as
non-blocking helper text. Full behavior and copy are in the
[language-selector contract](../specs/001-echo-pantry-mvp/contracts/language-selector.md).

## Verification

Follow [testing](testing.md) and the acceptance checklist for theme, keyboard, responsive,
accessibility, error, draft, and session-recovery checks. Reference component code and
written requirements do not establish that a browser check has passed.

Use the [required browser QA procedure](testing.md#required-browser-qa) at
`http://localhost:3000`: click every implemented screen, inspect actual screenshots against
the [Definition of Done](../planning/design/design.md#definition-of-done), fix failures,
and repeat the browser checks. Keep before/after evidence; screenshots and the action report
are part of completion. Every in-scope screen must be covered before release acceptance.
