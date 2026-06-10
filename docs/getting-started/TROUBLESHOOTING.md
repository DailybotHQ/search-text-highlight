# Troubleshooting

Real problems encountered while developing on `search-text-highlight`, with the exact fix for each. If you're hitting something not listed here, open an issue.

> Most setup pain comes from Node version mismatches or stale `node_modules`. When in doubt, blow away `node_modules` and `pnpm-lock.yaml` (locally only — never commit a deleted lockfile), reinstall with `corepack pnpm install`, and retest.

---

## `corepack pnpm install` fails with `EBADENGINE` (or a Node version warning)

**Symptom:**

```text
 WARN  Unsupported engine: wanted: {"node":">=22.0.0"} (current: {"node":"v18.x.x"})
```

**Cause:** `package.json` declares `"engines": { "node": ">=22.0.0" }`. pnpm warns when the host Node is below that floor.

**Fix:** install Node 24.16.0 (the version pinned in `.node-version` / `.nvmrc`; use `nvm`, `volta`, or your platform's package manager):

```bash
nvm install 24.16.0
nvm use 24.16.0
node --version            # should print v24.16.0
corepack enable           # activate pnpm@11.1.2
```

The warning is informational, not blocking — Node 22+ may work for local hacking, but CI and the devcontainer use 24.16.0 and tests there are authoritative. Match versions to avoid surprises.

---

## `corepack pnpm` is not found / wrong pnpm version

**Symptom:** `corepack: command not found`, or `pnpm` runs a version other than `11.1.2`.

**Cause:** Corepack isn't enabled, so the pinned `"packageManager": "pnpm@11.1.2"` isn't being honored.

**Fix:**

```bash
corepack enable            # one-time; Corepack ships with Node 24
corepack pnpm --version    # should print 11.1.2
```

Corepack reads the `packageManager` field and downloads the exact pinned pnpm. Don't `npm install -g pnpm` — that bypasses the pin and can drift from CI.

---

## `corepack pnpm install` skips a build script (`ERR_PNPM_IGNORED_BUILDS`)

**Symptom:**

```text
 WARN  Ignored build scripts: esbuild.
 Run "pnpm approve-builds" to pick which dependencies should be allowed.
```

**Cause:** pnpm 11+ refuses to run a dependency's install/build script unless it's on the allow-list. This repo curates that list in `pnpm-workspace.yaml` under `allowBuilds`.

**Fix:** the repo already allows `esbuild` (pulled in by Vite):

```yaml
allowBuilds:
  esbuild: true
```

If a new dependency reports an ignored build you genuinely need, add it to `allowBuilds` and document why. Don't blanket-approve every script — that defeats the supply-chain guard. See the [supply-chain rationale](https://xergioalex.com/blog/supply-chain-attacks-ai-era/).

---

## Biome reports errors that the CLI doesn't, or vice versa

**Symptom:** the editor highlights lint/format issues that `corepack pnpm run biome:check` doesn't report (or the reverse).

**Cause:** the Biome VS Code extension may use a different Biome binary than the one in `node_modules`, or `node_modules` is stale.

**Fix:**

1. Make sure the workspace Biome version is installed: `corepack pnpm install`
2. Reload the Biome extension: `Cmd/Ctrl+Shift+P` → `Biome: Restart LSP server`
3. Run the same command CI runs from the project root: `corepack pnpm run biome:check`

If you must run Biome directly, do it from the repo root so it picks up `biome.json`:

```bash
corepack pnpm exec biome check src test
```

---

## Biome reformats a table or block you laid out intentionally

**Symptom:** running `corepack pnpm run biome:fix` reflows a Markdown table or destroys intentional whitespace.

**Cause:** the formatter normalizes whitespace. Biome only formats the file types listed in `biome.json`'s `files.includes` — Markdown under `docs/` is not in that set today, so prose tables are generally safe — but a fenced code block inside a `.ts`/`.json` file will be reformatted.

**Fix:** wrap the affected region in Biome ignore comments:

```ts
// biome-ignore format: intentional alignment
const table = [
  //...
]
```

When in doubt, prefer the formatter's output — only override when it materially harms readability.

---

## Vite build fails with `Could not resolve './lib/type'`

**Symptom:**

```text
[vite]: Rollup failed to resolve import "./lib/type" from "src/index.ts".
```

**Cause:** `node_modules` is stale, or the import path lost its module resolution (Vite resolves `.ts` automatically — a missing file or a typo'd path is the usual culprit).

**Fix:**

```bash
rm -rf node_modules dist
corepack pnpm install
corepack pnpm run build
```

If still broken, check that the imported file exists and the path matches exactly (`src/lib/type.ts`). The build config lives in `vite.config.ts` (bundle) and `tsconfig.build.json` (declarations) — don't hand-edit `dist/`.

---

## Vitest passes locally but fails in CI

**Symptom:** `corepack pnpm run test` is green on your machine, red on GitHub Actions.

**Common causes:**

1. **Different Node version.** CI uses 24.16.0. Run `nvm use 24.16.0` and retry locally
2. **Locale-sensitive output.** If a test compares strings with case differences, the locale matters. Check `LANG` / `LC_ALL`
3. **Date / timezone in tests.** None today; but if you add one, freeze time with `vi.useFakeTimers()`
4. **Race condition.** None today (the library is synchronous); if a future async path flakes, look for shared state between tests

Re-run the failing job with debug logs from the GitHub Actions UI. The output usually reveals the difference.

---

## `npm publish` fails with `403 Forbidden`

**Symptom:**

```
npm error 403 Forbidden - PUT https://registry.npmjs.org/search-text-highlight - You do not have permission to publish "search-text-highlight"
```

**Causes:**

1. You're not logged in as a maintainer of the package
2. Your token doesn't have publish access
3. The package name is taken (for a fresh fork)
4. 2FA is required and the token type doesn't support it

**Fix (CI):** rotate the `NPM_TOKEN` secret. Generate a new token from npm → Access Tokens → "Granular Access Token" with publish access scoped to `search-text-highlight` (or the new name in a fork).

**Fix (local):** `npm whoami` and `npm login`. For 2FA accounts, use a token with `auth-and-writes` 2FA mode, generated from the npm web UI.

---

## `npm publish` fails with "version already exists"

**Symptom:**

```
npm error 403 You cannot publish over the previously published versions: 2.0.8
```

**Cause:** the version in `package.json` was already published. `npm publish` refuses duplicates.

**Fix:** bump the version and try again:

```bash
corepack pnpm version patch
corepack pnpm publish
```

If you got here from CI, the `release_and_publish.yml` workflow bumps the version automatically (via `.github/scripts/prepare_release.sh`) — this error usually means a previous run published successfully but the workflow continued past the failure. Inspect the published versions on `npmjs.com` and only re-run the workflow if a true publish gap exists.

---

## Devcontainer's `claude` (or `codex`, `agent`) says "not authenticated"

**Symptom:** running `claudex` (or `claude`) inside the container reports an auth error.

**Cause:** the auth volume is empty (first run on this machine).

**Fix:** run plain `claude` first to complete OAuth:

```bash
claude
# Follow the prompted URL on the host browser, paste back the code
```

The token persists in the `claude_data` named volume — surviving rebuilds. Same flow for `codex` and `agent --login`.

---

## Devcontainer build fails on `apt-get update`

**Symptom:** `docker compose up --build` fails partway through with an apt error.

**Causes:**

- Slow / blocked network — the chromium install pulls hundreds of MB
- Debian repo blip — try again in a few minutes
- DNS issue inside Docker — restart Docker Desktop

**Fix:**

```bash
cd docker/local
docker compose down
docker compose up -d --build --no-cache
```

If the apt error mentions a package not found, the upstream Debian repos may have moved trixie's packages — pin a newer base image in `docker/local/searchTextHL/Dockerfile`:

```dockerfile
FROM node:24.16.0-trixie-slim
```

> The devcontainer routes bare `npm` to `corepack pnpm` via a wrapper at `/usr/local/bin/npm`, and runs `corepack enable` during the build. If the wrapper is missing after a custom rebuild, run `corepack enable` inside the container and re-source `~/.bashrc`.

---

## `git status` shows the entire repo as modified after switching branches

**Symptom:** every file appears modified, often with line-ending changes.

**Cause:** `core.autocrlf` is set to `true` on Windows or the editor inserted CRLF line endings.

**Fix (one-time):**

```bash
git config --global core.autocrlf input    # macOS/Linux
git config --global core.autocrlf true     # Windows
```

Then reset the working tree:

```bash
git rm --cached -r .
git reset --hard
```

The repo's `.editorconfig` enforces LF (`end_of_line = lf`) — IDE-side EditorConfig support fixes this automatically going forward.

---

## TypeScript reports `Property 'foo' does not exist on type 'OptionsType'`

**Symptom:** you added an option to `OptionsType` but a downstream check still fails.

**Cause:** TypeScript caches incremental builds in `tsconfig.tsbuildinfo` (or similar). Stale cache holds old types.

**Fix:**

```bash
rm -rf dist tsconfig.tsbuildinfo
corepack pnpm run build:tsc
```

If the issue persists, restart your editor's TypeScript server. In VS Code: `Cmd/Ctrl+Shift+P` → `TypeScript: Restart TS Server`.

---

## `corepack pnpm run release` made a tag but CI didn't publish

**Symptom:** running `corepack pnpm run release` locally creates a commit + tag, but no npm publish happened.

**Cause:** local `release` only bumps the version (it runs `.github/scripts/prepare_release.sh`). The `release_and_publish.yml` workflow triggers on `pull_request closed (merged)`, not on tag push.

**Fix:** push your local commit through a PR to `main`. The merge triggers the workflow, which then runs **another** release bump (so version becomes the next patch, not the one you bumped). To avoid double-bumping:

1. Don't run `corepack pnpm run release` locally — let CI do it
2. Or coordinate with maintainers to skip the workflow's release step

For minor / major releases, the recommended path is:

1. Bump the version explicitly (`corepack pnpm version minor` or `corepack pnpm version major`)
2. Coordinate with maintainers — typically by removing the workflow's release step in a separate PR for that release window

---

## Vitest hangs at the end with no output

**Symptom:** all tests pass but the process never exits.

**Cause:** an open handle (a `setInterval`, an unclosed file descriptor, a lingering promise). The library is synchronous — this should not happen unless a new feature introduced async work.

**Fix:** Vitest's `run` mode exits on its own; if it hangs, surface the open handles:

```bash
corepack pnpm exec vitest run --reporter verbose
```

Then **find the actual leak**. Vitest can report dangling timers/handles — enable Node's `--trace-warnings` to locate them:

```bash
node --trace-warnings node_modules/.bin/vitest run
```

If a single spec is the culprit, isolate it:

```bash
corepack pnpm exec vitest run test/main.test.ts
```

---

## VS Code shows Biome errors that don't appear from CLI

**Symptom:** the editor highlights errors that `corepack pnpm run biome:check` doesn't report.

**Cause:** the Biome VS Code extension may resolve a different Biome binary than the one in the workspace `node_modules`.

**Fix:**

1. Reload the Biome extension: `Cmd/Ctrl+Shift+P` → `Biome: Restart LSP server`
2. Verify the extension is using the workspace version (Biome reads `biome.json` from the project root)
3. If the discrepancy persists, run `corepack pnpm run biome:check` from the same terminal VS Code launched — that mirrors the extension's environment

---

## Still stuck?

1. Re-read the relevant section of [Environment Setup](ENVIRONMENT_SETUP.md) — most issues come from a missed step
2. Run the sanity-check commands from [Environment Setup → Final sanity checklist](ENVIRONMENT_SETUP.md#final-sanity-checklist) to isolate which layer is broken
3. Try the devcontainer if you were on a native install (or vice versa) — the layer that's broken usually becomes obvious
4. Open an issue with: your `node --version`, your `corepack pnpm --version`, the failing command's full output, and your platform
