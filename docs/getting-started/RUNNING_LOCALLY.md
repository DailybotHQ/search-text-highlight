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

---

## 1. Run the tests

The fastest signal that everything works:

```bash
npm run test
```

You should see:

```
  Test search text highlight
    ✔ should highlight one query substring
    ✔ should highlight multiple query substrings
    ✔ should highlight an unicode substring
    ✔ should do nothing with empty queries
    ✔ should be able to replace the default HTML tag
    ✔ should be able to replace the default highlight class
    ✔ should be able to highlight only the first query match
    ✔ should be able to highlight witch case sensitve match
    ✔ should throw error with not the right type parameter

  9 passing
```

Watch mode (re-runs on save):

```bash
npm run test:watch
```

This is the default inner-loop for any change to `src/`.

---

## 2. Run the source directly

```bash
npm run dev
```

This starts `nodemon src/index.ts`. The library defines a default export — running `index.ts` directly does nothing observable (no top-level execution), so this command is most useful when paired with a scratch script:

```bash
# 1. In one terminal, start nodemon to keep ts-node warm:
npm run dev

# 2. In another, run a scratch experiment:
cat > tmp/scratch.ts <<'EOF'
import searchTextHL from '../src/index'
console.log(searchTextHL.highlight('hello world', 'world', { htmlTag: 'mark' }))
EOF
npx ts-node tmp/scratch.ts
```

Place experiments in `tmp/` (gitignored) — never inside `src/`.

---

## 3. Type-check without building

```bash
npm run build:tsc
```

Runs `tsc --build tsconfig.json`. Surfaces type errors quickly without producing a webpack bundle. Use it as the cheapest reaction to "did I break the types?"

---

## 4. Build the production bundle

```bash
npm run build
```

This runs Webpack in production mode and writes the npm-shippable artifact to `dist/`:

```
dist/
├── index.js          # Minified CommonJS bundle
└── index.d.ts        # TypeScript declarations
```

Sanity-check the output:

```bash
node -e "console.log(require('./dist/index').highlight('hello world', 'world'))"
# → Hello <span class="text-highlight">world</span>
```

The `dist/` folder is gitignored. Don't commit it — CI rebuilds before publishing.

For a development bundle (unminified, source maps):

```bash
npm run build:dev
```

---

## 5. Lint and format

```bash
npm run eslint:check     # Read-only
npm run eslint:fix       # Apply --fix
npm run prettier:check   # Read-only
npm run prettier:fix     # Apply --write
```

Run `eslint:fix` and `prettier:fix` together before each commit:

```bash
npm run eslint:fix && npm run prettier:fix
```

---

## 6. Inspect the npm tarball

Before opening a release PR, verify only the right files would publish:

```bash
npm pack --dry-run
```

Expected:

```
search-text-highlight@2.0.8
=== Tarball Contents ===
12.3kB dist/index.js
 1.4kB dist/index.d.ts
 2.5kB package.json
 5.1kB README.md
 1.0kB LICENSE
=== Tarball Details ===
name:          search-text-highlight
version:       2.0.8
filename:      search-text-highlight-2.0.8.tgz
package size:  10.0kB
unpacked size: 22.4kB
shasum:        ...
total files:   5
```

If anything else appears (test files, source `.ts`, docs, `.github/`), check `.npmignore`.

To produce an actual tarball without publishing:

```bash
npm pack
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

## 8. Run a single Mocha test

```bash
npx mocha --require ts-node/register test/main.test.ts --timeout 25000 --colors --grep "unicode"
```

`--grep` is a regex matched against `describe` + `it` titles. Useful when iterating on a specific case.

---

## 9. Bump dependencies

```bash
npm run ncu:check        # List packages with newer versions (respects .ncurc.json)
npm run ncu:upgrade      # Apply upgrades to package.json
npm install              # Refresh package-lock.json
```

Then run the full check chain:

```bash
npm run eslint:check && \
  npm run prettier:check && \
  npm run build:tsc && \
  npm run test && \
  npm run build
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

| Goal            | Command                              | Notes                                               |
| --------------- | ------------------------------------ | --------------------------------------------------- |
| Test            | `npm run test`                       | One-shot                                            |
| Test (watch)    | `npm run test:watch`                 | Default inner loop                                  |
| Type-check      | `npm run build:tsc`                  | Fastest type feedback                               |
| Build (prod)    | `npm run build`                      | What ships to npm                                   |
| Build (dev)     | `npm run build:dev`                  | Source maps, unminified                             |
| Lint            | `npm run eslint:fix`                 | With auto-fix                                       |
| Format          | `npm run prettier:fix`               | With auto-write                                     |
| Tarball preview | `npm pack --dry-run`                 | Verify publish contents                             |
| Bump deps       | `npm run ncu:upgrade && npm install` | Then run full check chain                           |
| Release locally | `npm run release`                    | Bumps version + tags; CI handles the actual publish |

For the full reference (testing flags, webpack flags, troubleshooting) see [`../DEVELOPMENT_COMMANDS.md`](../DEVELOPMENT_COMMANDS.md).

If a step doesn't work, check [Troubleshooting](TROUBLESHOOTING.md) — every issue we've actually hit is in there.
