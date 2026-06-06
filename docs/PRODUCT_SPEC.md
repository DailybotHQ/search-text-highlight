# Product Specification — search-text-highlight

> The non-technical "why" for this package. For consumers, integrators, and stakeholders evaluating whether to depend on it.

## What it is

`search-text-highlight` is a tiny **TypeScript library** published on npm that wraps every occurrence of a substring inside a longer text with an HTML element so the match can be styled (typically with a background color). It is the simplest possible building block for the very common "search this page" or "highlight what the user typed" UX pattern.

The published package contains **one public method** — `searchTextHL.highlight(text, query, options)` — and ships with **zero runtime dependencies**. The whole library is deliberately small enough to audit in one sitting.

## Who it is for

- **Web app teams** that need to highlight matches in chat history, knowledge bases, search results, or notification panels and don't want to pull in a 50KB regex/parser dependency for a 30-line problem.
- **Documentation portals** that want to highlight the visitor's search term in rendered Markdown without committing to a heavyweight search-and-replace framework.
- **AI / LLM product surfaces** that show extracted snippets and need to mark the user's query in the snippet (e.g., RAG citation viewers, transcript players, customer-support copilots).
- **Educational and accessibility tools** where a single robust Unicode-aware highlighter is enough.

The library does **not** target server-side rendering of arbitrary HTML, full-text search engines, fuzzy-match scoring, or any flow that needs synonym handling. Those are different problems with bigger tools.

## What it does (in plain terms)

Given:

- A `text` like `"This is a simple but an amazing tool for text highlight 😎."`
- A `query` like `"amazing"`

`searchTextHL.highlight(text, query)` returns:

```
This is a simple but an <span class="text-highlight">amazing</span> tool for text highlight 😎.
```

The caller decides how the `text-highlight` class looks — the library does not ship CSS.

Out of the box, the library:

1. **Highlights every match**, not just the first (`matchAll: true` by default).
2. **Is case-insensitive** unless told otherwise (`caseSensitive: false` by default).
3. **Wraps in `<span>` with class `text-highlight`** unless told otherwise (`htmlTag`, `hlClass`).
4. **Handles Unicode and emoji** correctly so multi-byte characters are not split.

## Why it exists

- **Most highlight code is bespoke and buggy.** Naive implementations break on regex metacharacters in the query, on case mismatches, on emoji, on overlapping matches. `search-text-highlight` solves the common case correctly once.
- **No dependencies, ever.** The published package's `dependencies` field is empty. This matters for consumers running supply-chain audits — every transitive dependency you do not adopt is one you do not need to monitor.
- **Tiny published surface.** One exported object with one method. The risk that a consumer's bundle bloats, that an upgrade breaks them, or that the maintainer can ship a surprise behavior change is intentionally minimized.

## Public contract (the load-bearing promise)

The npm package guarantees exactly one default export:

```ts
searchTextHL.highlight(text: string, query: string, options?: OptionsType): string

interface OptionsType {
  htmlTag?: string         // default 'span'
  hlClass?: string         // default 'text-highlight'
  matchAll?: boolean       // default true
  caseSensitive?: boolean  // default false
}
```

Both ES modules (`import searchTextHL from 'search-text-highlight'`) and CommonJS (`const searchTextHL = require('search-text-highlight')`) consumers are supported by the same artifact. TypeScript users get full type definitions from the bundled `dist/index.d.ts`.

**Changing the signature or the option defaults is a major version bump**, full stop. Every downstream rendered HTML payload depends on the current shape.

## Non-goals

The library deliberately does **not**:

- Sanitize the rendered HTML. Consumers who interpolate untrusted strings into `htmlTag` or `hlClass` will produce invalid markup or worse — see [docs/SECURITY.md](SECURITY.md).
- Provide fuzzy / approximate matching, synonyms, stemming, or scoring.
- Track or rank search results.
- Render anything to a DOM — it returns a string and lets the caller decide where to put it.
- Accept user-supplied regex patterns. The `query` is treated as a literal substring; this is deliberate, both for usability and to keep ReDoS off the table.

## Success criteria

A release is considered successful when:

1. The npm package installs cleanly on Node 24 with no peer-dependency warnings.
2. `searchTextHL.highlight(...)` produces the documented output for every example in [README.md](../README.md).
3. The complete Mocha suite passes (`npm run test`).
4. The Webpack production bundle (`dist/index.js` + `dist/index.d.ts`) is smaller than 10 KB and contains zero third-party code.
5. No new top-level export and no signature change have been introduced without a major version bump and a `CHANGELOG.md` migration note.

## Ownership and lifecycle

- **Maintainer:** [DailyBot](https://www.dailybot.com).
- **Source of truth:** the `main` branch of [`DailyBotHQ/search-text-highlight`](https://github.com/DailyBotHQ/search-text-highlight).
- **Release cadence:** patch releases land via the `release_and_publish` GitHub workflow on merge to `main`. Dependency upgrades land via the scheduled package-upgrade workflow (governed by [`.ncurc.json`](../.ncurc.json)).
- **Support window:** the most recent published minor is fully supported. Older majors receive only critical security backports.

## Related documents

- [README.md](../README.md) — Installation and quick examples (user-facing).
- [API Reference](API_REFERENCE.md) — Full surface area documentation.
- [Architecture](ARCHITECTURE.md) — Module layout and build pipeline.
- [Security](SECURITY.md) — Regex injection, HTML interpolation, and supply-chain notes.
- [Performance](PERFORMANCE.md) — Hot-path expectations and bundle-size limits.
- [Fork Customization](FORK_CUSTOMIZATION.md) — How to rebrand into a new npm package.
