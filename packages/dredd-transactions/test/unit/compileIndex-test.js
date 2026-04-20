const { assert, fixtures } = require('../support');
const compile = require('../../compile');

describe('compile() entry point', () => {
  describe('return structure', () => {
    fixtures('ordinary').forEachDescribe(({ mediaType, apiElements }) => {
      const result = compile(mediaType, apiElements, 'test.apib');

      it('returns an object with mediaType, transactions, and annotations', () => {
        assert.property(result, 'mediaType');
        assert.property(result, 'transactions');
        assert.property(result, 'annotations');
      });

      it('returns the same mediaType as the input', () => {
        assert.strictEqual(result.mediaType, mediaType);
      });

      it('returns transactions as an array', () => {
        assert.isArray(result.transactions);
      });

      it('returns annotations as an array', () => {
        assert.isArray(result.annotations);
      });
    });
  });

  describe('with ordinary API description', () => {
    fixtures('ordinary').forEachDescribe(({ mediaType, apiElements }) => {
      const result = compile(mediaType, apiElements, 'ordinary.ext');

      it('produces at least one transaction', () => {
        assert.isAbove(result.transactions.length, 0);
      });

      it('each transaction has request and response', () => {
        result.transactions.forEach((transaction) => {
          assert.property(transaction, 'request');
          assert.property(transaction, 'response');
        });
      });

      it('each transaction has a name', () => {
        result.transactions.forEach((transaction) => {
          assert.property(transaction, 'name');
          assert.isString(transaction.name);
          assert.isAbove(transaction.name.length, 0);
        });
      });

      it('each transaction has an origin', () => {
        result.transactions.forEach((transaction) => {
          assert.property(transaction, 'origin');
          assert.property(transaction.origin, 'filename');
          assert.property(transaction.origin, 'apiName');
          assert.property(transaction.origin, 'resourceName');
          assert.property(transaction.origin, 'actionName');
        });
      });

      it('sets filename in origin', () => {
        result.transactions.forEach((transaction) => {
          assert.strictEqual(transaction.origin.filename, 'ordinary.ext');
        });
      });

      it('each request has method, uri, and headers', () => {
        result.transactions.forEach((transaction) => {
          assert.property(transaction.request, 'method');
          assert.property(transaction.request, 'uri');
          assert.property(transaction.request, 'headers');
          assert.isString(transaction.request.method);
          assert.isString(transaction.request.uri);
          assert.isArray(transaction.request.headers);
        });
      });

      it('each response has status and headers', () => {
        result.transactions.forEach((transaction) => {
          assert.property(transaction.response, 'status');
          assert.property(transaction.response, 'headers');
          assert.isString(transaction.response.status);
          assert.isArray(transaction.response.headers);
        });
      });
    });
  });

  describe('with no filename', () => {
    fixtures('ordinary').forEachDescribe(({ mediaType, apiElements }) => {
      const result = compile(mediaType, apiElements);

      it('sets empty string as filename in origin', () => {
        result.transactions.forEach((transaction) => {
          assert.strictEqual(transaction.origin.filename, '');
        });
      });
    });
  });

  describe('with parser errors in API description', () => {
    fixtures('parser-error').forEachDescribe(({ mediaType, apiElements }) => {
      const result = compile(mediaType, apiElements);

      it('produces annotations', () => {
        assert.isAbove(result.annotations.length, 0);
      });

      it('produces no transactions', () => {
        assert.lengthOf(result.transactions, 0);
      });

      it('annotations have error type', () => {
        const errorAnnotations = result.annotations.filter((a) => a.type === 'error');
        assert.isAbove(errorAnnotations.length, 0);
      });
    });
  });

  describe('with no body in response', () => {
    fixtures('no-body').forEachDescribe(({ mediaType, apiElements }) => {
      const result = compile(mediaType, apiElements);

      it('produces transactions', () => {
        assert.isAbove(result.transactions.length, 0);
      });

      it('response has no body property', () => {
        result.transactions.forEach((transaction) => {
          assert.notProperty(transaction.response, 'body');
        });
      });
    });
  });

  describe('with multiple transaction examples (API Blueprint)', () => {
    const fixture = fixtures('multiple-transaction-examples');
    const apibFixture = fixture.find((f) => f.format === 'apib');

    if (apibFixture) {
      const result = compile(apibFixture.mediaType, apibFixture.apiElements, 'multi.apib');

      it('produces multiple transactions', () => {
        assert.isAbove(result.transactions.length, 1);
      });
    }
  });
});
