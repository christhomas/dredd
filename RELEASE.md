# Release process

## Prerequisites (one-time setup)

For each package (`@antimatter-studios/dredd` and `@antimatter-studios/dredd-transactions`):

1. Go to **npmjs.com → package → Settings → Publishing access**
2. Under **Trusted publishers**, click **Add trusted publisher**
3. Fill in:
   - **Repository owner**: `christhomas`
   - **Repository name**: `dredd`
   - **Workflow filename**: `publish.yml`
   - **Environment**: `npm-publish`
4. Save

Also create a GitHub environment called `npm-publish` in **repo Settings → Environments**.

## Day-to-day: adding changesets

When you make changes that should be released, run:

```bash
npx changeset
```

This prompts you to select which packages changed and the semver bump type. Commit the generated changeset file with your PR.

## Releasing

```bash
# Apply pending changesets — bumps versions in package.json, updates changelogs
npx changeset version

# Commit and tag
git add -A
git commit -m "chore: release"
git tag v<version>
git push && git push --tags
```

Pushing the `v*` tag triggers the publish workflow which automatically:
- Installs, builds, and tests
- Publishes to npm via OIDC trusted publishing (no tokens needed)
