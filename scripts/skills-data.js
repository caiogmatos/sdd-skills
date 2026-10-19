// Registry of the installable files. The files themselves live in the repo
// (skills/, agents/, templates/) and are the single source of truth: the modal
// fetches them, and the install commands download the same files from GitHub.
window.SDD_FILES = {
  global: {
    title: '~/.claude/CLAUDE.md (global template)',
    path: 'templates/CLAUDE.md',
    download: 'CLAUDE.md',
    installTo: '~/.claude/CLAUDE.md'
  },
  startup: {
    title: '/sdd-startup',
    path: 'skills/sdd-startup/SKILL.md',
    download: 'sdd-startup-SKILL.md',
    installTo: '~/.claude/skills/sdd-startup/SKILL.md'
  },
  bootstrap: {
    title: '/sdd-bootstrap',
    path: 'skills/sdd-bootstrap/SKILL.md',
    download: 'sdd-bootstrap-SKILL.md',
    installTo: '~/.claude/skills/sdd-bootstrap/SKILL.md'
  },
  checkup: {
    title: '/sdd-checkup',
    path: 'skills/sdd-checkup/SKILL.md',
    download: 'sdd-checkup-SKILL.md',
    installTo: '~/.claude/skills/sdd-checkup/SKILL.md'
  },
  feature: {
    title: '/sdd-feature',
    path: 'skills/sdd-feature/SKILL.md',
    download: 'sdd-feature-SKILL.md',
    installTo: '~/.claude/skills/sdd-feature/SKILL.md'
  },
  implement: {
    title: '/sdd-implement',
    path: 'skills/sdd-implement/SKILL.md',
    download: 'sdd-implement-SKILL.md',
    installTo: '~/.claude/skills/sdd-implement/SKILL.md'
  },
  validate: {
    title: '/sdd-validate',
    path: 'skills/sdd-validate/SKILL.md',
    download: 'sdd-validate-SKILL.md',
    installTo: '~/.claude/skills/sdd-validate/SKILL.md'
  },
  implementer: {
    title: 'sdd-implementer (agent)',
    path: 'agents/sdd-implementer.md',
    download: 'sdd-implementer.md',
    installTo: '~/.claude/agents/sdd-implementer.md'
  },
  reviewer: {
    title: 'sdd-reviewer (agent)',
    path: 'agents/sdd-reviewer.md',
    download: 'sdd-reviewer.md',
    installTo: '~/.claude/agents/sdd-reviewer.md'
  }
};

window.SDD_REPO_URL = 'https://github.com/caiogmatos/sdd-skills';
