# CI / CD

Reference for every GitHub Actions workflow in `.github/workflows/`. Each workflow is described with its trigger, what it does, and the secrets / variables it depends on.

## Summary

| Workflow                           | File                                       | Trigger                                         | Purpose                                                        |
| ---------------------------------- | ------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------- |
| Code Check                         | `code_check.yml`                           | PR open / sync / reopen against `main`          | Biome (lint + format), build, test gate                        |
| Pull Request Content Check         | `pull_request_check.yml`                   | PR open / edit / sync                           | Validates the PR carries a Size label                          |
| Release and Publish                | `release_and_publish.yml`                  | PR closed (merged) on `main`                    | Builds, bumps version, tags, publishes to npm + GitHub Release |
| Check Packages Versions            | `check_packages_versions.yml`              | Schedule (Tue 15:00 UTC) + manual               | Opens an upgrade PR with `ncu:upgrade`                         |
| Check & Merge Packages Upgrades PR | `check_and_merge_packages_upgrades_pr.yml` | Schedule (Tue 20:00 UTC) + manual               | Auto-merges the upgrade PR if checks pass                      |
| Check Branches State               | `check_branches_state.yml`                 | Schedule (Tue 09:00 UTC) + manual               | Reports stale branches                                         |
| Cleanup Caches                     | `cleanup_caches.yml`                       | `repository_dispatch` `cleanup_caches` + manual | Trims old GitHub Actions caches                                |

All scheduled workflows run on Tuesdays UTC — that's the project's "maintenance day".

## Code Check (`code_check.yml`)

**Trigger:** every PR against `main` (open, sync, reopen). Concurrent runs cancel each other.

Every job pins Node `24.16.0`, enables Corepack, and restores the pnpm store cache keyed on `pnpm-lock.yaml` before installing with `corepack pnpm install --frozen-lockfile`.

**Jobs (sequential):**

1. **Setup** — `corepack pnpm install --frozen-lockfile` (pnpm store cached by `pnpm-lock.yaml` hash)
2. **Validate Linters and Code Format** — runs `corepack pnpm run biome:check` (lint + format in one pass)
3. **Run tests** — runs `corepack pnpm run build` first (to refresh `dist/` for the exports smoke test), then `corepack pnpm run test`

**Locally equivalent to:**

```bash
corepack pnpm install --frozen-lockfile
pnpm run biome:check
pnpm run build
pnpm run test
```

A red Code Check blocks merge.

## Pull Request Content Check (`pull_request_check.yml`)

**Trigger:** PR open / reopen / sync / edit against `main`.

**What it does:**

- Reads `github.event.pull_request.labels`
- Confirms the PR has one of: `Size - XS`, `Size - S`, `Size - M`, `Size - L`, `Size - XL`, `Size - XXL`
- Maps the label to an emoji (🟢🟡🟠🔴) for the deployment notification

**Why:** the size label is consumed by the release notification to surface deployment risk.

> **Practical note:** apply the size label as soon as you open the PR. Without it, this check fails and you can't merge until the label is added and the workflow re-runs.

## Release and Publish (`release_and_publish.yml`)

**Trigger:** PR closed on `main` with `pull_request.merged == true`. Concurrent runs cancel each other.

Every job pins Node `24.16.0`, enables Corepack, restores the pnpm store cache keyed on `pnpm-lock.yaml`, and installs with `corepack pnpm install --frozen-lockfile`. The build and publish jobs additionally cache `dist/` (keyed on `pnpm-lock.yaml`) so the artifact carries from build → publish.

**Jobs (sequential):**

1. **Check PR Size Label** — same logic as `pull_request_check.yml`, captured here for the notification
2. **Notify on channel - Start** — DailyBot message: deployment started
3. **Deploy - Setup Application** — `corepack pnpm install --frozen-lockfile` (with pnpm-store cache)
4. **Deploy - Validate Linters and Code Format** — `corepack pnpm run biome:check`
5. **Run tests** — `corepack pnpm run build` then `corepack pnpm run test`
6. **Build application bundle** — `corepack pnpm run build` (Vite bundle + `tsc` declarations → `dist/`); fails if `dist/` is missing
7. **Release and Publish:**
   - Configure git as `🤖 DailyBot <ops@dailybot.com>`
   - Generate release notes via `.github/scripts/get_github_release_log.sh` → `git_logs_output.txt`
   - `corepack pnpm run release` (`.github/scripts/prepare_release.sh`: patch bump, release commit + tag)
   - `git push --follow-tags origin main`
   - Capture the new tag
   - Create GitHub release with `ncipollo/release-action@v1`
   - `corepack pnpm publish --no-git-checks` (with `NODE_AUTH_TOKEN` from `NPM_TOKEN` secret)
   - Delete the merged source branch
8. **Cleanup caches** — fires the `cleanup_caches` repository_dispatch
9. **Notify on channel - End** — DailyBot message: per-job status + npm version published

**Required secrets:**

- `AUTOMATION_GITHUB_TOKEN` — checkout, push, branch delete, dispatch
- `NPM_TOKEN` — npm publish auth
- `DAILYBOT_API_KEY` — start/end notifications

**Required vars:**

- `DAILYBOT_DEPLOYMENT_NOTIFICATION_CHANNEL` — Slack/DailyBot channel ID
- `USERS_TO_NOTIFY` — handles to mention on deployment failure

If `NPM_TOKEN` is unset, the publish step fails and no release goes out — the GitHub release is also skipped because it sits in the same job.

## Check Packages Versions (`check_packages_versions.yml`)

**Trigger:** schedule `0 15 * * 2` (Tuesday 15:00 UTC) + manual.

**What it does:**

- Checks out `main` with the automation token
- Runs `npm-check-updates` honoring `.ncurc.json`
- If anything is outdated, creates / updates the `feature__packages_versions_update` branch
- Pushes commits and opens a PR titled "Upgrading packages versions" (with the standard size label)

**Branch name is fixed** — `feature__packages_versions_update`. The current branch you're on (if it matches) is the one this workflow drives.

## Check & Merge Packages Upgrades PR (`check_and_merge_packages_upgrades_pr.yml`)

**Trigger:** schedule `0 20 * * 2` (Tuesday 20:00 UTC, five hours after the upgrade PR opens) + manual.

**What it does:**

- Looks for an open PR from `feature__packages_versions_update` to `main`
- If `Code Check` is green, merges it
- If `Code Check` is red, leaves it for human review

The five-hour gap exists so `Code Check` and `Pull Request Content Check` complete before the auto-merge attempt.

## Check Branches State (`check_branches_state.yml`)

**Trigger:** schedule `0 9 * * 2` (Tuesday 09:00 UTC) + manual.

**What it does:**

- Walks every remote branch
- Compares against `main` to detect stale branches (no commits in `main` for N days)
- Prints a report; doesn't auto-delete

Useful for keeping the branch list short. The script is in the workflow body — adjust thresholds there if needed.

## Cleanup Caches (`cleanup_caches.yml`)

**Trigger:** `repository_dispatch` with type `cleanup_caches` (fired from `release_and_publish.yml`) + manual.

**What it does:**

- Installs the `actions/gh-actions-cache` GitHub CLI extension
- Lists caches for the current repo + branch
- Deletes them, freeing the per-repo cache budget

## Helper scripts

| Script                                      | Called by                     | Purpose                                                            |
| ------------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `.github/scripts/get_github_release_log.sh` | `release_and_publish.yml`     | Generates `git_logs_output.txt` (release body) from merged commits |
| `.github/scripts/prepare_release.sh`        | `release_and_publish.yml`     | Bumps the patch version, creates the release commit + tag (`pnpm run release`) |
| `.github/scripts/get_packages_upgrades.sh`  | `check_packages_versions.yml` | Runs `ncu:upgrade`, captures the diff, formats the PR body         |

When debugging a workflow, run these scripts locally first — they're plain bash and easy to step through.

## Caching strategy

Every job enables Corepack and caches the pnpm content-addressable store. The store path is resolved at runtime and cached, keyed on `pnpm-lock.yaml`:

```yaml
- name: Enable Corepack
  run: corepack enable
- name: Get pnpm store path
  id: pnpm-store
  run: echo "STORE_PATH=$(corepack pnpm store path --silent)" >> "$GITHUB_OUTPUT"
- uses: actions/cache@v5
  with:
    path: ${{ steps.pnpm-store.outputs.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-
```

The `dist/` output is also cached on the build job using the same `pnpm-lock.yaml` hash, so `release_and_publish` re-uses it across the build → publish steps.

`Cleanup Caches` removes them after every release to keep the budget under GitHub's per-repo limit.

## Local reproduction

To run the same checks locally before pushing:

```bash
corepack pnpm install --frozen-lockfile
pnpm run biome:check
pnpm run build
pnpm run test
```

The release-only steps (npm publish, GitHub release, DailyBot notification) only run on the `main` merge — there's no way to dry-run them locally without `act` or similar.

## Required GitHub repository configuration

For the workflows to function on a fork, ensure:

- **Secrets** — `AUTOMATION_GITHUB_TOKEN`, `NPM_TOKEN`, `DAILYBOT_API_KEY`
- **Variables** — `DAILYBOT_DEPLOYMENT_NOTIFICATION_CHANNEL`, `USERS_TO_NOTIFY`
- **Settings → Actions → General → Workflow permissions** — `Read and write permissions` so the bot can push tags and delete branches
- **Branch protection on `main`** — require `Code Check` + `Pull Request Content Check` before merge

[Fork Customization](FORK_CUSTOMIZATION.md) walks you through each of these for a clean fork.

## Updating these workflows

Workflow YAML lives in `.github/workflows/`. When you change one:

1. Test the change on a branch — open a draft PR
2. Verify the affected workflow runs and passes
3. Document the change in this file (the trigger, the new step, why)
4. Get a second pair of eyes — workflow misconfigurations can leak secrets or skip the publish step

If you remove or rename a workflow, search for inbound references in this repo (and downstream forks if you maintain any).
