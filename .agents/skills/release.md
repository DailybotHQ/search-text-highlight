---
name: release
description: Walk through the release workflow, verify prerequisites, and ship a new version
type: skill
---

# Skill: `/release`

Verify that the repository is ready for a release and either let CI handle it (the normal path) or ship manually (rare).

## When to use

- The user asks to "release", "publish", or "ship"
- A series of merged PRs accumulated and a release is overdue
- A hotfix needs to go out immediately
- The user asks "what would the next published version look like?"

## How the release script works

`corepack pnpm run release` runs `bash .github/scripts/prepare_release.sh`, which:

1. Refuses to run if **tracked** files have uncommitted changes (untracked/gitignored build artifacts like `dist/` are fine)
2. Bumps the patch version in `package.json` using Node directly (not `pnpm version`, which would abort on a dirty tree under pnpm 11.x)
3. Stages `package.json` (and `pnpm-lock.yaml` if present), commits with `[🤖 DailyBot] New release to vX.Y.Z launched 🚀`, and creates the matching `vX.Y.Z` tag

The script only bumps **patch**. Minor / major bumps are manual (see below). Publishing to npm is done by the workflow with `corepack pnpm publish --no-git-checks`.

## Inputs to confirm

- **Patch / minor / major** — patch by default; minor for new optional features; major for breaking changes
- **Manual or CI-driven** — CI is the default; manual only for emergencies
- **Target branch** — `main` is the only branch that publishes
- **Release notes** — auto-generated from commit messages, but the user may want to override

## Procedure

### 1. Confirm the release type

| Change since last release                        | Bump type |
| ------------------------------------------------ | --------- |
| Bug fix, internal refactor, doc-only             | patch     |
| New optional option (no default change)          | minor     |
| Default change, signature change, removed option | major     |

If unsure, default to **patch** — that's what `prepare_release.sh` produces.

### 2. Verify the local state is publishable

```bash
git status                    # Tracked files should be clean (prepare_release.sh enforces this)
git fetch origin
git rev-parse HEAD == git rev-parse origin/main      # Should be on main, up to date
```

Run the full check chain:

```bash
corepack pnpm run biome:check
corepack pnpm run build:tsc
corepack pnpm run test
corepack pnpm run build
```

All four must pass. If any fails, fix before releasing.

### 3. Inspect what would publish

```bash
corepack pnpm pack --dry-run
```

Publishing is whitelist-driven by `package.json` `"files": ["dist"]`. Verify the tarball contains only:

- `package/package.json`
- `package/README.md`
- `package/LICENSE`
- `package/dist/index.js`
- `package/dist/index.d.ts` (and the `dist/lib/*.d.ts` declarations)

If source, tests, or docs appear, the `files` whitelist is too broad — fix it before releasing.

### 4. Decide: CI-driven (recommended) or manual?

#### CI-driven (recommended)

The `release_and_publish.yml` workflow runs on PR merge to `main`:

1. Merge the PR via GitHub UI (or `gh pr merge --squash <id>`)
2. Watch the workflow:
   ```bash
   gh run watch --exit-status
   ```
3. Verify the new version on npm:
   ```bash
   corepack pnpm view search-text-highlight version
   ```

The workflow runs `corepack pnpm run release` (which is `prepare_release.sh`, a patch bump) and then publishes with `corepack pnpm publish --no-git-checks`. For minor / major, see [Manual section](#manual-rare).

#### Manual (rare)

When you need:

- A minor or major bump (the script and workflow only do patch)
- A hotfix that can't wait for CI
- Recovery from a CI failure

Steps:

```bash
# Make sure you're on main and up to date
git fetch origin && git checkout main && git pull

# Bump the version manually (the script only does patch, so do minor/major by hand).
# Edit package.json's version, or use Node like prepare_release.sh does, then:
git add package.json pnpm-lock.yaml
git commit -m "[🤖 DailyBot] New release to vX.Y.Z launched 🚀"
git tag -a vX.Y.Z -m vX.Y.Z

# Push commit + tag
git push --follow-tags origin main

# Build
corepack pnpm run build

# Publish (the workflow uses --no-git-checks; match it locally)
corepack pnpm publish --no-git-checks
```

> **Caveat:** the `release_and_publish` workflow currently triggers on `pull_request closed`, so a direct push to `main` won't fire it. If your config differs and the workflow does fire, it runs another `prepare_release.sh` (double-bump risk). Check the workflow YAML first.

### 5. Verify the published artifact

Either path:

```bash
corepack pnpm view search-text-highlight version       # Should match what you published
corepack pnpm view search-text-highlight dist-tags     # 'latest' should point to the new version
```

Quick consumer test in a scratch directory:

```bash
mkdir -p tmp/consumer && cd tmp/consumer
corepack pnpm init
corepack pnpm add search-text-highlight@latest
node -e "console.log(require('search-text-highlight').highlight('hello world', 'world'))"
```

Should print: `hello <span class="text-highlight">world</span>`.

### 6. Verify the GitHub release

```bash
gh release list -L 5
gh release view v$(corepack pnpm view search-text-highlight version)
```

The release should have:

- A title `Release v<version>`
- Body with the commit log since the previous release
- The version tag attached

If the body looks empty, `.github/scripts/get_github_release_log.sh` may have failed to capture commits. The CI logs will show why.

### 7. Verify the source branch was deleted

The workflow's last step deletes the merged feature branch. Confirm:

```bash
git branch -r | grep <branch-name>     # Should not appear
```

### 8. Verify caches were cleaned

```bash
gh api repos/:owner/:repo/actions/caches | jq '.actions_caches | length'
```

The number should be lower after `cleanup_caches` ran.

### 9. Communicate

If the change is user-facing:

- Post to the team channel (DailyBot does this automatically if configured)
- Update any external docs / changelog if the repo has one
- Reply to the PR / issue that motivated the release

## Pre-release checklist

- [ ] Tracked files are clean (`prepare_release.sh` will refuse otherwise)
- [ ] Local `main` matches `origin/main`
- [ ] Full check chain passes
- [ ] `corepack pnpm pack --dry-run` shows only the publishable files
- [ ] Release type decided (patch / minor / major)
- [ ] If major: migration notes added to README, version bumped manually
- [ ] If using CI: the PR is approved and ready to merge
- [ ] If using manual: the user explicitly approved the manual path

## Post-release checklist

- [ ] `corepack pnpm view <package> version` reports the new version
- [ ] A consumer install works
- [ ] GitHub release has notes and the right tag
- [ ] Source branch deleted (if it was a feature branch)
- [ ] Caches cleaned
- [ ] Team notified (or DailyBot did it)

## Rollback

If a bad version shipped:

1. **Don't unpublish.** npm's unpublish window is 72 hours and unpublishing breaks downstream lockfiles
2. **Publish a patch** with the fix:
   ```bash
   git revert <bad-sha>
   git push                       # Triggers another release if on main
   ```
3. **Deprecate the bad version**:
   ```bash
   corepack pnpm deprecate search-text-highlight@<bad-version> "Critical bug: use <good-version> instead"
   ```

## Don't

- Skip the check chain (CI re-runs it but local feedback is faster)
- Run the publish from a feature branch
- Bump the version and forget to push the tag
- Edit `dist/` and publish manually — always rebuild
- Force-publish over an existing version (npm rejects this anyway)
- Run `corepack pnpm run release` when tracked files are dirty — the script will abort

## Do

- Default to CI-driven release
- Verify locally before merging
- Communicate the release to consumers if behavior changed
- Use `corepack pnpm deprecate` for soft-revoking a bad version

## Verification checklist

- [ ] Pre-release checklist passed
- [ ] CI workflow ran (or manual steps completed)
- [ ] Post-release checklist passed
- [ ] Smoke test against a scratch consumer succeeded
- [ ] Conventional commit messages on every commit in the release window
