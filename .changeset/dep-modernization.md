---
"@antimatter-studios/dredd": minor
"@antimatter-studios/dredd-transactions": minor
---

Modernize tooling and replace deprecated dependencies

- Replace optimist with yargs for CLI argument parsing
- Replace deprecated request library with built-in Node http/https
- Upgrade winston from 2.x to 3.x
- Migrate from lerna+yarn to npm workspaces+changesets
- Add nyc code coverage tooling
- Update CI to Node 18/20 with OIDC trusted publishing
