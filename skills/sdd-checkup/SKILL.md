---
name: sdd-checkup
description: Audit a project's SDD health, covering context files, AGENTS.md, STATE.md drift against git, orphaned specs, old-format tasks and stale metadata. Reports first, and changes nothing until the user approves each fix.
disable-model-invocation: true
---

# SDD checkup

Audit first, then fix only what the user approves.

## Phase 1: Scan

Check each item and keep notes; don't narrate every step. In a large repository, hand the specs and metadata checks to an Explore subagent and work from its summary.

- **Context files**: CLAUDE.md (under 200 lines? has a Project context section?), AGENTS.md, `.claude/steering/product.md`, `tech.md`, `structure.md`, `.claude/rules/`.
- **Imports**: `@` imports in CLAUDE.md of large files such as steering docs. Imports load in full in every session.
- **STATE.md**: does it exist? Read its `Last commit` hash and run `git log --oneline <hash>..HEAD`. Commits that only touch STATE.md, CHANGELOG.md or steering docs don't count as drift.
- **Specs**: for each `specs/<feature>/`, are requirements.md, design.md and tasks.md all there? Is the feature listed in STATE.md? How many tasks are unticked?
- **Task format**: does each task in tasks.md have `Files:` and `Check:` lines? Older SDD specs don't.
- **Metadata**: CHANGELOG.md, README.md, and the version field (package.json, pyproject.toml, Cargo.toml). How many commits since each last changed?
- **Agents**: are `sdd-implementer` and `sdd-reviewer` defined in `~/.claude/agents/` or `.claude/agents/`?
- **Worktrees**: is `.claude/worktrees/` in .gitignore?

## Phase 2: Report

Show a ✓ / ⚠ / ✗ line per item, then the suggested fixes ranked Critical, Important, Optional.

## Phase 3: Fix, with approval for each

Apply approved fixes in this order: CLAUDE.md, steering docs, STATE.md, specs, metadata.

- **No CLAUDE.md and no AGENTS.md**: recommend /sdd-bootstrap. Don't run it yourself.
- **AGENTS.md but no CLAUDE.md**: Claude Code already reads AGENTS.md, so nothing is broken. Offer a CLAUDE.md that starts with `@AGENTS.md` and adds the SDD sections, plus the steering docs. Keep AGENTS.md as it is for other tools.
- **No Project context section**: add the pointers to the steering docs, specs/ and STATE.md.
- **CLAUDE.md over 200 lines, or importing steering docs**: propose moving detail into steering docs, or into `.claude/rules/` files with `paths:` frontmatter so they load only for matching files.
- **STATE.md missing**: generate it from specs/, `git log`, and the HEAD hash.
- **STATE.md behind**: read the new commits (and their diffs if the messages are vague), update feature status, set the hash to HEAD.
- **Orphaned spec**: ask whether it's implemented, in progress, or abandoned.
- **Old-format tasks**: offer to add `Files:` and `Check:` lines to each unticked task, from design.md.
- **Stale metadata**: offer a CHANGELOG entry, a README check, and ask before any version bump.
- **Agents missing**: tell the user to install them from https://caiogmatos.github.io/sdd-skills/global.html. /sdd-implement and /sdd-validate need them.
- **Worktrees not ignored**: add `.claude/worktrees/` to .gitignore.

Never run /sdd-bootstrap or any other skill automatically.
