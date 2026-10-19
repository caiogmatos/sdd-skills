window.SKILLS_DATA = {

  global: {
    title: '~/.claude/CLAUDE.md — global template',
    html: `
<div class="skill-content">
<div class="fm">
<span class="fm-s"># ~/.claude/CLAUDE.md</span><br>
<span class="fm-s"># Personal preferences — applies to all projects</span>
</div>
<h2>Communication</h2>
<ul>
<li>Ask clarifying questions one at a time, never as a list</li>
<li>When proposing a plan, wait for approval before executing</li>
<li>Prefer short confirmations over long explanations of what you just did</li>
<li>If uncertain between two approaches, present both briefly and ask</li>
</ul>
<h2>Code Style</h2>
<ul>
<li>Comments in English only</li>
<li>Prefer functional programming over OOP — use classes only for external integrations</li>
<li>Explicit over implicit — no default parameter values, no silent fallbacks</li>
<li>All imports at the top of the file</li>
<li>Write simple single-purpose functions — no multi-mode behavior</li>
<li>Always raise errors explicitly, never silently ignore them</li>
</ul>
<h2>Workflow</h2>
<ul>
<li>Atomic commits per task — never bundle unrelated changes</li>
<li>Never modify a file without telling me first when the change is non-trivial</li>
</ul>
<h2>SDD Defaults</h2>
<ul>
<li>Never write application code before a spec exists in specs/</li>
<li>At session start on an existing project, check for CLAUDE.md and STATE.md</li>
<li>If CLAUDE.md or steering docs are missing, suggest /sdd-checkup before anything else</li>
</ul>
<h2>Design Decisions</h2>
<ul>
<li>Before proposing design.md, cross-reference the solution against the current stack in tech.md</li>
<li><strong>If the design requires a technology not present in the stack, stop and flag it explicitly</strong></li>
<li>Present 2–3 options with trade-offs and wait for a decision — do not default to any option silently</li>
</ul>
<div class="note">⚠ Do NOT declare OS, Node/Python version, package manager, or shell — Claude Code detects these automatically. Only put preferences here that Claude cannot infer.</div>
</div>`
  },

  startup: {
    title: '/sdd-startup — SKILL.md',
    html: `
<div class="skill-content">
<div class="fm">
<span class="fm-s">---</span><br>
<span class="fm-k">name:</span> <span class="fm-v">sdd-startup</span><br>
<span class="fm-k">description:</span> Start a brand new project from scratch. Guides the user through<br>
&nbsp;&nbsp;purpose, constraints, and tech stack decisions via structured trade-off<br>
&nbsp;&nbsp;conversations. Generates CLAUDE.md and steering docs once confirmed.<br>
<span class="fm-s">---</span>
</div>
<h2>Phase 1 — Project purpose</h2>
<p>Ask the user to describe the project in 2–3 sentences: what it does, who uses it, and the primary interaction model. Listen for implicit constraints before asking about tech. Ask ONE follow-up if ambiguous. Summarize and confirm before Phase 2.</p>
<h2>Phase 2 — Stack conversation</h2>
<p>Work through each decision area in order. For each: present 2–3 concrete options, give one-line trade-offs, give a labeled recommendation, and confirm before moving on.</p>
<ol>
<li><strong>2.1 Language and runtime</strong> — anchor to team familiarity and project demands</li>
<li><strong>2.2 Framework</strong> — narrow to options that fit the project type</li>
<li><strong>2.3 Data layer</strong> — persistence needs, relational vs document vs key-value, operational complexity</li>
<li><strong>2.4 Async / queue</strong> — only if implied by description. In-memory / Redis-backed / cloud-managed / defer</li>
<li><strong>2.5 Hosting and deployment</strong> — VPS / container / PaaS / serverless. Note dependencies (Redis + serverless conflict)</li>
<li><strong>2.6 Testing strategy</strong> — unit / integration / E2E / mix. Affects how tasks.md gets structured</li>
<li><strong>2.7 Hard constraints</strong> — open question: compliance, integrations, team size, budget, deadlines</li>
</ol>
<div class="gap-box"><strong>Recommendation format per area:</strong><br>
"Based on what you described, options are:<br>
A) [option] — [trade-off]<br>
B) [option] — [trade-off]<br>
My recommendation: [X] because [one sentence]. Which do you want?"</div>
<h2>Phase 3 — Confirm and generate</h2>
<p>Summarize all confirmed decisions in a single block for review. Once approved, generate in order: product.md → tech.md → structure.md → CLAUDE.md (last). tech.md must record both chosen options AND explicitly rejected alternatives.</p>
<div class="note">⚠ Generate CLAUDE.md last. It contains only stack summary, conventions, NEVER list, and @import lines — never duplicate content from steering docs.</div>
</div>`
  },

  bootstrap: {
    title: '/sdd-bootstrap — SKILL.md',
    html: `
<div class="skill-content">
<div class="fm">
<span class="fm-s">---</span><br>
<span class="fm-k">name:</span> <span class="fm-v">sdd-bootstrap</span><br>
<span class="fm-k">description:</span> Bootstrap SDD context for an existing project. Generates CLAUDE.md<br>
&nbsp;&nbsp;and .claude/steering/ by reverse-engineering the codebase. Use when<br>
&nbsp;&nbsp;starting SDD on a project that has no spec files.<br>
<span class="fm-s">---</span>
</div>
<h2>Separation of concerns — follow strictly</h2>
<p>CLAUDE.md must contain ONLY: Stack (one line), Conventions, NEVER list, and @import lines. Everything else goes into steering docs. If you find yourself writing context or rationale into CLAUDE.md — stop and move it to a steering doc.</p>
<h2>Steps</h2>
<ol>
<li>Scan codebase: folder structure, package files, config files, sample source files</li>
<li>Ask clarifying questions ONE AT A TIME for anything ambiguous — do not invent decisions</li>
<li>Generate <strong>.claude/steering/product.md</strong> — what it does, business context, use cases</li>
<li>Generate <strong>.claude/steering/tech.md</strong> — decisions, justifications, integration patterns</li>
<li>Generate <strong>.claude/steering/structure.md</strong> — folder map, where routes/handlers/utils/tests live</li>
<li>Generate <strong>CLAUDE.md last</strong> — pull only constraints and conventions, end with three @import lines</li>
<li>Present all four files for approval. Do NOT write application code.</li>
</ol>
<div class="note">⚠ Generate CLAUDE.md last — writing it after steering docs forces the skill to treat them as source of truth and avoids duplicated content.</div>
</div>`
  },

  checkup: {
    title: '/sdd-checkup — SKILL.md',
    html: `
<div class="skill-content">
<div class="fm">
<span class="fm-s">---</span><br>
<span class="fm-k">name:</span> <span class="fm-v">sdd-checkup</span><br>
<span class="fm-k">description:</span> Audit a project for SDD health. Checks CLAUDE.md, AGENTS.md,<br>
&nbsp;&nbsp;steering docs, STATE.md coherence, orphaned specs, desynced metadata.<br>
&nbsp;&nbsp;Reports first, fixes only after approval.<br>
<span class="fm-s">---</span>
</div>
<h2>Phase 1 — Scan (silently)</h2>
<ul>
<li><strong>Context files</strong>: CLAUDE.md (has @imports?), AGENTS.md, steering docs</li>
<li><strong>STATE.md</strong>: exists? extract hash → git log {hash}..HEAD — commits behind?</li>
<li><strong>Orphaned specs</strong>: features in specs/ not in STATE.md as implemented/abandoned</li>
<li><strong>Metadata freshness</strong>: CHANGELOG, README, package.json — gap vs HEAD</li>
<li><strong>Agents</strong>: .claude/agents/ exists and populated?</li>
</ul>
<h2>Phase 2 — Report</h2>
<p>Present structured audit with ✓/✗/⚠ per item. List suggested fixes ranked: Critical → Important → Optional.</p>
<h2>Phase 3 — Fix (only after approval)</h2>
<ul>
<li><strong>No CLAUDE.md, no AGENTS.md</strong> → suggest /sdd-bootstrap, do not generate here</li>
<li><strong>AGENTS.md present, no CLAUDE.md</strong> → offer Cursor migration: convert to SDD format</li>
<li><strong>CLAUDE.md missing @imports</strong> → add lines for existing steering docs only</li>
<li><strong>STATE.md missing</strong> → offer to generate from specs/ + git log + HEAD hash</li>
<li><strong>STATE.md behind HEAD</strong> → git log, read diffs, update hash</li>
<li><strong>Orphaned specs</strong> → ask per feature: implemented / in-progress / abandoned?</li>
<li><strong>Desynced metadata</strong> → offer CHANGELOG entry, README review, version bump</li>
<li><strong>No agents</strong> → offer to generate from CLAUDE.md + tech.md</li>
</ul>
<div class="note">⚠ Apply fixes in order: CLAUDE.md → steering → agents → STATE.md → specs → metadata. Never run /sdd-bootstrap automatically.</div>
</div>`
  },

  feature: {
    title: '/sdd-feature — SKILL.md',
    html: `
<div class="skill-content">
<div class="fm">
<span class="fm-s">---</span><br>
<span class="fm-k">name:</span> <span class="fm-v">sdd-feature</span><br>
<span class="fm-k">description:</span> Run the full SDD spec cycle for a new feature. Generates<br>
&nbsp;&nbsp;requirements.md, design.md, and tasks.md under specs/[feature]/.<br>
<span class="fm-s">---</span>
</div>
<h2>Phase 1 — Requirements</h2>
<ol>
<li>Ask the user to describe the feature in one sentence</li>
<li>Ask clarifying questions ONE AT A TIME — cover actors, actions, acceptance criteria, OUT OF SCOPE</li>
<li>Generate specs/[feature]/requirements.md with User Stories, AC, Out of Scope</li>
<li>Stop and wait for explicit approval before Phase 2</li>
</ol>
<h2>Phase 2 — Design</h2>
<ol>
<li>Read requirements.md and .claude/steering/tech.md</li>
<li><strong>Before writing anything</strong>, cross-reference proposed solution against current stack</li>
</ol>
<div class="gap-box"><strong>Stack gap format:</strong><br>
"GAP — [component]: Not in current stack. Options:<br>
A) [option] — [trade-off]<br>
B) [option] — [trade-off]<br>
Which fits your constraints?"<br><br>
Wait for a decision on every gap. Do not default silently.</div>
<ol start="3">
<li>Propose specs/[feature]/design.md: data flow, interfaces/types, edge cases</li>
<li>Stop and wait for explicit approval before Phase 3</li>
</ol>
<h2>Phase 3 — Tasks</h2>
<ol>
<li>Generate specs/[feature]/tasks.md from design.md</li>
<li>Label each task with responsible agent (backend-builder, tester, doc-writer)</li>
<li>Mark PARALLEL vs SEQUENTIAL explicitly. Use GATE comments between dependency boundaries</li>
<li>Each task maps to one atomic commit</li>
<li>Stop and wait for approval — implementation starts only after user confirms tasks.md</li>
</ol>
</div>`
  },

  implement: {
    title: '/sdd-implement — SKILL.md',
    html: `
<div class="skill-content">
<div class="fm">
<span class="fm-s">---</span><br>
<span class="fm-k">name:</span> <span class="fm-v">sdd-implement</span><br>
<span class="fm-k">description:</span> Implement one or more specced features. When multiple features<br>
&nbsp;&nbsp;are given, audits for file overlap and proposes parallel (worktree) or<br>
&nbsp;&nbsp;sequential execution. Always presents an execution plan for approval first.<br>
<span class="fm-s">---</span>
</div>
<h2>Usage</h2>
<ul>
<li>/sdd-implement feature-a</li>
<li>/sdd-implement feature-a and feature-b</li>
</ul>
<h2>Phase 1 — Parse and load</h2>
<p>Extract all feature names. For each, verify requirements.md, design.md, and tasks.md exist under specs/[feature]/. Stop and surface any missing files before proceeding.</p>
<h2>Phase 2 — Resume detection</h2>
<p>Check STATE.md and tasks.md checkboxes per feature. Already implemented → skip and notify. Partially done → resume from first unchecked task. Report status before proposing plan.</p>
<h2>Phase 3 — Overlap audit (multiple features only)</h2>
<p>Build a file manifest per feature from tasks.md + design.md. Check for intersection.</p>
<ul>
<li><strong>No overlap</strong> → propose parallel worktree execution</li>
<li><strong>Overlap detected</strong> → propose sequential with ordering rationale</li>
<li><strong>Partial overlap</strong> → propose hybrid: parallel the safe ones, sequence the rest</li>
</ul>
<p>Always present the execution plan and wait for approval before writing any code.</p>
<h2>Phase 4 — Execute (after plan approval)</h2>
<p><strong>Sequential:</strong> implement tasks in order, commit atomically after each, check off in tasks.md, report per task. After all done: remind to run /sdd-validate in a new session.</p>
<p><strong>Parallel:</strong> create one git worktree per feature, dispatch one backend-builder agent per worktree, monitor and wait for all to complete, then report next steps (review → merge → validate).</p>
<div class="note">⚠ Never start implementing without an approved plan. Never bundle multiple tasks into one commit. If a stack gap is found mid-implementation, stop and surface it — do not proceed silently.</div>
</div>`
  },

  validate: {
    title: '/sdd-validate — SKILL.md',
    html: `
<div class="skill-content">
<div class="fm">
<span class="fm-s">---</span><br>
<span class="fm-k">name:</span> <span class="fm-v">sdd-validate</span><br>
<span class="fm-k">description:</span> Validate a completed feature against its spec, update steering<br>
&nbsp;&nbsp;docs, mark feature status in STATE.md, and update metadata files.<br>
&nbsp;&nbsp;Run in a fresh session after all tasks in tasks.md are complete.<br>
<span class="fm-s">---</span>
</div>
<h2>Phase 1 — Spec conformance (hard gate)</h2>
<ol>
<li>Read specs/[feature]/requirements.md and tasks.md</li>
<li>Verify each Acceptance Criterion by reading source files or running tests via Bash</li>
<li>Confirm each task has a corresponding commit via git log --oneline</li>
<li>Report PASS / FAIL per criterion. Stop on any failure — do not proceed to Phase 2</li>
</ol>
<h2>Phase 2 — Steering doc audit</h2>
<ol>
<li>Read structure.md and tech.md</li>
<li>Scan new files created vs design.md</li>
<li>Update only changed sections — including any stack gap decisions made during design</li>
<li>Mark changes with: &lt;!-- updated: [feature-name] --&gt;</li>
</ol>
<h2>Phase 3 — STATE.md update</h2>
<ol>
<li>Extract last commit hash, run git log {hash}..HEAD --oneline</li>
<li>Move feature to Done, note abandoned tasks with reason, update hash to HEAD</li>
</ol>
<h2>Phase 4 — Project metadata (if files exist)</h2>
<ul>
<li><strong>CHANGELOG.md</strong> — prepend new entry under current date</li>
<li><strong>README.md</strong> — minimum necessary for user-facing changes only</li>
<li><strong>package.json</strong> — ask whether patch or minor bump before writing</li>
</ul>
<div class="note">⚠ Phase 1 is a hard gate. No point updating STATE.md as "implemented" if the feature doesn't pass its own spec. Run in a fresh session — not inline with implementation.</div>
</div>`
  }

};
