# AI Agent Collaboration

When multiple AI assistants share this codebase — sometimes in parallel, often across separate sessions — they need a contract so they don't step on each other's work.

## Source of truth

| Topic                            | File                                        |
| -------------------------------- | ------------------------------------------- |
| Mandatory rules                  | [`AGENTS.md`](../AGENTS.md)                 |
| Coding conventions               | [`docs/STANDARDS.md`](STANDARDS.md)         |
| Public API contract              | [`docs/API_REFERENCE.md`](API_REFERENCE.md) |
| Skills (slash commands)          | [`.agents/skills/`](../.agents/skills/)     |
| Subagents (specialized personas) | [`.agents/agents/`](../.agents/agents/)     |
| Per-skill catalog                | [`.agents/README.md`](../.agents/README.md) |

Every agent reads `AGENTS.md` first. When `AGENTS.md` changes, **all** agents inherit the new rule on their next session — no per-tool config needed. `CLAUDE.md` is a symlink — never edit it directly. `.claude/` is also a symlink to `.agents/` — same rule.

## Subagent roster

The repo defines specialized subagents (see [`.agents/agents/`](../.agents/agents/)). Use them when their domain matches:

| Subagent             | Owns                                                               | Don't use for           |
| -------------------- | ------------------------------------------------------------------ | ----------------------- |
| `ts-architect`       | Module layout, public API surface, file boundaries                 | Routine implementation  |
| `api-designer`       | The shape of `OptionsType` and any new exposed function            | Internal helpers        |
| `test-author`        | Vitest tests, test layout                                          | Production code         |
| `dependency-auditor` | `package.json` updates, transitive risks, `.ncurc.json` policy     | Application logic       |
| `release-engineer`   | Vite build, npm publish, GitHub Actions                            | Day-to-day feature work |
| `security-reviewer`  | Regex inputs, ReDoS, HTML interpolation                            | Type-only refactors     |
| `doc-writer`         | Keeps `AGENTS.md`, `README.md`, and `docs/` synchronized with code | Code changes            |

## Skill invocation

Skills are reusable procedures invoked by slash command. Same name, different prefix per host:

| Host                    | Prefix | Example          |
| ----------------------- | ------ | ---------------- |
| Claude Code             | `/`    | `/add-option`    |
| Cursor / Codex / Gemini | `#`    | `#add-option`    |
| Plain text fallback     | none   | "run add-option" |

When a command is invoked, the agent **must**:

1. Look up the skill in [`.agents/README.md`](../.agents/README.md)
2. Read the linked procedure file in `.agents/skills/<name>.md` end to end
3. Follow the steps exactly — the file IS the spec
4. If the procedure requires another subagent (e.g., `release-engineer`), delegate explicitly

## Handoffs

Agents run sequentially in a single session. When a task spans multiple roles:

1. Document what's done (commit message, PR description, scratch notes in `tmp/`)
2. Identify the next role explicitly: "Next: `test-author` to add tests for the new option"
3. The next agent reads the prior commit / notes, picks up from there

For Claude Code, this is the **subagent** pattern. For other hosts that don't support subagents, leave the handoff in the chat or in `tmp/handoffs/`.

## Parallel agents

Avoid concurrent edits to the same file. If parallelism is needed:

- Split work by file (`src/lib/type.ts` and `test/main.test.ts` are naturally orthogonal)
- Coordinate through `git` branches, not by hoping the merge resolves cleanly
- Each agent should run the full pre-commit checklist on its branch before merging

## Common conflicts

| Conflict                                                         | Resolution                                                                                                                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two agents bump the same dependency to different versions        | Pick the higher version; rerun the full check chain                                                                                                        |
| Two agents add unrelated options to `OptionsType`                | Both keep their work; one merges first, the other rebases and updates `getOptions` defaults / validation order                                             |
| One agent edits `AGENTS.md`, another edits a doc that mirrors it | The `AGENTS.md` rule wins; update the doc to match                                                                                                         |
| Two agents disagree on validation style (throw vs return error)  | Default to throwing `Error` with English message — it's the [STANDARDS.md](STANDARDS.md) rule. If the rule is wrong, fix the standard first, then the code |
| Two agents both ran `corepack pnpm run release` locally          | Only the CI-driven release counts. Discard the local bumps; the workflow auto-bumps on merge                                                               |

## When in doubt

- **Defer to `AGENTS.md`** for non-negotiable rules
- **Defer to `STANDARDS.md`** for stylistic decisions
- **Defer to `API_REFERENCE.md`** for the public contract
- **Ask the user** if none cover the case — don't silently invent a new rule
- **Propose updating the docs** if you discover a gap. Add the new rule to the right doc in the same PR

## Memory

If your host supports memory (Claude Code does, Cursor does, others vary):

- **Save** project-wide conventions only after the user has confirmed them
- **Don't save** ephemeral state like "currently working on feature X" — use `tmp/` instead
- **Verify before recommending** anything from memory; the code is the source of truth, memory may be stale
- For Claude Code specifically, see [`docs/AI_AGENT_ONBOARDING.md`](AI_AGENT_ONBOARDING.md) and the harness's auto-memory section

## Trust but verify

When taking work from another agent:

- Read the diff, don't trust the summary
- Re-run the full pre-commit checklist on your machine
- If tests fail, the work isn't done — even if the previous agent claimed otherwise
- If the previous agent edited `dist/`, revert it (`dist/` is generated, not source)

## Updating these rules

This file documents the **process** of agent collaboration. Update it when:

- A new subagent role is added to `.agents/agents/`
- The skill invocation flow changes
- A new conflict pattern surfaces in real work and we want a written resolution

Mirror any update that affects rule precedence into `AGENTS.md`'s "Shared Agent Coordination" section.
