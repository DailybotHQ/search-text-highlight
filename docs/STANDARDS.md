# Standards

Canonical coding rules for `search-text-highlight`. Every contributor (human or agent) must follow these. Biome handles most formatting and lint details — these standards cover the things tooling cannot decide for you.

## Language

- **English only** for code, identifiers, comments, JSDoc, commit messages, branch names, and PR descriptions
- The library has no end-user strings (it produces HTML; consumers localize)
- Biome's `noConsole: error` is on for `src/` — do not use `console.log` there (the rule is disabled for `test/**`)

## Formatting and lint (Biome)

Biome (`biome.json`) is the single source of truth for formatting and lint. Run `pnpm run biome:fix` before committing; CI gates on `pnpm run biome:check`. The configured rules:

| Setting              | Value       | Notes                                              |
| -------------------- | ----------- | -------------------------------------------------- |
| `semicolons`         | `asNeeded`  | No trailing semicolons unless syntactically needed |
| `quoteStyle`         | `single`    | Single quotes for string literals                  |
| `trailingCommas`     | `es5`       | Trailing commas where ES5 allows                   |
| `lineWidth`          | `120`       | Matches `.editorconfig`                            |
| `indentStyle` / width| space / 2   | 2-space indent, `useEditorconfig: true`            |
| `noConsole`          | `error`     | `src/` only — off for `test/**`                    |
| `noExplicitAny`      | `off`       | `any` is allowed (used for invalid-input tests)    |

Don't disable a rule to silence one warning. If a rule is genuinely wrong for the codebase, change it in `biome.json` deliberately and explain why in the commit message.

## Files and modules

| File               | Purpose                                                                       | Allowed to import from                   |
| ------------------ | ----------------------------------------------------------------------------- | ---------------------------------------- |
| `src/index.ts`     | Public entry; exports `searchTextHL` and the same object via `module.exports` | `./lib/type`, `./lib/utils`              |
| `src/lib/type.ts`  | All interfaces (public + internal)                                            | nothing — keep this file dependency-free |
| `src/lib/utils.ts` | Validation helpers and option defaults                                        | `./type`                                 |

If a new file is needed, it lives under `src/lib/` with a single, named responsibility. Don't introduce barrels (`index.ts` re-export files) inside `src/lib/`.

## Naming

| Element                        | Convention                                                                           | Example                                           |
| ------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| File                           | `lowerCamelCase.ts` for source modules; `kebab-case.test.ts` is acceptable for tests | `utils.ts`, `type.ts`, `main.test.ts`             |
| Interface                      | `PascalCase`, suffixed `Type` when the name is otherwise generic                     | `OptionsType`, `SearchTextHLType`                 |
| Type alias                     | `PascalCase`                                                                         | `Modifier`                                        |
| Function / method              | `camelCase`                                                                          | `getOptions`, `validate.highlight`                |
| Constant (compile-time)        | `SCREAMING_SNAKE_CASE` only when truly module-level and immutable                    | `const DEFAULT_TAG = 'span'`                      |
| Test method (`it` description) | sentence-case English starting with "should"                                         | `it('should highlight one query substring', ...)` |

Don't shorten domain words (`hlClass` is the existing public option name and is documented — keep it). Don't introduce single-letter parameter names except for `i` / `j` / `k` in tight loops.

## Public API surface

The npm package exports **one** object: `searchTextHL: SearchTextHLType`, with a **single** method: `highlight(text, query, options?)`.

1. New options live in `OptionsType`. Don't add positional arguments
2. Don't introduce new top-level exports (e.g., a separate `escape` helper) without a major version bump and a [Documentation Guide](DOCUMENTATION_GUIDE.md) update
3. Default option values are part of the contract — changing them is a breaking change

Full surface details: [API Reference](API_REFERENCE.md).

## Types

1. **Every interface lives in `src/lib/type.ts`.** Never inline a structural type in `index.ts` or `utils.ts`
2. **No `any` in public types.** Use generics or unions. The single `any` exception in this repo is `ObjectType: { [key: string]: any }`, used only to type opaque consumer payloads if needed. Biome permits `any` (`noExplicitAny: off`), so no inline suppression is required
3. **All option keys are optional.** Required keys would break existing consumers
4. **Document new option semantics in the JSDoc of the option's own type field**, not in the implementation

```ts
// good
export interface OptionsType {
  /** HTML tag wrapping each match. Default: 'span' */
  htmlTag?: string
}

// bad — JSDoc lives on the implementation, far from consumers' IDE hover
export const getOptions = (...) => ({
  // wraps with htmlTag (default: 'span')
})
```

## Validation

Every public boundary call goes through `Utils.validate.*`. Internal helpers do not re-validate.

1. **Throw plain `Error` with a clear English message.** Don't introduce custom error classes — that increases the public surface
2. **Throw eagerly.** Validate before any work. The current implementation does this in `Utils.validate.highlight` before `getOptions` builds defaults
3. **One validator per concern.** `validate.highlight` checks the top-level argument shape; `validate.options` checks each option key; default-filling is `getOptions`'s job. Keep them separate

When you add a new option:

```ts
// in src/lib/type.ts
export interface OptionsType {
  // ... existing options
  wholeWord?: boolean
}

// in src/lib/utils.ts
const Utils: UtilsType = {
  validate: {
    options(options: OptionsType = {}): void {
      // ... existing checks
      if (typeof options.wholeWord !== 'undefined' && typeof options.wholeWord !== 'boolean') {
        throw new Error('The wholeWord option should be a boolean.')
      }
    },
  },
  getOptions(options: OptionsType = {}): OptionsType {
    this.validate.options(options)
    return {
      // ... existing defaults
      wholeWord: typeof options.wholeWord !== 'undefined' ? options.wholeWord : false,
    }
  },
}
```

Then mirror the change in `src/index.ts`'s use of the option, in `test/main.test.ts`, and in [API Reference](API_REFERENCE.md) + the README options table.

## Imports

Keep imports readable — Biome handles spacing. Keep imports:

- Grouped by source: `node` builtins → external packages → relative
- Each group separated by **no blank line** (Biome's import formatting)
- No wildcard re-exports (`export * from`)
- No default-export `import` followed by a namespace `import` of the same module

```ts
// good
import { OptionsType, SearchTextHLType } from './lib/type'
import Utils from './lib/utils'

// bad — wildcard, hides what's used
import * as types from './lib/type'
```

## Strings, regex, and HTML

1. **Single quotes for string literals.** Biome rewrites doubles
2. **Template literals for interpolation.** Don't string-concat with `+`
3. **The `query` argument lands inside `new RegExp(...)`.** Treat any change that touches that path as security-sensitive — see [Security → Regex injection](SECURITY.md#regex-injection--redos)
4. **`htmlTag` and `hlClass` are interpolated raw into output HTML.** Don't introduce features that interpolate user-controlled values into HTML attributes without an explicit security review

## Error messages

- Start with an article and end with a period: `'The text parameter should be a string.'`
- Reference the parameter or option name verbatim
- Don't include the offending value in the message — it can be PII or untrusted input
- Don't translate — the package is English-only

## Comments

- **Don't comment what the code does** — names and types do that
- **Do comment why** when non-obvious: a regex flag combination, a default that was changed for a real bug
- JSDoc the public surface (`searchTextHL.highlight` and option fields)
- TODOs: `// TODO(<github-handle>): <action>` — never bare `// TODO`

## Tests

See [Testing Guide](TESTING_GUIDE.md). Standards summary:

- Tests in `test/` use Vitest (import `{ describe, it, expect }` from `vitest` — no globals)
- One `describe(...)` per public surface; one `it(...)` per behavior
- Test the contract (input → output), not the implementation (no spying on internal calls)
- `it` titles start with `should`, are written in English, and describe behavior

```ts
// good
it('should highlight one query substring', () => { ... })

// bad — describes implementation
it('calls String.prototype.replace once', () => { ... })
```

## Visibility and exports

- Default to **not** exporting. If a helper is used in only one file, keep it module-local
- Export only `searchTextHL` from `index.ts`; export interfaces from `lib/type.ts` for consumers who need to type their own options object
- Don't `export default` from `lib/utils.ts` if anything else in the file becomes useful — convert to named exports first

## Dependencies

1. Edit only `package.json` (and `pnpm-lock.yaml` updates automatically). Don't pin in two places
2. **No new `dependencies` without a documented reason.** This package has zero runtime dependencies — adding one shows up in every consumer's `node_modules`
3. New `devDependencies` should solve a problem the existing toolchain can't (e.g., adding a lint rule Biome already covers is duplication)
4. Keep entries in `package.json` alphabetically sorted by category (`dependencies`, `devDependencies`)
5. New installs honor `minimumReleaseAge` (`pnpm-workspace.yaml`) — a version published less than a week ago won't resolve. See [Security → Dependencies](SECURITY.md#dependencies)

## Build hygiene

- Don't commit `dist/` — it's regenerated by CI before publish
- Don't commit `.env`, `node_modules/`, or `tmp/*` (already in `.gitignore`)
- Don't disable lint or warnings to silence a problem — fix the root cause
- Don't change `package.json`'s `main`, `types`, `engines`, or `packageManager` fields without coordinating with the release workflow

## Versioning

- Patch (`1.x.Y`): bug fix, internal refactor, doc-only changes — `pnpm run release` is wired for this
- Minor (`1.X.0`): new option that doesn't change defaults
- Major (`X.0.0`): default change, signature change, removed option — bump `version` manually and add a migration note to the README

The release script (`pnpm run release` → `.github/scripts/prepare_release.sh`) defaults to a `patch` bump. For minor/major, edit `package.json`'s `version` manually and create the matching commit + tag with the same message template before merging.

## CI

- The same checks that run locally (`biome:check`, `build`, `test`) gate every PR
- `release_and_publish` triggers on PR merge to `main` — no manual publish to npm
- Branch naming: feature branches use `feature__<topic>`, automation branches use the existing `feature__packages_versions_update`

## Updating these standards

Standards drift if changes happen in the code without an update here. When you decide a new convention, update this file in the same PR. If a rule is wrong, fix it deliberately — don't ignore it in code while leaving the rule in place.
