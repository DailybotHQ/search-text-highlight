---
name: ci-reproduce
description: Reproduce a failing CI workflow step locally
type: command
---

# Command: `ci-reproduce`

Reproduce a specific GitHub Actions workflow step locally so you can iterate without round-tripping through GitHub.

## Invocation

| Host                    | Form               |
| ----------------------- | ------------------ |
| Claude Code             | `/ci-reproduce`    |
| Codex / Cursor / Gemini | `#ci-reproduce`    |
| Plain text              | "run ci-reproduce" |

## When to use

- A CI workflow is red and you can't reproduce it on your machine
- A flake appears that you suspect is environment-specific
- You're modifying a workflow and want to test before pushing
- A teammate hits an issue you can't see locally

## Procedure

### 1. Identify the failing workflow + step

```bash
gh run list -L 10                            # Recent runs
gh run view <run-id>                          # Full run summary
gh run view <run-id> --log-failed             # Just the failed steps
```

Or find it in the GitHub UI under **Actions** → click the failed workflow → expand the failed job.

Each workflow's job list is in [`docs/CI_CD.md`](../../docs/CI_CD.md). The most common failure points:

| Workflow                      | Likely failed step                                                |
| ----------------------------- | ----------------------------------------------------------------- |
| `code_check.yml`              | Lint/format (Biome) or test (Vitest)                              |
| `release_and_publish.yml`     | Build, release, or publish (last is rare — usually a token issue) |
| `check_packages_versions.yml` | `corepack pnpm run ncu:upgrade` produced no diff (no-op) or PR conflict |

### 2. Match the step to a local command

| CI step name                           | Local command                                                              |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `Step 1 - 🧪 Run Biome check`          | `corepack pnpm run biome:check`                                            |
| `Step 1 - 🧪 Run tests`                | `corepack pnpm run test`                                                   |
| `Step 2 - 🛠️ Build application bundle` | `corepack pnpm run build`                                                  |
| `Step 4 - 🔄 Prepare release`          | `corepack pnpm run release` (runs `prepare_release.sh` — bumps the version!) |
| `Step 7 - 🚀🚀 Publish npm package`    | `corepack pnpm publish --no-git-checks` (don't actually run; use `corepack pnpm pack --dry-run`) |

### 3. Match the environment

CI runs on `ubuntu-latest` with Node from `.node-version` (24.16.0) and pnpm provisioned by Corepack (`pnpm@11.1.2`, pinned via the `packageManager` field). To match exactly, use the devcontainer (`/devcontainer-up`).

If you're already on a Linux machine:

```bash
node --version            # Should be 24.16.0 (the repo dev version; engines requires >=22)
corepack enable           # Ensure Corepack is on
corepack pnpm --version   # Should be 11.1.2
```

Otherwise, jump into the devcontainer:

```bash
cd docker/local && docker compose up -d
docker exec -it searchtexthl bash
```

### 4. Reset the local state

Sometimes the difference between local-pass and CI-fail is stale `node_modules`:

```bash
rm -rf node_modules dist
corepack pnpm install --frozen-lockfile
```

`--frozen-lockfile` mirrors CI exactly — it installs only what `pnpm-lock.yaml` pins. Don't delete `pnpm-lock.yaml`; CI uses the same lockfile, so deleting it locally would test a different dep tree.

### 5. Re-run the failing step

Run the local command from step 2. If it passes locally but failed in CI, the difference is environmental:

- **Node version** — `node --version`
- **pnpm version** — `corepack pnpm --version` (must match the pinned `pnpm@11.1.2`)
- **OS** — Linux vs your local OS
- **Environment variables** — CI sets `CI=true`; some tools change behavior under it
- **Locale / timezone** — CI is UTC, en-US
- **Quarantine** — `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080`; a just-published dependency may resolve differently between two installs run a week apart

Try with `CI=true`:

```bash
CI=true corepack pnpm run test
```

### 6. Capture the failure

If the local re-run reproduces:

- Read the error carefully — it's the same one CI saw
- Apply a fix
- Re-run until green
- Push

If the local re-run **doesn't** reproduce:

- Check the GitHub Actions runner specs (the YAML's `runs-on`)
- Compare your local Node / pnpm versions
- Check timestamp-sensitive tests (none today, but be alert)
- Try the devcontainer (closer to CI than your host)
- Re-run the CI workflow with debug logs:

```bash
gh run rerun <run-id> --debug
```

This emits more verbose logs for the next attempt.

### 7. Common reproductions

#### `Code Check` lint failure

```bash
corepack pnpm run biome:check       # See the exact error
# Fix or run /lint-fix
```

#### `Code Check` test failure

```bash
corepack pnpm run test              # Full suite
# If only one test fails, focus on a single file or test name:
corepack pnpm exec vitest run test/main.test.ts -t "<failing test name>"
```

#### `Release and Publish` build failure

```bash
rm -rf dist
corepack pnpm run build             # vite build + declaration emit
# Then check the output:
ls -lh dist/
node -e "console.log(require('./dist/index').highlight('test', 'e'))"
```

#### `Release and Publish` publish failure

This is rare — usually a token expiry. Don't run the publish locally; instead:

```bash
corepack pnpm pack --dry-run        # Verify the artifact would be valid
gh secret list                      # Verify NPM_TOKEN is set
```

If `NPM_TOKEN` is missing or stale, rotate it (see [`/release`](../skills/release.md)).

#### `Pull Request Content Check` failure

This checks for a `Size - *` label. The fix:

```bash
gh pr edit <pr-number> --add-label "Size - S"
gh run rerun <run-id>
```

#### `Check Packages Versions` no-op

The workflow opened a PR with no changes (everything was already up to date, or new versions are still inside the `minimumReleaseAge` quarantine window). Either:

- Close the PR (it'll be regenerated next Tuesday if needed)
- Add a meaningful change to the branch and push

### 8. After fixing

Push and watch:

```bash
git push
gh run watch --exit-status
```

The `--exit-status` flag waits for the run to complete and exits non-zero on failure — useful in scripts.

## Don't

- Run the npm publish locally to "test the publish step" — that publishes for real
- Run `corepack pnpm run release` locally — it runs `prepare_release.sh`, which bumps the version and creates a tag
- Bypass branch protection to push directly to `main`
- Push the same commit repeatedly hoping CI passes

## Do

- Match the CI environment as closely as possible (Node version, pnpm version, OS, devcontainer)
- Reset local state (`rm -rf node_modules` + `corepack pnpm install --frozen-lockfile`) before declaring "I can't reproduce"
- Read the full CI log, not just the last error line
- Use `gh run view --log-failed` to focus on the broken step

## See also

- [`/verify`](verify.md) — full pre-push check chain
- [`/devcontainer-up`](../skills/devcontainer-up.md) — exact CI parity
- [`/fix-build`](../skills/fix-build.md) — build failures
- [`docs/CI_CD.md`](../../docs/CI_CD.md) — workflow-by-workflow reference
