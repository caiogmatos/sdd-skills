---
name: sdd-feature
description: Spec a new feature before any code is written, in three phases the user approves one by one (requirements, design with stack-gap checks, and tasks that each name a check to run). Writes specs/<feature>/requirements.md, design.md and tasks.md.
argument-hint: "[feature-name] [short description]"
disable-model-invocation: true
---

# SDD feature spec

Input: $ARGUMENTS

The first word is the feature name; use it in kebab-case as the folder name under `specs/`. The rest, if any, is a short description. If the input is empty, ask for both.

## Standing rules

- Write no application code. Only create files under `specs/<feature>/`.
- Ask with the AskUserQuestion tool, one question at a time.
- Each phase ends with an approval gate. Apply the user's edits and re-confirm before starting the next phase.
- This needs CLAUDE.md and `.claude/steering/tech.md`. If either is missing, stop and suggest /sdd-checkup.
- If `specs/<feature>/` already exists, resume at the first missing file instead of overwriting.

## Phase 1: Requirements

1. Interview the user: who uses the feature, what they do, what must be true when it's done, and what is out of scope. Ask about edge cases they may not have considered; skip obvious questions.
2. Write `specs/<feature>/requirements.md` with:
   - User stories
   - Acceptance criteria numbered AC-1, AC-2 and so on. Phrase each one so that a reviewer could mark it pass or fail from a test or a command.
   - Out of scope
3. Gate: wait for approval.

## Phase 2: Design

1. Research before designing. Read `.claude/steering/tech.md` and `structure.md` yourself. To learn how the relevant existing code works, delegate to Explore subagents, in parallel when the areas are independent, and work from their summaries. Keep raw file dumps out of this conversation.
2. Check the solution against tech.md. For anything not in the current stack, stop and ask:

   ```text
   GAP: <component> is not in the current stack. Options:
   A) <option>: <trade-off>
   B) <option>: <trade-off>
   Recommendation: <X>, because <one sentence>.
   ```

   Wait for a decision on every gap. Never default silently.
3. Write `specs/<feature>/design.md` with: the approach; the files to create or modify; interfaces and types; data flow; edge cases and error handling; the stack decisions made (choice and rejected alternatives); and a verification plan saying how each AC will be proven (a test name or command).
4. Gate: wait for approval.

## Phase 3: Tasks

Write `specs/<feature>/tasks.md`. Each task becomes one commit, made by a subagent that starts with no conversation history. It must be possible to complete from the spec files and the code alone.

```text
# Tasks: <feature>

## Group 1: PARALLEL
- [ ] T1: <imperative title>
  - Files: <paths it creates or modifies>
  - Do: <what to build, using names from design.md>
  - Check: `<command that proves this task works>`
  - Covers: AC-1, AC-3
- [ ] T2: ...

<!-- GATE: Group 1 must be complete before Group 2 -->

## Group 2: SEQUENTIAL
- [ ] T3: ...
```

Rules:

- Mark a group PARALLEL only if its tasks share no files.
- Every task has a Check that runs without input and returns pass or fail, usually the project's test command scoped to the new tests. Write the tests in the same task as the behavior they test.
- Every acceptance criterion is covered by at least one task.
- Gate: wait for approval.

## Finish

Tell the user the next steps:

1. Commit the spec, for example `git add specs/<feature>` then `git commit -m "docs(<feature>): add spec"`. Offer to do it.
2. Run /clear or open a new session, then run `/sdd-implement <feature>`. A fresh context keeps the implementation anchored to the spec, not to this conversation.
