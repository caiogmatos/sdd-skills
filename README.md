# SDD skills for Claude Code

Spec-Driven Development (SDD) is a way of working with [Claude Code](https://code.claude.com) where no feature code is written until you've approved a spec. Each feature goes through requirements, a design checked against your current stack, and a list of small tasks that each name a check to run. Claude then builds it one task at a time: your main conversation coordinates, and separate agents research the codebase, build each task with a clean slate, and review the result against the spec.

**Guide and reference: https://caiogmatos.github.io/sdd-skills/**

## What's included

| | |
|---|---|
| `/sdd-startup` | New project: interviews you, walks through stack decisions, writes the context files |
| `/sdd-checkup` | Audits an existing project and fixes only what you approve |
| `/sdd-bootstrap` | Writes the context files for existing code, without inventing decisions |
| `/sdd-feature` | Requirements → design → tasks with checks, with your approval after each phase |
| `/sdd-implement` | One agent per task, with a check, a commit and a tick for each; parallel worktrees for several features |
| `/sdd-validate` | An independent reviewer's pass/fail verdict, then docs and STATE.md updates |
| `sdd-implementer` | Agent that builds exactly one task and runs its check |
| `sdd-reviewer` | Read-only agent that checks a feature against its acceptance criteria |

## Install

Windows (PowerShell):

```powershell
$base = "https://raw.githubusercontent.com/caiogmatos/sdd-skills/main"
foreach ($n in "startup", "bootstrap", "checkup", "feature", "implement", "validate") {
  New-Item -ItemType Directory -Force "$HOME\.claude\skills\sdd-$n" | Out-Null
  Invoke-WebRequest "$base/skills/sdd-$n/SKILL.md" -OutFile "$HOME\.claude\skills\sdd-$n\SKILL.md" -UseBasicParsing
}
New-Item -ItemType Directory -Force "$HOME\.claude\agents" | Out-Null
foreach ($a in "sdd-implementer", "sdd-reviewer") {
  Invoke-WebRequest "$base/agents/$a.md" -OutFile "$HOME\.claude\agents\$a.md" -UseBasicParsing
}
```

macOS, Linux, WSL:

```sh
base=https://raw.githubusercontent.com/caiogmatos/sdd-skills/main
for n in startup bootstrap checkup feature implement validate; do
  mkdir -p ~/.claude/skills/sdd-$n
  curl -fsSL "$base/skills/sdd-$n/SKILL.md" -o ~/.claude/skills/sdd-$n/SKILL.md
done
mkdir -p ~/.claude/agents
for a in sdd-implementer sdd-reviewer; do
  curl -fsSL "$base/agents/$a.md" -o ~/.claude/agents/$a.md
done
```

Re-run the command to update. Then type `/sdd` in Claude Code to check the skills autocomplete. See the [Setup page](https://caiogmatos.github.io/sdd-skills/global.html) for verification, the optional global `CLAUDE.md` template, and model advice.

## Quick start

```text
/sdd-startup a CLI that syncs my notes to S3     # new project
/sdd-checkup                                     # existing project, then /sdd-bootstrap if needed
/sdd-feature csv-export let users export reports # spec a feature, then commit it and /clear
/sdd-implement csv-export                        # build it, one agent per task
/sdd-validate csv-export                         # independent verdict + housekeeping
```

## Repository layout

- `skills/`, `agents/`, `templates/` are the installable files and the only copy of their content. The site loads them at runtime.
- `*.html`, `styles.css`, `scripts/` are the guide site, served by GitHub Pages from `main`. There is no build step.

To work on the site, open any `.html` file in a browser, or run `python -m http.server` in the repo root to load files you haven't pushed yet.
