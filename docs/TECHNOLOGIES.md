# Technologies

A complete inventory of every tool, plugin, and library shipped with this repository, with **versions, role, and where it's wired**. Every version is pinned in [`package.json`](../package.json) and the dependency tree is locked in [`pnpm-lock.yaml`](../pnpm-lock.yaml) — change versions there, never inline a literal version anywhere else.

## Languages and runtimes

| Tool              | Version                               | Role                                                                                         |
| ----------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| TypeScript        | **6.0.3**                             | Source language for `src/` and `test/`; type-checked + declarations emitted to `dist/`        |
| Node.js           | **24.16.0**                           | Pinned via `.node-version` / `.nvmrc`, CI (`actions/setup-node`), and the devcontainer image  |
| pnpm              | **11.1.2**                            | Package manager via Corepack (`packageManager` field); `pnpm-lock.yaml` is committed          |
| ECMAScript target | `tsconfig.json` `lib: ['es6', 'dom']` | Output is broadly compatible (ES3 default target keeps the bundle minimal)                    |

> `engines.node` is `>=22.0.0` (the floor for the toolchain), while the pinned development/CI version is **24.16.0** via `.node-version` / `.nvmrc`. pnpm is provided by Corepack — never install it globally; run it as `corepack pnpm ...`.

## Build / bundle

| Tool         | Version | Purpose                                                                              | Where wired                                       |
| ------------ | ------- | ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `vite`       | 8.0.16  | Library-mode production bundling into `dist/index.js` (CJS, esbuild-minified)        | `vite.config.ts`, scripts `build` / `build:dev`   |
| `esbuild`    | 0.28.0  | Minifier used by Vite (`build.minify: 'esbuild'`); the only allowed install script   | `vite.config.ts`, `pnpm-workspace.yaml` allowlist |
| `typescript` | 6.0.3   | Declaration emission via `tsc -p tsconfig.build.json --emitDeclarationOnly`          | scripts `build` / `build:types` / `build:tsc`     |

> Vite owns the JS bundle; `tsc` owns the `.d.ts` files. They run back-to-back in the `build` script: `vite build && tsc -p tsconfig.build.json --emitDeclarationOnly`. `tsconfig.build.json` extends `tsconfig.json` and scopes the compile to `src/` so test files never leak into the published declarations.

## TypeScript tooling

| Tool          | Version | Role                                                                                                                           |
| ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `typescript`  | 6.0.3   | Compiler and declaration emission (`tsc -p tsconfig.build.json` → `dist/*.d.ts`)                                              |
| `tsx`         | 4.22.4  | Runs TypeScript directly for `nodemon` (`pnpm run dev`) — no precompile step                                                   |
| `@types/node` | 25.7.0  | Node API typings — **newer than `engines`** on purpose (`ncu`); definitions stay compatible with our Node 24 surface in `src/` |

## Lint / format

| Tool             | Version | Role                                                                                       |
| ---------------- | ------- | ------------------------------------------------------------------------------------------ |
| `@biomejs/biome` | 2.4.16  | Linter **and** formatter in one tool — configured in `biome.json` at the repo root         |

> Biome replaces the former ESLint + Prettier pair. Formatter settings: `quoteStyle: 'single'`, `semicolons: 'asNeeded'`, `trailingCommas: 'es5'`, `lineWidth: 120`, 2-space indent. Linter highlights: `noConsole: error` (off for `test/**`), `noExplicitAny: off`. See [Standards](STANDARDS.md) for the full rule set.

## Tests

| Tool      | Version | Role                                                                                       |
| --------- | ------- | ----------------------------------------------------------------------------------------- |
| `vitest`  | 4.1.8   | Test runner — reuses the Vite pipeline, runs TypeScript natively (`vitest.config.ts`)      |
| `nodemon` | 3.1.14  | Restarts `src/index.ts` (via `tsx`) on save during local debugging (`pnpm run dev`)        |

> Specs import their API explicitly: `import { describe, it, expect } from 'vitest'` (no globals). `test/exports.test.ts` is a dual-export smoke test that runs against the built `dist/` bundle. See [Testing Guide](TESTING_GUIDE.md).

## Maintenance / release

| Tool                | Version | Role                                                                                              |
| ------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `npm-check-updates` | 22.2.0  | Lists/applies dependency upgrades; honors `.ncurc.json`                                            |
| `prepare_release.sh`| (repo)  | `pnpm run release` → `.github/scripts/prepare_release.sh` bumps the patch version, commits, and tags |

## CI / Automation

GitHub Actions workflows in `.github/workflows/`:

| Workflow                                   | Trigger                                         | Purpose                                                                                                                            |
| ------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `code_check.yml`                           | PR open/sync against `main`                     | `corepack pnpm install --frozen-lockfile` → `biome:check` → `pnpm run build` → `pnpm test`                                        |
| `pull_request_check.yml`                   | PR open/edit                                    | Validates the PR has a `Size - *` label                                                                                           |
| `release_and_publish.yml`                  | PR closed (merged) on `main`                    | Reproduces the code check, builds with `pnpm run build`, runs `pnpm run release`, creates a GitHub release, publishes via `pnpm publish` |
| `check_packages_versions.yml`              | Schedule (Tue 15:00 UTC) + manual               | Opens a `feature__packages_versions_update` PR with `ncu:upgrade` results                                                  |
| `check_and_merge_packages_upgrades_pr.yml` | Schedule (Tue 20:00 UTC) + manual               | Auto-merges the upgrade PR if green                                                                                        |
| `check_branches_state.yml`                 | Schedule (Tue 09:00 UTC) + manual               | Reports stale branches                                                                                                     |
| `cleanup_caches.yml`                       | `repository_dispatch` `cleanup_caches` + manual | Trims GitHub Actions caches                                                                                                |

Full description: [CI/CD Guide](CI_CD.md).

## Devcontainer / local infra

| Tool                                            | Version                              | Role                                                                   |
| ----------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| Docker / Docker Compose                         | (host-provided)                      | Runs the dev container described in `docker/local/docker-compose.yaml` |
| `node:24.16.0-trixie-slim` (devcontainer image) | Node 24                              | Matches the pinned `.node-version` / `.nvmrc`                          |
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
- **Logger** — `noConsole: error` (Biome) enforces "no logs in source"
- **Coverage tool** — Vitest can enable V8 coverage on demand; wire it behind a separate `pnpm run test:coverage` script when needed

When you add any of the above, **document the choice** in this file, in the relevant guide, and in `AGENTS.md`'s Quick Commands table.

## Upgrading

1. Edit only `package.json` — never inline a literal version inside source
2. Run `corepack pnpm install` so `pnpm-lock.yaml` updates
3. Run the full chain: `pnpm run biome:check && pnpm run build:tsc && pnpm run test && pnpm run build`
4. For TypeScript bumps, double-check `tsconfig.json` / `tsconfig.build.json` defaults haven't changed (e.g., a new `strict` sub-flag enabled)
5. New installs honor `minimumReleaseAge` (`pnpm-workspace.yaml`) — a freshly published version won't resolve until it's at least a week old; see [Security → Dependencies](SECURITY.md#dependencies)
6. Use the `/bump-deps` skill (see [.agents/README.md](../.agents/README.md)) for a guided workflow

After a bump, smoke-test the published surface by running `pnpm pack` locally and inspecting the tarball:

```bash
corepack pnpm pack --dry-run
```

Verify only `dist/` ships (the `files` allowlist is `["dist"]`, so `package.json`, `LICENSE`, and `README.md` are added by npm automatically) — anything else needs a `files` / `.npmignore` adjustment.
