---
name: fix-build
description: Diagnose and repair a failing webpack or tsc build
type: skill
---

# Skill: `/fix-build`

Diagnose and fix a failing `npm run build` (webpack production), `npm run build:dev` (webpack development), or `npm run build:tsc` (`tsc --build`).

## When to use

- `npm run build` exits non-zero
- CI's `Build application bundle` step is red
- `npm run build:tsc` reports type errors
- A dependency bump broke compilation
- The published `dist/` looks corrupt

## Inputs to confirm

- **Which build is failing** — webpack production, webpack dev, or tsc
- **The exact error message** — first line of stderr
- **What changed since the last green build** — git log since last passing run

## Procedure

### 1. Reproduce locally

```bash
npm run build           # Webpack production
# or
npm run build:dev       # Webpack development (more verbose, source maps)
# or
npm run build:tsc       # Type-check + emit declarations
```

If CI is failing but local is passing, also try:

```bash
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

This catches issues caused by stale local state.

### 2. Read the error category

Match the failure to one of these patterns:

| Error pattern                                     | Likely cause                                          | Section |
| ------------------------------------------------- | ----------------------------------------------------- | ------- |
| `TS2304: Cannot find name 'X'`                    | Missing import or type                                | A       |
| `TS2339: Property 'X' does not exist on type 'Y'` | Type drift after a change                             | B       |
| `TS2322: Type 'X' is not assignable to type 'Y'`  | Type mismatch — usually validation logic vs interface | B       |
| `Module not found: Error: Can't resolve './X'`    | Wrong import path or missing file                     | C       |
| `error TS6053: File 'X' not found`                | tsconfig include / exclude misconfigured              | C       |
| `Module build failed` from ts-loader              | TypeScript error surfaced by webpack                  | A or B  |
| `Cannot find module 'X'`                          | Missing dependency or wrong `package.json`            | D       |
| `npm error EBADPLATFORM`                          | Wrong Node version / OS                               | E       |
| `Cannot find module 'ts-node/register'`           | Partial install                                       | F       |

### Section A — Missing identifier

```
src/lib/utils.ts:45:14 - error TS2304: Cannot find name 'newOption'.
```

Steps:

1. Open the offending file at the reported line
2. Check if the name is imported — most often a missed `import` after a refactor
3. If the name is a new option you just added, verify it's declared in `OptionsType` (`src/lib/type.ts`)
4. If the import is correct but TypeScript still doesn't see it, restart the TS server (in your editor) or wipe `dist/` and rebuild

### Section B — Type mismatch

```
src/lib/utils.ts:45:14 - error TS2339: Property 'wholeWord' does not exist on type 'OptionsType'.
```

Steps:

1. Open `src/lib/type.ts` and confirm the field is declared
2. If you renamed an option, verify every usage was updated — `grep -rn 'oldName' src test`
3. If types diverge between `validate` / `getOptions` / `index.ts`, fix at the type level (don't add `as any` casts)

### Section C — Missing module / path

```
Module not found: Error: Can't resolve './lib/type' in '/app/src'
```

Steps:

1. Check the file exists at the imported path: `ls src/lib/type.ts`
2. Check `webpack.config.js` `resolve.extensions` includes `.ts`:
   ```js
   resolve: {
     extensions: ['.tsx', '.ts', '.js']
   }
   ```
3. Check `tsconfig.json` `include`/`exclude` covers the file
4. If the file exists but the path is wrong, fix the import — don't suppress with `// @ts-ignore`

### Section D — Missing dependency

```
Cannot find module '@types/foo' or its corresponding type declarations.
```

Steps:

1. `npm install` to refresh `node_modules`
2. If still missing, install the type package:
   ```bash
   npm install --save-dev @types/foo
   ```
3. Verify the dep is now in `package.json`'s `devDependencies` and `package-lock.json` is updated
4. Document the new dep in [`docs/TECHNOLOGIES.md`](../../docs/TECHNOLOGIES.md)

### Section E — Wrong Node version

```
npm error EBADPLATFORM
```

or

```
npm warn EBADENGINE Unsupported engine
```

Steps:

1. Check `package.json` `"engines"` — currently `node: 24.15.0`
2. Run `node --version` — should match
3. If using nvm: `nvm use 24.15.0`
4. CI runs on 24.15.0; match locally

### Section F — Partial install

```
Error: Cannot find module 'ts-node/register'
```

Steps:

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

If the issue persists, the npm registry may be down — check `https://status.npmjs.org/`.

### 3. Apply the fix

Make the smallest change that resolves the error. Don't bundle unrelated cleanups into a build-fix PR — they make the diff harder to review.

### 4. Verify the full chain

```bash
npm run eslint:check
npm run prettier:check
npm run build:tsc
npm run test
npm run build
```

All five must pass. If you fixed `npm run build` but broke `npm run test`, you didn't really fix the build — re-iterate.

### 5. Investigate the root cause

A build-failing PR shouldn't have made it past local testing. Ask:

- Was the original change in a file that the local build didn't touch? (e.g., a doc change with an accidental import)
- Was the local Node / npm cache stale and hiding the issue?
- Was a CI-only step (e.g., `npm pack --dry-run`) failing for a different reason?

If the root cause is "I forgot to run the full chain locally," update the PR's Pre-Commit Checklist to reinforce the missing step.

### 6. Commit

```bash
git add <fixed-files>
git commit -m "fix: <one-line description of the fix>"
```

Use `fix:` for genuine bugs, `build:` for tooling-only fixes (e.g., `webpack.config.js` updates).

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
/* eslint-disable */
```

If a rule is wrong for the codebase, update `eslint.config.mjs`. If it's a one-line exception, use the per-line `// eslint-disable-line <rule>` form (the existing tests use this idiom for `: any`).

### Editing `dist/`

`dist/` is regenerated on every build. Never edit it directly — your changes will vanish.

### Reverting unrelated changes

If the build was already red on `main`, fix that first in a separate PR. Don't include unrelated reverts in your build-fix PR.

## Verification checklist

- [ ] Reproduced the failure locally
- [ ] Identified the error category (A-F)
- [ ] Applied the smallest fix that addresses the root cause
- [ ] Full check chain passes (`eslint:check`, `prettier:check`, `build:tsc`, `test`, `build`)
- [ ] No `@ts-ignore` / `eslint-disable` added
- [ ] `dist/` not committed
- [ ] Conventional commit message (`fix:` or `build:`)
