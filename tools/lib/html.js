'use strict';

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);

/**
 * Single-pass tokenizer. Returns { tokens, problems }.
 * token: { name, close, selfClose, attrs: [{name, value}], line, start, end }
 */
function tokenize(input) {
  const html = String(input).replace(/\r\n/g, '\n');
  const tokens = [];
  const problems = [];
  let i = 0;
  let line = 1;
  let counted = 0;
  const lineAt = (idx) => {
    for (; counted < idx; counted++) if (html[counted] === '\n') line++;
    return line;
  };
  const n = html.length;

  while (i < n) {
    const lt = html.indexOf('<', i);
    if (lt === -1) break;
    i = lt;
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      if (end === -1) {
        problems.push({ line: lineAt(i), message: 'unterminated comment' });
        break;
      }
      i = end + 3;
      continue;
    }
    if (html[i + 1] === '!' || html[i + 1] === '?') {
      const end = html.indexOf('>', i);
      if (end === -1) break;
      i = end + 1;
      continue;
    }
    const m = /^<(\/?)([A-Za-z][A-Za-z0-9:-]*)/.exec(html.slice(i, i + 80));
    if (!m) { i++; continue; }
    const start = i;
    const tagLine = lineAt(start);
    const close = m[1] === '/';
    const name = m[2].toLowerCase();
    let p = start + m[0].length;
    const attrs = [];
    let selfClose = false;
    let ended = false;
    while (p < n) {
      while (p < n && /\s/.test(html[p])) p++;
      if (p >= n) break;
      if (html[p] === '>') { p++; ended = true; break; }
      if (html[p] === '/' && html[p + 1] === '>') { selfClose = true; p += 2; ended = true; break; }
      if (html[p] === '/') { p++; continue; }
      let q = p;
      while (q < n && !/[\s=>]/.test(html[q]) && !(html[q] === '/' && html[q + 1] === '>')) q++;
      const attrName = html.slice(p, q).toLowerCase();
      p = q;
      let value = '';
      let r = p;
      while (r < n && /\s/.test(html[r])) r++;
      if (html[r] === '=') {
        r++;
        while (r < n && /\s/.test(html[r])) r++;
        if (html[r] === '"' || html[r] === "'") {
          const quote = html[r];
          const e = html.indexOf(quote, r + 1);
          if (e === -1) { p = n; break; }
          value = html.slice(r + 1, e);
          p = e + 1;
        } else {
          let e = r;
          while (e < n && !/[\s>]/.test(html[e])) e++;
          value = html.slice(r, e);
          p = e;
        }
      }
      if (attrName) attrs.push({ name: attrName, value });
    }
    if (!ended) {
      problems.push({ line: tagLine, message: `unterminated tag <${name}` });
      break;
    }
    const tok = { name, close, selfClose, attrs, line: tagLine, start, end: p };
    tokens.push(tok);
    i = p;
    if (!close && !selfClose && (name === 'script' || name === 'style')) {
      const re = new RegExp('</' + name + '\\s*>', 'ig');
      re.lastIndex = i;
      const cm = re.exec(html);
      if (!cm) {
        problems.push({ line: tagLine, message: `unclosed <${name}>` });
        tok.unterminatedRaw = true;
        i = n;
      } else {
        tokens.push({ name, close: true, selfClose: false, attrs: [], line: lineAt(cm.index), start: cm.index, end: cm.index + cm[0].length });
        i = cm.index + cm[0].length;
      }
    }
  }
  return { tokens, problems, html };
}

function checkTags(html) {
  const { tokens, problems: tokProblems } = tokenize(html);
  const problems = [...tokProblems];
  const stack = [];
  for (const t of tokens) {
    if (t.close) {
      if (VOID.has(t.name)) {
        problems.push({ line: t.line, message: `</${t.name}> is a closing tag for a void element` });
        continue;
      }
      let idx = -1;
      for (let k = stack.length - 1; k >= 0; k--) if (stack[k].name === t.name) { idx = k; break; }
      if (idx === -1) {
        problems.push({ line: t.line, message: `stray </${t.name}>` });
      } else if (idx === stack.length - 1) {
        stack.pop();
      } else {
        const open = stack[stack.length - 1];
        problems.push({ line: t.line, message: `misnested </${t.name}>; <${open.name}> opened at line ${open.line} is still open` });
        stack.length = idx;
      }
    } else if (t.selfClose && stack.some((s) => s.name === 'svg' || s.name === 'math')) {
      // foreign content: <x/> closes itself
    } else if (VOID.has(t.name)) {
      // never pushed
    } else if (t.selfClose) {
      problems.push({ line: t.line, message: `<${t.name}/> self-closing syntax is ignored by HTML; the element stays open` });
    } else if (!t.unterminatedRaw) {
      stack.push(t);
    }
  }
  for (const open of stack) {
    problems.push({ line: open.line, message: `unclosed <${open.name}>` });
  }
  return problems.sort((a, b) => (a.line || 0) - (b.line || 0));
}

function attr(tok, name) {
  const a = tok.attrs.find((x) => x.name === name);
  return a ? a.value : undefined;
}

function checkPageHead(input) {
  const { tokens, html } = tokenize(input);
  const problems = [];
  const titles = tokens.filter((t) => t.name === 'title' && !t.close);
  if (titles.length !== 1) {
    problems.push({ line: titles[1] ? titles[1].line : undefined, message: `expected exactly one <title>, found ${titles.length}` });
  }
  const hasCss = tokens.some((t) => t.name === 'link' && !t.close
    && (attr(t, 'rel') || '').toLowerCase() === 'stylesheet' && attr(t, 'href') === 'styles.css');
  if (!hasCss) problems.push({ message: 'missing <link rel="stylesheet" href="styles.css">' });

  const scripts = tokens.filter((t) => t.name === 'script' && !t.close && attr(t, 'src') !== undefined);
  const last2 = scripts.slice(-2);
  if (last2.length < 2 || attr(last2[0], 'src') !== 'scripts/skills-data.js' || attr(last2[1], 'src') !== 'scripts/nav.js') {
    problems.push({
      line: last2.length ? last2[last2.length - 1].line : undefined,
      message: 'the last two scripts must be scripts/skills-data.js then scripts/nav.js',
    });
  } else {
    const lastTok = last2[1];
    const closeTok = tokens.find((t) => t.close && t.name === 'script' && t.start > lastTok.start);
    const after = html.slice(closeTok ? closeTok.end : lastTok.end);
    if (!/^\s*(<\/body>\s*)?(<\/html>\s*)?$/i.test(after)) {
      problems.push({ line: lastTok.line, message: 'content found after the final scripts/nav.js script (only </body> and </html> may follow)' });
    }
  }
  return problems;
}

function countInlineAttrs(input) {
  const { tokens } = tokenize(input);
  let style = 0;
  let on = 0;
  for (const t of tokens) {
    if (t.close) continue;
    for (const a of t.attrs) {
      if (a.name === 'style') style++;
      else if (/^on[a-z]+$/.test(a.name)) on++;
    }
  }
  return { style, on };
}

module.exports = { checkTags, checkPageHead, countInlineAttrs };
