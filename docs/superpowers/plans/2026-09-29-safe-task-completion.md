# Safe Task Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent task completion from crashing mobile browsers when random UUID support or persisted recurrence data is incompatible.

**Architecture:** Keep all views on the existing central toggle handler. Harden `nextRepeatTask` so it validates recurrence data before generating an ID, and isolate browser ID creation behind a safe fallback helper.

**Tech Stack:** TypeScript, React 19, Node test runner, Vite.

---

### Task 1: Add failing compatibility regressions

**Files:**
- Modify: `tests/recurrence.test.mjs`

- [x] **Step 1: Add tests for lazy ID generation and malformed legacy values**

Add tests that call the desired four-argument API:

```js
const { createTaskId, nextRepeatTask, rescheduleTask } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('ineligible tasks complete without touching the successor id provider', () => {
  let calls = 0;
  const idFactory = () => { calls += 1; throw new Error('unsupported randomUUID'); };
  const ordinary = { id: 'ordinary', title: 'ordinary', isCompleted: false, repeat: 'none' };
  assert.doesNotThrow(() => nextRepeatTask(ordinary, [], undefined, idFactory));
  assert.equal(nextRepeatTask(ordinary, [], undefined, idFactory), undefined);
  assert.equal(calls, 0);
});

test('eligible recurrence generates its id only after validation', () => {
  let calls = 0;
  const original = task(new Date(2026, 8, 26), { interval: 1, unit: 'day' });
  const next = nextRepeatTask(original, [], undefined, () => { calls += 1; return 'lazy-id'; });
  assert.equal(next.id, 'lazy-id');
  assert.equal(calls, 1);
});

test('malformed legacy recurrence data is ignored instead of throwing', () => {
  const original = task(new Date(2026, 8, 26), { interval: 1, unit: 'week', weekdays: [1] });
  assert.doesNotThrow(() => nextRepeatTask({ ...original, repeatAnchorDate: 123 }, []));
  assert.equal(nextRepeatTask({ ...original, repeatAnchorDate: 123 }, []), undefined);
  assert.doesNotThrow(() => nextRepeatTask({ ...original, repeatRule: { interval: 1, unit: 'week', weekdays: '1' } }, []));
  assert.equal(nextRepeatTask({ ...original, repeatRule: { interval: 1, unit: 'week', weekdays: '1' } }, []), undefined);
});

test('task id creation falls back when randomUUID throws', () => {
  assert.equal(createTaskId(() => { throw new Error('not supported'); }, () => 0.5), 'i');
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `node --import tsx --test tests/recurrence.test.mjs`

Expected: FAIL because `createTaskId` is not exported and `nextRepeatTask` does not accept a lazy ID factory or malformed runtime values safely.

### Task 2: Make recurrence generation safe and lazy

**Files:**
- Modify: `components/recurrence.ts`
- Test: `tests/recurrence.test.mjs`

- [x] **Step 1: Add a browser-safe ID helper**

Implement:

```ts
type RandomUuid = () => string;
type RandomNumber = () => number;

export function createTaskId(
  randomUUID: RandomUuid | undefined = typeof globalThis.crypto?.randomUUID === 'function'
    ? () => globalThis.crypto.randomUUID()
    : undefined,
  random: RandomNumber = Math.random
): string {
  try {
    const id = randomUUID?.();
    if (id) return id;
  } catch {
    // Some embedded mobile browsers expose randomUUID but throw when it is called.
  }
  return random().toString(36).slice(2) || `task-${Date.now().toString(36)}`;
}
```

- [x] **Step 2: Validate runtime recurrence values before use**

Change the local date parser to accept `unknown`, return an invalid date for non-strings or malformed local dates, validate custom rule objects and `weekdays` arrays, and reject a present non-string `repeatAnchorDate`.

- [x] **Step 3: Generate successor IDs only after eligibility is proven**

Change the signature to:

```ts
export function nextRepeatTask(
  task: Task,
  tasks: Task[],
  id?: string,
  idFactory: () => string = createTaskId
): Task | undefined
```

Perform all early returns and compute the next date first. Immediately before returning a successor, use `const successorId = id ?? idFactory();`. Reject an empty generated ID.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `node --import tsx --test tests/recurrence.test.mjs`

Expected: all recurrence tests pass, including the new compatibility regressions.

### Task 3: Verify the shared completion path and deploy

**Files:**
- Verify: `App.tsx`
- Verify: `components/MobileCalendar.tsx`
- Verify: `components/BacklogView.tsx`
- Verify: `components/TaskCard.tsx`

- [x] **Step 1: Run the full automated checks**

Run: `npm test`

Expected: all tests pass.

Run: `npx tsc --noEmit`

Expected: exit code 0.

Run: `npm run build`

Expected: production build succeeds.

- [x] **Step 2: Verify completion in three UI paths**

At a 390 x 844 viewport, create one unscheduled ordinary task and one scheduled repeating task. Complete the ordinary task from the backlog, complete the scheduled task from calendar list mode, and repeat the ordinary completion at a desktop viewport. Confirm the page remains rendered and no console error is emitted.

- [ ] **Step 3: Commit and push only scoped files**

```bash
git add components/recurrence.ts tests/recurrence.test.mjs docs/superpowers/plans/2026-09-29-safe-task-completion.md
git commit -m "fix: prevent task completion crashes"
git push origin main
```

- [ ] **Step 4: Verify production deployment**

Confirm the Vercel production HTML references the newly built JavaScript asset and that the deployed bundle contains the lazy successor-ID guard. Confirm remote `main` equals local `HEAD`.
