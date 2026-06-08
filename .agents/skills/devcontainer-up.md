---
name: devcontainer-up
description: Spin up the local Docker dev environment and verify it against this repo's pnpm scripts
type: skill
---

# Skill: `/devcontainer-up`

Bring up the project's Docker devcontainer, log into the AI CLIs, run the smoke checks, and (optionally) repair the inherited helper aliases that don't match this repo's pnpm scripts.

## When to use

- First-time setup on a new machine
- Local Node / pnpm toolchain is misbehaving and you want CI parity
- You need the bundled AI CLIs (`claude`, `codex`, `agent`) with permissions bypassed in a sandbox
- The user asks "spin up the dev environment"

## Inputs to confirm

- **Docker Desktop / Docker Engine** is installed and running
- **Whether to touch `docker/custom_commands.sh`** — helpers are already wired to this repo's pnpm scripts; change only if you are extending them

## Toolchain context

The image is `node:24.16.0-trixie-slim`. The Dockerfile runs `corepack enable` so pnpm is provisioned from the `"packageManager": "pnpm@11.1.2"` pin — there is no global `npm install -g pnpm`. It also **redirects `npm` to `corepack pnpm`**: any `npm <cmd>` inside the container prints a notice and re-execs `corepack pnpm <cmd>`, so a stray `npm install` won't corrupt `node_modules` or `pnpm-lock.yaml`. Prefer the explicit `corepack pnpm` form in commands you type.

## Procedure

### 1. Verify Docker is running

```bash
docker --version
docker compose version
docker info | head -5
```

If `docker info` errors with "Cannot connect to the Docker daemon", start Docker Desktop and retry.

### 2. (Optional) Customize `.env`

```bash
ls docker/local/searchTextHL/.env.example
```

If you need environment variables in the container, copy and edit:

```bash
cp docker/local/searchTextHL/.env.example docker/local/searchTextHL/.env
# Edit as needed
```

The `.env` file is gitignored.

### 3. Build and start the container

```bash
cd docker/local
docker compose up -d --build
```

The first build pulls Node 24.16.0 (slim trixie), enables Corepack, installs Chromium, GitHub CLI, and the three AI CLIs (Claude, Codex, Cursor). Expect 3-5 minutes on a warm network.

```bash
docker compose ps
```

You should see `searchtexthl` with status `Up`.

### 4. Get a shell

```bash
docker exec -it searchtexthl bash
```

You'll see the welcome banner from `docker/custom_commands.sh`:

```text
🚀 search-text-highlight — development container
✅ Running inside Docker container
```

### 5. Bootstrap the project

Inside the container:

```bash
install                        # → corepack pnpm install
test                           # → corepack pnpm run test (Vitest sanity check)
```

If `test` passes, the container is wired correctly.

### 6. Authenticate the AI CLIs (one-time, persistent)

```bash
claude                         # OAuth — paste the prompted URL into a browser
codex                          # OpenAI auth flow
agent --login                  # Cursor auth flow
gh auth login                  # GitHub CLI
```

Each CLI's auth lands in a named volume (`claude_data`, `codex_data`, `cursor_data`, `gh_data`) — surviving container rebuilds.

### 7. Verify the full check chain inside the container

```bash
corepack pnpm run biome:check
corepack pnpm run build:tsc
corepack pnpm run test
corepack pnpm run build
```

All four must pass. This confirms parity between the container and CI.

### 8. Try the shell helpers (smoke)

`docker/custom_commands.sh` is maintained for **search-text-highlight**: `check`, `fix`, `typecheck`, `test`, `build`, and `codecheck` call the real pnpm scripts via `corepack pnpm`. From `/app` after `install`:

```bash
check                          # corepack pnpm run biome:check (lint + format, read-only)
codecheck                      # full CI-style chain: biome → build:tsc → vite build → test
```

If either fails, fix the underlying project issue — the aliases are not placeholders.

### 9. Open the project in VS Code (optional)

If you have VS Code with the Dev Containers extension:

```bash
mkdir -p .devcontainer
cp .devcontainer_example/devcontainer.json .devcontainer/devcontainer.json
```

Then **VS Code → Reopen in Container**. The extension uses the same `docker-compose.yaml` and pre-installs the Biome, GitLens, and EditorConfig extensions per the example.

`.devcontainer/` is gitignored — your overrides won't conflict with other contributors' setups.

### 10. Day-to-day once set up

```bash
docker exec -it searchtexthl bash    # Get a shell
help                                  # Print the welcome banner
gs                                    # git status (alias)
test                                  # corepack pnpm run test
claudex                               # Claude Code with skip-permissions
```

To stop:

```bash
cd docker/local
docker compose stop
```

To remove (preserves volumes):

```bash
docker compose down
```

To remove **and** wipe volumes (loses AI auth):

```bash
docker compose down -v
```

## Don't

- `docker compose down -v` unless you really want to re-authenticate every AI CLI
- Run `claudex` / `codexx` / `cursorx` outside the container — the `--dangerously-*` flags are unsafe on a host
- Edit files at the host's `/app` mount point if you also have native installs running — you'll fight write conflicts
- Run a raw `npm install` expecting npm — the container redirects `npm` to `corepack pnpm`, so it's pnpm either way; use `corepack pnpm` explicitly to avoid surprises
- Commit `docker/local/searchTextHL/.env` (gitignored, but check)

## Do

- Use the devcontainer for parity-with-CI debugging
- Keep AI auth volumes — they're convenient and isolated to your machine
- Run `codecheck` inside the container when you want CI parity in one command
- Use `gh` from inside the container for issue / PR operations
- Run `corepack pnpm --version` after a shell to confirm the pinned 11.1.2 is active

## Verification checklist

- [ ] `docker compose ps` shows `searchtexthl` Up
- [ ] `docker exec -it searchtexthl bash` opens a working shell
- [ ] `corepack pnpm --version` reports 11.1.2
- [ ] `install` and `test` succeed inside the container
- [ ] `claude --version`, `codex --version`, `agent --version` (or equivalent) all work
- [ ] `check` and `codecheck` succeed inside the container after `install` (optional smoke of `docker/custom_commands.sh`)
- [ ] `corepack pnpm run build` produces a `dist/` matching the host's
