'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { checkTags, checkPageHead, countInlineAttrs } = require('../lib/html.js');

test('unclosed element reports its opening line', () => {
  const p = checkTags('<div>\n<p>hi</p>\n');
  assert.equal(p.length, 1);
  assert.equal(p[0].line, 1);
  assert.match(p[0].message, /unclosed <div>/);
});

test('stray close tag', () => {
  const p = checkTags('<p>a</p>\n</div>');
  assert.deepEqual(p.map((x) => x.line), [2]);
  assert.match(p[0].message, /stray <\/div>/);
});

test('misnested close tag pops down to the match', () => {
  const p = checkTags('<div>\n<span>\n</div>\n');
  assert.equal(p.length, 1);
  assert.equal(p[0].line, 3);
  assert.match(p[0].message, /misnested <\/div>; <span> opened at line 2 is still open/);
});

test('closing a void element', () => {
  const p = checkTags('<p>\n</br></p>');
  assert.equal(p.length, 1);
  assert.equal(p[0].line, 2);
  assert.match(p[0].message, /<\/br>/);
});

test('self-closing non-void element', () => {
  const p = checkTags('\n<div/>');
  assert.equal(p[0].line, 2);
  assert.match(p[0].message, /<div\/>/);
});

test('valid markup gives no problems', () => {
  const html = [
    '<!DOCTYPE html>',
    '<!-- <div> in a comment -->',
    '<html><head><meta charset="utf-8"><style>a > b { } </div></style></head>',
    '<body><br><img src="x.png" alt="a > b"><input disabled>',
    '<a title="x > y" href=\'z\'>t</A>',
    '<script>var s = "</div>"; if (1 < 2) {}</script>',
    '</body></html>',
  ].join('\n');
  assert.deepEqual(checkTags(html), []);
});

test('unterminated comment', () => {
  assert.match(checkTags('<p>a</p><!-- x')[0].message, /unterminated comment/);
});

const GOOD = '<html><head><title>T</title><link rel="stylesheet" href="styles.css"></head><body>\n'
  + '<script src="scripts/skills-data.js"></script>\n<script src="scripts/nav.js"></script>\n</body></html>\n';

test('checkPageHead passes a minimal valid page', () => {
  assert.deepEqual(checkPageHead(GOOD), []);
});

test('checkPageHead: zero titles', () => {
  assert.equal(checkPageHead(GOOD.replace('<title>T</title>', '')).length, 1);
});

test('checkPageHead: two titles', () => {
  assert.equal(checkPageHead(GOOD.replace('<title>T</title>', '<title>T</title><title>U</title>')).length, 1);
});

test('checkPageHead: no stylesheet', () => {
  const p = checkPageHead(GOOD.replace('<link rel="stylesheet" href="styles.css">', ''));
  assert.equal(p.length, 1);
  assert.match(p[0].message, /styles\.css/);
});

test('checkPageHead: attributes in any order', () => {
  assert.deepEqual(checkPageHead(GOOD.replace('rel="stylesheet" href="styles.css"', 'href="styles.css" rel="stylesheet"')), []);
});

test('checkPageHead: scripts in the wrong order', () => {
  const bad = GOOD.replace('skills-data.js', 'TMP').replace('nav.js', 'skills-data.js').replace('TMP', 'nav.js');
  assert.equal(checkPageHead(bad).length, 1);
});

test('checkPageHead: content after the scripts', () => {
  const p = checkPageHead(GOOD.replace('</body>', '<p>late</p></body>'));
  assert.equal(p.length, 1);
  assert.match(p[0].message, /after/);
});

test('countInlineAttrs counts style and on* attributes', () => {
  const html = '<div style="a:b" onclick="x()"><p STYLE=x onmouseover="y">text style="no"</p>'
    + '<script>var a = "<b style=1>";</script><a class="onclick" href="#">l</a></div>';
  assert.deepEqual(countInlineAttrs(html), { style: 2, on: 2 });
  assert.deepEqual(countInlineAttrs('<p class="a">x</p>'), { style: 0, on: 0 });
});

test('self-closing tags inside inline svg are allowed', () => {
  assert.deepEqual(checkTags('<svg><path d="M0 0"/></svg>'), []);
});

test('self-closing div outside svg is still an error', () => {
  assert.equal(checkTags('<div/>').length > 0, true);
});

test('HTML rules apply again after </svg>', () => {
  const p = checkTags('<svg><path d="M0 0"/></svg><div/>');
  assert.ok(p.some((x) => /self-closing/.test(x.message)));
});
