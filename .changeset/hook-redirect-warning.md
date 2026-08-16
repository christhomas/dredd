---
'@antimatter-studios/dredd': minor
---

Say so when a hook redirects a request by the wrong field.

A request is built from `transaction.fullPath`, which is resolved from the description before
any hook runs. A hook that redirects a request by assigning `transaction.request.uri` changes
nothing: the request still goes where it was going, and it used to do so in silence, so a hook
file could read as though it had moved a request that never moved. Dredd now warns, naming
both the ignored value and the path the request is actually sent to.
