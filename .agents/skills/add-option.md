---
name: add-option
description: Add a new option to OptionsType and wire it through validation, defaults, the public function, tests, and docs
type: skill
---

# Skill: `/add-option`

Add a new option to `searchTextHL.highlight(...)`. Touches `src/lib/type.ts`, `src/lib/utils.ts`, `src/index.ts`, `test/main.test.ts`, [`docs/API_REFERENCE.md`](../../docs/API_REFERENCE.md), and `README.md`.

## When to use

The user asks to "add an option", "support X behavior", or "make Y configurable". This is the canonical path for any new flag on `highlight`.

## Inputs to confirm with the user

- **Option name** (camelCase — `wholeWord`, `escapeQuery`, `stripExisting`)
- **Type** (`boolean` is most common; `string`, `number`, or a literal union are also acceptable)
- **Default value** — must preserve existing behavior (a default change is a major version bump)
- **What it does** — one sentence
- **Major / minor?** — additive options without default change are minor bumps; default changes are major

## Procedure

### 1. Add the field to `OptionsType`

Edit `src/lib/type.ts`:

```ts
export interface OptionsType {
  htmlTag?: string
  hlClass?: string
  matchAll?: boolean
  caseSensitive?: boolean
  /** Match only at word boundaries. Default: false */
  wholeWord?: boolean
}
```

Rules:

- The field is **optional** (`?:`) — required fields would break existing consumers
- Add a JSDoc comment with the default value — this surfaces in IDE hover
- Place it after existing options to preserve the documented order

### 2. Extend `Utils.validate.options`

Edit `src/lib/utils.ts`:

```ts
options(options: OptionsType = {}): void {
  // ... existing checks
  if (typeof options.wholeWord !== 'undefined' && typeof options.wholeWord !== 'boolean') {
    throw new Error('The wholeWord option should be a boolean.')
  }
},
```

Rules:

- Use the same `typeof options.X !== 'undefined' && typeof options.X !== '<type>'` pattern as the existing checks
- Error message format: `'The <name> option should be a <type>.'` (no extra punctuation, no value interpolation — see [Standards → Error messages](../../docs/STANDARDS.md))

### 3. Add the default in `Utils.getOptions`

Edit `src/lib/utils.ts`:

```ts
getOptions(options: OptionsType = {}): OptionsType {
  this.validate.options(options)
  return {
    htmlTag: options.htmlTag ? options.htmlTag : 'span',
    hlClass: options.hlClass ? options.hlClass : 'text-highlight',
    matchAll: typeof options.matchAll !== 'undefined' ? options.matchAll : true,
    caseSensitive: typeof options.caseSensitive !== 'undefined' ? options.caseSensitive : false,
    wholeWord: typeof options.wholeWord !== 'undefined' ? options.wholeWord : false,
  }
},
```

Use the same default-fill pattern as similar-typed options (`matchAll` and `caseSensitive` for booleans; `htmlTag` and `hlClass` for strings).

### 4. Use the option in `src/index.ts`

This is the only step that varies per option. The current implementation:

```ts
let modifiers = options.matchAll ? 'g' : ''
modifiers += options.caseSensitive ? '' : 'i'
return text.replace(new RegExp(query, modifiers), (match) => {
  return `<${options.htmlTag} class="${options.hlClass}">${match}</${options.htmlTag}>`
})
```

For `wholeWord`, you'd transform the regex source:

```ts
const pattern = options.wholeWord ? `\\b${query}\\b` : query
let modifiers = options.matchAll ? 'g' : ''
modifiers += options.caseSensitive ? '' : 'i'
return text.replace(new RegExp(pattern, modifiers), (match) => {
  return `<${options.htmlTag} class="${options.hlClass}">${match}</${options.htmlTag}>`
})
```

Rules:

- Don't allocate inside the `replace` callback (compile the regex once)
- If the option changes the regex, run a regex-DoS audit — see [Security → Regex injection](../../docs/SECURITY.md#regex-injection--redos)
- If the option could conflict with another (e.g., `wholeWord: true` + a `query` that contains regex anchors), document the interaction or add a validation check

### 5. Add tests

Edit `test/main.test.ts`. Add at least three tests:

```ts
it('should match only whole words when wholeWord is true', () => {
  const text = 'amazing amazingly amazement'
  const query = 'amazing'
  const result = searchTextHL.highlight(text, query, { wholeWord: true })

  expect(result).to.be.equal('<span class="text-highlight">amazing</span> amazingly amazement')
})

it('should not affect matching when wholeWord is false', () => {
  const text = 'amazing amazingly'
  const query = 'amazing'
  const result = searchTextHL.highlight(text, query, { wholeWord: false })

  expect(result).to.be.equal(
    '<span class="text-highlight">amazing</span> <span class="text-highlight">amazing</span>ly'
  )
})

it('should throw when wholeWord is not a boolean', () => {
  expect(() => {
    searchTextHL.highlight('text', 'q', { wholeWord: 'true' as any })
  }).to.throw(Error)
})
```

Add an interaction test if the new option meaningfully combines with an existing one:

```ts
it('should respect caseSensitive when wholeWord is true', () => {
  const result = searchTextHL.highlight('Amazing amazing', 'amazing', {
    wholeWord: true,
    caseSensitive: true,
  })
  expect(result).to.be.equal('Amazing <span class="text-highlight">amazing</span>')
})
```

### 6. Update [`docs/API_REFERENCE.md`](../../docs/API_REFERENCE.md)

Add a row to the Options table:

```md
| `wholeWord` | `boolean` | `false` | Match only at word boundaries (uses `\b...\b`) |
```

If the option needs a usage example, add it under the Examples section using the same code-fence style as the others.

### 7. Update `README.md`

Mirror the addition in the README's options table (the same one that appears at the bottom of the README). Run `npm run prettier:fix` afterward — Prettier will reflow if needed.

### 8. Verify

```bash
npm run eslint:fix
npm run prettier:fix
npm run build:tsc
npm run test
npm run build
```

All five must pass.

### 9. Commit

```bash
git add src/lib/type.ts src/lib/utils.ts src/index.ts test/main.test.ts docs/API_REFERENCE.md README.md
git commit -m "feat: add wholeWord option to highlight"
```

Conventional commit type:

- `feat` — new option
- `fix` — bug fix that introduces a guard option
- `breaking` — none, but call out a default change in the body of the message

If the change is a default flip (rare; major version bump), add a `BREAKING CHANGE:` footer:

```
feat: default escapeQuery to true

BREAKING CHANGE: previously regex syntax in `query` was interpreted as a regex.
Consumers relying on regex behavior must now pass `escapeQuery: false`.
```

## Don't

- Add a required option (every option must default cleanly)
- Forget the validation check — the test suite includes throw tests that will fail-loud if an option type goes unchecked
- Inline the default value in `src/index.ts` instead of `Utils.getOptions`
- Skip the README / API_REFERENCE update — they're the consumer-facing contract

## Do

- Mirror the JSDoc default in the API_REFERENCE table and the README table
- Pair every new option with at least three tests (default, override, validation)
- Use the existing `typeof` validation pattern; don't introduce a custom error class
- Run the full check chain before pushing

## Verification checklist

- [ ] `OptionsType` has the new optional field with JSDoc
- [ ] `Utils.validate.options` checks the new key
- [ ] `Utils.getOptions` fills the default
- [ ] `src/index.ts` uses the option (or it's an inert option that only exists for typing — discouraged)
- [ ] Tests cover default, override, and invalid type
- [ ] `docs/API_REFERENCE.md` Options table updated
- [ ] `README.md` Options table updated
- [ ] Full check chain passes
- [ ] Conventional commit message
