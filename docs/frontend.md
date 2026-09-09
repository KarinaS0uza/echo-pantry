# Frontend

**Status:** Phase 2 providers, routes, shared UI, API client, explicit language preference,
and draft/API-reachability recovery are implemented. Shared-component tasks T023-T025 remain
open for complete browser verification. Sample Meals and recipe detail are implemented, with filters, ingredient selection,
server-scaled quantities, and English/Portuguese interface copy. Authentication refresh
integration and owned product screens are implemented with browser acceptance pending; see
[Phase 4 verification](phase-4-verification.md). See [Phase 3 verification](phase-3-verification.md). See [foundation validation](foundation-validation.md).

This guide owns browser application structure, navigation, API integration, and state
recovery. [UI](ui.md) covers visual and interaction rules.

Meals shows up to seven ready recipes followed by up to three purchase-needed suggestions.
Each section preserves the API ranking and counts only its displayed cards. Independent
section limits keep incomplete suggestions visible when all seven ready places are filled.
The API continues to return the full catalogue; this display limit does not change matching.

## Stack and runtime

- **Stack**: React Native Web, Gluestack UI, TypeScript, Vite, Motion. Themed from
  `planning/design/tokens.ts` through a single `useTheme()` provider (see
  `planning/design/code.md`).
- **Routing**: hash-based, so direct links and refreshes work without frontend server routes.
  Screens: Meals, Pantry (History lives inside Pantry), My Recipes, plus Sign in / Sign up.
- **Data access**: a typed API client wraps `fetch`. It holds the access token in memory,
  attaches it, refreshes it transparently on `401` using the stored refresh token, retries
  idempotent requests once, and surfaces typed errors to the form or view that made the call.
  A `429` from a rate-limited endpoint surfaces with its retry hint.
- **API reachability**: the local API must be running to read and change data. Loss of it shows a
  persistent `OfflineBanner`; already-loaded data stays visible, marked not live. Failed
  writes roll back optimistic changes, keep the user's input, and offer retry.
- **Local launch**: `npm run dev -- --host localhost --port 3000 --strictPort`.
  `VITE_API_BASE_URL=http://localhost:8000/api/v1`. Use this exact hostname consistently so
  token/draft storage and CORS do not switch origins. `vite build` remains a local build check.
- **Phone validation**: optional trusted-LAN configuration changes both bind addresses,
  API base URL, allowed hosts, and exact CORS origins together. A phone's `localhost` refers
  to that phone. The default local setup binds only to loopback and needs no public URL.

## Planned source layout

| Directory | Responsibility |
|---|---|
| `frontend/src/app/` | Hash router, application entry, and shared providers. |
| `frontend/src/design/` | Design tokens, theme provider, and Gluestack theme mapping. |
| `frontend/src/components/` | Atoms, molecules, organisms, and templates. |
| `frontend/src/screens/` | Landing, Meals, Pantry with History, My Recipes, and authentication; wire data to templates. |
| `frontend/src/api/` | Typed requests/responses, token refresh, errors, timeouts, and safe retry. |
| `frontend/src/drafts/` | Unsent input persistence and explicit recovery. |
| `frontend/src/i18n/` | Primary/default English strings and optional Brazilian Portuguese strings. |
| `frontend/tests/` | Components, navigation, API failures, and recovery tests. |

The [feature plan](../specs/001-echo-pantry-mvp/plan.md) contains the full planned tree.
These directories are implementation targets. Phase 1 supplies `src/vite-env.d.ts`,
tooling tests, Vite/TypeScript/ESLint configuration, and dependency manifests; the app
directories and their behavior arrive in later tasks.

English is the default interface language, including for a browser configured in Portuguese.
Brazilian Portuguese is an optional secondary language selected explicitly through the
shared navigation menu. Remember that selection as a per-viewer UI preference; use a valid
saved `en` or `pt-BR` choice, otherwise `en`. Do not auto-select from browser language.

The planned control sits below navigation links and above account actions. Auth pages expose
the same drawer through a small in-layout menu button; guest landing/sample layouts hide
private links and the FAB. Switching updates UI text and page language in place, preserving
route, form input, and requests. Store the plain choice in `echo:ui:v1:language`; sign-out
preserves it. If saving fails, keep the language for that page session and show a clear helper.
See [the implementation plan](../specs/001-echo-pantry-mvp/plan.md#language-selector-implementation-plan)
and [UI contract](../specs/001-echo-pantry-mvp/contracts/language-selector.md) for module
ownership, source-content boundaries, copy, and acceptance. No language API is added.

## Navigation and entry

The main screens are Meals, Pantry, and My Recipes. History stays inside Pantry;
entry and cooking review use shared forms or sheets. Sign-in and sign-up are the account
gate. A thin landing screen reaches the read-only sample pantry in one tap and redirects
signed-in visitors past itself. No preference questionnaire blocks exploration.

Use the same right-side navigation drawer at every breakpoint. The UI guide specifies
the header, drawer, and Add item action.

## Data and browser storage

The local Django API owns durable pantry, recipe, account, preference, and history records.
The browser renders API results and never becomes the inventory database. Matching,
ranking, urgency, and price calculations remain backend responsibilities.

- Keep the access token in memory; only the refresh token may use local storage.
- Local storage also holds unsent drafts and per-viewer UI preferences.
- Forms with multiple fields save drafts after a 500ms debounce using
  `echo:draft:v1:{formId}:{entityId | 'new'}`. Show `DraftRestoredBar` with Discard;
  clear after successful submission and expire drafts after seven days.
- Never persist passwords or sensitive fields in drafts. Keep a form through session
  expiry and resume after re-authentication; repeated refresh failure explains the return
  to sign-in.
- Warn on dirty in-app navigation. Browser unload warnings are best effort; draft saving
  and page-hide flushing provide recovery.

## Request failures and retries

Use the [API contracts](api.md) for error shapes and replay rules. Bound requests with the
planned 10-second timeout. A reachable localhost API remains usable even when the browser's
internet-status flag says offline. The persistent connection banner is driven by API
availability; already-loaded data is read-only and labeled not live during an API failure.

Reconcile optimistic changes with the API response and roll them back on failure while
preserving input. Retry safe requests once, honoring `Retry-After`; cooking submissions
reuse their `Idempotency-Key`. There is no service worker or offline write queue in V1.

## Related guides

- [Local development](local-development.md): configuration, startup, and trusted-LAN access.
- [UI](ui.md): components, themes, accessibility, interaction states, and copy.
- [Testing](testing.md): browser and recovery acceptance checks.

### Home routing

The kitchen at `#/kitchen` is the home page after successful sign-in or account creation.
Signed-out visitors open the welcome page at `#/` (also available at `#/welcome`).
Signed-in visitors opening either welcome route go to `#/kitchen`. Sample exploration
continues to use `#/meals`. This updates the earlier signed-in Meals destination.
