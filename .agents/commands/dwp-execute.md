---
name: dwp-execute
description: Execute the active Deep Work Plan task-by-task, validating each gate
type: command
delegates-to: deepworkplan-execute
---

# Command: `dwp-execute`

Thin delegator to the installed [`deepworkplan-execute`](https://github.com/DailybotHQ/deepworkplan-skill) sub-skill.

## Invocation

| Host                    | Form                         |
| ----------------------- | ---------------------------- |
| Claude Code             | `/dwp-execute`               |
| Codex / Cursor / Gemini | `#dwp-execute`               |
| Plain text              | "execute the deep work plan" |

## What it does

Hands control to `deepworkplan-execute`. The sub-skill:

1. Locates the active plan under `.dwp/plans/`.
2. Runs each task sequentially.
3. Validates the gate after every task.
4. Updates the plan's progress markers so `/dwp-status` can report state without re-running anything.

## How the agent runs this

1. Read the installed skill at `~/.claude/skills/deepworkplan-execute/SKILL.md`.
2. Follow its steps exactly.
3. Treat the active plan as the source of truth — do not skip a task, do not reorder, do not silently broaden scope.
4. If a validation gate fails, stop and surface the failure (do not "fix" the gate).

If the skill is not installed, see [`/dwp-create`](dwp-create.md) for installation steps.

## Repo-specific gates that every plan should respect

Whenever a task touches the relevant area, the gate should include the matching repo command:

| Area touched                                          | Gate command                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/**`, `test/**`                                   | `corepack pnpm run test`                                                                 |
| Public types in `src/lib/type.ts`                     | `corepack pnpm run build:tsc` + `corepack pnpm run test`                                 |
| Build config (`vite.config.ts`, `tsconfig*.json`)     | `corepack pnpm run build`                                                                |
| Lint / format config (`biome.json`)                   | `corepack pnpm run biome:check`                                                          |
| Docs only                                             | Manual review against [`docs/DOCUMENTATION_GUIDE.md`](../../docs/DOCUMENTATION_GUIDE.md) |
| Anything in `.github/workflows/`                      | Reproduce locally with the [`/ci-reproduce`](ci-reproduce.md) command before merge       |

## On interruption

If execution is interrupted (model timeout, network, manual abort), restart with [`/dwp-resume`](dwp-resume.md). It re-reads the plan, finds the first unfinished task, and continues — it does **not** redo completed work.

## See also

- [`/dwp-create`](dwp-create.md) — create a plan to execute
- [`/dwp-status`](dwp-status.md) — check progress without executing
- [`/dwp-refine`](dwp-refine.md) — modify the plan mid-execution
- [`/dwp-resume`](dwp-resume.md) — recover after an interruption
- [`/verify`](verify.md) — the project's pre-push check chain
