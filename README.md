# Echo Pantry

Cook from what you already have. Echo Pantry looks at the food in your kitchen - especially the
things about to go off - and suggests meals you can make now, with a clear reason for each
suggestion and an honest, labeled estimate of what any missing ingredient would cost. It is
built for busy households where deciding what to cook from a full fridge is harder than buying
a new set of ingredients, and where keeping an inventory up to date should never become another
chore.

The product does not claim money saved or waste avoided; those outcomes must be measured
with real use.

## Status

Phase 3 sample discovery is implemented at `http://localhost:3000/#/meals`: 30 curated
recipes, ranked pantry matches, filters, ingredient selection, and scaled recipe details.
The sample is read-only. Accounts, owned pantry changes, and cooking remain later work;
the sign-up route currently explains that account forms are coming next.
See [Phase 3 verification](docs/phase-3-verification.md) for tests, live interaction evidence,
and remaining acceptance limits. Phase 2 retains three open shared-component verification
tasks. Visual acceptance remains pending under the persistent no-capture rule.
The [acceptance checklist](planning/acceptance-checklist.md) remains open. V1 runs on
localhost with Django-managed SQLite.

## In this version

Email-and-password accounts with a pantry, recipes, and history persisted by the local API
in SQLite on the same machine; a labeled sample pantry to explore before signing in; manual
pantry entry with quantities, storage locations, and editable dates; a curated collection of 30 real recipes
(American, Korean, Indian, Brazilian) plus your own; ranked recommendations with explanations
and "choose ingredients for today"; an "I cooked this" review before any pantry deduction, with
a used/discarded history; a weekly pantry-check nudge; and labeled missing-ingredient cost
estimates from a dated price snapshot.

Out of scope for now: photo/receipt/barcode capture, live store-price lookups, household
sharing, meal-planning calendars, nutrition labels, offline-first sync, and self-serve password
reset / email verification / account deletion / data export. See
[`docs/future-improvements.md`](docs/future-improvements.md).

## Technology

- Frontend: React Native Web, Gluestack UI, TypeScript, and Vite.
- Backend: Django and Django REST Framework, with email/password accounts through SimpleJWT.
- Database: SQLite, with schema managed by Django models and migrations.

The frontend and API run on the same local computer. The API owns durable data and business
rules. Public deployment and migration to hosted PostgreSQL belong to V2.

## Documentation

For the currently runnable setup commands, start with
[local development](docs/local-development.md#run-sequence). The
[feature quickstart](specs/001-echo-pantry-mvp/quickstart.md) covers the full application
launch and validation sequence as later phases are implemented.

Start with the [documentation index](docs/README.md). Focused guides cover
[architecture](docs/architecture.md), [backend](docs/backend.md),
[frontend](docs/frontend.md), [UI](docs/ui.md), [API](docs/api.md),
[database](docs/database.md), [local development](docs/local-development.md),
and [testing](docs/testing.md). Deferred work lives in
[future improvements](docs/future-improvements.md).

## Project references

| Path | Contents |
|---|---|
| [Constitution](.specify/memory/constitution.md) | Binding project requirements. |
| [Planning](planning/) | Product brief, MVP decisions, recipe selection, and acceptance checklist. |
| [Design references](planning/design/) | Tokens, components, patterns, and implementation examples. |
| [Feature specification](specs/001-echo-pantry-mvp/spec.md) | Requirements, implementation plan, tasks, and contracts. |
| [Data](data/demo/README.md) | Curated recipe sources, sample data, and dated price observations. |
| [Scripts](scripts/) | Data collection and validation tools. |
