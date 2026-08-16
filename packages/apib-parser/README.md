# API Elements: API Blueprint Parser

[![NPM version](https://img.shields.io/npm/v/@antimatter-studios/apib-parser.svg)](https://www.npmjs.org/package/@antimatter-studios/apib-parser)
[![License](https://img.shields.io/npm/l/@antimatter-studios/apib-parser.svg)](https://www.npmjs.org/package/@antimatter-studios/apib-parser)

This adapter provides support for parsing [API Blueprint](https://apiblueprint.org/) in [Fury.js](https://github.com/antimatter-studios/dredd/tree/master/packages/fury) using the Node API Blueprint parser [Drafter NPM](https://github.com/apiaryio/drafter-npm).

## Install

```sh
$ npm install @antimatter-studios/apib-parser
```

## Usage

```js
import fury from 'fury';
import apibParser from '@antimatter-studios/apib-parser';

fury.use(apibParser);

fury.parse({source: '... your API Blueprint ...'}, (err, result) => {
  if (err) {
    console.log(err);
    return;
  }

  // The returned `result` is a Minim parse result element.
  console.log(result.api.title);
});
```
