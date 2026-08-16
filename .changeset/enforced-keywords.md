---
'@antimatter-studios/openapi3-parser': minor
---

Stop reporting enforced JSON Schema keywords as unsupported.

An OpenAPI 3.1 document using `prefixItems`, `dependentRequired`, `const`, `contains`,
`propertyNames`, `if`/`then`/`else` or `unevaluatedProperties` was warned that the key was
unsupported and then had its responses held to it: every one of those reaches the message body
schema and the validator enforces it. The warning said the opposite of what happens, so it is
gone. They still do not shape the example body dredd generates, which is a limitation of the
generator rather than of what a document may say.
