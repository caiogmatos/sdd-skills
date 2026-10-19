---
name: sdd-startup
description: Start a brand-new project from an idea, before any code exists. Interviews the user about purpose and constraints, walks through each tech stack decision with trade-offs, then writes the steering docs, CLAUDE.md and STATE.md. Not for existing codebases; use /sdd-bootstrap there.
argument-hint: "[one-line project idea]"
disable-model-invocation: true
---

# SDD startup: new project

Project idea from the user (may be empty): $ARGUMENTS

You are setting up spec-driven development (SDD) for a project with no code yet. Do not write application code at any point in this skill.

## Standing rules

- Ask with the AskUserQuestion tool, one decision at a time. Offer 2–3 concrete options, each with a one-line trade-off, and put your recommendation first, labeled "(Recommended)".
- Never choose a technology silently. Every stack decision belongs to the user.
- If the folder already contains source code, stop and suggest /sdd-bootstrap.

## Phase 1: Purpose

1. If no idea was given above, ask for 2–3 sentences: what the project does, who uses it, and how they interact with it (API, web UI, CLI, background worker, library).
2. Ask at most two follow-ups, only about things that change the stack: scale, users, deadlines, compliance.
3. Summarize the purpose in 3–5 bullets and get confirmation before Phase 2.

## Phase 2: Stack decisions

Work through these areas in order. Skip an area the purpose makes irrelevant, and say that you skipped it.

1. **Language and runtime**: weigh the user's familiarity against what the project needs.
2. **Framework**: only options that fit the project type.
3. **Data layer**: what must persist; relational, document or key-value; operational cost.
4. **Async work and queues**: only if the purpose implies background jobs.
5. **Hosting and deployment**: VPS, container, PaaS or serverless. Flag conflicts, such as in-memory state on serverless.
6. **Testing**: unit, integration, end-to-end, and the exact command that runs them. Every task's check uses this command later.
7. **Hard constraints**: an open question about compliance, required integrations, team size and budget.

## Phase 3: Confirm

Present every decision in one block: the choice, the reason, and the alternatives rejected. Wait for approval or changes.

## Phase 4: Generate files

Write the files in this order, so CLAUDE.md can point to the others instead of repeating them:

1. `.claude/steering/product.md`: purpose, users, interaction model, what success looks like.
2. `.claude/steering/tech.md`: each decision with its reason and the rejected alternatives; the build, test and run commands.
3. `.claude/steering/structure.md`: the planned folder layout, and where entry points, logic, tests and config live.
4. `CLAUDE.md`: last, under 60 lines, in the format below.
5. `STATE.md`: in the format below, with `Last commit: none yet`.
6. `.gitignore`: add `.claude/worktrees/`, used later for parallel work.

CLAUDE.md format:

```text
# Stack
<one line: language · framework · data · hosting>

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
Last commit: none yet

## Done
## In progress
## Blockers
## Next steps
- Spec the first feature with /sdd-feature
```

## Finish

Show the list of files written. Suggest committing them as `chore: add SDD context files`, then starting the first feature with `/sdd-feature <name>`.
