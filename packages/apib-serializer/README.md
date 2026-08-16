# API Elements: API Blueprint Serializer

[![NPM version](https://img.shields.io/npm/v/@antimatter-studios/apib-serializer.svg)](https://www.npmjs.org/package/@antimatter-studios/apib-serializer)
[![License](https://img.shields.io/npm/l/@antimatter-studios/apib-serializer.svg)](https://www.npmjs.org/package/@antimatter-studios/apib-serializer)

This adapter provides support for serializing [API Blueprint](https://apiblueprint.org/) in [Fury.js](https://github.com/antimatter-studios/dredd/tree/master/packages/fury) from refract elements.

## Install

```sh
$ npm install @antimatter-studios/apib-serializer
```

## Usage

### Async

```js
import fury from 'fury';
import apibSerializer from '@antimatter-studios/apib-serializer';

fury.use(apibSerializer);

// Assume `api` is a Minim element instance, e.g. from `fury.parse(...)`
fury.serialize({ api }, (err, content) => {
  fs.write('serialized.apib', content, 'utf8');
});
```

### Sync

```js
import fury from 'fury';
import apibSerializer from '@antimatter-studios/apib-serializer';

fury.use(apibSerializer);

try {
  // Assume `api` is a Minim element instance, e.g. from `fury.parse(...)`
  const content = fury.serializeSync({ api });
  fs.write('serialized.apib', content, 'utf8');
} catch (error) {
  console.log(error);
}
```
