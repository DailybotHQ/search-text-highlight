# Environment Setup

A step-by-step guide for setting up a development environment for `search-text-highlight`, starting from zero. Two paths are documented:

- **Path A (recommended): the bundled Docker devcontainer.** Reproducible across macOS / Linux / Windows, ships the AI CLIs pre-installed
- **Path B: native install.** Faster startup; requires Node + npm on your host

By the end of this guide you will be able to run the test suite, build the production bundle, and publish locally with `npm pack`.

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

The first build pulls the Node 24 base image, installs Chromium, GitHub CLI, Claude Code, OpenAI Codex, and Cursor CLI — expect ~3-5 minutes on a warm network.

### 4. Get a shell

```bash
docker exec -it searchtexthl bash
```

You'll see the welcome banner from `docker/custom_commands.sh`:

```
🚀 Search Text Highlight Development Container
✅ Running inside Docker container
```

### 5. Bootstrap

Inside the container:

```bash
install                  # → npm install
test                     # → npm run test (sanity check)
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

Then **VS Code → Reopen in Container** opens the project inside the same container with Mocha, ESLint, Prettier, GitLens, and EditorConfig extensions pre-installed. The `.devcontainer/` folder is gitignored — your overrides won't conflict with other contributors.

### 8. Verify

Inside the container:

```bash
node --version           # v24.x.x
npm --version            # 10.x.x
git --version
gh --version
claude --version
codex --version
```

Then a final pre-flight:

```bash
npm run eslint:check
npm run prettier:check
npm run build:tsc
npm run test
npm run build
```

All five must pass. Move on to [Running Locally](RUNNING_LOCALLY.md).

---

## Path B — Native install

### 1. What you need to install

| Tool                      | Required version                                  | How to install                                |
| ------------------------- | ------------------------------------------------- | --------------------------------------------- |
| **Node.js**               | 24.15.0 (matches `engines`, CI, and devcontainer) | [nodejs.org](https://nodejs.org) or via `nvm` |
| **npm**                   | 10.x+ (ships with Node 24)                        | bundled with Node                             |
| **Git**                   | any recent version                                | platform default                              |
| (optional) **GitHub CLI** | latest                                            | [cli.github.com](https://cli.github.com)      |

`engines` in `package.json` pins Node to `24.15.0`. CI and the devcontainer use the same version — that's the canonical target.

If you use `nvm`:

```bash
nvm install 24.15.0
nvm use 24.15.0
node --version           # v24.15.0
```

### 2. Clone and install

```bash
git clone https://github.com/DailyBotHQ/search-text-highlight.git
cd search-text-highlight
npm install
```

`npm install` reads `package-lock.json` and installs the exact versions every CI job uses. Don't substitute `yarn` or `pnpm` — the lockfile is npm-format.

### 3. Verify

```bash
npm run eslint:check
npm run prettier:check
npm run build:tsc
npm run test
npm run build
```

All five must pass. If any fail, see [Troubleshooting](TROUBLESHOOTING.md).

### 4. (Optional) Editor setup

The repo ships with editor configs:

- `.editorconfig` — 2-space indent, LF, UTF-8
- `.prettierrc` — single quotes, no semicolons, trailing commas `es5`
- `eslint.config.mjs` — ESLint flat config + Prettier integration

Recommended VS Code extensions (mirrors the devcontainer's):

- `dbaeumer.vscode-eslint`
- `esbenp.prettier-vscode`
- `EditorConfig.EditorConfig`
- `compulim.vscode-mocha` + `hbenl.vscode-mocha-test-adapter` (if you use the Test Explorer UI)
- `eamodio.gitlens`

Set Prettier as the default formatter and enable "Format on Save" so quotes / semicolons stay correct.

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
node --version                              # 20.x or 24.x (host vs devcontainer)
npm --version                               # 10.x
git --version
npm run eslint:check                        # Lint
npm run prettier:check                      # Format
npm run build:tsc                           # Type-check
npm run test                                # Mocha suite
npm run build                               # Webpack production bundle
```

If everything passes, head to [Running Locally](RUNNING_LOCALLY.md). If something failed, the [troubleshooting guide](TROUBLESHOOTING.md) covers every issue we've hit during setup.
