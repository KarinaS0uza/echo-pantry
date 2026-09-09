# Architecture

**Status:** Phase 2 shared foundations run locally. The domain split, reference schema,
health probe, client, and UI scaffolds exist; the product workflows below remain planned.
See [foundation validation](foundation-validation.md).

This document owns the system overview and boundaries. The
[constitution](../.specify/memory/constitution.md) governs requirements; the focused guides
below expand those boundaries. Keep architecture changes consistent across affected guides,
the feature plan, data model, and contracts.

## Overview

```text
Browser / React Native Web + Gluestack / Vite
http://localhost:3000 (hash routes)
                 │ HTTP / JSON + Bearer access token
                 ▼
Django + DRF - http://localhost:8000/api/v1
                 │ Django ORM + reviewed migrations
                 ▼
SQLite - backend/db.sqlite3 on the local computer
```

V1 is a localhost release (owner decision, 2026-09-08; constitution v4.1.0).
Public hosting and the SQLite-to-PostgreSQL migration are V2 work in
[`future-improvements.md`](future-improvements.md).

- The **frontend** holds no durable data and no authoritative business rules. It renders the
  design system, calls the API, and keeps only the refresh token, unsent drafts, and UI
  preferences in `localStorage`. The access token is held in memory only.
- The **API** is the single writer. It owns validation, per-user authorization, and every
  calculation whose result is stored or shown as an explanation (matching, ranking, urgency,
  price arithmetic).
- The **database** schema is owned by Django models and migrations. No migration is applied
  outside review. Django uses `django.db.backends.sqlite3`; no database server, database
  hosting account, or PostgreSQL driver is needed. SQLite files remain outside version control.

## Documentation by responsibility

| Guide | Owns |
|---|---|
| [Backend](backend.md) | Django apps, module ownership, service boundaries, and dependencies. |
| [Frontend](frontend.md) | Browser structure, navigation, API client, state, and recovery. |
| [UI](ui.md) | Visual system, components, responsive behavior, accessibility, and interaction. |
| [API](api.md) | Protocol overview, authentication, errors, and resource-contract navigation. |
| [Database](database.md) | Persistence, transactions, reference seeding, and recovery requirements. |
| [Local development](local-development.md) | Environment configuration, startup, device access, and restore workflow. |
| [Testing](testing.md) | Verification responsibilities and acceptance evidence. |
| [Future improvements](future-improvements.md) | V2 hosting and other deferred proposals. |

## App ownership and dependencies

The backend is one Django project and one database, with separate `pantry` and `meals` apps
and other apps grouped by business capability. The complete ownership map and dependency
rules now live in [Backend: app ownership and dependencies](backend.md#app-ownership-and-dependencies).

## Request flow

User input travels from the browser through the versioned API into an explicit application
service. Pure domain rules calculate results; the owning service coordinates any database
transaction. Responses return authoritative state for the frontend to reconcile.
See the [cooking example](api.md#example-i-cooked-this) for a concrete mutation.

The [documentation index](README.md) links detailed planning and design references.
