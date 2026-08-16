# @antimatter-studios/dredd

## 16.2.0

### Minor Changes

- Declare the dialect an OpenAPI 3.1 schema is written in.

  A converted schema always announced draft-04, which is right for OpenAPI 3.0 and wrong for
  3.1, whose Schema Object is JSON Schema 2020-12. A 3.1 document writing `exclusiveMinimum` as
  the bound itself - which that version permits - produced a schema the validator refused
  outright, so the check never ran. The version the document declares now decides the dialect,
  and a 3.0 document is unchanged.

  Validation moves to ajv 8, which is what makes the above safe: ajv 6 could not compile the
  2020-12 dialect at all. `prefixItems`, `dependentRequired` and `unevaluatedProperties` are
  enforced rather than passed over in silence, and a schema using OpenAPI's own formats -
  `int64`, `int32`, `byte` - no longer stops the check, which it did for any Swagger 2 document
  that used them.

### Patch Changes

- Updated dependencies
  - @antimatter-studios/dredd-transactions@12.2.0

## 16.1.0

### Minor Changes

- da73f22: Bring the dependencies up to date.

  `uri-template` moves from 1.0.1 to 2.0.0. Expanded URIs are unchanged — including the
  quirks projects already depend on, such as percent-encoding a newline as `%A` rather than
  `%0A`, and escaping an already-escaped `%20` again — which was checked case by case against
  the old version before taking the upgrade. Two things do change, both only for a template
  that fails to parse: the wording of the `Failed to parse URI template` diagnostic now comes
  from the new parser, and `{}`, an expression with no variable in it, is reported as a parse
  error where it used to be accepted and ignored.

  TypeScript moves to 7, eslint to 10, and the remaining development dependencies to their
  current releases. `gavel` stays at 9 deliberately: 10.0.4 is published with its `main`
  pointing at a directory its `files` list never ships, so requiring it throws, and its
  validation results are identical to 9's anyway.

### Patch Changes

- Updated dependencies [da73f22]
  - @antimatter-studios/dredd-transactions@12.1.0

## 16.0.1

### Patch Changes

- 5dea60b: Honour an option set in the configuration file.

  Dredd merged every argument yargs reported over the configuration it had just loaded,
  and yargs reports a value for every option it knows about, so an option the user never
  typed replaced what `dredd.yml` said with its own default. `hookfiles: ./hooks.js` in a
  configuration file loaded no hooks at all, and passing `--hookfiles` on the command line
  was the only way to be heard. Only the arguments actually given on the command line now
  take precedence.

## 16.0.0

### Major Changes

- Ship both packages as ES modules.

  Dredd is now an ES module and requires Node 20.19 or newer. Import it with
  `import Dredd from '@antimatter-studios/dredd'`; a CommonJS project on a supported
  Node version can still `require()` it, reaching the class through `.default`.

  Hook files are unaffected: CommonJS hook files keep working, which is what almost
  every project writes.

  Two bugs that the conversion exposed are fixed along the way: the package entry
  point exported through `module.exports` and so offered no default export to an
  importer, and `--require` called an undefined `require`.

### Patch Changes

- cfb3bcd: Accept null for a nullable reference in a response body.

  The OpenAPI 3 parser described a nullable reference as an object, so a response sending null
  for it was rejected even though the specification permits it. Dependencies are also brought
  up to date, except those that are ESM-only at their latest release.

- Updated dependencies
- Updated dependencies [cfb3bcd]
  - @antimatter-studios/dredd-transactions@12.0.0

## 15.1.1

### Patch Changes

- Accept null for a nullable reference in a response body.

  The OpenAPI 3 parser described a nullable reference as an object, so a response sending null
  for it was rejected even though the specification permits it. Dependencies are also brought
  up to date, except those that are ESM-only at their latest release.

- Updated dependencies
  - @antimatter-studios/dredd-transactions@11.1.1

## 15.1.0

### Minor Changes

- Validate response bodies against the schema the API description declares.

  The OpenAPI 3 parser now generates a JSON Schema for message bodies, so a response is checked
  against what the document says rather than against an example in which every key reads as
  required. An optional property is finally describable: absent it passes, present it is
  type-checked, and a nullable one may be null.

  Suites that pass today can start failing where a response disagrees with its declared schema.
  That is the point of the change, but it arrives looking like new failures.

### Patch Changes

- Updated dependencies
  - @antimatter-studios/dredd-transactions@11.1.0

## 15.0.9

### Patch Changes

- Fix all lint errors, add pre-commit hook, revert publish workflow to cd pattern
- Updated dependencies
  - @antimatter-studios/dredd-transactions@11.0.9

## 15.0.8

### Patch Changes

- Use npm publish --workspace from root for OIDC token acquisition
- Updated dependencies
  - @antimatter-studios/dredd-transactions@11.0.8

## 15.0.7

### Patch Changes

- Publish dredd-transactions first, then dredd (dependency order)
- Updated dependencies
  - @antimatter-studios/dredd-transactions@11.0.7

## 15.0.6

### Patch Changes

- Retry publish now that trusted publisher is configured for dredd-transactions
- Updated dependencies
  - @antimatter-studios/dredd-transactions@11.0.6

## 15.0.5

### Patch Changes

- Remove registry-url from setup-node to allow OIDC auth instead of placeholder token
- Updated dependencies
  - @antimatter-studios/dredd-transactions@11.0.5

## 15.0.4

### Patch Changes

- Use npm publish --workspaces directly and add npm version verification
- Updated dependencies
  - @antimatter-studios/dredd-transactions@11.0.4

## 15.0.3

### Patch Changes

- Fix npm self-upgrade corruption by installing to prefix path
- Updated dependencies
  - @antimatter-studios/dredd-transactions@11.0.3

## 15.0.2

### Patch Changes

- Upgrade npm to 11.5.1+ in publish workflow for OIDC trusted publishing support
- Updated dependencies
  - @antimatter-studios/dredd-transactions@11.0.2

## 15.0.1

### Patch Changes

- Fix malformed author field and publish workflow
- Updated dependencies
  - @antimatter-studios/dredd-transactions@11.0.1

## 15.0.0

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

### Patch Changes

- Updated dependencies [1550f6d]
  - @antimatter-studios/dredd-transactions@11.0.0

## 14.2.0

### Minor Changes

- 116f906: Modernize tooling and replace deprecated dependencies

  - Replace optimist with yargs for CLI argument parsing
  - Replace deprecated request library with built-in Node http/https
  - Upgrade winston from 2.x to 3.x
  - Migrate from lerna+yarn to npm workspaces+changesets
  - Add nyc code coverage tooling
  - Update CI to Node 18/20 with OIDC trusted publishing

### Patch Changes

- Updated dependencies [116f906]
  - @antimatter-studios/dredd-transactions@10.2.0
