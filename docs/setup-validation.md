# Phase 1 setup validation

**Date:** 2026-09-08. **Scope:** T001-T006, constitution 4.1.0.
**Environment:** macOS arm64, Python 3.12.11, Django 5.2.17, Node 24.19.0, npm 11.17.0,
React 18.3.1, React Native Web 0.19.13, Vite 5.4.21, Vitest 3.2.7.

## Observed checks

| Check | Observed result |
|---|---|
| Git initialization | Repository initialized locally. |
| Backend installation | Editable installation including dev extras succeeded under Python 3.12. |
| Frontend installation | Dependencies installed and locked; `npm ls --all --json` exits successfully without invalid peers. |
| Ignore rules | Twelve private/generated path probes ignored; both `.env.example` files and both manifest/lockfile probes remain trackable. |
| Ruff lint and formatting | Passed, six Python files. |
| Default pytest | Four passed, one file-only test intentionally skipped. Database confirmed in memory; JSON1 available. |
| `pytest --sqlite-file` | Five passed. Temporary file confirmed outside backend; separate connection reads committed rows, contends with an active writer, and succeeds after rollback. |
| Environment tests | Explicit backend file loads from another working directory; process values take precedence; absent secrets have no fallback. |
| `npm run check:setup` | Passed: ESLint, TypeScript, 30 tests, and temporary production dependency bundle. |
| Token rules | 28 cases use the actual ESLint config: invalid literals, variant boundaries, known spreads, and allowed primitive internals. |
| Web runtime | Two jsdom tests render React Native Web and Gluestack with a native SVG icon. |
| Dependency bundle | Vite transformed 3,799 modules successfully; temporary entry and output removed afterward. This is not the product build. |

Repeatable commands are in [local development](local-development.md#phase-1-setup).
Database conventions are in [testing](testing.md#setup-tests-and-database-modes).

## Failures corrected and retested

- The first file-backed probe still used memory because replacing Django's settings
  dictionary left its cached connection unchanged. Updating it in place while preserving
  nested test defaults fixed both tests. File mode now passes all five tests. The independent
  connection also requires an existing absolute file path to prevent stray database files.
- Declaring Gluestack's missing ARIA modules, pinning its animation dependency, and updating
  its React Aria checkbox dependency fixed resolution and peer conflicts. The full installed
  dependency graph now validates.
- Native SVG and Expo required the web asset registry, web file precedence in both resolvers,
  and the development flag. Vitest needed prebundling to respect aliases inside dependencies.
  Runtime tests and the dependency bundle now pass.
- The initially selected Vitest 2 had a critical advisory. Installed Vitest 3.2.7 is beyond
  its patched threshold. React Router was also moved to a compatible patched release.

## Remaining dependency advisories

Update, 2026-09-08: the latest audit reports 10 affected packages (7 high, 3 moderate),
including Vitest and its mocker. The user deferred upgrades and bundle optimization while
functional testing passes. These findings are recorded risks, not fixed vulnerabilities,
and are non-blocking for Phase 2 functional work. See the
[scope decision](../DECISIONS.md#phase-2-verification-scope-and-deferred-warnings-2026-09-08).
The original baseline findings below are retained as historical evidence.


The final npm audit reports **eight findings: seven high, one moderate, zero critical**.
Several entries propagate the same underlying flaw through a dependency chain. This audit
is not passed.

- Vite 5 is explicit in T003. Its findings include
  [optimized-dependency path traversal](https://github.com/advisories/GHSA-4w7w-66w2-5vf9),
  [Windows editor path handling](https://github.com/advisories/GHSA-v6wh-96g9-6wx3), and
  [Windows file-deny bypass](https://github.com/advisories/GHSA-fx2h-pf6j-xcff).
  Its esbuild dependency has a
  [development-server origin advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
  Vite binds to localhost and requires port 3000; this does not establish that loopback
  eliminates the findings. A patched Vite major requires reconciling T003.
- The React Native peer package brings Metro and image-size. The
  [ICNS parser](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) and
  [JXL/HEIF parser](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) findings propagate
  through Metro, metro-config, metro-transform-worker, the native CLI plugin, and React
  Native. This project uses Vite and React Native Web; no Metro server was started.
  npm's suggested React Native upgrade changes the selected compatibility baseline.

See [implementation decisions](../DECISIONS.md) for the selected versions and configuration.

## Acceptance limits

Phase 1 contains infrastructure only. Application entry points, Django server settings/routes,
models, migrations, and seeds are later tasks. The complete `npm run build`, Django app checks,
product API tests, and browser QA were not run. No product screen was visited, and no
screenshots or browser report were created. The
[acceptance checklist](../planning/acceptance-checklist.md) remains open. No demo accounts,
real environment secrets, or database snapshots were created.

Tooling references: [pytest-django database fixtures](https://pytest-django.readthedocs.io/en/latest/database.html)
and [Vitest dependency optimization](https://v3.vitest.dev/config/#deps-optimizer).
