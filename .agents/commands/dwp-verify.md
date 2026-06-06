---
name: dwp-verify
description: Run an objective pass/fail conformance check against the Deep Work Plan spec
type: command
delegates-to: deepworkplan-verify
---

# Command: `dwp-verify`

Thin delegator to the installed [`deepworkplan-verify`](https://github.com/DailybotHQ/deepworkplan-skill) sub-skill.

## Invocation

| Host                    | Form                                |
| ----------------------- | ----------------------------------- |
| Claude Code             | `/dwp-verify`                       |
| Codex / Cursor / Gemini | `#dwp-verify`                       |
| Plain text              | "verify deep work plan conformance" |

## What it does

Read-only conformance check. The sub-skill:

1. Checks that `AGENTS.md`, `CLAUDE.md`, `docs/`, `.agents/`, `.dwp/` exist and match the spec.
2. Checks that plan files in `.dwp/plans/` are well-formed.
3. Produces an **objective pass / fail report** (no opinionated nags).

## How the agent runs this

1. Read the installed skill at `~/.claude/skills/deepworkplan-verify/SKILL.md`.
2. Follow its steps exactly.
3. **No mutations** — this command only reads files.
4. Surface the verify output to the user verbatim; do not silently fix failures.

If the skill is not installed, see [`/dwp-create`](dwp-create.md) for installation steps.

## Repo-specific expectations

This repo is conformant when:

- `AGENTS.md` (root) and `CLAUDE.md` → `AGENTS.md` (symlink) both resolve.
- `docs/` contains the standard categories (`PRODUCT_SPEC.md`, `ARCHITECTURE.md`, `STANDARDS.md`, `TESTING_GUIDE.md`, `DEVELOPMENT_COMMANDS.md`, `SECURITY.md`, `PERFORMANCE.md`, `AI_AGENT_ONBOARDING.md`, `AI_AGENT_COLLAB.md`, `README.md`).
- `.agents/` has `agents/`, `commands/`, `skills/`, `docs/`, and `README.md`.
- `.claude → .agents` symlink resolves.
- `.dwp/plans/` and `.dwp/drafts/` exist, gitignored except for `.gitkeep`.
- `src/lib/README.md` exists for the per-module doc convention.

If verify reports a gap, fix it through the same patterns used by `/dwp-onboard` — do not skip the check.

## See also

- [`/dwp-onboard`](dwp-onboard.md) — non-destructively re-apply the onboarding standard
- [`/verify`](verify.md) — the project's own pre-push check chain (separate concern)
