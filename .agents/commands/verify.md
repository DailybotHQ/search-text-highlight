---
name: verify
description: Run the full pre-push check chain locally
type: command
---

# Command: `verify`

Run every check that CI runs, in the same order. Use this before opening a PR or merging.

## Invocation

| Host                    | Form         |
| ----------------------- | ------------ |
| Claude Code             | `/verify`    |
| Codex / Cursor / Gemini | `#verify`    |
| Plain text              | "run verify" |

## What it does

```bash
corepack pnpm run biome:check && \
  corepack pnpm run build:tsc && \
  corepack pnpm run test && \
  corepack pnpm run build
```

Each step gates the next — the chain stops on first failure.

## Order rationale

1. **`biome:check`** — fast, catches lint issues and formatting drift in one pass
2. **`build:tsc`** — `tsc -p tsconfig.build.json --noEmit`; type-check before bundling
3. **`test`** — runs the Vitest suite (`vitest run`)
4. **`build`** — `vite build && tsc -p tsconfig.build.json --emitDeclarationOnly`; final verification that the bundle and declarations compile

If you want the auto-fixing variant first, run `lint-fix` (the `/lint-fix` skill) before this command.

## Expected output

```text
> search-text-highlight@2.1.3 biome:check
> biome check

Checked N files in Xms. No fixes needed.

> search-text-highlight@2.1.3 build:tsc
> tsc -p tsconfig.build.json --noEmit

> search-text-highlight@2.1.3 test
> vitest run

 ✓ test/main.test.ts (N tests)
 ✓ test/exports.test.ts (N tests)

 Test Files  2 passed
      Tests  N passed

> search-text-highlight@2.1.3 build
> vite build && tsc -p tsconfig.build.json --emitDeclarationOnly

vite vX.Y.Z building for production...
✓ built in Xms
dist/index.js  ...
```

## On failure

| Failed step  | Skill / next action                                       |
| ------------ | --------------------------------------------------------- |
| `biome:check` | Run `/lint-fix`, then re-run `/verify`                    |
| `build:tsc`  | See `/fix-build` skill                                    |
| `test`       | Investigate the failing test; if a regression, add a fix  |
| `build`      | See `/fix-build` skill                                    |

## Don't

- Skip a step ("the lint just had a small thing")
- Run only `corepack pnpm run test` and call it done
- Push to a branch without running this locally first

## Do

- Run this before every push
- Run inside the devcontainer for CI parity if a flake reproduces locally
- Pair with `pack-check` (the `/pack-check` command) before a release

## Variants

- **Quick** (skip the production bundle): `corepack pnpm run biome:check && corepack pnpm run build:tsc && corepack pnpm run test`
- **Full** (include the tarball preview): everything above + `corepack pnpm pack --dry-run`

## See also

- [`/lint-fix`](../skills/lint-fix.md) — auto-fix lint and format
- [`/fix-build`](../skills/fix-build.md) — diagnose build failures
- [`/pack-check`](pack-check.md) — verify the publishable tarball
- [`/ci-reproduce`](ci-reproduce.md) — match a specific CI step locally
