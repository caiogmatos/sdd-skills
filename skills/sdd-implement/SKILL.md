---
name: sdd-implement
description: Implement one or more approved SDD specs. Acts as coordinator, handing each task to an sdd-implementer subagent with a fresh context, then running its check, committing it and ticking it off. Several features run in parallel worktrees when their files don't overlap. Always presents a plan for approval first.
argument-hint: "[feature] [and feature-b ...]"
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git add *) Bash(git commit *)
---

# SDD implement

Features requested: $ARGUMENTS

Split the input on spaces, commas and the word "and". If it's empty, list the `specs/` folders that still have unticked tasks and ask which to implement.

You are the coordinator. You don't write the application code yourself. sdd-implementer subagents do, one task each, starting from a clean context. Your job is to plan, dispatch, verify, commit and track progress. That keeps this conversation small enough to see a whole feature through.

## Standing rules

- Never start implementation without an approved plan.
- One task, one commit. Never bundle tasks.
- Tick a task in tasks.md only after its Check passes and its commit exists.
- If a subagent reports BLOCKED (a stack gap, a contradiction in the spec, or a check it can't make pass), stop and bring it to the user. Don't improvise around the spec.
- If the `sdd-implementer` agent isn't installed, stop and point the user to https://caiogmatos.github.io/sdd-skills/global.html.

## Phase 1: Load and check

For each feature:

1. Confirm `specs/<feature>/` contains requirements.md, design.md and tasks.md. If any is missing, stop and suggest /sdd-feature.
2. Run `git status --short specs/<feature>`. Subagents and worktrees work from committed files, so ask the user to commit an uncommitted spec first, or offer to do it.
3. Read tasks.md. Skip ticked tasks and resume from the first unticked one. If STATE.md already lists the feature as done, say so and skip it.
4. Check that every unticked task has `Files:` and `Check:` lines. If not (an older spec format), offer to add them from design.md before continuing.

## Phase 2: Plan

**One feature:** list the groups in order, which tasks run in parallel, and each task's check.

**Several features:** compare their Files lists.

- No overlap: run each feature in its own worktree, in parallel.
- Overlap: run them in sequence, and propose an order with the reason.
- Partial overlap: run the independent features in parallel and sequence the rest.

Before using worktrees, check two things:

- Worktrees branch from the remote default branch unless `.claude/settings.json` sets `"worktree": { "baseRef": "head" }`. If the spec commits aren't on that base, offer to add the setting (recommended) or to push first.
- `.claude/worktrees/` is in .gitignore.

Present the plan and wait for approval.

## Phase 3: Run one feature

Work through the groups in order, and respect every GATE comment.

1. **Dispatch.** Start one sdd-implementer subagent per task. For a PARALLEL group, start all of them in a single message so they run at the same time; otherwise one at a time. Give each one only the feature folder path, the task ID and the project's test command. It reads everything else itself.
2. **Verify.** When a subagent reports DONE, read its report and check `git status --short`. Changes outside the task's Files need the user's approval. Run the task's Check yourself.
3. **Commit.** If the check passes, tick the task in tasks.md, then commit only that task's files plus tasks.md, with the message `<type>(<feature>): <task title> [T<n>]`.
4. **Retry once.** If the check fails, start a new sdd-implementer for the same task and include the failure output. If it fails again, stop and report to the user.

## Phase 3b: Run several features in parallel

For each feature, start a general-purpose subagent with worktree isolation, all in a single message. Each one's prompt contains the feature name and the four Phase 3 steps above, copied verbatim. Each one dispatches sdd-implementer per task inside its worktree and commits on its worktree branch.

When all have finished, report each feature's branch, its commits and any blockers. The user then reviews and merges each branch, and runs /sdd-validate for each feature on the merged result.

## Phase 4: Wrap up

When every task in a feature is ticked:

1. Run the project's full test suite once and show the result.
2. Offer to run /code-review on the feature's changes, to look for bugs.
3. In STATE.md, list the feature under In progress as "implemented, awaiting validation".
4. Next step: `/sdd-validate <feature>`. It can run in this session, because its conformance check runs in a separate reviewer subagent that never saw this conversation.
