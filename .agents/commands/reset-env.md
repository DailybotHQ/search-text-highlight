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

- `npm install` produces unexpected output
- A test passes locally but fails in CI (start with this before assuming env-divergence)
- Webpack reports phantom errors that go away after a rebuild
- TypeScript reports stale type info even after editing
- After pulling a branch with significantly different `package.json`

## Default reset (most common)

```bash
rm -rf node_modules dist
npm install
```

Then verify:

```bash
npm run eslint:check && \
  npm run prettier:check && \
  npm run build:tsc && \
  npm run test && \
  npm run build
```

If green, you're back to a working state.

## Aggressive reset (when default doesn't help)

```bash
# Stop nodemon / mocha watchers if running
pkill -f nodemon
pkill -f mocha

# Wipe local artifacts
rm -rf node_modules dist
rm -rf coverage .nyc_output           # If you've added coverage tooling
rm -f *.tgz                            # Old npm pack outputs

# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

Verify with the full chain.

## Nuclear reset (last resort)

When even the aggressive reset fails — usually means an OS-level cache or registry is poisoned:

```bash
# Stop all node processes
pkill -f node

# Wipe local
rm -rf node_modules dist coverage
rm -rf .git/hooks/node_modules         # If husky / pre-commit hooks installed deps

# Wipe global npm caches
npm cache clean --force
rm -rf ~/.npm/_cacache
rm -rf ~/.npm/_logs

# Optionally regenerate the lockfile (caution — see below)
# rm -f package-lock.json
# npm install

# Standard reinstall
npm install
```

> **About deleting `package-lock.json`:** don't, unless you intend to commit the regenerated lockfile and have a maintainer review it. The lockfile is the trust anchor for the dep tree — replacing it can pull in different transitive versions and is the kind of change that needs a review.

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
install        # → npm install
test           # → npm run test
```

The named volumes (`claude_data`, `codex_data`, `cursor_data`, `gh_data`) are preserved unless you explicitly `docker volume rm` them — your AI auth survives a devcontainer rebuild.

## When TypeScript is the source

TypeScript caches incremental builds in `tsconfig.tsbuildinfo` (the file lives in `dist/` for this repo because of `outDir`). After clearing `dist/`:

```bash
rm -rf dist
npm run build:tsc
```

If your editor still shows phantom errors, restart its TypeScript server:

- VS Code: `Cmd/Ctrl+Shift+P` → `TypeScript: Restart TS Server`
- Cursor: same shortcut

## When Mocha is hanging

Mocha occasionally fails to exit due to a lingering handle. The library is synchronous, so if this happens:

1. Ensure no test introduced async code without proper cleanup
2. Run with `--exit`:
   ```bash
   npx mocha --require ts-node/register test/**.ts --timeout 25000 --colors --exit
   ```
3. **Find the leak** — `--exit` is a band-aid

## Verify the reset worked

After any reset:

```bash
node --version          # Match the project's engines
npm --version
ls node_modules | head  # Should show ~30+ packages
npm run test            # Sanity check
npm run build           # Production bundle
```

If the suite still misbehaves, the issue is in the code or the test, not the environment.

## Don't

- Delete `package.json` or `package-lock.json` to "really start fresh" — without those, `npm install` does nothing
- Reset env in a panic — read the actual error first; many "stale state" issues are real bugs
- Run `npm install` while another `npm install` is in flight — the second one will conflict and may corrupt `node_modules`
- Delete `~/.npm/_cacache` while npm is running

## Do

- Start with the default reset
- Escalate gradually
- Capture the original error before resetting (in `tmp/diagnostic-<date>.log` or similar)
- Check `npm doctor` for environment health if resets keep being needed:

```bash
npm doctor
```

## Common follow-ups

After a reset, you may want:

- [`/verify`](verify.md) — confirm the full check chain passes
- [`/fix-build`](../skills/fix-build.md) — if `npm run build` still fails after reset
- [`/devcontainer-up`](../skills/devcontainer-up.md) — switch to the devcontainer if local Node is the problem

## See also

- [`docs/getting-started/TROUBLESHOOTING.md`](../../docs/getting-started/TROUBLESHOOTING.md) — specific failure modes
- [`docs/DEVCONTAINER.md`](../../docs/DEVCONTAINER.md) — Docker dev environment
