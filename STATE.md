# State
_Generated: 2026-10-19_
Last commit: `98c35c9`

## Done
- Site with 7 pages, the in-page file viewer and one-command install (before SDD; no specs)
- Skills and agents reworked around subagents (before SDD; no specs)
- check-script: `node tools/check.js` site check plus `node --test` tests, validated 22/22 ACs. See `specs/check-script/`

## In progress

## Blockers
- none

## Next steps
- Migrate inline `style=""` and `onclick` to classes and listeners, page by page. Modal buttons get `data-modal="<key>"`. `node tools/check.js` warns per page until a page is clean.
