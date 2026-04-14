const hooks = require('hooks');

hooks.beforeEach = (hookFn) => {
  hooks.beforeAll((done) => {
    for (const transactionKey of Object.keys(hooks.transactions || {})) {
      const transaction = hooks.transactions[transactionKey];
      if (!hooks.beforeHooks[transaction.name]) {
        hooks.beforeHooks[transaction.name] = [];
      }
      hooks.beforeHooks[transaction.name].unshift(hookFn);
    }
    done();
  });
};

hooks.beforeEach((transaction) => {
  const paramToAdd = 'api-key=23456';
  if (transaction.fullPath.indexOf('?') > -1) {
    transaction.fullPath += '&' + paramToAdd;
  } else {
    transaction.fullPath += '?' + paramToAdd;
  }
});
