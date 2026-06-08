---
name: pack-check
description: Inspect what pnpm pack would publish
type: command
---

# Command: `pack-check`

Verify the npm tarball that would ship to consumers. Use before a release, after editing the `files` whitelist in `package.json`, or after a Vite / `tsc` build-config change.

## Invocation

| Host                    | Form             |
| ----------------------- | ---------------- |
| Claude Code             | `/pack-check`    |
| Codex / Cursor / Gemini | `#pack-check`    |
| Plain text              | "run pack-check" |

## What it does

```bash
corepack pnpm run build && corepack pnpm pack --dry-run
```

Builds the production bundle (`vite build` + declaration emit), then asks pnpm to list (without producing) every file that would land in the tarball.

> **Publishing is whitelist-driven.** `package.json` declares `"files": ["dist"]`, so only `dist/` (plus the always-included `package.json`, `README.md`, and `LICENSE`) ships. There is no `.npmignore` to maintain — to change what publishes, edit the `files` array.

## Expected output

```text
> search-text-highlight@2.1.3 build
> vite build && tsc -p tsconfig.build.json --emitDeclarationOnly
✓ built in Xms

npm notice 📦  search-text-highlight@2.1.3
npm notice === Tarball Contents ===
npm notice 1.0kB LICENSE
npm notice 5.1kB README.md
npm notice 1.4kB dist/index.d.ts
npm notice  ... dist/lib/type.d.ts
npm notice  ... dist/lib/utils.d.ts
npm notice 12.3kB dist/index.js
npm notice 2.5kB package.json
npm notice === Tarball Details ===
npm notice name:          search-text-highlight
npm notice version:       2.1.3
npm notice total files:   ...
```

## What you're looking for

The tarball should contain the manifest files plus the `dist/` tree:

1. `package/LICENSE`
2. `package/README.md`
3. `package/package.json`
4. `package/dist/index.js` (the Vite CommonJS bundle)
5. `package/dist/index.d.ts` and the `package/dist/lib/*.d.ts` declarations (emitted by `tsc -p tsconfig.build.json --emitDeclarationOnly`)

## Red flags

| File you see                | Problem                                                          |
| --------------------------- | ---------------------------------------------------------------- |
| `package/src/...`           | Source TypeScript leaked — the `files` whitelist is too broad    |
| `package/test/...`          | Test files leaked — the `files` whitelist is too broad           |
| `package/.github/...`       | Workflows leaked — the `files` whitelist is too broad            |
| `package/docs/...`          | Docs leaked — the `files` whitelist is too broad                 |
| `package/tmp/...`           | Scratch leaked — the `files` whitelist is too broad              |
| `package/dist/index.js.map` | Source maps leaked — Vite is configured `sourcemap: false`; investigate |
| Missing `dist/index.d.ts`   | Declaration emit broke — run `corepack pnpm run build:types`     |
| Missing `dist/index.js`     | Vite didn't produce output — run `/fix-build`                    |

## Bundle-size targets

| Target                    | Threshold |
| ------------------------- | --------- |
| `dist/index.js` (raw)     | <2 KB     |
| `dist/index.js` (gzipped) | <1 KB     |
| Total tarball size        | <30 KB    |

If you exceed targets:

```bash
corepack pnpm run build
ls -lh dist/
gzip -c dist/index.js | wc -c
```

Investigate before releasing — almost always an accidental dep import or a Vite config drift (e.g., an accidental `rollupOptions.external` change that stopped inlining).

## Adjusting what publishes

Publishing is controlled by the `files` array in `package.json`:

```json
"files": [
  "dist"
]
```

To exclude something inside `dist/` or add another top-level path, edit this array — not a `.npmignore`. Re-run `pack-check` and confirm only the intended files are listed.

## Don't

- Skip the `corepack pnpm run build` step — `pnpm pack` doesn't rebuild for you
- Edit `dist/` files manually before packing — they'll be overwritten on the next build
- Trust an old `dist/` — always rebuild before checking
- Publish without running this command first

## Do

- Run before every release
- Run after editing the `files` whitelist in `package.json`
- Run after editing `vite.config.ts` or `tsconfig.build.json`
- Compare output against the previous release if size unexpectedly changed

## See also

- [`/release`](../skills/release.md) — the full release workflow
- [`/verify`](verify.md) — full pre-push check chain
- [`docs/BUILD_DEPLOY.md`](../../docs/BUILD_DEPLOY.md) — release pipeline
