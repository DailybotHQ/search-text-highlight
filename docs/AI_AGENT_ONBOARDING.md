# AI Agent Onboarding

Whether you're Claude Code, Cursor, Codex, Gemini, GitHub Copilot, or any other AI coding assistant — read this once before touching the repo.

## In one minute

1. **Read [`AGENTS.md`](../AGENTS.md)** — the non-negotiable rules. Don't skip it.
2. **This is a TypeScript / npm library** that exports one function: `searchTextHL.highlight(text, query, options)`. It wraps regex matches in HTML.
3. **Three source files only:** `src/index.ts` (entry), `src/lib/utils.ts` (validation + defaults), `src/lib/type.ts` (interfaces). New options touch all three.
4. **Versions live in `package.json`** — never inline a literal version anywhere else.
5. **Test inner loop:** `npm run test:watch` (or `npm run test` for one-shot).
6. **`tmp/` is git-ignored scratch space** — put throw-away files there, never anywhere else.

## In ten minutes (recommended pre-task reading)

- [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) — module layout, build pipeline, data flow
- [`docs/STANDARDS.md`](STANDARDS.md) — TypeScript conventions, validation rules
- [`docs/API_REFERENCE.md`](API_REFERENCE.md) — public surface contract
- [`docs/DEVELOPMENT_COMMANDS.md`](DEVELOPMENT_COMMANDS.md) — every npm script

## Before each task

1. **Identify which file the change belongs in.** Logic = `src/index.ts`. Validation = `src/lib/utils.ts`. New types = `src/lib/type.ts`. New tests = `test/main.test.ts`
2. **Check if a skill matches.** See [`.agents/README.md`](../.agents/README.md). If yes, follow its procedure file step-by-step
3. **Plan briefly.** What files will you touch? What's the test strategy?
4. **Pick the inner loop.** Logic-only? `npm run test:watch`. Type-only? `npm run build:tsc`. Lint-only? `npm run eslint:fix`

## During the task

- **Edit only `AGENTS.md`** when updating agent rules — `CLAUDE.md` is a symlink
- **Run tests after every meaningful change.** Don't accumulate unverified changes
- **If you add an option, it must touch all three source files plus a test**
- **If you change a regex, audit for ReDoS** (see [Security](SECURITY.md#regex-injection--redos))
- **If you bump a dependency, edit only `package.json`** then `npm install` to refresh the lockfile

## Before claiming "done"

Run the pre-commit checklist from `AGENTS.md`:

- [ ] All code, comments, and identifiers in English
- [ ] `npm run eslint:check` passes
- [ ] `npm run prettier:check` passes
- [ ] `npm run build:tsc` succeeds
- [ ] `npm run test` passes
- [ ] `npm run build` succeeds (production bundle)
- [ ] If you added an option, `OptionsType`, `Utils.validate.options`, `Utils.getOptions`, [API Reference](API_REFERENCE.md), README, and a test all reflect it
- [ ] If you added a dependency, `package.json` and `package-lock.json` are both updated
- [ ] No `console.*` calls in source
- [ ] No `dist/` or `.env` staged
- [ ] Documentation updated for any architectural change
- [ ] Commit message in English (conventional format)

## Common patterns

### Adding a new option

1. Add the optional field to `OptionsType` in `src/lib/type.ts` (with JSDoc)
2. Extend `Utils.validate.options` in `src/lib/utils.ts` (English error message)
3. Add the default in `Utils.getOptions`
4. Use it in `src/index.ts`
5. Add a Mocha test for default behavior, explicit override, and validation error
6. Update [API Reference](API_REFERENCE.md), README options table, and (if it's a default change) the changelog
7. Use the `/add-option` skill — it walks through all of this

### Adding a public method

1. Confirm with the user — this is a major version bump
2. Define the type in `src/lib/type.ts`
3. Extend `searchTextHL` in `src/index.ts`
4. Add a `describe` block in `test/main.test.ts` for the new method
5. Document in [API Reference](API_REFERENCE.md), README, and `AGENTS.md`'s "Public API surface" callout

### Bumping a dependency

1. Edit `package.json` (or `npm run ncu:upgrade` for a batch)
2. `npm install` to refresh `package-lock.json`
3. `npm run eslint:check && npm run prettier:check && npm run build:tsc && npm run test && npm run build`
4. Document in [Technologies](TECHNOLOGIES.md) if a major version
5. Use the `/bump-deps` skill for a guided workflow

### Fixing a regex bug

1. Add a failing test that reproduces the bug
2. Make the smallest change that turns it green
3. Run `npm run test` against the rest of the suite — make sure no other test broke
4. If your fix changes the regex pattern, **audit for ReDoS** with adversarial inputs ([Security](SECURITY.md#regex-injection--redos))
5. If the fix changes observable behavior (output for any input that previously matched), it's a major bump

## Decision tree: where does this code go?

```
Is the change adding an interface or modifying an option type?
├── Yes → src/lib/type.ts
└── No  → Is the change about validation or default fill-in?
        ├── Yes → src/lib/utils.ts
        └── No  → Is the change about the public function body?
                ├── Yes → src/index.ts
                └── No  → It's a test → test/main.test.ts (or a new test file)

Is the change about how the package is built / shipped / released?
├── webpack-only       → webpack.config.js
├── tsconfig-only      → tsconfig.json
├── npm publishing     → package.json + .npmignore
├── CI                 → .github/workflows/*.yml
└── docker             → docker/local/* + docker/custom_commands.sh

Is it documentation?
└── docs/<topic>.md or AGENTS.md or .agents/<area>/<file>.md
```

## Tools you have

| Tool         | Use                                      |
| ------------ | ---------------------------------------- |
| Read         | Read code or docs to understand context  |
| Bash         | Run `npm`, `git`, `node`, `find`, `grep` |
| Edit / Write | Modify files                             |
| Grep / Find  | Locate code by pattern                   |

Before bulk changes, read the relevant section of `AGENTS.md` and the doc it links to. Don't optimize for fewest tool calls at the cost of correctness.

## Things that look easy but aren't

- **Auto-escaping `query`.** Existing tests rely on regex syntax (the emoji test, the `'a'` test). Auto-escaping is a major version bump and an opt-in option, never a default
- **Sanitizing `htmlTag` / `hlClass`.** Same story — major version bump, opt-in
- **Removing `.babelrc`.** It's there for downstream consumers' Babel pipelines. Don't drop it without consulting maintainers
- **Bumping `chai` or `eslint`.** `.ncurc.json` rejects them deliberately. Read the why before unrejecting
- **Editing `dist/`.** It's regenerated. Your edits will vanish on the next `npm run build`
- **Manually publishing.** CI publishes from `main`. Manual publish requires careful coordination

## Asking for clarification

If a task is ambiguous, ask **before** writing code. Common ambiguities:

- "Add a new option" — What does it do? Default value? Major or minor bump?
- "Fix the regex" — Which inputs are wrong? Add a failing test first
- "Optimize" — Bundle size? Hot-path runtime? CI duration?
- "Make it modern" — ESM? Strict mode? Specific TypeScript flag?

A 30-second clarification beats a 30-minute rewrite.

## Multi-agent coordination

If multiple agents collaborate, follow [`docs/AI_AGENT_COLLAB.md`](AI_AGENT_COLLAB.md).
