# Backend

**Status:** Phase 2 configuration, email user, common ownership/error/unit helpers, reference
models, migrations, and seeding are implemented. Health is the only live API endpoint.
Phase 4 authentication, pantry and cooking services are implemented. Personal authoring and
date/pricing services remain Phase 5. See [Phase 4 verification](phase-4-verification.md).
See [foundation validation](foundation-validation.md).

This guide owns backend implementation structure and service responsibilities. The
[architecture overview](architecture.md) defines system boundaries; the
[constitution](../.specify/memory/constitution.md) governs requirements.

## Stack and responsibilities

- **Stack**: Django 5.2, Django REST Framework, `djangorestframework-simplejwt`,
  `django-cors-headers`, and `django-environ` for config; Python 3.12 includes SQLite support.
- **Auth**: registration and login issue a short-lived access token and a longer-lived refresh
  token. The client holds the access token in memory only; the refresh token may be stored in
  `localStorage`. All per-user endpoints require `IsAuthenticated`. The sample API provides
  unauthenticated read-only product data; authentication routes and the health probe also
  permit anonymous access under their contracts.
- **Authorization**: every per-user queryset is filtered to `request.user`. Object-level checks
  reject access to another user's records with `404` (not `403`, to avoid confirming existence).
- **Rate limiting**: the unauthenticated endpoints - sample pantry, registration, login, and
  token refresh - are throttled. Starting limits (testable, not asserted as optimal): 100
  req/min per user for authenticated traffic and per client for anonymous sample browsing; 10 req/min
  per IP for registration, login, and token refresh. Exceeding a limit returns a typed `429`
  with a retry hint.
- **Validation**: serializers validate quantities (positive, known units), unit compatibility
  (mass↔mass, volume↔volume, counts↔counts only), dates, category labels, and state
  transitions. The client is never trusted for correctness.
- **Domain services**: matching, ranking, urgency labelling, and price estimation live in
  plain Python modules called through application services, and are covered by unit tests
  independent of HTTP and database access. Views handle requests; services coordinate the
  operation and its transaction when needed.
- **API shape**: REST resources under `/api/v1/`, JSON only, stable error envelope
  (`{ "detail": ..., "errors": { field: [messages] } }`). A breaking change bumps the version
  segment and is reconciled with the frontend before release.
- **Local launch**: run `migrate`, then `seed_reference_data --check-coverage`, then
  `python manage.py runserver localhost:8000`. Keep the process running while using the application.
- **Health probe**: `GET /api/v1/health` checks a seeded reference table through the default
  Django connection. It returns `200` only if the schema/reference seed is ready; `503` for
  missing schema/seed or unavailable storage. Used for local readiness and the restore drill.

The [API guide](api.md) links the exact resource contracts and security conventions.
Configuration and the run sequence live in [local development](local-development.md);
storage and recovery rules live in [database](database.md).

## App ownership and dependencies

Owner-confirmed, 2026-09-08 (spec SC-017): use a **modular monolith** - one Django project,
one running backend, and one database, organized into apps by business capability. Django
provides the project/app structure; DRF supplies the serializers, views, and routing inside
those apps. A screen, endpoint, or model does not automatically need its own app.

| Package | Owns |
|---|---|
| `config` | Project settings, root `/api/v1/` routing, health, ASGI/WSGI entry points; no product rules |
| `accounts` | User identity, authentication, registration workflow, operator account operations |
| `catalog` | Shared reference records: foods, curated recipes/ingredients, date rules, prices, and sample seed; repeatable reference loading |
| `recipes` | Personal recipes, variations, and favorites |
| `pantry` | Custom foods, stock, dates/urgency, checks, saved pantry/browsing preferences, cooking deductions, and used/discarded history |
| `meals` | Read-only meal recommendations: matching, filtering, ranking, price calculations, and explanations |
| `sample` | Anonymous read-only API for the sample pantry; supplies sample inputs to the same meal service |
| `common` | Small shared infrastructure: ownership helpers, errors, throttles, and pure quantity/unit conversion |

`config` and `common` are support packages, not business domains. `meals` requires no new
stored models or migrations in V1; its results are computed per request. Curated recipes
remain reference data in `catalog`, while user recipes and favorites belong to `recipes`.
API resource names remain stable regardless of which app implements them.

Use the same small internal layout where each responsibility is needed:

```text
<app>/
├── apps.py          # Django app registration
├── models.py        # owned data, relationships, database constraints
├── migrations/      # reviewed schema changes for those models
├── serializers.py   # request validation and response representation
├── views.py         # HTTP handling, authentication, service calls
├── urls.py          # this app's resource routes
├── services.py      # use cases, cross-app coordination, atomic writes
├── selectors.py     # reusable owner-scoped database reads, when useful
└── domain/          # pure calculations where the app needs them
```

These service/selector names are project conventions, not DRF requirements. Create modules
when there is a responsibility to put in them; do not create empty layers for every app.
Start with files, and split a growing file into a package by use case only when it becomes
hard to navigate. Tests keep the existing `backend/tests/` layout: pure rules in `domain/`,
API and cross-app flows in `api/`, plus seed, transaction, and recovery checks.

Dependency rules:

- `meals/services.py` assembles inputs from the owning apps and calls `meals/domain/`.
  That domain package owns `matching.py`, `ranking.py`, `explanation.py`, and `pricing.py`;
  it accepts plain data and imports neither ORM models nor request/response classes.
- `pantry/domain/` owns `dates.py` and `urgency.py`; both sample and personal meal flows
  reuse those rules. `common/units.py` is the one runtime unit-conversion implementation
  used by matching, pricing, and stock arithmetic. None of these modules imports `meals`.
- Both `/meals` and `/sample/meals` use the same meal service and
  `meals/serializers.py`. Each caller supplies the correct owned or sample inputs;
  the empty-pantry preview uses the reference seed directly, without calling a sample view.
- An app changes another app's records through that owner's explicit service. For example,
  registration calls pantry initialization within the registration transaction; cooking
  calls pantry services that commit stock, cooking logs, and history together. Reading
  recommendations never writes stock, and pantry mutation services never call meal views.
- Keep cross-app reads owner-scoped and reusable. Do not import another app's view or
  serializer into domain/model code, perform HTTP calls between apps, or hide essential
  workflows in signals. Use lazy model references for relationships and avoid circular
  Python imports. Management commands can compose services after Django initialization;
  model imports must not execute seed or coverage workflows.
- Keep `common` free of concrete feature-model imports and recommendation/pantry workflows.
  Use Django's ORM directly; a generic repository layer, event bus, or separate deployment
  is not required to preserve these boundaries.

Review SC-017 using this ownership map and the existing matching/ranking/pricing, sample,
ownership, cooking, and transaction tests. Module separation supports maintenance; higher
traffic still requires the V2 database and deployment work and measured performance checks.

## Implementation references

- [Feature plan](../specs/001-echo-pantry-mvp/plan.md): planned source tree and implementation boundaries.
- [Data model](../specs/001-echo-pantry-mvp/data-model.md): fields, relationships, precision, and transactions.
- [Tasks](../specs/001-echo-pantry-mvp/tasks.md): implementation sequence and verification work.
- [Testing](testing.md): unit, API, integration, and recovery checks.
