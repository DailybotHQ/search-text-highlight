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

                                     │ compiled by webpack + ts-loader
                                     ▼
                              dist/index.js   (CommonJS bundle, libraryTarget commonjs2)
                              dist/index.d.ts (TypeScript declaration, from `tsc --build`)
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
├── package.json                       # Scripts, deps, npm metadata, `engines` lock
├── package-lock.json                  # Pinned dependency tree (commit alongside package.json)
├── tsconfig.json                      # Strict TS config; emits to dist/
├── webpack.config.js                  # Production bundling (CommonJS, ts-loader)
├── .babelrc                           # @babel/preset-env (kept for downstream interop)
├── eslint.config.mjs                  # ESLint flat config + ignore globs
├── .prettierrc                        # Prettier config (no semis, single quotes)
├── .editorconfig                      # 2-space indent, LF, UTF-8
├── .ncurc.json                        # npm-check-updates: rejects chai / @types/chai majors (ESM-only upstream)
├── .npmignore                         # Files excluded from the npm tarball
├── .gitignore                         # Local artifacts, `dist/`, `tmp/*`
│
├── src/                               # Library source
│   ├── index.ts                       # Public entry — exports `searchTextHL`
│   └── lib/
│       ├── type.ts                    # All public + internal interfaces
│       └── utils.ts                   # Validation + default-option resolution
│
├── test/                              # Mocha + Chai suite (`test/*.test.ts`)
│   └── main.test.ts
│
├── dist/                              # Webpack output — gitignored, regenerated, npm-published
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

| Tool                                          | Purpose                                                 | Inputs                       | Outputs                                             |
| --------------------------------------------- | ------------------------------------------------------- | ---------------------------- | --------------------------------------------------- |
| `ts-node` (via Mocha)                         | Run tests directly from TypeScript without a precompile | `src/`, `test/`              | nothing on disk                                     |
| `tsc --build` (`npm run build:tsc`)           | Type-check + emit `.d.ts` declarations                  | `tsconfig.json` → `src/**/*` | `dist/*.js`, `dist/*.d.ts` (uses `outDir: ./dist/`) |
| `webpack --mode production` (`npm run build`) | Single-file CommonJS bundle for npm                     | `src/index.ts` (entry)       | `dist/index.js` (overwrites tsc output)             |

**Order matters in CI.** The `Release and Publish` workflow runs `npm run build` (webpack), which is the artifact that ships. `tsc --build` is used during development for declaration files; the published `.d.ts` ride alongside the webpack output because `tsconfig.json` declares `declaration: true` and webpack invokes `ts-loader` with that config.

`webpack.config.js` highlights:

- `entry: src/index.ts`
- `libraryTarget: 'commonjs2'` — the published bundle exports a CommonJS module
- `optimization.minimize: true` — ships minified
- `clean-webpack-plugin` runs **only in production mode** to wipe `dist/` before each build

`tsconfig.json` highlights:

- `module: 'commonjs'`, `moduleResolution: 'node'`, `target` defaults to ES3 — the bundle stays widely compatible
- `strict-ish` flags: `strictNullChecks`, `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`
- `declaration: true` + `outDir: ./dist/` produce the `.d.ts` files referenced by `package.json`'s `types` field
- `removeComments: true` — published source has no comments
- `include: ['src/**/*']`, `exclude: ['node_modules', 'dist']`

## Test pipeline

```
mocha --require ts-node/register test/**.ts --timeout 25000 --colors
```

Mocha discovers `test/*.test.ts` (the `**` glob expands to `**.ts` because Mocha treats the path literally — see `package.json`'s `test` script). `ts-node/register` compiles TypeScript on the fly. Chai's `expect` assertions return chained errors with the offending value embedded.

The 25-second timeout is generous for a synchronous library — most tests finish in milliseconds. Keep it; it gives Mocha room to print diagnostics on slow CI runners.

## Dependency boundaries

- `dependencies` is **empty**. No runtime third-party code ships in the npm tarball.
- All tooling lives in `devDependencies`.
- New `dependencies` require an explicit decision (size impact + maintenance) and a [Technologies](TECHNOLOGIES.md) update.

## Mental model summary

1. **One public method.** `searchTextHL.highlight` is the API; everything else is implementation detail
2. **Two-layer separation.** `index.ts` is orchestration; `lib/` holds validation and types
3. **Validate at the boundary, never below.** Internal functions trust their typed inputs
4. **Single bundle, two module systems.** Webpack emits CommonJS; types are compatible with both `import` and `require`
5. **Zero runtime dependencies.** Adding one is a release-team decision, not a routine PR
