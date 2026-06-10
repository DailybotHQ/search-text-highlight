---
name: dwp-create
description: Decompose a goal into a Deep Work Plan with numbered tasks and validation gates
type: command
delegates-to: deepworkplan-create
---

# Command: `dwp-create`

Thin delegator to the installed [`deepworkplan-create`](https://github.com/DailybotHQ/deepworkplan-skill) sub-skill.

## Invocation

| Host                    | Form                                |
| ----------------------- | ----------------------------------- |
| Claude Code             | `/dwp-create <goal>`                |
| Codex / Cursor / Gemini | `#dwp-create <goal>`                |
| Plain text              | "create a deep work plan to <goal>" |

## What it does

Hands control to `deepworkplan-create`. The sub-skill:

1. Asks clarifying questions about the goal if needed.
2. Decomposes it into numbered, sequential tasks.
3. Adds a validation gate for each task (a concrete pass/fail check).
4. Writes the resulting plan to `.dwp/plans/<slug>.md` (drafts go to `.dwp/drafts/`).

Both `.dwp/plans/` and `.dwp/drafts/` are scaffolded in this repo and gitignored — see [`.gitignore`](../../.gitignore) and the [`docs/PRODUCT_SPEC.md`](../../docs/PRODUCT_SPEC.md) plan ownership notes.

## How the agent runs this

1. Read the installed skill at `~/.claude/skills/deepworkplan-create/SKILL.md`.
2. Follow its steps exactly. **Do not improvise.**
3. Convert the user's `<goal>` into the skill's expected input.
4. Surface the resulting plan path so the user can review it before `/dwp-execute`.

If the skill is not installed, stop and tell the user to run:

```bash
git clone https://github.com/DailybotHQ/deepworkplan-skill.git ~/.local/share/deepworkplan-skill
~/.local/share/deepworkplan-skill/setup.sh --host claude
```

## Repo-specific reminders

- This is a **library** — most plans should be small (1-4 tasks) unless touching the build pipeline or the public API.
- Every task that modifies `src/` must include a validation gate that runs `corepack pnpm run test`.
- Public-surface changes (`OptionsType`, `highlight` signature) must include a gate that bumps `MAJOR` in `package.json`.

## See also

- [`/dwp-execute`](dwp-execute.md) — run the resulting plan
- [`/dwp-refine`](dwp-refine.md) — modify the plan before / during execution
- [`/dwp-status`](dwp-status.md) — report progress without changing anything
- [`AGENTS.md`](../../AGENTS.md) — mandatory project rules every task must respect
