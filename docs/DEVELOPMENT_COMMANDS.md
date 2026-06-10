# Development Commands

Reference for every pnpm script and shell command you'll run during day-to-day development. All scripts are defined in [`package.json`](../package.json) and are reproduced verbatim here so you don't have to dig.

> **Package manager:** this repo uses **pnpm via Corepack**. Run scripts as `pnpm run <name>` (or `corepack pnpm run <name>` if you haven't enabled Corepack). Inside the devcontainer a bare `npm` is routed to `corepack pnpm`, so `npm run ...` still works there. Never install pnpm globally — Corepack pins the version from `package.json`'s `packageManager` field.

## Inner-loop favorites

| Goal                        | Command                | Notes                                                            |
| --------------------------- | ---------------------- | --------------------------------------------------------------- |
| Iterate on logic            | `pnpm run test:watch`  | Vitest watch mode — re-runs affected specs on save              |
| Run the source directly     | `pnpm run dev`         | `nodemon --exec tsx src/index.ts` — useful for ad-hoc experiments |
| Lint + format in one go     | `pnpm run biome:fix`   | Biome `check --write` — almost always the right pre-commit step |
| Type-check without a bundle | `pnpm run build:tsc`   | `tsc -p tsconfig.build.json --noEmit` — fastest type-error pass |
| One-shot tests              | `pnpm run test`        | `vitest run` — same command CI runs                            |

## Develop

```bash
corepack pnpm install --frozen-lockfile   # Install all dependencies from the committed pnpm-lock.yaml
pnpm run dev                              # Run src/index.ts under nodemon + tsx (auto-restart on change)
pnpm run start                            # Execute the built dist/index.js (verifies the bundle works)
```

`pnpm run dev` is useful when you want to import the library into a quick scratch script in `tmp/` and iterate.

## Test

```bash
pnpm run test            # vitest run (one shot)
pnpm run test:watch      # vitest  — re-runs affected specs on src/ or test/ change
```

Run a single test file:

```bash
pnpm vitest run test/main.test.ts
```

Run a single `it(...)` block by description (Vitest's `-t` / `--testNamePattern`):

```bash
pnpm test -- -t "should highlight an unicode substring"
# or, equivalently:
pnpm vitest run -t "should highlight an unicode substring"
```

Reports go to stdout. Vitest's default reporter is enough; add a JUnit/HTML reporter via `vitest.config.ts` when CI needs it and document it here.

## Lint and format

Biome is a single tool for both linting and formatting:

```bash
pnpm run biome:check        # Lint + format check (read-only) — what CI runs
pnpm run biome:fix          # Lint + format with safe auto-fixes (check --write)
pnpm run biome:fix:unsafe   # Adds Biome's unsafe fixes (review the diff carefully)
```

Scope and rules live in `biome.json`. It checks `src/`, `test/`, and root `*.ts` / `*.mjs` / `*.json` files, ignoring `dist/`, `node_modules/`, lockfiles, and a few infra paths.

## Build

```bash
pnpm run build            # Vite library bundle (dist/index.js) + tsc declarations (dist/*.d.ts)
pnpm run build:dev        # Vite development-mode bundle (vite build --mode development)
pnpm run build:types      # Declarations only (tsc -p tsconfig.build.json --emitDeclarationOnly)
pnpm run build:tsc        # Type-check only, no emit (tsc -p tsconfig.build.json --noEmit)
```

`pnpm run build` is the published artifact: Vite emits the minified CommonJS bundle, then `tsc` emits the `.d.ts` files. `build:tsc` is the fast type-check used during development and as a pre-commit gate.

After a build, inspect the bundle:

```bash
ls -lh dist/
node dist/index.js       # Sanity check — should be a no-op (no top-level execution)
```

## Maintenance

```bash
pnpm run ncu:check        # List packages with newer versions, honoring .ncurc.json reject list
pnpm run ncu:upgrade      # Apply upgrades to package.json (then run install + tests)
pnpm run release          # .github/scripts/prepare_release.sh — patch bump, release commit + tag
corepack pnpm install     # Refresh pnpm-lock.yaml after manual edits to package.json
```

`.ncurc.json` records the project's upgrade policy — see [Technologies](TECHNOLOGIES.md) for the rationale.

## Inspect npm package contents

Before publishing, verify the tarball doesn't accidentally include source or test files:

```bash
corepack pnpm pack --dry-run
```

Expected output: only `dist/`, `package.json`, `README.md`, and `LICENSE` are listed. The `files: ["dist"]` allowlist in `package.json` is the primary control — if anything else appears, tighten it (or add a `.npmignore` entry).

## Common workflows

### Add a new option

1. Update `OptionsType` in `src/lib/type.ts`
2. Extend `Utils.validate.options` in `src/lib/utils.ts`
3. Add the default to `Utils.getOptions`
4. Use the option in `src/index.ts`
5. Add a Vitest spec in `test/main.test.ts`
6. Update [API Reference](API_REFERENCE.md) and the README options table
7. Run the full chain: `pnpm run biome:fix && pnpm run build:tsc && pnpm run test && pnpm run build`

The `/add-option` skill walks through this end-to-end — see [.agents/skills/add-option.md](../.agents/skills/add-option.md).

### Bump a dependency

1. `pnpm run ncu:check` to see what's outdated
2. `pnpm run ncu:upgrade` (or edit `package.json` for one specific package)
3. `corepack pnpm install` to refresh `pnpm-lock.yaml`
4. Run the full check chain
5. Commit `package.json` **and** `pnpm-lock.yaml` together

### Reset a stuck environment

```bash
rm -rf node_modules dist
corepack pnpm install --frozen-lockfile
pnpm run build:tsc       # Type-check
pnpm run test            # Tests
```

If the issue persists, also prune the pnpm store:

```bash
corepack pnpm store prune
```

### Compare a local change against the published version

```bash
corepack pnpm view search-text-highlight version
git diff v$(corepack pnpm view search-text-highlight version) -- src/
```

### Use the devcontainer aliases

Inside the devcontainer (`docker exec -it searchtexthl bash`), `docker/custom_commands.sh` sources into your shell. Helpers map directly to this repo’s pnpm scripts (a bare `npm` is also routed to `corepack pnpm` inside the container):

```bash
help                     # Welcome + command list
install                  # → corepack pnpm install
check                    # → biome:check (read-only)
fix                      # → biome:fix
typecheck                # → pnpm run build:tsc
test                     # → pnpm run test
build                    # → pnpm run build (Vite + tsc declarations)
codecheck                # Full chain: biome:check + build:tsc + test + build (read-only)
claudex                  # Claude Code with skip-permissions
codexx                   # OpenAI Codex with bypass-approvals
cursorx                  # Cursor CLI agent with --force
```

`codecheck` is the one-shot equivalent of running the pre-push checklist in [AGENTS.md](../AGENTS.md).

## Useful flags

| Flag                       | What it does                          | When to use                      |
| -------------------------- | ------------------------------------- | -------------------------------- |
| `pnpm --silent`            | Suppress pnpm's own output noise      | Wrapping a command in CI logs    |
| `vitest --reporter=verbose`| Detailed per-test output              | Local debugging                  |
| `vitest --reporter=dot`    | Single-line output                    | CI summary                       |
| `vitest --bail=1`          | Stop on first failure                 | Long suites                      |
| `vitest run -t "<text>"`   | Run only matching tests by name       | Targeted debugging               |
| `vite build --mode development` | Skip minification, keep readable output | Inspecting bundle output    |
| `tsc --listFiles`          | Print every file the compiler touches | Tracing why a file won't compile |
| `tsc -p tsconfig.build.json --noEmit` | Type-check without writing dist/ | Pre-commit gate           |

## CI invocations

The CI runs the same scripts you run locally — there's no CI-only command. See [CI/CD Guide](CI_CD.md) for which workflow runs which step.

## Pre-push checklist

```bash
pnpm run biome:check && \
  pnpm run build:tsc && \
  pnpm run test && \
  pnpm run build
```

If all four pass, you can push. The `Code Check` workflow runs the equivalent on every PR.
