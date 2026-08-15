---
"@antimatter-studios/dredd-transactions": patch
"@antimatter-studios/dredd": patch
---

Accept null for a nullable reference in a response body.

The OpenAPI 3 parser described a nullable reference as an object, so a response sending null
for it was rejected even though the specification permits it. Dependencies are also brought
up to date, except those that are ESM-only at their latest release.
