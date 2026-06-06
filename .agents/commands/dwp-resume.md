---
name: dwp-resume
description: Reconstruct state and continue an interrupted Deep Work Plan
type: command
delegates-to: deepworkplan-resume
---

# Command: `dwp-resume`

Thin delegator to the installed [`deepworkplan-resume`](https://github.com/DailybotHQ/deepworkplan-skill) sub-skill.

## Invocation

| Host                    | Form                        |
| ----------------------- | --------------------------- |
| Claude Code             | `/dwp-resume`               |
| Codex / Cursor / Gemini | `#dwp-resume`               |
| Plain text              | "resume the deep work plan" |

## What it does

Hands control to `deepworkplan-resume`. The sub-skill:

1. Locates the active plan under `.dwp/plans/`.
2. Reconstructs the execution state from progress markers.
3. Identifies the first unfinished task.
4. Continues execution from there without redoing completed work.

## How the agent runs this

1. Read the installed skill at `~/.claude/skills/deepworkplan-resume/SKILL.md`.
2. Follow its steps exactly.
3. Before resuming, **re-read the validation gate** for the in-progress task — local state may have drifted (e.g., a failing test that was passing earlier).

If the skill is not installed, see [`/dwp-create`](dwp-create.md) for installation steps.

## When to prefer `/dwp-resume` over `/dwp-execute`

- The previous run was interrupted (model timeout, manual abort, network error).
- The plan file shows partial progress.
- You don't want to start over.

If the plan was completed and you re-ran `/dwp-status`, no resume is needed.

## See also

- [`/dwp-execute`](dwp-execute.md) — execute from the start (or continue if state is clean)
- [`/dwp-status`](dwp-status.md) — see what's left before deciding
- [`/dwp-refine`](dwp-refine.md) — adjust scope before resuming
