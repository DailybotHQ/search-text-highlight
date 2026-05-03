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
npm run eslint:check && \
  npm run prettier:check && \
  npm run build:tsc && \
  npm run test && \
  npm run build
```

Each step gates the next — the chain stops on first failure.

## Order rationale

1. **`eslint:check`** — fast, catches obvious bugs and style issues
2. **`prettier:check`** — fast, catches formatting drift
3. **`build:tsc`** — type-check; surfaces type errors before bundling
4. **`test`** — runs the Mocha suite via ts-node
5. **`build`** — webpack production bundle; final verification that the bundle compiles

If you want the auto-fixing variant first, run `lint-fix` (the `/lint-fix` skill) before this command.

## Expected output

```
> search-text-highlight@2.0.8 eslint:check
> eslint --ext .ts --ignore-path .gitignore .

> search-text-highlight@2.0.8 prettier:check
> prettier -c --ignore-path .gitignore '**/*.{css,html,js,ts,json,md,yaml,yml}' '!package.json'

Checking formatting...
All matched files use Prettier code style!

> search-text-highlight@2.0.8 build:tsc
> tsc --build tsconfig.json

> search-text-highlight@2.0.8 test
> mocha --require ts-node/register test/**.ts --timeout 25000 --colors

  Test search text highlight
    ✔ should highlight one query substring
    ...

  9 passing (15ms)

> search-text-highlight@2.0.8 build
> webpack --mode production --progress

asset index.js 1.34 KiB [emitted]
webpack 5.93.0 compiled successfully
```

## On failure

| Failed step      | Skill / next action                                      |
| ---------------- | -------------------------------------------------------- |
| `eslint:check`   | Run `/lint-fix`, then re-run `/verify`                   |
| `prettier:check` | Run `/lint-fix`, then re-run `/verify`                   |
| `build:tsc`      | See `/fix-build` skill                                   |
| `test`           | Investigate the failing test; if a regression, add a fix |
| `build`          | See `/fix-build` skill                                   |

## Don't

- Skip a step ("the lint just had a small thing")
- Run only `npm run test` and call it done
- Push to a branch without running this locally first

## Do

- Run this before every push
- Run inside the devcontainer for CI parity if a flake reproduces locally
- Pair with `pack-check` (the `/pack-check` command) before a release

## Variants

- **Quick** (skip the production bundle): `npm run eslint:check && npm run prettier:check && npm run build:tsc && npm run test`
- **Full** (include `npm pack --dry-run`): everything above + `npm pack --dry-run`

## See also

- [`/lint-fix`](../skills/lint-fix.md) — auto-fix lint and format
- [`/fix-build`](../skills/fix-build.md) — diagnose build failures
- [`/pack-check`](pack-check.md) — verify the publishable tarball
- [`/ci-reproduce`](ci-reproduce.md) — match a specific CI step locally
