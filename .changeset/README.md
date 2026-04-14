# Changesets

This project uses [changesets](https://github.com/changesets/changesets) for versioning and publishing.

## Adding a changeset

When you make a change that should be released, run:

```bash
npx changeset
```

This will prompt you to select which packages changed and whether the change is a patch, minor, or major bump. A changeset file will be created in this directory.

## Releasing

See [RELEASE.md](../RELEASE.md) for the full release process.
