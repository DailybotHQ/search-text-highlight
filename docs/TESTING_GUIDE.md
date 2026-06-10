# Testing Guide

How to write and run tests in `search-text-highlight`. The package ships with **Vitest**, which runs TypeScript directly through the Vite pipeline — no precompile, no fixtures, no setup files.

## Where tests live

| Location         | Run by                | Use                                                    |
| ---------------- | --------------------- | ------------------------------------------------------ |
| `test/*.test.ts` | Vitest (Vite pipeline)| All tests; one file per public surface area            |

There are two files today: `test/main.test.ts` (public API behavior) and `test/exports.test.ts` (a dual-export smoke test that runs against the built `dist/` bundle). Add more files when the suite grows past ~30 `it` blocks per file. Match the file name to the area being tested (e.g., `validation.test.ts`, `regex.test.ts`).

## Running tests

```bash
pnpm run test            # All tests, one shot (vitest run)
pnpm run test:watch      # Re-run affected specs on src/ or test/ change (vitest)
```

Run a single file:

```bash
pnpm vitest run test/main.test.ts
```

Run by name (`-t` / `--testNamePattern`):

```bash
pnpm test -- -t "unicode"
# or, equivalently:
pnpm vitest run -t "unicode"
```

CI runs `pnpm run build` (to refresh `dist/` for the exports smoke test) followed by `pnpm run test` — no special flags.

## Conventions

1. **Import the API explicitly.** Vitest runs without globals — start every spec with `import { describe, it, expect } from 'vitest'`
2. **Mirror the public surface.** `test/main.test.ts` covers `searchTextHL.highlight(...)`. New methods get their own file
3. **One `describe(...)` per surface,** named after the area: `describe('Test search text highlight', () => { ... })`
4. **One `it(...)` per behavior.** If a description needs "and", split it into two
5. **Description in sentence case starting with `should`:** `it('should highlight one query substring', ...)`
6. **Arrange / Act / Assert with blank lines between sections** when the test has more than three lines
7. **Plain `expect(...).toBe(...)` / `.toEqual(...)`.** Don't mix assertion styles — it makes failures harder to read

```ts
import { describe, it, expect } from 'vitest'
import searchTextHL from '../src/index'

describe('Test search text highlight', () => {
  it('should highlight one query substring', () => {
    const text = 'This is a simple but an amazing tool for text highlight 😎.'
    const query = 'amazing'

    const result = searchTextHL.highlight(text, query)

    expect(result).toBe(
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
- Dual-export resolution against the built bundle — `test/exports.test.ts` already covers `require` + default import; extend it if the export shape changes

**Rarely:**

- Tests that assert internal call sequences ("`Utils.validate.highlight` was invoked once") — they brittle quickly and don't catch real bugs

## Asserting thrown errors

`expect(() => fn()).toThrow(Error)` covers the existing throw tests. Be specific when the message matters:

```ts
expect(() => searchTextHL.highlight(42 as any, '')).toThrow(/text parameter should be a string/i)
```

Use `as any` if a test deliberately violates the type contract — that's how the existing suite tests invalid inputs. Biome allows `any` (`noExplicitAny` is off), so no inline suppression is needed.

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

  expect(result).toBe('<span class="text-highlight">amazing</span> amazingly amazement')
})

it('should throw when wholeWord is not a boolean', () => {
  expect(() => {
    searchTextHL.highlight('text', 'q', { wholeWord: 'true' as any })
  }).toThrow(Error)
})
```

## Async / coroutine code

The library is synchronous and the suite is too. If you ever introduce async behavior, return or `await` the promise:

```ts
it('should resolve with the highlighted result', async () => {
  const result = await searchTextHL.highlightAsync('text', 'q')
  expect(result).toBe('...')
})
```

Vitest awaits returned promises automatically — there's no callback-style `done` to manage.

## Snapshot / golden-file testing

Vitest has snapshots built in (`expect(value).toMatchSnapshot()` / `.toMatchInlineSnapshot()`). Reach for them only when comparing against a large generated HTML blob; for the small outputs this library produces, an explicit `expect(...).toBe(...)` reads better. Document any new snapshot usage in [Technologies](TECHNOLOGIES.md).

## Coverage

Vitest bundles V8-based coverage; no extra dependency is needed for the provider. Add a script to `package.json`:

```json
"test:coverage": "vitest run --coverage"
```

The first run prompts to install `@vitest/coverage-v8` — pin it as a `devDependency`. Update [Technologies](TECHNOLOGIES.md) and [Development Commands](DEVELOPMENT_COMMANDS.md) when you wire it.

## Speed

The whole suite runs in <1s on a warm machine. If a single test crosses 1s, it's almost certainly doing something accidentally — check for an unintentional `for` loop on a huge input or a forgotten `await`.

## Pre-push standard

```bash
pnpm run test
```

If it fails, the work isn't done. The Code Check workflow blocks the PR on failure.

## Common pitfalls

1. **Forgetting the explicit Vitest import** — specs run without globals, so omitting `import { describe, it, expect } from 'vitest'` throws `ReferenceError`
2. **Importing from `dist/` in behavior specs** — `test/main.test.ts` should import from `../src/index`, not the built bundle, or you're testing yesterday's code. (`test/exports.test.ts` is the deliberate exception — it verifies the published bundle.)
3. **Asserting on regex modifiers indirectly** — assert on the rendered HTML, not on the regex object internals
4. **Hard-coding the emoji 😎** — that one's a feature, but if you add Unicode tests, prefer code-pointed escapes (`'\u{1F60E}'`) for portability across editors
5. **Sharing mutable state across tests** — every `it` should set up its own inputs. Don't hoist a `let result` to module scope
