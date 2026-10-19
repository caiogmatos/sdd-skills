# Structure

```text
sdd-skills/
├── index.html              Home: what SDD is, who does what, folder map, skill overview
├── global.html             Setup: install command, global CLAUDE.md, models
├── new-project.html        /sdd-startup guide
├── existing-project.html   /sdd-checkup, /sdd-bootstrap, STATE.md, upgrading
├── workflow.html           Feature loop: cheat sheet, spec, implement, validate, parallel
├── skills.html             Reference card for each skill
├── agents.html             sdd-implementer, sdd-reviewer, built-in agents
├── styles.css              The only stylesheet: tokens, components, modal, responsive rules
├── scripts/
│   ├── skills-data.js      Registry of installable files + repo/raw URLs (window.SDD_FILES)
│   └── nav.js              Accordion, active nav, copy buttons, modal viewer, Markdown renderer
├── skills/<name>/SKILL.md  The six skills (source of truth)
├── agents/<name>.md        The two subagents (source of truth)
├── templates/CLAUDE.md     Global CLAUDE.md template (source of truth)
├── favicon.svg / .png      Robot icon (PNG is the 32px fallback)
├── tools/
│   ├── check.js            Site check entry point (node tools/check.js)
│   ├── lib/                Check modules (frontmatter, render, HTML, consistency)
│   └── test/               node:test tests for the checker
└── .nojekyll               Keeps GitHub Pages from running Jekyll
```

## Where things live
- **Pages**: every page repeats the same `<head>` (charset, viewport, title `X — SDD`, favicons, `styles.css`), the same 7-link `<nav class="site-nav">`, and ends with `scripts/skills-data.js` then `scripts/nav.js`. Adding a page means updating the nav on all pages.
- **Components**: `.accordion` › `.acc-card` (`.acc-header`, `.acc-tag`, `.acc-meta`, `.acc-body`), `.steps` › `.step`, `.chips`, `.infobox`, `.code-block`, `.cmd` + `.copy-btn`, `.skill-btn`, `.ref-table`, `.parallel-card`. Colour variants are numbered 0–7 (`--c0`…`--c7`) with a per-component prefix (`stripe-N`, `skN`, `snN`, `pN`, `tN`, `ncN`, `scN`). Status variants are `ok`, `warn`, `info`, `purple`.
- **Modal**: injected by `nav.js` on every page. `openModal('<key>')` looks the key up in `SDD_FILES`.
- **Tests and config**: the check script and its tests live in `tools/`. The only config file is `.nojekyll`.

## Paths that other code depends on
Renaming or adding a skill, agent or template means updating all of these:
1. `scripts/skills-data.js`: the `path`, `download` and `installTo` entries.
2. `global.html`: the PowerShell and sh install commands (skill names, `skills/sdd-$n/SKILL.md`, agent names, `agents/$a.md`).
3. `openModal('<key>')` calls on the pages.
4. Prose and directory trees on `index.html`, `global.html`, `skills.html` and `agents.html`.
5. Links inside the skills to `global.html`.
6. `tools/lib/consistency.js` depends on `id="install-ps"` and `id="install-sh"` in `global.html` and on the `site-nav` markup.
