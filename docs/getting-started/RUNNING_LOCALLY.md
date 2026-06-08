# Running Locally

How to use `search-text-highlight` during development. Each section explains what to do, why it works, and how to confirm the result.

If you haven't installed your tools yet, start with [Environment Setup](ENVIRONMENT_SETUP.md). For raw command references see [`../DEVELOPMENT_COMMANDS.md`](../DEVELOPMENT_COMMANDS.md). For the public API contract see [`../API_REFERENCE.md`](../API_REFERENCE.md).

What the package does when used correctly: returns a string with each match of `query` wrapped in `<span class="text-highlight">…</span>`.

```ts
import searchTextHL from 'search-text-highlight'
searchTextHL.highlight('Hello world', 'world')
// → 'Hello <span class="text-highlight">world</span>'
```

The rest of this guide focuses on the developer-side workflows.

> Commands below use `corepack pnpm run …` — the canonical form. Inside the devcontainer, bare `npm run …` is transparently routed to `corepack pnpm` by the `/usr/local/bin/npm` wrapper, and plain `pnpm run …` works anywhere Corepack is enabled (`corepack enable`).

---

## 1. Run the tests

The fastest signal that everything works:

```bash
corepack pnpm run test
```

You should see Vitest report the suite passing:

```text
 ✓ test/main.test.ts (9)
   ✓ should highlight one query substring
   ✓ should highlight multiple query substrings
   ✓ should highlight an unicode substring
   ✓ should do nothing with empty queries
   ✓ should be able to replace the default HTML tag
   ✓ should be able to replace the default highlight class
   ✓ should be able to highlight only the first query match
   ✓ should be able to highlight with a case sensitive match
   ✓ should throw error with not the right type parameter

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

Watch mode (re-runs on save):

```bash
corepack pnpm run test:watch
```

This is the default inner-loop for any change to `src/`.

---

## 2. Run the source directly

```bash
corepack pnpm run dev
```

This starts `nodemon --exec tsx src/index.ts`. The library defines a default export — running `index.ts` directly does nothing observable (no top-level execution), so this command is most useful when paired with a scratch script:

```bash
# 1. In one terminal, start nodemon to keep tsx warm:
corepack pnpm run dev

# 2. In another, run a scratch experiment:
cat > tmp/scratch.ts <<'EOF'
import searchTextHL from '../src/index'
console.log(searchTextHL.highlight('hello world', 'world', { htmlTag: 'mark' }))
EOF
corepack pnpm exec tsx tmp/scratch.ts
```

Place experiments in `tmp/` (gitignored) — never inside `src/`.

---

## 3. Type-check without building

```bash
corepack pnpm run build:tsc
```

Runs `tsc -p tsconfig.build.json --noEmit`. Surfaces type errors quickly without producing a bundle. Use it as the cheapest reaction to "did I break the types?"

---

## 4. Build the production bundle

```bash
corepack pnpm run build
```

This runs Vite in library mode (esbuild minify) and then `tsc -p tsconfig.build.json --emitDeclarationOnly` for the type declarations, writing the npm-shippable artifact to `dist/`:

```text
dist/
├── index.js          # Minified CommonJS bundle (Vite library mode)
└── index.d.ts        # TypeScript declarations (tsc)
```

Sanity-check the output:

```bash
node -e "console.log(require('./dist/index').highlight('hello world', 'world'))"
# → Hello <span class="text-highlight">world</span>
```

The `dist/` folder is gitignored. Don't commit it — CI rebuilds before publishing.

For a development bundle (unminified):

```bash
corepack pnpm run build:dev
```

---

## 5. Lint and format

Biome handles both linting and formatting in a single tool:

```bash
corepack pnpm run biome:check       # Read-only (lint + format check)
corepack pnpm run biome:fix         # Apply safe fixes (lint + format)
corepack pnpm run biome:fix:unsafe  # Apply unsafe fixes too
```

Run `biome:fix` before each commit to clean up lint and formatting in one pass:

```bash
corepack pnpm run biome:fix
```

---

## 6. Inspect the npm tarball

Before opening a release PR, verify only the right files would publish:

```bash
corepack pnpm pack --dry-run
```

Expected: the tarball contains only `dist/index.js`, `dist/index.d.ts` (plus `dist/lib/*.d.ts`), `package.json`, `README.md`, and `LICENSE`. If anything else appears (test files, source `.ts`, docs, `.github/`), check `.npmignore` and the `files` field in `package.json`.

To produce an actual tarball without publishing:

```bash
corepack pnpm pack
ls -lh search-text-highlight-*.tgz
```

You can install this tarball into another project for end-to-end testing:

```bash
cd /path/to/consumer
npm install /path/to/search-text-highlight/search-text-highlight-*.tgz
```

---

## 7. Use the package from a scratch consumer

Quickly verify the package resolves both as ESM and CommonJS:

```bash
# CommonJS
node -e "const h = require('./dist/index'); console.log(h.highlight('a b a', 'a'))"

# ESM-like via dynamic import
node -e "import('./dist/index.js').then(m => console.log(m.default.highlight('a b a', 'a')))"
```

Both should produce identical output.

---

## 8. Run a single Vitest test

```bash
corepack pnpm exec vitest run -t "unicode"
```

`-t` (alias for `--testNamePattern`) is matched against `describe` + `it` titles. Useful when iterating on a specific case. To watch a single file:

```bash
corepack pnpm exec vitest test/main.test.ts
```

---

## 9. Bump dependencies

```bash
corepack pnpm run ncu:check               # List packages with newer versions (respects .ncurc.json)
corepack pnpm run ncu:upgrade             # Apply upgrades to package.json
corepack pnpm install                     # Refresh pnpm-lock.yaml
```

Then run the full check chain:

```bash
corepack pnpm run biome:check && \
  corepack pnpm run build:tsc && \
  corepack pnpm run test && \
  corepack pnpm run build
```

For a guided workflow, use the `/bump-deps` skill — see [.agents/skills/bump-deps.md](../../.agents/skills/bump-deps.md).

---

## 10. Use the AI CLIs

The devcontainer ships with three AI assistants. Outside the container:

```bash
claude        # Claude Code
codex         # OpenAI Codex
agent         # Cursor CLI
gh            # GitHub CLI (issues, PRs, releases)
```

Inside the container, the wrappers `claudex`, `codexx`, `cursorx` start sessions with permissions bypassed (safe inside the container, dangerous on a host).

---

## Quick reference

| Goal            | Command                                              | Notes                                               |
| --------------- | --------------------------------------------------- | --------------------------------------------------- |
| Test            | `corepack pnpm run test`                            | One-shot (Vitest)                                   |
| Test (watch)    | `corepack pnpm run test:watch`                      | Default inner loop                                  |
| Type-check      | `corepack pnpm run build:tsc`                       | Fastest type feedback                               |
| Build (prod)    | `corepack pnpm run build`                           | Vite bundle + tsc declarations; what ships to npm   |
| Build (dev)     | `corepack pnpm run build:dev`                       | Unminified                                          |
| Lint + format   | `corepack pnpm run biome:fix`                       | Biome, with auto-fix                                |
| Tarball preview | `corepack pnpm pack --dry-run`                      | Verify publish contents                             |
| Bump deps       | `corepack pnpm run ncu:upgrade && corepack pnpm install` | Then run full check chain                      |
| Release locally | `corepack pnpm run release`                         | Bumps version + tags; CI handles the actual publish |

For the full reference (testing flags, Vite flags, troubleshooting) see [`../DEVELOPMENT_COMMANDS.md`](../DEVELOPMENT_COMMANDS.md).

If a step doesn't work, check [Troubleshooting](TROUBLESHOOTING.md) — every issue we've actually hit is in there.
