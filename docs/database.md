# Database and reference data

**Status:** Phase 2 schema, reference seeding, exact Decimal conversions, and SQLite
contention tests are implemented. Owned pantry/cooking/history schemas and the full restore
workflow remain planned. See [foundation validation](foundation-validation.md).

V1 uses Django's built-in SQLite backend at `backend/db.sqlite3`. Django owns schema
changes through reviewed migrations, and the API owns durable writes. The
[backend guide](backend.md) maps records and workflows to their owning apps.

## Persistence and transactions

- Django SQLite backend; schema and reference seeding remain separate and repeatable.
- A single local API process and low simultaneous-write volume. Short explicit atomic write
  transactions use SQLite `IMMEDIATE` mode with a bounded busy timeout; never rely on
  `select_for_update()` row locks. Stock, log, history, and idempotency checks commit together.
  See the [research decisions](../specs/001-echo-pantry-mvp/research.md) (B8/D1) and
  [data model](../specs/001-echo-pantry-mvp/data-model.md) for precision and lock-error handling.
- Local snapshots use Python's SQLite backup API through a planned `backup_database`
  management command. Capture before release validation and after reference or sample data changes;
  restore to a different file and verify before release validation. Never copy a live database with
  an ordinary file-copy command. Keep snapshots/drill files out of Git and purge within seven
  days; apply account-deletion requests to all retained copies before confirming completion.
- The normal database survives browser clearing, sign-out, and API restarts. Same-computer
  snapshots do not protect against losing the computer. Remote scheduled backups and hosted
  recovery targets are deferred to V2.
- Seeded core flows run without internet once local dependencies/assets are available.
  API failure still invokes rollback/retry; `navigator.onLine` alone must not block a working
  localhost API. External recipe links require internet. No service worker or offline queue.


### Data model (first cut)

| Model | Notes |
|---|---|
| `User` | Django auth user; email is the login identifier |
| `PantryItem` | owner, food, quantity, unit, storage location, date + date-kind, timestamps |
| `PantryCheck` | owner, kind (whole / selected), checked-at, item set for selected checks |
| `Food` | reference catalogue; name, aliases, category, default units |
| `Recipe` | curated collection; source name, original URL, yield, total time, cuisine |
| `RecipeIngredient` | recipe, food, required amount + unit, optional flag, "to taste" flag |
| `PersonalRecipe` / `PersonalRecipeIngredient` | owner-scoped; same shape, plus category labels and optional source recipe link for variations |
| `Favorite` | owner, target (recipe or source) |
| `CookingLog` | owner, recipe ref, cooked-at, reviewed line items actually used |
| `HistoryEntry` | owner, food, quantity, kind (used / discarded), source action, undo state |
| `DateRule` | reference fridge-rule table (food/state → range, initial reminder, anchor kind) |
| `PriceReference` | merchant, product/package, unit, price (USD cents), method, location or unverified flag, source URL, observed-at |

Ownership fields are non-null and indexed. The anonymous sample is a fixed dataset served
through dedicated read-only endpoints. Registration copies sample items into the new user's
editable pantry; subsequent user changes do not alter the shared anonymous sample.

The table above is an orientation map. The [feature data model](../specs/001-echo-pantry-mvp/data-model.md)
is the detailed source for fields, constraints, precision, and relationships. Follow its
quantity representation and round-trip checks rather than assuming SQLite SQL arithmetic
provides exact decimal behavior.

## Reference data and seeding

- Sources live in `data/` (`data/demo/recipe-sources.json`, the price snapshots, and the
  date-rule table).
- A management command (`manage.py seed_reference_data`) loads recipes, foods, date rules, and
  price references, and (re)builds the sample pantry dataset. It is idempotent and never
  touches user-owned tables.
- `scripts/collect-recipe-ingredients.py` and `scripts/validate-price-data.py` prepare and
  check the source files before seeding.

The [reference-data notes](../data/demo/README.md) distinguish existing recipe sources and
price observations from structured seed files still to be authored. The
[recipe selection](../planning/recipe-selection.md) defines the curated collection.

Keep the 30-recipe distribution (9 American, 7 Korean, 7 Indian, 7 Brazilian). Sample coverage
must be measured with the same matching logic used by the application: at least 80% of
distinct required ingredients and 24 of 30 complete recipes at two servings, with all
four cuisines, at least two main dishes, and at least two incomplete recipes. Recheck after
recipe, matching, or seed changes. Seed loading must not alter user-owned records.

## Recovery and future storage

The [local-development guide](local-development.md) links the separate-file restore procedure;
[testing](testing.md) defines what to verify. Hosted PostgreSQL migration, remote backups,
and deployment belong to [V2](future-improvements.md), with data transfer and rollback
validation planned explicitly.
