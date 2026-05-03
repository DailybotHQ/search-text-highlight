---
name: add-feature
description: Add a wholly new method to the searchTextHL public surface (rare, major version bump)
type: skill
---

# Skill: `/add-feature`

Add a new top-level method on `searchTextHL`. This is **rare** — most needs are better solved with a new option (see [`/add-option`](add-option.md)). A new method is a public-surface change and a major version bump.

## When to use

The user asks for behavior that genuinely doesn't fit `highlight(...)`'s contract (input → wrapped HTML output). Examples that **do** justify a new method:

- `unhighlight(html)` — strip wrapping tags from an already-highlighted string
- `highlightAll(text, queries[])` — wrap multiple distinct queries with potentially different classes
- `findMatches(text, query, options)` — return an array of `{ start, end, match }` instead of HTML

Examples that **don't**:

- "Make highlight return an object" — that's a breaking change to existing API; do it in a major bump if needed
- "Allow regex source as input" — already supported (the implementation passes `query` directly to `RegExp`)
- "Add an `escape` helper" — that's an option (`escapeQuery: boolean`), not a method

## Inputs to confirm with the user

- **Method name** (camelCase — `unhighlight`, `findMatches`)
- **Signature** — exact argument names, types, and return type
- **Why it can't be an option on `highlight`** — be skeptical
- **Default behavior** — what it does with empty input, missing options, etc.
- **Confirmation** that this is a major version bump

## Procedure

### 1. Confirm: is this really a new method?

Pause and re-check with the user. The library's contract is "one method, one job". Adding a new method:

- Doubles the surface area
- Doubles the test coverage burden
- Doubles the documentation
- Is a major version bump (existing `searchTextHL` consumers get a non-passive change in their type imports)

If the user agrees this is the right path, continue.

### 2. Update the type interface

Edit `src/lib/type.ts`:

```ts
export interface SearchTextHLType {
  highlight: (text: string, query: string, options?: OptionsType) => string
  /** Strip highlight wrapping tags from an already-highlighted string */
  unhighlight: (html: string, options?: UnhighlightOptionsType) => string
}

/** Options for the unhighlight method */
export interface UnhighlightOptionsType {
  /** HTML tag to strip. Default: 'span' */
  htmlTag?: string
  /** Class attribute value to match for stripping. Default: 'text-highlight' */
  hlClass?: string
}
```

Rules:

- The new method's options get their own interface — don't reuse `OptionsType` if the semantics differ
- If the options share most fields, decide carefully whether to share the type or duplicate (duplication is often clearer for divergent semantics)

### 3. Extend the validators

Edit `src/lib/utils.ts`. Add a new validator group:

```ts
const Utils: UtilsType = {
  validate: {
    highlight(text, query, options) {
      /* ... existing ... */
    },
    options(options) {
      /* ... existing ... */
    },
    unhighlight(html: string, options: UnhighlightOptionsType): void {
      if (html && typeof html !== 'string') {
        throw new Error('The html parameter should be a string.')
      }
      if (typeof options !== 'object') {
        throw new Error('The options parameter should be an object.')
      }
    },
    unhighlightOptions(options: UnhighlightOptionsType = {}): void {
      if (typeof options.htmlTag !== 'undefined' && typeof options.htmlTag !== 'string') {
        throw new Error('The htmlTag option should be a string.')
      }
      if (typeof options.hlClass !== 'undefined' && typeof options.hlClass !== 'string') {
        throw new Error('The hlClass option should be a string.')
      }
    },
  },
  getOptions(options) {
    /* ... existing ... */
  },
  getUnhighlightOptions(options: UnhighlightOptionsType = {}): UnhighlightOptionsType {
    this.validate.unhighlightOptions(options)
    return {
      htmlTag: options.htmlTag ?? 'span',
      hlClass: options.hlClass ?? 'text-highlight',
    }
  },
}
```

Update `UtilsType` in `src/lib/type.ts` to include the new validators and getters.

### 4. Add the method body

Edit `src/index.ts`:

```ts
const searchTextHL: SearchTextHLType = {
  highlight(text, query, options) {
    /* ... existing ... */
  },
  unhighlight(html: string = '', options: UnhighlightOptionsType = {}): string {
    Utils.validate.unhighlight(html, options)
    options = Utils.getUnhighlightOptions(options)
    const pattern = `<${options.htmlTag} class="${options.hlClass}">(.*?)</${options.htmlTag}>`
    return html.replace(new RegExp(pattern, 'g'), '$1')
  },
}
```

Rules:

- Match the validation → defaults → work flow used by `highlight`
- Pure function — no side effects
- If the new method touches a regex, audit for ReDoS — see [Security](../../docs/SECURITY.md#regex-injection--redos)

### 5. Add tests

Create a new `describe` block in `test/main.test.ts`:

```ts
describe('Test unhighlight', () => {
  it('should strip default highlight wrapper', () => {
    const html = 'Hello <span class="text-highlight">world</span>'
    const result = searchTextHL.unhighlight(html)
    expect(result).to.be.equal('Hello world')
  })

  it('should support custom tag and class', () => {
    const html = 'Hello <mark class="hit">world</mark>'
    const result = searchTextHL.unhighlight(html, { htmlTag: 'mark', hlClass: 'hit' })
    expect(result).to.be.equal('Hello world')
  })

  it('should leave non-matching markup intact', () => {
    const html = 'Hello <strong>world</strong>'
    const result = searchTextHL.unhighlight(html)
    expect(result).to.be.equal('Hello <strong>world</strong>')
  })

  it('should throw when html is not a string', () => {
    expect(() => searchTextHL.unhighlight(42 as any)).to.throw(Error)
  })
})
```

Cover at least: default behavior, override, validation error, edge cases (empty input, no matches).

### 6. Document the new method

Update [`docs/API_REFERENCE.md`](../../docs/API_REFERENCE.md):

- Add a new top-level section: `## searchTextHL.unhighlight(html, options?)`
- Mirror the structure of the `highlight` section: signature table, returns, behavior, options, examples, validation errors

Update `README.md`:

- Add a new usage section with code examples
- Update the options tables (one per method)

Update `AGENTS.md`:

- Bump the "single public method" callouts in "Public API is the Contract" — there are now multiple methods
- Add the new method to the "Don't" list: "Don't change the `searchTextHL.unhighlight(...)` signature in a non-major release"

### 7. Bump the major version

```bash
npm version major -m "[🤖 DailyBot] New release to v%s launched 🚀"
```

This commits the version bump and creates a tag. **Don't** push yet — the workflow runs `npm version patch` again on merge, which would double-bump. Coordinate with maintainers:

- Either temporarily disable the workflow's `npm run release` step (separate PR, revert after the release lands)
- Or merge the version commit directly to `main` via a tagged release branch

### 8. Migration notes

In the same PR, add a `MIGRATING.md` section (or update the existing one) documenting the move from N → N+1:

```md
## Migrating to v3.0.0

- New: `searchTextHL.unhighlight(html, options)` method (no consumer action required)
- The default export is unchanged; existing `highlight` calls continue to work
```

For breaking changes (default flips, removed options), be explicit about the upgrade path.

### 9. Verify

```bash
npm run eslint:fix
npm run prettier:fix
npm run build:tsc
npm run test
npm run build
npm pack --dry-run
```

All six must pass. The tarball preview should show the same files as before.

### 10. Commit

```bash
git add src/ test/ docs/ README.md AGENTS.md package.json package-lock.json
git commit -m "feat!: add unhighlight method"
```

The `!` after `feat` signals a breaking change in conventional commits.

## Don't

- Add the new method without confirming with the user — the option-on-existing-method path is almost always better
- Reuse `OptionsType` for a method whose options have different semantics
- Skip the version bump
- Forget to update `AGENTS.md`'s "Public API surface" section

## Do

- Pause and confirm — twice if needed — that this isn't really a `/add-option` task
- Mirror the existing `highlight` validation / defaults / body pattern
- Document with the same structure as the existing public method
- Coordinate the major version bump with the release workflow

## Verification checklist

- [ ] `SearchTextHLType` updated
- [ ] New options interface added (if applicable)
- [ ] Validators (`Utils.validate.<method>`, `Utils.validate.<method>Options`) added
- [ ] Defaults helper added
- [ ] Method body in `src/index.ts`
- [ ] Tests cover default, override, validation, edge cases
- [ ] `docs/API_REFERENCE.md` has a new top-level section
- [ ] `README.md` updated with usage and options tables
- [ ] `AGENTS.md` "Public API surface" callouts updated
- [ ] `MIGRATING.md` (or equivalent) explains the change
- [ ] `npm version major` ran (or coordinated with maintainers)
- [ ] Full check chain passes
- [ ] `feat!: ...` conventional commit message
