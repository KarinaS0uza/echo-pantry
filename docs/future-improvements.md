# Future improvements

The V2 hosting work below was deferred by the owner on 2026-09-08. It is a next-version
backlog, not a dependency or implementation task for the localhost release. Other
directions remain unscheduled proposals. The constitution's *Current MVP Boundary* governs V1.

## V2 - Public deployment and hosted database

**Current release (V1):** frontend and Django REST API on localhost; Django's built-in SQLite
backend stores data in `backend/db.sqlite3`. Complete and validate the existing product flows
there before starting this backlog. V2 here means the next delivery version, not feature
`002-live-meal-rescue`, which is a separate optional AI proposal.

| Work | V2 deliverable and validation |
|---|---|
| Frontend deployment | Build static assets with Vite, deploy to Vercel, set the public API URL, and verify hash links, refresh, and mobile access. |
| Backend deployment | Deploy Django/DRF to Render with a production server; add Docker where useful. Run reviewed migrations and the idempotent reference seed as release operations. |
| SQLite → hosted PostgreSQL | Add the PostgreSQL driver/configuration and provision Supabase. Migrate the schema through Django migrations and transfer account/sample data only when intended, preserving primary keys, password hashes, foreign keys, and ownership. Verify row counts, stock/history, sign-in, and seed idempotency before cutover; keep a tested rollback copy. This requires migration work, not only a URL change. |
| Public-service configuration | HTTPS, exact frontend CORS origins and allowed hosts, debug disabled, environment secrets, static/media handling, and production checks. Keep SimpleJWT and the API ownership boundary. |
| Backup and recovery | Choose a current provider-supported backup or scheduled database dump to external storage; test restore. Starting hosted targets: daily backup, at most 24 hours of lost data, recovery within one business day, at least seven days retention reconciled with the 30-day account-deletion window. |
| Hosting behavior and monitoring | Recheck provider pricing, usage limits, sleep behavior, and backup features when V2 starts. Add readiness monitoring and measured cold-start recovery only if needed. Evaluate whether a keep-warm schedule is appropriate and permitted; do not assume a free service is always on. |
| Release evidence | Repeat the browser/device matrix, ownership and concurrent-write tests on PostgreSQL, restart/restore validation, and public-network performance measurements; then prepare the public URL/QR code. |

Former V1 deployment tasks T092/T093/T094 have been replaced with local snapshot, launch,
and restore tasks. Their hosted responsibilities are captured in this table and must be
planned as V2 work rather than left as unchecked V1 requirements. Provider free-tier numbers
from earlier notes are historical assumptions and must be reverified before deployment.

No V2 cloud resources, credentials, automation, or deployment files are created by this plan.


## Authentication → Supabase Auth

This version authenticates with `djangorestframework-simplejwt` (email + password, JWT access
and refresh tokens) for simplicity and to keep Django as the single writer.

A later version may move authentication to **Supabase Auth**:

- Supabase issues and verifies tokens; the Django API validates the Supabase JWT instead of
  minting its own.
- Enables hosted email verification, password reset, and third-party providers without building
  those flows in Django.
- Opens the door to Supabase row-level security if any direct client→database access is ever
  wanted (not currently planned).
- Migration concerns: mapping existing users, a cutover for issued tokens, and keeping the
  `User` ↔ owned-data relationships intact.

## Offline-first operation with background sync

This version requires a reachable local Django API to read and change data. A later version may add:

- A local store (IndexedDB) as the working copy, with the API as the source of truth.
- A write queue that applies changes locally, syncs when a connection returns, and reconciles
  conflicts (last-writer-wins per field, or a review prompt for pantry quantities).
- A service worker caching the app shell and reference data so first load is the only hard
  online requirement.

The current constitution rules for optimistic writes, rollback, and "no user action silently
lost" are the foundation this would build on.

## Household sharing across accounts

Single-user accounts ship now. A later version may add shared pantries:

- A household entity owning pantry, recipes, and history, with members and roles.
- Invitations, and a merge path from a personal pantry into a shared one.
- Real-time updates when another member changes stock.

## Capture-based pantry entry

Deferred from this version, in rough priority order (see `planning/1-interview-me.md`):

1. Barcode scanning against an external product database.
2. Photo recognition as a fallback when a barcode fails.
3. Printed-date scanning from a photo, with user confirmation.
4. Receipt scanning to add purchases in bulk.
5. Nutrition-label capture.

Any of these must route detected items through `ItemConfirmList` (review and deselection
before adding), and manual entry must remain available.

## Richer recipe and filter coverage

- More recipes beyond the curated 30.
- Live search of favourite recipe websites, with other sources when favourites have no match.
- Verified dietary filters (nut-free, low/no sugar, low sodium, infant suitability) once the
  ingredient, nutrition, and age data to support them is available.
- A dedicated recipe-variation editor beyond the shared "Add my recipe" / "Save as my version"
  form.

## Measurement and reporting

- Measured food-waste and cost-impact reporting based on observed outcomes - never treating all
  consumption as waste prevented or recipe engagement as savings (Principle III).
- Push reminders for pantry checks and food needing attention.
- Detailed storage-area checks with per-area dashboards.

## Out of scope indefinitely

Monetisation, B2B, store partnerships, and native mobile apps.
