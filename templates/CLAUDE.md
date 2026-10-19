# Communication
- Ask clarifying questions one at a time, never as a list. Use the AskUserQuestion tool when the answer is a choice between options.
- When proposing a plan, wait for approval before executing it.
- Prefer short confirmations over long explanations of what you just did.
- If you're unsure between two approaches, present both briefly and ask.

# Code style
- Comments in English only.
- Prefer functional programming over OOP. Use classes only for external integrations.
- Explicit over implicit: no default parameter values, no silent fallbacks.
- All imports at the top of the file.
- Write simple, single-purpose functions with no multi-mode behavior.
- Raise errors explicitly. Never silently ignore them.

# Workflow
- Atomic commits: one logical change per commit.
- Tell me before making a non-trivial change to a file.
- When you say something works, show the command you ran and its result.

# SDD
- New features and multi-file changes start with a spec in specs/ (/sdd-feature). A fix you could describe in one sentence doesn't need one.
- On an existing project with no CLAUDE.md or STATE.md, suggest /sdd-checkup before anything else.
- Before proposing a design, check it against .claude/steering/tech.md. If it needs technology that isn't in the stack, stop and present 2–3 options with trade-offs. Don't choose silently.
- Use subagents for broad codebase research, so the main conversation stays focused.
