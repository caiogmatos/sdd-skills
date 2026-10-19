# Stack
Static HTML · CSS · vanilla JS · no build step · GitHub Pages from `main`

# Commands
- Test: `node tools/check.js` (site check) and `node --test` (checker's own tests)
- Run: open any .html from disk, or `python -m http.server` to load unpushed files
- Deploy: `git push` to main (Pages rebuilds in about a minute)

# Conventions
- `skills/`, `agents/` and `templates/` hold the real files and are the only copy. Never duplicate their text into pages or scripts.
- Renaming or adding one of those files means updating `scripts/skills-data.js`, the install commands in `global.html`, the `openModal()` keys and the folder trees on the pages (see structure.md).
- After editing any frontmatter, check that it parses as YAML. Unquoted descriptions must not contain `": "` or `" #"`.
- New styling goes into `styles.css` as a class; new behaviour goes into `scripts/nav.js` as a listener. When touching a page, migrate its inline `style=""` and `onclick` to classes and listeners.
- Reuse the existing components and numbered colour variants (`--c0`…`--c7`) before adding new ones.
- Adding a page means adding it to the nav on every page.
- Pages are for a public audience: self-contained, no personal shorthand.
- Keep page content in sync with what the skill files actually do.

# NEVER
- Add npm, a package.json, a framework, a bundler or third-party JavaScript
- Delete `.nojekyll` (Pages would turn the .md files into HTML)
- Use Markdown the `nav.js` renderer doesn't support (e.g. tables) in content files without extending the renderer
- Push to main without checking the change, since main is the live site

# Project context (read when relevant)
- .claude/steering/product.md: purpose and users
- .claude/steering/tech.md: stack decisions; read before proposing new technology
- .claude/steering/structure.md: where code lives and which paths other code depends on
- specs/<feature>/: one folder per feature; STATE.md tracks feature status
