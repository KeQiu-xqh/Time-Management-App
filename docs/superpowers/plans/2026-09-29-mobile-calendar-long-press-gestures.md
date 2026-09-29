# Mobile Calendar Long-Press Gestures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users scroll the mobile calendar from task cards without accidental edits, while requiring a deliberate long press before moving or resizing a task.

**Architecture:** Extract long-press timing and movement-threshold rules into small pure helpers in `calendarGesture.ts`, then make `MobileCalendar` distinguish pending, active, and cancelled pointer phases. Touch and pen input wait for activation; mouse input keeps immediate desktop behavior. CSS allows vertical panning before activation and shows an explicit lifted state only after activation.

**Tech Stack:** TypeScript, React 19 pointer events, CSS touch-action, Node test runner, Vite.

---

### Task 1: Specify long-press gesture policy with failing tests

**Files:**
- Modify: `tests/calendarGesture.test.mjs`
- Modify: `components/calendarGesture.ts`

- [x] **Step 1: Write failing policy tests**

Import `LONG_PRESS_MS`, `TOUCH_SLOP_PX`, `requiresCalendarLongPress`, and `exceedsTouchSlop`, then assert:

```js
test('touch and pen require a deliberate long press while mouse remains immediate', () => {
  assert.equal(LONG_PRESS_MS, 450);
  assert.equal(TOUCH_SLOP_PX, 10);
  assert.equal(requiresCalendarLongPress('touch'), true);
  assert.equal(requiresCalendarLongPress('pen'), true);
  assert.equal(requiresCalendarLongPress('mouse'), false);
});

test('touch slop cancels only after movement exceeds ten pixels', () => {
  assert.equal(exceedsTouchSlop(0, 0, 6, 8), false);
  assert.equal(exceedsTouchSlop(0, 0, 6.1, 8), true);
  assert.equal(exceedsTouchSlop(20, 30, 20, 41), true);
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --import tsx --test tests/calendarGesture.test.mjs`

Expected: FAIL because the four gesture-policy exports do not exist.

- [x] **Step 3: Implement the minimal policy helpers**

Add to `components/calendarGesture.ts`:

```ts
export const LONG_PRESS_MS = 450;
export const TOUCH_SLOP_PX = 10;
export const HAPTIC_MS = 15;
export const requiresCalendarLongPress = (pointerType: string) => pointerType !== 'mouse';
export const exceedsTouchSlop = (startX: number, startY: number, x: number, y: number, slop = TOUCH_SLOP_PX) =>
  Math.hypot(x - startX, y - startY) > slop;
```

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `node --import tsx --test tests/calendarGesture.test.mjs`

Expected: all calendar gesture tests pass.

### Task 2: Gate touch movement and resize behind long press

**Files:**
- Modify: `components/MobileCalendar.tsx`
- Create: `tests/mobileCalendarLongPress.test.mjs`

- [x] **Step 1: Write a failing structural regression test**

Read `MobileCalendar.tsx` and assert that it imports the long-press helpers, stores a gesture phase, starts a `window.setTimeout` using `LONG_PRESS_MS`, cancels pending input through `exceedsTouchSlop`, captures the pointer only inside activation, calls `navigator.vibrate(HAPTIC_MS)` defensively, and prevents default only for an active gesture. Also assert that the old unconditional pointer capture in `begin` is absent.

- [x] **Step 2: Run the structural test and verify RED**

Run: `node --import tsx --test tests/mobileCalendarLongPress.test.mjs`

Expected: FAIL because `MobileCalendar` still captures every pointer immediately and has no pending phase.

- [x] **Step 3: Implement the pending/active/cancelled state machine**

Extend the gesture object with:

```ts
phase: 'pending' | 'active' | 'cancelled';
pointerType: string;
```

Add a timer ref and helpers that:

- clear the timer safely;
- activate the current gesture after 450ms only if it is still pending;
- capture the pointer and start auto-scroll only after activation;
- vibrate for 15ms when supported;
- announce whether movement, start resize, or end resize was activated;
- cancel pending touch/pen input when it exceeds 10px without preventing native scrolling;
- clean all timers, animation frames, previews, and captures on cancel, pointer loss, multi-touch, and unmount.

Keep mouse input on the immediate activation path. A pending touch `pointerup` is left for the existing click handler; an active long press without movement suppresses the click and does not save.

- [x] **Step 4: Run the new test and verify GREEN**

Run: `node --import tsx --test tests/mobileCalendarLongPress.test.mjs`

Expected: all long-press structural regressions pass.

### Task 3: Allow scrolling before activation and expose clear feedback

**Files:**
- Modify: `components/MobileCalendar.css`
- Modify: `components/MobileCalendar.tsx`
- Modify: `tests/mobileCalendarLongPress.test.mjs`

- [x] **Step 1: Add failing CSS and accessibility assertions**

Assert that default `.mc-task` and `.mc-resize` use `touch-action: pan-y`, the active task uses a lifted transform/highlight, the task label says “轻点查看，长按调整”, and the hidden usage instruction describes long press.

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --import tsx --test tests/mobileCalendarLongPress.test.mjs`

Expected: FAIL because task cards currently use `touch-action: none` and old drag wording.

- [x] **Step 3: Implement scrolling and feedback styles**

Change the default task and resize handle touch action to vertical panning, retain disabled text selection, and give `.mc-active` a small scale/translation, stronger shadow, and highlighted resize affordances. Update accessible task labels and the screen-reader-only instruction to state that touch users long press before adjusting.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `node --import tsx --test tests/mobileCalendarLongPress.test.mjs`

Expected: all long-press tests pass.

### Task 4: Verify, commit, push, and check production

**Files:**
- Modify: `docs/superpowers/plans/2026-09-29-mobile-calendar-long-press-gestures.md`
- Verify: `components/MobileCalendar.tsx`
- Verify: `components/MobileCalendar.css`
- Verify: `components/calendarGesture.ts`
- Verify: `tests/calendarGesture.test.mjs`
- Verify: `tests/mobileCalendarLongPress.test.mjs`

- [x] **Step 1: Run all automated verification**

Run:

```powershell
npm test
npx tsc --noEmit
npm run build
```

Expected: all tests pass, TypeScript exits 0, and the Vite production build succeeds.

- [x] **Step 2: Review requirement coverage and Git scope**

Confirm the implementation covers scroll cancellation, body movement, both resize edges, activation feedback, cleanup, mouse compatibility, and accessible instructions. Run `git diff --check` and verify `.codex-remote-attachments/` is still untracked and unstaged.

- [x] **Step 3: Commit scoped files**

```powershell
git add -- components/calendarGesture.ts components/MobileCalendar.tsx components/MobileCalendar.css tests/calendarGesture.test.mjs tests/mobileCalendarLongPress.test.mjs docs/superpowers/plans/2026-09-29-mobile-calendar-long-press-gestures.md
git commit -m "fix: require long press for mobile calendar edits"
```

- [x] **Step 4: Push and verify deployment**

Run `git push origin main`, verify local `HEAD` equals `origin/main`, then confirm the Vercel production page references the new built asset. Use a mobile viewport to verify normal card-originated scrolling, long-press movement, long-press resizing, tap-to-view, and absence of console errors.
