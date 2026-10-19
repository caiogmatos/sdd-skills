'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const c = require('../lib/consistency.js');

const root = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('loadRegistry loads the real registry with 9 keys', () => {
  const reg = c.loadRegistry(read('scripts/skills-data.js'));
  assert.equal(Object.keys(reg).length, 9);
});

test('checkRegistry', () => {
  const reg = { a: { path: 'x.md' }, b: { path: 'gone.md' } };
  assert.deepEqual(c.checkRegistry(reg, ['x.md', 'y.md'], ['x.md']).map((p) => p.message),
    ["registry key 'b' points to missing gone.md"]);
  assert.deepEqual(c.checkRegistry(reg, ['x.md', 'gone.md'], ['x.md', 'new.md']).map((p) => p.message),
    ['new.md has no entry in scripts/skills-data.js']);
  assert.deepEqual(c.checkRegistry({ a: { path: 'x.md' } }, ['x.md'], ['x.md']), []);
});

test('findOpenModalKeys reports keys with lines', () => {
  const f = c.findOpenModalKeys('a\n<b onclick="openModal(\'foo\')">\nopenModal( "bar" )');
  assert.deepEqual(f, [{ key: 'foo', line: 2 }, { key: 'bar', line: 3 }]);
});

test('checkOpenModalKeys', () => {
  const reg = { foo: {} };
  assert.deepEqual(c.checkOpenModalKeys([{ key: 'foo', line: 1 }], reg), []);
  const p = c.checkOpenModalKeys([{ key: 'nope', line: 4 }], reg);
  assert.equal(p.length, 1);
  assert.equal(p[0].line, 4);
});

test('checkOpenModalKeys reports toString as unknown', () => {
  assert.equal(c.checkOpenModalKeys([{ key: 'toString', line: 1 }], {}).length, 1);
});

const nav = (hrefs) => `<nav class="site-nav"><ul>${hrefs.map((h) => `<li><a href="${h}">x</a></li>`).join('')}</ul></nav>`;

test('extractNavLinks', () => {
  assert.deepEqual(c.extractNavLinks(nav(['a.html', 'b.html'])), ['a.html', 'b.html']);
  assert.equal(c.extractNavLinks('<p>none</p>'), null);
});

test('checkNav', () => {
  const pages = ['index.html', 'a.html'];
  const ok = { 'index.html': ['index.html', 'a.html'], 'a.html': ['index.html', 'a.html'] };
  assert.deepEqual(c.checkNav(ok, pages), []);
  const missing = { 'index.html': ['index.html', 'a.html'], 'a.html': ['index.html'] };
  assert.deepEqual(c.checkNav(missing, pages).map((p) => p.page), ['a.html']);
  const extra = { 'index.html': ['index.html', 'a.html'], 'a.html': ['index.html', 'a.html', 'z.html'] };
  assert.equal(c.checkNav(extra, pages)[0].page, 'a.html');
  const none = { 'index.html': ['index.html', 'a.html'], 'a.html': null };
  assert.equal(c.checkNav(none, pages)[0].page, 'a.html');
  const unlisted = { 'index.html': ['index.html'], 'a.html': ['index.html'] };
  assert.deepEqual(c.checkNav(unlisted, pages).map((p) => p.page), ['index.html']);
});

test('data-modal keys are checked', () => {
  const f = c.findOpenModalKeys('<a data-modal="reveiwer">\n<b data-modal=\'foo\'>');
  assert.deepEqual(f, [{ key: 'reveiwer', line: 1 }, { key: 'foo', line: 2 }]);
  const p = c.checkOpenModalKeys(f, { foo: {} });
  assert.equal(p.length, 1);
  assert.equal(p[0].line, 1);
});

test('checkNav duplicate, order, dead link and missing reference', () => {
  const pages = ['index.html', 'a.html'];
  const dup = { 'index.html': ['index.html', 'a.html'], 'a.html': ['index.html', 'a.html', 'a.html'] };
  assert.ok(c.checkNav(dup, pages).some((p) => p.page === 'a.html' && /duplicate nav link a\.html/.test(p.problem)));
  const three = ['index.html', 'a.html', 'b.html'];
  const swapped = { 'index.html': three, 'a.html': ['index.html', 'b.html', 'a.html'], 'b.html': three };
  assert.ok(c.checkNav(swapped, three).some((p) => /different order/.test(p.problem)));
  const dead = { 'index.html': ['index.html', 'a.html', 'gone.html#x'], 'a.html': ['index.html', 'a.html', 'gone.html#x'] };
  const dp = c.checkNav(dead, pages);
  assert.equal(dp.length, 1);
  assert.equal(dp[0].page, 'index.html');
  assert.match(dp[0].problem, /does not exist/);
  const noRef = c.checkNav({ 'a.html': ['a.html'] }, ['a.html']);
  assert.equal(noRef.length, 1);
  assert.match(noRef[0].problem, /could not be compared/);
});

test('parseInstallNames on the real global.html', () => {
  const p = c.parseInstallNames(read('global.html'));
  for (const side of ['ps', 'sh']) {
    assert.equal(p[side].skills.length, 6);
    assert.equal(p[side].agents.length, 2);
    assert.ok(p[side].skills.every((n) => n.startsWith('sdd-')));
  }
  const skills = fs.readdirSync(path.join(root, 'skills'));
  const agents = fs.readdirSync(path.join(root, 'agents')).map((f) => f.replace(/\.md$/, ''));
  assert.deepEqual(c.checkInstallCommands(p, skills, agents), []);
});

test('missing PowerShell block gives the could-not-find problem', () => {
  const html = read('global.html').replace('id="install-ps"', 'id="other"');
  const p = c.parseInstallNames(html);
  assert.equal(p.ps, null);
  const msgs = c.checkInstallCommands(p, ['sdd-a'], ['sdd-x']).map((x) => x.message);
  assert.ok(msgs.includes('could not find the PowerShell skills loop in global.html'));
});

test('checkInstallCommands reports missing and extra names', () => {
  const parsed = {
    ps: { skills: ['sdd-a', 'sdd-old'], agents: ['sdd-x'] },
    sh: { skills: ['sdd-a', 'sdd-b'], agents: ['sdd-x', 'sdd-extra'] },
  };
  const msgs = c.checkInstallCommands(parsed, ['sdd-a', 'sdd-b'], ['sdd-x']).map((x) => x.message);
  assert.deepEqual(msgs, [
    "PowerShell install: skill 'sdd-b' is missing",
    "PowerShell install: skill 'sdd-old' is not in skills/",
    "sh install: agent 'sdd-extra' is not in agents/",
  ]);
});
