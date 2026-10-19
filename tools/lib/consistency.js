'use strict';
// Cross-file consistency checks. Pure functions: strings in, problems out.
const vm = require('node:vm');

const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function loadRegistry(skillsDataSource) {
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(skillsDataSource, ctx, { filename: 'scripts/skills-data.js' });
  const reg = ctx.window.SDD_FILES;
  if (!reg || typeof reg !== 'object') throw new Error('window.SDD_FILES not found');
  return reg;
}

function checkRegistry(SDD_FILES, existingPaths, contentPaths) {
  const problems = [];
  const existing = new Set(existingPaths);
  const registered = new Set();
  for (const k of Object.keys(SDD_FILES)) {
    const p = SDD_FILES[k] && SDD_FILES[k].path;
    registered.add(p);
    if (!existing.has(p)) {
      problems.push({ message: `registry key '${k}' points to missing ${p}` });
    }
  }
  for (const p of contentPaths) {
    if (!registered.has(p)) {
      problems.push({ message: `${p} has no entry in scripts/skills-data.js` });
    }
  }
  return problems;
}

function findOpenModalKeys(text) {
  const src = String(text).replace(/\r\n/g, '\n');
  const re = /openModal\(\s*['"]([^'"]+)['"]\s*\)/g;
  const out = [];
  let m;
  while ((m = re.exec(src))) {
    const line = src.slice(0, m.index).split('\n').length;
    out.push({ key: m[1], line });
  }
  return out;
}

function checkOpenModalKeys(found, SDD_FILES) {
  const problems = [];
  for (const { key, line } of found) {
    if (!has(SDD_FILES, key)) {
      problems.push({ line, message: `openModal('${key}') is not a key in scripts/skills-data.js` });
    }
  }
  return problems;
}

function extractNavLinks(html) {
  const m = /<nav\b[^>]*\bclass\s*=\s*["']site-nav["'][^>]*>([\s\S]*?)<\/nav>/i.exec(html);
  if (!m) return null;
  const links = [];
  const re = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let a;
  while ((a = re.exec(m[1]))) links.push(a[1] !== undefined ? a[1] : a[2]);
  return links;
}

function checkNav(navByPage, pages, referencePage = 'index.html') {
  const out = [];
  const ref = navByPage[referencePage];
  for (const page of pages) {
    if (!navByPage[page]) {
      out.push({ page, problem: 'no <nav class="site-nav"> found' });
    }
  }
  if (!ref) return out;
  for (const page of pages) {
    const links = navByPage[page];
    if (!links || page === referencePage) continue;
    for (const h of ref) {
      if (!links.includes(h)) out.push({ page, problem: `nav is missing link to ${h}` });
    }
    for (const h of links) {
      if (!ref.includes(h)) out.push({ page, problem: `nav has extra link to ${h} (not in ${referencePage})` });
    }
    if (ref.length === links.length && ref.every((h) => links.includes(h)) &&
        ref.some((h, i) => links[i] !== h)) {
      out.push({ page, problem: `nav links are in a different order than ${referencePage}` });
    }
  }
  for (const page of pages) {
    if (!ref.includes(page)) {
      out.push({ page: referencePage, problem: `nav does not link to ${page}` });
    }
  }
  return out;
}

function decode(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
}

function blockById(html, id) {
  const re = new RegExp(`<pre\\b[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)</pre>`);
  const m = re.exec(html);
  return m ? decode(m[1]) : null;
}

function names(list, kind) {
  return kind === 'ps'
    ? (list.match(/"([^"]*)"/g) || []).map((s) => s.slice(1, -1))
    : list.split(/\s+/).filter(Boolean);
}

function parseBlock(text, kind) {
  if (text === null) return null;
  let sk, ag;
  if (kind === 'ps') {
    sk = /foreach\s*\(\s*\$n\s+in\s+([^)]*)\)/.exec(text);
    ag = /foreach\s*\(\s*\$a\s+in\s+([^)]*)\)/.exec(text);
  } else {
    sk = /for\s+n\s+in\s+([^;\n]*);\s*do/.exec(text);
    ag = /for\s+a\s+in\s+([^;\n]*);\s*do/.exec(text);
  }
  return {
    skills: sk ? names(sk[1], kind) : null,
    agents: ag ? names(ag[1], kind) : null,
  };
}

function parseInstallNames(globalHtml) {
  const html = String(globalHtml).replace(/\r\n/g, '\n');
  const out = {};
  for (const [side, id] of [['ps', 'install-ps'], ['sh', 'install-sh']]) {
    const p = parseBlock(blockById(html, id), side);
    if (p && p.skills) p.skills = p.skills.map((n) => 'sdd-' + n);
    out[side] = p;
  }
  return out;
}

function checkInstallCommands(parsed, skillFolders, agentNames) {
  const problems = [];
  const sides = [['ps', 'PowerShell'], ['sh', 'sh']];
  const kinds = [
    ['skills', 'skill', skillFolders, 'skills/'],
    ['agents', 'agent', agentNames, 'agents/'],
  ];
  for (const [side, label] of sides) {
    const block = parsed[side];
    for (const [key, noun, actual, dir] of kinds) {
      const listed = block && block[key];
      if (!listed) {
        problems.push({ message: `could not find the ${label} ${key} loop in global.html` });
        continue;
      }
      for (const n of actual) {
        if (!listed.includes(n)) problems.push({ message: `${label} install: ${noun} '${n}' is missing` });
      }
      for (const n of listed) {
        if (!actual.includes(n)) problems.push({ message: `${label} install: ${noun} '${n}' is not in ${dir}` });
      }
    }
  }
  return problems;
}

module.exports = {
  loadRegistry, checkRegistry, findOpenModalKeys, checkOpenModalKeys,
  extractNavLinks, checkNav, parseInstallNames, checkInstallCommands,
};
