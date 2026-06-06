---
name: dwp-status
description: Report Deep Work Plan progress without executing or modifying anything
type: command
delegates-to: deepworkplan-status
---

# Command: `dwp-status`

Thin delegator to the installed [`deepworkplan-status`](https://github.com/DailybotHQ/deepworkplan-skill) sub-skill.

## Invocation

| Host                    | Form                    |
| ----------------------- | ----------------------- |
| Claude Code             | `/dwp-status`           |
| Codex / Cursor / Gemini | `#dwp-status`           |
| Plain text              | "deep work plan status" |

## What it does

Read-only report. The sub-skill:

1. Locates the active plan under `.dwp/plans/`.
2. Counts completed / in-progress / blocked / pending tasks.
3. Lists the next actionable task and its validation gate.
4. **Does not run any task or change any file.**

## How the agent runs this

1. Read the installed skill at `~/.claude/skills/deepworkplan-status/SKILL.md`.
2. Follow its steps exactly.
3. This is read-only — no `Write`, no `Edit`, no shell mutations.

If the skill is not installed, see [`/dwp-create`](dwp-create.md) for installation steps.

## When to use

- Before [`/dwp-execute`](dwp-execute.md) to confirm what is about to run.
- After an interruption, before [`/dwp-resume`](dwp-resume.md), to confirm where you left off.
- For stakeholder updates without disturbing in-flight work.

## See also

- [`/dwp-execute`](dwp-execute.md) — actually run the plan
- [`/dwp-resume`](dwp-resume.md) — resume from interruption
- [`/dwp-refine`](dwp-refine.md) — modify the plan
