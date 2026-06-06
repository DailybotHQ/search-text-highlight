---
name: agent-create
description: Author a new agent persona for this repo (thin delegator to deepworkplan-author)
type: command
delegates-to: deepworkplan-author
---

# Command: `agent-create`

Thin delegator to the installed [`deepworkplan-author`](https://github.com/DailybotHQ/deepworkplan-skill) sub-skill, scoped to authoring a subagent.

## Invocation

| Host                    | Form                            |
| ----------------------- | ------------------------------- |
| Claude Code             | `/agent-create <name>`          |
| Codex / Cursor / Gemini | `#agent-create <name>`          |
| Plain text              | "create an agent called <name>" |

## What it does

Hands control to `deepworkplan-author`, asking it to scaffold a new entry under [`.agents/agents/`](../agents/). The sub-skill:

1. Asks for the agent name (kebab-case) and one-sentence domain of responsibility.
2. Reasons about whether the role is genuinely recurring and tightly scoped, or whether it overlaps with an existing agent.
3. Generates `.agents/agents/<name>.md` with persona-style content: what they care about, what they don't, how they decide.
4. Updates [`.agents/docs/skills_agents_catalog.md`](../docs/skills_agents_catalog.md), [`.agents/README.md`](../README.md), and the "Subagents" section of [`AGENTS.md`](../../AGENTS.md).

## How the agent runs this

1. Read the installed skill at `~/.claude/skills/deepworkplan-author/SKILL.md`.
2. Follow its steps exactly.
3. **Pass an "I want an agent persona, not a skill or command" hint** so the sub-skill produces persona-style Markdown.

If the skill is not installed, see [`/dwp-create`](dwp-create.md) for installation steps.

## Repo conventions a new agent must follow

- File path: `.agents/agents/<name>.md`
- Name: kebab-case, descriptive of the role (`security-reviewer`, `release-engineer`)
- Frontmatter: `name`, `description`, optional `tools` (the subset of tools the agent should use)
- Content: domain + scope + non-goals + decision criteria — written as a persona, not a procedure
- One agent per file

After authoring, the new agent must show up in:

1. [`.agents/agents/<name>.md`](../agents/) (the file itself)
2. [`.agents/docs/skills_agents_catalog.md`](../docs/skills_agents_catalog.md) (catalog row)
3. [`.agents/README.md`](../README.md) (Subagents table)
4. [`AGENTS.md`](../../AGENTS.md) "Skills & Agents → Subagents" section

## When to create an agent vs. a skill vs. a command

| If…                                                      | Use                       |
| -------------------------------------------------------- | ------------------------- |
| There's a procedure with discrete steps                  | `/skill-create` (skill)   |
| There's a recurring role with judgment calls             | `/agent-create` (agent)   |
| There's a deterministic shell sequence with no questions | author a command directly |

## See also

- [`/skill-create`](skill-create.md) — author a skill instead
- [`/dwp-onboard`](dwp-onboard.md) — re-baseline the AI-first kit
