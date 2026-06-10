# Architecture

This document explains the **big picture** of `search-text-highlight` so a new contributor (human or agent) can be productive quickly. For day-to-day commands see [Development Commands](DEVELOPMENT_COMMANDS.md). For language-specific rules see [Standards](STANDARDS.md).

## High-level model

```
                        ┌──────────────────────────────────┐
                        │  src/index.ts                    │
                        │  ─────────────────────────────── │
                        │  • searchTextHL.highlight(...)   │
                        │  • default + module.exports      │
                        └────────────┬─────────────────────┘
                                     │ uses
            ┌────────────────────────┴───────────────────────┐
            ▼                                                ▼
   src/lib/utils.ts                                  src/lib/type.ts
   • Utils.validate.highlight                       • OptionsType
   • Utils.validate.options                         • SearchTextHLType
   • Utils.getOptions   (fills defaults)            • UtilsType
                                                    • ObjectType, Class<T>

                                     │ bundled by Vite (esbuild minify)
                                     ▼
                              dist/index.js   (CommonJS bundle, lib mode formats: ['cjs'])
                              dist/index.d.ts (TypeScript declaration, from `tsc -p tsconfig.build.json`)
                                     │ published as npm tarball
                                     ▼
                              consumers:
                              • Node:    const searchTextHL = require('search-text-highlight')
                              • Modern:  import searchTextHL from 'search-text-highlight'
                              • TS:      types resolve from `dist/index.d.ts` (`types` field)
```

There is no application runtime — the package is a pure function dressed up as a single-method object. Every external call lands in `searchTextHL.highlight`, which validates, fills defaults, builds a `RegExp`, and runs `String.prototype.replace`.

## Project structure

```
search-text-highlight/
├── AGENTS.md                          # Single source of truth for AI agents
├── CLAUDE.md → AGENTS.md              # Symlink (do not edit directly)
├── README.md                          # Public-facing intro + usage
├── LICENSE                            # MIT
├── package.json                       # Scripts, deps, npm metadata, `engines`, `packageManager`
├── pnpm-lock.yaml                     # Pinned dependency tree (commit alongside package.json)
├── pnpm-workspace.yaml                # pnpm config: minimumReleaseAge + allowBuilds (esbuild)
├── .node-version / .nvmrc             # Pinned Node version (24.16.0)
├── tsconfig.json                      # Strict TS config (base)
├── tsconfig.build.json               # Build config — scopes declaration emit to src/
├── vite.config.ts                     # Library-mode bundling (CommonJS, esbuild minify)
├── vitest.config.ts                   # Test runner config (Node env, test/**/*.test.ts)
├── biome.json                         # Biome lint + format config (single quotes, no semis)
├── .editorconfig                      # 2-space indent, LF, UTF-8
├── .ncurc.json                        # npm-check-updates policy
├── .npmignore                         # Belt-and-suspenders alongside the `files` allowlist
├── .gitignore                         # Local artifacts, `dist/`, `tmp/*`
│
├── src/                               # Library source
│   ├── index.ts                       # Public entry — exports `searchTextHL`
│   └── lib/
│       ├── type.ts                    # All public + internal interfaces
│       └── utils.ts                   # Validation + default-option resolution
│
├── test/                              # Vitest suite (`test/*.test.ts`)
│   ├── main.test.ts                   # Public API behavior
│   └── exports.test.ts                # Dual-export (default + module.exports) smoke test on dist/
│
├── dist/                              # Vite + tsc output — gitignored, regenerated, npm-published
│
├── docs/                              # This documentation
│   └── getting-started/               # Environment setup, running locally, troubleshooting
│
├── .agents/                           # Skills / commands / subagents catalog
├── .claude/ → .agents/                # Symlink so Claude Code resolves the same files
│
├── .github/
│   ├── workflows/                     # CI: code_check, release_and_publish, package upgrades
│   └── scripts/                       # Helper scripts called from workflows
│
├── docker/
│   ├── custom_commands.sh             # `check`, `fix`, `typecheck`, `test`, `build`, `codecheck`, AI CLI wrappers
│   └── local/
│       ├── docker-compose.yaml        # Devcontainer service definition
│       └── searchTextHL/              # Dockerfile + entrypoint + .env example
│
├── .devcontainer_example/             # Reference VS Code devcontainer.json
└── tmp/                               # Scratch workspace (git-ignored, see AGENTS.md)
```

## Module layout

The source is intentionally three files. Each has one job.

| File               | Role                                                                                                                                                                                                                         | Imports                                                                     | Imported by      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------- |
| `src/index.ts`     | Public entry: declares `searchTextHL: SearchTextHLType`, calls `Utils.validate.highlight`, `Utils.getOptions`, builds the regex, returns the wrapped HTML. Also assigns `module.exports = searchTextHL` for CommonJS interop | `OptionsType`, `SearchTextHLType` from `lib/type`; `Utils` from `lib/utils` | none (entry)     |
| `src/lib/utils.ts` | Owns all input validation and default resolution. Throws plain `Error` with English messages on invalid arguments                                                                                                            | `OptionsType`, `UtilsType` from `lib/type`                                  | `src/index.ts`   |
| `src/lib/type.ts`  | Declares every public and internal interface                                                                                                                                                                                 | none                                                                        | both files above |

A new option means changes to **all three** files plus a test.

## The `highlight` data flow

```
highlight(text, query, options)
   │
   ├─► Utils.validate.highlight(text, query, options)
   │       throws if any argument has the wrong shape
   │
   ├─► Utils.getOptions(options)
   │       → Utils.validate.options(options)   (per-key shape)
   │       → fills defaults for missing keys
   │
   ├─► early return when query is empty
   │       (avoids a degenerate empty-pattern RegExp that would match every position)
   │
   ├─► modifiers = (matchAll ? 'g' : '') + (caseSensitive ? '' : 'i')
   │
   └─► text.replace(new RegExp(query, modifiers), match =>
           `<${htmlTag} class="${hlClass}">${match}</${htmlTag}>`
       )
```

Two invariants:

1. **`query` is used as the regex source verbatim.** The user can pass regex syntax. That's a feature today (it's what enables the test `'😎'` → highlights the emoji) but it's also a security boundary — see [Security → Regex injection](SECURITY.md#regex-injection--redos)
2. **`htmlTag` and `hlClass` are interpolated into HTML without escaping.** Values originate from the consumer's own code (typical) but if a consumer pipes user input into either, attribute injection becomes possible. This is documented in [API Reference](API_REFERENCE.md)

## Build pipeline

Three independent toolchains touch the source. Knowing which does what avoids confusion.

| Tool                                              | Purpose                                                 | Inputs                            | Outputs                                              |
| ------------------------------------------------- | ------------------------------------------------------- | --------------------------------- | --------------------------------------------------- |
| Vitest (uses the Vite pipeline)                   | Run tests directly from TypeScript without a precompile | `src/`, `test/`                   | nothing on disk                                     |
| `vite build` (first half of `pnpm run build`)     | Single-file CommonJS bundle for npm (esbuild minify)    | `src/index.ts` (entry)            | `dist/index.js`                                     |
| `tsc -p tsconfig.build.json` (second half)        | Emit `.d.ts` declarations only (`--emitDeclarationOnly`)| `tsconfig.build.json` → `src/**/*`| `dist/index.d.ts`, `dist/lib/*.d.ts`               |

**Order matters.** `pnpm run build` runs `vite build && tsc -p tsconfig.build.json --emitDeclarationOnly` — Vite emits the JS bundle that ships, then `tsc` lays the declarations alongside it. Vite's `emptyOutDir: true` clears `dist/` at the start of the bundle step, so the declaration emit must come **after** the Vite build, not before.

`vite.config.ts` highlights:

- `lib.entry: src/index.ts`, `lib.fileName: () => 'index.js'`
- `lib.formats: ['cjs']` — the published bundle is a CommonJS module (the package has no `"type":"module"`, so `require('search-text-highlight').highlight(...)` keeps working)
- `build.minify: 'esbuild'` — ships minified
- `build.emptyOutDir: true` — wipes `dist/` before each bundle
- No `rollupOptions.external` — everything is inlined so the published package has **zero** runtime dependencies. Two cosmetic Rollup warnings (`COMMONJS_VARIABLE_IN_ESM`, `MIXED_EXPORTS`) about the `module.exports` interop tail are intentionally silenced

`tsconfig.json` / `tsconfig.build.json` highlights:

- `module: 'commonjs'`, `moduleResolution: 'node'`, `target` defaults to ES3 — the bundle stays widely compatible
- `strict-ish` flags: `strictNullChecks`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`
- `tsconfig.build.json` extends the base, sets `rootDir: ./src`, and excludes `test/` so test files never leak into the published `.d.ts`
- `declaration: true` produces the files referenced by `package.json`'s `types` field

## Test pipeline

```
vitest run
```

Vitest discovers `test/**/*.test.ts` (configured in `vitest.config.ts`) and runs them through the Vite pipeline, so TypeScript is handled natively with no separate compile step. Specs import their API explicitly — `import { describe, it, expect } from 'vitest'` (no globals) — and Vitest's `expect` assertions embed the offending value in the failure message.

`test/exports.test.ts` is a dual-export smoke test: it loads the built `dist/` bundle and confirms both the default import and the `module.exports` access path resolve `highlight`. The `build → test` order in CI exists so this spec runs against fresh output.

## Dependency boundaries

- `dependencies` is **empty**. No runtime third-party code ships in the npm tarball.
- All tooling lives in `devDependencies`.
- New `dependencies` require an explicit decision (size impact + maintenance) and a [Technologies](TECHNOLOGIES.md) update.

## Mental model summary

1. **One public method.** `searchTextHL.highlight` is the API; everything else is implementation detail
2. **Two-layer separation.** `index.ts` is orchestration; `lib/` holds validation and types
3. **Validate at the boundary, never below.** Internal functions trust their typed inputs
4. **Single bundle, two module systems.** Vite emits CommonJS; types are compatible with both `import` and `require`
5. **Zero runtime dependencies.** Adding one is a release-team decision, not a routine PR
