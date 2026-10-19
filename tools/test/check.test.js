'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runChecks } = require('../check.js');

const repo = path.resolve(__dirname, '..', '..');
const script = path.join(repo, 'tools', 'check.js');

function run(env, cwd) {
  return spawnSync(process.execPath, [script], {
    cwd: cwd || repo,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

function write(root, rel, text) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}

const NAV = '<nav class="site-nav"><a href="index.html">Home</a></nav>';
const page = (extra) => `<!DOCTYPE html>
<html>
<head>
<title>T</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
${NAV}
${extra || ''}
<script src="scripts/skills-data.js"></script>
<script src="scripts/nav.js"></script>
</body>
</html>
`;

function makeRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sdd-check-'));
  const navSrc = fs.readFileSync(path.join(repo, 'scripts', 'nav.js'), 'utf8');
  write(root, 'scripts/nav.js', navSrc);
  write(root, 'scripts/skills-data.js', 'window.SDD_FILES = {};\n');
  for (const [rel, text] of Object.entries(files)) write(root, rel, text);
  return root;
}

test('imports only node: built-ins', () => {
  const dir = path.join(repo, 'tools');
  const targets = [path.join(dir, 'check.js')].concat(
    fs.readdirSync(path.join(dir, 'lib')).filter((f) => f.endsWith('.js')).map((f) => path.join(dir, 'lib', f))
  );
  for (const t of targets) {
    const src = fs.readFileSync(t, 'utf8');
    for (const m of src.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      assert.ok(m[1].startsWith('node:') || m[1].startsWith('./'), `${t} requires ${m[1]}`);
    }
  }
  assert.equal(fs.existsSync(path.join(repo, 'package.json')), false);
});

test('real repo passes', () => {
  const r = run({});
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^check: \d+ files, 0 errors, \d+ warnings$/m);
});

test('fixture repo fails with every error listed', () => {
  const root = makeRepo({
    'agents/sdd-x.md': '---\nname: sdd-x\ndescription: bad: colon\ntools: Read\nmodel: sonnet\n---\nBody\n',
    'index.html': page('<div>\n'),
  });
  try {
    const r = run({ SDD_CHECK_ROOT: root });
    assert.equal(r.status, 1, r.stdout);
    assert.match(r.stdout, /^agents\/sdd-x\.md:3: /m);
    assert.match(r.stdout, /^index\.html:\d+: .*<div> opened at line \d+/m);
    assert.match(r.stdout, /errors, /);
    assert.ok(runChecks(root).problems.filter((p) => p.level === 'error').length > 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("warnings don't fail", () => {
  const root = makeRepo({ 'index.html': page('<p style="color:red">x</p>') });
  try {
    const r = run({ SDD_CHECK_ROOT: root });
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /^warning: index\.html: 1 inline style/m);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('runs from another cwd', () => {
  const r = run({}, os.tmpdir());
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^check: \d+ files, 0 errors, \d+ warnings$/m);
});
