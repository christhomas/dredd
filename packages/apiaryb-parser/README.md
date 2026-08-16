# API Elements: Apiary Blueprint Parser

[![NPM version](https://img.shields.io/npm/v/@antimatter-studios/apiaryb-parser.svg)](https://www.npmjs.org/package/@antimatter-studios/apiaryb-parser)
[![License](https://img.shields.io/npm/l/@antimatter-studios/apiaryb-parser.svg)](https://www.npmjs.org/package/@antimatter-studios/apiaryb-parser)

This adapter provides support for parsing the deprecated [Apiary
Blueprint](https://github.com/apiaryio/blueprint-parser) format in
[Fury.js](https://github.com/apiaryio/api-elements.js/tree/master/packages/fury). *We do not recommend using this
adapter in any new development, it's only used for backwards compatibility with
the legacy format.

## Installation

```shell
$ npm install @antimatter-studios/apiaryb-parser
```

## Usage

```javascript
import fury from 'fury';
import apiaryBlueprintAdapter from '@antimatter-studios/apiaryb-parser';

fury.use(apiaryBlueprintAdapter);

fury.parse({source: '--- Your Legacy Apiary Blueprint'}, (err, result) => {
  if (err) {
    console.log(err);
    return;
  }

  // The returned `result` is a Minim parse result element.
  console.log(result.api.title);
});
```

## Regenerating the parser

`lib/apiary-blueprint-parser.js` is generated from `lib/apiary-blueprint-parser.pegjs` and
committed, so neither installing nor testing this package needs the generator. After changing
the grammar, regenerate it deliberately:

```
npx pegjs@git+https://github.com/dmajda/pegjs.git#02af83f9b416778878e52e2cbbc22d96e312164e \
  lib/apiary-blueprint-parser.pegjs lib/apiary-blueprint-parser.js
```

That commit is the version the parser in this repository was built with.
