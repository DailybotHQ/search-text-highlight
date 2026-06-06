---
name: dwp-onboard
description: Re-run the AI-first onboarding non-destructively (reconciles, does not overwrite)
type: command
delegates-to: deepworkplan-onboard
---

# Command: `dwp-onboard`

Thin delegator to the installed [`deepworkplan-onboard`](https://github.com/DailybotHQ/deepworkplan-skill) sub-skill.

## Invocation

| Host                    | Form                                  |
| ----------------------- | ------------------------------------- |
| Claude Code             | `/dwp-onboard`                        |
| Codex / Cursor / Gemini | `#dwp-onboard`                        |
| Plain text              | "onboard this repo to deep work plan" |

## What it does

Hands control to `deepworkplan-onboard`. The sub-skill:

1. Re-scans the repo for stack, archetype, and existing AI-agent assets.
2. **Reconciles** missing pieces — adds files, leaves existing ones in place unless you approve a change.
3. Offers the three opt-in addons (devcontainer, Dailybot, dependency upgrade) as separate prompts.

## When to re-run

- After a major refactor that changed the module layout.
- After adopting a new build tool, test runner, or CI workflow.
- When a contributor reports that the AI agent context feels out of date.
- After upgrading the DWP skill pack (`cd ~/.local/share/deepworkplan-skill && git pull && ./setup.sh --host claude`).

**Idempotent.** Running it on an already-conformant repo should produce no changes; if it proposes changes, read them carefully before approving.

## How the agent runs this

1. Read the installed skill at `~/.claude/skills/deepworkplan-onboard/SKILL.md`.
2. Follow its steps exactly.
3. **Never overwrite existing files silently.** Propose, then act.
4. After running, [`/dwp-verify`](dwp-verify.md) should pass.

If the skill is not installed, see [`/dwp-create`](dwp-create.md) for installation steps.

## See also

- [`/dwp-verify`](dwp-verify.md) — pass/fail conformance check
- [`/skill-create`](skill-create.md) — grow the repo's skill catalog
- [`/agent-create`](agent-create.md) — grow the repo's agent roster
- [`AGENTS.md`](../../AGENTS.md) — the rules every onboarding must respect
