# Agent Skills, Commands & Subagents — search-text-highlight

This directory contains **skills** (slash-command procedures), **commands** (low-level shell shortcuts), and **subagents** (specialized personas) tuned for TypeScript / npm-package work in this repo.

> **For non-Claude hosts** (Cursor, Codex, Gemini, GitHub Copilot): the skill files in [`skills/`](skills/) are plain Markdown procedures. Invoke them by name (e.g., type `#add-option` or "run add-option") — the agent will read the matching file and follow it step-by-step.
>
> The `.claude/` folder at the repo root is a **symlink** to this directory, so Claude Code resolves the same files.

## Layout

```
.agents/
├── README.md                # This file — full catalog
├── settings.json            # Claude Code harness permissions
├── docs/                    # Full catalog + commands reference
│   ├── skills_agents_catalog.md
│   └── COMMANDS_REFERENCE.md
├── skills/                  # One Markdown file per slash command (procedural)
│   ├── add-option.md
│   ├── add-feature.md
│   ├── write-tests.md
│   ├── fix-build.md
│   ├── lint-fix.md
│   ├── bump-deps.md
│   ├── release.md
│   ├── devcontainer-up.md
│   └── fork-rebrand.md
├── agents/                  # One Markdown file per specialized subagent (persona)
│   ├── ts-architect.md
│   ├── api-designer.md
│   ├── test-author.md
│   ├── dependency-auditor.md
│   ├── release-engineer.md
│   ├── security-reviewer.md
│   └── doc-writer.md
└── commands/                # Shell runbooks + DWP delegators
    ├── verify.md            # The full pre-push check chain
    ├── pack-check.md        # `pnpm pack --dry-run` walkthrough
    ├── ci-reproduce.md      # Reproduce a failing CI step locally
    ├── reset-env.md         # Clear node_modules + caches and reinstall
    ├── dwp-create.md        # Delegate to deepworkplan-create
    ├── dwp-execute.md       # Delegate to deepworkplan-execute
    ├── dwp-refine.md        # Delegate to deepworkplan-refine
    ├── dwp-resume.md        # Delegate to deepworkplan-resume
    ├── dwp-status.md        # Delegate to deepworkplan-status
    ├── dwp-verify.md        # Delegate to deepworkplan-verify
    ├── dwp-onboard.md       # Delegate to deepworkplan-onboard
    ├── skill-create.md      # Delegate to deepworkplan-author (skill scope)
    └── agent-create.md      # Delegate to deepworkplan-author (agent scope)
```

## Skills (slash commands)

Reusable procedures invoked by slash command (or `#` in non-Claude hosts).

| Command            | Purpose                                                                                  | File                                                   |
| ------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `/add-option`      | Add a new option to `OptionsType`, wire it through validation, defaults, tests, and docs | [skills/add-option.md](skills/add-option.md)           |
| `/add-feature`     | Add a wholly new method to `searchTextHL` (rare; major version bump)                     | [skills/add-feature.md](skills/add-feature.md)         |
| `/write-tests`     | Author Vitest tests for the current change                                               | [skills/write-tests.md](skills/write-tests.md)         |
| `/fix-build`       | Diagnose and repair a failing Vite / tsc build                                           | [skills/fix-build.md](skills/fix-build.md)             |
| `/lint-fix`        | Run Biome with `--write` and tidy follow-ups                                             | [skills/lint-fix.md](skills/lint-fix.md)               |
| `/bump-deps`       | Update `package.json` safely (changelog + verification, respects `.ncurc.json`)          | [skills/bump-deps.md](skills/bump-deps.md)             |
| `/release`         | Walk through the release workflow, verify prerequisites, and ship                        | [skills/release.md](skills/release.md)                 |
| `/devcontainer-up` | Spin up the local Docker dev environment and verify it                                   | [skills/devcontainer-up.md](skills/devcontainer-up.md) |
| `/fork-rebrand`    | Walk a fresh fork through name, npm scope, repo URL, license                             | [skills/fork-rebrand.md](skills/fork-rebrand.md)       |

### How to invoke

| Host            | Prefix       | Example       |
| --------------- | ------------ | ------------- |
| Claude Code     | `/` (native) | `/add-option` |
| OpenAI Codex    | `#`          | `#add-option` |
| Cursor AI       | `#`          | `#add-option` |
| Gemini / others | `#`          | `#add-option` |

When invoked, the agent **must**:

1. Look up the command name in this README
2. Read the linked skill file end-to-end
3. Follow its steps exactly — the file IS the spec
4. If the skill asks for a confirmation or input, pause and ask; don't improvise

## Subagents (specialized personas)

Adopt the persona described in the file when the task matches.

| Subagent             | Domain                                                         | File                                                         |
| -------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| `ts-architect`       | Module layout, public API surface, file boundaries             | [agents/ts-architect.md](agents/ts-architect.md)             |
| `api-designer`       | Shape of `OptionsType` and any new exposed function            | [agents/api-designer.md](agents/api-designer.md)             |
| `test-author`        | Vitest tests, layout, conventions                              | [agents/test-author.md](agents/test-author.md)               |
| `dependency-auditor` | `package.json` updates, transitive risks, `.ncurc.json` policy | [agents/dependency-auditor.md](agents/dependency-auditor.md) |
| `release-engineer`   | Vite, pnpm publish, GitHub Actions                             | [agents/release-engineer.md](agents/release-engineer.md)     |
| `security-reviewer`  | Regex inputs, ReDoS, HTML interpolation                        | [agents/security-reviewer.md](agents/security-reviewer.md)   |
| `doc-writer`         | Keeps `AGENTS.md`, `README.md`, and `docs/` in sync            | [agents/doc-writer.md](agents/doc-writer.md)                 |

## Commands (shell runbooks)

Low-level, repeatable shell sequences. Smaller than skills — they don't ask questions or branch.

| Command        | Purpose                                      | File                                                 |
| -------------- | -------------------------------------------- | ---------------------------------------------------- |
| `verify`       | Run the full pre-push check chain            | [commands/verify.md](commands/verify.md)             |
| `pack-check`   | Inspect what `pnpm pack` would publish       | [commands/pack-check.md](commands/pack-check.md)     |
| `ci-reproduce` | Reproduce a failing CI workflow step locally | [commands/ci-reproduce.md](commands/ci-reproduce.md) |
| `reset-env`    | Clear `node_modules` + caches and reinstall  | [commands/reset-env.md](commands/reset-env.md)       |

These can be invoked the same way as skills (`/verify`, `#verify`, etc.). They're separated from skills because they're shorter and don't need interactive steps.

## Deep Work Plan delegators

Thin delegators that hand control to the installed [DWP skill pack](https://github.com/DailybotHQ/deepworkplan-skill) (`~/.claude/skills/deepworkplan-*`). They exist so the slash command works inside this repo without the user having to remember the underlying skill name.

| Command         | Delegates to           | Purpose                                                       | File                                                 |
| --------------- | ---------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| `/dwp-create`   | `deepworkplan-create`  | Decompose a goal into a numbered plan with validation gates   | [commands/dwp-create.md](commands/dwp-create.md)     |
| `/dwp-execute`  | `deepworkplan-execute` | Execute the active plan task-by-task, validate each gate      | [commands/dwp-execute.md](commands/dwp-execute.md)   |
| `/dwp-refine`   | `deepworkplan-refine`  | Add, remove, or reorder tasks while preserving completed work | [commands/dwp-refine.md](commands/dwp-refine.md)     |
| `/dwp-resume`   | `deepworkplan-resume`  | Reconstruct state and continue an interrupted plan            | [commands/dwp-resume.md](commands/dwp-resume.md)     |
| `/dwp-status`   | `deepworkplan-status`  | Report progress without executing                             | [commands/dwp-status.md](commands/dwp-status.md)     |
| `/dwp-verify`   | `deepworkplan-verify`  | Objective pass/fail conformance report                        | [commands/dwp-verify.md](commands/dwp-verify.md)     |
| `/dwp-onboard`  | `deepworkplan-onboard` | Re-run the AI-first onboarding non-destructively              | [commands/dwp-onboard.md](commands/dwp-onboard.md)   |
| `/skill-create` | `deepworkplan-author`  | Author a new skill in `.agents/skills/`                       | [commands/skill-create.md](commands/skill-create.md) |
| `/agent-create` | `deepworkplan-author`  | Author a new agent in `.agents/agents/`                       | [commands/agent-create.md](commands/agent-create.md) |

Plans land in `.dwp/plans/`, drafts in `.dwp/drafts/`. Both are gitignored except for `.gitkeep`. See [`docs/skills_agents_catalog.md`](docs/skills_agents_catalog.md) for the full authoritative catalog.

## Adding a new skill, subagent, or command

1. Create the Markdown file under `skills/<name>.md`, `agents/<name>.md`, or `commands/<name>.md`
2. Follow the structure of an existing file (frontmatter, then sections)
3. Add a row to the table above
4. Mention the new entry in [`AGENTS.md`](../AGENTS.md) "Skills & Agents" section
5. Commit with `feat: add <name> skill` (or `agent` / `command`)

## Conventions

- Skills are **procedural** — numbered steps, exact commands, file paths
- Subagents are **persona-based** — what they care about, what they don't, how they decide
- Commands are **scriptable** — a sequence of shell commands plus quick troubleshooting
- All three must be self-contained at the file level — an agent reading only the skill should be able to execute it
- Cross-link to `docs/` rather than duplicating content
- Keep frontmatter minimal: `name`, `description`, optional `type`

## Related

- [`AGENTS.md`](../AGENTS.md) — non-negotiable rules for any agent
- [`docs/AI_AGENT_ONBOARDING.md`](../docs/AI_AGENT_ONBOARDING.md) — first-run flow
- [`docs/AI_AGENT_COLLAB.md`](../docs/AI_AGENT_COLLAB.md) — multi-agent coordination
