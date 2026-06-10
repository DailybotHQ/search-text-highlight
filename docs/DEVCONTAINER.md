# Devcontainer

A reproducible Docker-based development environment that ships with Node, the AI CLIs (Claude Code, OpenAI Codex, Cursor), GitHub CLI, Chromium, and a friendly bash welcome banner. Use this any time the local toolchain bites you — it's the same environment CI uses for the inputs that matter.

## Files

| File                                      | Purpose                                         |
| ----------------------------------------- | ----------------------------------------------- |
| `docker/local/docker-compose.yaml`        | Service definition + volume layout              |
| `docker/local/searchTextHL/Dockerfile`    | Image build: Node, AI CLIs, gh, chromium        |
| `docker/local/searchTextHL/.env.example`  | Sample environment file (copy to `.env`)        |
| `docker/local/searchTextHL/entrypoint.sh` | Container entrypoint                            |
| `docker/custom_commands.sh`               | Bash helpers / aliases sourced into `~/.bashrc` |
| `.devcontainer_example/devcontainer.json` | Reference VS Code Dev Containers config         |

The `.devcontainer/` folder is gitignored so each developer can keep their own VS Code overrides. Copy `.devcontainer_example/devcontainer.json` to `.devcontainer/devcontainer.json` to enable the Dev Containers extension.

## Image at a glance

Base: `node:24.16.0-trixie-slim` (Node 24.16.0 — matches `.node-version` / `.nvmrc` and CI; comfortably above the `engines.node` `>=22.0.0` floor).

Installed:

- System: `git`, `curl`, `gnupg`, `ca-certificates`, `openssh-client`, `sudo`, `nano`, `chromium`
- **pnpm** via Corepack — `corepack enable` activates the `pnpm@11.1.2` pinned in `package.json`
- GitHub CLI (`gh`) — system-wide install
- Claude Code CLI — installed via `claude.ai/install.sh` (native, npm method is deprecated)
- Cursor CLI — installed via `cursor.com/install`
- OpenAI Codex CLI — `npm install -g @openai/codex`

Configured:

- `node` user added to passwordless sudoers (so the container can `apt install` if you need to)
- A `/usr/local/bin/npm` wrapper routes bare `npm` invocations to `corepack pnpm`, so habitual `npm install` / `npm run …` still resolve to the project's pnpm toolchain
- npm globals install under `/home/node/.npm-global/`
- Default editor: `nano` (settable via `EDITOR`, `VISUAL`, `GIT_EDITOR`)
- `PATH` includes `~/.npm-global/bin`, `~/.local/bin`, `~/.cursor/bin`
- Git defaults: `init.defaultBranch=main`, `pull.rebase=false`, `safe.directory='*'`
- `~/.bashrc` sources `/app/docker/custom_commands.sh` (the welcome banner + aliases)

## Persistent volumes

Five named volumes preserve session/auth data across container rebuilds:

| Volume        | Mounted at                                           | Holds                                    |
| ------------- | ---------------------------------------------------- | ---------------------------------------- |
| `claude_data` | `/home/node/.claude_data`                            | Claude Code session, auth, project state |
| `codex_data`  | `/home/node/.codex_data`                             | OpenAI Codex CLI sessions                |
| `cursor_data` | `/home/node/.cursor_data`                            | Cursor CLI sessions                      |
| `gh_data`     | `/home/node/.gh_data`                                | GitHub CLI auth                          |
| (host bind)   | `/home/node/.ssh_host` ← `~/.ssh` (read-only)        | Your local SSH keys                      |
| (host bind)   | `/home/node/.gitconfig` ← `~/.gitconfig` (read-only) | Your local git config                    |

The repository itself is bind-mounted at `/app` from `../..` relative to `docker/local/`.

> **Caveat:** the `entrypoint.sh` script (not shown here) is responsible for symlinking the `*_data` volumes into their canonical locations (`~/.claude`, `~/.codex`, `~/.cursor`, `~/.config/gh`). Inspect it before adding a new persistent volume.

## Bringing it up

```bash
cd docker/local
docker compose up -d
docker compose ps                  # Should show searchtexthl as Up
```

Get a shell:

```bash
docker exec -it searchtexthl bash
```

The first time you enter, you'll see the welcome banner from `custom_commands.sh`:

```text
🚀 search-text-highlight — development container
✅ Running inside Docker container

Project commands:
  • install     - corepack pnpm install
  • check       - corepack pnpm run biome:check (lint + format, CI gate)
  • fix         - corepack pnpm run biome:fix (lint + format, apply fixes)
  • typecheck   - corepack pnpm run build:tsc (tsc --noEmit)
  • test        - corepack pnpm run test (Vitest)
  • build       - corepack pnpm run build (Vite production + tsc declarations)
  • codecheck   - full local gate: biome → build:tsc → vite build → test
  ...
```

Run `help` any time to print it again.

## Available helpers

`docker/custom_commands.sh` defines:

| Command              | What it does                                                                              | Status |
| -------------------- | ---------------------------------------------------------------------------------------- | ------ |
| `help`               | Print the welcome banner                                                                  | Works  |
| `check_devcontainer` | Verify you're inside a container                                                          | Works  |
| `install`            | `corepack pnpm install`                                                                   | Works  |
| `check`              | `corepack pnpm run biome:check` (lint + format, read-only)                                | Works  |
| `fix`                | `corepack pnpm run biome:fix` (lint + format, apply fixes)                                | Works  |
| `typecheck`          | `corepack pnpm run build:tsc` (tsc --noEmit)                                              | Works  |
| `test`               | `corepack pnpm run test` (Vitest)                                                         | Works  |
| `build`              | `corepack pnpm run build` (Vite production + tsc declarations)                            | Works  |
| `codecheck`          | Full CI-style chain: `biome:check` → `build:tsc` → Vite `build` → `test`                  | Works  |

All helpers invoke `corepack pnpm` directly (the `/usr/local/bin/npm` wrapper would route there anyway). `codecheck` matches the verification sequence in [Development Commands](DEVELOPMENT_COMMANDS.md) and CI — it builds before testing so the bundle smoke test runs against an up-to-date `dist/index.js`. Run `fix` first if you need auto-formatting before a read-only `codecheck`.

### AI CLI wrappers

These work as documented:

```bash
# Claude Code with all permission prompts skipped
claudex                 # New session
claudex -c              # Continue most recent session
claudex -r              # Interactive session selection
claudex -r <id>         # Resume specific session by ID

# OpenAI Codex with full permissions (bypass approvals + sandbox)
codexx                  # New session
codexx -l               # Resume last session
codexx -r               # Interactive session selection
codexx -r <id>          # Resume specific session by ID

# Cursor CLI agent with --force
cursorx                 # New session
cursorx -l              # List sessions
cursorx -r              # Resume last session
cursorx -r <id>         # Resume specific session by ID
```

> The `--dangerously-skip-permissions` / `--dangerously-bypass-approvals-and-sandbox` / `--force` flags assume you trust the agent inside an isolated container. Don't run them on a host machine without thinking about the blast radius.

### Git aliases

Sourced into the container for convenience:

```
gs   git status                gpl   git pull origin HEAD
ga   git add .                 gco   git checkout
gc   git commit -am            gcob  git checkout -b
gp   git push -u origin HEAD   gbd   git branch -D
gl   pretty git log graph      grc   git rm -r --cached .
gd   git diff
gb   git branch with metadata
```

## VS Code Dev Containers integration

The reference config is at `.devcontainer_example/devcontainer.json`. Copy it:

```bash
mkdir -p .devcontainer
cp .devcontainer_example/devcontainer.json .devcontainer/devcontainer.json
```

Then **VS Code → Reopen in Container**. The extension uses the same `docker-compose.yaml`. Pre-installed VS Code extensions (per the example):

- `eamodio.gitlens`
- `streetsidesoftware.code-spell-checker`
- `donjayamanne.githistory`
- `vscode-icons-team.vscode-icons`
- `shardulm94.trailing-spaces`
- `biomejs.biome`
- `vitest.explorer`
- `EditorConfig.EditorConfig`

Add or remove from `.devcontainer/devcontainer.json` as needed — your local copy is gitignored so it won't fight other contributors' setups.

## First-run on a fresh machine

```bash
# 1. Build + start
cd docker/local
cp searchTextHL/.env.example searchTextHL/.env    # if you'll customize env vars
docker compose up -d --build

# 2. Enter
docker exec -it searchtexthl bash

# 3. Bootstrap
install                              # → corepack pnpm install
test                                 # → corepack pnpm run test (Vitest sanity check)

# 4. Authenticate the AI CLIs (one-time, persisted in named volumes)
claude                               # follow the OAuth prompt
codex                                # OpenAI auth flow
agent --login                        # Cursor auth flow
gh auth login                        # GitHub CLI

# 5. Verify
help
git status
```

## Updating the image

When `docker/local/searchTextHL/Dockerfile` changes:

```bash
cd docker/local
docker compose build --no-cache
docker compose up -d --force-recreate
```

Persistent volumes survive a rebuild — your AI CLI sessions and git config don't vanish.

## When to use the devcontainer

- You're on Windows and the test runner behaves differently
- You need parity with CI for a flake you can't reproduce locally
- You want sandboxed execution of `claudex` / `codexx` / `cursorx` with elevated permissions
- A teammate hits an environment issue and you want to bisect

## When **not** to use the devcontainer

- Quick edits and a one-shot `corepack pnpm test` on a machine that already has Node 24.16.0 + Corepack — the host is fine
- You don't have Docker installed (or it's a memory-strapped laptop) — local Node + nvm + `corepack enable` works

## Troubleshooting

| Symptom                                    | Fix                                                                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `docker compose up` hangs on download      | Check Docker Desktop disk allocation; the chromium install pulls hundreds of MB                                            |
| `claudex` exits with "not authenticated"   | Run plain `claude` first to complete OAuth; the auth file is volume-mounted and survives rebuilds                          |
| `gh` CLI doesn't see your auth             | The volume mount writes to `/home/node/.gh_data` — re-run `gh auth login` inside the container                             |
| `git` complains about ownership            | `safe.directory='*'` is set globally; if a host UID mismatch persists, run `git config --global --add safe.directory /app` |
| The container starts but `node` is missing | The base image changed; rebuild with `docker compose build --no-cache`                                                     |
| `corepack pnpm install` errors with `EACCES` | The volume permissions drifted — run `sudo chown -R node:node /home/node` inside the container                           |
| `corepack` missing or wrong pnpm version    | Run `corepack enable` inside the container; it activates the `pnpm@11.1.2` pinned in `package.json`                        |

For deeper environment issues, also consult [`docs/getting-started/TROUBLESHOOTING.md`](getting-started/TROUBLESHOOTING.md).
