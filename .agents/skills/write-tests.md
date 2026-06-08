---
name: write-tests
description: Author Vitest tests for the current change in test/*.test.ts
type: skill
---

# Skill: `/write-tests`

Author Vitest tests for the change you just made (or are about to make). Tests live in `test/*.test.ts` and run via Vitest (`vitest run`), which reuses the Vite pipeline — no separate compile step. Specs import test functions explicitly (no globals).

## When to use

- A new option, method, or behavior was added and needs coverage
- A bug was fixed and you want a regression test
- A refactor changed observable behavior and you need a contract check
- You're starting a TDD-style change and want a failing test first

## Inputs to confirm

- **What's being tested** — name + brief description
- **Expected inputs** — the call signature
- **Expected output** — the asserted return value or thrown error
- **Edge cases** — empty input, max-length, Unicode, regex metacharacters

## Procedure

### 1. Locate or create the test file

- `test/main.test.ts` — the suite covering `searchTextHL.highlight`
- `test/exports.test.ts` — the dual-export contract (static source check + built-bundle smoke test); only touch this if you change how the public surface is exported

Decide:

- **New behavior on `highlight`** → add an `it(...)` inside the existing `describe('Test search text highlight', ...)` in `test/main.test.ts`
- **New method (`unhighlight`, etc.)** → add a new `describe(...)` block in `test/main.test.ts`, or split into `test/<method>.test.ts` if the suite grows past ~30 `it`s

Vitest discovers `test/**/*.test.ts` (the `include` glob in `vitest.config.ts`). New files matching that pattern need no extra wiring.

### 2. Import the test API explicitly

There are **no globals** — every spec imports what it uses from `vitest`:

```ts
import { describe, expect, it } from 'vitest'
import searchTextHL from '../src/index'
```

### 3. Pick the right assertion

Vitest's `expect` uses a Jest-style matcher API:

| Goal                | Assertion                                         |
| ------------------- | ------------------------------------------------- |
| Equality (string/primitive) | `expect(result).toBe(expected)`           |
| Deep equality (objects/arrays) | `expect(result).toEqual(expected)`     |
| Inequality          | `expect(result).not.toBe(unexpected)`             |
| Throws              | `expect(() => fn()).toThrow()`                    |
| Throws with message | `expect(() => fn()).toThrow(/some pattern/i)`     |
| Truthy              | `expect(result).toBe(true)`                       |
| Contains substring  | `expect(result).toContain('substring')`           |
| Length              | `expect(arr).toHaveLength(3)`                      |

Use `toBe` for strings and primitives (the bulk of this library's assertions) and `toEqual` for structural comparison. Keep the style consistent across the suite.

### 4. Write the test

Follow the AAA structure (Arrange / Act / Assert):

```ts
it('should highlight emoji codepoints correctly', () => {
  // Arrange
  const text = 'Cool 😎 day'
  const query = '😎'

  // Act
  const result = searchTextHL.highlight(text, query)

  // Assert
  expect(result).toBe('Cool <span class="text-highlight">😎</span> day')
})
```

Rules:

- Title starts with `should` and describes behavior, not implementation
- Single behavior per `it`. If you need "and", split it
- No shared mutable state between tests — every `it` arranges its own inputs
- Don't import from `dist/` — always `import searchTextHL from '../src/index'`

### 5. Cover the matrix

For any change, write at least these tests:

1. **Happy path** — the behavior with sane defaults
2. **Override** — explicit value that differs from default
3. **Validation** — invalid type for the new arg / option throws
4. **Edge case** — empty string, Unicode, regex metacharacters, very long input (only when relevant)

If the change interacts with another option, add at least one combined test:

```ts
it('should respect matchAll when caseSensitive is true', () => {
  const result = searchTextHL.highlight('Aa Aa', 'a', { matchAll: true, caseSensitive: true })
  expect(result).toBe('A<span class="text-highlight">a</span> A<span class="text-highlight">a</span>')
})
```

### 6. Run the new tests

```bash
corepack pnpm run test
```

Or focus on the new `it` while iterating (`-t` filters by test name, `vitest` without `run` watches):

```bash
corepack pnpm exec vitest run test/main.test.ts -t "emoji codepoints"
```

If the test passes immediately, ask: did the implementation already cover this case, or is the test asserting the same code path it tests? A passing-on-first-write test is suspicious. Ideally, write the test before the implementation and watch it fail first.

### 7. Run the full suite

```bash
corepack pnpm run test
```

Make sure your new test didn't break any existing assertion. The current suite is fast — there's no excuse for skipping. If you also changed the public export shape, run `corepack pnpm run build` first so `test/exports.test.ts` exercises the freshly built bundle (it skips the bundle smoke test when `dist/` is stale).

### 8. Verify lint and format

```bash
corepack pnpm run biome:fix
```

Tests are linted and formatted like source. Note `biome.json` allows `console` in `test/**` via an override, so debug logging in a spec won't fail the lint — but remove it before committing.

### 9. Commit

```bash
git add test/main.test.ts
git commit -m "test: cover emoji codepoint highlighting"
```

If the test landed alongside an implementation change, commit them together with the implementation's `feat`/`fix` prefix:

```bash
git add src/ test/
git commit -m "feat: add wholeWord option to highlight"
```

## Anti-patterns

### 1. Testing implementation details

```ts
// bad — asserts on internal call sequence with a spy
it('calls Utils.validate.highlight once', () => {
  const spy = vi.spyOn(Utils.validate, 'highlight')
  searchTextHL.highlight('a', 'a')
  expect(spy).toHaveBeenCalledOnce()
})
```

This breaks on every refactor and doesn't catch real bugs. Test the contract.

### 2. Asserting via stringify

```ts
// bad — masks structural diffs
expect(JSON.stringify(result)).toBe(JSON.stringify(expected))
```

Use `toEqual` for objects, `toBe` for strings.

### 3. Conditionally skipping based on environment

```ts
// bad — hides flakes
if (process.platform === 'darwin') { it.skip(...) }
```

If a test is platform-specific, document the dependency. Otherwise, find the source of non-determinism (often timezones or locale).

### 4. Re-implementing the production code in the test

```ts
// bad — the test passes whenever the bug is also in highlight
it('wraps the match', () => {
  const result = searchTextHL.highlight('hello', 'h')
  const expected = 'hello'.replace(/h/, '<span class="text-highlight">h</span>')
  expect(result).toBe(expected)
})
```

Hardcode the expected output instead.

## Common error patterns

```ts
// Unknown type for the test input — `any` is allowed (noExplicitAny is off in biome.json)
const badInput: any = 42
expect(() => searchTextHL.highlight(badInput, '')).toThrow()
```

The existing tests use this idiom for invalid-type tests.

## Verification checklist

- [ ] At least one happy-path `it` for the new behavior
- [ ] At least one override / non-default `it`
- [ ] At least one validation throw test (if a new arg / option was added)
- [ ] All `it` titles start with `should` and describe behavior
- [ ] Test functions imported from `vitest` (no globals)
- [ ] No shared mutable state between tests
- [ ] `import searchTextHL from '../src/index'` (not from `dist/`)
- [ ] `corepack pnpm run test` passes
- [ ] `corepack pnpm run biome:check` passes
- [ ] Commit message uses `test:` prefix (or matches the implementation's prefix)
