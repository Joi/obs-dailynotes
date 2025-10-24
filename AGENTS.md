# Repository Guidelines

> **Note:** This project now includes **amplifier tools** for AI-powered development.
> See `amplifier-tools/README.md` for AI-assisted workflows and `Makefile` for commands.

## Project Structure & Module Organization
Start with `README.md` for the product story, then dive into `docs/ARCHITECTURE.md` for data-flow diagrams and `docs/SCRIPTS.md` for script-specific notes. Runtime glue lives in `index.js`, reusable services under `lib/`, and automation scripts under `tools/`. Configuration samples are in `config.example.json`; copy them to `config/` and `.env` as described in `docs/CONFIG.md`. Asset- and test-specific layouts are detailed in `docs/USAGE.md` and `docs/TESTING.md` respectively.

## Build, Test, and Development Commands
`docs/USAGE.md` holds the canonical command matrix; reference it before adding or editing npm scripts. The most common flows are:
- `pnpm run daily` — generate the current daily note (see "Daily" in `docs/USAGE.md`).
- `pnpm run gtd:sync` — full GTD sync pipeline ("GTD" section in `docs/USAGE.md`).
- `python run_tests.py all` — pytest wrapper documented in `docs/TESTING.md`.
If you script new workflows, document them in `docs/SCRIPTS.md` so the matrix stays authoritative.

## Coding Style & Naming Conventions
Follow `.agent-os/standards/code-style.md` for base rules and align with the existing CommonJS/`camelCase` patterns in `lib/`. Run `pnpm exec prettier --check "**/*.js"` before submitting code and `pnpm exec markdownlint "docs/**/*.md"` for doc updates. When standards diverge, call it out in your PR and add rationale to `docs/ARCHITECTURE.md` or the relevant spec.

## Testing Guidelines
The canonical instructions live in `docs/TESTING.md`; keep that file updated with new suites or fixtures. Use `python run_tests.py <suite>` for Python-driven checks and `pnpm test:js` for Jest utilities. Capture any manual verification in PR notes when touching calendar, reminders, or Gmail integrations.

## Commit & Pull Request Guidelines
Mirror the commit prefixes already in `git log` (`fix(...)`, `chore:`, `Docs:`). Before opening a PR, walk through `.agent-os/instructions/meta/pre-flight.md`; after merge prep, follow the post-flight checklist. PR descriptions should link related notes/issues, list executed commands, and include screenshots or sample Markdown when changing rendered output.

## Agent OS Resources
When coordinating with other agents, share work plans via `.agent-os/instructions/core/plan-product.md` and log completion steps against `.agent-os/instructions/core/post-execution-tasks.md`. Revisit `.agent-os/standards/best-practices.md` ahead of large refactors to stay aligned with shared principles.
