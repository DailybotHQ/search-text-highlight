---
name: fork-rebrand
description: Walk a fresh fork through name, npm scope, repo URL, license, and AI agent docs
type: skill
---

# Skill: `/fork-rebrand`

Rename a fresh fork of this repo to a new npm package. Mechanical — every step is a search-and-replace or a setting toggle.

## When to use

- Right after `git clone` of a fork
- The user says "rebrand", "make this my package", "change the name"
- The user wants to reuse this scaffolding for a different text utility

The full reference is [`docs/FORK_CUSTOMIZATION.md`](../../docs/FORK_CUSTOMIZATION.md). This skill is the actionable summary.

## Inputs to confirm

- **New package name** (e.g., `@acme/text-marker`, `acme-highlighter`)
- **Display name** (used in README, banner) — e.g., "Acme Text Marker"
- **New public API object name** — e.g., `acmeMarker` (or keep `searchTextHL`)
- **GitHub org / repo** — e.g., `acme/text-marker`
- **License choice** — MIT (default), Apache-2.0, proprietary
- **Whether to keep DailyBot integration** — usually no for a non-DailyBot fork

## Procedure

### 1. Verify the working tree is clean

```bash
git status                # Should be clean
```

If not, commit or stash before starting.

### 2. Update `package.json`

Edit fields:

```json
{
  "name": "<new-package-name>",
  "description": "<one-sentence description>",
  "keywords": ["<your>", "<keywords>"],
  "repository": { "type": "git", "url": "git+https://github.com/<org>/<repo>.git" },
  "author": "<Your Team> <eng@example.com> (https://example.com)",
  "license": "MIT",
  "bugs": { "url": "https://github.com/<org>/<repo>/issues" },
  "homepage": "https://github.com/<org>/<repo>#readme"
}
```

Keep:

- `main: "dist/index.js"`, `types: "dist/index.d.ts"`, `engines: { "node": "24.15.0" }` — load-bearing
- `scripts: { ... }` — change only the `release` template if you want a different commit message

### 3. (If renaming the public object) Rename `searchTextHL`

```bash
grep -rln 'searchTextHL' src test docs README.md AGENTS.md .agents
```

Open each file and rename to your new identifier. If you keep `searchTextHL`, skip this step. (Recommended for a fork that's still doing text highlighting; rename only if the package's purpose materially diverges.)

After renaming:

```bash
npm run eslint:fix && npm run prettier:fix
npm run build:tsc && npm run test && npm run build
```

### 4. Replace repo URL references

```bash
grep -rln 'DailyBotHQ/search-text-highlight\|search-text-highlight\|DailyBot' . \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git
```

Update:

- README badges (license, stars, downloads from npm)
- DailyBot bot identity in workflows (`git config user.name "🤖 DailyBot"`)
- `.github/workflows/release_and_publish.yml` — bot email and notification messages

### 5. Rebrand the docker setup

Files:

- `docker/local/docker-compose.yaml`
  - `name: searchtexthllocal` → `<newname>local`
  - `services.searchtexthlvscode` → `<newname>vscode`
  - `container_name: searchtexthl` → `<newname>`
  - Build context dockerfile path: `./searchtexthl/Dockerfile` → `./<newname>/Dockerfile`
- Rename the `docker/local/searchTextHL/` directory to `docker/local/<newname>/`
- `docker/local/<newname>/Dockerfile` — update `LABEL maintainer`
- `docker/custom_commands.sh` — update the welcome banner string in `show_welcome`
- `.devcontainer_example/devcontainer.json` — update `name` and `service`

### 6. Update agent docs

Search for project-specific names:

```bash
grep -rln 'search-text-highlight\|searchTextHL\|DailyBot\|searchtexthl' AGENTS.md docs .agents
```

Replace per the table at the top of [`docs/FORK_CUSTOMIZATION.md`](../../docs/FORK_CUSTOMIZATION.md).

The structure of every doc stays the same — only the names and example values change.

### 7. Replace `LICENSE`

If you're keeping MIT, edit the copyright line:

```
Copyright (c) <year> <Your Team>
```

If switching license, replace the file:

- Apache-2.0: download from [apache.org](https://www.apache.org/licenses/LICENSE-2.0.txt)
- MIT (different holder): same file, different name
- Proprietary: delete `LICENSE`, set `package.json` `license` to `"UNLICENSED"`, add notice to README

### 8. Rewrite `README.md`

The README is the public face. Update:

- Title: match the new display name
- Tagline: one sentence
- Badges: shields.io URLs for license, stars, downloads
- Install: `npm install <new-name>`
- Usage: every code example uses the new package and (if changed) public API name
- Options table: copy from `docs/API_REFERENCE.md` (treat that as canonical)
- "Powered by" — your team or remove

After editing:

```bash
npm run prettier:fix
```

### 9. Configure GitHub repository

In the GitHub UI:

- **Settings → General → Repository name** — match the new name
- **Settings → Branches → Branch protection rules** — protect `main` (require `Code Check` + `Pull Request Content Check`)
- **Settings → Secrets and variables → Actions** — set:
  - `AUTOMATION_GITHUB_TOKEN` (PAT with `repo` scope)
  - `NPM_TOKEN` (granular npm token, publish scope)
  - `DAILYBOT_API_KEY` (only if keeping DailyBot integration)
- **Settings → Variables → Actions** — set:
  - `DAILYBOT_DEPLOYMENT_NOTIFICATION_CHANNEL`
  - `USERS_TO_NOTIFY`

If removing DailyBot, edit the workflows:

- Delete the `notify_on_channel_start` and `notify_on_channel_end` jobs in `release_and_publish.yml`
- Delete the corresponding workflow steps in `pull_request_check.yml`
- Replace with Slack webhook / Discord / your provider, or leave silent

### 10. Verify `.npmignore`

```bash
npm pack --dry-run
```

Should list only:

- `package/package.json`
- `package/README.md`
- `package/LICENSE`
- `package/dist/index.js`
- `package/dist/index.d.ts`

If anything else appears, update `.npmignore`.

### 11. Run the full check chain

```bash
npm install
npm run eslint:check
npm run prettier:check
npm run build:tsc
npm run test
npm run build
npm pack --dry-run
```

All six must pass.

### 12. First commit

```bash
git status     # Verify only intentional changes
git add .
git commit -m "feat: rebrand starter to <new package name>"
```

Push:

```bash
git remote remove origin
git remote add origin git@github.com:<org>/<repo>.git
git push -u origin main
```

### 13. Verify CI works

```bash
gh run list --workflow=code_check.yml --limit 3
```

Should show a green run on `main` (or on the first PR you open).

### 14. First publish (manual, one-time)

CI publishes patches automatically on merge — but the **first** publish is manual:

```bash
npm pack --dry-run                 # Final sanity
npm publish --access public        # --access public required for scoped names
```

After this, every merge to `main` auto-publishes via the workflow.

### 15. Document the migration in `tmp/handoff.md`

Optional but useful. Note any quirks, secrets you set, decisions you made, so the next contributor doesn't re-discover them.

## Don't

- Skip the GitHub branch protection — without it, anyone can push directly to `main` and trigger a release
- Keep the DailyBot secrets if you removed the workflow steps — they'll be unused but visible
- Forget to update `.devcontainer_example/devcontainer.json` — VS Code Dev Containers will fail to start
- Auto-merge the rebrand PR — review every change manually first
- Leave `searchTextHL` in `AGENTS.md` if you renamed the API object — agents will be confused

## Do

- Verify the npm name is available before committing: `npm view <name>` (404 = available)
- Pick a license deliberately — switching later is awkward
- Use a granular npm token (publish scope, single package) instead of a global token
- Enable 2FA on the npm account that owns the package: `npm profile enable-2fa auth-and-writes`
- Update `AGENTS.md` "Project Overview" with the new product description

## Verification checklist

- [ ] `package.json` name, repository, bugs, homepage, author updated
- [ ] (If renamed) Public API object renamed everywhere
- [ ] All references to old repo URL replaced
- [ ] Docker compose, Dockerfile, custom_commands.sh, devcontainer reference the new name
- [ ] GitHub Actions: bot identity, secrets, variables configured (or DailyBot removed)
- [ ] README rewritten with new product name
- [ ] License chosen and copyright updated
- [ ] `npm pack --dry-run` shows only the publishable files
- [ ] All six sanity-check commands pass
- [ ] Branch protection set on `main`
- [ ] First manual `npm publish --access public` succeeded
- [ ] `feat: rebrand ...` commit pushed
