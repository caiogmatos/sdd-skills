# Design: check-script

## Approach

The check is a CommonJS Node script, `tools/check.js`, built from four small library modules under `tools/lib/`. Each module exports pure functions: they take strings (and, where needed, a list of file names) and return arrays of problems. They never read the disk or print anything, so tests can call them directly with inline fixture strings. Only `tools/check.js` touches the filesystem. It finds the files, calls the modules, prints the results and sets the exit code.

The real renderer is used as it is. `scripts/nav.js` is evaluated in a `vm` context whose only stub is `document: { addEventListener() {} }`. Its top-level `function renderMarkdown` then becomes a property of the context. nav.js is not changed. `scripts/skills-data.js` is evaluated the same way with a `{ window: {} }` context to get `SDD_FILES`.

YAML and HTML are parsed only as far as this repo uses them. The parsers are deliberately strict, so anything outside that subset is an error rather than a guess.

## Files

Create:
- `tools/lib/frontmatter.js`: YAML-subset frontmatter parser and schema check (AC-6 to AC-10).
- `tools/lib/markdown.js`: renderer loader, render check and unsupported-syntax lint (AC-11 to AC-13).
- `tools/lib/html.js`: tag balance, page head and script checks, inline attribute count (AC-14 to AC-16).
- `tools/lib/consistency.js`: registry, `openModal` keys, nav, and install commands (AC-17 to AC-20).
- `tools/check.js`: file discovery, orchestration, output and exit code (AC-1 to AC-5).
- `tools/test/frontmatter.test.js`, `tools/test/markdown.test.js`, `tools/test/html.test.js`, `tools/test/consistency.test.js`, `tools/test/check.test.js`: `node:test` suites (AC-21).

Modify:
- `CLAUDE.md`: the Test command (AC-22).
- `.claude/steering/tech.md`: the Commands > Test entry and the "Automated checks" row (AC-22).
- `.claude/steering/structure.md`: add `tools/` to the tree, and replace "Tests and config: none" (keeps the docs in sync).
- Content or pages: only if the first real run reports errors (AC-2). The research below found none.

`tools/` sits outside `scripts/`, because `scripts/` holds browser code that the pages load. GitHub Pages will serve `tools/` too, which does no harm.

## Interfaces

Every check function returns `Problem[]`:

```js
/** @typedef {{ line?: number, message: string }} Problem  // line is 1-based, in the file being checked */
```

`tools/check.js` adds the path and turns each one into `{ path, line?, message, level: 'error' | 'warning' }`.

### tools/lib/frontmatter.js

```js
parseFrontmatter(text) -> {
  present: boolean,            // text starts with a line that is exactly '---'
  data: { [key]: { value: string | string[], quoted: boolean, line: number } },
  bodyStartLine: number,       // 1-based line after the closing '---' (1 if not present)
  errors: Problem[]
}
checkSchema(kind /* 'skill' | 'agent' | 'template' */, expectedName, parsed) -> Problem[]
```

The YAML subset it accepts (CRLF is turned into LF first):
- Blank lines and full-line `# comments`.
- `key: value`, where key is `[A-Za-z0-9_-]+`, followed by a value:
  - **Double-quoted:** `"..."`, with `\"` and `\\` escapes. Nothing but whitespace or ` #comment` may follow the closing quote.
  - **Single-quoted:** `'...'`, with `''` as the escape.
  - **Plain:** any other non-empty text.
- `key:` with an empty value, followed by one or more `  - item` lines (a list).
- A plain value may continue on more-indented lines (folded with a space). The continuation lines are checked with the plain-scalar rules too.

Errors, each with its line:
- Opening `---` with no closing `---` (AC-6).
- A plain value containing `": "` or `" #"`, or ending in `:` (AC-7). The message names the key and suggests quoting it.
- A plain value starting with a YAML indicator: `[ ] { } , & * ! | > % @` or a backtick (AC-8).
- A line that matches none of the forms above, a tab used for indentation, an unterminated quote, text after a closing quote, or a duplicate key (AC-8).
- `key:` with an empty value and no list items (AC-8).

`checkSchema` rules (AC-9 and AC-10):
- **skill:** needs `name`, `description` and `disable-model-invocation`, and the last must be the unquoted value `true`. `argument-hint`, if present, must be quoted. `name` must equal `expectedName` (the folder name).
- **agent:** needs `name`, `description`, `tools` and `model`. `name` must equal `expectedName` (the file name without `.md`).
- **template:** no rules. `templates/CLAUDE.md` has no frontmatter, and that's fine.
- **Any kind:** a missing frontmatter block is an error for skill and agent. A required key with an empty value is an error.

### tools/lib/markdown.js

```js
loadRenderer(navJsSource) -> (markdown: string) => string   // throws if renderMarkdown isn't found
checkRender(render, text) -> Problem[]                      // AC-11
lintMarkdown(text, bodyStartLine) -> Problem[]              // AC-12, AC-13
```

- **`loadRenderer`** does `vm.createContext({ document: { addEventListener() {} } })`, then `vm.runInContext(src, ctx, { filename: 'scripts/nav.js' })`, and returns `ctx.renderMarkdown`.
- **`checkRender`** calls `render(text)`. An exception becomes the problem `renderer threw: <message>`. A result that is empty or only whitespace, when `text.trim()` is non-empty, becomes `renderer produced no output`.
- **`lintMarkdown`** scans the lines from `bodyStartLine` onward, so the frontmatter is skipped. That avoids the `*` in `allowed-tools: Bash(git status *)`. It tracks fences the way the renderer does: a line matching `/^\s*```/` opens or closes a fence. Lines inside a fence are skipped (AC-13).
  - An unclosed fence at the end of the file is reported at its opening line, because the renderer would swallow the rest of the file.
  - On each remaining line, inline code spans (`` `...` ``) and `**bold**` are removed first.
  - The rules below are then applied, giving one problem per line per rule, in the form `unsupported Markdown (<name>): the site renderer shows this as plain text`.

| name | detects (regex on the stripped line) |
|---|---|
| table | `^\s*\|.*\|\s*$` |
| blockquote | `^\s*>` |
| image | `!\[[^\]]*\]\(` |
| link | `\[[^\]]+\]\([^)]+\)` |
| heading level 5+ | `^#{5,}\s` |
| horizontal rule | `^\s*([-*_])(\s*\1){2,}\s*$` |
| setext heading | `^\s*=+\s*$` |
| tilde fence | `^\s*~~~` |
| task checkbox | `^\s*[-*]\s+\[[ xX]\]` |
| plus bullet | `^\s*\+\s` |
| paren ordered item | `^\s*\d+\)\s` |
| italic | `(^\|[\s(])\*[^\s*][^*]*\*(?!\*)` or `(^\|[\s(])_[^\s_][^_]*_(?=$\|[\s).,;:!?])` |

This list comes from the renderer itself (nav.js lines 154–262): headings `#` to `####`, `-`, `*` and `N.` lists, backtick fences, inline code, `**bold**` and bare URLs. Everything else falls through as escaped text. Raw `<tag>` text is not flagged, because the renderer escapes it and shows it literally, which is what the `<feature>` placeholders rely on.

### tools/lib/html.js

```js
checkTags(html) -> Problem[]          // AC-14
checkPageHead(html) -> Problem[]      // AC-15
countInlineAttrs(html) -> { style: number, on: number }   // AC-16
```

- **`checkTags`** tokenizes the page in a single pass while counting lines:
  - It skips `<!-- ... -->` (an unterminated comment is an error) and `<!DOCTYPE ...>`.
  - For `<script>` and `<style>` it skips everything up to the matching close tag.
  - Tags are read with attribute-aware scanning, so a quoted `>` doesn't end a tag. Tag names are compared in lower case.
  - **Void elements** (`area base br col embed hr img input link meta source track wbr`) are never pushed. A closing tag for one, such as `</br>`, is an error.
  - **`<x/>` on a non-void element** is an error, because HTML ignores the slash and leaves the element open.
  - **A close tag that matches the top of the stack** pops it.
  - **A close tag that matches a deeper element** is an error: `misnested </x>; <y> opened at line N is still open`. The stack is popped down to and including x, so one mistake doesn't cascade.
  - **A close tag that matches nothing** is an error: `stray </x>`.
  - **At the end of the file,** each element still open is an error: `unclosed <x>`, at its opening line.
  - Optional closing tags (`</li>`, `</p>` and so on) are required. That is stricter than HTML, but every page already closes them (research count), and it keeps the check simple.
- **`checkPageHead`:**
  - Requires exactly one `<title>`.
  - Requires a `<link rel="stylesheet" href="styles.css">`, with attributes in any order.
  - Requires that the last two `<script src>` tags are `scripts/skills-data.js` and then `scripts/nav.js`, and that only whitespace, `</body>` and `</html>` follow them.
- **`countInlineAttrs`** counts `style=` and `on[a-z]+=` attributes inside tags, using the same tokenizer.

### tools/lib/consistency.js

```js
loadRegistry(skillsDataSource) -> SDD_FILES object          // vm with { window: {} }
checkRegistry(SDD_FILES, existingPaths: string[], contentPaths: string[]) -> Problem[]   // AC-17
findOpenModalKeys(text) -> { key, line }[]                  // /openModal\(\s*['"]([^'"]+)['"]\s*\)/g
checkOpenModalKeys(found, SDD_FILES) -> Problem[]          // AC-18, uses hasOwnProperty, not `in`
extractNavLinks(html) -> string[] | null                    // hrefs of <a> inside <nav class="site-nav">…</nav>, in order
checkNav(navByPage: { [page]: string[] | null }, pages: string[], referencePage = 'index.html') -> { page, problem }[]   // AC-19
parseInstallNames(globalHtml) -> { ps: { skills, agents } | null, sh: { skills, agents } | null }
checkInstallCommands(parsed, skillFolders: string[], agentNames: string[]) -> Problem[]  // AC-20
```

- **`checkRegistry`** reports two kinds of problem:
  - A `path` that is not in `existingPaths`: `registry key '<k>' points to missing <path>`.
  - A content path with no entry: `<path> has no entry in scripts/skills-data.js`.
- **`checkNav`** compares each page's list with index.html's list, in order:
  - Each missing or extra href is a problem, named on the page that has it.
  - A page with no `<nav class="site-nav">` is a problem.
  - A root page that is missing from the reference list is a problem, reported on index.html.
- **`parseInstallNames`** reads the two code blocks by id, `id="install-ps"` and `id="install-sh"`, and decodes `&amp; &lt; &gt; &quot; &#39;`.
  - **PowerShell:** `foreach ($n in <list>)` and `foreach ($a in <list>)`, where the list holds the quoted names.
  - **sh:** `for n in <names>; do` and `for a in <names>; do`.
  - Skill names get the `sdd-` prefix, matching the `sdd-$n` paths in the commands.
  - If a block or loop is missing, that side is `null`, and `checkInstallCommands` reports `could not find the <PowerShell|sh> <skills|agents> loop in global.html`.
- **`checkInstallCommands`** reports each name that is missing or extra, compared as sets: `PowerShell install: skill 'sdd-x' is missing` or `... is not in skills/`.

### tools/check.js

```js
runChecks(root) -> { files: number, problems: { path, line?, message, level }[] }
module.exports = { runChecks };
if (require.main === module) { /* print, exit */ }
```

- **Root:** `path.resolve(__dirname, '..')` (AC-5). The CLI branch alone accepts `process.env.SDD_CHECK_ROOT` as an override, so the tests can point it at a temp fixture repo. `runChecks(root)` always takes the root explicitly.
- **Content files:**
  - `skills/*/SKILL.md` (kind skill, expectedName is the folder name)
  - `agents/*.md` (kind agent, expectedName is the file name without `.md`)
  - `templates/*.md` (kind template)
- **Pages:** `*.html` in the root, not recursive.
- **Output:**
  - Errors first, in path order and then line order, one per line as `path:line: message` (or `path: message` when there is no line).
  - Then warnings, as `warning: path: N inline style, M inline on* attributes (migrate to classes and listeners)`. There is one per page that has any.
  - Then the summary: `check: <files> files, <E> errors, <W> warnings`.
  - Paths use forward slashes.
- **Exit code:** `process.exitCode = errors > 0 ? 1 : 0`.
- **Imports:** only `node:fs`, `node:path` and `node:vm` across `tools/lib` and `tools/check.js`. The tests add `node:test`, `node:assert/strict`, `node:child_process` and `node:os`.

## Data flow

1. `check.js` reads `scripts/nav.js`, then calls `loadRenderer`. If that fails, it records one error for `scripts/nav.js` and skips the render checks.
2. It reads `scripts/skills-data.js`, then calls `loadRegistry`. If that fails, it records one error and skips the registry and `openModal` checks.
3. For each content file:
   1. `parseFrontmatter`, then `checkSchema`.
   2. `checkRender` on the whole text, which is what the modal renders.
   3. `lintMarkdown(text, parsed.bodyStartLine)`.
4. For each page: `checkTags`, `checkPageHead`, `countInlineAttrs` (warning), `findOpenModalKeys` and `extractNavLinks`.
5. `scripts/nav.js` is also passed through `findOpenModalKeys`.
6. Once across files: `checkRegistry`, `checkOpenModalKeys`, `checkNav` and `checkInstallCommands`. The skill folders and agent names come from the directory listing.
7. Sort, print, and set the exit code.

## Edge cases and error handling

- **A file that can't be read**, or a module that throws unexpectedly: the problem is recorded as an error for that path, with the message, and the other checks continue (AC-3).
- **CRLF:** every module normalises `\r\n` to `\n` before counting lines.
- **A frontmatter `---` that isn't on line 1:** it's not frontmatter, which matches the renderer. For skills and agents it is then a "missing frontmatter" error.
- **An indented fence inside a list item**, like sdd-feature lines 36–41: `/^\s*```/` handles it the same way the renderer does.
- **Tables, italics, `# headings` and `- [ ]` inside fences** (sdd-reviewer, sdd-feature, sdd-bootstrap, sdd-startup): they're skipped, so they're not reported (AC-13).
- **`<placeholder>` text** in content isn't HTML-checked. Only `.html` pages go through `checkTags`.
- **`SDD_FILES` keys like `toString`:** the lookup uses `hasOwnProperty`, matching the `if (!file)` behaviour in `openModal`.
- **Box-drawing characters and `$`, `{` or `|` inside `<pre>`:** they're plain text to the tokenizer.

## Stack decisions

- **Node built-ins only** (`fs`, `path`, `vm`, plus `node:test` for tests). This was already confirmed in tech.md. Rejected: js-yaml, an HTML parser and puppeteer, all of which need npm.
- **Run the real renderer with `vm`.** Rejected: copying the renderer, which would break the one-source-of-truth rule, and changing nav.js to export it, which isn't needed because top-level declarations are already reachable.
- **CommonJS `.js` files.** With no `package.json`, `.js` is CommonJS. That keeps `require.main === module` and plain `require` working for the tests. Rejected: `.mjs` (it works, but it gains nothing here).
- **Inline fixture strings in the tests.** Rejected: fixture `.md` and `.html` files, which would also be published on Pages and would be easy to mistake for content.
- **Location `tools/`.** Rejected: `scripts/`, which is browser code loaded by the pages.
- **Minimum Node 18**, for stable `node:test`. Node 21.7.3 was used during design.

## Verification plan

The test command is `node --test`, run from the repo root with no arguments. It picks up `tools/test/*.test.js` by its default patterns on Node 18 and later. The site check is `node tools/check.js`.

- **AC-1:** check.test.js `imports only node: built-ins` greps every `require(` in `tools/lib/*.js` and `tools/check.js` and asserts that each one starts with `node:` or `./`. It also confirms there is no `package.json`.
- **AC-2:** check.test.js `real repo passes` spawns `node tools/check.js`, then asserts exit code 0 and a summary line that matches `/^check: \d+ files, 0 errors, \d+ warnings$/m`.
- **AC-3:** check.test.js `fixture repo fails with every error listed` builds a temp repo with two broken files, spawns check.js against it, and asserts exit code 1 and both `path:line:` lines. It does this through a `SDD_CHECK_ROOT` env override that is read only in the CLI branch. Also, `runChecks` returns more than one problem.
- **AC-4:** check.test.js `warnings don't fail` uses a temp repo whose only problem is an inline style. It asserts exit code 0 and a `warning:` line.
- **AC-5:** check.test.js `runs from another cwd` spawns with `cwd: os.tmpdir()` and asserts the same output as AC-2.
- **AC-6 to AC-10:** frontmatter.test.js has one test per error class: unclosed block; `": "` and `" #"`; bad line; tab; unterminated quote; duplicate key; empty value; missing key per kind; `disable-model-invocation` not `true`; unquoted `argument-hint`; name mismatch. It also has positive tests built from the real frontmatter shapes, including the `allowed-tools` line.
- **AC-11:** markdown.test.js loads the real nav.js, and asserts that `loadRenderer` returns a function and that `checkRender` reports an error for a renderer stub that throws or returns `''`.
- **AC-12:** markdown.test.js has one test per rule in the table.
- **AC-13:** markdown.test.js has a fenced block containing every rule, plus an indented fence, and asserts no problems. It also has an unclosed fence, which is an error.
- **AC-14:** html.test.js covers unclosed, stray, misnested, `</br>` and `<div/>`, and asserts that comments, `<script>`, `<style>`, void elements and a quoted `>` produce no problems.
- **AC-15:** html.test.js covers no or two titles, a missing stylesheet, scripts in the wrong order, and content after the scripts.
- **AC-16:** html.test.js `countInlineAttrs`, plus the check.test.js warning test.
- **AC-17 to AC-20:** consistency.test.js has one test per problem: missing path, unregistered file, unknown key, `toString` key, nav mismatch, page missing from nav, missing nav, and a missing or extra install name in each shell, each with a positive case.
- **AC-21:** `node --test` exits 0.
- **AC-22:** `grep -n "node tools/check.js" CLAUDE.md .claude/steering/tech.md`, plus `grep -c "none yet" CLAUDE.md .claude/steering/tech.md`, which must report 0 for both.

## Review fixes

Added after `/code-review` of the first implementation (b3a2a70..1d5d682). Each item tightens a check so that a real mistake can't pass. Where this section and the sections above disagree, this one wins.

### frontmatter.js (AC-7, AC-8)
- **List items get the same value rules as `key: value`.** A quoted item goes through the quoted-scalar parser, so an unterminated quote or text after the closing quote is an error. A plain item goes through the plain-scalar rules.
- **Double-quoted escapes are limited to the YAML set.** That set is `\0 \a \b \t \n \v \f \r \e \<space> \" \/ \ \N \_ \L \P`, a backslash before a tab character, `\xHH`, `\uHHHH` and `\UHHHHHHHH`. Any other escape is an error: `invalid escape '\c' in double-quoted value of '<key>'; use '\' or single quotes`.
- **More plain values that must be quoted.** A plain value, or a continuation line, that starts with `#` is an error, because YAML reads it as a comment. So is one that starts with `-`, `?` or `:` followed by a space or the end of the line. The message names the key and suggests quoting it.

### consistency.js (AC-18, AC-19)
- **`findOpenModalKeys`** also matches `data-modal="<key>"` and `data-modal='<key>'` attributes. That is the convention for the planned `onclick` migration: a `.skill-btn` gets `data-modal`, and a listener in `nav.js` calls `openModal(el.dataset.modal)`. Both forms are checked against `SDD_FILES`.
- **`checkNav`:**
  - **Duplicate href:** a page whose list contains an href twice gets `duplicate nav link <href>`.
  - **Order:** the order check runs whenever the page has no missing, extra or duplicate links, whatever the list lengths.
  - **Dead link:** each href in the reference list that is a relative `.html` link, after dropping `#…` and `?…`, must be one of `pages`. Otherwise it is reported on the reference page: `nav link <href> points to a page that does not exist`.
  - **Brand link:** `extractNavLinks` skips the `<a class="nav-brand">` link. It points to index.html on every page, alongside the Home link, so it would otherwise always count as a duplicate.
  - **Missing reference page:** if `referencePage` is not in `pages`, the result is one problem on it: `<referencePage> is missing, so the nav could not be compared`.

### check.js and html.js (AC-14, AC-17)
- **Exact-case existence.**
  - A helper `existsExactCase(root, rel)` walks each path segment and compares names with `fs.readdirSync` entries exactly. This catches `Skill.md` vs `SKILL.md` on Windows and macOS, where `fs.existsSync` ignores letter case but GitHub Pages doesn't.
  - It is used for `SKILL.md` discovery and for the registry's existing paths.
- **A skill folder without `SKILL.md`** (exact case) is an error on `skills/<folder>`: `folder has no SKILL.md`. The folder is not counted as a skill for `checkInstallCommands`.
- **Foreign content in `checkTags`.** Inside an `<svg>` or `<math>` element, `<x/>` closes itself and is not an error. Outside them, the void and non-void rules stay as they are.
