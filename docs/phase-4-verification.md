# Phase 4 implementation and verification

Phase 4's account-owned pantry and cooking workflow is implemented. Runtime migrations are
applied. Backend checks and frontend automated checks pass. The phase is **not fully
verified**: browser retesting was declined after the first run exposed a redirect conflict,
and recording remains prohibited. UI task acceptance stays open.

## Delivered behavior

- Registration validates email/password and creates the account and a private copy of every
  sample stock entry in one transaction. It preserves the optional name field. Sign In uses
  JWTs, refresh rotates tokens, and session recovery keeps an open form mounted.
- Signed-in Pantry reads owned data. The separate demo remains at `/demo/pantry`; signed-in
  `/meals` uses owned recommendations. `/catalogue` exposes the catalogue/sample workflow,
  while `/demo/meals` preserves the separate demonstration.
- Pantry supports manual additions, custom foods, corrections, separate purchases, search,
  category groups, date ordering, deletion of mistaken entries without history, direct use
  and discard, six-second undo, and incremental history with individual deletion.
- Cooking review supports fractional quantities, purchase allocation, replacement, omission,
  outside-pantry sourcing, and explicit no-deduction choices. Confirmations use a stable key,
  canonical fingerprint, original response snapshot, and one short SQLite IMMEDIATE
  transaction. Ambiguous responses retain the exact request for retry.
- Reversible stock changes update the UI optimistically and reconcile with the server.
  Failed writes preserve input. Item creation and custom-food creation accept optional
  idempotency keys, preventing duplicate creation when the user retries a lost response.
- Favorites support curated and owned personal targets. Minimal personal-recipe relations
  were brought forward to support Phase 4 favorites and cooking logs; authoring, variations,
  personal recommendations, and date estimation remain Phase 5.
- Checks expose separate whole-check/edit timestamps. Preferences have validated persistence.
  Anonymous sample reads still use the shared recommendation pipeline without owned writes.

## Implementation decisions

`CookingLogLine.review` keeps the reviewed line as JSON, including allocation amounts,
replacement and omission flags, instead of duplicating the allocation into multiple review
rows. Each actual deduction has its own HistoryEntry. The response snapshot preserves the
recipe title and original results after later recipe deletion.

An explicit `unknown` date kind was added to the existing enum to match the pantry API
contract. Unsupported estimates are stored as unknown; Phase 5 owns the estimate engine.

`common.MutationReceipt` implements optional owner-scoped replay for item/custom-food/stock
writes. Cooking retains its dedicated required-key contract. Ordinary POSTs are never
retried automatically by the client. No background queue was added.

The existing overlay provider rendered form content above its query/router contexts. A
nested provider inside NavigationGuard preserves those contexts in sheets and dialogs.

## Automated evidence

- Full backend regression suite: **197 passed** with temporary file-backed SQLite before
  the final additional cases. The final Phase 4 contract suite: **40 passed**, including
  seed rollback, refresh/blacklist, throttling, ownership, validation, precision, undo,
  replay/conflict, concurrent stock updates, concurrent cooking, lock timeout, cursor
  pagination, sample/owned parity, empty-pantry preview and personal-recipe snapshots.
- Full frontend suite: **114 passed**. Final focused owned-pantry suite: **4 passed**,
  exercising retained input and keyed retry, undo, explicit draft recovery, and identical
  cooking replay. Existing client tests exercise refresh failure, retry bounds, reachability,
  access-token storage and request timeouts.
- Frontend lint, TypeScript and production build pass. The existing large-bundle warning
  remains deferred. Backend Ruff and Django system checks pass; migrations are applied.
- These are automated observations, not proof of browser layout, device behavior or full
  session/restart recovery in the rendered application.

Test cases are consolidated in `backend/tests/api/test_phase4.py` and
`frontend/tests/owned-pantry.test.tsx`, alongside existing regression files.

## Wording review

Reviewed the affected account, pantry, cooking, history and recovery strings in English and
Brazilian Portuguese. New product copy is in the i18n catalogues. Action labels use consistent
capitalization, history distinguishes Used and Discarded, and mistaken deletion is explicitly
separate. User-facing failure messages retain input and avoid claiming a successful save.
Source-provided food/recipe names and server validation prose remain server content.

Rendered automated component tests cover field labels, errors, recovery copy and action
names. The browser run visited Sign Up and submitted it. Pantry/cooking wording, wrapping,
clipping, both themes and real-device presentation still need browser verification.

## Open acceptance

The [browser attempt](../artifacts/browser-qa/2026-09-08-phase-4/report.md) records the actual
run and its limit. T056-T064 and T070 stay open pending the required rendered interaction,
recovery and wording checks. Screenshots, video and screenshot-bearing traces were not
created. No visual or release acceptance is claimed.
