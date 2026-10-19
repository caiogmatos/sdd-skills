'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadRenderer, checkRender, lintMarkdown } = require('../lib/markdown.js');

const navSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'nav.js'), 'utf8');

test('loadRenderer loads the real renderer', () => {
  const render = loadRenderer(navSrc);
  assert.equal(typeof render, 'function');
  assert.match(render('# Hi'), /<h1>/);
});

test('loadRenderer throws when renderMarkdown is missing', () => {
  assert.throws(() => loadRenderer('var x = 1;'));
});

test('checkRender reports a throwing renderer', () => {
  const p = checkRender(() => { throw new Error('boom'); }, 'x');
  assert.equal(p.length, 1);
  assert.match(p[0].message, /renderer threw: boom/);
});

test('checkRender reports empty output', () => {
  const p = checkRender(() => '', 'x');
  assert.match(p[0].message, /renderer produced no output/);
});

test('checkRender passes with the real renderer', () => {
  assert.deepEqual(checkRender(loadRenderer(navSrc), '# Hi\n\ntext'), []);
});

const cases = {
  table: '| a | b |',
  blockquote: '> quote',
  image: '![alt](x.png)',
  link: 'see [here](http://x.y)',
  'heading level 5+': '##### Deep',
  'horizontal rule': '---',
  'setext heading': '=====',
  'tilde fence': '~~~',
  'task checkbox': '- [ ] todo',
  'plus bullet': '+ item',
  'paren ordered item': '1) item',
  italic: 'some *emph* text',
};

for (const [name, line] of Object.entries(cases)) {
  test(`lint flags ${name}`, () => {
    const p = lintMarkdown('# Title\n\n' + line + '\n', 1);
    assert.equal(p.length, 1, JSON.stringify(p));
    assert.equal(p[0].line, 3);
    assert.ok(p[0].message.includes(`(${name})`));
  });
}

test('lint flags underscore italic', () => {
  const p = lintMarkdown('some _emph_ text', 1);
  assert.equal(p.length, 1);
  assert.ok(p[0].message.includes('(italic)'));
});

test('lint ignores inline code and bold', () => {
  assert.deepEqual(lintMarkdown('use `*x*` and **bold** and `| a |`\n- item *', 1), []);
});

test('lint ignores everything inside fences, including indented fences', () => {
  const text = [
    '# Title',
    '```',
    ...Object.values(cases),
    '_x_',
    '```',
    '1. item',
    '   ```',
    '   | a | b |',
    '   > q',
    '   ```',
    '- done',
  ].join('\n');
  assert.deepEqual(lintMarkdown(text, 1), []);
});

test('lint reports an unclosed fence at its opening line', () => {
  const p = lintMarkdown('# T\n\n```\ncode\n', 1);
  assert.equal(p.length, 1);
  assert.equal(p[0].line, 3);
  assert.match(p[0].message, /unclosed/);
});

test('lint skips frontmatter before bodyStartLine', () => {
  const text = '---\nname: x\nallowed-tools: Bash(git status *)\n---\n# Body';
  assert.deepEqual(lintMarkdown(text, 5), []);
});
