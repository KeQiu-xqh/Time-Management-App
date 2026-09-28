# Mobile Ultra-Compact Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the vertical space used by the mobile backlog and category headers and task cards while preserving legibility and full-card interaction.

**Architecture:** Keep the existing React markup and desktop styles intact. Add narrowly scoped rules inside the existing mobile media query, using page-level selectors where the category and backlog pages need denser presentation than the habit page.

**Tech Stack:** React 19, TypeScript, Tailwind utility classes, responsive CSS, Node test runner.

---

### Task 1: Lock the compact mobile measurements with a regression test

**Files:**
- Modify: `tests/mobileListDensity.test.mjs`

- [x] Replace the old 40px task-control expectations with assertions for 32px task controls, 5px card gaps, compact card padding, hidden mobile subtitles, and 34px category tabs.
- [x] Run `node --import tsx --test tests/mobileListDensity.test.mjs` and confirm it fails because the old dimensions remain in `MobileUI.css`.

### Task 2: Implement the phone-only compact density

**Files:**
- Modify: `components/MobileUI.css`

- [x] Reduce phone page-header padding and remove the category title block's large inherited bottom margin.
- [x] Hide descriptive subtitles on backlog and category pages at phone widths.
- [x] Reduce category pills to 34px and the add-category target to 36px.
- [x] Reduce task cards to 6px vertical padding, 32px completion controls, 5px list gaps, compact metadata, and 13px titles.
- [x] Preserve a full-card click target and keep deadline details readable when present.
- [x] Re-run the focused test and confirm it passes.

### Task 3: Verify, publish, and check deployment

**Files:**
- Verify: all files changed above

- [x] Run `npm test`.
- [x] Run `npx tsc --noEmit`.
- [x] Run `npm run build`.
- [x] Inspect the mobile result at a phone viewport and verify the header and card density visually.
- [ ] Commit only the implementation, test, and plan files; exclude `.codex-remote-attachments`.
- [ ] Push `main` and verify the Vercel production site receives the new commit.
