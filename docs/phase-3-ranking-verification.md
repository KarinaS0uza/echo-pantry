# Phase 3 independent matching and ranking verification

Date: 2026-09-08. Constitution: 4.1.0.
Scope: T029, T031, T042, and T043, under the user's authorization to start
independent Phase 3 work while preserving Phase 2.

## Implemented and checked

- Added the pure `meals.domain.ranking.rank` function with immutable `RankingInput`
  records. Complete matches always precede purchase-needed recipes. Complete ties
  use short-lived food, known date, oldest stock, favorite, and title, in that order.
  Purchase ties use favorite, valid package total, missing count, and urgency.
- Unknown totals and dates remain `None`. Equal titles use recipe IDs for stable
  ordering. Inputs and stock are never mutated; newly added stock gets no boost.
- Verified existing `matching.match_recipe` without editing it. Tests cover serving
  scaling, separate purchases, repeated ingredient lines, unit compatibility,
  uncertain quantities, optional ingredients, to-taste presence, water, and
  raw/cooked identity separation.

Observed commands from `backend/`:

- `.venv/bin/python -m pytest tests/domain/test_matching.py tests/domain/test_ranking.py tests/domain/test_urgency.py -q`:
  58 passed (18 matching, 17 ranking, 23 existing urgency).
- `.venv/bin/ruff check meals/domain/ranking.py tests/domain/test_ranking.py tests/domain/test_matching.py`:
  passed.
- `.venv/bin/ruff format meals/domain/ranking.py tests/domain/test_ranking.py tests/domain/test_matching.py`:
  formatting applied to the new test files.

## Integration boundary

The future meal service must supply facts about ingredients actually used by each
recipe: verified short-lived food status, local calendar dates, stock age, favorites,
missing count, and a valid total for all missing packages. It must supply `None` for
unavailable/ineligible prices. The ranker does not infer shelf life from ingredient
names or validate price observations. Pricing eligibility and service assembly remain
separate tasks. Urgency uses the existing canonical tiers; the meals contract's older
`soon` example needs reconciliation during API integration.

No Phase 2 implementation, reference data, configuration, UI, running server, or
browser QA evidence was changed by this slice. Phase 2 completion and the Phase 3
end-to-end checkpoint are not claimed. Explanations, sample API, discovery screens,
and browser acceptance remain open.

## Wording and browser review

User-facing wording review is not applicable: this slice introduces internal Python
records and test fixtures only. Developer validation errors are not exposed through
an endpoint. No translated copy or rendered UI changed, so browser QA is not
applicable to this slice. Visible explanations and unknown-date/price labels must
still be verified when the API and UI are connected.

Specification checklist: 16 checked, zero unchecked. The clarification review has no
checkbox items or pending question. Extension hooks were skipped because
`.specify/extensions.yml` is absent.
