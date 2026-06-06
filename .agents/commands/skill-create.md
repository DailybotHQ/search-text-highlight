---
name: skill-create
description: Author a new skill for this repo (thin delegator to deepworkplan-author)
type: command
delegates-to: deepworkplan-author
---

# Command: `skill-create`

Thin delegator to the installed [`deepworkplan-author`](https://github.com/DailybotHQ/deepworkplan-skill) sub-skill, scoped to authoring a skill.

## Invocation

| Host                    | Form                           |
| ----------------------- | ------------------------------ |
| Claude Code             | `/skill-create <name>`         |
| Codex / Cursor / Gemini | `#skill-create <name>`         |
| Plain text              | "create a skill called <name>" |

## What it does

Hands control to `deepworkplan-author`, asking it to scaffold a new entry under [`.agents/skills/`](../skills/). The sub-skill:

1. Asks for the skill name (kebab-case) and one-sentence purpose.
2. Reasons about whether the procedure is genuinely repeatable and worth a slash command — or whether it belongs in an existing skill, in [`docs/`](../../docs/), or in [`AGENTS.md`](../../AGENTS.md).
3. If it's worth creating, generates `.agents/skills/<name>.md` with the project's frontmatter convention and a numbered procedure.
4. Updates the [`.agents/docs/skills_agents_catalog.md`](../docs/skills_agents_catalog.md) and [`COMMANDS_REFERENCE.md`](../docs/COMMANDS_REFERENCE.md) catalog rows.
5. Mentions the new skill in the relevant section of [`AGENTS.md`](../../AGENTS.md) and [`.agents/README.md`](../README.md).

## How the agent runs this

1. Read the installed skill at `~/.claude/skills/deepworkplan-author/SKILL.md`.
2. Follow its steps exactly.
3. **Pass an "I want a skill, not an agent or command" hint** so the sub-skill produces a skill file (procedural Markdown), not an agent persona or a shell runbook.

If the skill is not installed, see [`/dwp-create`](dwp-create.md) for installation steps.

## Repo conventions a new skill must follow

- File path: `.agents/skills/<name>.md`
- Name: kebab-case (`<name>` matches the filename without `.md`)
- Frontmatter: `name`, `description`, `type: skill` — keep it minimal
- Content: numbered steps, exact commands, exact file paths — no improvisation room
- One skill per file, one file per skill
- Link out to [`docs/`](../../docs/) instead of duplicating content

After authoring, the new skill must show up in:

1. [`.agents/skills/<name>.md`](../skills/) (the file itself)
2. [`.agents/docs/skills_agents_catalog.md`](../docs/skills_agents_catalog.md) (catalog row)
3. [`.agents/docs/COMMANDS_REFERENCE.md`](../docs/COMMANDS_REFERENCE.md) (lookup row)
4. [`.agents/README.md`](../README.md) (top-level index)
5. [`AGENTS.md`](../../AGENTS.md) "Skills & Agents" section (root contract)

## See also

- [`/agent-create`](agent-create.md) — author an agent persona instead
- [`/dwp-onboard`](dwp-onboard.md) — re-baseline the AI-first kit
