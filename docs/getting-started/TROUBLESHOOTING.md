# Troubleshooting

Real problems encountered while developing on `search-text-highlight`, with the exact fix for each. If you're hitting something not listed here, open an issue.

> Most setup pain comes from Node version mismatches or stale `node_modules`. When in doubt, blow away `node_modules` and `package-lock.json` (locally only — never commit a deleted lockfile), reinstall, and retest.

---

## `npm install` fails with `EBADENGINE`

**Symptom:**

```
npm warn EBADENGINE Unsupported engine {
  package: 'search-text-highlight@2.0.8',
  required: { node: '24.15.0' },
  current: { node: 'v18.x.x' }
}
```

**Cause:** `package.json` declares `"engines": { "node": "24.15.0" }`. npm warns when the host Node doesn't match.

**Fix:** install Node 24.15.0 (use `nvm`, `volta`, or your platform's package manager):

```bash
nvm install 24.15.0
nvm use 24.15.0
node --version            # should print v24.15.0
```

The warning is informational, not blocking — other Node versions may work for local hacking, but CI uses 24.15.0 and tests there are authoritative. Match versions to avoid surprises.

---

## `npm run test` fails with `Error: Cannot find module 'ts-node/register'`

**Symptom:**

```
Error: Cannot find module 'ts-node/register'
Require stack:
- /app/node_modules/mocha/bin/mocha.js
```

**Cause:** `node_modules` is partial — possibly the previous `npm install` was interrupted.

**Fix:**

```bash
rm -rf node_modules package-lock.json     # only delete lockfile if local
npm install
npm run test
```

If the issue persists, your npm cache might be poisoned:

```bash
npm cache clean --force
rm -rf node_modules
npm install
```

---

## ESLint fails with `Parsing error: Cannot read file 'tsconfig.json'`

**Symptom:** ESLint can't resolve TypeScript config when run from a subdirectory.

**Cause:** `@typescript-eslint/parser` looks for `tsconfig.json` in the working directory.

**Fix:** run ESLint from the repo root:

```bash
cd /path/to/search-text-highlight   # not a subdirectory
npm run eslint:check
```

If you must run from elsewhere, pass the absolute path:

```bash
npx eslint --ext .ts /path/to/search-text-highlight/src
```

---

## Prettier rewrites the README into a single line

**Symptom:** running `npm run prettier:fix` collapses tables or destroys intentional whitespace in `README.md`.

**Cause:** Prettier 3 changed Markdown defaults; complex tables sometimes get reflowed.

**Fix:** wrap the affected section in Prettier ignore comments:

```md
<!-- prettier-ignore-start -->
| Name    | Type   | Default | Description                           |
| :------ | :----- | :------ | :------------------------------------ |
| text    | string | ''      | base message                          |
| query   | string | ''      | substring for highlight in message    |
<!-- prettier-ignore-end -->
```

This is already used implicitly in some doc tables. When in doubt, prefer Prettier's reflow — only override when it materially harms readability.

---

## Webpack build fails with `Module not found: Error: Can't resolve './lib/type'`

**Symptom:**

```
ERROR in ./src/index.ts
Module not found: Error: Can't resolve './lib/type' in '/app/src'
```

**Cause:** the `.ts` extension is missing from the `resolve.extensions` array in `webpack.config.js`, or `node_modules` is stale.

**Fix:**

```bash
rm -rf node_modules dist
npm install
npm run build
```

If still broken, verify `webpack.config.js` has:

```js
resolve: {
  extensions: ['.tsx', '.ts', '.js'],
}
```

That's the default in this repo — don't remove it.

---

## Mocha test passes locally but fails in CI

**Symptom:** `npm run test` is green on your machine, red on GitHub Actions.

**Common causes:**

1. **Different Node version.** CI uses 24.15.0. Run `nvm use 24.15.0` and retry locally
2. **Locale-sensitive output.** If a test compares strings with case differences, the locale matters. Check `LANG` / `LC_ALL`
3. **Date / timezone in tests.** None today; but if you add one, freeze time with a fixed `Date` or use `sinon.useFakeTimers`
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
npm version patch
npm publish
```

If you got here from CI, the `release_and_publish.yml` workflow runs `npm version patch` automatically — this error usually means a previous run published successfully but the workflow continued past the failure. Inspect the published versions on `npmjs.com` and only re-run the workflow if a true publish gap exists.

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
rm -rf dist
npm run build:tsc
```

If the issue persists, restart your editor's TypeScript server. In VS Code: `Cmd/Ctrl+Shift+P` → `TypeScript: Restart TS Server`.

---

## `npm run release` made a tag but CI didn't publish

**Symptom:** running `npm run release` locally creates a commit + tag, but no npm publish happened.

**Cause:** local `npm run release` only bumps the version. The `release_and_publish.yml` workflow triggers on `pull_request closed (merged)`, not on tag push.

**Fix:** push your local commit through a PR to `main`. The merge triggers the workflow, which then runs **another** `npm run release` (so version becomes the next patch, not the one you bumped). To avoid double-bumping:

1. Don't run `npm run release` locally — let CI do it
2. Or coordinate with maintainers to skip the workflow's release step

For minor / major releases, the recommended path is:

1. Manually edit `package.json` version (`npm version minor` or `npm version major`)
2. Coordinate with maintainers — typically by removing the workflow's `npm run release` step in a separate PR for that release window

---

## Mocha hangs at the end with no output

**Symptom:** all tests pass but the process never exits.

**Cause:** an open handle (a `setInterval`, an unclosed file descriptor, a lingering promise). The library is synchronous — this should not happen unless a new feature introduced async work.

**Fix:** add `--exit` to the Mocha invocation:

```bash
npx mocha --require ts-node/register test/**.ts --timeout 25000 --colors --exit
```

Then **find the actual leak** — `--exit` masks bugs. Hunt with:

```bash
npx mocha --require ts-node/register test/**.ts --timeout 25000 --colors --reporter min --exit-after-test
```

If you can't find it, run with Node's `--trace-warnings`:

```bash
node --trace-warnings node_modules/.bin/mocha --require ts-node/register test/**.ts --timeout 25000
```

---

## VS Code shows ESLint errors that don't appear from CLI

**Symptom:** the editor highlights errors that `npm run eslint:check` doesn't report.

**Cause:** the ESLint VS Code extension uses its own lockfile resolution, which can diverge from `npm install` results.

**Fix:**

1. Reload the ESLint extension: `Cmd/Ctrl+Shift+P` → `ESLint: Restart ESLint Server`
2. Verify the extension is reading the right `node_modules`: VS Code Settings → search for `eslint.nodePath` and unset it
3. If the discrepancy persists, run `npm run eslint:check` from the same terminal VS Code launched — that mirrors the extension's environment

---

## Still stuck?

1. Re-read the relevant section of [Environment Setup](ENVIRONMENT_SETUP.md) — most issues come from a missed step
2. Run the sanity-check commands from [Environment Setup → Final sanity checklist](ENVIRONMENT_SETUP.md#final-sanity-checklist) to isolate which layer is broken
3. Try the devcontainer if you were on a native install (or vice versa) — the layer that's broken usually becomes obvious
4. Open an issue with: your `node --version`, your `npm --version`, the failing command's full output, and your platform
