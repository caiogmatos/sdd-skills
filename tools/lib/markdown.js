'use strict';

const vm = require('node:vm');

/** Evaluate scripts/nav.js with a stubbed document and return its renderMarkdown function. */
function loadRenderer(navJsSource) {
  const ctx = vm.createContext({ document: { addEventListener() {} } });
  vm.runInContext(navJsSource, ctx, { filename: 'scripts/nav.js' });
  if (typeof ctx.renderMarkdown !== 'function') {
    throw new Error('renderMarkdown not found in scripts/nav.js');
  }
  return ctx.renderMarkdown;
}

function checkRender(render, text) {
  let out;
  try {
    out = render(text);
  } catch (e) {
    return [{ message: 'renderer threw: ' + (e && e.message ? e.message : String(e)) }];
  }
  if (text.trim() !== '' && (typeof out !== 'string' || out.trim() === '')) {
    return [{ message: 'renderer produced no output' }];
  }
  return [];
}

const RULES = [
  ['table', /^\s*\|.*\|\s*$/],
  ['blockquote', /^\s*>/],
  ['image', /!\[[^\]]*\]\(/],
  ['link', /(?<!!)\[[^\]]+\]\([^)]+\)/],
  ['heading level 5+', /^#{5,}\s/],
  ['horizontal rule', /^\s*([-*_])(\s*\1){2,}\s*$/],
  ['setext heading', /^\s*=+\s*$/],
  ['tilde fence', /^\s*~~~/],
  ['task checkbox', /^\s*[-*]\s+\[[ xX]\]/],
  ['plus bullet', /^\s*\+\s/],
  ['paren ordered item', /^\s*\d+\)\s/],
  ['italic', /(^|[\s(])\*[^\s*][^*]*\*(?!\*)/],
  ['italic', /(^|[\s(])_[^\s_][^_]*_(?=$|[\s).,;:!?])/],
];

function lintMarkdown(text, bodyStartLine) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const problems = [];
  let fenceOpenLine = 0;
  const start = Math.max(1, bodyStartLine || 1);
  for (let i = start - 1; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*```/.test(raw)) {
      fenceOpenLine = fenceOpenLine ? 0 : i + 1;
      continue;
    }
    if (fenceOpenLine) continue;
    const line = raw.replace(/`[^`]*`/g, '').replace(/\*\*[^*]+\*\*/g, '');
    const seen = new Set();
    for (const [name, re] of RULES) {
      if (seen.has(name) || !re.test(line)) continue;
      seen.add(name);
      problems.push({
        line: i + 1,
        message: `unsupported Markdown (${name}): the site renderer shows this as plain text`,
      });
    }
  }
  if (fenceOpenLine) {
    problems.push({
      line: fenceOpenLine,
      message: 'unclosed code fence: the renderer treats the rest of the file as code',
    });
  }
  return problems;
}

module.exports = { loadRenderer, checkRender, lintMarkdown };
