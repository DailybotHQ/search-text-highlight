# `docs/` — Documentation Index

> Comprehensive guides for `search-text-highlight`. This directory complements [`AGENTS.md`](../AGENTS.md) at the repo root; `AGENTS.md` is the entry point for AI agents and contributors, and the documents below go deep on specific topics.

## Product

| Document                             | Purpose                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------- |
| [PRODUCT_SPEC.md](PRODUCT_SPEC.md)   | The non-technical "why" — who the library is for, the contract, non-goals, success criteria |
| [API_REFERENCE.md](API_REFERENCE.md) | Full public surface: `highlight`, `OptionsType`, defaults, examples                         |

## Engineering

| Document                                           | Purpose                                                      |
| -------------------------------------------------- | ------------------------------------------------------------ |
| [ARCHITECTURE.md](ARCHITECTURE.md)                 | Module layout, public API surface, TypeScript build pipeline |
| [TECHNOLOGIES.md](TECHNOLOGIES.md)                 | Stack overview with versions and roles                       |
| [STANDARDS.md](STANDARDS.md)                       | TypeScript conventions, naming, ESLint/Prettier rules        |
| [DEVELOPMENT_COMMANDS.md](DEVELOPMENT_COMMANDS.md) | Every npm script and what it does                            |
| [TESTING_GUIDE.md](TESTING_GUIDE.md)               | Mocha + Chai conventions, single test runs                   |
| [PERFORMANCE.md](PERFORMANCE.md)                   | Regex hot path, bundle size, Unicode safety                  |
| [SECURITY.md](SECURITY.md)                         | Input validation, regex injection / ReDoS, npm supply chain  |

## Build, Deploy, CI

| Document                           | Purpose                                                           |
| ---------------------------------- | ----------------------------------------------------------------- |
| [BUILD_DEPLOY.md](BUILD_DEPLOY.md) | Webpack production build, npm publish, GitHub release             |
| [CI_CD.md](CI_CD.md)               | GitHub Actions workflows: PR checks, release, dependency upgrades |
| [DEVCONTAINER.md](DEVCONTAINER.md) | Docker-based dev environment with bundled AI CLIs                 |

## AI Agents

| Document                                         | Purpose                                                   |
| ------------------------------------------------ | --------------------------------------------------------- |
| [AI_AGENT_ONBOARDING.md](AI_AGENT_ONBOARDING.md) | First steps for any agent landing on this repo            |
| [AI_AGENT_COLLAB.md](AI_AGENT_COLLAB.md)         | How multiple agents coordinate — handoffs and conventions |
| [DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md) | When and how to update docs                               |

## Forking

| Document                                       | Purpose                                     |
| ---------------------------------------------- | ------------------------------------------- |
| [FORK_CUSTOMIZATION.md](FORK_CUSTOMIZATION.md) | Step-by-step rebrand into a new npm package |

## Getting Started

The [`getting-started/`](getting-started/) subdirectory walks new contributors through environment setup, running the library locally, and troubleshooting common issues.

## Conventions for editing this folder

- All content in **English** — see [STANDARDS.md](STANDARDS.md).
- Update [`AGENTS.md`](../AGENTS.md) when you add a new top-level document so the AI-agent index stays in sync.
- Documents are flat Markdown — no MDX, no special preprocessors. They render correctly on GitHub and in `npm view`.
- Prefer linking to other docs in this folder rather than duplicating content.
- See [DOCUMENTATION_GUIDE.md](DOCUMENTATION_GUIDE.md) for the full update checklist.
