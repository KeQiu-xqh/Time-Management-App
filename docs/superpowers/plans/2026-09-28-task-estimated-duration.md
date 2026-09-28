# Task Estimated Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional minute-precise estimated duration to every task and display it as decimal hours.

**Architecture:** Store the estimate as an additive integer-minute field on `Task`. A focused utility owns parsing and formatting, while the existing scheduled `duration` remains unchanged.

**Tech Stack:** React 19, TypeScript, Node test runner, Vite.

---

### Task 1: Duration parsing and formatting

**Files:**
- Create: `components/taskDuration.ts`
- Create: `tests/taskDuration.test.mjs`

- [ ] Add failing tests for supported inputs, invalid inputs, canonical edit formatting, and decimal-hour display.
- [ ] Implement strict minute parsing and formatting utilities.
- [ ] Run `node --import tsx --test tests/taskDuration.test.mjs` and verify all cases pass.

### Task 2: Persist estimates from the task form

**Files:**
- Modify: `types.ts`
- Modify: `components/AddTaskModal.tsx`
- Test: `tests/taskDurationUi.test.mjs`

- [ ] Add a failing source-contract test for the field, validation message and saved `estimatedDuration`.
- [ ] Add form state that loads existing estimates, resets for new tasks, validates input and saves parsed minutes.
- [ ] Run the focused tests and verify they pass.

### Task 3: Display estimates consistently

**Files:**
- Modify: `components/TaskCard.tsx`
- Modify: `components/CalendarView.tsx`
- Modify: `components/MobileCalendar.tsx`
- Test: `tests/taskDurationUi.test.mjs`

- [ ] Add failing checks for default cards, compact cards, desktop backlog and mobile details.
- [ ] Render `预估 {hours}` only when the estimate exists.
- [ ] Run the focused tests and verify they pass.

### Task 4: Verify and publish

**Files:**
- Modify: `README.md`

- [ ] Document input and display examples.
- [ ] Run `npx tsc --noEmit`, `npm test`, `npm run build`, `npm audit --omit=dev --audit-level=high`, and `git diff --check`.
- [ ] Commit and push `main`.
- [ ] Verify the new production asset and duration strings on Vercel.
