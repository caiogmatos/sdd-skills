---
name: sdd-bootstrap
description: Set up SDD context for an existing codebase that has no CLAUDE.md or steering docs. Maps the code with parallel Explore subagents, asks the user only what the code can't answer, then writes the steering docs, CLAUDE.md and STATE.md. Run /sdd-checkup first.
disable-model-invocation: true
---

# SDD bootstrap: existing codebase

Record the decisions this codebase has already made. Never invent decisions, and do not modify application code.

## Standing rules

- Ask with the AskUserQuestion tool, one question at a time, and only about what the code can't answer.
- If CLAUDE.md or `.claude/steering/` already exists, stop and suggest /sdd-checkup instead.
- If AGENTS.md exists, keep it. Claude Code reads it, and so do other tools. The new CLAUDE.md starts with an `@AGENTS.md` line instead of copying its content.

## Phase 1: Map the codebase in parallel

Launch three Explore subagents in a single message so they run at the same time. Ask each for a summary under 300 words that cites file paths as evidence:

1. **Stack**: languages, frameworks, databases, external services, and the build, test and run commands (from package scripts, Makefile, CI config).
2. **Structure**: the folder layout; where entry points, routes or handlers, business logic, tests and config live.
3. **Conventions**: patterns in a sample of source files, such as error handling, validation, logging, naming and test style, plus anything the code consistently avoids.

Work from the summaries. Read individual files yourself only to settle a specific question.

## Phase 2: Fill gaps

List what the code leaves ambiguous, such as two competing test frameworks or a half-finished migration. Ask about each one. If the README doesn't make the product's purpose clear, ask for it.

## Phase 3: Generate files

Write the files in this order, so CLAUDE.md can point to the others instead of repeating them:

1. `.claude/steering/product.md`: purpose, users, main use cases.
2. `.claude/steering/tech.md`: each decision as found, marked "inferred from code" or "confirmed by user"; the build, test and run commands.
3. `.claude/steering/structure.md`: the folder map, and where each kind of code lives.
4. `CLAUDE.md`: last, under 60 lines, in the format below.
5. `STATE.md`: in the format below, with the current hash from `git rev-parse --short HEAD`.
6. `.gitignore`: add `.claude/worktrees/` if it's missing.

CLAUDE.md format:

```text
@AGENTS.md            <- only if AGENTS.md exists

# Stack
<one line>

# Commands
- Test: <command>
- Run: <command>

# Conventions
- <only rules Claude can't infer from the code>

# NEVER
- <hard prohibitions>

# Project context (read when relevant)
- .claude/steering/product.md: purpose and users
- .claude/steering/tech.md: stack decisions; read before proposing new technology
- .claude/steering/structure.md: where code lives
- specs/<feature>/: one folder per feature; STATE.md tracks feature status
```

Don't use `@` imports for the steering docs. Imported files load in full in every session; the SDD skills read them when they need them.

STATE.md format:

```text
# State
_Generated: YYYY-MM-DD_
Last commit: `<short hash>`

## Done
## In progress
## Blockers
## Next steps
```

## Phase 4: Review

Present every file for approval and apply changes the user asks for. Suggest committing them as `chore: add SDD context files`, then starting the first feature with `/sdd-feature <name>`.
