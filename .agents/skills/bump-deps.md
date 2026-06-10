---
name: bump-deps
description: Update package.json safely with verification, respecting .ncurc.json policy
type: skill
---

# Skill: `/bump-deps`

Bump one or more dependencies in `package.json`, refresh `pnpm-lock.yaml`, and verify the build still works.

## When to use

- The weekly `check_packages_versions` workflow opened a PR and you want to review/update it
- The user asks to "bump X to version Y"
- A security advisory flags an outdated dep
- A new feature requires a newer version

## Inputs to confirm

- **Which packages** are being bumped (or "all" for the scheduled workflow)
- **Target versions** — exact strings, or "latest stable"
- **Why** — feature, security, hygiene

## Toolchain context

- Package manager is **pnpm 11.1.2**, pinned via `"packageManager": "pnpm@11.1.2"` and provisioned by Corepack. Always invoke it as `corepack pnpm`.
- The lockfile is **`pnpm-lock.yaml`** (commit it alongside `package.json`).
- `.ncurc.json` is just `{ "upgrade": true }` — there are no rejected packages.
- `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080` (7 days). pnpm will refuse to install any version published less than a week ago — a deliberate supply-chain quarantine. A bump to a freshly released version will fail to resolve until it ages out; that's expected, not a bug.

For TypeScript, Vite, Vitest, and Biome bumps, check release notes for breaking changes before editing.

## Procedure

### 1. Survey what's outdated

```bash
corepack pnpm run ncu:check
```

Output looks like:

```text
@types/node                    25.7.0  →  25.8.0
typescript                      6.0.3  →  6.1.0
vite                           8.0.16  →  8.1.0
vitest                          4.1.8  →  4.2.0
```

`ncu:check` runs `npm-check-updates`, which respects `.ncurc.json` (currently no rejects).

### 2. Edit `package.json` (one library at a time)

**Don't** run `corepack pnpm run ncu:upgrade` for batch updates unless the user explicitly asked. Multi-bumps mask which dep broke.

Edit a single version:

```json
"devDependencies": {
  "typescript": "6.1.0",   // was 6.0.3
  ...
}
```

Or let pnpm pin it exactly:

```bash
corepack pnpm add -D --save-exact typescript@6.1.0
```

`--save-exact` keeps the version pinned (no `^` prefix) — matches this repo's existing style.

### 3. Refresh the lockfile

```bash
corepack pnpm install
```

This updates `pnpm-lock.yaml` to reflect the new version's transitive deps. If pnpm refuses with a quarantine error (`minimumReleaseAge`), the target version is younger than 7 days — wait for it to age out or pick an older patch.

### 4. Run the full check chain

```bash
corepack pnpm run biome:check
corepack pnpm run build:tsc
corepack pnpm run test
corepack pnpm run build
```

All four must pass. If any fails, read the error:

| Error pattern                  | Cause                              | Fix                                                                        |
| ------------------------------ | ---------------------------------- | -------------------------------------------------------------------------- |
| `TS6053: File 'X' not found`   | TypeScript version dropped support | Roll back or update the affected file                                      |
| `TS2304: Cannot find name 'X'` | API renamed in the new version     | Read release notes; update call sites                                      |
| `Module 'X' not found`         | Sub-package was renamed or removed | Check the package's CHANGELOG                                              |
| `[vite]` / Rollup error        | Vite or esbuild changed behavior   | Check the Vite migration notes; verify `vite.config.ts` still applies      |
| `Deprecation warning: Y`       | New version deprecated an API      | Address now in the same change if straightforward, otherwise file an issue |

### 5. Address breaking changes

If the new version removed an API:

- Find the replacement in the release notes
- Update call sites
- Re-run tests

If the new version changed default behavior subtly:

- Check the affected output (e.g., Vite chunk/output naming, Vitest reporter format)
- Update tests if the assertion was version-coupled

### 6. Smoke-test the published surface

After a Vite or TypeScript bump:

```bash
corepack pnpm pack --dry-run
corepack pnpm run build
node -e "console.log(require('./dist/index').highlight('hello world', 'world'))"
```

Both should look identical to before the bump.

### 7. Update docs (if needed)

If the bump is significant:

- New major version → update [`docs/TECHNOLOGIES.md`](../../docs/TECHNOLOGIES.md) version table
- Behavior change → update relevant docs (e.g., performance numbers if Vite output changed)
- Removed API → update any guide that referenced it

### 8. Commit

```bash
git add package.json pnpm-lock.yaml <other-affected-files>
git commit -m "chore: bump typescript to 6.1.0"
```

Conventional commit type:

- `chore` — routine bump (default)
- `fix` — security or bug-fix bump
- `feat` — bumping unlocks a new feature you're now using
- `build` — toolchain (Vite, esbuild, tsx, nodemon)
- `test` — bumping Vitest

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
corepack pnpm run build:tsc
```

Sometimes TypeScript's incremental cache holds old type info. A clean rebuild surfaces real issues.

### Vite / esbuild

Vite majors are migration events — read the Vite migration guide. esbuild (pulled in by Vite, allow-listed in `pnpm-workspace.yaml` `allowBuilds`) bumps are usually transparent, but verify `dist/index.js` still builds and stays zero-dependency. After any Vite bump, re-run `pack-check` to confirm the bundle size and contents are unchanged.

### Vitest

The reporter, config schema, and matcher behavior can shift across majors. After a Vitest major bump:

```bash
corepack pnpm run test          # Verify the default run still works
corepack pnpm exec vitest       # Verify watch mode
```

Confirm `vitest.config.ts` still validates against the new version's schema.

### Biome

Biome's rule set and config schema evolve between majors. After a Biome bump, update the `$schema` URL in `biome.json` to match the new version and run `corepack pnpm run biome:check` to surface any newly-enabled rules.

### pnpm

pnpm itself is pinned via the `packageManager` field, not `devDependencies`. To change it, update that field (and the devcontainer if it references a version) — Corepack will provision the new version on next invocation. Bumping pnpm can change lockfile format; regenerate and review `pnpm-lock.yaml` deliberately.

### Adding a new dependency

This skill is about bumps, not adds. For a new dependency, see [.agents/agents/dependency-auditor.md](../agents/dependency-auditor.md).

## Don't

- Bump multiple unrelated libraries in one commit (multi-bumps mask failures)
- Ignore deprecation warnings introduced by the bump
- Skip the full check chain
- Force `^` ranges into `package.json` — this repo uses exact versions
- Push without verifying `corepack pnpm pack --dry-run` still produces the same files

## Do

- Read release notes (at minimum the headline changes)
- Run all four check-chain steps after every bump
- Update docs in the same commit when the bump is significant
- Use conventional commit messages
- Defer a Vite / Vitest / TypeScript major to a dedicated migration PR
- Expect the `minimumReleaseAge` quarantine to block very fresh versions — it's working as designed

## Verification checklist

- [ ] One library bumped (or batch with explicit user approval)
- [ ] `package.json` and `pnpm-lock.yaml` both updated
- [ ] Full check chain passes
- [ ] No new lint suppressions
- [ ] Docs updated if affected
- [ ] Conventional commit message (`chore:`, `build:`, `fix:`, `feat:`, `test:`)
