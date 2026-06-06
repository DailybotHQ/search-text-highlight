---
name: dwp-refine
description: Refine a Deep Work Plan draft or modify a final plan in place
type: command
delegates-to: deepworkplan-refine
---

# Command: `dwp-refine`

Thin delegator to the installed [`deepworkplan-refine`](https://github.com/DailybotHQ/deepworkplan-skill) sub-skill.

## Invocation

| Host                    | Form                        |
| ----------------------- | --------------------------- |
| Claude Code             | `/dwp-refine`               |
| Codex / Cursor / Gemini | `#dwp-refine`               |
| Plain text              | "refine the deep work plan" |

## What it does

Hands control to `deepworkplan-refine`. The sub-skill:

1. Locates the active plan under `.dwp/plans/` (or the draft under `.dwp/drafts/`).
2. Lets you add, remove, reorder, or re-scope tasks.
3. **Preserves completed work** — completed tasks are not touched.
4. Updates validation gates to match the new task set.

## How the agent runs this

1. Read the installed skill at `~/.claude/skills/deepworkplan-refine/SKILL.md`.
2. Follow its steps exactly.
3. Ask the user before deleting any task — `refine` is non-destructive by default.

If the skill is not installed, see [`/dwp-create`](dwp-create.md) for installation steps.

## When to use refine vs. recreate

| Situation                                 | Use                      |
| ----------------------------------------- | ------------------------ |
| Plan scope was too narrow / too broad     | `/dwp-refine`            |
| One task needs to be split into two       | `/dwp-refine`            |
| Validation gate was wrong                 | `/dwp-refine`            |
| Plan is fundamentally a different problem | `/dwp-create` (new plan) |

## See also

- [`/dwp-create`](dwp-create.md) — create a new plan
- [`/dwp-execute`](dwp-execute.md) — run the refined plan
- [`/dwp-resume`](dwp-resume.md) — restart after a refinement that left an in-progress task
