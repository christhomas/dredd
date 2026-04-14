const { assert } = require('chai');
const { assert: chaiAssert } = require('chai');
const { fixtures } = require('../../support');
const compile = require('../../../compile');


describe('compileURI()', () => {
  // compileURI is an internal module that requires complex fury/minim element
  // objects as input (with parents, href, attributes, hrefVariables). Rather
  // than mocking the full element protocol, we test it through the compile()
  // entry point using fixtures, which exercises all compileURI code paths.

  describe('simple URI compilation', () => {
    fixtures('ordinary').forEachDescribe(({ mediaType, apiElements }) => {
      const result = compile(mediaType, apiElements, 'test.ext');

      it('produces transactions with valid URIs', () => {
        assert.isAbove(result.transactions.length, 0);
        result.transactions.forEach((transaction) => {
          assert.isString(transaction.request.uri);
          assert.isAbove(transaction.request.uri.length, 0);
        });
      });

      it('URIs start with /', () => {
        result.transactions.forEach((transaction) => {
          assert.match(transaction.request.uri, /^\//);
        });
      });
    });
  });

  describe('URI with parameters', () => {
    fixtures('example-parameters').forEachDescribe(({ mediaType, apiElements }) => {
      const result = compile(mediaType, apiElements, 'test.ext');

      it('expands URI template parameters', () => {
        assert.isAbove(result.transactions.length, 0);
        result.transactions.forEach((transaction) => {
          // Expanded URIs should not contain curly braces
          assert.notMatch(transaction.request.uri, /\{.*\}/);
        });
      });
    });
  });

  describe('URI with parameter inheritance', () => {
    fixtures('parameters-inheritance').forEachDescribe(({ mediaType, apiElements }) => {
      const result = compile(mediaType, apiElements, 'test.ext');

      it('produces transactions', () => {
        assert.isAbove(result.transactions.length, 0);
      });

      it('inherits parameters and produces valid URIs', () => {
        result.transactions.forEach((transaction) => {
          assert.isString(transaction.request.uri);
          assert.notMatch(transaction.request.uri, /\{.*\}/);
        });
      });
    });
  });

  describe('URI expansion errors', () => {
    fixtures('uri-expansion-annotation').forEachDescribe(({ mediaType, apiElements }) => {
      const result = compile(mediaType, apiElements, 'test.ext');

      it('produces annotations for URI expansion issues', () => {
        assert.isAbove(result.annotations.length, 0);
      });

      it('annotations from URI expansion have the correct component', () => {
        const uriAnnotations = result.annotations.filter(
          a => a.component === 'uriTemplateExpansion'
        );
        assert.isAbove(uriAnnotations.length, 0);
      });
    });
  });

  describe('URI with enum parameters', () => {
    fixtures('enum-parameter').forEachDescribe(({ mediaType, apiElements }) => {
      const result = compile(mediaType, apiElements, 'test.ext');

      it('produces transactions with expanded URIs', () => {
        assert.isAbove(result.transactions.length, 0);
        result.transactions.forEach((transaction) => {
          assert.isString(transaction.request.uri);
        });
      });
    });
  });
});
