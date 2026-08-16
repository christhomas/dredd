# Dredd — HTTP API Testing Framework

[![Tests](https://github.com/antimatter-studios/dredd/actions/workflows/run-test.yml/badge.svg)](https://github.com/antimatter-studios/dredd/actions/workflows/run-test.yml)
[![End-to-end tests](https://github.com/antimatter-studios/dredd/actions/workflows/run-e2e-tests.yml/badge.svg)](https://github.com/antimatter-studios/dredd/actions/workflows/run-e2e-tests.yml)
[![node](https://img.shields.io/node/v/@antimatter-studios/dredd)](https://www.npmjs.com/package/@antimatter-studios/dredd)
[![license](https://img.shields.io/npm/l/@antimatter-studios/dredd)](LICENSE)

![Dredd - HTTP API Testing Framework](docs/_static/images/dredd.png?raw=true)

> **A maintained fork of [apiaryio/dredd][upstream], which was archived in
> November 2024.**

Dredd is a language-agnostic command-line tool for validating an API
description document against the backend that implements it. It reads your
description, sends each documented request, and checks that the response is the
one you promised.

```
npm install -g @antimatter-studios/dredd
dredd openapi.yml http://localhost:3000
```

- [Documentation][docs]
- [Changelog][changelog]
- [Contributor's Guidelines][contributing]

## Why this fork exists

The original was archived on 8 November 2024 and is read-only, with 260 open
issues frozen. So were the packages beneath it: `gavel.js`, which does the
validating, and `api-elements.js`, which does the parsing. The last release of
`dredd` on npm was 14.1.0.

Archived would not matter much on its own. What made a fork necessary is what
the archive locked in place.

**Dredd could not validate an OpenAPI 3.1 document at all.** Gavel pinned
`ajv@6`, whose newest supported dialect is draft-07. OpenAPI 3.1 is JSON Schema
2020-12. The two do not merely differ in features — they disagree about what
existing keywords *mean*:

| Keyword | draft-04 | 2020-12 |
| --- | --- | --- |
| `exclusiveMinimum` | a boolean modifying `minimum` | the bound itself |

So a perfectly valid 3.1 document carrying `exclusiveMinimum: 5` was rejected
outright — not weakly checked, but refused, with `Provided JSON Schema is not a
valid JSON Schema draftV4`. The document could not be tested.

Three more 2020-12 keywords were accepted and silently ignored, which is worse
than refusing them, because the run comes back green:

| Keyword | Before | Now |
| --- | --- | --- |
| `exclusiveMinimum` (numeric) | threw, taking the document with it | enforced |
| `prefixItems` | ignored — a body violating it passed | enforced |
| `dependentRequired` | ignored | enforced |
| `unevaluatedProperties` | ignored | enforced |

A description using `unevaluatedProperties` to say *no other fields* got a
passing run whatever the server actually sent back.

Fixing this was not a matter of a version bump. It meant migrating Gavel from
`ajv@6` to `ajv@8` — a major upgrade of a package that had not been released
since 2022 — and that is not something you can do to a repository you cannot
push to.

## What is different

**Validation runs on `ajv@8`.** The 2020-12 keywords above are enforced, and a
document written in OpenAPI 3.1 is validated as 3.1 rather than being read under
draft-04's rules.

**The dialect follows the document.** `openapi: 3.1.x` produces
`$schema: https://json-schema.org/draft/2020-12/schema`; a 3.0 document is
unchanged at draft-04. Getting this wrong in either direction changes what your
constraints mean.

**OpenAPI's own formats no longer break a run.** `int64`, `int32`, `byte` and
`binary` are OpenAPI formats rather than JSON Schema ones, and `ajv@6` threw on
any format it did not recognise. A Swagger 2 document using them reported
**error** — meaning the check never ran — where the correct outcome is a result,
pass or fail.

**One repository.** Dredd, its transaction compiler, Gavel and the API Elements
parsers are developed and released together — see [Packages](#packages).

**Error message wording is deliberately unchanged.** `ajv@7` reworded its
messages from "should …" to "must …". That text reaches you through Dredd's
report, so the original phrasing is preserved — upgrading should not rewrite
your test output.

## Everything else works as it did

This is a fork, not a rewrite. The [documentation][docs] still applies, hooks
still work, and your existing `dredd.yml` needs no changes.

### Supported API description formats

- [API Blueprint][]
- [OpenAPI 2][] (formerly Swagger)
- [OpenAPI 3][], including 3.1

### Supported hook languages

Hooks are the glue code for setup and teardown around each transaction:
[Go][], [Node.js][], [Perl][], [PHP][], [Python][], [Ruby][], [Rust][].

## Quick start

1.  Describe your API. If you are starting from nothing, the
    [API Blueprint tutorial][api blueprint tutorial] and the
    [ready-made examples][api blueprint examples] are the shortest way in;
    an OpenAPI document you already have works just as well.
2.  Answer a few questions to get a `dredd.yml`:

    ```shell
    dredd init
    ```

3.  Run it:

    ```shell
    dredd
    ```

The [full documentation][docs] covers hooks, reporters and CI.

## What this fork does not add

Worth being plain about, since a fork invites the question:

- **No stateful sequencing.** Dredd tests each transaction in isolation and does
  not act on OpenAPI 3 `links`. Chaining requests still means hooks and a shared
  variable, as [the documentation describes][workflows].
- **No generated inputs.** Dredd sends the example your description gives and
  nothing else. The 2020-12 keywords above are enforced against a *response*;
  they do not shape the request body Dredd sends.
- **No new hook languages.**

The goal here is a Dredd that works on the descriptions people write today, not
a different tool.

## Packages

Everything below is published from this repository and released together.
Upstream these were four separate repositories with interlocking version
constraints, which is a large part of why the `ajv` upgrade never happened
there: no single repository could make it.

| Package | Version | What it does | Replaces |
| --- | --- | --- | --- |
| [`@antimatter-studios/dredd`](packages/dredd) | [![npm](https://img.shields.io/npm/v/@antimatter-studios/dredd)](https://www.npmjs.com/package/@antimatter-studios/dredd) | the command itself | `dredd` |
| [`@antimatter-studios/dredd-transactions`](packages/dredd-transactions) | [![npm](https://img.shields.io/npm/v/@antimatter-studios/dredd-transactions)](https://www.npmjs.com/package/@antimatter-studios/dredd-transactions) | description → the transactions to test | `dredd-transactions` |
| [`@antimatter-studios/gavel`](packages/gavel) | [![npm](https://img.shields.io/npm/v/@antimatter-studios/gavel)](https://www.npmjs.com/package/@antimatter-studios/gavel) | whether a response matches what was promised | `gavel` |
| [`@antimatter-studios/api-elements`](packages/api-elements) | [![npm](https://img.shields.io/npm/v/@antimatter-studios/api-elements)](https://www.npmjs.com/package/@antimatter-studios/api-elements) | the element classes a description becomes | `api-elements` |
| [`@antimatter-studios/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@antimatter-studios/core)](https://www.npmjs.com/package/@antimatter-studios/core) | registers the parsers and serialisers, and dispatches to them | `@apielements/core` |
| [`@antimatter-studios/apib-parser`](packages/apib-parser) | [![npm](https://img.shields.io/npm/v/@antimatter-studios/apib-parser)](https://www.npmjs.com/package/@antimatter-studios/apib-parser) | API Blueprint | `@apielements/apib-parser` |
| [`@antimatter-studios/openapi2-parser`](packages/openapi2-parser) | [![npm](https://img.shields.io/npm/v/@antimatter-studios/openapi2-parser)](https://www.npmjs.com/package/@antimatter-studios/openapi2-parser) | OpenAPI 2 / Swagger | `@apielements/openapi2-parser` |
| [`@antimatter-studios/openapi3-parser`](packages/openapi3-parser) | [![npm](https://img.shields.io/npm/v/@antimatter-studios/openapi3-parser)](https://www.npmjs.com/package/@antimatter-studios/openapi3-parser) | OpenAPI 3, including 3.1 | `@apielements/openapi3-parser` |

The repository also holds the serialisers and the remaining parsers the above
depend on. They are not published separately.

## Credit

Dredd was built by [Apiary][] and its contributors over many years, and this
fork is their work with the rust knocked off. The [documentation][docs] is
theirs too, and remains the best explanation of how Dredd thinks.

## License

MIT, as upstream.

[upstream]: https://github.com/apiaryio/dredd
[docs]: https://dredd.org/en/latest/
[changelog]: https://github.com/antimatter-studios/dredd/releases
[contributing]: https://dredd.org/en/latest/contributing/
[workflows]: https://dredd.org/en/latest/how-to-guides.html#testing-api-workflows
[Apiary]: https://apiary.io/
[API Blueprint]: https://apiblueprint.org/
[api blueprint tutorial]: https://apiblueprint.org/documentation/tutorial.html
[api blueprint examples]: https://github.com/apiaryio/api-blueprint/tree/master/examples
[OpenAPI 2]: https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md
[OpenAPI 3]: https://spec.openapis.org/oas/latest.html
[Go]: https://dredd.org/en/latest/hooks/go.html
[Node.js]: https://dredd.org/en/latest/hooks/js.html
[Perl]: https://dredd.org/en/latest/hooks/perl.html
[PHP]: https://dredd.org/en/latest/hooks/php.html
[Python]: https://dredd.org/en/latest/hooks/python.html
[Ruby]: https://dredd.org/en/latest/hooks/ruby.html
[Rust]: https://dredd.org/en/latest/hooks/rust.html
