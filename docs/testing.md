# Testing and acceptance

**Status:** Phase 1 setup checks are implemented. Product and browser acceptance checks
are still pending; setup checks do not establish product acceptance.

## Setup tests and database modes

From `backend/`, run `pytest` for isolated in-memory SQLite tests. Run `pytest --sqlite-file`
for a fresh temporary file-backed database, including the `sqlite_file` tests. Paths come
from pytest's temporary directory, never `SQLITE_PATH` or `backend/db.sqlite3`.

Mark future contention/idempotency tests with both `@pytest.mark.sqlite_file` and
`@pytest.mark.django_db(transaction=True)` (or request `transactional_db`). Open independent
connections to `connection.settings_dict["NAME"]` inside each test and close them before
teardown. These tests skip in the normal run, so both commands are required. The Phase 1
probe verifies a second connection can observe committed rows, contends with an active
writer, and succeeds after rollback; product stock/idempotency tests remain future tasks.

Minimal `tests/settings.py` is sufficient for setup. Phase 2 must add the application
settings and installed apps there without removing the isolated database configuration in
`tests/conftest.py`. Do not use the setup-only settings to claim API or migration coverage.

From `frontend/`, run `npm test`, `npm run lint`, and `npm run typecheck`. The test runner
uses jsdom and Testing Library. Token-rule regression tests run the actual ESLint config
against valid and invalid snippets, including nested components and primitive internals.
`npm run build` runs lint and type checks before bundling; it requires Phase 2's app entry.

These checks cover tooling only. No screenshot report is created before a real browser run.

## Sources of acceptance criteria

- [Acceptance checklist](../planning/acceptance-checklist.md): product, browser, accessibility,
  account, and persistence gates.
- [Feature specification](../specs/001-echo-pantry-mvp/spec.md): requirements and success criteria.
- [Feature quickstart](../specs/001-echo-pantry-mvp/quickstart.md): ordered commands and end-to-end scenarios.
- [Implementation tasks](../specs/001-echo-pantry-mvp/tasks.md): work still to be completed.

## Application checks

- **Backend**: ownership isolation (including the `404` for another user's record), auth +
  token refresh, rate limiting on the unauthenticated endpoints, validation failures, and the
  matching / ranking / pantry-arithmetic services. These are the AC-39/AC-40/AC-41 gates.
- **Frontend**: the acceptance checklist flows, including connection loss, failed and retried
  writes, session expiry mid-form, and draft restoration.

- **Language control (AC-42)**: follow
  [quickstart Scenario F](../specs/001-echo-pantry-mvp/quickstart.md#scenario-f--english-default-and-optional-portuguese)
  and the [UI contract](../specs/001-echo-pantry-mvp/contracts/language-selector.md).
  Verify first-render English, explicit Portuguese, persistence across reload/sign-out,
  guest/auth/account menu access, blocked storage, unchanged forms/data, and keyboard/page
  language. Include real screenshots of Portuguese menu/auth layouts and failure feedback
  in the required browser QA report. No language acceptance is passed by this plan alone.

Use isolated test databases. Include file-backed SQLite tests with separate connections for
competing writes, quantity precision round trips, lock-timeout rollback, and idempotent
cooking replay. Verify repeated reference seeding changes no owned records.

Check the backend ownership map against SC-017: pantry and meals remain separate apps;
sample and personal recommendations reuse the meal service; domain calculations do not
import HTTP or ORM classes; pantry mutations commit stock, cooking logs, and history
together. Keep pure rule tests in `backend/tests/domain/` and API/integration checks in
`backend/tests/api/`, alongside the planned seed, transaction, and recovery checks.

## Frontend and UI checks

Follow the exact browser/device matrix in the acceptance checklist. Include both themes,
keyboard navigation, focus restoration, visible field errors, touch targets, 200% zoom,
reduced motion, and narrow/wide layouts. Test loading, empty, error, disabled, and selected
states where applicable, plus image fallbacks without layout shifts.

Exercise sign-up/sign-in, sample browsing, pantry entry, meal filters and explanations,
personal recipes, reviewed cooking deductions, history, and undo. Stop the API during a
write and expire a session during a form: input must survive and successful retries must
not duplicate mutations. Confirm prepared core flows work with a reachable local API
without requiring public internet access.

## Required browser QA

**Target:** `http://localhost:3000` with Django running at `http://localhost:8000` and the
prepared SQLite data. Use browser automation or computer-use tools to perform the actions
in the rendered app. This is required after UI work and for final release acceptance.

1. Read the [design Definition of Done](../planning/design/design.md#definition-of-done),
   the screen routes, and the relevant acceptance criteria. Make a screen/state checklist;
   source reading prepares the pass but does not count as visiting a screen.
2. Open the local app. Click through landing, sample Meals, sign-up/sign-in/sign-out, owned
   Meals and recipe details, Pantry and item forms, cooking review, history/undo, My Recipes
   and the shared recipe form, plus implemented navigation/settings/notices. Use a local
   test account for mutations and the labeled sample for anonymous/read-only behavior.
   Check links, forms, dialogs, scrolling, and keyboard navigation through actual interaction.
3. Capture and inspect a screenshot of each screen and relevant state at 320pt and `lg` in
   light and dark themes. Compare spacing, typography, colors, imagery, layout, visible copy,
   focus, controls, and empty/loading/error states with the Definition of Done. Exercise
   hover/focus/pressed/disabled/loading and selected states where applicable; record action
   evidence for transient behavior that a still image cannot demonstrate.
4. Keep the existing real-device matrix, 200% zoom, reduced motion, English default and
   explicitly selected Portuguese, drafts, and failure/retry checks. A desktop screenshot
   or emulated viewport does not establish that a real mobile-browser check passed. Use
   configured trusted-LAN access when testing on a phone.
5. Fix observed failures within the approved scope, reload, repeat the failed actions, and
   capture the corrected state. Recheck affected neighboring screens, then complete a final
   screen sweep. Continue until the criteria pass or an actual blocker prevents validation.
6. Save the evidence and link it from the canonical acceptance checklist. Missing screens,
   unavailable app/tooling, or unresolved failures keep the affected acceptance items open.
   Never infer a pass from code or generate a substitute image for an actual screenshot.

### Evidence

Use `artifacts/browser-qa/<run-id>/report.md` and a `screenshots/` folder under the same run.
Record the build/version, date, frontend URL, browser/device, viewport, theme, and language.
Map each screen/state to the actions actually performed, its Definition of Done criterion,
expected and observed behavior, pass/fail/unverified status, screenshot path, fix, and retest
evidence. Keep before/after images for corrected failures. Explain unsupported or genuinely
inapplicable checks without marking unperformed checks passed. Link each run from
`planning/acceptance-checklist.md`; do not create an evidence report until a run occurs.

Source/lint checks still verify token use, component reuse, and i18n wiring. Unit/API tests
still verify data rules. These complement direct browser observation.

## Persistence and recovery

Verify the same SQLite file preserves owned data after sign-out, browser-data clearing,
and process restart. A restore drill uses a separate file and verifies sign-in, ownership
isolation, quantities, favorites, recipes, history, and sample coverage. Record snapshot
time, restore duration, and results. A readiness response alone is not a recovery test.

## Reporting results

Record commands, device/browser conditions, and observed results for each gate. Planned
targets remain targets until measured; leave unexecuted checks open. The quickstart
identifies commands and seed files that will exist only after implementation.
