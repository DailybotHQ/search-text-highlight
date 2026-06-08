---
name: fix-build
description: Diagnose and repair a failing Vite or tsc build
type: skill
---

# Skill: `/fix-build`

Diagnose and fix a failing `corepack pnpm run build` (Vite production bundle + declaration emit), `corepack pnpm run build:dev` (Vite development), `corepack pnpm run build:types` (`tsc --emitDeclarationOnly`), or `corepack pnpm run build:tsc` (`tsc --noEmit` type-check).

## When to use

- `corepack pnpm run build` exits non-zero
- CI's `Build application bundle` step is red
- `corepack pnpm run build:tsc` reports type errors
- A dependency bump broke compilation
- The published `dist/` looks corrupt

## Build pipeline (what runs)

| Script        | Command                                                         | Produces                              |
| ------------- | -------------------------------------------------------------- | ------------------------------------- |
| `build`       | `vite build && tsc -p tsconfig.build.json --emitDeclarationOnly` | `dist/index.js` + `dist/**/*.d.ts`    |
| `build:dev`   | `vite build --mode development`                                 | `dist/index.js` (dev mode)            |
| `build:types` | `tsc -p tsconfig.build.json --emitDeclarationOnly`             | `dist/**/*.d.ts`                      |
| `build:tsc`   | `tsc -p tsconfig.build.json --noEmit`                          | nothing (type-check only)             |

Vite (`vite.config.ts`) bundles to a single CommonJS file via esbuild minify, inlining everything so the package keeps zero runtime deps. `tsc` emits the declarations separately. The two stages are independent — a failure tells you which half broke.

## Inputs to confirm

- **Which build is failing** — `build`, `build:dev`, `build:types`, or `build:tsc`
- **The exact error message** — first line of stderr
- **What changed since the last green build** — git log since last passing run

## Procedure

### 1. Reproduce locally

```bash
corepack pnpm run build           # Vite bundle + declarations (full)
# or
corepack pnpm run build:dev       # Vite development mode
# or
corepack pnpm run build:types     # Declarations only
# or
corepack pnpm run build:tsc       # Type-check only (no emit)
```

Isolating the two halves of `build` tells you where to look: if `build:tsc` is green but `build` fails, the problem is in Vite/Rollup; if `build:tsc` fails, it's a type error.

If CI is failing but local is passing, also try:

```bash
rm -rf node_modules dist
corepack pnpm install --frozen-lockfile
corepack pnpm run build
```

This catches issues caused by stale local state.

### 2. Read the error category

Match the failure to one of these patterns:

| Error pattern                                     | Likely cause                                          | Section |
| ------------------------------------------------- | ----------------------------------------------------- | ------- |
| `TS2304: Cannot find name 'X'`                    | Missing import or type                                | A       |
| `TS2339: Property 'X' does not exist on type 'Y'` | Type drift after a change                             | B       |
| `TS2322: Type 'X' is not assignable to type 'Y'`  | Type mismatch — usually validation logic vs interface | B       |
| `[vite]: Rollup failed to resolve import "./X"`   | Wrong import path or missing file                     | C       |
| `error TS6053: File 'X' not found`                | tsconfig include / exclude misconfigured              | C       |
| `Cannot find module 'X'`                          | Missing dependency or wrong `package.json`            | D       |
| `ERR_PNPM_*` / unsupported engine                 | Wrong Node version / pnpm or a refused install script | E       |
| Rollup warning treated as error / unexpected warning | `vite.config.ts` `onwarn` change                   | G       |

### Section A — Missing identifier

```text
src/lib/utils.ts:45:14 - error TS2304: Cannot find name 'newOption'.
```

Steps:

1. Open the offending file at the reported line
2. Check if the name is imported — most often a missed `import` after a refactor
3. If the name is a new option you just added, verify it's declared in `OptionsType` (`src/lib/type.ts`)
4. If the import is correct but TypeScript still doesn't see it, restart the TS server (in your editor) or wipe `dist/` and rebuild

### Section B — Type mismatch

```text
src/lib/utils.ts:45:14 - error TS2339: Property 'wholeWord' does not exist on type 'OptionsType'.
```

Steps:

1. Open `src/lib/type.ts` and confirm the field is declared
2. If you renamed an option, verify every usage was updated — `grep -rn 'oldName' src test`
3. If types diverge between `validate` / `getOptions` / `index.ts`, fix at the type level (don't add `as any` casts)

### Section C — Missing module / path

```text
[vite]: Rollup failed to resolve import "./lib/type" from "src/index.ts"
```

Steps:

1. Check the file exists at the imported path: `ls src/lib/type.ts`
2. Vite resolves `.ts` extensions natively — you don't configure an extensions list as with webpack. If the import has an explicit extension that's wrong (e.g., `./lib/type.js`), drop or correct it
3. Check `tsconfig.build.json` `include`/`exclude` covers the file (it includes `src/**`, excludes `test`)
4. If the file exists but the path is wrong, fix the import — don't suppress with `// @ts-ignore`

### Section D — Missing dependency

```text
Cannot find module '@types/foo' or its corresponding type declarations.
```

Steps:

1. `corepack pnpm install --frozen-lockfile` to refresh `node_modules`
2. If the dep is genuinely new, add it:
   ```bash
   corepack pnpm add -D @types/foo
   ```
3. Verify the dep is now in `package.json`'s `devDependencies` and `pnpm-lock.yaml` is updated
4. Document the new dep in [`docs/TECHNOLOGIES.md`](../../docs/TECHNOLOGIES.md)

### Section E — Wrong Node / pnpm version or refused install script

```text
WARN  Unsupported engine
```

or

```text
ERR_PNPM_IGNORED_BUILDS  Ignored build scripts: esbuild
```

Steps:

1. Check `package.json` `"engines"` — currently `node: >=22.0.0` (the repo develops on 24.16.0, pinned in `.node-version` / `.nvmrc`)
2. Run `node --version` — should satisfy the range
3. If using nvm: `nvm use` (reads `.nvmrc`)
4. Confirm Corepack is enabled and pnpm is the pinned version: `corepack enable && corepack pnpm --version` (expect 11.1.2)
5. If you see `ERR_PNPM_IGNORED_BUILDS` for `esbuild`, that build is already allow-listed in `pnpm-workspace.yaml` (`allowBuilds: { esbuild: true }`). A new tool that needs its install script must be added there deliberately

### Section G — Rollup / Vite warning noise

`vite.config.ts` silences two cosmetic Rollup warnings caused by the intentional dual-export tail in `src/index.ts`:

```ts
onwarn(warning, defaultHandler) {
  if (warning.code === 'COMMONJS_VARIABLE_IN_ESM') return
  if (warning.code === 'MIXED_EXPORTS') return
  defaultHandler(warning)
}
```

These come from `src/index.ts` ending with `module.exports = searchTextHL` — the CommonJS-interop pattern that keeps `require('search-text-highlight').highlight(...)` working alongside the ES default export. The dual-export contract is covered by `test/exports.test.ts` (a static source check plus a built-bundle smoke test).

Steps:

1. If a build suddenly surfaces `COMMONJS_VARIABLE_IN_ESM` or `MIXED_EXPORTS`, confirm the `onwarn` handler in `vite.config.ts` is intact — a refactor may have dropped it
2. **Don't** remove the `module.exports = searchTextHL` tail to silence the warning — that breaks CJS consumers. Keep the tail and the `onwarn` filter together
3. For any *other* warning code, fix the underlying cause rather than adding it to the `onwarn` ignore list

### 3. Apply the fix

Make the smallest change that resolves the error. Don't bundle unrelated cleanups into a build-fix PR — they make the diff harder to review.

### 4. Verify the full chain

```bash
corepack pnpm run biome:check
corepack pnpm run build:tsc
corepack pnpm run test
corepack pnpm run build
```

All four must pass. If you fixed `corepack pnpm run build` but broke `corepack pnpm run test`, you didn't really fix the build — re-iterate. Note `test/exports.test.ts` runs the dual-export smoke test only when `dist/` is fresh, so run `build` before `test` if you want that suite to exercise the bundle.

### 5. Investigate the root cause

A build-failing PR shouldn't have made it past local testing. Ask:

- Was the original change in a file that the local build didn't touch? (e.g., a doc change with an accidental import)
- Was the local node / pnpm store stale and hiding the issue?
- Was a CI-only step (e.g., `corepack pnpm pack --dry-run`) failing for a different reason?

If the root cause is "I forgot to run the full chain locally," update the PR's Pre-Commit Checklist to reinforce the missing step.

### 6. Commit

```bash
git add <fixed-files>
git commit -m "fix: <one-line description of the fix>"
```

Use `fix:` for genuine bugs, `build:` for tooling-only fixes (e.g., `vite.config.ts` or `tsconfig.build.json` updates).

## Common pitfalls

### Suppressing instead of fixing

```ts
// bad
// @ts-ignore
const x = someFunc()
```

`@ts-ignore` masks the real problem. Fix the root cause: a missing type, a wrong import, or a type assertion that's actually needed (and should use `as Type` with a comment explaining why).

### Disabling a lint rule mid-file

```ts
// bad
// biome-ignore lint: ...
```

If a rule is wrong for the codebase, update `biome.json` deliberately. One-off suppressions need a documented reason.

### Editing `dist/`

`dist/` is regenerated on every build. Never edit it directly — your changes will vanish.

### Removing the dual-export tail

`src/index.ts` ends with `module.exports = searchTextHL`. It looks redundant next to the ES default export, but it's load-bearing for CJS `require(...)` consumers. Keep it — the Rollup warnings it triggers are already filtered in `vite.config.ts`.

### Reverting unrelated changes

If the build was already red on `main`, fix that first in a separate PR. Don't include unrelated reverts in your build-fix PR.

## Verification checklist

- [ ] Reproduced the failure locally
- [ ] Identified the error category (A-E, G)
- [ ] Applied the smallest fix that addresses the root cause
- [ ] Full check chain passes (`biome:check`, `build:tsc`, `test`, `build`)
- [ ] No `@ts-ignore` / `biome-ignore` added
- [ ] `vite.config.ts` `onwarn` filter and the `module.exports` tail both intact
- [ ] `dist/` not committed
- [ ] Conventional commit message (`fix:` or `build:`)
