---
'@antimatter-studios/dredd': patch
---

Honour an option set in the configuration file.

Dredd merged every argument yargs reported over the configuration it had just loaded,
and yargs reports a value for every option it knows about, so an option the user never
typed replaced what `dredd.yml` said with its own default. `hookfiles: ./hooks.js` in a
configuration file loaded no hooks at all, and passing `--hookfiles` on the command line
was the only way to be heard. Only the arguments actually given on the command line now
take precedence.
