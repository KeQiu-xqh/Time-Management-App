# Mobile Calendar Select-Before-Drag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace unreliable mobile long-press dragging with a predictable first-tap selection followed by immediate move or resize.

**Architecture:** Put the pointer-type and selection gate in pure helpers in `calendarGesture.ts`. `MobileCalendar` owns one `selectedTaskId`, creates a gesture only for mouse input or an already selected touch task, and uses separate selected and actively-dragging CSS states. Existing scheduling calculations, previews, auto-scroll, and desktop behavior remain unchanged.

**Tech Stack:** TypeScript, React 19 pointer events, CSS media/input queries, Node test runner, Vite.

---

### Task 1: Replace long-press policy with selection policy

**Files:**
- Modify: `components/calendarGesture.ts`
- Modify: `tests/calendarGesture.test.mjs`

- [x] **Step 1: Write failing selection-policy tests**

Replace long-press imports and tests with:

```js
test('touch and pen require task selection before a gesture while mouse stays immediate', () => {
  assert.equal(requiresTaskSelection('touch'), true);
  assert.equal(requiresTaskSelection('pen'), true);
  assert.equal(requiresTaskSelection('mouse'), false);
  assert.equal(canStartTaskGesture('touch', null, 'task-1'), false);
  assert.equal(canStartTaskGesture('touch', 'task-1', 'task-1'), true);
  assert.equal(canStartTaskGesture('pen', 'task-2', 'task-1'), false);
  assert.equal(canStartTaskGesture('mouse', null, 'task-1'), true);
});
```

Also assert that `LONG_PRESS_MS`, `TOUCH_SLOP_PX`, `HAPTIC_MS`, `requiresCalendarLongPress`, and `exceedsTouchSlop` are no longer exported.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --import tsx --test tests/calendarGesture.test.mjs`

Expected: FAIL because the selection-policy functions do not exist and long-press exports still exist.

- [x] **Step 3: Implement the minimal selection helpers**

Add:

```ts
export const requiresTaskSelection = (pointerType: string) => pointerType !== 'mouse';
export const canStartTaskGesture = (
  pointerType: string,
  selectedTaskId: string | null,
  taskId: string,
) => !requiresTaskSelection(pointerType) || selectedTaskId === taskId;
```

Remove the obsolete long-press constants and helpers.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `node --import tsx --test tests/calendarGesture.test.mjs`

Expected: all gesture policy and time-range tests pass.

### Task 2: Implement select-before-drag component flow

**Files:**
- Modify: `components/MobileCalendar.tsx`
- Delete: `tests/mobileCalendarLongPress.test.mjs`
- Create: `tests/mobileCalendarSelection.test.mjs`

- [x] **Step 1: Write failing component regressions**

Assert that `MobileCalendar`:

- owns `selectedTaskId`;
- checks `canStartTaskGesture(e.pointerType, selectedTaskId, task.id)` before creating a gesture;
- first click calls `setSelectedTaskId(task.id)` and announces selection;
- an already selected no-move gesture clears selection and opens details;
- applies `mc-selected` separately from `mc-active`;
- exposes `aria-pressed`;
- clears selection on blank pointer down, mode changes, display changes, navigation, task disappearance, and opening details;
- no longer contains long-press timers, vibration, activation phases, or long-press copy.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --import tsx --test tests/mobileCalendarSelection.test.mjs`

Expected: FAIL because the component still implements long-press activation.

- [x] **Step 3: Implement selected task state and direct gesture gate**

Add `selectedTaskId` state. In `begin`, return without capture for unselected touch/pen tasks; immediately capture and start the existing gesture for selected touch/pen tasks and all mouse tasks. Remove the timer, activation phase, haptic feedback, and touch-slop paths.

Update click handling so an unselected task becomes selected, while an already selected task with no movement opens details and clears selection. Keep keyboard access direct. Clear selection on blank pointer down, view/display/navigation changes, detail opening, backlog removal, missing tasks, and unmount.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `node --import tsx --test tests/mobileCalendarSelection.test.mjs`

Expected: all component selection-flow assertions pass.

### Task 3: Separate selected and dragging visual states

**Files:**
- Modify: `components/MobileCalendar.css`
- Modify: `tests/mobileCalendarSelection.test.mjs`

- [x] **Step 1: Add failing style assertions**

Assert that default tasks retain `touch-action: pan-y`, `.mc-selected` uses `touch-action: none` with persistent highlighting, resize handles are inactive before selection and active for `.mc-selected`, `.mc-active` is reserved for stronger dragging feedback, and fine-pointer desktop media keeps resize handles directly available.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --import tsx --test tests/mobileCalendarSelection.test.mjs`

Expected: FAIL because the current CSS has only the long-press active state.

- [x] **Step 3: Implement selected and active styles**

Keep `.mc-task` vertically scrollable by default. Add `.mc-selected` for persistent border/background/shadow and touch interception. Hide or weaken resize handles by default, enable them for selected tasks, and restore direct handle availability under `@media (hover:hover) and (pointer:fine)`. Keep `.mc-active` for the stronger drag transform.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `node --import tsx --test tests/mobileCalendarSelection.test.mjs`

Expected: all selection and style assertions pass.

### Task 4: Verify, publish, and confirm production

**Files:**
- Modify: `docs/superpowers/plans/2026-09-29-mobile-calendar-select-before-drag.md`
- Verify: `components/calendarGesture.ts`
- Verify: `components/MobileCalendar.tsx`
- Verify: `components/MobileCalendar.css`
- Verify: `tests/calendarGesture.test.mjs`
- Verify: `tests/mobileCalendarSelection.test.mjs`

- [x] **Step 1: Run complete verification**

```powershell
npm test
npx tsc --noEmit
npm run build
git diff --check
```

Expected: all tests pass, type checking exits 0, production build succeeds, and Git reports no whitespace errors.

- [x] **Step 2: Review requirement and repository scope**

Confirm first-tap selection, selected direct movement, selected resize, second-tap details, blank deselection, desktop compatibility, cancellation cleanup, and absence of long-press code. Confirm `.codex-remote-attachments/` remains untracked and unstaged.

- [x] **Step 3: Commit scoped implementation and verification records**

```powershell
git add -- components/calendarGesture.ts components/MobileCalendar.tsx components/MobileCalendar.css tests/calendarGesture.test.mjs tests/mobileCalendarSelection.test.mjs tests/mobileCalendarLongPress.test.mjs docs/superpowers/plans/2026-09-29-mobile-calendar-select-before-drag.md
git commit -m "fix: select mobile calendar tasks before dragging"
```

- [x] **Step 4: Push and verify Vercel**

Push `main`, verify local `HEAD` equals `origin/main`, wait for production HTML to reference the newly built JavaScript and CSS assets, and confirm both assets return HTTP 200 and contain the selection-mode code/styles.
