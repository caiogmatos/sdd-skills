# Product

## Purpose
sdd-skills is a public reference site and install source for **Spec-Driven Development (SDD) with Claude Code**: a workflow where no feature code is written until a spec is approved, and implementation is delegated to subagents with a fresh context per task. *(confirmed by user)*

It does two jobs:
1. **Teach the workflow**: what SDD is, how to set it up, and what to type at each step for new and existing projects.
2. **Distribute the files**: six Claude Code skills, two subagents and a global CLAUDE.md template, installable with one command or downloadable from the site.

Live at https://caiogmatos.github.io/sdd-skills/ · source at https://github.com/caiogmatos/sdd-skills.

## Users
- **Primary: anyone using Claude Code** who wants a structured spec → implement → validate loop. They arrive cold, so pages must be self-contained and written for strangers, with no personal shorthand. *(confirmed by user)*
- **The maintainer**, who uses the skills on their own projects and installs them from this repo.

## Main use cases
- Install the skills and agents into `~/.claude/` with the command on the Setup page (`global.html`), or re-run it to update.
- Read, copy or download any skill, agent or template from an in-page viewer.
- Follow a guide for a new project (`/sdd-startup`) or an existing one (`/sdd-checkup`, `/sdd-bootstrap`).
- Look up the day-to-day loop (`/sdd-feature` → `/sdd-implement` → `/sdd-validate`) and parallel features in worktrees.
- Understand the agents (`sdd-implementer`, `sdd-reviewer`, built-in Explore) and how to customize them.

## What success looks like
- A newcomer can go from zero to a working install and a first specced feature using only the site.
- What the site teaches matches what the skill files do. The files in `skills/`, `agents/` and `templates/` are the single source of truth, and the pages describe them accurately.
- Guidance stays aligned with current Claude Code behaviour (skills, subagents, worktrees, models).
