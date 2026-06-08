# Environment Setup

A step-by-step guide for setting up a development environment for `search-text-highlight`, starting from zero. Two paths are documented:

- **Path A (recommended): the bundled Docker devcontainer.** Reproducible across macOS / Linux / Windows, ships the AI CLIs pre-installed
- **Path B: native install.** Faster startup; requires Node + Corepack-managed pnpm on your host

By the end of this guide you will be able to run the test suite, build the production bundle, and publish locally with `pnpm pack`.

> This repo uses **pnpm** (pinned via `package.json`'s `"packageManager": "pnpm@11.1.2"` and activated through Corepack). Bare `npm` commands inside the devcontainer are transparently routed to `corepack pnpm` by a wrapper at `/usr/local/bin/npm`, so the `npm`-style helpers you'll see below still work there. On a native host, run `corepack enable` once and then use `corepack pnpm` (or plain `pnpm`).

> Already have your tools installed? Skip to [Running Locally](RUNNING_LOCALLY.md).
> Hit a problem? Check [Troubleshooting](TROUBLESHOOTING.md).

## Path A — Docker devcontainer (recommended)

### 1. What you need to install

| Tool                                            | Purpose                                                         | How to install                                                                                    |
| ----------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Docker Desktop** (or Docker Engine + Compose) | Runs the devcontainer                                           | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)              |
| **Git**                                         | Version control                                                 | Pre-installed on macOS, `apt install git` on Linux, [git-scm.com](https://git-scm.com) on Windows |
| **VS Code** _(optional)_                        | Native Dev Containers integration                               | [code.visualstudio.com](https://code.visualstudio.com)                                            |
| **Cursor** _(optional)_                         | Cursor's AI-aware fork of VS Code, also supports Dev Containers | [cursor.com](https://cursor.com)                                                                  |

### 2. Clone and enter the repo

```bash
git clone https://github.com/DailyBotHQ/search-text-highlight.git
cd search-text-highlight
```

### 3. Bring up the devcontainer

```bash
cd docker/local
docker compose up -d --build
docker compose ps        # Should show `searchtexthl` as Up
```

The first build pulls the Node 24.16.0 base image, installs Chromium, GitHub CLI, Claude Code, OpenAI Codex, and Cursor CLI — expect ~3-5 minutes on a warm network.

### 4. Get a shell

```bash
docker exec -it searchtexthl bash
```

You'll see the welcome banner from `docker/custom_commands.sh`:

```text
🚀 search-text-highlight — development container
✅ Running inside Docker container
```

### 5. Bootstrap

Inside the container:

```bash
install                  # → corepack pnpm install
test                     # → corepack pnpm run test (Vitest sanity check)
```

If `test` passes, your environment is ready.

### 6. Authenticate the AI CLIs (one-time, persistent)

```bash
claude                   # OAuth flow — paste the URL into a host browser
codex                    # OpenAI auth flow
agent --login            # Cursor auth flow
gh auth login            # GitHub CLI
```

Auth data lives in named volumes (`claude_data`, `codex_data`, `cursor_data`, `gh_data`) — surviving container rebuilds.

### 7. (Optional) VS Code Dev Containers

If you have VS Code installed:

```bash
mkdir -p .devcontainer
cp .devcontainer_example/devcontainer.json .devcontainer/devcontainer.json
```

Then **VS Code → Reopen in Container** opens the project inside the same container with the Biome, GitLens, and EditorConfig extensions pre-installed (Biome handles both linting and formatting; Vitest has its own VS Code extension if you want a Test Explorer). The `.devcontainer/` folder is gitignored — your overrides won't conflict with other contributors.

### 8. Verify

Inside the container:

```bash
node --version           # v24.16.0
corepack pnpm --version  # 11.1.2
git --version
gh --version
claude --version
codex --version
```

Then a final pre-flight:

```bash
corepack pnpm run biome:check
corepack pnpm run build:tsc
corepack pnpm run test
corepack pnpm run build
```

All four must pass. Move on to [Running Locally](RUNNING_LOCALLY.md).

---

## Path B — Native install

### 1. What you need to install

| Tool                      | Required version                                            | How to install                                |
| ------------------------- | ---------------------------------------------------------- | --------------------------------------------- |
| **Node.js**               | 24.16.0 (pinned in `.node-version` / `.nvmrc`; CI + devcontainer match) | [nodejs.org](https://nodejs.org) or via `nvm` |
| **pnpm**                  | 11.1.2 (pinned via `packageManager`, activated by Corepack) | `corepack enable` (Corepack ships with Node)  |
| **Git**                   | any recent version                                          | platform default                              |
| (optional) **GitHub CLI** | latest                                                      | [cli.github.com](https://cli.github.com)      |

`.node-version` and `.nvmrc` pin Node to `24.16.0`; `engines.node` in `package.json` only requires `>=22.0.0`, but CI and the devcontainer both run `24.16.0` — that's the canonical target. The package manager is pinned with `"packageManager": "pnpm@11.1.2"`, so Corepack downloads the exact pnpm version for you.

If you use `nvm`:

```bash
nvm install 24.16.0
nvm use 24.16.0
node --version           # v24.16.0
corepack enable          # activate the pinned pnpm
```

### 2. Clone and install

```bash
git clone https://github.com/DailyBotHQ/search-text-highlight.git
cd search-text-highlight
corepack enable                              # one-time, activates pnpm@11.1.2
corepack pnpm install --frozen-lockfile
```

`corepack pnpm install --frozen-lockfile` reads `pnpm-lock.yaml` and installs the exact versions every CI job uses. Don't substitute `npm` or `yarn` — the lockfile is pnpm-format. pnpm also enforces the supply-chain guard configured in `pnpm-workspace.yaml` (`minimumReleaseAge: 10080` — only versions published at least a week ago, and `allowBuilds: { esbuild: true }` for the one install script this toolchain needs). See [the rationale](https://xergioalex.com/blog/supply-chain-attacks-ai-era/).

### 3. Verify

```bash
corepack pnpm run biome:check
corepack pnpm run build:tsc
corepack pnpm run test
corepack pnpm run build
```

All four must pass. If any fail, see [Troubleshooting](TROUBLESHOOTING.md).

### 4. (Optional) Editor setup

The repo ships with editor configs:

- `.editorconfig` — 2-space indent, LF, UTF-8
- `biome.json` — Biome lint + format (single quotes, no semicolons, trailing commas `es5`)

Recommended VS Code extensions (mirrors the devcontainer's):

- `biomejs.biome`
- `EditorConfig.EditorConfig`
- `vitest.explorer` (if you use the Test Explorer UI)
- `eamodio.gitlens`

Set Biome as the default formatter and enable "Format on Save" so quotes / semicolons stay correct.

---

## Either path: configure git

```bash
git config user.name "Your Name"
git config user.email "you@example.com"
```

CI commits use the `🤖 DailyBot <ops@dailybot.com>` identity — don't override that for normal commits.

## Either path: AI assistant access

Even with a native install, you can use the AI CLIs:

```bash
# Claude Code
curl -fsSL https://claude.ai/install.sh | bash

# OpenAI Codex
npm install -g @openai/codex

# Cursor CLI
curl -fsSL https://cursor.com/install | bash
```

Or run the devcontainer just for AI tasks while keeping native Node for builds:

```bash
docker exec -it searchtexthl bash
claudex                  # Claude Code with skip-permissions
```

## Final sanity checklist

Run these and confirm each succeeds before moving on:

```bash
node --version                              # v24.16.0 (host and devcontainer)
corepack pnpm --version                     # 11.1.2
git --version
corepack pnpm run biome:check               # Lint + format (Biome)
corepack pnpm run build:tsc                 # Type-check
corepack pnpm run test                      # Vitest suite
corepack pnpm run build                     # Vite production bundle + tsc declarations
```

If everything passes, head to [Running Locally](RUNNING_LOCALLY.md). If something failed, the [troubleshooting guide](TROUBLESHOOTING.md) covers every issue we've hit during setup.
