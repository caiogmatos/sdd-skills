'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parseFrontmatter, checkSchema } = require('./lib/frontmatter.js');
const { loadRenderer, checkRender, lintMarkdown } = require('./lib/markdown.js');
const { checkTags, checkPageHead, countInlineAttrs } = require('./lib/html.js');
const C = require('./lib/consistency.js');

// Like fs.existsSync, but every path segment must match the on-disk name exactly.
function existsExactCase(root, rel) {
  let dir = root;
  for (const seg of String(rel).split(/[\\/]+/).filter(Boolean)) {
    let names;
    try { names = fs.readdirSync(dir); } catch (e) { return false; }
    if (!names.includes(seg)) return false;
    dir = path.join(dir, seg);
  }
  return true;
}

function runChecks(root) {
  const problems = [];
  let files = 0;
  const add = (p, list, level) => {
    for (const x of list) problems.push({ path: p, line: x.line, message: x.message, level: level || 'error' });
  };
  const err = (p, message) => add(p, [{ message }]);
  const guard = (p, fn) => {
    try { fn(); } catch (e) { err(p, `check failed unexpectedly: ${e && e.message}`); }
  };
  const read = (rel) => {
    try { return fs.readFileSync(path.join(root, rel), 'utf8'); } catch (e) {
      err(rel, `cannot read file: ${e.message}`);
      return null;
    }
  };
  const list = (rel) => {
    try { return fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch (e) { return []; }
  };

  // Renderer and registry
  let render = null;
  const navSrc = read('scripts/nav.js');
  if (navSrc !== null) {
    files++;
    try { render = loadRenderer(navSrc); } catch (e) { err('scripts/nav.js', `cannot load renderer: ${e.message}`); }
  }
  let registry = null;
  const dataSrc = read('scripts/skills-data.js');
  if (dataSrc !== null) {
    files++;
    try { registry = C.loadRegistry(dataSrc); } catch (e) { err('scripts/skills-data.js', `cannot load registry: ${e.message}`); }
  }

  // Content files
  const content = [];
  const skillFolders = list('skills').filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const skillNames = [];
  for (const f of skillFolders) {
    if (existsExactCase(root, `skills/${f}/SKILL.md`)) {
      skillNames.push(f);
      content.push({ rel: `skills/${f}/SKILL.md`, kind: 'skill', name: f });
    } else {
      err(`skills/${f}`, 'folder has no SKILL.md');
    }
  }
  const agentNames = [];
  for (const d of list('agents')) {
    if (d.isFile() && d.name.endsWith('.md')) {
      const n = d.name.slice(0, -3);
      agentNames.push(n);
      content.push({ rel: `agents/${d.name}`, kind: 'agent', name: n });
    }
  }
  for (const d of list('templates')) {
    if (d.isFile() && d.name.endsWith('.md')) content.push({ rel: `templates/${d.name}`, kind: 'template', name: d.name });
  }
  for (const c of content) {
    const text = read(c.rel);
    if (text === null) continue;
    files++;
    guard(c.rel, () => {
      const parsed = parseFrontmatter(text);
      add(c.rel, parsed.errors);
      add(c.rel, checkSchema(c.kind, c.name, parsed));
      if (render) add(c.rel, checkRender(render, text));
      add(c.rel, lintMarkdown(text, parsed.bodyStartLine));
    });
  }

  // Pages
  const pages = list('.').filter((d) => d.isFile() && d.name.endsWith('.html')).map((d) => d.name).sort();
  const navByPage = {};
  const modalKeys = [];
  let globalHtml = null;
  for (const p of pages) {
    const html = read(p);
    if (html === null) continue;
    files++;
    if (p === 'global.html') globalHtml = html;
    guard(p, () => {
      add(p, checkTags(html));
      add(p, checkPageHead(html));
      const cnt = countInlineAttrs(html);
      if (cnt.style > 0 || cnt.on > 0) {
        add(p, [{ message: `${cnt.style} inline style, ${cnt.on} inline on* attributes (migrate to classes and listeners)` }], 'warning');
      }
      for (const k of C.findOpenModalKeys(html)) modalKeys.push({ path: p, ...k });
      navByPage[p] = C.extractNavLinks(html);
    });
  }
  if (navSrc !== null) {
    guard('scripts/nav.js', () => {
      for (const k of C.findOpenModalKeys(navSrc)) modalKeys.push({ path: 'scripts/nav.js', ...k });
    });
  }

  // Cross-file
  if (registry) {
    guard('scripts/skills-data.js', () => {
      const existing = [];
      for (const v of Object.values(registry)) {
        if (v && typeof v.path === 'string' && existsExactCase(root, v.path)) existing.push(v.path);
      }
      add('scripts/skills-data.js', C.checkRegistry(registry, existing, content.map((c) => c.rel)));
    });
    guard('scripts/skills-data.js', () => {
      const byPath = new Map();
      for (const k of modalKeys) {
        if (!byPath.has(k.path)) byPath.set(k.path, []);
        byPath.get(k.path).push({ key: k.key, line: k.line });
      }
      for (const [p, found] of byPath) add(p, C.checkOpenModalKeys(found, registry));
    });
  }
  guard('index.html', () => {
    for (const r of C.checkNav(navByPage, pages)) err(r.page, r.problem);
  });
  if (globalHtml !== null) {
    guard('global.html', () => {
      add('global.html', C.checkInstallCommands(C.parseInstallNames(globalHtml), skillNames, agentNames));
    });
  }

  return { files, problems };
}

module.exports = { runChecks };

if (require.main === module) {
  const root = process.env.SDD_CHECK_ROOT
    ? path.resolve(process.env.SDD_CHECK_ROOT)
    : path.resolve(__dirname, '..');
  const { files, problems } = runChecks(root);
  const fmt = (p) => `${p.path}${p.line ? ':' + p.line : ''}: ${p.message}`;
  const cmp = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : (a.line || 0) - (b.line || 0));
  const errors = problems.filter((p) => p.level === 'error').sort(cmp);
  const warnings = problems.filter((p) => p.level === 'warning').sort(cmp);
  for (const e of errors) console.log(fmt(e));
  for (const w of warnings) console.log(`warning: ${fmt(w)}`);
  console.log(`check: ${files} files, ${errors.length} errors, ${warnings.length} warnings`);
  process.exitCode = errors.length > 0 ? 1 : 0;
}
