'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFrontmatter, checkSchema } = require('../lib/frontmatter.js');

const skill = (extra) => `---\nname: sdd-x\ndescription: ok\ndisable-model-invocation: true\n${extra}---\nbody\n`;
const errs = (t) => parseFrontmatter(t).errors;

test('no frontmatter', () => {
  const p = parseFrontmatter('# Title\n');
  assert.equal(p.present, false);
  assert.equal(p.bodyStartLine, 1);
});

test('unclosed block', () => {
  const e = errs('---\nname: a\n');
  assert.equal(e.length, 1);
  assert.equal(e[0].line, 1);
});

test('colon-space in plain value', () => {
  const e = errs('---\nname: a\ndescription: foo: bar\n---\n');
  assert.equal(e.length, 1);
  assert.equal(e[0].line, 3);
  assert.match(e[0].message, /description/);
});

test('space-hash in plain value', () => {
  assert.equal(errs('---\ndescription: foo #bar\n---\n')[0].line, 2);
});

test('plain value ending in colon', () => {
  assert.equal(errs('---\ndescription: foo:\n---\n')[0].line, 2);
});

test('indicator start', () => {
  assert.equal(errs('---\ndescription: *foo\n---\n')[0].line, 2);
  assert.equal(errs('---\ndescription: [a]\n---\n')[0].line, 2);
});

test('bad line', () => {
  assert.equal(errs('---\nname: a\njust text\n---\n')[0].line, 3);
});

test('tab indentation', () => {
  assert.equal(errs('---\nname: a\n\tx: 1\n---\n')[0].line, 3);
});

test('unterminated quote', () => {
  assert.equal(errs('---\nname: "abc\n---\n')[0].line, 2);
});

test('text after closing quote', () => {
  assert.equal(errs('---\nname: "abc" def\n---\n')[0].line, 2);
  assert.deepEqual(errs('---\nname: "abc" # note\n---\n'), []);
});

test('duplicate key', () => {
  assert.equal(errs('---\nname: a\nname: b\n---\n')[0].line, 3);
});

test('empty value without list', () => {
  assert.equal(errs('---\nname:\ndescription: x\n---\n')[0].line, 2);
});

test('list and continuation parse', () => {
  const p = parseFrontmatter('---\ntools:\n  - a\n  - b\ndescription: one\n  two\n---\nx');
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p.data.tools.value, ['a', 'b']);
  assert.equal(p.data.description.value, 'one two');
  assert.equal(p.bodyStartLine, 8);
});

test('quoted escapes', () => {
  const p = parseFrontmatter('---\na: "x \\"y\\""\nb: \'it\'\'s\'\n---\n');
  assert.deepEqual(p.errors, []);
  assert.equal(p.data.a.value, 'x "y"');
  assert.equal(p.data.b.value, "it's");
});

test('skill missing keys', () => {
  const p = parseFrontmatter('---\nname: sdd-x\n---\n');
  const msgs = checkSchema('skill', 'sdd-x', p).map((x) => x.message).join('|');
  assert.match(msgs, /description/);
  assert.match(msgs, /disable-model-invocation/);
});

test('agent missing keys', () => {
  const p = parseFrontmatter('---\nname: a\n---\n');
  const msgs = checkSchema('agent', 'a', p).map((x) => x.message).join('|');
  assert.match(msgs, /tools/);
  assert.match(msgs, /model/);
});

test('missing frontmatter is an error for skill and agent, not template', () => {
  const p = parseFrontmatter('# hi');
  assert.equal(checkSchema('skill', 'x', p).length, 1);
  assert.equal(checkSchema('agent', 'x', p).length, 1);
  assert.deepEqual(checkSchema('template', 'x', p), []);
});

test('disable-model-invocation must be unquoted true', () => {
  for (const v of ['false', '"true"']) {
    const p = parseFrontmatter(`---\nname: sdd-x\ndescription: d\ndisable-model-invocation: ${v}\n---\n`);
    assert.equal(checkSchema('skill', 'sdd-x', p).length, 1, v);
  }
});

test('argument-hint must be quoted', () => {
  const p = parseFrontmatter(skill('argument-hint: foo\n'));
  const pr = checkSchema('skill', 'sdd-x', p);
  assert.equal(pr.length, 1);
  assert.match(pr[0].message, /argument-hint/);
});

test('name mismatch', () => {
  const p = parseFrontmatter(skill(''));
  assert.equal(checkSchema('skill', 'other', p).length, 1);
});

test('empty required value', () => {
  const p = parseFrontmatter('---\nname: sdd-x\ndescription: ""\ndisable-model-invocation: true\n---\n');
  assert.equal(checkSchema('skill', 'sdd-x', p).length, 1);
});

test('real skill frontmatter passes', () => {
  const t = `---
name: sdd-implement
description: Implement one or more approved SDD specs. Acts as coordinator, handing each task to an sdd-implementer subagent with a fresh context, then running its check, committing it and ticking it off. Several features run in parallel worktrees when their files don't overlap. Always presents a plan for approval first.
argument-hint: "[feature] [and feature-b ...]"
disable-model-invocation: true
allowed-tools: Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git add *) Bash(git commit *)
---

body
`;
  const p = parseFrontmatter(t);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(checkSchema('skill', 'sdd-implement', p), []);
});

test('real agent frontmatter passes', () => {
  const t = `---
name: sdd-reviewer
description: Independent, read-only reviewer for SDD. Checks an implemented feature against the acceptance criteria in specs/<feature>/requirements.md and backs every verdict with evidence. Dispatched by /sdd-validate with a feature folder and a commit range.
tools: Read, Glob, Grep, Bash
model: opus
---

You are
`;
  const p = parseFrontmatter(t);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(checkSchema('agent', 'sdd-reviewer', p), []);
});

test('CRLF is handled', () => {
  const p = parseFrontmatter('---\r\nname: a\r\n---\r\nx');
  assert.deepEqual(p.errors, []);
  assert.equal(p.data.name.value, 'a');
});
