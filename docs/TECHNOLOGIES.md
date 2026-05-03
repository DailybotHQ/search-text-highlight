# Technologies

A complete inventory of every tool, plugin, and library shipped with this repository, with **versions, role, and where it's wired**. Every version is pinned in [`package.json`](../package.json) and the dependency tree is locked in [`package-lock.json`](../package-lock.json) — change versions there, never inline a literal version anywhere else.

## Languages and runtimes

| Tool              | Version                               | Role                                                                            |
| ----------------- | ------------------------------------- | ------------------------------------------------------------------------------- |
| TypeScript        | **6.0.3**                             | Source language for `src/` and `test/`; type-checked + emitted to `dist/`       |
| Node.js           | **24.15.0**                           | Pinned via `engines`, CI (`actions/setup-node`), and the devcontainer image tag |
| npm               | shipped with Node 24                  | Package manager — `package-lock.json` is committed                              |
| ECMAScript target | `tsconfig.json` `lib: ['es6', 'dom']` | Output is broadly compatible (ES3 default target keeps the bundle minimal)      |

## Build / bundle

| Tool                    | Version | Purpose                                                                            | Where wired                                        |
| ----------------------- | ------- | ---------------------------------------------------------------------------------- | -------------------------------------------------- |
| `webpack`               | 5.106.2 | Production bundling into `dist/index.js` (`libraryTarget: 'commonjs2'`, minimized) | `webpack.config.js`, scripts `build` / `build:dev` |
| `webpack-cli`           | 7.0.2   | CLI entry for the webpack scripts                                                  | `npm run build`                                    |
| `ts-loader`             | 9.5.7   | Compiles TypeScript inside the webpack pipeline                                    | `webpack.config.js` `module.rules`                 |
| `clean-webpack-plugin`  | 4.0.0   | Wipes `dist/` before each production build                                         | `webpack.config.js` (production mode only)         |
| `eslint-webpack-plugin` | 6.0.0   | Available for in-bundle ESLint — currently unused but pinned for opt-in            | `devDependencies`                                  |

## TypeScript tooling

| Tool           | Version | Role                                                           |
| -------------- | ------- | -------------------------------------------------------------- |
| `typescript`   | 6.0.3   | Compiler, declaration emission (`tsc --build` → `dist/*.d.ts`) |
| `ts-node`      | 10.9.2  | Runs TypeScript directly for `nodemon` and Mocha               |
| `@types/node`  | 24.12.2 | Node API typings (aligned with Node 24)                        |
| `@types/chai`  | 4.3.20  | Assertion library typings                                      |
| `@types/mocha` | 10.0.10 | Test runner typings                                            |

## Lint / format

| Tool                                                | Version | Role                                                                   |
| --------------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| `eslint`                                            | 10.3.0  | Static analysis — flat config (`eslint.config.mjs`)                    |
| `@eslint/js`                                        | 10.0.1  | ESLint core recommended rules                                          |
| `typescript-eslint`                                 | 8.59.1  | Parser + TypeScript rules (`tseslint.configs.recommended`)             |
| `eslint-plugin-prettier`                            | 5.5.5   | Surface Prettier diffs as ESLint errors                                |
| `eslint-config-prettier`                            | 10.1.8  | Disables ESLint rules that would conflict with Prettier                |
| `prettier` (transitive of `eslint-plugin-prettier`) | 3       | Formatter — `singleQuote: true`, `semi: false`, `trailingComma: 'es5'` |

> ESLint 10 uses the **flat config** file `eslint.config.mjs` at the repo root (legacy `.eslintrc` is removed). Node **^20.19 \|\| ^22.13 \|\| >=24** is required by ESLint 10 — match `engines` / CI / the devcontainer.

## Tests

| Tool      | Version | Role                                                                                                                                                |
| --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mocha`   | 11.7.5  | Test runner                                                                                                                                         |
| `chai`    | 4.5.0   | Assertion library — **latest 4.x** on purpose (`chai` 6 is ESM-only; Mocha + `ts-node` stay CommonJS). `.ncurc.json` rejects `chai` / `@types/chai` |
| `nodemon` | 3.1.14  | Runs `src/index.ts` on save during local debugging (`npm run dev`)                                                                                  |

## Babel

| Tool                                                                | Version                                     | Role                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `@babel/preset-env` (declared in `.babelrc`)                        | follows the workspace transitive resolution | Target-environment-aware preset; kept primarily for downstream consumers that run their own Babel pipeline |
| `@babel/plugin-transform-runtime` (declared in `.babelrc`)          | (transitive)                                | Reuses helpers across modules in consumer builds                                                           |
| `@babel/plugin-transform-modules-commonjs` (declared in `.babelrc`) | (transitive)                                | Ensures CommonJS output for environments that pre-process the dist                                         |

> `.babelrc` exists for legacy compatibility with consumers that run their own Babel pipeline. The webpack production build does **not** invoke Babel — `ts-loader` is the only TypeScript step. Don't remove `.babelrc` without checking with downstream consumers.

## Maintenance / release

| Tool                     | Version | Role                                                                                                         |
| ------------------------ | ------- | ------------------------------------------------------------------------------------------------------------ |
| `npm-check-updates`      | 22.1.0  | Lists/applies dependency upgrades; honors `.ncurc.json` (`upgrade: true`, `reject: ["chai", "@types/chai"]`) |
| `npm version` (built-in) | npm 10  | `npm run release` → `npm version patch -m "[🤖 DailyBot] New release to v%s launched 🚀"`                    |

## CI / Automation

GitHub Actions workflows in `.github/workflows/`:

| Workflow                                   | Trigger                                         | Purpose                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `code_check.yml`                           | PR open/sync against `main`                     | `npm install` → `eslint:check` → `prettier:check` → `npm test`                                                             |
| `pull_request_check.yml`                   | PR open/edit                                    | Validates the PR has a `Size - *` label                                                                                    |
| `release_and_publish.yml`                  | PR closed (merged) on `main`                    | Reproduces the code check, builds with `npm run build`, runs `npm run release`, creates a GitHub release, publishes to npm |
| `check_packages_versions.yml`              | Schedule (Tue 15:00 UTC) + manual               | Opens a `feature__packages_versions_update` PR with `ncu:upgrade` results                                                  |
| `check_and_merge_packages_upgrades_pr.yml` | Schedule (Tue 20:00 UTC) + manual               | Auto-merges the upgrade PR if green                                                                                        |
| `check_branches_state.yml`                 | Schedule (Tue 09:00 UTC) + manual               | Reports stale branches                                                                                                     |
| `cleanup_caches.yml`                       | `repository_dispatch` `cleanup_caches` + manual | Trims GitHub Actions caches                                                                                                |

Full description: [CI/CD Guide](CI_CD.md).

## Devcontainer / local infra

| Tool                                            | Version                              | Role                                                                   |
| ----------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| Docker / Docker Compose                         | (host-provided)                      | Runs the dev container described in `docker/local/docker-compose.yaml` |
| `node:24.15.0-trixie-slim` (devcontainer image) | Node 24                              | Same major/minor as `package.json` `engines.node`                      |
| GitHub CLI (`gh`)                               | latest from cli.github.com           | Pre-installed inside the devcontainer for issue/PR ops                 |
| Chromium                                        | trixie repo                          | Available for Lighthouse-based audits if the consumer adds them        |
| Claude Code CLI                                 | installed via `claude.ai/install.sh` | AI assistant — invoked via `claude` or the `claudex` wrapper           |
| OpenAI Codex CLI                                | `@openai/codex` (npm global)         | AI assistant — invoked via `codex` or `codexx`                         |
| Cursor CLI agent                                | installed via `cursor.com/install`   | AI assistant — invoked via `agent` or `cursorx`                        |

The devcontainer pre-creates persistent volumes for each AI CLI's session/auth data so logging in once per host machine is enough. See [Devcontainer Guide](DEVCONTAINER.md).

## What this repository deliberately does **not** ship

Omitted to keep the runtime tarball minuscule. Add only with explicit justification.

- **Polyfills / runtime libraries** (lodash, ramda) — the implementation fits in <30 lines of vanilla TS
- **HTML escaping helpers** — consumers control `htmlTag` / `hlClass`; no escaping happens by design
- **Internationalization libraries** — this is not a UI; consumers handle i18n
- **Logger** — `no-console: error` enforces "no logs in source"
- **Coverage tool** — Mocha's built-in `--reporter` is enough; coverage can be added behind a separate `npm run test:coverage` script later

When you add any of the above, **document the choice** in this file, in the relevant guide, and in `AGENTS.md`'s Quick Commands table.

## Upgrading

1. Edit only `package.json` — never inline a literal version inside source
2. Run `npm install` so `package-lock.json` updates
3. Run the full chain: `npm run eslint:check && npm run prettier:check && npm run build:tsc && npm run test && npm run build`
4. For Chai major bumps beyond v4, remove the entry from `.ncurc.json` `reject` and migrate tests to an ESM-friendly runner if needed
5. For TypeScript bumps, double-check `tsconfig.json` defaults haven't changed (e.g., a new `strict` sub-flag enabled)
6. Use the `/bump-deps` skill (see [.agents/README.md](../.agents/README.md)) for a guided workflow

After a bump, smoke-test the published surface by running `npm pack` locally and inspecting the tarball:

```bash
npm pack --dry-run
```

Verify only `dist/`, `package.json`, `LICENSE`, and `README.md` would ship — anything else needs a `.npmignore` entry.
