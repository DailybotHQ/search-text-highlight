# Build & Deploy

How a commit on `main` becomes a published npm version. The pipeline is fully automated — your job during a PR is to keep the local checks green; the rest happens after merge.

## Inputs you need before any release

- **npm publish access:** the `NPM_TOKEN` secret must be set on the GitHub repository
- **GitHub automation token:** `AUTOMATION_GITHUB_TOKEN` for the workflow's `git push --follow-tags` and dispatch calls
- **Conventional commit messages** — the release notes script (`get_github_release_log.sh`) reads them

If you're forking, see [Fork Customization](FORK_CUSTOMIZATION.md) for the rebrand checklist that includes npm scope, repo URL, and secret rotation.

## Pipeline at a glance

```
PR opened / synced ─────────────► code_check.yml
                                  ├── corepack pnpm install --frozen-lockfile (+ pnpm-store cache)
                                  ├── pnpm run biome:check
                                  ├── pnpm run build      (refresh dist for the exports smoke test)
                                  └── pnpm run test
                                  (also: pull_request_check.yml validates PR has a Size label)

PR merged to main ──────────────► release_and_publish.yml
                                  ├── notify start (DailyBot channel)
                                  ├── reproduce code_check (Biome + build + test)
                                  ├── pnpm run build      (Vite bundle + tsc declarations → dist/)
                                  ├── pnpm run release    (prepare_release.sh: patch bump, commit + tag)
                                  ├── git push --follow-tags origin main
                                  ├── create GitHub release (notes from git_logs_output.txt)
                                  ├── corepack pnpm publish --no-git-checks (with NPM_TOKEN)
                                  ├── delete source branch
                                  ├── trigger cleanup_caches
                                  └── notify end (DailyBot channel)
```

The local equivalent is:

```bash
pnpm run biome:check
pnpm run build:tsc      # type check
pnpm run test
pnpm run build          # Vite bundle + tsc declarations
```

If all four pass locally, your PR will pass CI.

## Local build

```bash
pnpm run build          # Vite library bundle (dist/index.js) + tsc declarations (dist/*.d.ts)
ls -lh dist/
```

`dist/` is gitignored. Don't commit it — CI rebuilds before publishing.

To verify the bundle locally:

```bash
corepack pnpm pack --dry-run   # Lists what would be uploaded to npm
corepack pnpm pack             # Produces a search-text-highlight-<version>.tgz next to package.json
```

Inspect the tarball:

```bash
tar -tzf search-text-highlight-*.tgz
```

You should see only:

- `package/package.json`
- `package/README.md`
- `package/LICENSE`
- `package/dist/index.js`
- `package/dist/index.d.ts`

The `files: ["dist"]` allowlist in `package.json` is what restricts the tarball; `package.json`, `README.md`, and `LICENSE` are always included by npm. If anything else appears (test files, source TS, docs), tighten the allowlist.

## Release semantics

`pnpm run release` runs [`.github/scripts/prepare_release.sh`](../.github/scripts/prepare_release.sh), which:

1. Refuses to run if **tracked** files have uncommitted changes (untracked build artifacts like `dist/` are fine)
2. Bumps the patch version in `package.json` with Node directly (avoids pnpm's clean-tree guard `ERR_PNPM_UNCLEAN_WORKING_TREE` in CI)
3. Stages `package.json` (and `pnpm-lock.yaml` if present)
4. Commits with the templated message `[🤖 DailyBot] New release to vX.Y.Z launched 🚀`
5. Creates an annotated git tag matching the new version

> **Why a script, not `pnpm version`?** pnpm 11.x runs `git status --porcelain` upfront and fails when the working tree has transient artifacts — which is exactly the CI state after `pnpm install --frozen-lockfile` triggers install scripts (e.g. esbuild's postinstall). The Node-based bump only touches `package.json` and is safe regardless of untracked state.

For minor / major releases, edit `package.json`'s `version` manually **before** merging the PR and commit + tag it yourself with the same message template. The release workflow detects the existing tag and won't double-bump.

> **Caveat:** the workflow calls `pnpm run release` unconditionally, so it runs another patch bump even if you pre-bumped. If you need a minor/major, coordinate with the release workflow — either skip that step or push the bumped commit + tag to `main` directly. Document the workaround in this file when you do it.

## Publishing to npm

CI uses:

```bash
corepack pnpm publish --no-git-checks
```

with `NODE_AUTH_TOKEN` derived from the `NPM_TOKEN` secret (written into `.npmrc` by `actions/setup-node`). The package is published to the public npm registry (`https://registry.npmjs.org/`). `--no-git-checks` is required because CI's tree is post-build, so pnpm's default clean-tree / tag-match guard must be bypassed.

Manual publishing should not normally happen. If you must (e.g., a hotfix when CI is down):

```bash
# Verify you're on the latest main
git fetch origin && git checkout main && git pull

# Verify the tarball
corepack pnpm pack --dry-run

# Publish (requires npm authentication on your machine)
corepack pnpm publish --no-git-checks
```

Publishing the same version twice fails — npm rejects duplicates. Bump the version first.

## GitHub release

After `corepack pnpm publish` succeeds, the workflow creates a GitHub release using `ncipollo/release-action@v1`:

- **Tag:** matches the npm version (e.g., `v2.0.9`)
- **Title:** `Release v<version>`
- **Body:** generated by `.github/scripts/get_github_release_log.sh` from the merged commits

If the commit log is empty (e.g., a docs-only PR), the script writes a placeholder. Tag the PR with a meaningful title — that's what shows up in release notes.

## Cleanup

The workflow triggers a `cleanup_caches` repository_dispatch event on success. The handler removes stale GitHub Actions caches for the merged branch so the cache budget stays healthy. No manual action needed.

The merged source branch is deleted automatically (`git push origin --delete <branch>`). The `feature__packages_versions_update` branch is the exception — it's recreated weekly by `check_packages_versions.yml`.

## Notifications

Both `release_and_publish` and `pull_request_check` send messages to a DailyBot channel via `https://api.dailybot.com/v1/send-message/`:

- **Start of deployment** — workflow name, repo, actor, PR title/body, size label
- **End of deployment** — same plus per-job ✅/❌/⏩ status and the published npm version

The channel and API key are stored in repository secrets (`DAILYBOT_DEPLOYMENT_NOTIFICATION_CHANNEL`, `DAILYBOT_API_KEY`). Forks should rotate or remove these — see [Fork Customization](FORK_CUSTOMIZATION.md).

## Branching model

| Branch                              | Purpose                                                | Allowed commits                         |
| ----------------------------------- | ------------------------------------------------------ | --------------------------------------- |
| `main`                              | Default branch — every commit triggers a release       | Only via PR merge                       |
| `feature__<topic>`                  | Feature work                                           | Author-driven                           |
| `feature__packages_versions_update` | Auto-generated by `check_packages_versions.yml` weekly | Bot + manual fixups                     |
| `hotfix__<topic>`                   | Emergency fix                                          | Author-driven, prefer fast-track review |

PRs target `main` only. There's no `develop` or release branch.

## Versioning policy

- **Patch** (`X.Y.Z+1`): default — every merge bumps patch
- **Minor** (`X.Y+1.0`): new option that defaults to existing behavior; manually bump before merge
- **Major** (`X+1.0.0`): default change, signature change, removed option, regex semantic change; manually bump and add a migration note in the README and [API Reference](API_REFERENCE.md)

## Pre-publish checklist

- [ ] `pnpm run biome:check` passes
- [ ] `pnpm run build:tsc` succeeds
- [ ] `pnpm run test` passes
- [ ] `pnpm run build` succeeds
- [ ] `corepack pnpm pack --dry-run` lists only `dist/`, `package.json`, `README.md`, `LICENSE`
- [ ] If a public option or default changed, README, [API Reference](API_REFERENCE.md), [AGENTS.md](../AGENTS.md), and the test file are all updated in the same PR
- [ ] Conventional commit messages on every commit
- [ ] PR has a `Size - *` label (CI requires it)

## Rollback

If a bad version ships:

1. **Don't unpublish.** npm's unpublish window is 72 hours and unpublishing breaks downstream lockfiles
2. **Publish a patch** with the fix or a revert: `git revert <bad-sha> && git push` — the next release workflow run publishes the fix
3. **Deprecate the bad version** if needed:

```bash
npm deprecate search-text-highlight@<bad-version> "Critical bug: use <good-version> instead"
```

This shows a warning to anyone installing the bad version without removing the package.

## Cross-runtime sanity

The package is plain CommonJS. Smoke-test in Node and a bundler:

```bash
# Node
node -e "console.log(require('./dist/index').highlight('hello world', 'world'))"

# Bundler consumer (in a separate scratch repo or tmp/)
echo "import h from 'search-text-highlight'; console.log(h.highlight('a', 'a'))" > tmp/scratch.ts
```

`test/exports.test.ts` automates this in CI: it imports the built `dist/` bundle and asserts both the default and `module.exports` access paths resolve `highlight`.

If a consumer reports the package doesn't load, check:

- Their Node version vs `engines` in `package.json`
- Their bundler's resolution of `main` vs `types`
- Whether they're importing default vs namespace
