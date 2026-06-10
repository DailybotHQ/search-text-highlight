---
name: reset-env
description: Clear node_modules and caches, then reinstall from a clean state
type: command
---

# Command: `reset-env`

Wipe local environment artifacts and reinstall. Use when the toolchain is misbehaving and you suspect stale state.

## Invocation

| Host                    | Form            |
| ----------------------- | --------------- |
| Claude Code             | `/reset-env`    |
| Codex / Cursor / Gemini | `#reset-env`    |
| Plain text              | "run reset-env" |

## When to use

- `corepack pnpm install` produces unexpected output
- A test passes locally but fails in CI (start with this before assuming env-divergence)
- Vite reports phantom errors that go away after a rebuild
- TypeScript reports stale type info even after editing
- After pulling a branch with significantly different `package.json` / `pnpm-lock.yaml`

> All commands use `corepack pnpm`. The repo pins `pnpm@11.1.2` via the `packageManager`
> field, and Corepack provisions that exact version. In the devcontainer a bare `npm` is
> routed to `corepack pnpm`, so `npm install` works there too — but prefer the explicit
> `corepack pnpm` form everywhere else.

## Default reset (most common)

```bash
rm -rf node_modules dist
corepack pnpm install --frozen-lockfile
```

`--frozen-lockfile` installs exactly what `pnpm-lock.yaml` pins and fails if the lockfile is out of sync with `package.json` — that's what you want for a clean, reproducible reset. Drop the flag only when you intend to update the lockfile.

Then verify:

```bash
corepack pnpm run biome:check && \
  corepack pnpm run build:tsc && \
  corepack pnpm run test && \
  corepack pnpm run build
```

If green, you're back to a working state.

## Aggressive reset (when default doesn't help)

```bash
# Stop nodemon / vitest watchers if running
pkill -f nodemon
pkill -f vitest

# Wipe local artifacts
rm -rf node_modules dist
rm -rf coverage                       # If you've added coverage tooling
rm -f *.tgz                           # Old pnpm pack outputs

# Clear the pnpm store cache
corepack pnpm store prune

# Reinstall
corepack pnpm install --frozen-lockfile
```

Verify with the full chain.

## Nuclear reset (last resort)

When even the aggressive reset fails — usually means a store-level cache is poisoned:

```bash
# Stop all node processes
pkill -f node

# Wipe local
rm -rf node_modules dist coverage

# Prune and (if needed) clear the pnpm content-addressable store
corepack pnpm store prune
rm -rf "$(corepack pnpm store path)"      # Full store wipe — forces re-download

# Optionally regenerate the lockfile (caution — see below)
# rm -f pnpm-lock.yaml
# corepack pnpm install

# Standard reinstall
corepack pnpm install --frozen-lockfile
```

> **About deleting `pnpm-lock.yaml`:** don't, unless you intend to commit the regenerated lockfile and have a maintainer review it. The lockfile is the trust anchor for the dep tree — replacing it can pull in different transitive versions and is the kind of change that needs a review. Note also that `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080`, so a fresh resolution will refuse versions published less than 7 days ago.

## When the issue is the devcontainer

If the failure is inside the Docker devcontainer:

```bash
cd docker/local
docker compose down
docker volume rm searchtexthllocal_<volume>     # If a specific volume is corrupted
docker compose up -d --build --force-recreate
docker exec -it searchtexthl bash
```

Inside the new container:

```bash
install        # → corepack pnpm install (npm wrapper routes to pnpm)
test           # → corepack pnpm run test
```

The named volumes (`claude_data`, `codex_data`, `cursor_data`, `gh_data`) are preserved unless you explicitly `docker volume rm` them — your AI auth survives a devcontainer rebuild.

## When TypeScript is the source

After clearing `dist/`:

```bash
rm -rf dist
corepack pnpm run build:tsc
```

If your editor still shows phantom errors, restart its TypeScript server:

- VS Code: `Cmd/Ctrl+Shift+P` → `TypeScript: Restart TS Server`
- Cursor: same shortcut

## When Vitest is hanging

Vitest occasionally fails to exit due to a lingering handle. The library is synchronous, so if this happens:

1. Ensure no test introduced async code without proper cleanup
2. Run a single file to isolate it:
   ```bash
   corepack pnpm exec vitest run test/main.test.ts
   ```
3. **Find the leak** — forcing an exit is a band-aid

## Verify the reset worked

After any reset:

```bash
node --version          # Match the project's engines (>=22; repo dev on 24.16.0)
corepack pnpm --version # Should report 11.1.2
ls node_modules | head   # Should show packages
corepack pnpm run test  # Sanity check
corepack pnpm run build # Production bundle
```

If the suite still misbehaves, the issue is in the code or the test, not the environment.

## Don't

- Delete `package.json` or `pnpm-lock.yaml` to "really start fresh" — without those, `corepack pnpm install` can't reproduce the tree
- Reset env in a panic — read the actual error first; many "stale state" issues are real bugs
- Run `corepack pnpm install` while another install is in flight — the second one will conflict
- Wipe the pnpm store while an install is running

## Do

- Start with the default reset
- Escalate gradually
- Capture the original error before resetting (in `tmp/diagnostic-<date>.log` or similar)
- If installs keep failing, confirm Corepack is enabled: `corepack enable`

## Common follow-ups

After a reset, you may want:

- [`/verify`](verify.md) — confirm the full check chain passes
- [`/fix-build`](../skills/fix-build.md) — if `corepack pnpm run build` still fails after reset
- [`/devcontainer-up`](../skills/devcontainer-up.md) — switch to the devcontainer if local Node is the problem

## See also

- [`docs/getting-started/TROUBLESHOOTING.md`](../../docs/getting-started/TROUBLESHOOTING.md) — specific failure modes
- [`docs/DEVCONTAINER.md`](../../docs/DEVCONTAINER.md) — Docker dev environment
