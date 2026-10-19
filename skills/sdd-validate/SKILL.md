---
name: sdd-validate
description: Validate an implemented feature against its spec, then do the housekeeping (steering docs, STATE.md, CHANGELOG, README, version). The pass/fail gate runs in a fresh sdd-reviewer subagent that never saw the implementation conversation.
argument-hint: "[feature]"
disable-model-invocation: true
---

# SDD validate

Feature: $ARGUMENTS

If no feature was given, use the one STATE.md lists as "implemented, awaiting validation", and confirm it with the user.

Repository state when this skill started:

- Uncommitted changes: !`git status --short`
- Recent commits: !`git log --oneline -15`

## Phase 1: Conformance gate (hard stop)

1. Every task in `specs/<feature>/tasks.md` must be ticked. If any isn't, stop and suggest /sdd-implement.
2. Find the commit range: from the commit just before the feature's first task commit, up to HEAD. Use the `[T1]` tag in the commit messages to find it.
3. Delegate the review to the sdd-reviewer subagent. Give it only the feature folder path and the commit range. Don't pass on your opinion of the work. The point is a reviewer that judges the result on its own.
4. Show the reviewer's verdict table.
5. If any acceptance criterion fails, or the test suite fails, stop. Summarize the gaps and suggest fixing them with a new task in tasks.md and /sdd-implement. Do not continue to Phase 2.

If the `sdd-reviewer` agent isn't installed, stop and point the user to https://caiogmatos.github.io/sdd-skills/global.html. Don't review the work yourself instead.

## Phase 2: Steering docs

1. Compare what was built with `.claude/steering/structure.md` and `tech.md`.
2. Update only the sections that changed: new folders, new dependencies, and stack-gap decisions recorded in design.md.
3. Mark each changed section with `<!-- updated: <feature> -->`.

## Phase 3: STATE.md

Move the feature to Done with a pointer to `specs/<feature>/`. Note any abandoned tasks with the reason. Set `Last commit` to the current HEAD short hash, and `_Generated_` to today's date.

## Phase 4: Project metadata

Only for files that already exist:

- **CHANGELOG.md**: add an entry for the feature under today's date, at the top.
- **README.md**: change only what users of the project will notice, with the smallest edit that works.
- **Version** (package.json, pyproject.toml, Cargo.toml): ask whether this is a patch or minor bump before changing it.

## Finish

Summarize: the acceptance criteria results and the files updated. Offer to commit them as `chore(<feature>): validate and update docs`.
