---
name: lint-fix
description: Run Biome with --write and tidy any remaining issues
type: skill
---

# Skill: `/lint-fix`

Apply Biome auto-fixes (lint + format in one pass), then handle anything that auto-fix can't repair.

## When to use

- Right before committing
- After a large refactor
- When CI's `Validate Linters and Code Format` step is red
- When the user asks "fix the formatting" or "lint everything"

## Inputs to confirm

Usually nothing — this is a one-shot procedure. Biome handles both linting and formatting, so there's no separate ESLint / Prettier step to choose between.

## Procedure

### 1. Auto-fix what tooling can

```bash
corepack pnpm run biome:fix
```

`biome:fix` is `biome check --write` — it applies both lint fixes and formatting in a single pass. For fixes Biome marks as unsafe (behavioral, not just stylistic), opt in explicitly:

```bash
corepack pnpm run biome:fix:unsafe        # biome check --write --unsafe
```

Only run the unsafe variant when you've reviewed what it will change — it can rewrite logic, not just whitespace.

### 2. Check for residual issues

```bash
corepack pnpm run biome:check
```

If it passes, done. Otherwise:

### 3. Resolve lint errors that auto-fix couldn't

Common categories (rules configured in `biome.json`):

| Rule                            | Auto-fix? | Manual fix                                                              |
| ------------------------------- | --------- | ---------------------------------------------------------------------- |
| `suspicious/noConsole`          | No        | Remove the `console.*` call (allowed in `test/**` via override)        |
| `correctness/noUnusedVariables` | Sometimes | Delete the unused var, or prefix with `_` if it's a positional arg     |
| `suspicious/noExplicitAny`      | n/a       | Disabled in `biome.json` — `any` is allowed (used in invalid-type tests) |
| `style/useConst`                | Yes       | n/a                                                                    |
| `suspicious/noDoubleEquals`     | Sometimes | Use `===` / `!==`                                                      |

If a rule fires on legitimate code, **don't** disable it inline. Instead:

1. Confirm the rule is wrong for the codebase (open a discussion)
2. If yes, edit `biome.json` deliberately
3. If no, fix the code

### 4. Resolve formatter diffs

Biome rarely fails formatting after `--write` — when it does, the cause is usually:

- A merge conflict marker (`<<<<<<<`) in a file
- A syntax error in a `.ts` file (Biome can't format invalid code; fix the syntax first)
- A file outside the configured `files.includes` globs (check `biome.json`)

### 5. Verify

```bash
corepack pnpm run biome:check
```

Must pass (exit 0).

### 6. Commit

```bash
git add -p           # Review every hunk before staging
git commit -m "style: apply biome autofixes"
```

If the lint-fix is part of a bigger change (e.g., you also added a feature), commit the lint changes separately or fold them into the feature commit — but **don't** commit unrelated touch-ups under a feature title.

## When to skip

- The PR is purely a docs change and the doc files were already formatted
- You're only editing inside `dist/` (don't — see [Architecture](../../docs/ARCHITECTURE.md))
- The repository is in the middle of a large refactor and the maintainer asked you to defer formatting

## Anti-patterns

### Tweaking `biome.json` to silence one warning

If you find yourself editing the rule list to make a single line pass, the lint rule is probably correct and your code probably has a real issue. Fix the code.

### Ignoring Biome's formatter defaults

The configured formatter values (`quoteStyle: single`, `semicolons: asNeeded`, `trailingCommas: es5`, `lineWidth: 120`) are intentional. Don't argue with them; let Biome rewrite.

### Using `// biome-ignore` liberally

The only legitimate uses in this repo are:

- A documented one-shot exception with a comment explaining why

`any` is already allowed globally (`noExplicitAny: off`) and `console` is allowed in `test/**`, so most cases that would have needed a suppression don't. If you find yourself adding a third `// biome-ignore` to a single file, the rule is probably wrong for the file — discuss instead of papering over.

## Common output

After a clean `lint-fix` run, expect:

```text
$ corepack pnpm run biome:fix
> search-text-highlight@2.1.3 biome:fix
> biome check --write

Checked N files in Xms. No fixes applied.
```

If `biome:fix` still reports diagnostics after the autofix pass, those are the manual cases from step 3.

## Verification checklist

- [ ] `corepack pnpm run biome:fix` ran cleanly (or the residuals were manually resolved)
- [ ] `corepack pnpm run biome:check` exits 0
- [ ] No new `// biome-ignore` comments unless documented
- [ ] No `biome.json` changes unless deliberate
- [ ] Conventional commit message (`style:` for autofix-only commits, otherwise the original feature/fix prefix)
