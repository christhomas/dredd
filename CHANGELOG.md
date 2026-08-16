# Changelog

All notable changes to this fork of Dredd are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This is the repo-level changelog, narrating the fork's history. For the
per-package, per-release detail (auto-maintained by
[changesets](https://github.com/changesets/changesets)), see:

- [`packages/dredd/CHANGELOG.md`](packages/dredd/CHANGELOG.md)
- [`packages/dredd-transactions/CHANGELOG.md`](packages/dredd-transactions/CHANGELOG.md)

Versions below track the `@antimatter-studios/dredd` package
(`@antimatter-studios/dredd-transactions` is released in lockstep with its
own major offset — `dredd` 15.x ↔ `dredd-transactions` 11.x).

---

## [Unreleased]

### Fixed
- Pin `sphinxcontrib-*` transitive deps to keep Sphinx 4 working.
- Remove dead Travis CI badge from Perl hooks docs.
- Drop `user-content-` prefix from OpenAPI spec anchors in docs.
- Skip linkcheck for OpenAPI spec anchors.
- Update json-schema.org enum reference to current URL.
- Unbreak test, e2e, docs pipelines and `lint-staged` TypeScript parsing.
- Point self-referencing docs links at the `christhomas/dredd` fork.

---

## [15.0.11] — 2026-04-20
## [15.0.10] — 2026-04-20
## [15.0.8] — 2026-04-20
## [15.0.7] — 2026-04-20
## [15.0.6] — 2026-04-20
## [15.0.5] — 2026-04-20
## [15.0.4] — 2026-04-20
## [15.0.3] — 2026-04-20
## [15.0.2] — 2026-04-20

### Fixed
- Publish-workflow iteration for npm OIDC trusted publishing (retries, split
  per-package publish, `npm publish --workspace` from the root, `npm`
  self-upgrade corruption fix, registry-url removal, dependency-ordered
  publishing of `dredd-transactions` before `dredd`).
- Dropped macOS from all CI workflows.
- Fixed pre-commit lint errors in `dredd-transactions` test files.

> These releases are all publish-pipeline shake-out for v15.0; no runtime
> changes landed between 15.0.2 and 15.0.11.

---

## [15.0.1] — 2026-04-15

### Fixed
- Malformed `author` field in `package.json`.
- Stale dependencies removed.
- Publish workflow hardened.

---

## [15.0.0] — 2026-04-15 — **Major modernisation release**

The culmination of the April 2026 modernisation sprint (started
[`c5822a62`](https://github.com/christhomas/dredd/commit/c5822a62),
2026-04-14). The public CLI, `dredd.yml`, and hook interfaces are
unchanged, but the runtime target and package name have moved.

### Breaking
- **Drop Node 10/12/14 support — require Node 18+.**
- Remove **Apiary reporter** (`--reporter=apiary`); Apiary service shut down.
- Remove **CoffeeScript hook support** — use JavaScript hooks instead.
- Remove **HTTP proxy auto-detection** — `HTTP_PROXY` env var no longer
  auto-routes requests through a proxy.
- Package renamed on npm: `dredd` → `@antimatter-studios/dredd`
  (`dredd-transactions` → `@antimatter-studios/dredd-transactions`).

### Added
- **Full TypeScript codebase** (42 `.ts` files, 0 `.js` in `lib/`).
- **Async/await** throughout the core execution chain
  (`Dredd`, `TransactionRunner`, `addHooks`, `performRequest`, leaf utils).
- **`nyc` code coverage** tooling + `test:coverage` scripts for both
  packages.
- **OIDC trusted publishing** via GitHub Actions.
- CI matrix on **Node 18 / 20** with modern GitHub Actions versions.

### Changed
- Replaced `optimist` with **`yargs`** (CLI argument parsing).
- Replaced deprecated **`request`** library with built-in Node
  `http`/`https`.
- Upgraded **`winston`** from 2.x to 3.x (new event API, correct stderr
  routing in the CLI subprocess).
- Replaced **`Ramda`** with vanilla JavaScript (config handling rewritten).
- Updated `js-yaml` to the new API.
- Migrated the monorepo from **lerna + yarn** to **npm workspaces +
  changesets**.
- Regenerated SSL test certificates (2048-bit).
- Re-enabled ESLint rules and fixed all violations.

### Removed
- `async` npm package (replaced with native `async`/`await`).
- **CoffeeScript** source files and build step.
- `lerna`, `yarn` tooling.
- `ApiaryReporter` and other Apiary-specific dead code paths.
- Obsolete proxy tests.

### Fixed
- `HooksWorkerClient` no longer crashes Mocha with uncaught exceptions.
- Test title now included in pass/fail reporter output.
- `yargs` boolean flag regressions resolved (all CLI flags typed).
- Port-conflict flakes resolved across the unit and CLI test suites.
- OpenAPI 2 logging, sanitisation, and CLI reporter issues.
- `recordLogging` helper updated for winston v3 event API.
- Hook-handler port conflicts.

### Stats
- Test suite: **1277 passing** (was 866), **23 failing** (was 211).

---

## [14.2.0] — 2026-04-14

### Changed
- Modernise tooling and replace deprecated dependencies:
  - Replace `optimist` with `yargs`.
  - Replace `request` with built-in Node `http`/`https`.
  - Upgrade `winston` 2.x → 3.x.
  - Migrate from `lerna + yarn` to `npm workspaces + changesets`.
- Add `nyc` code coverage tooling.
- Update CI to Node 18/20 with OIDC trusted publishing.

### Added
- `type: commonjs` for Node 20 compatibility.
- `ts-node` 8 → 10.
- Unit tests filling coverage gaps.
- Auto-publish on version tag push.

---

## Prior history

For releases before this fork (originating from
[`apiaryio/dredd`](https://github.com/apiaryio/dredd)), consult the
[upstream GitHub Releases](https://github.com/apiaryio/dredd/releases).

[Unreleased]: https://github.com/christhomas/dredd/compare/v15.0.11...HEAD
[15.0.11]: https://github.com/christhomas/dredd/releases/tag/v15.0.11
[15.0.10]: https://github.com/christhomas/dredd/releases/tag/v15.0.10
[15.0.8]: https://github.com/christhomas/dredd/releases/tag/v15.0.8
[15.0.7]: https://github.com/christhomas/dredd/releases/tag/v15.0.7
[15.0.6]: https://github.com/christhomas/dredd/releases/tag/v15.0.6
[15.0.5]: https://github.com/christhomas/dredd/releases/tag/v15.0.5
[15.0.4]: https://github.com/christhomas/dredd/releases/tag/v15.0.4
[15.0.3]: https://github.com/christhomas/dredd/releases/tag/v15.0.3
[15.0.2]: https://github.com/christhomas/dredd/releases/tag/v15.0.2
[15.0.1]: https://github.com/christhomas/dredd/releases/tag/v15.0.1
[15.0.0]: https://github.com/christhomas/dredd/releases/tag/v15.0.0
[14.2.0]: https://github.com/christhomas/dredd/releases/tag/v14.2.0
