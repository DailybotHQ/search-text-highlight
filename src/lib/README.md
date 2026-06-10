# `src/lib/` — Internal helpers

> Type declarations and validation helpers consumed by the public entry point at [`src/index.ts`](../index.ts). Everything here is **internal** — nothing in this directory is re-exported to consumers verbatim, and the only export from the package is the `searchTextHL` object built in `src/index.ts`.

## Files

| File                   | Role                                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`type.ts`](type.ts)   | Catalog of every TypeScript interface used by the library — `OptionsType`, `SearchTextHLType`, `UtilsType`, plus the generic shims `ObjectType` and `Class<T>` |
| [`utils.ts`](utils.ts) | The single boundary validator + default-option resolver — `Utils.validate.highlight`, `Utils.validate.options`, `Utils.getOptions`                             |

## `type.ts` — interface catalog

Every interface that crosses a module boundary lives here, never inlined in `index.ts` or `utils.ts`. This keeps the published `.d.ts` files clean and the option list discoverable in one place.

| Interface          | Purpose                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `OptionsType`      | The public `options` argument for `highlight` — `htmlTag`, `hlClass`, `matchAll`, `caseSensitive`. **New options always start here.** |
| `SearchTextHLType` | The shape of the default-exported `searchTextHL` object. Updating the signature here is a **major version bump**.                     |
| `UtilsType`        | The internal validator + default resolver, kept private to the library.                                                               |
| `ObjectType`       | Generic `Record<string, any>` shim used only where TypeScript would otherwise reject untyped lookups. Use sparingly.                  |
| `Class<T>`         | Constructor type helper. Currently unused by the public surface; retained for downstream consumers that re-use the type catalog.      |

### When you add an option

1. Declare it in `OptionsType` here.
2. Extend `Utils.validate.options` with a `typeof !== 'undefined' && typeof !== <expected>` guard.
3. Extend `Utils.getOptions` with the default value.
4. Wire it into the regex-building logic in `src/index.ts`.
5. Add a Vitest test case in `test/main.test.ts`.
6. Update the option table in [README.md](../../README.md) and the surface docs in [`docs/API_REFERENCE.md`](../../docs/API_REFERENCE.md).

See [`docs/STANDARDS.md`](../../docs/STANDARDS.md#types) and the `/add-option` skill in [`.agents/skills/add-option.md`](../../.agents/skills/add-option.md) for the full checklist.

## `utils.ts` — validation at the boundary

The library follows a strict **validate-once-at-the-edge** discipline:

- `Utils.validate.highlight(text, query, options)` is called from `index.ts`'s `highlight` method **before** any regex work happens.
- `Utils.validate.options(options)` runs from `Utils.getOptions` so default resolution is also gated by the same checks.
- Internal helpers downstream of validation **assume their inputs are correctly typed** — they do not re-validate, and they do not catch their own errors.

This is why every new option must extend `Utils.validate.options` and `Utils.getOptions` together; if you skip the validator, an internal helper will silently consume malformed input.

### Why the messages are explicit

All errors are plain `Error` instances thrown with a human-readable message in English (for example, `'The text parameter should be a string.'`). The library does not throw typed errors or codes — consumers should not catch on `instanceof` and should not parse the message. If you need richer error semantics, raise an issue before changing this.

## Design constraints inherited from the project root

- **No runtime dependencies.** Any helper added here must rely only on language built-ins. See [`docs/PERFORMANCE.md`](../../docs/PERFORMANCE.md) for the bundle-size rationale.
- **Strict TypeScript.** `tsconfig.json` enables `strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`, and `noImplicitAny`. Keep new code free of `any` (the `ObjectType` shim is the deliberate exception).
- **No `console.*` calls.** Biome enforces `noConsole: error`; the library must remain silent at runtime.
- **English only.** Error messages, comments, and identifiers are English. See [`docs/STANDARDS.md`](../../docs/STANDARDS.md).

## Related documents

- [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) — how `src/index.ts`, `src/lib/`, and the bundled `dist/` artifact fit together.
- [`docs/API_REFERENCE.md`](../../docs/API_REFERENCE.md) — the user-facing contract for `OptionsType` and `highlight`.
- [`docs/SECURITY.md`](../../docs/SECURITY.md) — regex injection and HTML-interpolation considerations that bind these helpers.
