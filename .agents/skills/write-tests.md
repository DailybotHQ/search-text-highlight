---
name: write-tests
description: Author Mocha + Chai tests for the current change in test/main.test.ts
type: skill
---

# Skill: `/write-tests`

Author Mocha + Chai tests for the change you just made (or are about to make). Tests live in `test/*.test.ts` and run via `ts-node` — no separate compile step.

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

The current suite lives in `test/main.test.ts` covering `searchTextHL.highlight`. Decide:

- **New behavior on `highlight`** → add an `it(...)` inside the existing `describe('Test search text highlight', ...)`
- **New method (`unhighlight`, etc.)** → add a new `describe(...)` block in the same file, or split into `test/<method>.test.ts` if the suite grows past ~30 `it`s

Mocha discovers `test/**.ts` (the existing glob in `package.json`). New files don't need extra wiring.

### 2. Pick the right Chai assertion

| Goal                | Assertion                                      |
| ------------------- | ---------------------------------------------- |
| Equality            | `expect(result).to.be.equal(expected)`         |
| Inequality          | `expect(result).to.not.equal(unexpected)`      |
| Throws              | `expect(() => fn()).to.throw(Error)`           |
| Throws with message | `expect(() => fn()).to.throw(/some pattern/i)` |
| Truthy              | `expect(result).to.be.true`                    |
| Contains            | `expect(result).to.include('substring')`       |
| Length              | `expect(arr).to.have.lengthOf(3)`              |

The existing tests use `to.be.equal` for strings — keep that style. Don't introduce `should` syntax (mixing styles makes failure messages noisier).

### 3. Write the test

Follow the AAA structure (Arrange / Act / Assert):

```ts
it('should highlight emoji codepoints correctly', () => {
  // Arrange
  const text = 'Cool 😎 day'
  const query = '😎'

  // Act
  const result = searchTextHL.highlight(text, query)

  // Assert
  expect(result).to.be.equal('Cool <span class="text-highlight">😎</span> day')
})
```

Rules:

- Title starts with `should` and describes behavior, not implementation
- Single behavior per `it`. If you need "and", split it
- No shared mutable state between tests — every `it` arranges its own inputs
- Don't import from `dist/` — always `import searchTextHL from '../src/index'`

### 4. Cover the matrix

For any change, write at least these tests:

1. **Happy path** — the behavior with sane defaults
2. **Override** — explicit value that differs from default
3. **Validation** — invalid type for the new arg / option throws
4. **Edge case** — empty string, Unicode, regex metacharacters, very long input (only when relevant)

If the change interacts with another option, add at least one combined test:

```ts
it('should respect matchAll when caseSensitive is true', () => {
  const result = searchTextHL.highlight('Aa Aa', 'a', { matchAll: true, caseSensitive: true })
  expect(result).to.be.equal('A<span class="text-highlight">a</span> A<span class="text-highlight">a</span>')
})
```

### 5. Run the new tests

```bash
npm run test
```

Or focus on the new `it` while iterating:

```bash
npx mocha --require ts-node/register test/main.test.ts --timeout 25000 --colors --grep "emoji codepoints"
```

If the test passes immediately, ask: did the implementation already cover this case, or is the test asserting the same code path it tests? A passing-on-first-write test is suspicious. Ideally, write the test before the implementation and watch it fail first.

### 6. Run the full suite

```bash
npm run test
```

Make sure your new test didn't break any existing assertion. The current suite is fast — there's no excuse for skipping.

### 7. Verify lint and format

```bash
npm run eslint:fix && npm run prettier:fix
```

Tests are linted and formatted like source.

### 8. Commit

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
// bad — asserts on internal call sequence
it('calls Utils.validate.highlight once', () => {
  const spy = sinon.spy(Utils.validate, 'highlight')
  searchTextHL.highlight('a', 'a')
  expect(spy.calledOnce).to.be.true
})
```

This breaks on every refactor and doesn't catch real bugs. Test the contract.

### 2. Asserting via stringify

```ts
// bad — masks structural diffs
expect(JSON.stringify(result)).to.equal(JSON.stringify(expected))
```

Use `to.deep.equal` for objects, `to.be.equal` for strings.

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
  expect(result).to.equal(expected)
})
```

Hardcode the expected output instead.

## Common error patterns

```ts
// Unknown type for the test input — use `as any` with eslint-disable
let badInput: any = 42 // eslint-disable-line
expect(() => searchTextHL.highlight(badInput, '')).to.throw(Error)
```

The existing tests use this idiom for invalid-type tests.

## Verification checklist

- [ ] At least one happy-path `it` for the new behavior
- [ ] At least one override / non-default `it`
- [ ] At least one validation throw test (if a new arg / option was added)
- [ ] All `it` titles start with `should` and describe behavior
- [ ] No shared mutable state between tests
- [ ] `import searchTextHL from '../src/index'` (not from `dist/`)
- [ ] `npm run test` passes
- [ ] `npm run eslint:check` and `npm run prettier:check` pass
- [ ] Commit message uses `test:` prefix (or matches the implementation's prefix)
