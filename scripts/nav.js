// ── ACCORDION ──
function toggleAcc(card) {
  card.classList.toggle('open');
}

// open first card on each page by default
document.addEventListener('DOMContentLoaded', () => {
  const first = document.querySelector('.acc-card');
  if (first) first.classList.add('open');

  // mark active nav link
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
});

// ── MODAL ──
function openModal(skillKey) {
  const data = window.SKILLS_DATA && window.SKILLS_DATA[skillKey];
  if (!data) return;
  document.getElementById('modal-title').textContent = data.title;
  document.getElementById('modal-content').innerHTML = data.html;
  document.getElementById('modal-download').dataset.filename =
    skillKey === 'global' ? 'CLAUDE.md' : `sdd-${skillKey}-SKILL.md`;
  document.getElementById('modal').classList.add('open');
}

function markdownFromNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue
      .replace(/\u00a0/g, '\uE000')
      .replace(/\s+/g, ' ');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const children = Array.from(node.childNodes);
  const content = () => children.map(markdownFromNode).join('');

  switch (node.tagName) {
    case 'BR':
      return '\n';
    case 'H2':
      return `\n## ${content().trim()}\n`;
    case 'P':
      return `\n${content().trim()}\n`;
    case 'DIV':
      return `\n${content().trim()}\n`;
    case 'UL':
    case 'OL': {
      const ordered = node.tagName === 'OL';
      const items = Array.from(node.children).map((item, index) => {
        const marker = ordered ? `${node.start + index}.` : '-';
        return `${marker} ${markdownFromNode(item).trim()}`;
      });
      return `\n${items.join('\n')}\n`;
    }
    case 'STRONG':
    case 'B':
      return `**${content().trim()}**`;
    case 'EM':
    case 'I':
      return `*${content().trim()}*`;
    default:
      return content();
  }
}

function downloadModalMarkdown() {
  const content = document.getElementById('modal-content');
  const downloadButton = document.getElementById('modal-download');
  if (!content || !downloadButton.dataset.filename) {
    throw new Error('Markdown download is not ready.');
  }

  const markdown = markdownFromNode(content)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\uE000/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = downloadButton.dataset.filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});
