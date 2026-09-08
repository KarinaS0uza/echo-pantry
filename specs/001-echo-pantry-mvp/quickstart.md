# Phase 1 Quickstart: Echo Pantry MVP

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data model**: [data-model.md](./data-model.md) | **Contracts**: [contracts/](./contracts/)

This is a **validation and run guide** - how to stand the system up and prove the feature works
end to end. Implementation detail belongs in `tasks.md` and the implementation phase, not here.

---

## Status and command convention

Phase 1 dependency, environment, and test/lint setup is implemented. See the
[runnable setup commands](../../docs/local-development.md#phase-1-setup).
The app is not implemented yet. Commands below define the run/validation workflow to follow
after the corresponding tasks create the app entry points and missing seed files.
The only currently runnable data check listed here is `scripts/validate-price-data.py`.
Run each standalone block from the repository root unless it explicitly says otherwise.

## Prerequisites

- Python 3.12 with SQLite support and Node/npm compatible with the frontend project.
- Django 5.2 dependencies installed by the backend task; SQLite JSON1 available (Django check).
- Prepared `foods.json`, `recipes.json`, `date-rules.json`, and `sample-pantry.json` in
  `data/demo/`, plus the existing dated price snapshots. Reference the data-preparation tasks.
- Local fonts/images/assets for core flows. Internet is needed for installation/data preparation
  and original recipe links, not the seeded core demo after preparation.

No hosting account, PostgreSQL installation, Docker, cloud secrets, or public URL is needed.
The V2 hosting work is in [future improvements](../../docs/future-improvements.md).

## 0. Prepare the data and environment

```bash
python3 scripts/build-recipe-dataset.py
python3 scripts/validate-price-data.py
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -e './backend[dev]'
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Hand-review the structured recipe output and author date rules/sample entries per research A.
Fill the Django/JWT secret placeholders in `backend/.env` before running Django. Backend config
explicitly loads this file. Local settings:

| Setting | Value |
|---|---|
| Database engine | `django.db.backends.sqlite3` (Django settings) |
| Database name | `BASE_DIR / "db.sqlite3"`, giving `backend/db.sqlite3` |
| SQLite transaction options | `transaction_mode=IMMEDIATE`, `timeout=5`, `ATOMIC_REQUESTS=False` |
| `SQLITE_PATH` | Omit for normal demo; absolute path only when selecting a drill file |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` |
| `DJANGO_DEBUG` | `true` for local development |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` in frontend environment |

Keep `.env`, databases, journals, and `backups/` out of version control. Allow the CORS
`idempotency-key` header and expose `Retry-After` per contracts/README.md.

## 1. Backend - terminal one

```bash
cd backend
source .venv/bin/activate
python manage.py check
python manage.py migrate
python manage.py seed_reference_data --check-coverage
python ../scripts/verify-sample-coverage.py
python manage.py runserver localhost:8000
```

The seed loads reference/sample tables only; re-running it must not touch owned data (AC-41).
Coverage: ≥80% distinct required ingredients and ≥24/30 complete recipes at two servings,
all four cuisines, ≥2 mains and ≥2 incomplete recipes; record matched recipe IDs.
Leave this process running.

## 2. Frontend - terminal two

```bash
cd frontend
npm install
npm run dev -- --host localhost --port 3000 --strictPort
```

Open `http://localhost:3000/#/`. Keep `localhost` consistent; `127.0.0.1` is a different
browser origin. Before release validation, confirm `http://localhost:8000/api/v1/health` returns
`200 {"status":"ok"}` (schema/reference readiness, not complete product acceptance).

## 3. Automated validation - additional terminals, each from repository root

Backend:

```bash
cd backend
source .venv/bin/activate
python manage.py check
python manage.py makemigrations --check --dry-run
pytest
```

Tests use separate SQLite databases, never the demo file. Include precision round trips,
conflicting stock writes, replay-safe deductions with separate file-backed connections,
ownership/404, auth/refresh, throttles, validation, and seed idempotency (research B8).

Frontend:

```bash
cd frontend
npm test
npm run lint
npm run build
```

## 4. Phone acceptance on a trusted LAN (when needed)

Use the demo computer's actual LAN address consistently; a phone's `localhost` is the phone.
For this explicit test only, bind Django and Vite to `0.0.0.0`, add the computer's address to
`DJANGO_ALLOWED_HOSTS`, set the frontend API URL to `http://<computer-LAN-address>:8000/api/v1`,
and allow exactly `http://<computer-LAN-address>:3000` in CORS. Restart the frontend after
changing its environment and open that frontend address on the phone. Restore loopback
settings after the check. No public exposure/tunnel is needed. Record actual devices versus
emulation honestly; the Safari/iOS and Chrome/Android matrix remains open until exercised.

---

## Required browser QA

With both processes running, use browser automation/computer-use tools at
**http://localhost:3000** to click through every implemented screen and its relevant states,
capture and inspect screenshots, compare against the
[design Definition of Done](../../planning/design/design.md#definition-of-done), and fix
failures. Repeat the affected interactions with new screenshots, then make a final full
sweep. Cover every in-scope screen before final acceptance. Follow the exact procedure and
evidence format in [testing](../../docs/testing.md#required-browser-qa).

Save actual screenshots and a report under `artifacts/browser-qa/<run-id>/` and link them from
the acceptance checklist. Record failures or unavailable app/tools honestly; code inspection
and passing tests alone cannot complete this step. The current plan has no browser QA result
until implementation and a real run occur.

## Validation scenarios

Each maps to a user story and acceptance-checklist items. Run with both local processes started (SC-015); record any trusted-LAN conditions.

### Scenario A - User Story 1: discover meals from the sample pantry, no account

1. `curl http://localhost:8000/api/v1/sample/meals` (no auth header).
2. Confirm `completeMatches` has **≥ 24** entries, drawn from all four cuisines, ≥ 2 mains;
   `purchaseNeeded` has ≥ 2 (**AC-12**, SC-002).
3. Confirm every `completeMatches[*].rank` is lower than every `purchaseNeeded[*].rank`
   (**AC-13**, SC-003) - even if a `purchaseNeeded` recipe is favorited (favorites are empty
   for the sample, so also verify via Scenario C).
4. Open one suggestion; confirm `explanation` separates `available` / `missing` /
   `checkQuantity` and matches the rank; no colour-only cues (**AC-16**, SC-004).
5. `?maxTime=30` - confirm a recipe with `totalTimeMinutes: null` is absent (**AC-17**,
   FR-019).
6. `?useToday=<foodA>&useToday=<foodB>` - confirm only recipes containing both appear, the
   explanation names which to use first, and `optionalAdditions` are offered not applied
   (**AC-15**, FR-018). With an impossible selection, confirm `emptyState`.
7. In the UI, tap "Start my pantry" → routed to sign-up; no way to mutate the sample (**AC-04**).
8. Reload with different filters; confirm nothing persisted (spec Edge Case "Sample pantry
   drift").

### Scenario B - User Story 2: private pantry + low-effort cooking loop

1. `POST /auth/register` with a valid email + 8+ char password → `201` with tokens and
   `pantrySeeded > 0` (**AC-39**). Immediately `GET /pantry-items` → the pantry already holds
   a copy of the sample items as editable rows (**FR-035**). Retry with the same email →
   `400` email-in-use; try a 5-char password → `400` weak (**AC-39**, FR-026).
1a. Delete every pantry item, then `GET /meals` → sample recommendations returned with
   `preview: true` and `prompt: "add_real_food"` (**FR-036**).
2. `POST /pantry-items` with a blank food / negative quantity / bad date → `400` with
   field-keyed `errors`; the client keeps the input (**AC-07**, FR-033).
3. Add `500 g` of a food; add `0.5 kg` of the same food as a **second** row; confirm a recipe
   needing `0.5 kg` is a complete match against the first, and two rows persist (**AC-08**,
   **AC-09**, FR-039).
4. Add an item with an incompatible unit for a recipe → the recipe shows `checkQuantity` and
   is **not** a complete match (**AC-08**, FR-040).
5. `GET /cooking-review?recipe=…` then `POST /cooking-logs` with an `Idempotency-Key`; confirm
   stock deducted once and one `used` history entry. **Re-POST the identical body with the same
   key** → `200`, no second deduction (**AC-21**, **AC-22**, SC-006).
6. Edit a review line to exceed stock → `400`, nothing applied, no negative inventory
   (**AC-22**, FR-041).
7. `POST /pantry-items/{id}/mark-used` → within ~6 s `POST …/undo` → stock and history
   restored together (**AC-23**, FR-047).
8. `DELETE /pantry-items/{id}` for a mistaken entry → no history entry, not counted as waste
   (**AC-23**, FR-048).
9. Sign in from a second browser context; confirm pantry, favorites, personal recipes,
   preferences, history all present; `GET /pantry-items/{other user's id}` → `404` (**AC-06**,
   **AC-40**, SC-005).
10. Let the access token expire mid-session; confirm transparent refresh; force refresh
    failure → returned to a clean sign-in state, in-progress form input preserved (**AC-39**,
    FR-027).

### Scenario C - User Story 3: personal recipes, honest estimates, dates

1. `POST /personal-recipes` → appears in `GET /meals` labeled `kind: "personal"`, categories
   shown as labels (**AC-19**, FR-052).
2. `POST /personal-recipes` with `sourceRecipe: "KR-01"` → stored as a separate recipe; `KR-01`
   unchanged (**AC-20**, FR-051).
3. `PATCH` the personal recipe → same row updated, favorite mark preserved. `DELETE` it →
   gone from meals/favorites/filters; a prior `cooking_logs` entry still readable (**AC-19**,
   FR-052a).
4. Open a `purchaseNeeded` recipe; confirm `estimate` shows merchant, verified location or
   "delivery area unverified", date checked, and the excluded-fees statement; `purchaseCost`
   ≠ `portionCost` (**AC-29**, **AC-31**, FR-053, FR-054).
5. Egg-salad check: with a synthetic `$6 / dozen eggs` price and 2 missing eggs, confirm
   `purchaseCostCents: 600`, `portionCostCents: 100` (**AC-30**, SC-009).
6. A recipe missing an ingredient with a > 30-day-old / range-only / future price → `estimate.status: "incomplete"`,
   costs `null`, sorted after priced recipes in the same favorites group (**AC-31**, FR-055).
7. Add a supported fridge item with a confirmed purchase anchor → editable estimated `date`,
   `dateKind: "estimate"`; a supported food without an anchor → `dateKind: "unknown"`
   (**AC-25**, FR-059). Change its `storageLocation` to `freezer` → estimate invalidated
   (**AC-26**, FR-061).
8. Set an item's date in the past → `urgencyTier: "review"`, not auto-discarded (**AC-27**,
   FR-062).
9. `GET /pantry-checks/status` 8 days after the last whole check → `offerWholeCheck: true`;
   `POST /pantry-checks {kind:"selected"}` does **not** clear it; `POST {kind:"whole"}` does
   (**AC-28**, FR-063, FR-064). Dismiss and revisit → still offered.

### Scenario D - resilience, design, reporting

1. Kill the API; confirm a persistent `OfflineBanner` (not a toast) within ~5 s and loaded
   data marked "not live"; a write rolls back keeping input and offering retry; a retried
   already-succeeded request does not duplicate (**AC-37**, SC-011).
1a. Restart Django on the same SQLite file. Reauthenticate if needed and confirm stock,
    favorites, recipes, and history persisted. Disconnect internet while leaving both local
    processes running: seeded matching and owned writes still work; external recipe links
    may be unavailable. The internet-status flag alone must not disable local operations.
2. Multi-field form: stop typing → draft autosaves after ~500 ms; reload → `DraftRestoredBar`
   with Discard; submit → draft cleared (**AC-24**, FR-073).
3. `npm run lint` passes token-lint; spot-check both themes for contrast, 44 pt targets, 200 %
   zoom, reduced motion (**AC-33**–**AC-36**).
4. Grep the built frontend and API copy for any money-saved / waste-prevented / emissions
   figure → none (**AC-32**, SC-010, FR-065).

### Scenario E - local snapshots, isolated restore, and demo acceptance

1. Complete a real local demo account flow first: add an item, favorite a recipe, save a
   personal recipe, and confirm cooking. Note expected quantities/history. Never snapshot
   only an empty database and call it a successful owned-data recovery test.
2. Create a new snapshot before release validation and after reference or sample data changes. From the root:

   ```bash
   mkdir -p backups
   DEMO_SNAPSHOT="$PWD/backups/echo-pantry-$(date +%Y%m%d-%H%M%S).sqlite3"
   backend/.venv/bin/python backend/manage.py backup_database --output "$DEMO_SNAPSHOT"
   ```

   The planned command uses the SQLite backup API, checks integrity, and refuses the live
   database or any existing destination. It prints the completed snapshot timestamp/path.
3. Stop Django before the restore drill. In the same shell, create a separate restored file:

   ```bash
   DEMO_RESTORED="$PWD/backups/restore-check-$(date +%Y%m%d-%H%M%S).sqlite3"
   backend/.venv/bin/python - "$DEMO_SNAPSHOT" "$DEMO_RESTORED" <<'PY'
   from pathlib import Path
   import sqlite3
   import sys
   source, target = (Path(arg).resolve() for arg in sys.argv[1:])
   if not source.is_file() or target.exists() or source == target:
       raise SystemExit("Choose an existing snapshot and a new, separate restore path.")
   with sqlite3.connect(source.as_uri() + "?mode=ro", uri=True) as src:
       with sqlite3.connect(target) as dst:
           src.backup(dst)
           if dst.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
               raise SystemExit("Restored database failed integrity check.")
   print(target)
   PY
   export SQLITE_PATH="$DEMO_RESTORED"
   backend/.venv/bin/python backend/manage.py check
   backend/.venv/bin/python backend/manage.py migrate --check
   backend/.venv/bin/python backend/manage.py runserver localhost:8000
   ```

4. With the frontend still running, verify the restored account's sign-in, all noted owned
   records/stock/history, and cross-user `404`. Check readiness and sample coverage **before**
   reseeding, so a seed cannot conceal a missing backup. Then stop Django, rerun
   `seed_reference_data --check-coverage` against the restored copy and prove it is idempotent
   without changing owned data. This migration check must use the same application version
   as the snapshot; do not silently repair a failed recovery test.
5. Return to the original database in that shell:

   ```bash
   unset SQLITE_PATH
   backend/.venv/bin/python backend/manage.py runserver localhost:8000
   ```

   Confirm its records also persisted. Record snapshot timestamp, restore duration, database
   copy used, and results in `planning/acceptance-checklist.md` (SC-016, FR-030b).
   Keep copies outside Git, purge snapshot/drill files within seven days, and remove copies
   containing deleted accounts before confirming deletion. Same-computer copies do not
   protect against loss of the computer; V2 introduces remote backups and hosted targets.
6. Complete the required browser QA click-through/screenshot/fix/retest loop above. Record
+   the local browser/device matrix, direct hash links/refresh/back, keyboard, themes,
   200% zoom, reduced motion, and measured SC-015 timings. Keep unexecuted checks open.
7. Validate the full user flow: landing → sample meals → filters and explanation → account
   pantry → cooking review and history/undo → personal recipe and labeled missing-price
   example. Keep both terminals running. A successful V1 demo requires no deployment step.

### Scenario F - English default and optional Portuguese

**Prerequisites:** T027 and T089 complete, applicable guest/account/auth screens available,
and the local frontend/backend running per this guide. Follow the required browser QA
click-through/screenshot/fix/retest workflow at `http://localhost:3000`. Use a disposable
browser context/account for storage-failure checks. Contract:
[language selector](./contracts/language-selector.md). Acceptance: **AC-42**.

1. In a fresh browser context configured for Portuguese, open the landing page. Confirm the
   first app UI is English, the page language is `en`, and no language prompt blocks entry.
   Open the hamburger menu: Language sits below routes and above account actions; English
   is selected. The choices are English and Português (Brasil).
2. Select Português (Brasil). Confirm UI labels change in place, the route stays unchanged,
   the drawer remains open, focus stays on the control, and the page language is `pt-BR`.
   Check that `echo:ui:v1:language` contains the plain value `pt-BR`. Reload: Portuguese is
   used from the first app UI. Select English and repeat the reload check.
3. Exercise menu access on landing, sample Meals, sign-in, sign-up, and signed-in screens.
   Confirm guest drawers do not expose private routes or owner-only actions. On auth pages,
   use the in-layout menu button without leaving the form.
4. Enter unsaved text in an auth or personal-recipe form; note the route, input, validation,
   and any active request. Switch language. Confirm none resets and no request is repeated.
   Compare pantry quantities/history, saved filters, recipe text, and price currency: none
   changes because of language selection. Source-content prose retains its supplied language.
5. Select Portuguese, sign in, then sign out and reload: the choice remains. A separate
   browser with no preference starts in English. Remove only the language key or set an
   unsupported value and reload: English returns without a crash.
6. In an isolated storage-failure test context, deny reading or writing browser storage.
   An unreadable initial preference starts in English. Select Portuguese: UI switching
   still succeeds for this page session, while a failed write produces a readable,
   non-blocking notice and no false saved-success message. Verify the ordinary success
   path after restoring storage. Do not claim next-visit persistence while storage fails.
7. Use keyboard only to open the menu, reach the labeled Select, choose both languages,
   and close the drawer with focus returning to the trigger. Exercise rapid selection and
   confirm changes are serialized and the saved value matches the final displayed choice.
   Check accessible labels/page language and screen-reader pronunciation where available.
8. Capture and inspect actual menu/auth-form screenshots at 320pt and `lg`, in both themes,
   including longer Portuguese labels, 200% zoom, and the save-failure helper. Fix and retest
   failures. Save the run's screenshots and report under `artifacts/browser-qa/<run-id>/`
   and link evidence from AC-42. Keep untested devices, states, and acceptance items open.

Focused automated checks, once the corresponding tests and scripts exist:

```bash
cd frontend
npm test -- --run tests/language.test.ts tests/language-selector.test.tsx
npm run lint
npm run build
```

Unit/component tests complement the real browser acceptance above; they do not replace its
interaction or screenshot evidence.
