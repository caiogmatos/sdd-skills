# Tech

## Decisions

| Area | Decision | Source |
|---|---|---|
| Site type | Static HTML, CSS and vanilla JavaScript. No framework, bundler, package manager or build step. | inferred from code |
| Hosting | GitHub Pages from the root of `main` in `caiogmatos/sdd-skills`. Pushing to `main` deploys. `.nojekyll` disables Jekyll so `.md` files with frontmatter are served raw. | inferred from code |
| Content source of truth | `skills/*/SKILL.md`, `agents/*.md` and `templates/CLAUDE.md` are the real files. The site fetches them at runtime; nothing duplicates their text. | inferred from code |
| File registry | `scripts/skills-data.js` maps each key to `path`, `download` filename and `installTo`, plus `SDD_REPO_URL` and `SDD_RAW_URL`. | inferred from code |
| Viewing modes | Over HTTP the viewer fetches files from the same origin. Opened from disk (`file:`) it fetches from `raw.githubusercontent.com` and says so. Both are supported. | inferred from code |
| Markdown rendering | A small hand-written renderer in `scripts/nav.js` (frontmatter, headings, nested lists, fenced code, inline code, bold, links). No Markdown library. Tables and other syntax are not supported. | inferred from code |
| Install | Commands on `global.html` (PowerShell and sh) download skills and agents from `raw.githubusercontent.com/.../main`. They don't install `templates/CLAUDE.md`. | inferred from code |
| External resources | Google Fonts only (IBM Plex Mono, Space Grotesk, via `@import` in `styles.css`). No third-party JavaScript. | inferred from code |
| Theme | Dark only. Colour tokens on `:root`, no `prefers-color-scheme` handling. | inferred from code |
| Automated checks | A Node script using only Node built-in modules: no `package.json`, no dependencies. Not written yet. | confirmed by user |
| Markup direction | New styling goes into `styles.css` as classes and new behaviour into `nav.js` listeners. Existing inline `style=""` and `onclick` are migrated to classes and listeners over time. | confirmed by user |

## Rejected alternatives
- **npm-based tooling** (js-yaml, puppeteer) for checks: rejected in favour of Node built-ins only, to keep the repo free of dependencies. *(confirmed by user)*
- **Embedding skill text in JavaScript**: the original site did this. It was replaced by fetching the real files, so downloads are exact and there is one source of truth. *(inferred from git history)*

## Commands
- **Test**: none yet. Planned: a Node built-ins check script (frontmatter parses as YAML, every content file renders, every page has balanced tags).
- **Run locally**: open any `.html` file from disk (the viewer falls back to GitHub), or serve the folder with `python -m http.server` to load local, unpushed files.
- **Deploy**: `git push` to `main`. GitHub Pages rebuilds in about a minute.

## Constraints
- **YAML frontmatter**: unquoted `description` values must not contain `": "` or `" #"`. This broke parsing twice. Quote the value or rephrase.
- **Skill frontmatter**: `name`, `description`, `disable-model-invocation: true`, and optionally `argument-hint` (quoted) and `allowed-tools`. Agent frontmatter: `name`, `description`, `tools`, `model`.
- **Absolute URL in skills**: the skills link to `https://caiogmatos.github.io/sdd-skills/global.html` for installing agents.
