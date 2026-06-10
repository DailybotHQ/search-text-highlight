# AGENTS.md - Documentation for AI Agents

**Purpose:** Single source of truth for all AI coding assistants (Claude Code, Cursor AI, OpenAI Codex, Google Gemini, GitHub Copilot, and others). Ensures all agents work with consistent guidelines and patterns.

> `CLAUDE.md` in the repo root is a symlink to this file. Update **only** `AGENTS.md`.

## Detailed Documentation

**Comprehensive guides for specific tasks:**

| Category        | Guide                                                                                           | Purpose                                                                |
| --------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Product Spec    | [Product Spec](docs/PRODUCT_SPEC.md)                                                            | Non-technical "why" — audience, contract, non-goals, success criteria  |
| Docs Index      | [docs/README.md](docs/README.md)                                                                | Documentation index — flat list of every guide in `docs/`              |
| Architecture    | [Architecture](docs/ARCHITECTURE.md)                                                            | Module layout, public API surface, TypeScript build pipeline           |
| Technologies    | [Technologies](docs/TECHNOLOGIES.md)                                                            | Stack overview with versions and roles                                 |
| Standards       | [Standards](docs/STANDARDS.md)                                                                  | TypeScript conventions, naming, Biome lint/format rules                |
| Commands        | [Development Commands](docs/DEVELOPMENT_COMMANDS.md)                                            | Every pnpm script and what it does                                     |
| Testing         | [Testing](docs/TESTING_GUIDE.md)                                                                | Vitest conventions, test layout, single test runs                      |
| API             | [API Reference](docs/API_REFERENCE.md)                                                          | Public surface (`highlight`, `OptionsType`) — the user-facing contract |
| Build & Deploy  | [Build & Deploy](docs/BUILD_DEPLOY.md)                                                          | Vite library build, pnpm publish, GitHub release                       |
| CI / CD         | [CI/CD](docs/CI_CD.md)                                                                          | GitHub Actions workflows: PR checks, release, dependency upgrades      |
| Performance     | [Performance](docs/PERFORMANCE.md)                                                              | Regex hot path, bundle size, Unicode safety                            |
| Security        | [Security](docs/SECURITY.md)                                                                    | Input validation, regex injection / ReDoS, pnpm supply chain           |
| Devcontainer    | [Devcontainer](docs/DEVCONTAINER.md)                                                            | Docker-based dev environment with bundled AI CLIs                      |
| Documentation   | [Documentation Guide](docs/DOCUMENTATION_GUIDE.md)                                              | When and how to update docs                                            |
| AI Agents       | [Agent Onboarding](docs/AI_AGENT_ONBOARDING.md), [Agent Collaboration](docs/AI_AGENT_COLLAB.md) | Setup, handoff, coordination                                           |
| Forking         | [Fork Customization](docs/FORK_CUSTOMIZATION.md)                                                | Step-by-step rebrand into a new npm package                            |
| Getting started | [`docs/getting-started/`](docs/getting-started/)                                                | Environment setup, running locally, troubleshooting                    |
| Skills/Agents   | [.agents/README.md](.agents/README.md)                                                          | Available skills, commands, and subagents for this repo                |

## Project Overview

**search-text-highlight** — a tiny, dependency-free **TypeScript library** that finds a substring inside a text and wraps each match in an HTML element so it can be styled. Unicode (including emoji) and case-insensitive search are supported out of the box.

The package is published to npm as [`search-text-highlight`](https://www.npmjs.com/package/search-text-highlight), bundled with Vite (library mode) into a CommonJS module under `dist/`, and consumed by web apps that need cheap client-side text highlighting.

The codebase is intentionally small (one public method, two helper modules) so it stays trivially auditable. See [Fork Customization](docs/FORK_CUSTOMIZATION.md) if you want to use it as a starting point for a different text-processing utility.

**Technology Stack** (full list with versions: [Technologies](docs/TECHNOLOGIES.md))

- **TypeScript 6.0.3** — language for source and tests
- **Node.js 24.16.0** — pinned via `.node-version` / `.nvmrc`; `engines.node` requires `>=22.0.0`
- **pnpm 11.1.2 via Corepack** — package manager (`packageManager` field, `pnpm-lock.yaml`); install with `corepack pnpm install --frozen-lockfile`. See the supply-chain note below
- **Vite 8** (library mode, esbuild minify) — production bundle (`dist/index.js`, CommonJS) via `vite.config.ts`
- **`tsc` (`tsconfig.build.json`)** — emits type declarations (`dist/index.d.ts`) with `--emitDeclarationOnly`
- **Babel 7** (`@babel/preset-env`) — `.babelrc` retained for downstream consumers
- **Vitest 4** — unit tests via `vitest.config.ts`, executed straight from TypeScript (`import { describe, it, expect } from 'vitest'`)
- **Biome 2.4** (`biome.json`) — single tool for linting and formatting (single quotes, no semis, trailing commas `es5`)
- **npm-check-updates 22** — surface outdated packages for the weekly Renovate-style workflow
- **GitHub Actions** — code check on every PR, automated release and publish to npm on merge, scheduled package-upgrade PR
- **Docker / Devcontainer** — reproducible Linux environment with Claude Code, OpenAI Codex, and Cursor CLIs pre-installed

## Project Structure

> Full tree and rationale: **[Architecture Guide](docs/ARCHITECTURE.md#project-structure)**

```
src/
├── index.ts              # Public entry — exports `searchTextHL.highlight(...)`
└── lib/
    ├── README.md         # Per-module doc covering `type.ts` and `utils.ts`
    ├── type.ts           # `OptionsType`, `SearchTextHLType`, `UtilsType` interfaces
    └── utils.ts          # Argument validation + default option resolution

test/
├── main.test.ts          # Vitest suite for the public API
└── exports.test.ts       # Dual-export (import + require) smoke test

dist/                     # Vite production output (gitignored, published to npm)
docs/                     # Documentation referenced from this file (includes PRODUCT_SPEC.md, README.md index)
.agents/                  # Skills, commands, subagents, settings, and the docs/ catalog for any AI host
.claude/ → .agents/       # Symlink so Claude Code resolves the same files
.dwp/                     # Deep Work Plan scratch — plans/ and drafts/ (gitignored except .gitkeep)
.github/
├── workflows/            # CI: code_check, release_and_publish, package upgrade automation
└── scripts/              # Helper scripts called from workflows
docker/                   # Local devcontainer setup (Compose + Dockerfile + custom_commands.sh)
.devcontainer_example/    # Reference devcontainer.json for VS Code
tmp/                      # Scratch workspace (git-ignored, see below)

package.json              # Scripts, dependencies, `packageManager`, `files` allowlist, npm package metadata
pnpm-lock.yaml            # Pinned dependency tree — always commit alongside package.json
pnpm-workspace.yaml       # pnpm config — `minimumReleaseAge` supply-chain guard + `allowBuilds`
tsconfig.json             # Strict TS config — `strictNullChecks`, `noUnusedLocals`, declarations
tsconfig.build.json       # Declaration-only build config used by `build:types` / `build:tsc`
vite.config.ts            # Production bundling (CommonJS library output, esbuild minify)
vitest.config.ts          # Vitest test runner config
biome.json                # Biome lint + format config (no semis, single quotes, trailing commas es5)
.babelrc                  # Babel preset-env config
.editorconfig             # 2-space indent, LF, UTF-8
.node-version / .nvmrc    # Pin Node 24.16.0 for local tooling and CI
.ncurc.json               # npm-check-updates: `{ "upgrade": true }`
.npmignore                # Files excluded from the npm tarball (the `files` allowlist in package.json is authoritative)
```

## Temporary Workspace (`tmp/`)

The `tmp/` directory at the project root is a **git-ignored scratch space** for agents and developers (`.gitignore` keeps everything except `tmp/.gitkeep`).

**Use it for:**

- Temporary prompts, outputs, or drafts
- One-off analysis results, debug logs, build artifacts copied for inspection
- Throw-away `.ts` snippets you want to compile/test outside of `src/`
- The mounted `tmp/KMPStarter` reference repo (kept here for documentation parity work)

**Rules:**

- Everything inside `tmp/` is ignored by git (except `.gitkeep`)
- Do NOT store anything permanent or important here — it can be deleted at any time
- When a user asks for a temporary file, prompt output, or scratch artifact, **use `tmp/`**. Subdirectories are fine (e.g., `tmp/prompts/`, `tmp/analysis/`).

## CRITICAL: Mandatory Requirements

### 1. Language Standards

**ALL code, comments, identifiers, commit messages, and documentation MUST be in English.** README, AGENTS.md, every doc, every PR description — English. The npm registry, the GitHub UI, and every downstream consumer expect it. Always update documentation after important changes.

### 2. Public API is the Contract (MANDATORY)

The npm package exports a single object: `searchTextHL` with one method, `highlight(text, query, options)`. This signature is **load-bearing** — every release downstream depends on it.

- **Don't change the signature** without a major version bump and a migration note in the README + [API Reference](docs/API_REFERENCE.md)
- **Don't introduce new top-level exports** without an explicit decision — additions to the surface area increase the maintenance burden
- **Don't break existing option defaults** (`htmlTag: 'span'`, `hlClass: 'text-highlight'`, `matchAll: true`, `caseSensitive: false`) — they ship in users' rendered HTML

If you genuinely need to evolve the API, follow `Fork Customization` or open a discussion before coding.

### 3. Type-First Discipline (MANDATORY)

Every public function and option goes through an `interface` declared in `src/lib/type.ts`:

```ts
export interface OptionsType {
  htmlTag?: string
  hlClass?: string
  matchAll?: boolean
  caseSensitive?: boolean
}

export interface SearchTextHLType {
  highlight: (text: string, query: string, options?: OptionsType) => string
}
```

**Rules:**

1. New options live in `OptionsType` first, then are wired through `Utils.validate.options` and `Utils.getOptions` defaults
2. `tsconfig.json` is strict (`strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitAny`) — keep it that way
3. Generated `.d.ts` files (under `dist/`) are part of the public package — do not add types that fail to compile in the published bundle
4. Export interfaces alongside the implementation when consumers need them (e.g., re-export `OptionsType` from `index.ts` if you start documenting it externally)

Full rules: **[Standards Guide](docs/STANDARDS.md#types)**.

### 4. Lint & Format Convention (MANDATORY)

Code must pass Biome (a single tool covering both linting and formatting) before merge. The configured rules:

- **Formatting:** single quotes, no semicolons, trailing commas `es5`
- **Linting:** Biome's recommended rules, with `console` usage flagged as an error
- **`.editorconfig`:** 2-space indent, LF line endings, UTF-8, max line length 120

```bash
pnpm run biome:check       # Lint + format check (read-only)
pnpm run biome:fix         # Lint + format auto-fix (safe fixes)
pnpm run biome:fix:unsafe  # Include Biome's unsafe fixes
```

**Don't** disable a rule to silence a single warning. If a rule is genuinely wrong for the codebase, change it in `biome.json` deliberately and document why in the commit message.

### 5. Code Quality (MANDATORY)

The starter ships with the TypeScript compiler's built-in checks plus Biome. The default verification chain:

```bash
pnpm run biome:check     # Lint + format (static analysis)
pnpm run build:tsc       # Type-check via `tsc -p tsconfig.build.json --noEmit`
pnpm run test            # Vitest suite
pnpm run build           # Vite production bundle + declarations
```

Run the chain locally before pushing — every step is mirrored in the GitHub Actions `Code Check` and `Release and Publish` workflows.

### 6. Testing (MANDATORY)

Tests live in `test/*.test.ts` and run with Vitest — no separate compile step. Specs import their helpers from `vitest` (`import { describe, it, expect } from 'vitest'`).

```bash
pnpm run test            # One-shot run (vitest run)
pnpm run test:watch      # Re-run on save (vitest)
```

Run a single test (Vitest's `-t` name filter, or pass a file path):

```bash
pnpm exec vitest run test/main.test.ts -t "unicode"
```

Conventions: **[Testing Guide](docs/TESTING_GUIDE.md)**. Every change to `src/` should be paired with a test that exercises the new behavior or a regression case for the bug you fixed.

### 7. Validate at the Boundary (MANDATORY)

This is a **public library** — every consumer hits `highlight(...)` with arbitrary input. The `Utils.validate.highlight` and `Utils.validate.options` functions in `src/lib/utils.ts` are the single boundary:

- All argument-shape errors are thrown from there with a clear, English message
- Internal helpers downstream of validation may assume their inputs are typed correctly — don't re-validate
- New options must extend the validators in lockstep — see [Standards → Validation](docs/STANDARDS.md#validation)

Never trust the user's `query` shape — it ends up inside `new RegExp(query, modifiers)`. See **[Security Guide → Regex injection](docs/SECURITY.md#regex-injection--redos)** before adding any feature that affects the regex.

### 8. Performance-First Mindset (MANDATORY)

`highlight(...)` is called per-render in many consumer apps. Treat it like a hot path:

1. **Keep the function pure** — same inputs, same output, no global state
2. **Compile the regex once per call**, never inside `replace`'s callback. Today's implementation already does this — keep it that way
3. **Don't allocate intermediate arrays** unless you genuinely need them. `String.prototype.replace` with a regex is cheaper than `split` + `map` + `join` for most inputs
4. **Avoid catastrophic backtracking** — never accept a user-controlled regex pattern; we accept a plain string `query` that we use as a literal regex source. Adding any quantifier-aware feature requires a regex-DoS audit
5. **Bundle size matters.** This package has zero runtime dependencies — keep it that way. Adding a dependency requires a justified note in [Technologies](docs/TECHNOLOGIES.md)

See **[Performance Guide](docs/PERFORMANCE.md)**.

### 9. Security Standards (MANDATORY)

1. **Treat `query` as untrusted input.** It flows directly into a `RegExp` constructor — see [Security → Regex injection](docs/SECURITY.md#regex-injection--redos)
2. **The `htmlTag` and `hlClass` options become raw HTML.** Consumers who pipe untrusted strings into either will produce invalid markup or, at worst, attribute-injection. Document this prominently in [API Reference](docs/API_REFERENCE.md)
3. **Never log secrets.** The library doesn't log anything today; `no-console` enforces this
4. **Pin every dependency.** `pnpm-lock.yaml` is committed; publishing uses `corepack pnpm publish --no-git-checks` on the `main` branch only. `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080` (1 week) so freshly published versions can't be installed until they've aged — see [the supply-chain rationale](https://xergioalex.com/blog/supply-chain-attacks-ai-era/)
5. **Audit every new dependency.** This is a tiny package — most needs are better solved with a few extra lines of code than another transitive dep. See [Security → Dependencies](docs/SECURITY.md#dependencies)

See **[Security Guide](docs/SECURITY.md)**.

### 10. Devcontainer Workflow

The repository ships with a Docker-based devcontainer (`docker/local/docker-compose.yaml` + `docker/local/searchTextHL/Dockerfile`) preloaded with Node 24, Claude Code, OpenAI Codex, Cursor CLI, GitHub CLI, and Chromium for Lighthouse audits.

```bash
cd docker/local && docker compose up -d         # Start the container
docker exec -it searchtexthl bash               # Get a shell inside
# Inside the container:
help                                            # Print the welcome banner
install                                         # Run `corepack pnpm install`
check                                           # biome:check (read-only)
fix                                             # biome:fix
test                                            # Run the vitest suite
codecheck                                       # biome + build:tsc + test + vite build
```

Inside the devcontainer, a `/usr/local/bin/npm` wrapper routes bare `npm` invocations to `corepack pnpm`, so `npm install` / `npm run X` still work and resolve to pnpm. Prefer `pnpm` (or `corepack pnpm`) explicitly outside the container.

Use this as your default development environment — it's reproducible across macOS / Linux / Windows and ships the AI CLIs pre-configured. Full reference: **[Devcontainer Guide](docs/DEVCONTAINER.md)**.

## Shared Agent Coordination

Multiple AI agents collaborate on this codebase. When updating agent guidance, mirror changes across all relevant files. See **[AI Agent Collaboration](docs/AI_AGENT_COLLAB.md)**.

## Quick Commands

> This repo uses **pnpm via Corepack**. Run `corepack enable` once, then use `pnpm run X` (or `corepack pnpm run X`). The commands below use `pnpm`.

```bash
# Develop
pnpm run dev               # nodemon --exec tsx src/index.ts (run the source directly)
pnpm run test:watch        # vitest in watch mode

# Test
pnpm run test              # vitest run (one shot)

# Lint / format
pnpm run biome:check       # Biome lint + format check (read-only)
pnpm run biome:fix         # Biome lint + format auto-fix (safe)
pnpm run biome:fix:unsafe  # Biome auto-fix including unsafe fixes

# Build
pnpm run build             # Vite production bundle + declarations (writes dist/)
pnpm run build:dev         # Vite development bundle
pnpm run build:types       # `tsc -p tsconfig.build.json --emitDeclarationOnly`
pnpm run build:tsc         # `tsc -p tsconfig.build.json --noEmit` — type-check only

# Maintenance
pnpm install               # Install deps (CI uses corepack pnpm install --frozen-lockfile)
pnpm run ncu:check         # List packages with newer versions (respects .ncurc.json)
pnpm run ncu:upgrade       # Apply upgrades to package.json (run install + tests after)
pnpm run release           # bash .github/scripts/prepare_release.sh — bump + tag the release commit
pnpm run start             # Run the built dist/index.js
```

Full reference (including environment-variable flags and CI invocations): **[Development Commands](docs/DEVELOPMENT_COMMANDS.md)**.

## Architecture Patterns

> Full patterns with code examples: **[Architecture Guide](docs/ARCHITECTURE.md)**

### 1. Single Public Object Export

`src/index.ts` exports a default object (`searchTextHL`) **and** assigns it to `module.exports` so both ES modules (`import searchTextHL from 'search-text-highlight'`) and CommonJS (`const searchTextHL = require('search-text-highlight')`) consumers work. Do not split the public surface across multiple top-level exports — keep the contract one-liner.

### 2. Validation at the Boundary, Pure Internals

`src/lib/utils.ts` defines `Utils.validate.highlight` and `Utils.validate.options`. Every public call goes through them; the regex composition downstream assumes valid types. New options extend both the validator and `Utils.getOptions` defaults in the same change.

### 3. Type Catalog in `lib/type.ts`

Every interface lives in `src/lib/type.ts`. Implementations import their type from there and never inline a structural type literal in `index.ts` or `utils.ts`. This keeps the published `.d.ts` clean and the option list discoverable.

### 4. Single Bundle, Two Module Systems

Vite (library mode) outputs `dist/index.js` as a CommonJS bundle. A separate `tsc -p tsconfig.build.json --emitDeclarationOnly` pass emits `dist/index.d.ts`. Together they cover Node consumers, bundlers, and TypeScript users from the same artifact. The `test/exports.test.ts` smoke test guards that both `import` and `require` keep resolving. Don't add ESM-only exports without verifying the npm `package.json` and `dist/` structure still resolve for every consumer.

### 5. Dependency-Free Runtime

The package has **zero `dependencies`** in `package.json`; everything is `devDependencies`. Adding a runtime dependency increases the install footprint of every consumer — it requires explicit justification and a note in [Technologies](docs/TECHNOLOGIES.md).

### 6. Conventional Commits Drive the Release

`pnpm run release` runs `.github/scripts/prepare_release.sh`, which bumps the patch version and creates the release commit + tag `[🤖 DailyBot] New release to vX.Y.Z launched 🚀`. The `release_and_publish` GitHub workflow runs that on merge to `main`, then publishes with `corepack pnpm publish --no-git-checks` (the `files: ["dist"]` allowlist controls the tarball contents). Commits should use conventional types (`feat`, `fix`, `chore`, `build`, `docs`, `ci`, `test`, `style`, `refactor`, `perf`).

## Documentation Standards

Update docs after: changing the public API, adding/removing an option, bumping a major dependency, adjusting CI workflows, adding a new npm script, modifying the build pipeline, or introducing a new agent skill. See **[Documentation Guide](docs/DOCUMENTATION_GUIDE.md)**.

## Common Mistakes to Avoid

### DON'T:

1. Change the `searchTextHL.highlight(...)` signature in a non-major release
2. Add a runtime `dependency` without a documented reason and a [Technologies](docs/TECHNOLOGIES.md) update
3. Inline a structural type in `src/index.ts` instead of declaring it in `src/lib/type.ts`
4. Skip validation for a new option — every option must extend `Utils.validate.options` and `Utils.getOptions`
5. Use `console.log` in source — Biome flags `console` usage and CI will fail
6. Use semicolons or double quotes — Biome will rewrite them; CI fails on diff
7. Commit `dist/` to git (it's published from CI; locally it should stay clean)
8. Commit `.env` (already in `.gitignore`)
9. Edit `dist/` files by hand — they're regenerated on every build
10. Add a top-level export to `index.ts` without bumping the major version
11. Construct a `RegExp` from concatenated strings without a regex-DoS audit (see [Security](docs/SECURITY.md))
12. Manually edit `package.json`'s `version` — `pnpm run release` does that
13. Update `CLAUDE.md` directly — it is a symlink to `AGENTS.md`. Edit `AGENTS.md`.

### DO:

1. Pair every new feature with a Vitest test in `test/main.test.ts`
2. Run `pnpm run biome:fix` before committing
3. Use `pnpm run build:tsc` to type-check without producing a bundle
4. Pin new dependency versions in `package.json` and check `pnpm-lock.yaml` is updated
5. Use `Utils.validate.options` for new option-shape errors — don't throw bespoke types
6. Keep the public surface to `searchTextHL.highlight(...)` plus exported types
7. Use `tmp/` for any throw-away artifact
8. Use the devcontainer for parity with CI
9. Bump versions only via `pnpm run release` (or `ncu:upgrade` for dev deps)
10. Reference the public API only via the documented `import` / `require` forms

## Pre-Commit Checklist

- [ ] All code, comments, and identifiers in English
- [ ] `pnpm run biome:check` passes (lint + format)
- [ ] `pnpm run build:tsc` succeeds (type-check)
- [ ] `pnpm run test` passes
- [ ] `pnpm run build` succeeds (production bundle + declarations)
- [ ] If you added an option, `OptionsType`, `Utils.validate.options`, `Utils.getOptions`, the README example table, and a test all reflect it
- [ ] If you added a dependency, it's pinned in `package.json` and `pnpm-lock.yaml` is committed
- [ ] No `console.log` calls in source
- [ ] No `dist/` or `.env` staged
- [ ] Documentation updated for any architectural change (new option, new script, new pattern)
- [ ] Commit message in English (conventional format)

## Skills & Agents (Claude Code)

This repository ships with a `.agents/` directory (with `.claude/` symlinked to it) containing slash-command skills and specialized subagents tuned for this library's TypeScript / pnpm workflow. Full catalog: **[.agents/README.md](.agents/README.md)**.

**Skills (slash commands):**

- `/add-option` — Add a new option to `OptionsType` and wire it through validation, defaults, tests, and docs
- `/add-feature` — Add a new public method to `searchTextHL` (rare; usually a major version)
- `/write-tests` — Author Vitest tests for the current change
- `/fix-build` — Diagnose and repair a failing Vite / tsc build
- `/lint-fix` — Run Biome with `--write` + tidy follow-ups
- `/bump-deps` — Update `package.json` safely (changelog + verification, respects `.ncurc.json`)
- `/release` — Run the project's release script, verify the npm publish prerequisites
- `/devcontainer-up` — Spin up the local Docker dev environment and verify the welcome banner
- `/fork-rebrand` — Walk a fresh fork through name, description, npm scope, repo URL, license

**Deep Work Plan delegators** (forward to the installed [`deepworkplan-skill`](https://github.com/DailybotHQ/deepworkplan-skill) at `~/.claude/skills/deepworkplan-*`):

- `/dwp-create <goal>` — Decompose a goal into a numbered Deep Work Plan with validation gates; plan lands in `.dwp/plans/`
- `/dwp-execute` — Run the active plan task-by-task, validate each gate, update progress
- `/dwp-refine` — Add, remove, or reorder tasks while preserving completed work
- `/dwp-resume` — Reconstruct state and continue an interrupted plan
- `/dwp-status` — Report progress without making changes (read-only)
- `/dwp-verify` — Objective pass/fail conformance report against the DWP spec
- `/dwp-onboard` — Re-run the AI-first onboarding non-destructively
- `/skill-create <name>` — Author a new skill in `.agents/skills/`
- `/agent-create <name>` — Author a new agent in `.agents/agents/`

If the DWP skill pack is not installed yet, run:

```bash
git clone https://github.com/DailybotHQ/deepworkplan-skill.git ~/.local/share/deepworkplan-skill
~/.local/share/deepworkplan-skill/setup.sh --host claude
# Add verify + author sub-skills (not linked by setup.sh in current upstream):
ln -snf ~/.local/share/deepworkplan-skill/skills/deepworkplan/verify ~/.claude/skills/deepworkplan-verify
ln -snf ~/.local/share/deepworkplan-skill/skills/deepworkplan/author ~/.claude/skills/deepworkplan-author
```

**Subagents:**

- `ts-architect` — Decides where new code lives (entry, lib, types), reviews the public surface
- `api-designer` — Owns the shape of `OptionsType` and any new exposed function
- `test-author` — Writes and maintains Vitest tests
- `dependency-auditor` — Reviews `package.json` updates, transitive risks, `.ncurc.json` policy
- `release-engineer` — Owns Vite config, the pnpm publish flow, and GitHub Actions
- `security-reviewer` — Reviews regex inputs, ReDoS risk, and HTML-tag option shapes
- `doc-writer` — Keeps `AGENTS.md`, `README.md`, and `docs/` in sync with code

### How to Invoke Commands

| Agent               | Prefix       | Example       |
| ------------------- | ------------ | ------------- |
| **Claude Code**     | `/` (native) | `/add-option` |
| **OpenAI Codex**    | `#`          | `#add-option` |
| **Cursor AI**       | `#`          | `#add-option` |
| **Gemini / others** | `#`          | `#add-option` |

> **Why `#` for non-Claude agents?** Most AI CLIs (Codex, Cursor) intercept `/` as their own system commands. Using `#` avoids interception. You can also write the command name in plain text: "run add-option".

When a command is invoked (via `/`, `#`, or by name), the agent MUST:

1. **Look up** the command in **[.agents/README.md](.agents/README.md)** to find its skill file
2. **READ** the linked skill file completely
3. **FOLLOW** its step-by-step instructions exactly
4. **DO NOT** improvise or skip steps — the skill file IS the spec

## Conventional Commits

**Format:** `<type>: <description>`

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`

Examples:

- `feat: add wholeWord option to highlight`
- `fix: escape regex metacharacters in query`
- `chore: bump typescript to 6.0.3`
- `build: tighten vite production output`
- `docs: clarify caseSensitive default in README`
- `ci: cache node_modules across release jobs`

The release workflow uses conventional types when generating notes — keep the prefix accurate.
