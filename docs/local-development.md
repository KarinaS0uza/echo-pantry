# Local development

**Status:** Phase 1 setup is implemented. Application entry points, API, and screens are pending.

The Phase 1 commands below are available now. The later run sequence is the intended
workflow after the application tasks are implemented. The
[feature quickstart](../specs/001-echo-pantry-mvp/quickstart.md) is the complete, ordered
setup and validation procedure, including prerequisite data files and recovery commands.

## Phase 1 setup

From the repository root, using Python 3.12 and Node 22.12+ or Node 24:

```bash
python3.12 -m venv backend/.venv
backend/.venv/bin/python -m pip install -e './backend[dev]'
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
npm --prefix frontend ci
```

If using uv to manage Python, replace the first two commands with:

```bash
uv venv --python 3.12 backend/.venv
uv pip install --python backend/.venv/bin/python -e './backend[dev]'
```

Replace the two secret placeholders in `backend/.env` before the later Django launch.
Generate each separately with `backend/.venv/bin/python -c "import secrets; print(secrets.token_urlsafe(64))"`.
Never put a secret in a frontend `VITE_` variable. The backend environment helper reads
`backend/.env` explicitly regardless of the working directory, preserving process-variable
overrides; the Phase 2 Django settings will call that helper.

Setup checks available now:

```bash
backend/.venv/bin/ruff check backend
backend/.venv/bin/ruff format --check backend
backend/.venv/bin/pytest -c backend/pytest.ini backend/tests
backend/.venv/bin/pytest -c backend/pytest.ini backend/tests --sqlite-file
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run check:setup
```

The default backend run uses memory and skips the marked file-only probe. The second run
uses a fresh temporary file and exercises independent connections. See
[test database modes](testing.md#setup-tests-and-database-modes) for later test authoring.
`check:setup` repeats frontend checks and bundles the chosen dependencies using Vite's
production resolver in a temporary directory that it removes afterwards.
Frontend lint includes the token rules before `vite build`; the full `npm run build` and
application launch need T020's `index.html` and entry point. No runnable product UI or
backend server is supplied by Phase 1.

## Local services

| Service | Address or path |
|---|---|
| Frontend | `http://localhost:3000/#/` |
| Django REST API | `http://localhost:8000/api/v1` |
| Readiness | `http://localhost:8000/api/v1/health` |
| SQLite | `backend/db.sqlite3` |

Use Python 3.12 with SQLite support, Django 5.2, and Node/npm compatible with the planned
frontend dependencies. Core flows use prepared local fonts, images, and seeded reference
data. Installation, data preparation, and opening original recipe websites require internet.
Once prepared, ordinary use requires the local frontend and API processes.

## Configuration

Secrets come from uncommitted environment configuration. Examples may contain placeholders.

| Variable | V1 purpose/default |
|---|---|
| `SQLITE_PATH` | Optional absolute override; defaults to `BASE_DIR / "db.sqlite3"` in `backend/` |
| `DJANGO_SECRET_KEY` | Required local Django secret |
| `SIMPLE_JWT_SIGNING_KEY` | JWT signing key; may reuse the local Django secret for local development |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` (exact origin) |
| `DJANGO_DEBUG` | `true` for local development; public production settings deferred |
| `VITE_API_BASE_URL` | Frontend setting: `http://localhost:8000/api/v1` |

No `DATABASE_URL`, bucket credentials, hosting secrets, container runtime, or cloud scheduler
is required for V1. Neither SQLite databases nor snapshots are committed.

SQLite transaction settings follow the feature plan: `transaction_mode=IMMEDIATE`,
`timeout=5`, and `ATOMIC_REQUESTS=False`, with explicit short transactions for mutations.
The backend loads its uncommitted `backend/.env`; Vite uses `frontend/.env.local`.
Exact CORS configuration also allows `idempotency-key` and exposes `Retry-After`.

## Run sequence

1. Follow the quickstart to prepare reference data, install dependencies, and fill environment
   placeholders. Do not commit environment files, databases, journals, or backup files.
2. Run Django checks and migrations, then the reference seed and sample-coverage validation.
3. In the backend terminal, run `python manage.py runserver localhost:8000` with its virtual
   environment active.
4. In the frontend terminal, run `npm run dev -- --host localhost --port 3000 --strictPort`.
5. Open the frontend and confirm `/api/v1/health` returns `200` with `{"status":"ok"}`.
   This establishes schema/reference readiness; it does not establish product acceptance.

Use `localhost` consistently: `127.0.0.1` creates a different browser origin and storage
context. A build check remains part of validation even though public hosting is deferred.

## Access from a phone

Loopback is the default. For deliberate testing on a trusted LAN, configure both server
bind addresses, Django allowed hosts, exact frontend CORS origins, and the frontend API
URL together. Use the local computer's LAN address on the phone; the phone's `localhost`
refers to the phone. See the quickstart for the full procedure and browser matrix.

## Snapshot and restore

Create a consistent SQLite snapshot before release validation and after reference or sample
data changes using the planned `backup_database` command. Follow the quickstart to restore
into a separate SQLite file, select it through an absolute `SQLITE_PATH`, and check
accounts, ownership, quantities, history, and seed coverage without overwriting the working
database. Record the snapshot timestamp, recovery duration, and results.

Keep snapshots and drill files outside version control and purge them within seven days.
Apply account-deletion requests to retained copies before confirming completion. Local
copies do not protect against loss of the computer; V2 contains remote backup work.

## Troubleshooting

- If the API is stopped, restart it and retry with the user's input preserved.
- If readiness fails, check the selected SQLite file, migrations, and reference seed.
  A new SQLite path can create an empty database, so connection success alone is insufficient.
- If cross-origin requests fail, compare the browser origin with the exact CORS and API URL
  settings; confirm the idempotency header is allowed.
- If a write reports a busy database, honor the retry hint and use the same idempotency key
  where required. Never replace a failed atomic operation with partial writes.

[Testing](testing.md) covers the remaining automated and manual checks.
