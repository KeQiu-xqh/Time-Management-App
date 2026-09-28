# Desktop Settings And Week View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop settings dialog fully scrollable, show all seven week-list columns, and add clear account/sync guidance.

**Architecture:** Keep the existing modal and calendar components. Add one focused help component, apply reusable modal layout rules in `MobileUI.css`, and remove the week list's forced horizontal canvas while preserving the mobile calendar.

**Tech Stack:** React 19, TypeScript, Tailwind utility classes, Node test runner, Vite.

---

### Task 1: Desktop modal scrolling

**Files:**
- Modify: `components/MobileUI.css`
- Test: `tests/responsiveUi.test.mjs`

- [ ] Write a source-contract test asserting the desktop modal shell has a viewport max-height, flex layout, fixed header and scrollable body.
- [ ] Run `node --import tsx --test tests/responsiveUi.test.mjs` and verify it fails because the rules only apply to `.repeat-custom`.
- [ ] Generalize the desktop modal CSS to every `.app-modal-shell` and keep the task-editor overrides intact.
- [ ] Re-run the focused test and verify it passes.

### Task 2: Seven-column week list

**Files:**
- Modify: `components/CalendarView.tsx`
- Modify: `components/TaskCard.tsx`
- Test: `tests/responsiveUi.test.mjs`

- [ ] Add a failing test asserting that the week list has no `min-w-[800px]`, uses a seven-column minmax grid and has no horizontal-scroll wrapper.
- [ ] Replace the forced-width layout with a full-width seven-column grid, reduce responsive padding/gaps, and add a dedicated compact-card class.
- [ ] Add `min-w-0` and tighter desktop spacing to compact task cards so long titles wrap inside their column.
- [ ] Re-run the focused test and verify it passes.

### Task 3: Settings help and friendly unavailable states

**Files:**
- Create: `components/SettingsHelp.tsx`
- Modify: `components/SettingsModal.tsx`
- Modify: `components/SyncSettings.tsx`
- Modify: `components/WechatLogin.tsx`
- Modify: `auth/useWechatLogin.ts`
- Test: `tests/settingsHelp.test.mjs`

- [ ] Add a failing render test for an accessible help toggle and the three guidance sections.
- [ ] Implement `SettingsHelp` with a question-mark button, `aria-expanded`, and a collapsible panel.
- [ ] Detect HTTP 503 from `/api/auth/wechat/me` as an unavailable service state.
- [ ] Replace raw environment-variable warnings with user-facing “站点尚未开通” messages and link those messages conceptually to the help panel.
- [ ] Re-run the focused test and verify it passes.

### Task 4: Verification and delivery

**Files:**
- Modify: `docs/superpowers/plans/2026-09-28-desktop-settings-week-help.md`

- [ ] Run `npx tsc --noEmit` and expect exit code 0.
- [ ] Run `npm test` and expect zero failed tests.
- [ ] Run `npm run build` and expect exit code 0.
- [ ] Run `git diff --check` and expect no whitespace errors.
- [ ] Commit, push `main`, then verify the Vercel production asset and public HTTP response.
