import fury from '@apielements/core';
import adapter0 from '@apielements/apib-parser';
import adapter1 from '@apielements/openapi2-parser';
import adapter2 from '@antimatter-studios/openapi3-parser';

fury.use(adapter0);
fury.use(adapter1);
fury.use(adapter2);

const { Annotation, SourceMap, ParseResult } = fury.minim.elements;

function createAnnotation(type, message) {
  const element = new Annotation(message);
  element.classes.push(type);
  element.attributes.set('sourceMap', [
    new SourceMap([[0, 1]]),
  ]);
  return element;
}

function detectMediaType(apiDescription) {
  const adapters = fury.detect(apiDescription);
  if (adapters.length) {
    return { mediaType: adapters[0].mediaTypes[0], fallback: false };
  }
  return { mediaType: 'text/vnd.apiblueprint', fallback: true };
}

function parse(apiDescription, callback) {
  const { mediaType, fallback } = detectMediaType(apiDescription);

  fury.parse({
    source: apiDescription,
    mediaType,
    generateSourceMap: true,
  }, (err, parseResult) => {
    const apiElements = parseResult || new ParseResult([]);

    if (fallback) {
      apiElements.unshift(createAnnotation('warning', (
        'Could not recognize API description format, assuming API Blueprint'
      )));
    }
    if (err && !parseResult) {
      // The condition should be only 'if (err)'
      // https://github.com/apiaryio/api-elements.js/issues/167
      apiElements.unshift(createAnnotation('error', (
        `Could not parse API description: ${err.message}`
      )));
    }

    callback(null, { mediaType, apiElements });
  });
}

export default parse;
