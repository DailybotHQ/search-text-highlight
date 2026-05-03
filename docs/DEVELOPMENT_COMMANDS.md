# Development Commands

Reference for every npm script and shell command you'll run during day-to-day development. All scripts are defined in [`package.json`](../package.json) and are reproduced verbatim here so you don't have to dig.

## Inner-loop favorites

| Goal                        | Command                                      | Notes                                                             |
| --------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| Iterate on logic            | `npm run test:watch`                         | Mocha re-runs on save (`-w` watching `src` + `test`)              |
| Run the source directly     | `npm run dev`                                | `nodemon src/index.ts` — useful for ad-hoc experimentation        |
| Lint + format in one go     | `npm run eslint:fix && npm run prettier:fix` | Almost always the right pre-commit step                           |
| Type-check without a bundle | `npm run build:tsc`                          | `tsc --build tsconfig.json` — fastest path to surface type errors |
| One-shot tests              | `npm run test`                               | Same command CI runs                                              |

## Develop

```bash
npm install              # Install all dependencies — refreshes node_modules + package-lock.json
npm run dev              # Run src/index.ts under nodemon (auto-restart on change)
npm run start            # Execute the built dist/index.js (verifies the bundle works)
```

`npm run dev` is useful when you want to import the library into a quick scratch script in `tmp/` and iterate.

## Test

```bash
npm run test             # mocha test/**.ts (one shot)
npm run test:watch       # mocha -w  — re-runs on src/ or test/ change
```

Run a single test file:

```bash
npx mocha --require ts-node/register test/main.test.ts --timeout 25000 --colors
```

Run a single `it(...)` block by description (Mocha's `--grep`):

```bash
npx mocha --require ts-node/register test/**.ts --timeout 25000 --colors --grep "should highlight an unicode substring"
```

Reports go to stdout. There's no HTML reporter wired by default; add one when you need it (`mocha-junit-reporter` for CI, etc.) and document it here.

## Lint and format

```bash
npm run eslint:check     # ESLint, --ignore-path .gitignore (read-only)
npm run eslint:fix       # ESLint with --fix
npm run prettier:check   # Prettier --check (read-only)
npm run prettier:fix     # Prettier --write
```

The Prettier glob is `**/*.{css,html,js,ts,json,md,yaml,yml}` minus `package.json` (excluded explicitly so npm doesn't fight us over key ordering).

## Build

```bash
npm run build            # Webpack production bundle → dist/index.js
npm run build:dev        # Webpack development bundle (unminified, source-map friendly)
npm run build:tsc        # tsc --build  → dist/*.js + dist/*.d.ts (declarations)
```

CI publishes the **webpack production** output. `build:tsc` exists for declaration emission and as a fast type-check during development.

After a build, inspect the bundle:

```bash
ls -lh dist/
node dist/index.js       # Sanity check — should be a no-op (no top-level execution)
```

## Maintenance

```bash
npm run ncu:check        # List packages with newer versions, honoring .ncurc.json reject list
npm run ncu:upgrade      # Apply upgrades to package.json (then run `npm install` + tests)
npm run release          # `npm version patch` with the project's release commit message + tag
npm install              # Refresh package-lock.json after manual edits to package.json
```

`.ncurc.json` currently rejects `chai` and `eslint` major bumps — see [Technologies](TECHNOLOGIES.md) for why.

## Inspect npm package contents

Before publishing, verify the tarball doesn't accidentally include source or test files:

```bash
npm pack --dry-run
```

Expected output: only `dist/`, `package.json`, `README.md`, and `LICENSE` are listed. If anything else appears, update `.npmignore`.

## Common workflows

### Add a new option

1. Update `OptionsType` in `src/lib/type.ts`
2. Extend `Utils.validate.options` in `src/lib/utils.ts`
3. Add the default to `Utils.getOptions`
4. Use the option in `src/index.ts`
5. Add a Mocha test in `test/main.test.ts`
6. Update [API Reference](API_REFERENCE.md) and the README options table
7. Run the full chain: `npm run eslint:fix && npm run prettier:fix && npm run build:tsc && npm run test && npm run build`

The `/add-option` skill walks through this end-to-end — see [.agents/skills/add-option.md](../.agents/skills/add-option.md).

### Bump a dependency

1. `npm run ncu:check` to see what's outdated
2. `npm run ncu:upgrade` (or edit `package.json` for one specific package)
3. `npm install` to refresh `package-lock.json`
4. Run the full check chain
5. Commit `package.json` **and** `package-lock.json` together

### Reset a stuck environment

```bash
rm -rf node_modules dist
npm install
npm run build:tsc        # Type-check
npm run test             # Tests
```

If the issue persists, also clear the npm cache:

```bash
npm cache clean --force
```

### Compare a local change against the published version

```bash
npm view search-text-highlight version
git diff v$(npm view search-text-highlight version) -- src/
```

### Use the devcontainer aliases

Inside the devcontainer (`docker exec -it searchtexthl bash`), `docker/custom_commands.sh` sources into your shell. Helpers map directly to this repo’s npm scripts:

```bash
help                     # Welcome + command list
install                  # → npm install
check                    # → eslint:check, prettier:check (read-only)
fix                      # → eslint:fix, prettier:fix
typecheck                # → npm run build:tsc
test                     # → npm run test
build                    # → npm run build (webpack)
codecheck                # Full chain: eslint + prettier + tsc + test + webpack (read-only)
claudex                  # Claude Code with skip-permissions
codexx                   # OpenAI Codex with bypass-approvals
cursorx                  # Cursor CLI agent with --force
```

`codecheck` is the one-shot equivalent of running the pre-push checklist in [AGENTS.md](../AGENTS.md).

## Useful flags

| Flag                         | What it does                          | When to use                      |
| ---------------------------- | ------------------------------------- | -------------------------------- |
| `--silent` (npm)             | Suppress npm's own output noise       | Wrapping a command in CI logs    |
| `mocha --reporter spec`      | Detailed test output (default)        | Local                            |
| `mocha --reporter min`       | Single-line output                    | CI summary                       |
| `mocha --bail`               | Stop on first failure                 | Long suites                      |
| `mocha --grep "<text>"`      | Run only matching `it`s               | Targeted debugging               |
| `webpack --mode development` | Skip minification, keep source maps   | Inspecting bundle output         |
| `tsc --listFiles`            | Print every file the compiler touches | Tracing why a file won't compile |
| `tsc --noEmit`               | Type-check without writing dist/      | Pre-commit gate                  |

## CI invocations

The CI runs the same scripts you run locally — there's no CI-only command. See [CI/CD Guide](CI_CD.md) for which workflow runs which step.

## Pre-push checklist

```bash
npm run eslint:check && \
  npm run prettier:check && \
  npm run build:tsc && \
  npm run test && \
  npm run build
```

If all five pass, you can push. The `Code Check` workflow runs the equivalent on every PR.
