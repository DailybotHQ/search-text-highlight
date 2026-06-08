---
name: toolchain-migration
description: Playbook for migrating this library's build toolchain — Webpack→Vite, Mocha+Chai→Vitest, ESLint+Prettier→Biome, npm→pnpm — preserving the published CJS/ESM contract, with the non-obvious gotchas recorded
type: skill
---

# Skill: `/toolchain-migration`

A reference playbook for migrating `search-text-highlight` (or a fork) from the legacy
toolchain to the current one: **Webpack → Vite**, **Mocha + Chai → Vitest**,
**ESLint + Prettier → Biome**, and **npm → pnpm**. It records the exact steps **and the
non-obvious gotchas** discovered during the real migration (`PLAN_migrate_vite_biome_pnpm`)
so the next one is faster and avoids the traps.

> The package is still **published to the npm registry** and keeps its identical public
> contract (`searchTextHL.highlight(...)`, default options, the
> `<span class="text-highlight">…</span>` HTML, dual CJS/ESM export, **zero runtime
> deps**). This migration only changes dev/build/test/release tooling. Companion skills:
> [`/lint-fix`](./lint-fix.md), [`/fix-build`](./fix-build.md), [`/bump-deps`](./bump-deps.md),
> [`/release`](./release.md).

## When to use

- Replaying this migration on a fork, or auditing/repairing any one leg of it.
- Onboarding to why the repo looks the way it does (Vite + Vitest + Biome + pnpm).

## The model

- **Bundler:** Vite 8 library mode (`vite.config.ts`, `formats: ['cjs']`, esbuild
  minify). Declarations come separately from `tsc -p tsconfig.build.json
  --emitDeclarationOnly` — Vite/rolldown does not emit `.d.ts`.
- **Tests:** Vitest 4 (`vitest.config.ts`, node env), specs `import { describe, it,
  expect } from 'vitest'`. A `test/exports.test.ts` guards the dual export (static
  source check + built-bundle `require()` smoke that self-skips when `dist/` is stale).
- **Lint/format:** Biome 2.4 (`biome.json`) — one tool. Style: `semicolons:'asNeeded'`,
  `quoteStyle:'single'`, `trailingCommas:'es5'`, `lineWidth:120`, `noConsole:'error'`
  (off in `test/**`).
- **Package manager:** pnpm 11.x via Corepack — `"packageManager":"pnpm@X.Y.Z"`,
  `pnpm-lock.yaml`, supply-chain guards in `pnpm-workspace.yaml`, npm→pnpm redirect in
  the devcontainer, `corepack pnpm publish --no-git-checks` via a Node-based
  `prepare_release.sh`. Rationale: <https://xergioalex.com/blog/supply-chain-attacks-ai-era/>

## Order of operations (one branch, sequential)

1. **Baseline first.** `npm pack` the *current published* artifact and record sizes +
   the exact HTML output for a handful of inputs. This is your byte-identity target.
2. **Biome** (replace ESLint+Prettier): add `biome.json`, swap scripts to
   `biome:check`/`biome:fix`/`biome:fix:unsafe`, delete the old configs, `biome check
   --write` → expect only idiomatic `import type` fixes.
3. **Vite** (replace Webpack): add `vite.config.ts` + `tsconfig.build.json`, rewire
   `build`/`build:dev`/`build:types`/`build:tsc`, delete `webpack.config.js`.
4. **Vitest** (replace Mocha+Chai): add `vitest.config.ts`, convert specs, add the
   dual-export smoke, drop mocha/chai/ts-node and `"mocha"` from tsconfig `types`.
5. **pnpm**: pin `packageManager`, add `pnpm-workspace.yaml`, `.node-version`/`.nvmrc`,
   `pnpm import` → `pnpm-lock.yaml`, delete `package-lock.json`, migrate Docker + CI +
   release to `corepack pnpm`.
6. **Verify** parity (`pnpm pack` vs the Task-1 baseline) and sweep docs.

## Non-obvious gotchas (the reason this skill exists)

- **Vite 8 needs `esbuild` as an explicit devDep.** It's an optional peer now;
  `minify:'esbuild'` fails with `Cannot find package 'esbuild'` otherwise. Add it, and
  list `allowBuilds: { esbuild: true }` in `pnpm-workspace.yaml` (esbuild has an install
  script pnpm 11 blocks by default).
- **Keep the package CommonJS.** Do *not* add `"type":"module"` — `dist/index.js` must
  resolve as CJS so the `module.exports = searchTextHL` tail is honored by `require()`.
- **Wrap the dual-export tail in try/catch.** `module.exports = searchTextHL` throws
  under Vitest's ESM transform (`Cannot set property default … only a getter`). Wrap it
  so it no-ops under ESM while the published CJS bundle keeps the working `require()`
  shape.
- **Silence cosmetic Rollup warnings** in `vite.config.ts` `onwarn`:
  `COMMONJS_VARIABLE_IN_ESM` and `MIXED_EXPORTS` come from that tail and are harmless.
- **Use a `"files": ["dist"]` allowlist** in `package.json` instead of relying on
  `.npmignore`. The old denylist did not exclude `tmp/`/`.dwp/`, so any scratch content
  ballooned the tarball (a 150 MB pack was observed). The allowlist is fail-safe.
- **`minimumReleaseAge` blocks brand-new versions.** Creating the lockfile can fail with
  `ERR_PNPM_NO_MATURE_MATCHING_VERSION` when a pinned dev dep is <7 days old. Create the
  lockfile once with `--config.minimumReleaseAge=0`; the committed guard stays at
  `10080` and frozen installs respect the existing lockfile thereafter.
- **Release bumps with Node, not `pnpm version`.** `pnpm version` runs `git status` up
  front and fails (`ERR_PNPM_UNCLEAN_WORKING_TREE`) when install scripts left transient
  artifacts in CI. Use `.github/scripts/prepare_release.sh` (Node patch bump → commit →
  tag), writing `JSON.stringify(pkg,null,2)+'\n'` so the result stays Biome-clean.
- **npm→pnpm redirect ordering in the Dockerfile.** Install global npm CLIs (e.g.
  `@openai/codex`) *before* replacing `/usr/local/bin/npm` with the `corepack pnpm`
  wrapper, or the build breaks.
- **Biome + case-mismatched dirs.** If git tracks a directory in a different case than
  the filesystem (e.g. `docker/local/searchTextHL` vs `searchtexthl`), Biome's
  git-ignore traversal can crash with an io error. Exclude non-source dirs
  (`!**/docker`, `!**/.github`) from `biome.json` `includes`.

## Validation gate (after every step)

`corepack pnpm run biome:check` + `corepack pnpm test` + `corepack pnpm run build` +
`corepack pnpm run build:tsc`. Always re-confirm the published `dist/index.js` emits
byte-identical HTML and that `require()` + `import` both expose `.highlight`.
