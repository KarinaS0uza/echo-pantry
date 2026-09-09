# Phase 3 independent urgency verification

Date: 2026-09-08. Constitution: 4.1.0. Scope: T030 and T044 only.

The user authorized independent Phase 3 implementation while Phase 2 remains open.
This slice adds a pure calendar-date classification function and its tests in new files.
It does not change Phase 2 implementation, reference data, settings, running servers,
frontend files, or browser QA evidence. Phase 2 and the full Phase 3 checkpoint remain open.

## Behavior and integration boundary

`pantry.domain.urgency.urgency_tier(item_date, today=local_date)` returns the canonical
task/spec tiers: `review`, `use_today`, `use_soon`, `coming_up`, `neutral`, or `unknown`.
The caller must supply a local calendar date. There is no implicit server-clock fallback,
elapsed-hour arithmetic, database access, stock mutation, or food-safety determination.
Datetime and string inputs are rejected so the future service must explicitly convert them.

Future service integration owns resolving the applicable local date and passing it here.
The existing meals contract example uses `soon`; the Phase 3 handoff already tracks
reconciling that example with the canonical task/spec tiers during integration.

## Observed verification

Run from `backend/`:

- `.venv/bin/python -m pytest tests/domain/test_urgency.py -q`: 23 passed.
- `.venv/bin/ruff check pantry/domain/urgency.py tests/domain/test_urgency.py`: passed.
- `.venv/bin/ruff format --check pantry/domain/urgency.py tests/domain/test_urgency.py`:
  both files already formatted.

Tests cover every tier boundary, unknown dates, past-date review without stock changes,
year and leap-year transitions, differing UTC/local calendar dates, daylight-saving
calendar boundaries, and rejection of inputs that are not calendar dates.
The module imports only the Python standard library and takes plain date values,
consistent with the pantry/domain ownership boundary in SC-017.

## Wording and browser review

User-facing wording review: not applicable to this slice. No page, API response, translated
copy, or rendered UI was introduced or changed. The returned identifiers are internal domain
values; exception text is a developer input contract and is not exposed by an endpoint.
Browser QA is not applicable to these unconnected backend files. Rendered urgency labels,
local-date service integration, and full product acceptance remain unverified.

The specification-quality checklist has 16 checked items and no unchecked items; the
clarification review has no checkbox items or pending question. Extension hooks were
skipped because `.specify/extensions.yml` is absent.
