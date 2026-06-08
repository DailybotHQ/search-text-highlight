# Fork Customization

Step-by-step rebrand of `search-text-highlight` into a new npm package. This is the first thing you should do after cloning if you intend to publish under a different name. Every step is mechanical — none of it requires creative judgment.

The placeholders to replace, in summary:

| Placeholder                   | Currently                                       | Examples of new value                    |
| ----------------------------- | ----------------------------------------------- | ---------------------------------------- |
| Package name (`name`)         | `search-text-highlight`                         | `@acme/text-marker`, `acme-highlighter`  |
| Display name (README)         | "Search Text Highlight"                         | "Acme Text Marker"                       |
| Public API object             | `searchTextHL`                                  | `acmeMarker`                             |
| GitHub repo URL               | `DailyBotHQ/search-text-highlight`              | `acme/text-marker`                       |
| Docker container name         | `searchtexthl`                                  | `text-marker`                            |
| Docker compose project        | `searchtexthllocal`                             | `textmarkerlocal`                        |
| Docker service name           | `searchtexthlvscode`                            | `textmarkervscode`                       |
| Welcome banner title          | "search-text-highlight — development container" | "acme-text-marker — development container" |
| DailyBot notification channel | `vars.DAILYBOT_DEPLOYMENT_NOTIFICATION_CHANNEL` | Set or remove (see Step 12)              |
| Author / maintainer           | `DailyBot <support@dailybot.com>`               | Your team                                |

## Step 1 — Package metadata

Edit `package.json`:

```json
{
  "name": "@acme/text-marker",
  "description": "Find a substring in text and wrap it in HTML for styling",
  "keywords": ["text", "highlight", "markdown", "..."],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/acme/text-marker.git"
  },
  "author": "Your Team <eng@acme.com> (https://acme.com)",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/acme/text-marker/issues"
  },
  "homepage": "https://github.com/acme/text-marker#readme"
}
```

Once you publish under a scoped name (`@acme/...`), you cannot un-publish without losing the scope reservation. Pick carefully.

## Step 2 — Public API object name

The exported object is `searchTextHL`. To rename it (`acmeMarker`, `highlight`, etc.):

```bash
grep -rln 'searchTextHL' src test docs README.md AGENTS.md .agents
```

Rename in:

- `src/index.ts` (the `const`)
- `test/main.test.ts` (the import)
- `README.md` (every example)
- `docs/API_REFERENCE.md`, `docs/ARCHITECTURE.md`, `docs/AI_AGENT_ONBOARDING.md`
- `AGENTS.md` (Public API surface, Common Mistakes)
- Skills under `.agents/skills/` that reference the API name

After the rename, run the full check chain:

```bash
corepack pnpm run biome:fix && corepack pnpm run build:tsc && corepack pnpm run test && corepack pnpm run build
```

> **Warning:** if your package has existing users, renaming the public object is a breaking change. Consider keeping `searchTextHL` as an alias for one major version, then dropping it.

## Step 3 — Repository URL references

```bash
grep -rln 'DailyBotHQ/search-text-highlight\|search-text-highlight\|DailyBot' .
```

Update:

- README badges (license, stars, downloads)
- `package.json`'s `repository`, `bugs`, `homepage` fields
- GitHub release notification URLs
- DailyBot notification messages in workflows
- `.github/workflows/release_and_publish.yml` — the user.name and user.email for the bot account

## Step 4 — Docker / devcontainer rebrand

Files to edit:

- `docker/local/docker-compose.yaml` — `name: searchtexthllocal`, `services.searchtexthlvscode`, `container_name: searchtexthl`, build context dockerfile path
- `docker/local/searchTextHL/Dockerfile` — `LABEL maintainer`, optional comments
- `docker/local/searchTextHL/.env.example` — environment names if any
- `docker/local/searchTextHL/entrypoint.sh` — anything containing the old name
- `docker/custom_commands.sh` — `show_welcome` banner, comments, helper script names if customized
- Rename the `searchTextHL/` directory itself to your new name

Compose verification:

```bash
cd docker/local && docker compose config        # Print resolved config
docker compose up -d --build                    # Rebuild from scratch
docker exec -it <new-container-name> bash       # Sanity check
```

## Step 5 — `.devcontainer_example`

Edit `.devcontainer_example/devcontainer.json` to:

- Change `name`
- Update `service` to your renamed Compose service
- Verify the relative `dockerComposeFile` path

If you copied it to `.devcontainer/devcontainer.json` for VS Code, redo that copy.

## Step 6 — pnpm scripts and package manager

Most scripts in `package.json` are generic. The fork-specific touch points:

- `"packageManager": "pnpm@11.1.2"` — keep this (Corepack reads it to install the exact pnpm). Bump it only when you deliberately upgrade pnpm.
- `release` — runs `bash .github/scripts/prepare_release.sh`. The commit message template lives in that script (`"[🤖 DailyBot] New release to v%s launched 🚀"`). Either keep the bot name or change it to your team's, e.g. `"[🤖 Acme Bot] New release to v%s launched 🚀"`.

The release notification workflows depend on the commit format matching what `.github/scripts/get_github_release_log.sh` expects. If you change the template, scan both release scripts for hardcoded patterns.

The build/test/lint scripts (`vite build`, `tsc -p tsconfig.build.json`, `vitest`, `biome check`) are generic — they don't mention the project name and need no rebrand.

## Step 7 — GitHub Actions

For each workflow in `.github/workflows/`:

1. Update any hardcoded reference to the old repo name (e.g., notification messages, slack channels)
2. Update the bot identity (`git config user.name` / `user.email` blocks)
3. Decide whether to keep the DailyBot integration:
   - **Keep:** set `DAILYBOT_API_KEY` secret + `DAILYBOT_DEPLOYMENT_NOTIFICATION_CHANNEL` var
   - **Replace with Slack/Discord/etc.:** edit `notify_on_channel_start` and `notify_on_channel_end` to call your provider's webhook
   - **Remove:** delete those steps; the build pipeline is independent of notifications

### Required secrets for any fork

| Secret                    | Purpose                                      | How to get                                                   |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------ |
| `AUTOMATION_GITHUB_TOKEN` | git push, branch delete, repository_dispatch | Personal Access Token with `repo` scope                      |
| `NPM_TOKEN`               | `npm publish`                                | npm → Access Tokens → "Publish" type, scoped to your package |

### Required variables

| Variable                                   | Purpose                           | Example             |
| ------------------------------------------ | --------------------------------- | ------------------- |
| `DAILYBOT_DEPLOYMENT_NOTIFICATION_CHANNEL` | Channel ID for start/end messages | `C0123`             |
| `USERS_TO_NOTIFY`                          | Mention string on deploy failure  | `@oncall @acme/eng` |

If you remove DailyBot, delete both variables and the workflow steps that reference them.

## Step 8 — README

The README is the public face of the package. Rewrite:

- **Title** — match the new package name
- **Tagline** — one sentence describing what it does
- **Badges** — update `shields.io` URLs (`license`, `stars`, `downloads`) to your repo + npm name
- **Install** — `npm install <new-name>`
- **Usage** — every code example uses the new public API name
- **Options table** — copy from `docs/API_REFERENCE.md` (treat that as the master)
- **Powered by** — your branding or remove the section

Run `corepack pnpm run biome:fix` after editing.

## Step 9 — License

The repo ships under MIT (`LICENSE`). Decide:

- **Keep MIT** — change the copyright holder name and year in `LICENSE`
- **Switch to another OSS license** — replace the file; update `package.json`'s `license` field
- **Proprietary** — delete `LICENSE`, set `package.json` `license` to `"UNLICENSED"`, add a notice in the README

The Docker base image (`node:24.16.0-trixie-slim`) and dev-time AI CLIs (Claude / Codex / Cursor) carry their own licenses unaffected by this choice.

## Step 10 — `AGENTS.md` and docs

Search for project-specific identifiers:

```bash
grep -rln 'search-text-highlight\|searchTextHL\|DailyBot\|searchtexthl' AGENTS.md docs .agents
```

Replace per the table at the top of this guide. The structure of every doc stays the same; only the name and example values change.

## Step 11 — `.npmignore` and tarball

Verify only the right files publish:

```bash
corepack pnpm pack --dry-run
```

Expected:

- `package/package.json`
- `package/README.md`
- `package/LICENSE`
- `package/dist/index.js`
- `package/dist/index.d.ts` (plus `package/dist/lib/*.d.ts`)

Anything else (test files, source TS, docs, `.github/`, `docker/`) means you need a `.npmignore` entry or a tighter `files` field in `package.json`.

## Step 12 — npm scope and 2FA

If you're publishing under a scope (`@acme/...`):

```bash
npm login --scope=@acme
```

Enable 2FA on the npm account:

```bash
npm profile enable-2fa auth-and-writes
```

Generate a publish token (npm → Access Tokens → "Granular Access Token", scoped to the new package, type "Publish"), and store it as the `NPM_TOKEN` GitHub secret.

## Step 13 — Branch protection

In GitHub repository **Settings → Branches → Branch protection rules**, protect `main`:

- ✅ Require a pull request before merging
- ✅ Require status checks: `Code Check`, `Pull Request Content Check`
- ✅ Require branches to be up to date before merging
- ❌ Don't require signed commits unless you have CI signing set up — the release workflow's commits would fail

## Step 14 — `.ncurc.json` and the supply-chain guard

`.ncurc.json` currently just enables upgrades (`{ "upgrade": true }`) — there are no package rejects left now that the toolchain moved to Vite, Vitest, and Biome. For a fresh fork you generally don't need to change it.

The real safety net lives in `pnpm-workspace.yaml`:

- `minimumReleaseAge: 10080` — only install package versions published at least a week ago (protects against compromised packages that get yanked or patched within days)
- `allowBuilds: { esbuild: true }` — the curated allow-list of dependency install scripts pnpm is permitted to run

Keep both unless you have a specific reason to relax them, and document any change. See the [supply-chain rationale](https://xergioalex.com/blog/supply-chain-attacks-ai-era/).

## Step 15 — Sanity check

```bash
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm run biome:check
corepack pnpm run build:tsc
corepack pnpm run test
corepack pnpm run build
corepack pnpm pack --dry-run
```

All check commands must succeed. The dry-run should list only the publishable files.

## Step 16 — First commit

```bash
git status     # Verify only intentional changes
git add .
git commit -m "feat: rebrand starter to <new package name>"
```

Then push and verify the GitHub Actions are wired correctly:

```bash
git push -u origin main
gh run list --workflow=code_check.yml      # Should show a run on main (or the PR)
```

## Step 17 — Initial publish

The first publish has to be manual (CI publishes patches on merge to `main`, but it doesn't initialize the package). One time only:

```bash
corepack pnpm pack --dry-run    # Verify
corepack pnpm publish --access public
```

After this, the release workflow takes over for every merge.

## Checklist

- [ ] `package.json`: name, description, repository, bugs, homepage, author updated
- [ ] Public API object renamed everywhere it appears
- [ ] All references to the old repo URL replaced
- [ ] Docker compose, Dockerfile, custom_commands.sh, devcontainer reference the new name
- [ ] GitHub Actions: bot identity, notification channels, secrets configured
- [ ] README rewritten with the new product name and install command
- [ ] License chosen (MIT default, copyright holder updated)
- [ ] `corepack pnpm pack --dry-run` shows only the publishable files
- [ ] All sanity-check commands pass
- [ ] Branch protection set on `main`
- [ ] `NPM_TOKEN`, `AUTOMATION_GITHUB_TOKEN` secrets configured
- [ ] First manual `corepack pnpm publish --access public` succeeded
- [ ] Subsequent merges auto-publish via the release workflow

## When something goes wrong

- **`npm publish` fails with `403 Forbidden`** — your npm account doesn't have access to the scope (`@acme`). Run `npm whoami` and verify; create the org on npm if it doesn't exist
- **CI's npm publish step fails** — the `NPM_TOKEN` secret is missing or expired. Rotate the token
- **GitHub Action can't push tags** — `AUTOMATION_GITHUB_TOKEN` doesn't have `repo` scope. Generate a new PAT
- **`Code Check` is red on the rebrand commit** — Biome rewrote some quotes/formatting; run `corepack pnpm run biome:fix` and re-commit
- **The DailyBot notification step fails with `401`** — your fork hasn't set `DAILYBOT_API_KEY`. Either set it or remove the notification steps

## After you're done

Once the rebrand is solid, audit the docs:

- Remove sections in `docs/` referencing tooling you don't use
- Re-check `pnpm-workspace.yaml`'s `allowBuilds` allow-list against your dependency set
- Refresh `docs/TECHNOLOGIES.md` to reflect any deps you swapped
- Update `AGENTS.md` "Project Overview" with the new product description
