# Performance

`searchTextHL.highlight(...)` is a tiny function but it's called per-render in many consumer apps. This guide is the maintenance manual for keeping it fast.

## The hot path

Today's implementation is roughly:

```ts
function highlight(text: string, query: string, options: OptionsType = {}): string {
  Utils.validate.highlight(text, query, options)
  options = Utils.getOptions(options)
  if (!query) return text

  const modifiers = (options.matchAll ? 'g' : '') + (options.caseSensitive ? '' : 'i')
  return text.replace(
    new RegExp(query, modifiers),
    (match) => `<${options.htmlTag} class="${options.hlClass}">${match}</${options.htmlTag}>`
  )
}
```

Three hot points:

1. **`Utils.validate.*`** — `typeof` checks. Cheap. Don't replace with class instances or schema validators
2. **`new RegExp(query, modifiers)`** — compiled once per call. Don't move it inside the `replace` callback
3. **`String.prototype.replace`** — the actual work. Single pass over the text

The function is **synchronous** and **pure**. Don't introduce side effects, async paths, or memoization caches without a measured win.

## Bundle size

Zero runtime dependencies. The published `dist/index.js` (esbuild-minified by Vite) is well under 2 KB. To check:

```bash
pnpm run build
ls -lh dist/
gzip -c dist/index.js | wc -c     # gzipped size — what consumers actually pay for
```

Targets:

- **Source**: keep `src/` under 200 lines total
- **Bundle**: stay under 2 KB minified, 1 KB gzipped

Adding a runtime dependency immediately violates these targets. See [Technologies → What this repository deliberately does not ship](TECHNOLOGIES.md#what-this-repository-deliberately-does-not-ship).

## Microbenchmarks

The repo doesn't ship a benchmark harness, but a quick comparison is easy:

```ts
// tmp/bench.ts
import searchTextHL from '../src/index'

const text = 'lorem ipsum '.repeat(10000)
const query = 'ipsum'

console.time('highlight')
for (let i = 0; i < 1000; i++) {
  searchTextHL.highlight(text, query)
}
console.timeEnd('highlight')
```

Run with `pnpm tsx tmp/bench.ts`. On a typical laptop, 1000 calls over a 120 KB string complete in ~50–100 ms.

When you ship a perf-relevant change, paste before/after numbers in the PR description.

## Common pitfalls

### 1. Compiling the regex inside `replace`

```ts
// bad — compiles N times
return text.replace(/* ... */, (match) => {
  const re = new RegExp(query, modifiers)   // ❌ never do this here
  return /* ... */
})
```

Today's code compiles **once** per call. Keep it that way.

### 2. Allocating intermediate strings

`String.prototype.replace` with a regex is the most efficient single-pass option. Avoid:

```ts
// bad — three passes, three allocations
text.split(query).map(/* ... */).join(/* ... */)

// bad — manual loop with string concatenation
let result = ''
for (const ch of text) {
  /* ... */
}
```

### 3. Recompiling the regex on every render in the consumer

Consumers calling `highlight(text, query, options)` inside a render function re-validate and re-compile every render. If a consumer profiles your library and points at this, the optimization belongs **in the consumer** (memoize on `[text, query, JSON.stringify(options)]`), not here. Adding caching inside the library means we own state — bad for a pure utility.

### 4. Catastrophic backtracking

User-controlled regex patterns can cause the engine to spin. The library accepts regex syntax in `query` by design — it's the consumer's job to escape user input or to time-bound the call. See [Security → Regex injection / ReDoS](SECURITY.md#regex-injection--redos).

If we ever add a feature that constructs regex sources programmatically (e.g., `wholeWord: true` would prepend / append `\b`), we must:

- Audit the resulting pattern for nested quantifiers (`(a+)+`)
- Add tests with adversarial inputs (`'a'.repeat(30) + '!'` against `(a+)+!`)

### 5. Unicode pitfalls

JavaScript regex without the `u` flag treats most Unicode characters as single code units. Today's code does **not** set the `u` flag — that's why the existing emoji test (`'😎'`) works without explicit Unicode handling, because `String.prototype.replace` operates on UTF-16 code units and the test's emoji happens to round-trip cleanly.

If you add Unicode-aware features (e.g., grapheme cluster boundaries, named character classes), you'll need:

- The `u` flag on the regex (and the test for invalid patterns becomes stricter)
- The `v` flag for set notation if Node version permits

Before adding either, read the [MDN reference on regex flags](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) and document the change in [API Reference](API_REFERENCE.md).

## Profiling

Node has built-in profiling for synchronous code:

```bash
node --prof tmp/bench.js
node --prof-process isolate-*.log > tmp/profile.txt
```

Inspect `tmp/profile.txt` for the V8 stack samples. The hot frames should be `RegExp::Exec`, `String::Replace`, and the wrapper callback — anything else is suspect.

For finer-grained timing in the browser (when consumers profile), the `performance.measure` API works on the result of `highlight` calls; nothing inside the library disables it.

## What we'd accept as a PR

- Benchmark scripts in `tmp/bench/` (gitignored, no commitment to maintain) used to back a perf claim
- A change that makes one operation faster **without** regressing any other operation, backed by numbers
- A reduction in bundle size (kilobytes count) — usually means deleting a default that's no longer needed

## What we'd reject

- Caching layers without measured wins
- Loop unrolling or hand-rolled regex implementations replacing `String.prototype.replace`
- Optional fast paths gated by additional options (every option has a maintenance cost; perf optimizations should be invisible)
- Dependencies (`regexp-tree`, `xregexp`, etc.) that would dwarf the library's bundle size

## Pre-merge perf checklist

When a change touches the hot path:

- [ ] `pnpm run test` passes
- [ ] `pnpm run build` produces a bundle within size targets
- [ ] Numbers from a representative input (small + medium + large) are in the PR description
- [ ] If the regex changes, an adversarial-input test is added to `test/main.test.ts`
- [ ] `corepack pnpm pack --dry-run` shows the same files as before (no accidental new artifact)
