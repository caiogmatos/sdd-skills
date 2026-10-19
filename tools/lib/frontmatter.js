'use strict';

const INDICATORS = '[]{},&*!|>%@`';

const SIMPLE_ESCAPES = {
  0: '\0', a: '\x07', b: '\b', t: '\t', n: '\n', v: '\v', f: '\f', r: '\r',
  e: '\x1b', ' ': ' ', '"': '"', '/': '/', '\\': '\\', N: '\x85', _: '\xa0',
  L: ' ', P: ' ', '\t': '\t',
};
const HEX_ESCAPES = { x: 2, u: 4, U: 8 };

/** Parse a quoted scalar at the start of s. Returns { value, rest } or { error }. */
function parseQuoted(s, key) {
  const q = s[0];
  let out = '';
  let i = 1;
  while (i < s.length) {
    const c = s[i];
    if (q === '"' && c === '\\') {
      const n = s[i + 1];
      if (n !== undefined && Object.prototype.hasOwnProperty.call(SIMPLE_ESCAPES, n)) {
        out += SIMPLE_ESCAPES[n];
        i += 2;
        continue;
      }
      if (n !== undefined && Object.prototype.hasOwnProperty.call(HEX_ESCAPES, n)) {
        const len = HEX_ESCAPES[n];
        const hex = s.slice(i + 2, i + 2 + len);
        const cp = parseInt(hex, 16);
        if (hex.length === len && /^[0-9a-fA-F]+$/.test(hex) && cp <= 0x10ffff) {
          out += String.fromCodePoint(cp);
          i += 2 + len;
          continue;
        }
      }
      return {
        error: `invalid escape '\\${n === undefined ? '' : n}' in double-quoted value of '${key}'; use '\\\\' or single quotes`,
      };
    }
    if (q === "'" && c === "'") {
      if (s[i + 1] === "'") {
        out += "'";
        i += 2;
        continue;
      }
      return { value: out, rest: s.slice(i + 1) };
    }
    if (q === '"' && c === '"') return { value: out, rest: s.slice(i + 1) };
    out += c;
    i += 1;
  }
  return { error: 'unterminated quote' };
}

function plainProblem(text) {
  if (text.includes(': ') || text.includes(' #') || text.endsWith(':')) {
    return 'plain value contains ": " or " #" or ends with ":"; wrap it in double quotes';
  }
  if (text[0] === '#' || /^[-?:](\s|$)/.test(text)) {
    return `plain value starts with '${text[0]}' which YAML reads as a comment or indicator; wrap it in double quotes`;
  }
  if (INDICATORS.includes(text[0])) {
    return `plain value starts with the YAML indicator '${text[0]}'; wrap it in double quotes`;
  }
  return null;
}

function parseFrontmatter(text) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const result = { present: false, data: {}, bodyStartLine: 1, errors: [] };
  if (lines[0] !== '---') return result;
  result.present = true;

  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      close = i;
      break;
    }
  }
  if (close === -1) {
    result.errors.push({ line: 1, message: 'frontmatter opened with --- but never closed' });
    result.bodyStartLine = lines.length + 1;
    return result;
  }
  result.bodyStartLine = close + 2;

  const err = (line, message) => result.errors.push({ line, message });
  let last = null; // most recent key entry, for continuations and lists

  for (let i = 1; i < close; i++) {
    const line = i + 1;
    const raw = lines[i];
    if (raw.trim() === '' || /^\s*#/.test(raw)) continue;

    if (/^ *\t/.test(raw)) {
      err(line, 'tab used for indentation');
      continue;
    }
    const indented = /^\s/.test(raw);

    if (indented) {
      const item = /^\s+-\s+(.*)$/.exec(raw);
      if (last && last.list && item) {
        const v = item[1].trim();
        if (v === '') err(line, 'empty list item');
        else {
          if (/^["']/.test(v)) {
            const q = parseQuoted(v, last.key);
            if (q.error) {
              err(line, `list item under '${last.key}': ${q.error}`);
              last.entry.value.push(v);
            } else {
              if (q.rest.trim() !== '' && !/^\s+#/.test(q.rest)) {
                err(line, `list item under '${last.key}': text after the closing quote`);
              }
              last.entry.value.push(q.value);
            }
          } else {
            const p = plainProblem(v);
            if (p) err(line, `list item under '${last.key}': ${p}`);
            last.entry.value.push(v);
          }
        }
        continue;
      }
      if (last && last.plain && !item) {
        const v = raw.trim();
        const p = plainProblem(v);
        if (p) err(line, `continuation of '${last.key}': ${p}`);
        last.entry.value += ' ' + v;
        continue;
      }
      err(line, `unexpected indented line: ${raw.trim()}`);
      continue;
    }

    const m = /^([A-Za-z0-9_-]+):(?: +(.*))?$/.exec(raw);
    if (!m) {
      err(line, `line is not a valid "key: value" entry: ${raw}`);
      last = null;
      continue;
    }
    const key = m[1];
    const rest = (m[2] || '').trim();
    if (Object.prototype.hasOwnProperty.call(result.data, key)) {
      err(line, `duplicate key '${key}'`);
      last = null;
      continue;
    }

    if (rest === '') {
      let j = i + 1;
      while (j < close && (lines[j].trim() === '' || /^\s*#/.test(lines[j]))) j++;
      if (j < close && /^\s+-\s+/.test(lines[j])) {
        const entry = { value: [], quoted: false, line };
        result.data[key] = entry;
        last = { key, entry, list: true };
      } else {
        err(line, `key '${key}' has an empty value`);
        last = null;
      }
      continue;
    }

    if (rest[0] === '"' || rest[0] === "'") {
      const q = parseQuoted(rest, key);
      if (q.error) {
        err(line, q.error.startsWith('invalid') ? q.error : `key '${key}': ${q.error}`);
        last = null;
        continue;
      }
      if (q.rest.trim() !== '' && !/^\s+#/.test(q.rest)) {
        err(line, `key '${key}': text after the closing quote`);
        last = null;
        continue;
      }
      const entry = { value: q.value, quoted: true, line };
      result.data[key] = entry;
      last = { key, entry };
      continue;
    }

    const p = plainProblem(rest);
    if (p) err(line, `key '${key}': ${p}`);
    const entry = { value: rest, quoted: false, line };
    result.data[key] = entry;
    last = { key, entry, plain: true };
  }
  return result;
}

const REQUIRED = {
  skill: ['name', 'description', 'disable-model-invocation'],
  agent: ['name', 'description', 'tools', 'model'],
  template: [],
};

function checkSchema(kind, expectedName, parsed) {
  const problems = [];
  if (kind === 'template') return problems;
  if (!parsed.present) {
    problems.push({ line: 1, message: 'missing frontmatter block' });
    return problems;
  }
  const data = parsed.data;
  const has = (k) => Object.prototype.hasOwnProperty.call(data, k);
  for (const k of REQUIRED[kind] || []) {
    if (!has(k)) {
      problems.push({ line: 1, message: `missing required key '${k}'` });
      continue;
    }
    const v = data[k].value;
    if (v === '' || (Array.isArray(v) && v.length === 0)) {
      problems.push({ line: data[k].line, message: `required key '${k}' is empty` });
    }
  }
  if (kind === 'skill') {
    const d = data['disable-model-invocation'];
    if (d && (d.quoted || d.value !== 'true')) {
      problems.push({
        line: d.line,
        message: "'disable-model-invocation' must be the unquoted value true",
      });
    }
    const a = data['argument-hint'];
    if (a && !a.quoted) {
      problems.push({ line: a.line, message: "'argument-hint' must be quoted" });
    }
  }
  if (has('name') && data.name.value !== expectedName) {
    problems.push({
      line: data.name.line,
      message: `name '${data.name.value}' does not match '${expectedName}'`,
    });
  }
  return problems;
}

module.exports = { parseFrontmatter, checkSchema };
