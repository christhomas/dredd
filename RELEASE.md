# Release process

## Prerequisites

### npm trusted publishing (one-time setup)

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

## Creating a release

### 1. Add a changeset

When you make changes that should be released, run:

```bash
npx changeset
```

This will prompt you to select which packages changed and the semver bump type (patch/minor/major). Commit the generated changeset file with your PR.

### 2. Publish

Once your PR is merged to master, go to **Actions → publish → Run workflow** on the master branch.

The workflow will:
- Install, build, and test
- Apply version bumps from pending changesets
- Publish to npm via OIDC trusted publishing (no tokens needed)
- Push version commits and git tags back to master

### Dry run

You can select **dry-run: true** when triggering the workflow to verify what would be published without actually publishing.
