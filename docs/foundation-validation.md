# Phase 2 foundation validation

Status updated on 2026-09-08: **19 of 22 Phase 2 tasks are demonstrated; T023-T025 remain
pending verification.** T019 is resolved by real CustomFood/PantryItem models, migrations,
and 13 passing factory tests. The Phase 3 integration file-backed backend run passed 143 tests,
including the foundation regressions. Historical phase-specific counts below retain their
original scope. The foundation checkpoint
remains incomplete. See the [pending checklist](../specs/001-echo-pantry-mvp/tasks.md#pending-phase-2-work).

The shared infrastructure and Phase 3 sample discovery run locally. Pantry mutations,
sign-in/sign-up forms, personal recipes, cooking deductions, and release acceptance remain
future work. See [Phase 3 verification](phase-3-verification.md).

## Task disposition

| Tasks | Status | Completion evidence or remaining requirement |
|---|---|---|
| T007-T010 | Complete | Reproducible reviewed dataset, all 30 original pages revisited, six sourced rules, 96.875% food coverage and 24 complete recipes. See the [source review](../data/demo/recipe-review.md). |
| T011-T018 | Complete | Real configuration and migrations, health, JWT/CORS, ownership/throttling, typed errors, Decimal conversions, reference models, repeatable seeding and file-backed contention checks passed. |
| T019 | Complete | Real owned models and migrations support the factory. All 13 tests in `backend/tests/test_pantry_factory.py` passed, covering separate purchases, decimal precision, invalid stock, ownership and owner deletion. Other factories retain their existing passing evidence. |
| T020-T022 | Complete | Provider/router scaffolds and token/theme mapping run in the recorded six-route, four-configuration browser matrix; source checks, lint, type checking and build passed. T021 re-exports canonical tokens rather than creating a second copy. |
| T023 | Open | Four text-only width/theme state matrices, conservative glass contrast bounds and forced fallback checks passed after fixes. Actual visual correspondence, photography/focus appearance and real-device evidence remain incomplete. |
| T024 | Open | Form, search, controls, tabs, sheet/dialog, toast and undo interactions were observed. Long-press, the complete component-state matrix and the remaining motion/recovery conditions were not fully recorded. |
| T025 | Open | Main route/template matrix and auth centering retest are recorded. The final account-navigation/FAB pass was interrupted after narrow screenshots; full detail-template and final wide account/FAB coverage are incomplete. |
| T026-T028 | Complete | Client retry/refresh, bundled language and guarded draft/recovery tests passed. Browser language switching, draft restore and API stop/restart retained input. Public-internet disconnection and blocked-storage browser acceptance remain unverified, as distinguished below. |

The T023 follow-up fixes and four-configuration text-only control checks are recorded in
[the T023 report](../artifacts/browser-qa/2026-09-08-t023/report.md). Its 76-test frontend
run, lint, type checking, and build passed. That report supersedes the earlier pending
final-build note; unsupported visual criteria remain open. The original partial evidence
is indexed in the [resolution report](../artifacts/browser-qa/2026-09-08-phase-2-resolution/report.md).

The user authorized Phase 3 integration with regression checks while this remaining
foundation acceptance was pending. New captures remain prohibited. Shared-component visual
acceptance and full release acceptance are not established by that sequencing exception.

## Delivered

- All 30 approved recipe pages were revisited. The reviewed normalizer produces 148 Food
  records, 30 recipes, source-linked ingredient lines, six refrigerator reminder rules,
  and 149 sample portions. Historical price snapshots retain their original provenance.
  See the [per-page review](../data/demo/recipe-review.md).
- Django runs with SQLite IMMEDIATE transactions, a five-second busy timeout, JSON1 checks,
  email-only users, JWT configuration/blacklisting, scoped throttles and ownership helpers.
  Health checks the migrated reference table and its exact 30 recipe IDs. It is the only
  public endpoint implemented in this phase.
- Reference migrations and natural-key seeding are repeatable. Decimal validation happens
  before writes, and each reference group is atomic. Seeding does not import or modify an
  owned table. A file-based independent writer test verifies real contention and rollback.
- The frontend has five hash-route scaffolds, a development-only component exerciser,
  token-based light/dark themes, shared atoms/molecules/templates, and local Roboto fonts.
  Gluestack owns overlay semantics and focus management. App components compose via variants.
- The API client holds access tokens in memory, guards stored refresh tokens, exposes a
  serialized 401 refresh hook, normalizes errors, and permits one bounded safe retry. An
  ordinary mutation is never replayed merely because an arbitrary idempotency key is present.
- Bundled English/Portuguese use an explicit preference and English default. Drafts save
  only allowlisted fields after 500 ms, flush on pagehide, expire after seven days, announce
  restoration, and preserve in-memory input when storage fails. A local API health probe
  drives the persistent connection notice; no offline write queue exists.

## Observed checks

Run from the repository root unless noted:

| Check | Observed result |
|---|---|
| `backend/.venv/bin/ruff check backend` and `ruff format --check backend` | Passed |
| `backend/.venv/bin/pytest -c backend/pytest.ini backend/tests` | Phase 2/setup run: 31 passed; 2 file-only checks skipped |
| Same pytest invocation with `--sqlite-file` | 33 passed, including independent connections and lock rollback |
| `backend/.venv/bin/python backend/manage.py check` | No issues |
| `backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run` | No missing migrations |
| Build recipe dataset and verify sample coverage | 124/128 distinct required foods, 96.875%; 24/30 complete at two servings |
| Repeated `seed_reference_data --check-coverage` | Same coverage; reference keys stable; test user preserved |
| `python3 scripts/validate-price-data.py` | 30 arithmetic/provenance checks passed |
| `npm --prefix frontend test` | 57 passed: runtime, token rules, language, client, drafts, focus, duplicate-submit guard and undo |
| `npm --prefix frontend run build` | Lint, type checking and Vite production build passed |
| Local API health after server restart | HTTP 200, `{"status":"ok"}` |
| Actual rendered application | [Browser report and screenshots](../artifacts/browser-qa/2026-09-08-phase-2/report.md) |

The coverage seed leaves six incomplete recipes, covers all four cuisines and includes
more than two mains. Unknown package/bunch/serving quantities stay uncertain. The minimal
shared matcher and coverage script were brought forward from T029/T035 to satisfy T010/T018;
Phase 3 still owns their complete story-level integration and acceptance.

The final combined backend run reported 54 passed and 2 skipped after independent work
added 23 Phase 3 urgency tests. Those 23 tests are not Phase 2 evidence. The 33-test
file-backed result above is the recorded Phase 2/setup run. Closeout documentation changes
did not require rerunning the passing suites.

## Implementation decisions

See [DECISIONS.md](../DECISIONS.md) for details. The notable task clarifications are:

- The runtime token module re-exports the canonical planning tokens to preserve one source
  of truth. Contrast corrections and shared timing/layout names live in that canonical file.
- Recipe needs its published display name. Unknown quantities permit null amount without
  forcing `to_taste`; this follows the specification's explicit uncertainty requirement.
- CustomFood and PantryItem were brought forward from T047 to resolve the factory dependency.
  The factory now creates real owned stock. The other T047 models and product mutations remain
  later work; no placeholder schema was created.
- The dev-only account navigation toggle exercises NavDrawer and AddItemFAB. It creates no
  account and performs no owned API request. The preview toggle remains clearly labeled as a scaffold and is omitted from the production
  route table. Phase 3 later replaced Meals and added recipe details.
- Modal primitives have stable component identity, explicit portal context and immediate
  removal on close. Entry animation uses bounded tokens. This avoids missing themed styles,
  remounted fields, and Gluestack's default delayed exit swallowing the next click.
- Vite/Vitest prebundle Gluestack's JSX entry and accessibility dependencies through the web
  aliases. `createConfig` is imported from its defining styling package.

## Remaining acceptance and operating limits

The recorded scaffold matrix covers the in-app browser at 320 and 1024 logical widths in
both themes. It is not a complete component-state or device acceptance pass.
Actual mobile Safari/Chrome, 200% native browser zoom, reduced-motion emulation, OS storage
blocking, and public-internet disconnection were not demonstrated. The connected browser
could not apply native zoom, and the Chrome browser-control surface was unavailable. The
release device, language-failure and accessibility checks stay open. The automated storage
failure and English-default tests are evidence for the runtime only.

There are no recipe photographs in this phase. Image fallback geometry was exercised;
photo-specific GlassIconButton contrast and blur fallback need verification with actual
story assets. Do not count this foundation pass as the final T099 screen sweep.

The explicitly pinned baseline still reports 8 npm advisories (7 high, 1 moderate), recorded
since Phase 1. No forced major upgrade was applied. Vite reports one large application chunk
(about 788 kB before gzip, 250 kB gzip); release performance remains a later gate. A transitive
React Native Web `pointerEvents` deprecation warning remains; no application exception was
observed in the final browser interactions.

A consistent local snapshot is recorded in the browser report after reference changes.
Snapshots, databases, source data, scripts, planning records and browser screenshots follow
the existing ignore rules. No accounts, secrets, databases or snapshots were committed.

## Functional follow-up and user scope update (2026-09-08)

The latest [text-only browser run](../artifacts/browser-qa/2026-09-08-phase-2-functional/report.md)
passed the sustained stepper hold/release, keyboard continuation, undo window, draft restore,
blocked-storage message, example sheet/dialog/detail, account-menu/Add Item and navigation
checks. Frontend tests: 86 passed. File-backed backend tests: 153 passed. Lint, type checks
and build passed. No application-source fixes were needed for the final passing run.
One earlier quantity reset remains unconfirmed after two successful retests.

The user waived Phase 2 UI rules originating only in design.md and deferred dependency
upgrades/bundle optimization while functional tests pass. This supersedes earlier no-waiver
and dependency-blocking language for this scope. The current audit has 10 affected packages
(7 high, 3 moderate), not eight; the main bundle is 831.06 kB (263.26 kB gzip). Findings
remain recorded and are not fixed. Independent visual/accessibility/device acceptance
remains pending, with capture still prohibited. T023-T025 are not declared fully accepted.
