# Testing Guide

How to write and run tests in `search-text-highlight`. The package ships with **Mocha + Chai** and runs TypeScript directly via `ts-node` — no precompile, no fixtures, no setup files.

## Where tests live

| Location         | Compiled by            | Use                                               |
| ---------------- | ---------------------- | ------------------------------------------------- |
| `test/*.test.ts` | `ts-node` (on the fly) | All tests today; one file per public surface area |

The starter currently has only `test/main.test.ts`. Add more files when the suite grows past ~30 `it` blocks per file. Match the file name to the area being tested (e.g., `validation.test.ts`, `regex.test.ts`).

## Running tests

```bash
npm run test             # All tests, one shot
npm run test:watch       # Re-run on src/ or test/ change
```

Run a single file:

```bash
npx mocha --require ts-node/register test/main.test.ts --timeout 25000 --colors
```

Run by description (`--grep`):

```bash
npx mocha --require ts-node/register test/**.ts --timeout 25000 --colors --grep "unicode"
```

CI runs `npm run test` directly — no special flags.

## Conventions

1. **Mirror the public surface.** `test/main.test.ts` covers `searchTextHL.highlight(...)`. New methods get their own file
2. **One `describe(...)` per surface,** named after the area: `describe('Test search text highlight', () => { ... })`
3. **One `it(...)` per behavior.** If a description needs "and", split it into two
4. **Description in sentence case starting with `should`:** `it('should highlight one query substring', ...)`
5. **Arrange / Act / Assert with blank lines between sections** when the test has more than three lines
6. **Plain Chai `expect(...).to.equal(...)`.** Don't introduce `should` syntax (mixing styles makes failures harder to read)

```ts
import { expect } from 'chai'
import searchTextHL from '../src/index'

describe('Test search text highlight', () => {
  it('should highlight one query substring', () => {
    const text = 'This is a simple but an amazing tool for text highlight 😎.'
    const query = 'amazing'

    const result = searchTextHL.highlight(text, query)

    expect(result).to.be.equal(
      'This is a simple but an <span class="text-highlight">amazing</span> tool for text highlight 😎.'
    )
  })
})
```

## What to test

**Always:**

- Every public option, with both the default value and an overridden value
- Every validation error path (wrong type for `text`, `query`, `options`, and each option key)
- Edge cases: empty `query`, empty `text`, query that matches nothing, query equal to `text`
- Unicode / emoji preservation
- Order-of-application when multiple options interact (e.g., `caseSensitive: true` + `matchAll: false`)

**Sometimes:**

- Performance regressions on a large input (only when a perf-relevant change ships)
- Cross-engine compatibility (Node vs browsers) — usually not needed; the bundle is plain CommonJS

**Rarely:**

- Tests that assert internal call sequences ("`Utils.validate.highlight` was invoked once") — they brittle quickly and don't catch real bugs

## Asserting thrown errors

`expect(() => fn()).to.throw(Error)` covers the existing throw tests. Be specific when the message matters:

```ts
expect(() => searchTextHL.highlight(42 as any, '')).to.throw(/text parameter should be a string/i)
```

Use `as any` plus `// eslint-disable-line` if a test deliberately violates the type contract — that's how the existing suite tests invalid inputs.

## Adding tests for a new option

When you add an option (say `wholeWord: boolean`):

1. **Default behavior test.** With the option omitted, the result matches today's behavior
2. **Explicit `false`.** Same as default
3. **Explicit `true`.** Behavior changes as documented
4. **Validation.** Passing a non-boolean throws an `Error`
5. **Interaction.** Combine with `matchAll`, `caseSensitive` — at least one combined test

```ts
it('should match only whole words when wholeWord is true', () => {
  const text = 'amazing amazingly amazement'
  const query = 'amazing'
  const result = searchTextHL.highlight(text, query, { wholeWord: true })

  expect(result).to.be.equal('<span class="text-highlight">amazing</span> amazingly amazement')
})

it('should throw when wholeWord is not a boolean', () => {
  expect(() => {
    searchTextHL.highlight('text', 'q', { wholeWord: 'true' as any })
  }).to.throw(Error)
})
```

## Async / coroutine code

The library is synchronous and the suite is too. If you ever introduce async behavior, switch to Mocha's promise-based form:

```ts
it('should resolve with the highlighted result', async () => {
  const result = await searchTextHL.highlightAsync('text', 'q')
  expect(result).to.equal('...')
})
```

Don't use callback-style `done` — promise-based tests are clearer.

## Snapshot / golden-file testing

Not wired today. If a feature needs it (e.g., comparing against a large generated HTML blob), add `chai-snapshot-tests` or write a simple helper that reads `test/__golden__/*.html`. Document the choice in [Technologies](TECHNOLOGIES.md).

## Coverage

No coverage tool is wired. To add `c8` (built on V8's native coverage):

```bash
npm install --save-dev c8
```

Then add a script to `package.json`:

```json
"test:coverage": "c8 --reporter=text --reporter=html npm run test"
```

Update [Technologies](TECHNOLOGIES.md) and [Development Commands](DEVELOPMENT_COMMANDS.md) when you do.

## Speed

The whole suite runs in <1s on a warm machine. If a single test crosses 1s, it's almost certainly doing something accidentally — check for an unintentional `for` loop on a huge input or a forgotten `await`.

## Pre-push standard

```bash
npm run test
```

If it fails, the work isn't done. The Code Check workflow blocks the PR on failure.

## Common pitfalls

1. **Forgetting `--require ts-node/register`** when invoking Mocha directly — `import` statements throw `SyntaxError`. Use `npm run test` or include the flag
2. **Importing from `dist/`** — tests should import from `../src/index`, not the built bundle. Otherwise you're testing yesterday's code
3. **Asserting on regex modifiers indirectly** — assert on the rendered HTML, not on the regex object internals
4. **Hard-coding the emoji 😎** — that one's a feature, but if you add Unicode tests, prefer code-pointed escapes (`'\u{1F60E}'`) for portability across editors
5. **Sharing mutable state across tests** — every `it` should set up its own inputs. Don't hoist a `let result` to module scope
