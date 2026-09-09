# API

**Status:** Phase 3 implements anonymous sample discovery and curated recipe reads, alongside
the Phase 2 health endpoint, shared authentication/CORS configuration, ownership/throttle
helpers, and typed errors. Registration/login, account-owned resources, cooking, and price
calculation remain planned. The contract index includes both implemented and planned routes.
See [foundation validation](foundation-validation.md) for Phase 2 checks and open tasks.

The frontend calls Django REST Framework through `http://localhost:8000/api/v1`.
Requests and responses use JSON. API resources keep their names regardless of the Django
app that implements them; [backend](backend.md) defines that ownership.

## Contract authority

The [feature contract index](../specs/001-echo-pantry-mvp/contracts/README.md) is the detailed
source for payloads, validation, error shapes, status codes, pagination, and retry behavior.
Update those contracts when API behavior changes; this guide provides orientation.
A generated OpenAPI schema is planned during implementation.

## Implemented discovery endpoints

All paths below are relative to `/api/v1` and use camelCase JSON. Discovery routes accept
only read methods (`GET`, `HEAD`, `OPTIONS`), are anonymous, and share the sample throttle of
100 requests per minute per client. They read reference tables, never account-owned stock
or custom foods. Filters and recipe viewing do not persist changes.

| Endpoint | Delivered behavior |
|---|---|
| `GET /health` | Reports database migration and seed readiness. |
| `GET /sample/pantry` | Seeded quantities, food identities, dates, and calendar-based urgency; `isSample: true`. |
| `GET /sample/foods` | Reference catalogue for ingredient selection and avoidance, returned as `{results, isSample: true}`. Each entry includes `id`, `name`, `category`, `form`, `aliases`, `defaultUnits`, and `dietaryFlags`. |
| `GET /sample/meals` | Ranked `completeMatches` and `purchaseNeeded` with ingredient explanations; supports servings, meal type, cuisine, time, vegetarian, favorites, repeated avoid/use-today selections, and recipe-scoped optional ingredients. Sample favorites are empty. |
| `GET /recipes` | Curated summaries; filters for cuisine, meal type, maximum time, and verified vegetarian status. |
| `GET /recipes/{id}?servings=2` | Ingredient quantities scaled from recorded yield to 1-12 servings, with a default of two. Original source name and external URL are included; instructions and photography are not. |

Unknown amounts remain `null`, independently of `toTaste`; unknown cooking time and
vegetarian status also remain `null`. Unknown time is excluded from 30/60-minute filters.
Missing quantities and incompatible units block complete-match claims. Active ingredient
avoidance excludes recipes with matching ingredients or unverifiable composition.

Explanations distinguish available, missing, and quantity-uncertain ingredients. In selected
ingredient searches, `optionalAdditions[].selectable` is true only for source-optional
ingredients; other available required ingredients provide context without an opt-in control.
Urgency uses `review`, `use_today`, `use_soon`, `coming_up`, `neutral`, or `unknown`, never
a food-safety determination or automatic discard instruction.

Price calculation is a later phase. Complete matches return `estimate: null`;
purchase-needed suggestions return an explicitly `incomplete` estimate with null package and
portion totals. They never claim a zero price or a priced shopping basket.

## Resource contract index

| Contract | Responsibility |
|---|---|
| [Authentication](../specs/001-echo-pantry-mvp/contracts/auth.md) | Registration, login, and token refresh. |
| [Sample](../specs/001-echo-pantry-mvp/contracts/sample.md) | Anonymous, read-only sample exploration. |
| [Foods](../specs/001-echo-pantry-mvp/contracts/foods.md) | Food catalogue and custom-food interfaces. |
| [Pantry items](../specs/001-echo-pantry-mvp/contracts/pantry-items.md) | Owned stock, quantities, storage, and dates. |
| [Pantry checks](../specs/001-echo-pantry-mvp/contracts/pantry-checks.md) | Whole-pantry and selected-item checks. |
| [Recipes](../specs/001-echo-pantry-mvp/contracts/recipes.md) | Curated recipes and ingredient details. |
| [Personal recipes](../specs/001-echo-pantry-mvp/contracts/personal-recipes.md) | Owned recipes and variations. |
| [Favorites](../specs/001-echo-pantry-mvp/contracts/favorites.md) | Saved recipes and sources. |
| [Meals](../specs/001-echo-pantry-mvp/contracts/meals.md) | Matching, filters, ranking, prices, and explanations. |
| [Cooking logs](../specs/001-echo-pantry-mvp/contracts/cooking-logs.md) | Reviewed, idempotent stock deductions. |
| [History](../specs/001-echo-pantry-mvp/contracts/history.md) | Used/discarded history and undo. |
| [Preferences](../specs/001-echo-pantry-mvp/contracts/preferences.md) | Owned browsing and pantry preferences. |
| [Health](../specs/001-echo-pantry-mvp/contracts/health.md) | Migrated and seeded database readiness. |

## Authentication and ownership

SimpleJWT configuration and ownership helpers are implemented; the following account flows
remain planned. SimpleJWT issues access and refresh tokens. Per-user requests carry
`Authorization: Bearer <access token>`; access tokens stay in browser memory and refresh
tokens may use local storage. Filter every owned queryset to `request.user` and apply
object-level checks. Another user's record returns the same `404` as a missing record.

Planned anonymous account endpoints include registration, login, and refresh. The read-only
sample API, curated recipe reads, and readiness probe are available now. Use the contract
throttle scopes: sample browsing at 100 requests
per minute per client, authenticated traffic at 100 per minute per user, and registration,
login, and refresh at 10 per minute per IP. These are starting limits to verify.

## Errors and recovery

Errors contain `detail` and field-keyed `errors`. Rate limits and retryable SQLite lock
timeouts include `retryAfter` seconds matching the `Retry-After` header. Validation errors
appear beside the relevant form field. The planned account flow uses one refresh attempt for an expired access token;
repeated failure returns to sign-in with an explanation and preserved input.

Safe requests may retry once. Planned cooking retries retain their `Idempotency-Key`; a conflicting
payload with the same key returns `409`. A known SQLite lock timeout returns a typed `503`
after rollback, with no partial write. See the contract index for exact bodies and rules.

Allow the exact configured frontend origin, permit `idempotency-key`, and expose
`Retry-After` through CORS. Bearer authentication does not require cookie credentials.
Breaking changes advance the API version and are reconciled with the frontend before release.

## Planned example: I cooked this

1. Frontend requests the recipe's scaled ingredient list from the API.
2. User edits the actual-use review; frontend `POST`s the reviewed lines to
   `/api/v1/cooking-logs/`.
3. The API validates ownership and quantities, then in one transaction: writes the
   `CookingLog`, deducts `PantryItem` stock (never below zero), and writes `HistoryEntry`
   rows. A duplicate submission (same idempotency key) returns the original result.
4. Frontend reconciles its optimistic pantry update against the response; on error it rolls
   back and shows a retry toast.

## Validation

Use [testing](testing.md) for ownership, authentication, throttling, transaction, and retry
checks. [Local development](local-development.md) describes startup and readiness.
