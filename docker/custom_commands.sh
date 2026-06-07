#!/bin/bash

function print.success {
	GREEN="\033[0;32m"
	RESET="\033[0m"
	echo -ene "${GREEN}$1${RESET}\n"
}

function print.error {
	RED="\033[0;31m"
	RESET="\033[0m"
	echo -ene "${RED}$1${RESET}\n"
}

# Read-only lint + format (matches CI validate step)
function check() {
	print.success "Running Biome check (lint + format)..."
	corepack pnpm run biome:check || {
		print.error "⚠️ Biome check failed"
		return 1
	}
	print.success "✅ check passed"
}

# Auto-fix lint + format
function fix() {
	print.success "Running Biome check --write (lint + format, apply fixes)..."
	corepack pnpm run biome:fix || {
		print.error "⚠️ Biome fix failed"
		return 1
	}
	print.success "✅ fix completed"
}

function typecheck() {
	print.success "Running TypeScript type-check (tsc --noEmit)..."
	corepack pnpm run build:tsc || {
		print.error "⚠️ TypeScript type-check failed"
		return 1
	}
	print.success "✅ typecheck passed"
}

function test() {
	print.success "Running tests (Vitest)..."
	corepack pnpm run test || {
		print.error "⚠️ Tests failed"
		return 1
	}
}

function build() {
	print.success "Running Vite production bundle (+ tsc declarations)..."
	corepack pnpm run build || {
		print.error "⚠️ Vite build failed"
		return 1
	}
	print.success "✅ build passed"
}

# Same gates as CI plus build:tsc + Vite build (pre-merge / pre-publish).
# Order: lint/format → build → test. Build runs before test so the bundle suite in
# test/exports.test.ts validates an up-to-date dist/index.js (otherwise it self-skips).
function codecheck() {
	print.success "Running full code check (biome → build:tsc → vite build → test)..."
	corepack pnpm run biome:check || {
		print.error "⚠️ Biome failed"
		return 1
	}
	corepack pnpm run build:tsc || {
		print.error "⚠️ TypeScript type-check failed"
		return 1
	}
	corepack pnpm run build || {
		print.error "⚠️ Vite build failed"
		return 1
	}
	corepack pnpm run test || {
		print.error "⚠️ Tests failed"
		return 1
	}
	print.success "✅ codecheck passed"
}

function install() {
	print.success "Running pnpm install..."
	corepack pnpm install
}

# ================================
# Codex CLI with full permissions (bypass approvals and sandbox)
# ================================
# Usage:
#   codexx              - Start new session
#   codexx -l|--last    - Resume last session
#   codexx -r|--resume  - Interactive session selection
#   codexx -r <id>      - Resume specific session by ID
function codexx() {
	case "${1:-}" in
		-l | --last)
			print.success "Resuming last Codex session..."
			shift
			codex resume --last --dangerously-bypass-approvals-and-sandbox "$@"
			;;
		-r | --resume)
			shift
			if [[ -n "${1:-}" && "${1:0:1}" != "-" ]]; then
				local session_id="$1"
				shift
				print.success "Resuming Codex session: $session_id..."
				codex resume "$session_id" --dangerously-bypass-approvals-and-sandbox "$@"
			else
				print.success "Selecting Codex session to resume..."
				codex resume --all --dangerously-bypass-approvals-and-sandbox "$@"
			fi
			;;
		*)
			print.success "Starting new Codex session with full permissions..."
			codex --dangerously-bypass-approvals-and-sandbox "$@"
			;;
	esac
}

# ================================
# Claude Code with full permissions (skip all permission prompts)
# ================================
# Usage:
#   claudex                - Start new session
#   claudex -c|--continue  - Continue most recent session
#   claudex -r|--resume    - Interactive session selection
#   claudex -r <id>        - Resume specific session by ID
function claudex() {
	case "${1:-}" in
		-c | --continue)
			print.success "Continuing most recent Claude Code session..."
			shift
			claude --continue --dangerously-skip-permissions "$@"
			;;
		-r | --resume)
			shift
			if [[ -n "${1:-}" && "${1:0:1}" != "-" ]]; then
				local session_id="$1"
				shift
				print.success "Resuming Claude Code session: $session_id..."
				claude --resume "$session_id" --dangerously-skip-permissions "$@"
			else
				print.success "Selecting Claude Code session to resume..."
				claude --resume --dangerously-skip-permissions "$@"
			fi
			;;
		*)
			print.success "Starting new Claude Code session with full permissions..."
			claude --dangerously-skip-permissions "$@"
			;;
	esac
}

# ================================
# Cursor CLI agent (interactive mode with full permissions)
# ================================
# Usage:
#   cursorx              - Start new session
#   cursorx -l|--list    - List available sessions
#   cursorx -r|--resume  - Resume last session
#   cursorx -r <id>      - Resume specific session by ID
function cursorx() {
	case "${1:-}" in
		-l | --list)
			print.success "Listing Cursor CLI sessions..."
			shift
			agent ls "$@"
			;;
		-r | --resume)
			shift
			if [[ -n "${1:-}" && "${1:0:1}" != "-" ]]; then
				local session_id="$1"
				shift
				print.success "Resuming Cursor CLI session: $session_id..."
				agent --resume="$session_id" --force "$@"
			else
				print.success "Resuming last Cursor CLI session..."
				agent resume --force "$@"
			fi
			;;
		*)
			print.success "Starting new Cursor CLI session with full permissions..."
			agent --force "$@"
			;;
	esac
}

function check_devcontainer() {
	if [[ -f /.dockerenv ]] || [[ -n "${REMOTE_CONTAINERS:-}" ]] || [[ -n "${CODESPACES:-}" ]]; then
		print.success "✅ Running inside Docker container"
		echo ""
		echo "search-text-highlight development commands:"
		echo "  • check, fix, typecheck, test, build, codecheck, install"
		return 0
	else
		print.error "❌ NOT running inside Docker container"
		echo ""
		echo "⚠️  These helpers are meant to run inside the devcontainer."
		echo ""
		echo "   1. From the repo: cd docker/local && docker compose up -d"
		echo "   2. Open a shell: docker exec -it searchtexthl bash"
		echo "   3. Or attach with VS Code / Cursor Dev Containers"
		return 1
	fi
}

# ================================
# Git-aware Bash Prompt
# ================================

function git_branch() {
	local branch
	if branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null); then
		if [[ "$branch" == "HEAD" ]]; then
			branch='detached*'
		fi
		echo "$branch"
	fi
}

function set_bash_prompt() {
	local yellow="\[\033[0;33m\]"
	local red="\[\033[0;31m\]"
	local green="\[\033[0;32m\]"
	local white="\[\033[0;37m\]"
	local reset="\[\033[0m\]"

	local git_info=""
	if git rev-parse --git-dir >/dev/null 2>&1; then
		local branch
		branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
		if [[ "$branch" == "HEAD" ]]; then
			branch='detached*'
		fi
		if [[ -n $(git status --porcelain 2>/dev/null) ]]; then
			git_info=" ${red}(${branch}*)${reset}"
		else
			git_info=" ${green}(${branch})${reset}"
		fi
	fi

	PS1="${yellow}\w${reset}${git_info}${white} \$ ${reset}"
}

PROMPT_COMMAND=set_bash_prompt

alias gs='git status'
alias ga='git add .'
alias gc='git commit -am'
alias gp='git push -u origin HEAD'
alias gl='git log --oneline --graph --decorate --all -20'
alias gd='git diff'
alias gb='git for-each-ref --sort=-committerdate refs/heads/ --format="%(HEAD) %(color:yellow)%(refname:short)%(color:reset) - %(color:green)%(committerdate:relative)%(color:reset) - %(color:blue)%(authorname)%(color:reset)"'
alias gbd='git branch -D'
alias gco='git checkout'
alias gcob='git checkout -b'
alias gpl='git pull origin HEAD'
alias grc='git rm -r --cached .'
alias help='show_welcome'

function show_welcome() {
	echo ""
	print.success "🚀 search-text-highlight — development container"
	echo ""

	check_devcontainer
	echo ""

	echo "Project commands:"
	echo "  • install     - corepack pnpm install"
	echo "  • check       - corepack pnpm run biome:check (lint + format, CI gate)"
	echo "  • fix         - corepack pnpm run biome:fix (lint + format, apply fixes)"
	echo "  • typecheck   - corepack pnpm run build:tsc (tsc --noEmit)"
	echo "  • test        - corepack pnpm run test (Vitest)"
	echo "  • build       - corepack pnpm run build (Vite production + tsc declarations)"
	echo "  • codecheck   - full local gate: biome → build:tsc → vite build → test"
	echo ""
	echo "AI assistants:"
	echo "  • claude / claudex   - Claude Code (claudex skips permission prompts)"
	echo "  • codex / codexx     - OpenAI Codex (codexx bypasses approvals/sandbox)"
	echo "  • agent / cursorx    - Cursor agent (cursorx uses --force)"
	echo ""
	echo "Git shortcuts: gs ga gc gp gpl gl gd gb gbd gco gcob grc"
	echo ""
}

if [[ $- == *i* ]]; then
	show_welcome
fi
