# Documentation Guide

When and how to update the docs in this repo. The goal is to keep `AGENTS.md` and `docs/` in sync with the code so future contributors (human or agent) can land productively without reverse-engineering the conventions.

## Documentation map

| File                           | Purpose                                                                              | Update when…                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `AGENTS.md` (root)             | Single source of truth for AI agents — non-negotiable rules, quick command reference | Mandatory rules change, commands change, new patterns become canonical    |
| `CLAUDE.md`                    | Symlink → `AGENTS.md`                                                                | Never edit directly                                                       |
| `README.md`                    | Public-facing intro + usage                                                          | The package's pitch, install command, or basic usage example changes      |
| `docs/ARCHITECTURE.md`         | Module layout, build pipeline, data flow                                             | New file under `src/`, new build step, new data path through the function |
| `docs/TECHNOLOGIES.md`         | Stack with versions and roles                                                        | A dependency added/removed/bumped (major)                                 |
| `docs/STANDARDS.md`            | Coding rules                                                                         | A convention is decided or changes                                        |
| `docs/DEVELOPMENT_COMMANDS.md` | npm script reference                                                                 | A new script wired or a workflow changes                                  |
| `docs/TESTING_GUIDE.md`        | Test framework, conventions                                                          | Test framework changes, new test layer added                              |
| `docs/API_REFERENCE.md`        | Public surface (`highlight`, `OptionsType`)                                          | Any public-API change                                                     |
| `docs/BUILD_DEPLOY.md`         | npm publish + GitHub release pipeline                                                | Build step or release process changes                                     |
| `docs/CI_CD.md`                | GitHub Actions workflows                                                             | A workflow added / changed / removed                                      |
| `docs/PERFORMANCE.md`          | Hot path rules, bundle size                                                          | A perf decision is made                                                   |
| `docs/SECURITY.md`             | Security baseline                                                                    | Security model changes; new sanitization decision                         |
| `docs/DEVCONTAINER.md`         | Docker dev environment                                                               | Dockerfile / Compose / `custom_commands.sh` changes                       |
| `docs/AI_AGENT_ONBOARDING.md`  | First-run flow for any AI agent                                                      | The onboarding path changes                                               |
| `docs/AI_AGENT_COLLAB.md`      | Multi-agent coordination                                                             | Agent roles or handoffs change                                            |
| `docs/FORK_CUSTOMIZATION.md`   | Rebrand checklist                                                                    | A new fork-time concern is discovered                                     |
| `docs/getting-started/*.md`    | Environment setup, running locally, troubleshooting                                  | Setup steps or new failure modes change                                   |
| `.agents/README.md`            | Skills & subagents catalog                                                           | A skill or subagent is added/removed                                      |
| `.agents/skills/<name>.md`     | Procedure for a slash command                                                        | The procedure changes                                                     |
| `.agents/agents/<name>.md`     | Persona for a specialized subagent                                                   | The persona changes                                                       |

## Triggers for updating

### Always require a doc update

- A new option in `OptionsType` (must touch `STANDARDS.md` rules table, `API_REFERENCE.md`, `README.md` table, and a test)
- A new public method on `searchTextHL` (rare; major bump)
- A new npm script or modified script body
- Any change to the build pipeline (`webpack.config.js`, `tsconfig.json`)
- A new dependency (or removed one)
- A change to a CI workflow
- A change to the docker setup
- An adopted convention (e.g., "we use Mocha 11 from now on")
- A new agent skill or subagent

### Often require a doc update

- A non-obvious convention is decided in a PR comment
- A bug-prone area gets a workaround that future contributors should know
- A subtle invariant is added to validation

### Rarely require a doc update

- Pure typo fixes
- One-line bug fixes that don't change behavior
- Style-only refactors
- Routine version bumps within the same major version

## How to write docs that age well

1. **Lead with the rule.** "Every option lives in `OptionsType`" — not "we usually..."
2. **Show one canonical example.** A code snippet that's the answer, not three options
3. **Explain _why_ when it's non-obvious.** "We don't escape `query` because tests rely on regex syntax"
4. **Cross-link.** Mentioning a topic? Link to the dedicated doc instead of duplicating content. Repetition leads to drift
5. **Date-tag exceptions.** "Until ESLint 9 migration ships, `.ncurc.json` rejects ESLint upgrades" — easy to clean up later
6. **Keep the file under 500 lines.** Past that, split

## Cross-linking

Every doc that mentions something covered in detail elsewhere should link to it. Examples:

- `AGENTS.md` mentions Mocha → links to `docs/TESTING_GUIDE.md`
- `ARCHITECTURE.md` mentions a dependency → links to `TECHNOLOGIES.md`
- A skill in `.agents/skills/` references rules from `STANDARDS.md`

When you rename a doc, grep for inbound references and update them:

```bash
grep -rln "OLD_NAME.md" .
```

## Single source of truth

Each fact lives in **one** file. If you find yourself copying a paragraph, replace one copy with a link to the other.

Examples of "owned by":

- Coding conventions → `docs/STANDARDS.md`
- npm command reference → `docs/DEVELOPMENT_COMMANDS.md`
- Stack versions → `docs/TECHNOLOGIES.md` (and pinned in `package.json`)
- Validation rules → `docs/STANDARDS.md` + extended example in `docs/ARCHITECTURE.md`
- Public surface contract → `docs/API_REFERENCE.md` (and the README's options tables, which mirror it)

If two docs disagree, `AGENTS.md` wins for non-negotiable rules; otherwise the file listed as "owns" wins.

## Writing for AI agents

`AGENTS.md` is read by AI assistants on every session. It must be:

1. **Scannable.** Tables, bullet lists, short paragraphs. Agents prioritize structured content
2. **Decisive.** "MUST", "DO", "DON'T" beat "consider" and "you might want"
3. **Concrete.** Include exact file paths, command invocations, and example code
4. **Self-contained at the section level.** An agent might quote one bullet — it should still be unambiguous

Skill files (`.agents/skills/<name>.md`) follow the same rules but are step-by-step procedures rather than reference docs. See [.agents/README.md](../.agents/README.md).

## Forking

When this starter is forked, the **first commit on the fork** should:

1. Update [`README.md`](../README.md) with the new product name, install command, and usage
2. Update [`AGENTS.md`](../AGENTS.md) Project Overview section
3. Walk through [Fork Customization](FORK_CUSTOMIZATION.md) and check every item
4. Audit `docs/` for content that no longer applies

## Reviewing doc PRs

When reviewing a PR that touches code, ask:

- Did this change add/remove an npm script, dependency, option, or pattern? → Doc update required
- Did this change touch a path mentioned in the docs? → Verify the docs still reflect reality
- Did the PR description say "I'll document this later"? → It rarely happens — block on docs in the same PR

## Documentation style guide

- **Sentence case** in headings (`# Architecture`, not `# ARCHITECTURE` — though some legacy docs use ALL CAPS for top-level files; that's fine to keep)
- **Tables** for any list of "thing → role / version / file"
- **Code fences with the language tag** (` ```ts `, ` ```bash ` — never bare ` ``` `)
- **Inline `code spans`** for filenames, command names, and identifiers
- **Bold** for emphasis on key rules, **never** for whole sentences
- **Em dashes** (—) preferred over hyphens for parenthetical phrases (the existing docs are consistent on this)
- **No emoji** outside of the welcome banner and CI release messages
