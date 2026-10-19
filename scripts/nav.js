// ── ACCORDION ──
function toggleAcc(card) {
  card.classList.toggle('open');
}

document.addEventListener('DOMContentLoaded', () => {
  // open first card on each page by default
  const first = document.querySelector('.acc-card');
  if (first) first.classList.add('open');

  // only the header toggles a card, so selecting or copying text inside doesn't close it
  document.querySelectorAll('.acc-body').forEach(body => {
    body.addEventListener('click', event => event.stopPropagation());
  });

  // mark active nav link
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });

  // copy buttons on install commands
  document.querySelectorAll('[data-copy-target]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      const target = document.getElementById(button.dataset.copyTarget);
      copyText(target.textContent, button);
    });
  });

  injectModal();
});

// ── MODAL ──
function injectModal() {
  if (document.getElementById('modal')) return;
  document.body.insertAdjacentHTML('beforeend', `
<div class="modal-bg" id="modal" onclick="closeModal()">
  <div class="modal" onclick="event.stopPropagation()">
    <div class="modal-head">
      <div class="modal-heading">
        <div class="modal-title" id="modal-title"></div>
        <div class="modal-path" id="modal-path"></div>
      </div>
      <div class="modal-actions">
        <button class="modal-download" id="modal-copy" onclick="copyModalFile()">copy</button>
        <button class="modal-download" id="modal-download" onclick="downloadModalFile()">↓ download</button>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
    </div>
    <div class="modal-body"><div id="modal-content"></div></div>
  </div>
</div>`);
}

const fileCache = {};
let modalFile = null;
let modalRequest = 0;

async function loadFile(path) {
  if (!(path in fileCache)) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    fileCache[path] = await response.text();
  }
  return fileCache[path];
}

function setModalActions(enabled) {
  document.getElementById('modal-copy').disabled = !enabled;
  document.getElementById('modal-download').disabled = !enabled;
}

async function openModal(key) {
  const file = window.SDD_FILES[key];
  if (!file) throw new Error(`Unknown SDD file: ${key}`);

  const request = ++modalRequest;
  modalFile = null;
  document.getElementById('modal-title').textContent = file.title;
  document.getElementById('modal-path').textContent = `save as ${file.installTo}`;
  const content = document.getElementById('modal-content');
  content.innerHTML = '<div class="skill-content"><p>Loading…</p></div>';
  setModalActions(false);
  document.getElementById('modal').classList.add('open');

  try {
    const text = await loadFile(file.path);
    if (request !== modalRequest) return;
    content.innerHTML = `<div class="skill-content">${renderMarkdown(text)}</div>`;
    modalFile = { ...file, text };
    setModalActions(true);
  } catch (error) {
    if (request !== modalRequest) return;
    const fromDisk = location.protocol === 'file:';
    const reason = fromDisk
      ? 'This page was opened straight from disk, so the browser blocks it from loading other files.'
      : `It couldn't be loaded (${escapeHtml(error.message)}).`;
    const githubUrl = `${window.SDD_REPO_URL}/blob/main/${file.path}`;
    content.innerHTML = `<div class="skill-content"><div class="note">${reason}
      Read it on GitHub: <a href="${githubUrl}" target="_blank" rel="noopener">${file.path}</a>${fromDisk
        ? ', or serve this folder locally, for example with <code>python -m http.server</code>.' : '.'}</div></div>`;
  }
}

function downloadModalFile() {
  if (!modalFile) throw new Error('No file is loaded in the modal.');
  const url = URL.createObjectURL(new Blob([modalFile.text], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = modalFile.download;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function copyModalFile() {
  if (!modalFile) throw new Error('No file is loaded in the modal.');
  copyText(modalFile.text, document.getElementById('modal-copy'));
}

function copyText(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const label = button.textContent;
    button.textContent = 'copied ✓';
    setTimeout(() => { button.textContent = label; }, 1500);
  });
}

function closeModal() {
  modalRequest++;
  document.getElementById('modal').classList.remove('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ── MARKDOWN ──
// Renders the subset of Markdown the SDD files use: YAML frontmatter, headings,
// paragraphs, nested lists, fenced code, inline code, bold and links.
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderInline(text) {
  return text.split(/(`[^`]+`)/).map(part => {
    if (part.length > 1 && part.startsWith('`') && part.endsWith('`')) {
      return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
    }
    return escapeHtml(part)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])(https?:\/\/[^\s)<]+[^\s)<.,])/g,
        '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  }).join('');
}

function renderFrontmatter(lines) {
  const rows = lines.map(line => {
    const field = line.match(/^([\w-]+):(.*)$/);
    if (!field) return escapeHtml(line);
    return `<span class="fm-k">${field[1]}:</span><span class="fm-v">${escapeHtml(field[2])}</span>`;
  });
  return `<div class="fm"><span class="fm-s">---</span><br>${rows.join('<br>')}<br><span class="fm-s">---</span></div>`;
}

function renderMarkdown(source) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  const lists = [];
  let paragraph = [];
  let i = 0;

  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeListsDeeperThan = indent => {
    while (lists.length && lists[lists.length - 1].indent > indent) {
      out.push(`</li></${lists.pop().type}>`);
    }
  };

  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) {
      out.push(renderFrontmatter(lines.slice(1, end)));
      i = end + 1;
    }
  }

  for (; i < lines.length; i++) {
    const line = lines[i];
    const indent = line.search(/\S|$/);

    const fence = line.match(/^\s*```/);
    if (fence) {
      flushParagraph();
      if (indent === 0) closeListsDeeperThan(-1);
      const code = [];
      for (i++; i < lines.length && !/^\s*```/.test(lines[i]); i++) {
        code.push(lines[i].slice(Math.min(indent, lines[i].search(/\S|$/))));
      }
      out.push(`<pre class="code-block">${escapeHtml(code.join('\n'))}</pre>`);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeListsDeeperThan(-1);
      const level = heading[1].length;
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const item = line.match(/^(\s*)([-*]|(\d+)\.)\s+(.*)$/);
    if (item) {
      flushParagraph();
      const type = item[3] ? 'ol' : 'ul';
      closeListsDeeperThan(indent);
      const top = lists[lists.length - 1];
      if (top && top.indent === indent && top.type === type) {
        out.push(`</li><li>${renderInline(item[4])}`);
        continue;
      }
      if (top && top.indent === indent) {
        out.push(`</li></${lists.pop().type}>`);
      }
      const start = item[3] && item[3] !== '1' ? ` start="${item[3]}"` : '';
      out.push(`<${type}${start}><li>${renderInline(item[4])}`);
      lists.push({ type, indent });
      continue;
    }

    if (indent === 0) closeListsDeeperThan(-1);
    paragraph.push(line.trim());
  }

  flushParagraph();
  closeListsDeeperThan(-1);
  return out.join('\n');
}
