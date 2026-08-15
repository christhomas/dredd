import * as R from 'ramda';
import { expect } from 'chai';
import sortTransactions from '../../build/sortTransactions.js';
import { HTTPMethod } from '../../build/general.js';

const createTransaction = (transaction) => {
  return R.mergeDeepRight({
    protocol: 'http:',
    host: 'localhost',
  })(transaction);
};

const transactions = Object.keys(HTTPMethod).reduce((acc, method) => {
  return R.assoc(
    method,
    createTransaction({
      request: {
        url: '/endpoint',
        method,
      },
    }),
    acc,
  );
}, {});

describe('sortTransactions', () => {
  describe('given transactions list in arbitrary order', () => {
    const sorted = sortTransactions([
      transactions.GET,
      transactions.TRACE,
      transactions.OPTIONS,
      transactions.HEAD,
      transactions.LINK,
      transactions.DELETE,
      transactions.POST,
      transactions.PATCH,
      transactions.PUT,
      transactions.UNLINK,
      transactions.CONNECT,
    ]);

    it('should return transactions list sorted', () => {
      expect(sorted).to.deep.equal([
        transactions.CONNECT,
        transactions.OPTIONS,
        transactions.POST,
        transactions.GET,
        transactions.HEAD,
        transactions.PUT,
        transactions.PATCH,
        transactions.LINK,
        transactions.UNLINK,
        transactions.DELETE,
        transactions.TRACE,
      ]);
    });
  });

  describe('given multiple transactions with the same method', () => {
    const getOne = createTransaction({
      id: 'one',
      request: {
        method: HTTPMethod.GET,
        url: '/endpoint',
      },
    });

    const getTwo = createTransaction({
      id: 'two',
      request: {
        method: HTTPMethod.GET,
        url: '/endpoint',
      },
    });

    // This doesn't assert the identity of transactions.
    const sorted = sortTransactions([getOne, getTwo]);

    it('should sort transactions by occurence (asc)', () => {
      expect(sorted).to.deep.equal([getOne, getTwo]);
    });
  });

  describe('given transactions list sorted properly', () => {
    const transactionsList = [
      transactions.CONNECT,
      transactions.OPTIONS,
      transactions.POST,
      transactions.POST,
      transactions.GET,
      transactions.HEAD,
      transactions.PUT,
      transactions.PATCH,
      transactions.LINK,
      transactions.UNLINK,
      transactions.DELETE,
      transactions.TRACE,
    ];
    const sorted = sortTransactions(transactionsList);

    it('should return transactions list as-is', () => {
      expect(sorted).to.deep.equal(transactionsList);
    });
  });
});
