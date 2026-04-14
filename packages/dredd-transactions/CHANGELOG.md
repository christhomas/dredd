# @antimatter-studios/dredd-transactions

## 11.0.0

### Major Changes

- 1550f6d: Major modernization release

  Breaking changes:

  - Remove Apiary reporter (--reporter=apiary no longer supported, Apiary is shut down)
  - Remove CoffeeScript hook support (use JavaScript hooks instead)
  - Remove HTTP proxy auto-detection (HTTP_PROXY env var no longer routes requests through proxy)
  - Drop Node 10/12/14 support, require Node 18+

  New features:

  - Full TypeScript codebase (42 .ts files, 0 .js)
  - Async/await throughout core execution chain
  - OIDC trusted publishing via GitHub Actions
  - nyc code coverage tooling

  Dependency modernization:

  - Replace optimist with yargs (CLI argument parsing)
  - Replace deprecated request library with built-in Node http/https
  - Upgrade winston from 2.x to 3.x
  - Replace Ramda with vanilla JavaScript
  - Remove async npm package (native async/await)
  - Remove CoffeeScript, lerna, yarn dependencies
  - Migrate to npm workspaces + changesets

  Infrastructure:

  - CI updated to Node 18/20 with modern GitHub Actions
  - Automated npm publishing via OIDC trusted publishers
  - SSL test certificates regenerated (2048-bit)
  - ESLint rules re-enabled, violations fixed
  - Test suite: 1277 passing (was 866), 23 failing (was 211)

## 10.2.0

### Minor Changes

- 116f906: Modernize tooling and replace deprecated dependencies

  - Replace optimist with yargs for CLI argument parsing
  - Replace deprecated request library with built-in Node http/https
  - Upgrade winston from 2.x to 3.x
  - Migrate from lerna+yarn to npm workspaces+changesets
  - Add nyc code coverage tooling
  - Update CI to Node 18/20 with OIDC trusted publishing
