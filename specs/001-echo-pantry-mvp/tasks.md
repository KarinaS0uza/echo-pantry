---
description: "Task list for Echo Pantry MVP implementation"
---

# Tasks: Echo Pantry MVP

**Input**: Design documents from `/specs/001-echo-pantry-mvp/`

**Delivery and QA revision (2026-09-08, constitution 4.1.0)**: V1 runs on localhost with Django
SQLite. Existing task IDs are preserved; T092–T094 now cover local snapshot, launch, and
restore. Their former hosted responsibilities are in the V2 backlog in
[future improvements](../../docs/future-improvements.md). No task is marked implemented by
this revision, and no cloud deployment is a V1 dependency.

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Included - **test-after per story**. Each story phase ends with its test tasks. The
backend ownership / auth / throttling / validation / domain-service suites are the AC-39 /
AC-40 / AC-41 constitutional gates and are not optional.

**Organization**: By user story (vertical slices). Setup and Foundational are shared and
blocking; each user story phase is an independently testable increment; Polish is last.

**Required UI completion rule**: after UI work, use browser automation/computer-use tools
against `http://localhost:3000`; click every implemented screen, capture and inspect actual
screenshots, compare `planning/design/design.md`'s Definition of Done, fix failures, and
repeat the browser checks. All in-scope screens are required for final release acceptance.
T099 owns the complete recorded sweep; story checkpoints also require evidence for their
implemented screens. Follow `AGENTS.md` and `docs/testing.md#required-browser-qa`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: `[US1]` / `[US2]` / `[US3]` on user-story tasks only
- Every task names an exact path. Paths follow [plan.md](./plan.md) Project Structure:
  `backend/`, `frontend/`, `data/demo/`, `scripts/`.

---

## Phase 1: Setup (shared infrastructure)

- [X] T001 Create the repo layout - `backend/`, `frontend/`; keep existing `data/demo/` and `scripts/`; add README quickstart pointer and `.gitignore` entries for `.venv`, `__pycache__`, frontend dependencies/build output, real `.env` files (allow `.env.example`), `*.sqlite3`, SQLite journal/WAL/SHM files, and `backups/`; initialize Git if needed. Never commit demo accounts or database snapshots.
- [X] T002 [P] Initialize `backend/pyproject.toml` - Python 3.12, `django>=5.2,<5.3`, `djangorestframework`, `djangorestframework-simplejwt`, `django-cors-headers`, `django-environ`; dev extras `pytest`, `pytest-django`, `ruff`. Use Python’s built-in SQLite support; no PostgreSQL driver or production process server is a V1 dependency.
- [X] T003 [P] Initialize the frontend project in `frontend/package.json` - `react@18`, `react-dom`, `react-native-web`, `@gluestack-ui/*`, `vite@5`, `motion`, `lucide-react-native`, `i18next`, `react-i18next`, `@tanstack/react-query`; dev: `vitest`, `@testing-library/react`, `jsdom`, `eslint`, `typescript`
- [X] T004 [P] Configure `backend/pytest.ini` and `backend/ruff.toml`; normal tests use isolated SQLite, while contention/idempotency checks use a temporary file-backed database with independent connections, never `backend/db.sqlite3`.
- [X] T005 [P] Configure frontend tooling - `frontend/vite.config.ts` (react-native-web alias, `@/` path), `frontend/tsconfig.json`, and `frontend/.eslintrc.cjs` with the **token-lint rule set** (ban raw hex, `px`, literal `fontSize`/`margin`/`padding`/`borderRadius`/duration numbers, and `style`/`className` props passed parent→child) scoped to `frontend/src/components/**`
- [X] T006 [P] Add `backend/.env.example` and `frontend/.env.example` for the research D1/D2 local configuration: optional absolute `SQLITE_PATH`, Django/JWT secrets, `DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1`, `CORS_ALLOWED_ORIGINS=http://localhost:3000`, `DJANGO_DEBUG=true`, and `VITE_API_BASE_URL=http://localhost:8000/api/v1`; load `backend/.env` explicitly. No `DATABASE_URL` or cloud credentials required.

---

**Phase 1 validation:** T001-T006 completed on 2026-09-08. See
[setup validation](../../docs/setup-validation.md) for observed checks, fixes, and dependency
advisories. Product and browser acceptance remain open.

## Phase 2: Foundational (blocking prerequisites)

**⚠️ No user-story work begins until this phase is complete.**

### Reference data preparation ([research.md](./research.md) §A)

- [ ] T007 [P] Write `scripts/build-recipe-dataset.py` - parse the ingredient strings in `data/demo/recipe-sources.json` into structured lines `{foodId, amount, unit, optional, toTaste, preparation, sourceText}`; emit `data/demo/recipes.json` (per recipe: source name/URL, cuisine, meal types, `isSide`, yield, `totalTimeMinutes` nullable, `vegetarianVerified` nullable) and a draft `data/demo/foods.json`
- [ ] T008 Hand-review `data/demo/recipes.json` against all 30 original recipe pages; finalize `data/demo/foods.json` (slug `id`, `name`, `aliases` e.g. `scallion`/`green-onion`, `category`, `form` raw/cooked/na, `defaultUnits`); reconcile every `foodId` with the `ingredientId` values in `data/demo/price-snapshot.json` and `data/demo/specialty-price-snapshot.json` (AC-11)
- [ ] T009 [P] Author `data/demo/date-rules.json` - the six refrigerator rows from `planning/mvp-decisions.md` §4 (`id`, `label`, `publishedRangeLow/High`, `initialReminderDays`, `anchorKind`, `appliesTo`)
- [ ] T010 Build `data/demo/sample-pantry.json` from the finalized `recipes.json`/`foods.json` - entries `{foodId, quantity, unit, storageLocation, date, dateKind}`; target ≥ 80% distinct required-ingredient coverage and ≥ 24/30 complete matches at 2 servings, all four cuisines, ≥ 2 mains, ≥ 2 recipes left incomplete; realistic perishable + shelf-stable mix with labeled dates (verified in T035)

### Backend foundation

- [ ] T011 Create Django config in `backend/config/` and `backend/manage.py`; use `django.db.backends.sqlite3`, default `BASE_DIR / "db.sqlite3"`, optional absolute `SQLITE_PATH`, `OPTIONS={"transaction_mode":"IMMEDIATE","timeout":5}`, and `ATOMIC_REQUESTS=False`; run system checks for SQLite/JSON1. Add `/api/v1/` routes and `config/health.py` per contracts/health.md: query the migrated recipe table and require its 30 seed rows before `200`; missing schema/seed or unavailable storage returns typed `503`. Scaffold and register separate `pantry` and `meals` apps using the ownership/layout rules in `docs/architecture.md`; `meals` has no stored models in V1 (SC-017).
- [ ] T012 Configure DRF, CORS, and SimpleJWT in `backend/config/settings.py`: JWTAuthentication/IsAuthenticated, access 15 min / refresh 14 days / rotation and blacklist; install token blacklist; exact configured CORS origins, CorsMiddleware before CommonMiddleware; add `idempotency-key` to allowed headers and expose `Retry-After`; keep cookie credentials disabled for bearer auth.
- [ ] T013 Create `backend/accounts/` app - custom `User(AbstractUser)` with `email` as `USERNAME_FIELD`, no `username`, unique email, custom manager; set `AUTH_USER_MODEL = "accounts.User"`; generate the initial migration
- [ ] T014 [P] Create `backend/common/` - `OwnedModel` abstract base (`owner` FK to `accounts.User`, `on_delete=CASCADE`, `db_index=True`); `OwnedViewSetMixin` (`get_queryset` filtered to `request.user`, `get_object` raises `Http404` on a miss - never `403`); throttle classes for scopes `sample` (100/min per client), `user` (100/min per user), `auth` (10/min per IP)
- [ ] T015 [P] Implement `backend/common/exceptions.py` - stable typed error envelope; `Retry-After`/`retryAfter` on throttling `429` and known SQLite lock-timeout `503` after rollback. Do not hide unrelated exceptions as contention. Register the handler in DRF (contracts/README.md).
- [ ] T016 [P] Implement `backend/common/units.py` - mass / volume / count conversion tables using the exact factors in `scripts/validate-price-data.py`; `Decimal` arithmetic; a `CHECK_QUANTITY` sentinel; `sufficient(required, owned)` returning available / missing / check_quantity
- [ ] T017 Create `backend/catalog/` app - `Food`, `DateRule`, `Recipe`, `RecipeIngredient`, `PriceReference`, `SamplePantrySeed` models exactly per [data-model.md](./data-model.md) (reference tables, no owner, natural keys); generate migrations
- [ ] T018 Implement `backend/catalog/management/commands/seed_reference_data.py` - idempotent upsert (natural key) of foods, date rules, recipes + ingredients, and both price snapshots; rebuild `SamplePantrySeed` from `data/demo/sample-pantry.json`; one transaction per group; **never touches an owned table**; `--check-coverage` flag runs the T035 assertions
- [ ] T019 [P] Write `backend/tests/conftest.py` - pytest-django DB config plus factories for `User`, `Food`, `Recipe` + `RecipeIngredient`, `PantryItem`, `PriceReference`

### Frontend foundation

- [ ] T020 Scaffold the app in `frontend/index.html` and `frontend/src/app/` - entry, `HashRouter` with routes `#/meals`, `#/pantry`, `#/my-recipes`, `#/sign-in`, `#/sign-up` (the `#/` landing route is added in T098); provider tree (`ThemeProvider`, `QueryClientProvider`, i18n `I18nextProvider`)
- [ ] T021 [P] Copy `planning/design/tokens.ts` to `frontend/src/design/tokens.ts`; implement `frontend/src/design/theme.tsx` (`ThemeProvider`, `useTheme`, `useTransition`, `MotionView`, `MotionPressable`) per `planning/design/code.md`
- [ ] T022 [P] Implement `frontend/src/design/gluestack-ui.config.ts` - map Gluestack config keys to values **imported from** `tokens.ts`; no duplicated literals (patterns.md "Gluestack")
- [ ] T023 [P] Implement the atoms in `frontend/src/components/` - `Text`, `Icon`, `Button`, `IconButton`, `GlassIconButton`, `Input`, `Select`, `Checkbox`/`Radio`/`Switch`, `Badge`, `Chip`, `StepMarker`, `Spinner`, `Skeleton`, `Divider`, `Avatar`, `Image`, `Scrim`, `Stack`, `Surface` - copy `code.md` reference implementations; six states on every interactive atom; tokens only
- [ ] T024 [P] Implement the shared molecules in `frontend/src/components/` - `FormField`, `SearchField`, `CategoryIcon`, `Toast`, `UndoToast`, `EmptyState`, `ErrorState`, `ListItem`, `SectionHeader`, `Tabs`, `SegmentedControl`, `Sheet`, `Dialog`, `QuantityStepper`
- [ ] T025 [P] Implement the organisms and templates in `frontend/src/components/` - `AppHeader`, `NavDrawer` (right side, all breakpoints, active route the only teal item), `AddItemFAB`; templates `AppShell`, `AuthShell`, `ListTemplate`, `DetailTemplate`
- [ ] T026 Implement `frontend/src/api/client.ts`: fetch wrapper, in-memory access token, localStorage refresh token, Bearer header, typed errors, and one safe retry on network failure/503 respecting Retry-After. Keep the same idempotency key on cooking replay and expose the 401 refresh hook (T056). Ordinary loading, bounded 10-second timeout from shared configuration/tokens, no cloud warm-up or extended first-call wait. Add typed endpoint stubs.
- [ ] T027 [P] Implement `frontend/src/i18n/language.ts` and `index.ts` per research C1a and `contracts/language-selector.md`: one pre-render i18next initialization with bundled `en.json`/`pt-BR.json`, supported explicit stored choice under `echo:ui:v1:language` or default `en`, no browser detector, and a `useT` helper. Add the shared serialized change handler, guarded storage, separate active/save-failed state, and document-language synchronization without rekeying/remounting providers. In `frontend/tests/language.test.ts`, verify English on a Portuguese browser, supported/invalid/missing/unreadable values, switching and reload initialization, overlapping-change guard, and storage-write failure retaining the active language (FR-075a/075c/075d). Test the language runtime independently of the menu; menu integration is T089.
- [ ] T028 [P] Implement `frontend/src/app/OfflineBanner.tsx` driven by local API reachability (internet-status flag is only a hint), persistent at zIndex.banner. A reachable localhost API must work with internet disconnected. Add `frontend/src/drafts/` autosave/recovery with existing keys, 500 ms debounce, pagehide flush, storage failure handling, and DraftRestoredBar. No cloud GettingReadyState or offline write queue.

**Checkpoint**: foundation ready - user stories can now proceed (in parallel if staffed).

---

## Phase 3: User Story 1 - Discover meals from a sample pantry, no account (Priority: P1) 🎯 MVP

**Goal**: A visitor opens the local app, taps "Try a sample pantry", and gets ranked meal
recommendations with plain-language explanations, familiar filters, and "choose ingredients
for today" - entirely read-only, no account.

**Independent test**: `GET /api/v1/sample/meals` unauthenticated returns ≥ 24/30 complete
matches from all four cuisines with ≥ 2 mains and ≥ 2 incomplete; every complete match ranks
above every purchase-needed recipe; each suggestion's explanation separates owned / missing /
quantity-uncertain and is understandable without colour; filters and ingredient selection work;
the sample never mixes with any real account.

### Implementation for User Story 1

- [ ] T029 [P] [US1] Implement `backend/meals/domain/matching.py` - scale recipe amounts from recorded yield to `servings` (int 1–12, default 2); classify each **required** ingredient `available` / `missing` / `check_quantity` via `units.py`; complete match ⇔ all required `available`; optional toppings excluded until selected; plain water assumed present; "to taste" requires presence, no quantity
- [ ] T030 [P] [US1] Implement `backend/pantry/domain/urgency.py` - tier from local calendar date: past = `review`, today = `use_today`, +1–2 d = `use_soon`, +3–5 d = `coming_up`, later = `neutral`, no date = `unknown`; never auto-discards or implies safety
- [ ] T031 [US1] Implement `backend/meals/domain/ranking.py` - every complete match before every purchase-needed (FR-005); complete-match tiebreakers: fresher/shorter-lived in use → earliest known use-soon date (missing date sorts last, stays labeled) → oldest stock on a tie → recipe favorite → title; purchase-needed tiebreakers: favorite → valid total package cost (unavailable sorts last in the favorites group, never zero) → fewer missing → urgency; no boost for recently added stock (depends on T029, T030)
- [ ] T032 [US1] Implement `backend/meals/domain/explanation.py` - build the per-suggestion object `{rank, isCompleteMatch, reasonSummary, available[], missing[], checkQuantity[], soonestUseByDate, urgencyTier, usesExpiring[], optionalAdditions[]}` (contracts/meals.md)
- [ ] T033 [US1] Create `backend/sample/` app - load `SamplePantrySeed` as a pantry structure; `GET /api/v1/sample/pantry` and `GET /api/v1/sample/meals` (`AllowAny`, `sample` throttle, no write path); implement and call `backend/meals/services.py` to compose matching/ranking/explanation from plain supplied inputs, reusing `pantry/domain/urgency.py` and `common/units.py`; accept `servings`, `mealType`, `cuisine`, `maxTime`, `vegetarian`, `favorites`, `avoid` (repeatable), `useToday` (repeatable), `includeOptional` (repeatable); response carries `isSample: true`
- [ ] T034 [US1] Add the shared meals response serializer in `backend/meals/serializers.py` (used by both `sample/meals` now and `meals` in US2); wire the sample routes in `backend/config/urls.py`; assert no write verbs are registered
- [ ] T035 [P] [US1] Write `scripts/verify-sample-coverage.py` - import the `backend/meals/domain` matcher, run it against `data/demo/sample-pantry.json` + `recipes.json` at 2 servings, filters cleared; assert ≥ 80% distinct-ingredient fraction and ≥ 24/30 complete; write the fraction, count, and sorted matched recipe IDs to `data/demo/sample-coverage-report.json` (SC-002, SC-013); iterate T010 until it passes
- [ ] T036 [P] [US1] Implement the discovery organisms in `frontend/src/components/` - `HeroHeading`, `RecipeCard` (with the required "Uses your expiring: …" line in urgency tones), `IdeaTile`, `RecipeDetail`, `MethodStep`, `UrgencyBadge` (colour **and** text always; `expired` neutral grey strikethrough, never red; estimated renders lighter with a Pencil affordance)
- [ ] T037 [US1] Implement `frontend/src/screens/Meals.tsx` - `ListTemplate`; loads `/sample/meals` via React Query; renders complete-match and purchase-needed sections with explanations as text + position/icon cues (never colour alone); servings `QuantityStepper`; filter `Chip` row (meal type, cuisine, max time any/30/60, servings, vegetarian, favorites, avoid) that does **not** persist defaults; empty / loading (`Skeleton`) / error states
- [ ] T038 [US1] Implement "Choose ingredients for today" in `frontend/src/screens/Meals.tsx` - ingredient selection UI → `useToday` params; show which selected ingredient to use first and other pantry ingredients as optional additions (not auto-added); actionable empty state when nothing matches
- [ ] T039 [US1] Implement `frontend/src/screens/RecipeDetailScreen.tsx` - `DetailTemplate`; `SegmentedControl` (Ingredients / Method); ingredient list scaled by a servings `QuantityStepper`; "open original recipe" as an external link with the source name visible; viewing changes no stock
- [ ] T040 [US1] Implement the "Start my pantry" CTA in the sample view → routes to `#/sign-up`; confirm the sample view exposes no add/edit/delete affordance (FR-003, spec Edge Case "Sample pantry drift")
- [ ] T041 [US1] Add i18n keys for Meals, filters, explanation copy, and recipe detail to `frontend/src/i18n/en.json` and `pt-BR.json`

### Tests for User Story 1

- [ ] T042 [P] [US1] `backend/tests/domain/test_matching.py` - yield→servings scaling; complete vs. missing; `check_quantity` for unknown amount and cross-dimension unit; optional toppings ignored until selected; to-taste presence rule; water assumed
- [ ] T043 [P] [US1] `backend/tests/domain/test_ranking.py` - a complete match outranks a favorited / more-urgent incomplete recipe (SC-003); every complete-match tiebreaker in order; purchase-needed tiebreakers; unknown date sorts last and stays labeled; recently added stock gets no boost (FR-007)
- [ ] T044 [P] [US1] `backend/tests/domain/test_urgency.py` - each tier boundary; a past date yields `review`, not a discard or a safety claim; unknown stays explicitly unknown
- [ ] T045 [P] [US1] `backend/tests/api/test_sample.py` - anonymous access works; `sample` throttle returns typed `429` + `Retry-After`; no write route exists; running the seeded matcher reproduces ≥ 24/30 (AC-12); sample data is isolated from user tables
- [ ] T046 [P] [US1] `frontend/tests/meals.test.tsx` - explanation renders owned / missing / uncertain and is legible with colour removed; the complete-match section always precedes purchase-needed; a recipe with unknown time is excluded by the 30-minute filter; `useToday` with no match shows the actionable empty state

**Checkpoint**: User Story 1 is fully functional and demoable end to end (the P1 promise).

---

## Phase 4: User Story 2 - Keep a private pantry accurate with a low-effort cooking loop (Priority: P2)

**Goal**: A cook signs up with email + password; their pantry is created pre-stocked with a
copy of the sample seed, which they prune to their kitchen; and they run the cooking loop:
"I cooked this" → editable review → one deduction + a history entry; plus one-tap mark-used
with undo, and a used/discarded history.

**Independent test**: register and confirm the new pantry already holds a copy of the sample
items; add, edit, and remove items; cook a recipe through the review flow; use undo; sign in
from a different context and confirm all data is present, correct, and a request for another
account's record answers as though it does not exist.

### Implementation for User Story 2

- [ ] T047 [P] [US2] Add the owned models per [data-model.md](./data-model.md) - `backend/pantry/models.py`: `CustomFood`, `PantryItem`, `PantryCheck`, `SavedPreferences`, `CookingLog`, `CookingLogLine`, `HistoryEntry`; `backend/recipes/models.py`: `Favorite`; generate migrations (indexes on `owner`, `(owner, food)`, `(owner, date)`, `(owner, -created_at)`)
- [ ] T048 [US2] Implement auth endpoints in `backend/accounts/` - `POST /api/v1/auth/register` (email + password ≥ 8 and not common; **in the same transaction, call an explicit pantry-initialization service in `backend/pantry/services.py` to clone every `SamplePantrySeed` row into a `PantryItem` owned by the new user - FR-035**; returns `{user, access, refresh, pantrySeeded}`; roll the account back if seeding fails), `POST /api/v1/auth/token`, `POST /api/v1/auth/token/refresh` (rotation + blacklist), `GET /api/v1/auth/me`; `auth` throttle scope; no email sent by any path (contracts/auth.md)
- [ ] T049 [P] [US2] Implement foods endpoints in `backend/catalog/` - `GET /api/v1/foods` (catalogue + caller's custom foods, `q`/`category` search, `custom:<id>` namespacing), `POST /api/v1/foods` (create a custom food)
- [ ] T050 [US2] Implement pantry CRUD in `backend/pantry/` per contracts/pantry-items.md; owner-scoped 404, positive bounded decimal input with at most six fractional digits, valid units/dates/storage, separate purchase rows, and no history for mistaken-entry delete. Metadata PATCH saves only requested fields; every quantity change rereads stock within a short IMMEDIATE transaction so stale instances cannot overwrite deductions.
- [ ] T051 [US2] Implement stock actions in `backend/pantry/` as Python Decimal deltas in short SQLite IMMEDIATE atomic transactions (research B8/data model), never negative. Retain a zero-stock row for history/undo, excluded from available matches. Keep the existing six-second undo interaction; hold no database transaction during that window. Undo restores stock/history with the same quantized delta. SQLite select_for_update is not a lock guarantee.
- [ ] T052 [US2] Implement cooking review and cooking-log endpoints in `backend/pantry/views.py`, with mutations coordinated by `backend/pantry/services.py`: current-stock allocation, Idempotency-Key with owner-scoped immediate uniqueness, canonical request fingerprint, replayable response snapshot, and one short IMMEDIATE transaction for log/lines/stock/history. Replays return the original result; conflicting body returns 409; invalid stock rolls back all rows; lock timeout returns typed 503 after rollback (contracts/cooking-logs.md).
- [ ] T053 [P] [US2] Implement history, preferences, and checks in `backend/pantry/` - `GET /api/v1/history` (cursor pagination) + `DELETE /api/v1/history/{id}`; `GET`/`PUT /api/v1/preferences`; `POST /api/v1/pantry-checks` (`whole` updates the timer; `selected` does not - FR-063); `GET /api/v1/pantry-checks/status` returns the raw timestamps (7-day nudge logic completed in US3 T078)
- [ ] T054 [US2] Implement `GET /api/v1/meals` in `backend/meals/` - authenticated; reuses the domain services and the shared serializer from T034; favorites tiebreaker active; a pantry emptied by deletion (never a fresh account - T048 pre-stocks it) returns the sample recommendations with `preview: true` and `prompt: "add_real_food"` (FR-036). Assemble owned inputs through reusable selectors in the owning apps and call the same `meals/services.py` pipeline used by sample meals; preview reads the reference seed directly, never a sample view.
- [ ] T055 [P] [US2] Implement favorites endpoints in `backend/recipes/` - `GET`/`POST`/`DELETE /api/v1/favorites` (curated or personal target, uniqueness, idempotent re-favorite); favoriting changes no stock (FR-042)
- [ ] T056 [US2] Implement auth screens in `frontend/src/screens/SignIn.tsx` and `SignUp.tsx` with `AuthForm` (`AuthShell`); wire `client.ts` `401` → `token/refresh` → replay; on refresh failure return to a clean sign-in state **preserving in-progress form input**; show the operator-assisted password-reset contact note on sign-in (FR-027, FR-027b)
- [ ] T057 [US2] Implement the post-sign-up first-run notice in `frontend/src/screens/Pantry.tsx` - after registration the pantry is already populated from the sample seed server-side (T048); land the cook on the populated Pantry screen and show a dismissible banner: "We've added the sample items to get you started - edit quantities and remove anything you don't have." No start-empty choice on the sign-up screen (FR-035)
- [ ] T058 [P] [US2] Implement the pantry organisms in `frontend/src/components/` - `PantryItemCard` (image/`CategoryIcon`, name, quantity, `UrgencyBadge`; overflow: Mark used / Mark discarded separated with different weight / Edit), `PantryList` (grouped by category, expiry-sorted within group, sticky headers, own empty/loading/error), `AddItemSheet` (**manual entry only**), `ItemDetail`, `IngredientRow`
- [ ] T059 [US2] Implement `frontend/src/screens/Pantry.tsx` - `ListTemplate` + `AddItemFAB`; add / find / edit / remove items; server field errors rendered beside the field (`FormField`); a failed save keeps the input and offers retry with no false success; reserve `layout.fabSafeArea`
- [ ] T060 [US2] Implement the cooking-review flow in `frontend/src/screens/` - editable review (amounts incl. fractional counts, omit/replace an ingredient, "obtained outside the pantry", correct the allocation); approve → optimistic deduction reconciled against the response; guarded against duplicate activation; generates an `Idempotency-Key`
- [ ] T061 [US2] Implement direct mark-used / mark-discarded with `UndoToast` (6 s) and the History view inside `frontend/src/screens/Pantry.tsx` - incremental load, delete individual entries, used / discarded / "added by mistake" kept visually distinct
- [ ] T062 [US2] Wire draft autosave for the add-item form in `frontend/src/screens/Pantry.tsx` - `DraftRestoredBar` with Discard, clear on submit, drop after 7 days, never persist the password field; dirty-navigation warning (Keep editing / Discard)
- [ ] T063 [US2] Implement local API failure handling in `frontend/src/api/` and screens: preserve input, label loaded data not live, roll back failed writes, and revalidate after API restart. A safe retried request must not duplicate a completed mutation. Internet loss alone must not disable a reachable localhost API. No cloud cold-start path or queued offline writes (FR-075/SC-011).
- [ ] T064 [US2] Add i18n keys for auth, pantry entry, cooking review, and history to `frontend/src/i18n/en.json` and `pt-BR.json`

### Tests for User Story 2

- [ ] T065 [P] [US2] `backend/tests/api/test_auth.py` - register (valid; duplicate email → `400`; weak password → `400`); a successful registration seeds the new pantry with a copy of every sample item and returns `pantrySeeded`, and the whole registration rolls back if seeding fails (FR-035); login; transparent refresh with rotation + blacklist; `auth` throttle → typed `429`; assert no email backend is invoked (FR-027a, FR-035, AC-39)
- [ ] T066 [P] [US2] `backend/tests/api/test_ownership.py` - parametrized over **every** owned resource: user B `GET`/`PATCH`/`DELETE` on user A's row → `404` (never `403`); missing / expired token → `401` (FR-028, AC-40)
- [ ] T067 [P] [US2] Extend `backend/tests/api/test_pantry_arithmetic.py`: unit matching, no negative inventory, separate purchases/allocation, SQLite decimal precision/range rejection and round trips, repeated fractional deductions and exact undo at six-place precision, and zero-stock exclusion. On file-backed SQLite with independent connections, competing stock updates cannot overspend or lose history; failed lock acquisition returns a retryable typed error.
- [ ] T068 [P] [US2] `backend/tests/api/test_cooking_logs.py`: all-or-nothing writes; same key/body replay deducts once, conflicting body returns 409; two concurrent submissions on a file-backed SQLite test database still deduct once; cancellation and undo preserve consistency; replay after an ambiguous response or lock failure uses the same key.
- [ ] T069 [P] [US2] `backend/tests/api/test_validation.py` - blank name, negative / non-numeric quantity, invalid date each return `400` with field-keyed `errors` regardless of what the client sends (FR-033, AC-07)
- [ ] T070 [P] [US2] `frontend/tests/pantry.test.tsx`: existing validation, cooking review, double-submit guard, undo, drafts, and expired-session recovery; API stop/failure rolls back preserving input and retry, restart revalidates, and loss of internet alone leaves reachable localhost flows usable.

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Personal recipes, honest cost estimates, and gentle date awareness (Priority: P3)

**Goal**: A cook adds their own recipes and variations (in one shared form); purchase-needed
recipes show a clearly labeled cost estimate (package vs. portion, merchant, verified location
or "delivery area unverified", date checked, excluded fees); pantry dates are tracked by kind
with fridge-rule estimates for a small supported set; and after seven days without a
whole-pantry check the app offers a non-blocking check.

**Independent test**: create a personal recipe (appears labeled "My recipe"); edit it in
place; delete it (leaves matching, a prior history entry remains); open an incomplete recipe
and confirm the labeled estimate, its caveats, and the incomplete-match ordering; set up a
supported fridge item with a confirmed anchor and confirm the estimated date and urgency
label; advance seven days and confirm the non-blocking nudge, that it returns after dismissal,
and that a selected-item check does not reset it.

### Implementation for User Story 3

- [ ] T071 [P] [US3] Add `PersonalRecipe` and `PersonalRecipeIngredient` to `backend/recipes/models.py` per [data-model.md](./data-model.md) (owner-scoped; `source_recipe` nullable; `categories` as plain labels); generate migrations
- [ ] T072 [US3] Implement personal-recipes endpoints in `backend/recipes/` - CRUD + save-as-variation (a variation is a **separate** row, the source is untouched); `PATCH` edits in place preserving the favorite mark and history references; `DELETE` removes the recipe from matching / favorites / filters but keeps referencing `CookingLog` rows via a title snapshot; a curated-recipe id → `404` here (contracts/personal-recipes.md)
- [ ] T073 [US3] Include personal recipes in `GET /api/v1/meals` (`backend/meals/`) - labeled `kind: "personal"`; amounts scaled by requested servings
- [ ] T074 [P] [US3] Implement `backend/meals/domain/pricing.py` - port `calculate()` from `scripts/validate-price-data.py`: subtract comparable owned quantity first; `purchase = ceil(missing/pkgQty) * pkgPrice`; `portion = missing/pkgQty * pkgPrice`; round to cents only after; **unavailable** (never zero) on no price / > 30 days old / range-only / future-dated; each merchant on its own line, never combined; specialty references only by explicit `referencePriceId`; ingredient form preserved
- [ ] T075 [US3] Integrate pricing in `backend/meals/services.py` for both `GET /api/v1/meals` and `sample/meals` - the `estimate` object per contracts/meals.md; incomplete-match ordering (favorite → valid total cost → fewer missing → urgency); unavailable totals sort last within the favorites group; `estimateLabel` and `excludes` strings always present (FR-053–FR-056, FR-066)
- [ ] T076 [P] [US3] Implement `backend/pantry/domain/dates.py` + wire `catalog.DateRule` - produce an estimate only for a supported food with a refrigerator condition and a confirmed anchor date of the matching kind; recalculate or invalidate on a storage-location or food-state change; never apply refrigerator rules to freezer / counter; adding an item is not a purchase or cooking activity (FR-059–FR-061)
- [ ] T077 [US3] Wire the date engine into `backend/pantry/` pantry-items `POST`/`PATCH` - compute/persist `date_kind` (`label` / `user` / `estimate` / `unknown`) and the estimate `date`; derive `urgency` from estimated dates too
- [ ] T078 [US3] Complete the nudge logic in `GET /api/v1/pantry-checks/status` (`backend/pantry/`) - `offerWholeCheck` true when ≥ 7 days since the last `whole` check, or since pantry creation if there has never been one; it stays true on every request until a `whole` check is recorded; no server-side "dismissed" state; `lastWholeCheckAt` and `lastAnyEditAt` reported separately (FR-064)
- [ ] T079 [P] [US3] Implement `frontend/src/screens/MyRecipes.tsx` + the shared recipe form component - create / edit-in-place / save-as-variation in one form (name, ingredient amounts + units, written instructions, servings, total time, category labels, optional source link); delete a personal recipe; draft autosave for the form (`DraftRestoredBar`, no sensitive fields)
- [ ] T080 [US3] Implement the price-estimate display in `frontend/src/components/` + Meals - per-merchant lines never merged; "Estimated extra purchase" and portion cost shown separately; merchant, verified location or "Delivery area unverified", date checked, and the excluded-fees statement always visible; unavailable renders as "Price unavailable", never zero; incomplete-match ordering reflected in the list
- [ ] T081 [US3] Implement the date-kind UI in `frontend/src/components/UrgencyBadge` + `ItemDetail` - estimated dates in `text.tertiary` with a one-tap `Pencil` edit affordance; user-set dates in `text.primary`; "Date unknown" explicit; a past date reads "Past date - check it" (neutral, never red, never auto-discard); recalculation shown when storage/state is edited
- [ ] T082 [US3] Implement the pantry-check nudge UI in `frontend/src/screens/Pantry.tsx` and `Meals.tsx` - inline, non-blocking, never modal, never hides recommendations; an explicit "I checked the whole pantry" action; the offer returns on every visit until a whole check is recorded
- [ ] T083 [US3] Add i18n keys for My Recipes, the recipe form, price estimates, date copy, and the nudge to `frontend/src/i18n/en.json` and `pt-BR.json`

### Tests for User Story 3

- [ ] T084 [P] [US3] `backend/tests/api/test_personal_recipes.py` - create; edit-in-place preserves favorite + history; save-as-variation leaves the source unchanged; delete removes from matching but keeps the prior history entry; a curated recipe cannot be edited or deleted (FR-050–FR-052a, AC-19)
- [ ] T085 [P] [US3] `backend/tests/domain/test_pricing.py` - `$6`/dozen eggs with 2 missing → `$6` purchase, `$1` portion (SC-009); unknown / stale / range-only / future prices → unavailable, never zero, sorted after known totals; merchants never combined; specialty by explicit id only; dry rice ≠ cooked rice
- [ ] T086 [P] [US3] `backend/tests/domain/test_dates.py` - each of the six rules with its anchor kind; a supported food without an anchor → "Date unknown"; a storage change recalculates or invalidates the estimate; freezer / counter never get refrigerator rules; adding ≠ purchase (FR-058–FR-062, AC-25–AC-27)
- [ ] T087 [P] [US3] `backend/tests/api/test_pantry_checks.py` - the 7-day nudge fires from the last whole check and from pantry creation; a `selected` check and item edits do not reset it; it persists after being dismissed (FR-063, FR-064, AC-28)
- [ ] T088 [P] [US3] `frontend/tests/recipes-and-estimates.test.tsx` - a personal recipe appears in recommendations labeled as the cook's own; estimate caveats and the estimate label are visible; an unavailable estimate never renders zero; date kinds render per spec; the nudge is non-blocking

**Checkpoint**: all three user stories are independently functional.

---

## Phase 6: Polish & cross-cutting concerns

- [ ] T089 Complete primary English and PT-BR UI key/interpolation/plural coverage in `frontend/src/i18n/`; add the language labels and failure copy from `contracts/language-selector.md`. In `frontend/src/components/organisms/NavDrawer.tsx`, compose the existing labeled Select below routes and above account actions; wire T027's handler, keep drawer/focus stable, and display save failures. Extend `frontend/src/components/templates/AppShell.tsx` for guest access and `AuthShell.tsx` with the catalogued optional menu IconButton. Add `frontend/tests/language-selector.test.tsx` covering guest/account/auth access, in-place switching with unsaved input, sign-out persistence, document language, keyboard/drawer focus, and failure notices. Dependencies: T025, T027, T041, T064, T083. Translation controls do not change backend content/data. Final screen/device verification occurs in T099, Scenario F (FR-075a–FR-075d, AC-42).
- [ ] T090 [P] Accessibility pass across all screens - contrast verified on real foreground/background pairs in **both** themes, 44 pt targets, visible focus rings, full keyboard operability, 200% zoom with no horizontal scroll, `prefers-reduced-motion` collapsing motion to instant (SC-012, AC-34, AC-35, AC-36)
- [ ] T091 [P] Run `frontend` token-lint clean; review for untokenised copy and any one-off styled screen control; fix violations (AC-33)
- [ ] T092 [P] Add `backend/accounts/management/commands/backup_database.py` using Python’s SQLite backup API; `--output` must select a new file distinct from the live database, default snapshots remain under ignored `backups/`, and success is reported only after completion/integrity validation. Add focused `backend/tests/test_backup_database.py` checks for readable account/stock/history snapshot and refusal to overwrite a live/existing destination (FR-030b, research D3).
- [ ] T093 [P] Configure local frontend launch in `frontend/package.json` / `frontend/vite.config.ts`: localhost port 3000 with strictPort; Django starts at localhost:8000. Run local Vite build and verify hash routes. Finish local-storage data-handling notice copy in i18n and link from sign-up/account settings/landing. Document trusted-LAN phone settings in quickstart; no cloud deployment config (AC-02/03, FR-030a).
- [ ] T094 Execute quickstart Scenario E: capture a SQLite snapshot with an owned account, restore to a new separate file, check integrity, sign-in/ownership/stock/history and seed coverage, then restart on the original database. Record snapshot/restore times and result in `planning/acceptance-checklist.md`; record seven-day purge handling for all copies. Depends on T092 and completed product flows (SC-016/FR-030b).
- [ ] T095 [P] Run the AC-01 brand check - grep shipped copy, page titles, metadata, and assets for any superseded product name; confirm none remain and the product identifies as "Echo Pantry" everywhere
- [ ] T096 [P] Run the truthful-reporting check - grep UI copy and API responses for any money-saved / waste-prevented / emissions figure; confirm none is present (SC-010, FR-065)
- [ ] T097 Measure local performance with both processes running: meals within about 2 s, add-item/favorite/open-recipe within about 1 s. Record machine, browser, and loopback/LAN conditions in `planning/acceptance-checklist.md` (SC-015, AC-38).
- [ ] T098 [P] Add the landing screen in `frontend/src/screens/Landing.tsx` at route `#/` - a thin welcome page, **not** a gate: `HeroHeading` ("Fresh ideas. Good food.") with one or two `aria-hidden` floating ingredient cutouts, a one-line "cook from what you already have" subhead, a primary "Try a sample pantry" CTA → `#/meals`, and secondary "Sign in" → `#/sign-in` / "Create account" → `#/sign-up`; a link to the data-handling notice (FR-030a). A signed-in visitor hitting `#/` redirects to `#/meals`. Add the `#/` route + redirect to `frontend/src/app/`; compose from existing components with zero screen styling; token-lint clean; correct in both themes; reduced-motion safe; i18n keys added to `en.json` + `pt-BR.json`. No marketing content, no new workflow (FR-001a, spec Clarifications 2026-09-08)
- [ ] T099 Execute the required browser QA at `http://localhost:3000` using browser automation/computer-use tools: click through every in-scope screen and relevant form/dialog/navigation/state, take and inspect real screenshots at 320pt and `lg` in both themes, and compare each against `planning/design/design.md`'s Definition of Done. Fix failures, reload, repeat the affected interactions with new screenshots, and perform a final full sweep. Also execute quickstart A–F and retain the Safari/iOS, Chrome/Android, keyboard, zoom, reduced-motion, language, and recovery matrix; label actual devices versus emulation. Save `artifacts/browser-qa/<run-id>/report.md` plus screenshots and link them from `planning/acceptance-checklist.md`. Keep failures, missing tools/runtime, and unvisited screens unverified; code review/tests alone cannot pass this task. Depends on completed UI stories, T090/T091/T093/T098, and the applicable local runtime (SC-014, AC-38). Language acceptance additionally depends on T089: execute Scenario F for English defaults, guest/auth/account entry, remembered choices, blocked storage, unchanged forms/data, and Portuguese layout; record AC-42 evidence.
- [ ] T100 Review backend ownership against `docs/architecture.md` (SC-017): recommendations only in `backend/meals/`, stock/cooking/history mutations in `backend/pantry/services.py`, units only in `backend/common/units.py`, and pure domain modules independent of HTTP/ORM imports. Add `backend/tests/api/test_meals.py` to compare recommendation ordering and estimates for equivalent sample and owned inputs (allow their expected sample/owner metadata differences) and confirm both leave stock/history unchanged; run existing domain, ownership, and cooking transaction tests. Record review evidence in `docs/architecture.md`; keep the task open until implemented and verified.

---

## Dependencies & execution order

### Phase dependencies

- **Setup (Phase 1)** - no dependencies.
- **Foundational (Phase 2)** - depends on Setup. **Blocks every user story.** Within it: data
  prep (T007→T008→T010; T009 parallel) and backend/frontend foundation run in parallel;
  T035's coverage check (US1) finalizes T010.
- **User Story 1 (Phase 3)** - depends only on Foundational.
- **User Story 2 (Phase 4)** - depends only on Foundational. Reuses T032/T034 (the meals
  serializer) but does not modify US1 behaviour.
- **User Story 3 (Phase 5)** - depends only on Foundational. Extends the meals endpoint and
  the pantry item flow; US1 and US2 remain independently testable.
- **Polish (Phase 6)** - depends on the user stories being complete; T094 requires T092.
- **V2 deployment** - outside this task list and outside the V1 completion gate; see the
  hosted-delivery backlog in `docs/future-improvements.md`.

### Within each user story

- Domain modules (`matching`, `urgency`, `pricing`, `dates`) before the endpoints that call
  them.
- Models before serializers before views.
- Backend endpoint before the frontend screen that consumes it.
- Implementation before that story's test tasks (test-after).
- Finish a story (through its checkpoint) before starting the next priority.

### Parallel opportunities

- All of Phase 1 (`[P]` on T002–T006).
- Phase 2: data prep, `backend/common` + `units`, and the entire frontend foundation
  (T020–T028) proceed as three parallel tracks after T011/T013.
- After Foundational: with capacity, US1 / US2 / US3 can be built in parallel by different
  people (they touch mostly different apps and screens; coordinate on `backend/meals/` services/views, `backend/pantry/` mutation services,
  and `frontend/src/screens/Meals.tsx`).
- Within a story, every `[P]` task (all the test files, the independent domain modules, the
  organism batches) can run together.

---

## Parallel example: User Story 1

```bash
# Domain modules with no cross-dependency (T029, T030) together:
Task: "Implement backend/meals/domain/matching.py"
Task: "Implement backend/pantry/domain/urgency.py"

# Then the full US1 test suite together:
Task: "backend/tests/domain/test_matching.py"
Task: "backend/tests/domain/test_ranking.py"
Task: "backend/tests/domain/test_urgency.py"
Task: "backend/tests/api/test_sample.py"
Task: "frontend/tests/meals.test.tsx"
```

---

## Implementation strategy

### MVP first (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational (including data prep and the sample pantry).
2. Phase 3 User Story 1.
3. **Validate locally**: run T042–T046 and quickstart Scenario A; demonstrate the sample
   pantry on localhost as the P1 checkpoint, then continue through the remaining approved stories.

### Incremental delivery

- Foundational done → foundation ready.
- + User Story 1 → the no-account meal-discovery demo (MVP).
- + User Story 2 → a usable single-user product (accounts, private pantry, cooking loop).
- + User Story 3 → personal recipes, cost estimates, date awareness - the full acceptance
  checklist.
- + Polish → local launch, accessibility, SQLite restore drill, landing screen, recorded acceptance
  evidence.

### Parallel team strategy

After Foundational: Dev A on US1, Dev B on US2 (auth + pantry), Dev C on US3 (prep can begin
against the contracts while US2's models land). Integrate at each checkpoint.

---

## Notes

- `[P]` = different files, no dependency on an incomplete task.
- Every user-story task carries its `[US#]` label for traceability back to `spec.md`.
- Tests come after implementation in each phase (per the chosen strategy) - but the backend
  ownership / auth / throttling / validation / domain-service suites (T042–T045, T065–T069,
  T084–T087) are the AC-39 / AC-40 / AC-41 gates and are **not** optional.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
- The 6-hour build-window target does not license dropping approved requirements or marking a
  failed acceptance item as passed - report unfinished items instead (constitution).
