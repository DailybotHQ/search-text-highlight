# API Reference

The complete public surface of `search-text-highlight`. Anything not documented here is implementation detail and may change without a major version bump.

## Import / require

```ts
// ES modules
import searchTextHL from 'search-text-highlight'

// CommonJS
const searchTextHL = require('search-text-highlight')
```

Both forms resolve to the same default-exported object. `package.json` declares:

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

So TypeScript consumers get full inference automatically.

## `searchTextHL.highlight(text, query, options?)`

Wraps every match of `query` inside `text` with an HTML element so it can be styled.

| Argument  | Type          | Default | Description                              |
| --------- | ------------- | ------- | ---------------------------------------- |
| `text`    | `string`      | `''`    | Source text to scan                      |
| `query`   | `string`      | `''`    | Substring (or regex source) to highlight |
| `options` | `OptionsType` | `{}`    | Optional behavior overrides              |

**Returns:** a `string` — the original `text` with each `query` match wrapped, or `text` unchanged if `query` is empty.

**Throws:** `Error` with an English message when any argument has the wrong type. Error messages reference the offending argument name (e.g. `'The text parameter should be a string.'`).

### Behavior

1. The function validates argument shapes via `Utils.validate.highlight` and `Utils.validate.options`
2. Defaults are filled by `Utils.getOptions` — see the table below
3. If `query === ''`, the function returns `text` unchanged (early return)
4. The query is interpreted as a **regex source** — see [Regex semantics](#regex-semantics) below
5. Every match becomes `<htmlTag class="hlClass">match</htmlTag>`

## Options (`OptionsType`)

| Key             | Type      | Default            | Effect                                                                                              |
| --------------- | --------- | ------------------ | --------------------------------------------------------------------------------------------------- |
| `htmlTag`       | `string`  | `'span'`           | HTML tag used to wrap each match — interpolated raw into the output                                 |
| `hlClass`       | `string`  | `'text-highlight'` | Value of the `class` attribute on the wrapping element — interpolated raw                           |
| `matchAll`      | `boolean` | `true`             | When `false`, only the first match is wrapped. When `true`, every match is wrapped (regex `g` flag) |
| `caseSensitive` | `boolean` | `false`            | When `false`, matching ignores case (regex `i` flag)                                                |

All options are optional. Unrecognized keys are ignored (no validation error) but they have no effect — they're not passed through to the regex.

## Regex semantics

**Important:** the `query` parameter is used as a **regex source**, not as a literal string. The current implementation does:

```ts
new RegExp(query, modifiers)
```

This is a feature for legitimate uses (matching word boundaries, character classes, Unicode escapes) but it has two consequences:

1. **Regex metacharacters in `query` change the meaning.** A query like `'.'` matches every character, not just a literal dot. Consumers passing user-typed search terms must escape metacharacters themselves
2. **Catastrophic backtracking is possible** if the consumer hands the function a malicious pattern. See [Security → Regex injection / ReDoS](SECURITY.md#regex-injection--redos) for the threat model

**Recommendation for consumers:** escape user-typed search terms before calling `highlight`:

```ts
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const safe = searchTextHL.highlight(text, escapeRegex(userInput))
```

We deliberately **do not** escape inside the library — historical behavior matches regex sources, and changing it would break existing consumers. A future major release may add an `escapeQuery: boolean` option (see [Fork Customization](FORK_CUSTOMIZATION.md) for guidance on evolving the API).

## HTML safety

`htmlTag` and `hlClass` are interpolated **raw** into the output. The library does not HTML-escape them.

- **Safe usage:** pass static, hardcoded values (`'span'`, `'text-highlight'`)
- **Unsafe usage:** piping user input into `htmlTag` (e.g., `htmlTag: userTag`) — a value like `'span class="x" onclick="alert(1)" data-y="z'` would inject markup

The matched text from `query` is **not** HTML-escaped either. If your `text` contains HTML you intend to render, the match will be wrapped inside whatever existing markup is present. For raw-HTML inputs, sanitize them downstream.

## Examples

### Basic

```ts
const text = 'This is a simple but an amazing tool for text highlight 😎.'
const query = 'amazing'
searchTextHL.highlight(text, query)
// → 'This is a simple but an <span class="text-highlight">amazing</span> tool for text highlight 😎.'
```

### Match all instances

```ts
searchTextHL.highlight('aaa', 'a')
// → '<span class="text-highlight">a</span><span class="text-highlight">a</span><span class="text-highlight">a</span>'
```

### Match only the first instance

```ts
searchTextHL.highlight('aaa', 'a', { matchAll: false })
// → '<span class="text-highlight">a</span>aa'
```

### Custom tag and class

```ts
searchTextHL.highlight(text, 'amazing', { htmlTag: 'mark', hlClass: 'hit' })
// → '...an <mark class="hit">amazing</mark> tool...'
```

### Case-sensitive matching

```ts
searchTextHL.highlight(text, 'AMAZING', { caseSensitive: true })
// → text unchanged (no match)

searchTextHL.highlight(text, 'amazing', { caseSensitive: true })
// → '...an <span class="text-highlight">amazing</span> tool...'
```

### Empty query

```ts
searchTextHL.highlight(text, '')
// → text unchanged
```

### Unicode / emoji

```ts
searchTextHL.highlight('Cool 😎 day', '😎')
// → 'Cool <span class="text-highlight">😎</span> day'
```

### Validation errors

```ts
searchTextHL.highlight(42 as any, 'q')
// → throws: Error 'The text parameter should be a string.'

searchTextHL.highlight('text', 'q', { matchAll: 1 as any })
// → throws: Error 'The matchAll option should be a boolean.'
```

## Suggested CSS

The default class is `text-highlight`. A minimal stylesheet:

```css
:root {
  --light-blue-color: #b1d9ff;
  --dark-blue-color: #508fca;
}

.text-highlight {
  background: var(--light-blue-color);
  border-radius: 2px;
  padding: 0 2px;
  border: 1px solid var(--dark-blue-color);
}
```

The README ships the same snippet for end users.

## Types exported

`OptionsType` and `SearchTextHLType` are declared in `src/lib/type.ts` and emitted to `dist/index.d.ts` as part of the published declarations. They are reachable as namespaced types when needed:

```ts
import type { OptionsType } from 'search-text-highlight'

const options: OptionsType = { matchAll: false }
```

> If `OptionsType` does not resolve in your project, your TypeScript version may be older than what the declarations target. The package is built against TypeScript 5.5; consumers below that version may need the legacy `default-import` form.

## Backwards compatibility

The signature, option names, option defaults, and rendered output format are part of the contract. Changes to any of them require a **major version bump**. The release workflow runs `npm version patch` by default; for major / minor releases run `npm version major` / `npm version minor` manually with the same `-m` template before merging.

## Roadmap (non-binding)

Ideas the maintainers have considered but **not** committed to:

- `escapeQuery: boolean` — auto-escape regex metacharacters in `query`
- `wholeWord: boolean` — match only at word boundaries (`\b...\b`)
- `replacement: (match: string) => string` — let consumers control wrapping
- Sanitization of `htmlTag` / `hlClass` (against an allowlist)

These would all be additive (no breaking change) and would land behind their own option keys. If you need one, open an issue with a use case before sending a PR.
