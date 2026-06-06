# Skills, Agents & Commands Catalog

> Authoritative catalog of every entry in [`.agents/`](../). This file mirrors what is on disk — when you add, remove, or rename a skill, agent, or command, update this file in the same commit. The human-readable index in [`.agents/README.md`](../README.md) and the developer-facing reference in [`AGENTS.md`](../../AGENTS.md) should stay in lock-step with this catalog.

The catalog is split into four sections:

1. **Skills** — repeatable procedures invoked by slash command.
2. **Agents (subagents)** — specialized personas with a tighter focus than the default assistant.
3. **Commands** — short shell runbooks (no branching, no dialog).
4. **Deep Work Plan (DWP) delegators** — thin commands that delegate to the installed DWP skill pack.

---

## 1. Skills

Procedural slash commands tuned for this library's TypeScript / npm workflow.

| Slash command      | File                                                      | When to use                                                                              |
| ------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/add-option`      | [skills/add-option.md](../skills/add-option.md)           | Add a new option to `OptionsType`, wire it through validation, defaults, tests, and docs |
| `/add-feature`     | [skills/add-feature.md](../skills/add-feature.md)         | Add a wholly new method to `searchTextHL` — rare; usually a major version bump           |
| `/write-tests`     | [skills/write-tests.md](../skills/write-tests.md)         | Author Mocha + Chai tests for the current change                                         |
| `/fix-build`       | [skills/fix-build.md](../skills/fix-build.md)             | Diagnose and repair a failing webpack / tsc build                                        |
| `/lint-fix`        | [skills/lint-fix.md](../skills/lint-fix.md)               | Run ESLint and Prettier with `--fix` plus follow-ups                                     |
| `/bump-deps`       | [skills/bump-deps.md](../skills/bump-deps.md)             | Update `package.json` safely; respects `.ncurc.json`                                     |
| `/release`         | [skills/release.md](../skills/release.md)                 | Walk through the release workflow, verify prerequisites, ship                            |
| `/devcontainer-up` | [skills/devcontainer-up.md](../skills/devcontainer-up.md) | Spin up the local Docker dev environment and verify it                                   |
| `/fork-rebrand`    | [skills/fork-rebrand.md](../skills/fork-rebrand.md)       | Walk a fresh fork through name, npm scope, repo URL, license                             |

## 2. Agents (subagents)

Specialized personas. Spawn the matching agent via the `Agent` tool with `subagent_type: <name>` (Claude Code) or invoke by name in other hosts.

| Subagent             | File                                                            | Owns                                                           |
| -------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| `ts-architect`       | [agents/ts-architect.md](../agents/ts-architect.md)             | Module layout, public API surface, file boundaries             |
| `api-designer`       | [agents/api-designer.md](../agents/api-designer.md)             | Shape of `OptionsType` and any new exposed function            |
| `test-author`        | [agents/test-author.md](../agents/test-author.md)               | Mocha + Chai tests, layout, conventions                        |
| `dependency-auditor` | [agents/dependency-auditor.md](../agents/dependency-auditor.md) | `package.json` updates, transitive risks, `.ncurc.json` policy |
| `release-engineer`   | [agents/release-engineer.md](../agents/release-engineer.md)     | Webpack, npm publish, GitHub Actions                           |
| `security-reviewer`  | [agents/security-reviewer.md](../agents/security-reviewer.md)   | Regex inputs, ReDoS, HTML interpolation                        |
| `doc-writer`         | [agents/doc-writer.md](../agents/doc-writer.md)                 | Keeps `AGENTS.md`, `README.md`, and `docs/` in sync            |

## 3. Commands (shell runbooks)

Short, deterministic shell sequences — no questions, no branching.

| Slash command   | File                                                    | Effect                                                                        |
| --------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `/verify`       | [commands/verify.md](../commands/verify.md)             | Run the full pre-push check chain (eslint + prettier + tsc + tests + webpack) |
| `/pack-check`   | [commands/pack-check.md](../commands/pack-check.md)     | Inspect what `npm pack` would publish                                         |
| `/ci-reproduce` | [commands/ci-reproduce.md](../commands/ci-reproduce.md) | Reproduce a failing CI workflow step locally                                  |
| `/reset-env`    | [commands/reset-env.md](../commands/reset-env.md)       | Clear `node_modules` + caches and reinstall                                   |

## 4. Deep Work Plan delegators

Thin Markdown files that hand control to the installed DWP skill pack at `~/.claude/skills/deepworkplan-*`. They exist so the slash command works inside this repo without forcing the user to remember the underlying skill name.

| Slash command   | File                                                    | Delegates to                                                                              |
| --------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/dwp-create`   | [commands/dwp-create.md](../commands/dwp-create.md)     | `deepworkplan-create` — decompose a goal into a numbered plan with validation gates       |
| `/dwp-execute`  | [commands/dwp-execute.md](../commands/dwp-execute.md)   | `deepworkplan-execute` — execute a plan task-by-task, update progress, validate each gate |
| `/dwp-refine`   | [commands/dwp-refine.md](../commands/dwp-refine.md)     | `deepworkplan-refine` — add, remove, or reorder tasks while preserving completed work     |
| `/dwp-resume`   | [commands/dwp-resume.md](../commands/dwp-resume.md)     | `deepworkplan-resume` — reconstruct state and continue an interrupted plan                |
| `/dwp-status`   | [commands/dwp-status.md](../commands/dwp-status.md)     | `deepworkplan-status` — report progress without making changes                            |
| `/dwp-verify`   | [commands/dwp-verify.md](../commands/dwp-verify.md)     | `deepworkplan-verify` — objective pass/fail conformance report against the DWP spec       |
| `/dwp-onboard`  | [commands/dwp-onboard.md](../commands/dwp-onboard.md)   | `deepworkplan-onboard` — re-run the AI-first onboarding (idempotent, non-destructive)     |
| `/skill-create` | [commands/skill-create.md](../commands/skill-create.md) | `deepworkplan-author` — author a new skill for this repo                                  |
| `/agent-create` | [commands/agent-create.md](../commands/agent-create.md) | `deepworkplan-author` — author a new agent for this repo                                  |

## Invocation conventions

| Host                                         | Prefix            | Example                         |
| -------------------------------------------- | ----------------- | ------------------------------- |
| Claude Code                                  | `/` (native)      | `/dwp-create`                   |
| OpenAI Codex, Cursor, Gemini, GitHub Copilot | `#` or plain name | `#dwp-create`, `run dwp-create` |

When the user invokes a slash command, the agent **must**:

1. Look up the command in this catalog (or in [`.agents/README.md`](../README.md)).
2. Read the linked Markdown file end-to-end.
3. Follow the steps exactly — the file is the spec, not a suggestion.
4. For DWP delegators, the file simply points at the installed DWP sub-skill; read the sub-skill from the link inside it and follow that procedure.

## Keeping this catalog in sync

- Add a new row whenever a file is created under `skills/`, `agents/`, or `commands/`.
- Remove a row whenever the underlying file is deleted.
- Mirror table edits into [`.agents/README.md`](../README.md) and the relevant section of [`AGENTS.md`](../../AGENTS.md).
- See [`AGENTS.md`](../../AGENTS.md) → "Skills & Agents (Claude Code)" for the user-facing summary.

## Related

- [Commands reference](COMMANDS_REFERENCE.md) — fast lookup of just the slash commands.
- [`.agents/README.md`](../README.md) — top-level index.
- [`docs/AI_AGENT_COLLAB.md`](../../docs/AI_AGENT_COLLAB.md) — handoff conventions across agents.
