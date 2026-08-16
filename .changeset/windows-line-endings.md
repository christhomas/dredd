---
'@antimatter-studios/openapi2-parser': patch
---

Report the same $ref error on every platform.

The resolver puts the working directory in front of the pointer it could not resolve, and
spells it its own way - forward slashes, lower case drive letter - so on Windows it was not
stripped back off and the annotation named a path rather than the pointer the document
contains. That also cost the source map, which is found by looking the pointer up in the
document. The message's line endings are normalised for the same reason.
