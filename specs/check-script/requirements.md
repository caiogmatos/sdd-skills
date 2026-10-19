# Requirements: check-script

A Node script, using built-in modules only, that checks the site for the mistakes that have broken it before. It runs by hand before pushing to `main`, because `main` is the live site.

## User stories

- **US-1.** As the maintainer, I want to run one command before pushing so I know that the skill, agent and template files will parse and render on the live site.
- **US-2.** As the maintainer, I want broken HTML structure caught before it ships, so pages don't silently lose layout.
- **US-3.** As the maintainer, I want the cross-file rules in CLAUDE.md (registry, install commands, `openModal` keys, nav) checked automatically, so renaming or adding a file can't leave one of them stale.
- **US-4.** As an implementer or reviewer subagent, I want a single test command with a pass/fail exit code, so I can prove that a change didn't break the site.

## Acceptance criteria

### Running

- **AC-1.** `node <check script>` runs from the repo root with no `package.json`, no `node_modules` and no network access. The script imports only `node:` built-in modules (verifiable with a grep of its import and require statements).
- **AC-2.** On the current `main` content (after any fixes this feature makes), the script exits with code 0 and prints a one-line summary with the counts of files checked, errors and warnings.
- **AC-3.** If any error is found, the script exits with code 1. It reports every error, not only the first. Each one is printed as `<path>[:<line>]: <message>`, with the path relative to the repo root.
- **AC-4.** Warnings are printed with a `warning:` prefix and never change the exit code.
- **AC-5.** The script gives the same result when run from a directory other than the repo root (it resolves paths from its own location).

### Frontmatter

- **AC-6.** Every `skills/*/SKILL.md`, `agents/*.md` and `templates/CLAUDE.md` that starts with `---` has a closing `---`. If it doesn't, the script reports an error.
- **AC-7.** An unquoted scalar value that contains `": "` or `" #"` is reported as an error that names the key and the line.
- **AC-8.** A frontmatter line that isn't a valid `key: value` pair, list item, or continuation of the YAML subset these files use is reported as an error. So are duplicate keys and unterminated quotes.
- **AC-9.** Skill frontmatter must have `name`, `description` and `disable-model-invocation: true`. `argument-hint`, if present, must be quoted. Agent frontmatter must have `name`, `description`, `tools` and `model`. Each missing or wrong key is an error.
- **AC-10.** A skill's `name` must equal its folder name, and an agent's `name` must equal its file name without `.md`. A mismatch is an error.

### Rendering

- **AC-11.** The Markdown renderer from `scripts/nav.js` (the real code, not a copy) is run on every skill, agent and template file. Any exception, or empty output for a non-empty file, is an error.
- **AC-12.** A content file that uses Markdown syntax the renderer doesn't support (at least tables; design.md gives the full list, taken from the renderer) is reported as an error with the line, outside fenced code blocks.
- **AC-13.** A Markdown construct inside a fenced code block is never reported under AC-12.

### Page structure

- **AC-14.** For every `*.html` file in the repo root, an unclosed element, a stray closing tag or a misnested pair is reported as an error with the line. Void elements (`<br>`, `<img>`, `<meta>`, `<link>`, `<input>`, `<hr>` and so on), comments, and the contents of `<script>` and `<style>` don't cause false errors.
- **AC-15.** Each page has exactly one `<title>`, the stylesheet link to `styles.css`, and ends by loading `scripts/skills-data.js` before `scripts/nav.js`. A violation is an error.
- **AC-16.** Each inline `style="…"` and `on<event>="…"` attribute on a page is counted, and the count is reported as one warning per page that has any.

### Cross-file consistency

- **AC-17.** Every `path` in `scripts/skills-data.js` points to an existing file. Every `skills/*/SKILL.md`, `agents/*.md` and `templates/CLAUDE.md` has a registry entry. Either violation is an error.
- **AC-18.** Every `openModal('<key>')` used in an `.html` page or in `scripts/nav.js` names a key that exists in `SDD_FILES`. An unknown key is an error that gives the page and line.
- **AC-19.** Every page's `<nav class="site-nav">` has the same set of link targets in the same order, and every root `*.html` page appears in it. A difference is an error that names the page and the missing or extra link.
- **AC-20.** The skill names and agent names in `global.html`'s PowerShell and sh install commands each equal the set of folders in `skills/` and files in `agents/`. Each missing or extra name is an error that names the command (PowerShell or sh).

### Self-test and docs

- **AC-21.** The check logic has automated tests (Node's built-in `node:test`) with fixtures that prove each error class from AC-6 to AC-20 is detected. A single command runs them and exits 0.
- **AC-22.** `CLAUDE.md` and `.claude/steering/tech.md` list the check command as the Test command, replacing "none yet".

## Out of scope

- Running in CI (GitHub Actions) or as a git hook. It runs by hand only.
- npm, `package.json` or any third-party module, including a YAML or HTML parser library.
- Full YAML or HTML spec compliance. Only the subset this repo uses is parsed.
- Visual or browser rendering checks (screenshots, a headless browser).
- Checking external links or anything that needs the network.
- Failing on inline `style`/`onclick`. They are warnings only, until the migration is done.
- Fixing every warning the first run finds. Errors found on the current content are fixed so that AC-2 holds.
- Checking that the prose on the pages matches what the skills do.
