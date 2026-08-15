---
'@antimatter-studios/dredd-transactions': minor
'@antimatter-studios/dredd': minor
---

Bring the dependencies up to date.

`uri-template` moves from 1.0.1 to 2.0.0. Expanded URIs are unchanged — including the
quirks projects already depend on, such as percent-encoding a newline as `%A` rather than
`%0A`, and escaping an already-escaped `%20` again — which was checked case by case against
the old version before taking the upgrade. Two things do change, both only for a template
that fails to parse: the wording of the `Failed to parse URI template` diagnostic now comes
from the new parser, and `{}`, an expression with no variable in it, is reported as a parse
error where it used to be accepted and ignored.

TypeScript moves to 7, eslint to 10, and the remaining development dependencies to their
current releases. `gavel` stays at 9 deliberately: 10.0.4 is published with its `main`
pointing at a directory its `files` list never ships, so requiring it throws, and its
validation results are identical to 9's anyway.
