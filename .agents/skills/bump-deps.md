---
name: bump-deps
description: Update package.json safely with verification, respecting .ncurc.json policy
type: skill
---

# Skill: `/bump-deps`

Bump one or more dependencies in `package.json`, refresh `package-lock.json`, and verify the build still works.

## When to use

- The weekly `check_packages_versions` workflow opened a PR and you want to review/update it
- The user asks to "bump X to version Y"
- A security advisory flags an outdated dep
- A new feature requires a newer version

## Inputs to confirm

- **Which packages** are being bumped (or "all" for the scheduled workflow)
- **Target versions** — exact strings, or "latest stable"
- **Why** — feature, security, hygiene
- **Whether to honor `.ncurc.json` rejects** — yes by default

## Pre-flight

`.ncurc.json` currently rejects `chai` and `@types/chai`:

```json
{
  "upgrade": true,
  "reject": ["chai", "@types/chai"]
}
```

- **chai** — v6 is ESM-only (`"type": "module"`); this repo runs Mocha + `ts-node` as CommonJS. Stay on **latest 4.x**.

If the user explicitly asks to bump Chai to v5/v6, treat it as a separate task with an ESM migration plan.

For TypeScript, ts-node, mocha, and webpack bumps, check release notes for breaking changes before editing.

## Procedure

### 1. Survey what's outdated

```bash
npm run ncu:check
```

Output looks like:

```
@types/node                    22.4.0  →  22.10.5
typescript                      5.5.4  →  5.7.3
webpack                        5.93.0  →  5.97.1
mocha                          10.7.3  →  10.10.0
```

### 2. Edit `package.json` (one library at a time)

**Don't** run `npm run ncu:upgrade` for batch updates unless the user explicitly asked. Multi-bumps mask which dep broke.

Edit a single version:

```json
"devDependencies": {
  "typescript": "5.7.3",   // was 5.5.4
  ...
}
```

Or use `npm install --save-exact`:

```bash
npm install --save-dev --save-exact typescript@5.7.3
```

`--save-exact` keeps the version pinned (no `^` prefix) — matches this repo's existing style.

### 3. Refresh the lockfile

```bash
npm install
```

This updates `package-lock.json` to reflect the new version's transitive deps.

### 4. Run the full check chain

```bash
npm run eslint:check
npm run prettier:check
npm run build:tsc
npm run test
npm run build
```

All five must pass. If any fails, read the error:

| Error pattern                  | Cause                              | Fix                                                                        |
| ------------------------------ | ---------------------------------- | -------------------------------------------------------------------------- |
| `TS6053: File 'X' not found`   | TypeScript version dropped support | Roll back or update the affected file                                      |
| `TS2304: Cannot find name 'X'` | API renamed in the new version     | Read release notes; update call sites                                      |
| `Module 'X' not found`         | Sub-package was renamed or removed | Check the package's CHANGELOG                                              |
| `Deprecation warning: Y`       | New version deprecated an API      | Address now in the same change if straightforward, otherwise file an issue |

### 5. Address breaking changes

If the new version removed an API:

- Find the replacement in the release notes
- Update call sites
- Re-run tests

If the new version changed default behavior subtly:

- Check the affected output (e.g., webpack chunk naming, mocha output format)
- Update tests if the assertion was version-coupled

### 6. Smoke-test the published surface

After a webpack or ts-loader bump:

```bash
npm pack --dry-run
node -e "console.log(require('./dist/index').highlight('hello world', 'world'))"
```

Both should look identical to before the bump.

### 7. Update docs (if needed)

If the bump is significant:

- New major version → update [`docs/TECHNOLOGIES.md`](../../docs/TECHNOLOGIES.md) version table
- Behavior change → update relevant docs (e.g., performance numbers if webpack chunking changed)
- Removed API → update any guide that referenced it

### 8. Commit

```bash
git add package.json package-lock.json <other-affected-files>
git commit -m "chore: bump typescript to 6.0.3"
```

Conventional commit type:

- `chore` — routine bump (default)
- `fix` — security or bug-fix bump
- `feat` — bumping unlocks a new feature you're now using
- `build` — toolchain (webpack, ts-loader, ts-node)
- `test` — bumping mocha / chai

### 9. PR description

For the scheduled `feature__packages_versions_update` PR, ensure the description:

- Lists every bump
- Calls out any breaking changes you addressed
- Confirms the full check chain ran locally

## Special cases

### TypeScript

After a bump:

```bash
rm -rf dist
npm run build:tsc
```

Sometimes TypeScript's incremental cache holds old type info. A clean rebuild surfaces real issues.

### Webpack

Webpack 5 → 6 (when it ships) will be a major migration. For 5.x → 5.y bumps, read the changelog for "breaking" or "deprecation" — those are the items to act on.

### ts-loader

ts-loader's compatibility table tracks TypeScript versions. After a TypeScript bump, check whether ts-loader needs a matching bump.

### Mocha

The default reporter, glob handling, and timeout behavior changed across major versions. After a Mocha major bump:

```bash
npm run test                    # Verify default reporter still works
npm run test:watch              # Verify watch mode
```

### Chai

`.ncurc.json` rejects `chai` / `@types/chai`. If the user explicitly asks for chai 5+:

1. Read the upstream Chai migration notes (ESM-only majors).
2. Decide whether the repo will migrate tests to native ESM (`tsx`, `node --import`, or `type: module`).
3. Update `tsconfig.json`, Mocha invocation, and imports accordingly.
4. Remove the chai entries from `.ncurc.json`.

This is a multi-PR migration, not a routine bump.

### ESLint

ESLint 10 + **flat config** live in `eslint.config.mjs`. Major bumps should follow upstream release notes for `typescript-eslint` and `eslint-plugin-prettier`.

### Adding a new dependency

This skill is about bumps, not adds. For a new dependency, see [.agents/agents/dependency-auditor.md](../agents/dependency-auditor.md).

## Don't

- Bump multiple unrelated libraries in one commit (multi-bumps mask failures)
- Ignore deprecation warnings introduced by the bump
- Skip the full check chain
- Force `^` ranges into `package.json` — this repo uses exact versions
- Push without verifying `npm pack --dry-run` still produces the same files

## Do

- Read release notes (at minimum the headline changes)
- Run all five check-chain steps after every bump
- Update docs in the same commit when the bump is significant
- Use conventional commit messages
- Defer to a dedicated migration PR for `chai` / `eslint` (or anything in `.ncurc.json` reject)

## Verification checklist

- [ ] One library bumped (or batch with explicit user approval)
- [ ] `package.json` and `package-lock.json` both updated
- [ ] `.ncurc.json` rejects respected (or migration plan documented)
- [ ] Full check chain passes
- [ ] No new lint suppressions
- [ ] Docs updated if affected
- [ ] Conventional commit message (`chore:`, `build:`, `fix:`, `feat:`, `test:`)
