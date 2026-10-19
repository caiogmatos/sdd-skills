# Tasks: check-script

Read `requirements.md` and `design.md` in this folder first. Names, signatures, regexes and messages come from design.md. Use only `node:` built-in modules, with no `package.json`. All files are CommonJS `.js`.

## Group 1: PARALLEL
- [x] T1: Build the frontmatter parser and schema check
  - Files: `tools/lib/frontmatter.js`, `tools/test/frontmatter.test.js`
  - Do:
    - Implement `parseFrontmatter(text)` and `checkSchema(kind, expectedName, parsed)`, following the "tools/lib/frontmatter.js" section of design.md. That covers the YAML subset, every listed error with its 1-based line, the per-kind schema rules and the name match.
    - Export both functions.
    - Tests:
      - One test per error class listed under AC-6 to AC-10 in the design's verification plan.
      - Positive tests that copy the real frontmatter of `skills/sdd-implement/SKILL.md` (it has `allowed-tools` with `*`) and `agents/sdd-reviewer.md` as inline strings, and expect no problems.
      - A test that a file without frontmatter gives `present: false` and `bodyStartLine: 1`.
  - Check: `node --test tools/test/frontmatter.test.js`
  - Covers: AC-6, AC-7, AC-8, AC-9, AC-10, AC-21

- [x] T2: Build the renderer loader, render check and Markdown lint
  - Files: `tools/lib/markdown.js`, `tools/test/markdown.test.js`
  - Do:
    - Implement `loadRenderer(navJsSource)`, `checkRender(render, text)` and `lintMarkdown(text, bodyStartLine)`, following the "tools/lib/markdown.js" section of design.md.
      - Use `vm` with only the `document.addEventListener` stub.
      - Do not modify `scripts/nav.js`.
      - Track fences the way the renderer does (`/^\s*```/`).
      - Strip inline code and `**bold**` before applying the rule table.
      - Report an unclosed fence at its opening line.
    - Tests:
      - Load the real `scripts/nav.js` (read it with `fs` relative to `__dirname`) and assert that `renderMarkdown('# Hi')` contains `<h1>`.
      - `checkRender` errors for a stub that throws and for one that returns `''`.
      - One failing case per rule in the design table.
      - A fenced block containing every rule, plus a 3-space-indented fence inside a list item, gives no problems.
      - The frontmatter line `allowed-tools: Bash(git status *)` before `bodyStartLine` is not flagged.
  - Check: `node --test tools/test/markdown.test.js`
  - Covers: AC-11, AC-12, AC-13, AC-21

- [x] T3: Build the HTML tag balance, page head and inline attribute checks
  - Files: `tools/lib/html.js`, `tools/test/html.test.js`
  - Do:
    - Implement `checkTags(html)`, `checkPageHead(html)` and `countInlineAttrs(html)`, following the "tools/lib/html.js" section of design.md.
      - Use a single tokenizer that counts lines, skips comments, the doctype, and `<script>`/`<style>` contents, and scans attributes with quotes respected.
      - Handle void elements, `<x/>` on non-void elements, and misnested close tags, which pop down to the matching element.
      - Messages are as written in the design.
    - Tests:
      - Unclosed, stray, misnested, `</br>` and `<div/>` each report the right line.
      - Comments, `<script>` containing `</div>`, `<style>`, void elements and an attribute value containing `>` give no problems.
      - `checkPageHead`: zero titles, two titles, no stylesheet, scripts in the wrong order, and content after the scripts each fail. A minimal valid page passes.
      - `countInlineAttrs` counts `style=` and `onclick=` correctly.
  - Check: `node --test tools/test/html.test.js`
  - Covers: AC-14, AC-15, AC-16, AC-21

- [x] T4: Build the cross-file consistency checks
  - Files: `tools/lib/consistency.js`, `tools/test/consistency.test.js`
  - Do:
    - Implement the following, following the "tools/lib/consistency.js" section of design.md:
      - `loadRegistry`
      - `checkRegistry`
      - `findOpenModalKeys`
      - `checkOpenModalKeys` (use `hasOwnProperty`)
      - `extractNavLinks`
      - `checkNav`
      - `parseInstallNames` (read the blocks by `id="install-ps"` and `id="install-sh"`, decode the basic entities, and add the `sdd-` prefix to skill names)
      - `checkInstallCommands`
    - The module must not import `tools/lib/html.js`.
    - Tests:
      - Load the real `scripts/skills-data.js` and assert that it has 9 keys.
      - One failing and one passing case for each check.
      - The key `toString` is reported as unknown.
      - `parseInstallNames` on the real `global.html` returns the 6 skills and 2 agents for both shells.
      - Removing the PowerShell block makes `ps` null, and the result is the "could not find" problem.
  - Check: `node --test tools/test/consistency.test.js`
  - Covers: AC-17, AC-18, AC-19, AC-20, AC-21

<!-- GATE: Group 1 must be complete before Group 2 -->

## Group 2: PARALLEL
- [x] T5: Wire up tools/check.js and make the real repo pass
  - Files: `tools/check.js`, `tools/test/check.test.js`, plus any content file or page that the first run reports an error in (expected: none)
  - Do:
    - Implement `runChecks(root)` and the CLI branch, following the "tools/check.js" and "Data flow" sections of design.md:
      - file discovery
      - per-file and cross-file checks
      - errors that don't stop the run
      - sorted `path:line: message` output, `warning:` lines and the `check: N files, E errors, W warnings` summary
      - `process.exitCode`
      - `__dirname`-based root, with the `SDD_CHECK_ROOT` override in the CLI branch only
    - Run `node tools/check.js`. If it reports errors on the real repo, decide for each one:
      - Fix the content when it's a genuine problem.
      - Fix the checker when it's a false positive.
      - Note each decision in the commit message.
    - Tests (all from the verification plan for AC-1 to AC-5):
      - `imports only node: built-ins`
      - `real repo passes`
      - `fixture repo fails with every error listed` (build the fixture with `fs.mkdtempSync` under `os.tmpdir()` and remove it afterwards)
      - `warnings don't fail`
      - `runs from another cwd`
  - Check: `node tools/check.js` then `node --test`
  - Covers: AC-1, AC-2, AC-3, AC-4, AC-5, AC-16, AC-21

- [x] T6: Document the check command
  - Files: `CLAUDE.md`, `.claude/steering/tech.md`, `.claude/steering/structure.md`
  - Do:
    - **CLAUDE.md:** replace the Test line under `# Commands` with `` - Test: `node tools/check.js` (site check) and `node --test` (checker's own tests) ``.
    - **tech.md:**
      - Update the "Automated checks" row to say it's implemented in `tools/check.js`, with `node:test` tests in `tools/test/`.
      - Replace the Commands > Test entry with the same two commands.
      - Remove "Not written yet" and "Planned".
    - **structure.md:**
      - Add `tools/` to the tree, with `check.js`, `lib/` and `test/` and one-line descriptions.
      - Replace "Tests and config: none, apart from `.nojekyll`" with a line that points to `tools/`.
      - Note that `tools/lib/consistency.js` depends on `id="install-ps"` and `id="install-sh"` in `global.html` and on the `site-nav` markup. Add it as item 6 under "Paths that other code depends on".
  - Check: `grep -q "node tools/check.js" CLAUDE.md && grep -q "node tools/check.js" .claude/steering/tech.md && grep -q "tools/" .claude/steering/structure.md && ! grep -qi "none yet" CLAUDE.md .claude/steering/tech.md`
  - Covers: AC-22

<!-- GATE: Group 2 must be complete before Group 3 -->

## Group 3: PARALLEL (review fixes)
- [x] T7: Tighten the frontmatter value rules
  - Files: `tools/lib/frontmatter.js`, `tools/test/frontmatter.test.js`
  - Do:
    - Apply the "Review fixes > frontmatter.js" section of design.md:
      - list items parsed like `key: value`
      - the YAML escape set in double-quoted values
      - plain values or continuation lines starting with `#`, `- `, `? ` or `: `
    - Tests:
      - A failing case for each new error: an unclosed quote in a list item, text after the closing quote in a list item, `"C:	ools"`, `description: #1 tool`, `description: - foo`.
      - Passing cases for `"a
b"`, `"é"`, `"C:\tools"` and a quoted list item.
      - The existing positive tests still pass.
  - Check: `node --test tools/test/frontmatter.test.js`
  - Covers: AC-7, AC-8

- [x] T8: Close the nav and modal-key gaps
  - Files: `tools/lib/consistency.js`, `tools/test/consistency.test.js`, `.claude/steering/structure.md`
  - Do:
    - Apply the "Review fixes > consistency.js" section of design.md:
      - `data-modal` keys in `findOpenModalKeys`
      - duplicate, order, dead-link and missing-reference rules in `checkNav`
    - In structure.md item 6, add that modal keys are read from `openModal('...')` calls and `data-modal` attributes.
    - Tests:
      - A `data-modal="reveiwer"` key is reported as unknown, and a valid `data-modal` key passes.
      - A repeated nav link is reported.
      - The order is reported when the lengths differ.
      - A nav link to a page that isn't in `pages` is reported.
      - A missing index.html gives the "could not be compared" problem.
      - The existing tests still pass.
  - Check: `node --test tools/test/consistency.test.js`
  - Covers: AC-18, AC-19

- [x] T9: Exact-case paths, missing SKILL.md and inline SVG
  - Files: `tools/check.js`, `tools/test/check.test.js`, `tools/lib/html.js`, `tools/test/html.test.js`
  - Do:
    - Apply the "Review fixes > check.js and html.js" section of design.md:
      - `existsExactCase` for `SKILL.md` discovery and registry paths
      - the `folder has no SKILL.md` error
      - SVG/MathML self-closing in `checkTags`
    - Tests:
      - **html.test.js:**
        - `<svg><path d="M0 0"/></svg>` gives no problems.
        - `<div/>` outside SVG is still an error.
        - A tag after `</svg>` follows the HTML rules again.
      - **check.test.js:**
        - A fixture skill folder with `Skill.md` instead of `SKILL.md` gives the `folder has no SKILL.md` error.
        - A registry entry whose path differs only in case is reported as missing.
        - The real repo still passes.
  - Check: `node tools/check.js` then `node --test tools/test/check.test.js tools/test/html.test.js`
  - Covers: AC-14, AC-17

- [x] T10: Leave the nav brand link out of the nav list
  - Files: `tools/lib/consistency.js`, `tools/test/consistency.test.js`
  - Do:
    - Apply the "Brand link" rule under "Review fixes > consistency.js" in design.md: `extractNavLinks` skips any `<a>` whose class list contains `nav-brand`.
    - Tests:
      - `extractNavLinks` on the real `index.html` returns 7 hrefs, with `index.html` exactly once.
      - A nav with a brand link plus a duplicated `<li>` link is still reported as a duplicate.
  - Check: `node --test tools/test/consistency.test.js`, and `node tools/check.js` reports no `duplicate nav link` errors
  - Covers: AC-19
