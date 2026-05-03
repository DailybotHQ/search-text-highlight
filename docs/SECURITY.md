# Security

This is a small, dependency-free utility — but it accepts arbitrary strings and produces HTML, which makes it a downstream attack surface for every consumer. This guide is the threat model.

## Trust boundaries

```
   ┌────────────────────┐     query, options             ┌──────────────────────┐
   │  Consumer code     │  ─────────────────────────►    │  highlight(...)      │
   │  (potentially has  │                                │                      │
   │  user input here)  │  ◄─────────────────────────    │  returns HTML string │
   └────────────────────┘   wrapped HTML output          └──────────────────────┘
```

Two boundaries you must respect when changing the implementation:

1. **`query` flows into a `RegExp` constructor.** Treat it as untrusted regex source — see [Regex injection / ReDoS](#regex-injection--redos)
2. **`htmlTag` and `hlClass` are interpolated raw into HTML.** They're consumer-controlled today; if a consumer pipes user input into either, they get attribute injection. Document this prominently — don't silently trust the values

## Principles

1. **Validate at the boundary.** `Utils.validate.*` is the single entry; internal helpers trust their typed inputs
2. **Never auto-escape** — the library's contract is "raw regex, raw HTML tag". Changing that breaks consumers. If you really need escaping, it goes behind an opt-in option
3. **Keep the runtime dependency surface at zero.** Every transitive dep is a supply-chain risk
4. **Clear English error messages.** No stack traces leaking internals, no values from the offending input

## Regex injection / ReDoS

The current implementation does:

```ts
return text.replace(new RegExp(query, modifiers), (match) => /* wrap match */)
```

**Risk #1 — Pattern interpretation.** A consumer passing user-typed search input directly to `highlight(text, userQuery)` exposes their app to regex injection: a query of `'.*'` matches everything; `'(.+)+x'` may run for minutes. Their users may be unable to render output, or in extreme cases may DoS the page.

**Risk #2 — Catastrophic backtracking.** Nested quantifiers (`(a+)+`, `(a|a)+`, `(a|aa)+b`) on adversarial inputs trigger exponential matching time in the V8 regex engine. The library doesn't construct these — but it doesn't reject them either.

### Mitigations we already have

- Empty `query` short-circuits before constructing a regex
- All argument shapes are validated; non-string `query` throws

### Mitigations we deliberately do not have

- We do **not** escape regex metacharacters in `query` — the existing tests rely on regex syntax (e.g., the emoji test passes `'😎'` which is matched literally only because emoji aren't regex metacharacters)
- We do **not** set a regex execution time limit (V8 doesn't expose one for synchronous regex anyway)

### Recommendations for consumers (document in [API Reference](API_REFERENCE.md))

```ts
// Escape regex metacharacters before passing user input
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const safe = searchTextHL.highlight(text, escapeRegex(userInput))
```

For untrusted inputs in environments where a long-running regex would be a problem (e.g., a server rendering many highlights), consumers should:

1. Limit `query` length (e.g., reject queries over 256 characters)
2. Run the call in a worker / sandbox with a wall-clock timeout
3. Pre-validate `query` against an allowlist of expected characters

### What we'd accept as a security PR

- An opt-in `escapeQuery: boolean` option that wraps `query` in a regex-escape pass when `true`. Default would have to remain `false` to preserve backwards compatibility — a major version bump if we ever flip the default
- A documented "safe mode" recipe in [API Reference](API_REFERENCE.md) that consumers can copy/paste
- Adversarial-input test cases in `test/main.test.ts` that bound the worst-case behavior

## HTML injection (via `htmlTag` / `hlClass`)

Both options are interpolated into the output **without escaping**:

```ts
;`<${options.htmlTag} class="${options.hlClass}">${match}</${options.htmlTag}>`
```

A consumer passing untrusted input into `htmlTag`:

```ts
searchTextHL.highlight(text, query, { htmlTag: 'span class="x" onclick="alert(1)"' })
// → <span class="x" onclick="alert(1)" class="text-highlight">...
```

…produces garbage HTML at best, exploitable markup at worst. Same applies to `hlClass`.

### Mitigation

- The library does **not** sanitize. Sanitization is the consumer's job — they construct the option object
- Document the contract clearly: "Treat `htmlTag` and `hlClass` as static configuration; never interpolate user input"

If we ever decide to sanitize, the only correct path is an allowlist:

- `htmlTag` matches `^[a-zA-Z][a-zA-Z0-9-]*$`
- `hlClass` matches `^[a-zA-Z_][a-zA-Z0-9_\- ]*$`

Anything outside the allowlist throws. That's a behavior change — major version bump, with a migration note.

## Validation surface

`Utils.validate.highlight` and `Utils.validate.options` (in `src/lib/utils.ts`) are the only place the library checks types. They:

- Accept the documented argument shapes
- Throw plain `Error` with English messages on mismatch
- Don't include the offending value in messages (don't leak PII)

When you add an option:

1. Extend `Utils.validate.options`
2. Use the same error message style: `'The <name> option should be a <type>.'`
3. Add a test that confirms the throw

## Dependencies

- The package has **zero `dependencies`**. Adding one is a security event — it expands the supply-chain surface for every consumer
- All `devDependencies` are pinned in `package.json`; the resolution is locked in `package-lock.json` (committed)
- `.ncurc.json` rejects `chai` and `eslint` major bumps — those are deliberate freezes with documented reasons
- The CI workflow does **not** run `npm install --no-audit`; npm's built-in audit warnings appear in CI logs

### Adding a dependency

Before adding any package:

1. Read its source. Most npm packages are small enough to skim
2. Check its publish history on `npmjs.com` — recent maintainer churn is a red flag
3. Run `npm view <package> repository.url` and verify the GitHub repo matches
4. Check open CVEs at `https://www.npmjs.com/advisories` or `https://github.com/advisories`
5. Pin to a specific version (no `^` ranges in this repo's `package.json`)
6. Update [Technologies](TECHNOLOGIES.md) and [AGENTS.md](../AGENTS.md) in the same PR

### Dependabot / Renovate

The repo uses an internal weekly automation (`check_packages_versions.yml`) instead of Dependabot. The flow is:

1. Tuesday 15:00 UTC — workflow runs `ncu:upgrade`, opens a PR
2. Tuesday 20:00 UTC — auto-merges if `Code Check` passes
3. Otherwise the PR sits for human review

Don't disable `.ncurc.json`'s `reject` list without considering the migration cost (ESLint 9 = flat config; Chai 5 = ESM-only).

## npm publish security

- Publishing requires `NPM_TOKEN` (a secret in GitHub). Rotate it annually
- The token has publish access only to `search-text-highlight`. It should not be a global token
- `npm publish` runs from CI on `main` only. There's no manual publish in the developer workflow
- **Two-factor on the npm account is required** for the maintainer account that owns the package
- **Provenance** (`npm publish --provenance`) is not enabled today. Enabling it requires the workflow to run with `id-token: write` — an easy improvement worth filing as an issue

## Secrets

- **Never commit** `.env`, `.npmrc`, or any file with credentials
- `.env` is in `.gitignore` (and `.npmignore`)
- The Dockerfile pulls Claude / Codex / Cursor CLIs but stores their auth in named volumes (`claude_data`, `codex_data`, `cursor_data`, `gh_data`) — those live in the Docker host, not the image or the repo

If you accidentally commit a secret:

1. Rotate it immediately (npm token, GitHub token, etc.)
2. Force-push only if the secret hasn't been mirrored anywhere — usually you can't and rotation is the only safe answer
3. Audit GitHub Secret Scanning alerts

## Logging

- `no-console: error` (ESLint) blocks `console.log` in `src/`. The library does not log
- Tests are allowed to print via Mocha's reporter; that's fine — they don't ship
- Don't `console.error(input)` — even an error path could expose untrusted input

## Reporting vulnerabilities

If you find a vulnerability, **do not open a public issue**. Email the maintainer or use [GitHub Security Advisories](https://github.com/DailyBotHQ/search-text-highlight/security/advisories) for coordinated disclosure.

The maintainer will acknowledge within a week and aim to ship a fix in the next minor or patch release. Critical issues warrant a same-day patch.

## Threat model checklist before each release

- [ ] No new `dependencies` (or one was added with documented reason)
- [ ] No new place where consumer-provided strings reach the regex engine without an explicit consumer-side escape recommendation
- [ ] No new place where consumer-provided strings reach the HTML output without documentation
- [ ] `package-lock.json` updated alongside `package.json`
- [ ] Validation tests still cover every option key
- [ ] No `console.*` calls slipped in
- [ ] `.env` and `dist/` are not staged
- [ ] `npm pack --dry-run` shows the expected files only
