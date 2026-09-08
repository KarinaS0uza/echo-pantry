# Implementation decisions

## Phase 1 setup, 2026-09-08

- Scope is T001-T006 in `specs/001-echo-pantry-mvp/tasks.md`. Application entry points,
  Django apps/settings, routes, design components, and seeds remain Phase 2 work.
- T005 names `.eslintrc.cjs`, while research C5 describes flat config. Use the task's exact
  file with ESLint 8.57.1 and the local `eslint-plugin-echo`. This preserves the required
  enforcement; a future flat-config migration must keep the same rule tests passing.
- Use Gluestack's v1 themed API and styling package, matching the planned token-to-config
  mapping. Pin React Native 0.76.9 to satisfy React 18 peer requirements. Vite resolves native
  imports to React Native Web. Native dependencies supply peer contracts and types, not an
  additional mobile application. Keep the resolved dependency graph in `package-lock.json`.
- Gluestack v1 has missing direct accessibility imports, so declare ARIA focus, interactions,
  and overlays explicitly. Pin Legend Motion to 2.2.1 to avoid a second React Native tree;
  override its old React Aria checkbox dependency with React 18 compatible 3.17.1 releases.
  The complete installed peer graph passes `npm ls --all`. Use patched Vitest 3.2.6+
  and React Router 7.18.3+.
- Both Vite and its dependency optimizer prioritize web file extensions. SVG's asset registry
  resolves to React Native Web's registry; Expo's `__DEV__` flag follows the Vite mode.
  Vitest prebundles UI dependencies with the same aliases so tests do not load native Flow
  sources through Node. A Gluestack button/SVG runtime probe and a temporary dependency
  bundle verify this configuration; neither is a product screen.
- Token checks apply to `src/components/**` and run before the production build. Raw hex,
  pixel values, and numeric typography/spacing/radius/motion values are errors. Style and
  class props cannot cross Echo component boundaries, including statically known object
  spreads. Imported native/Gluestack primitives, DOM elements, and the shared Motion
  primitives may receive token-based internal styles. Untokenized copy and dynamic prop
  forwarding still require the constitutional code review.
- `config.environment.load_environment()` reads `backend/.env` by absolute file location;
  process variables take precedence. T011/T012 must call it in Django settings. Phase 1
  tests use minimal dedicated settings without loading real local secrets. When application
  settings arrive, import them in `tests/settings.py` and retain the database overrides.
- `pytest --sqlite-file` selects a new temporary database before pytest-django setup.
  Tests marked `sqlite_file` require this mode and transactional access. Normal tests use
  memory. Neither mode takes its database path from the local environment or demo file.
- No product UI is implemented in this phase. Browser acceptance remains open; lint,
  type checking, and setup probes do not establish visual or product acceptance.
- Retain the explicitly required Vite 5 and React 18 stack. Remaining dependency audit
  findings are recorded in `docs/setup-validation.md`; setup completion is not a claim of
  a clean security audit or production readiness.
