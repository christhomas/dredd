const hooks = require('hooks');

const { before } = hooks;
const { after } = hooks;

after(' > Machines collection > Get Machines', (transaction) => {
  transaction.fail = 'failed in sandboxed hook';
});

before(' > Machines collection > Get Machines', (transaction) => {
  transaction.fail = 'failed in sandboxed hook';
});
