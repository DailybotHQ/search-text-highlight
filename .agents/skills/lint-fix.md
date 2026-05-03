---
name: lint-fix
description: Run ESLint and Prettier with --fix and tidy any remaining issues
type: skill
---

# Skill: `/lint-fix`

Apply ESLint and Prettier auto-fixes, then handle anything that auto-fix can't repair.

## When to use

- Right before committing
- After a large refactor
- When CI's `Validate Linters and Code Format` step is red
- When the user asks "fix the formatting" or "lint everything"

## Inputs to confirm

Usually nothing — this is a one-shot procedure. If the user only wants ESLint or only Prettier, they'll say so.

## Procedure

### 1. Auto-fix what tooling can

```bash
npm run eslint:fix
npm run prettier:fix
```

Order matters: ESLint first (because some lint fixes change spacing), Prettier second (because Prettier always wins for formatting).

### 2. Check for residual issues

```bash
npm run eslint:check
npm run prettier:check
```

If both pass, done. Otherwise:

### 3. Resolve ESLint errors that auto-fix couldn't

Common categories:

| Rule                                 | Auto-fix?                                | Manual fix                                                                      |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------- |
| `no-console`                         | No                                       | Remove the `console.*` call (or move to `tmp/` if it's a debug aid)             |
| `@typescript-eslint/no-unused-vars`  | Sometimes                                | Delete the unused var, or rename to `_unused` if it's a positional callback arg |
| `@typescript-eslint/no-explicit-any` | No (we don't enforce this rule globally) | Add `as Type` with a comment, or update the type to remove `any`                |
| `prefer-const`                       | Yes                                      | n/a                                                                             |
| `eqeqeq`                             | No                                       | Use `===` / `!==`                                                               |
| `no-var`                             | Yes                                      | n/a                                                                             |

If a rule fires on legitimate code, **don't** disable it inline. Instead:

1. Confirm the rule is wrong for the codebase (open a discussion)
2. If yes, edit `eslint.config.mjs` deliberately
3. If no, fix the code

### 4. Resolve Prettier diffs

Prettier rarely fails after `--write` — when it does, the cause is usually:

- A file Prettier doesn't know how to handle (uncommon — the glob is `**/*.{css,html,js,ts,json,md,yaml,yml}`)
- A merge conflict marker (`<<<<<<<`) in a file
- A syntax error in a `.ts` file (Prettier can't format invalid code; fix the syntax first)

### 5. Verify

```bash
npm run eslint:check && npm run prettier:check
```

Both must pass.

### 6. Commit

```bash
git add -p           # Review every hunk before staging
git commit -m "style: apply eslint and prettier autofixes"
```

If the lint-fix is part of a bigger change (e.g., you also added a feature), commit the lint changes separately or fold them into the feature commit — but **don't** commit unrelated touch-ups under a feature title.

## When to skip

- The PR is purely a docs change and the doc files were already formatted
- You're only editing inside `dist/` (don't — see [Architecture](../../docs/ARCHITECTURE.md))
- The repository is in the middle of a large refactor and the maintainer asked you to defer formatting

## Anti-patterns

### Tweaking `eslint.config.mjs` to silence one warning

If you find yourself editing the rule list to make a single line pass, the lint rule is probably correct and your code probably has a real issue. Fix the code.

### Ignoring `.prettierrc` defaults

The configured Prettier values (`singleQuote: true`, `semi: false`, `trailingComma: 'es5'`) are intentional. Don't argue with them; let Prettier rewrite.

### Using `// eslint-disable-next-line` liberally

The only legitimate uses in this repo are:

- `: any` type annotations in tests where we deliberately violate the type contract
- A documented one-shot exception with a comment explaining why

If you find yourself adding a third `eslint-disable-next-line` to a single file, the rule is probably wrong for the file — discuss instead of papering over.

## Common output

After a clean `lint-fix` run, expect:

```
$ npm run eslint:fix
> search-text-highlight@2.0.8 eslint:fix
> eslint --ext .ts --fix --ignore-path .gitignore .

(no output = no errors, with fixes applied silently)

$ npm run prettier:fix
> search-text-highlight@2.0.8 prettier:fix
> prettier --write --ignore-path .gitignore '**/*.{css,html,js,ts,json,md,yaml,yml}' '!package.json'

src/index.ts 25ms
src/lib/type.ts 15ms
...
```

If `eslint:fix` prints errors after the autofix pass, those are the manual cases from step 3.

## Verification checklist

- [ ] `npm run eslint:fix` ran cleanly (or the residuals were manually resolved)
- [ ] `npm run prettier:fix` ran cleanly
- [ ] `npm run eslint:check` exits 0
- [ ] `npm run prettier:check` exits 0
- [ ] No new `// eslint-disable*` comments unless documented
- [ ] No `eslint.config.mjs` / `.prettierrc` changes unless deliberate
- [ ] Conventional commit message (`style:` for autofix-only commits, otherwise the original feature/fix prefix)
