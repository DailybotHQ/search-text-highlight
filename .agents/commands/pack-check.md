---
name: pack-check
description: Inspect what npm pack would publish
type: command
---

# Command: `pack-check`

Verify the npm tarball that would ship to consumers. Use before a release, after editing `.npmignore`, or after a webpack config change.

## Invocation

| Host                    | Form             |
| ----------------------- | ---------------- |
| Claude Code             | `/pack-check`    |
| Codex / Cursor / Gemini | `#pack-check`    |
| Plain text              | "run pack-check" |

## What it does

```bash
npm run build && npm pack --dry-run
```

Builds the production bundle, then asks npm to list (without producing) every file that would land in the tarball.

## Expected output

```
> search-text-highlight@2.0.8 build
> webpack --mode production --progress
asset index.js 1.34 KiB [emitted]
webpack compiled successfully

npm notice
npm notice 📦  search-text-highlight@2.0.8
npm notice === Tarball Contents ===
npm notice 1.0kB LICENSE
npm notice 5.1kB README.md
npm notice 1.4kB dist/index.d.ts
npm notice 12.3kB dist/index.js
npm notice 2.5kB package.json
npm notice === Tarball Details ===
npm notice name:          search-text-highlight
npm notice version:       2.0.8
npm notice filename:      search-text-highlight-2.0.8.tgz
npm notice package size:  10.0kB
npm notice unpacked size: 22.4kB
npm notice shasum:        ...
npm notice integrity:     sha512-...
npm notice total files:   5
```

## What you're looking for

The tarball should contain exactly five files:

1. `package/LICENSE`
2. `package/README.md`
3. `package/package.json`
4. `package/dist/index.js`
5. `package/dist/index.d.ts`

## Red flags

| File you see                | Problem                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| `package/src/...`           | Source TypeScript leaked — update `.npmignore`                   |
| `package/test/...`          | Test files leaked — update `.npmignore`                          |
| `package/.github/...`       | Workflows leaked — update `.npmignore`                           |
| `package/docs/...`          | Docs leaked — update `.npmignore`                                |
| `package/tmp/...`           | Scratch leaked — update `.npmignore` (and check `tmp/` itself)   |
| `package/dist/index.js.map` | Source maps leaked — fine for development, debate for production |
| Missing `dist/index.d.ts`   | Declaration emit broke — run `npm run build:tsc`                 |
| Missing `dist/index.js`     | Webpack didn't produce output — run `/fix-build`                 |

## Bundle-size targets

| Target                    | Threshold |
| ------------------------- | --------- |
| `dist/index.js` (raw)     | <2 KB     |
| `dist/index.js` (gzipped) | <1 KB     |
| Total tarball size        | <30 KB    |

If you exceed targets:

```bash
npm run build
ls -lh dist/
gzip -c dist/index.js | wc -c
```

Investigate before releasing — almost always an accidental dep import or a webpack config drift.

## Updating `.npmignore`

If a file shouldn't ship, add it to `.npmignore`:

```
# .npmignore
.github
.devcontainer
.devcontainer_example
docker
docs
src
test
tmp
.babelrc
.editorconfig
eslint.config.mjs
.gitignore
.ncurc.json
.prettierrc
package-lock.json
tsconfig.json
webpack.config.js
.travis.yml
get_github_release_log.sh
git_logs_output.txt
git_logs.txt
```

Re-run `pack-check` and confirm only the five canonical files are listed.

## Don't

- Skip the `npm run build` step — `npm pack` doesn't rebuild for you
- Edit `dist/` files manually before packing — they'll be overwritten on the next build
- Trust an old `dist/` — always rebuild before checking
- Publish without running this command first

## Do

- Run before every release
- Run after editing `.npmignore`
- Run after editing `webpack.config.js` or `tsconfig.json`
- Compare output against the previous release if size unexpectedly changed

## See also

- [`/release`](../skills/release.md) — the full release workflow
- [`/verify`](verify.md) — full pre-push check chain
- [`docs/BUILD_DEPLOY.md`](../../docs/BUILD_DEPLOY.md) — release pipeline
