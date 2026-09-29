import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../components/recurrence.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { createTaskId, nextRepeatTask, rescheduleTask } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const local = d => d && [d.getFullYear(), d.getMonth() + 1, d.getDate()];
const task = (date, rule) => ({ id: 'root', title: 'test', doDate: date, isCompleted: false, startTime: '09:03', duration: 7, repeat: 'custom', repeatRule: rule });

test('every N days preserves time, duration and deadline distance', () => {
  const original = { ...task(new Date(2026, 8, 26), { interval: 3, unit: 'day' }), deadline: new Date(2026, 8, 28) };
  const next = nextRepeatTask(original, [], 'next');
  assert.deepEqual(local(next.doDate), [2026, 9, 29]);
  assert.deepEqual(local(next.deadline), [2026, 10, 1]);
  assert.equal(next.startTime, '09:03');
  assert.equal(next.duration, 7);
  assert.equal(next.repeatParentId, 'root');
});
test('weekly weekdays progress within the week then wrap to next week', () => {
  const mon = task(new Date(2026, 8, 21), { interval: 1, unit: 'week', weekdays: [1, 3, 5] });
  const wed = nextRepeatTask(mon, [], 'wed');
  const fri = nextRepeatTask(wed, [], 'fri');
  const nextMon = nextRepeatTask(fri, [], 'nextMon');
  assert.deepEqual(local(wed.doDate), [2026, 9, 23]);
  assert.deepEqual(local(fri.doDate), [2026, 9, 25]);
  assert.deepEqual(local(nextMon.doDate), [2026, 9, 28]);
});
test('every two weeks includes multiple weekdays and skips inactive weeks', () => {
  const mon = task(new Date(2026, 8, 21), { interval: 2, unit: 'week', weekdays: [1, 5] });
  const fri = nextRepeatTask(mon, [], 'fri');
  const nextMon = nextRepeatTask(fri, [], 'nextMon');
  assert.deepEqual(local(fri.doDate), [2026, 9, 25]);
  assert.deepEqual(local(nextMon.doDate), [2026, 10, 5]);
});
test('monthly month-end clamps in February then returns to the original day', () => {
  const jan = task(new Date(2026, 0, 31), { interval: 1, unit: 'month' });
  const feb = nextRepeatTask(jan, [], 'feb');
  const mar = nextRepeatTask(feb, [], 'mar');
  assert.deepEqual(local(feb.doDate), [2026, 2, 28]);
  assert.deepEqual(local(mar.doDate), [2026, 3, 31]);
  assert.deepEqual(local(nextRepeatTask(task(new Date(2024, 0, 31), { interval: 1, unit: 'month' }), []).doDate), [2024, 2, 29]);
});
test('custom month interval crosses the year correctly', () => {
  assert.deepEqual(local(nextRepeatTask(task(new Date(2026, 10, 30), { interval: 3, unit: 'month' }), []).doDate), [2027, 2, 28]);
});
test('end date is inclusive and stops subsequent generation', () => {
  const first = task(new Date(2026, 8, 26), { interval: 2, unit: 'day', until: '2026-09-28' });
  const last = nextRepeatTask(first, [], 'last');
  assert.deepEqual(local(last.doDate), [2026, 9, 28]);
  assert.equal(nextRepeatTask(last, []), undefined);
});
test('old daily/weekly/monthly tasks remain supported', () => {
  for (const [repeat, expected] of [['daily', [2026, 9, 27]], ['weekly', [2026, 10, 3]], ['monthly', [2026, 10, 26]]]) {
    assert.deepEqual(local(nextRepeatTask({ ...task(new Date(2026, 8, 26)), repeat }, []).doDate), expected);
  }
});
test('re-completing a task does not create duplicate successors', () => {
  const original = task(new Date(2026, 8, 26), { interval: 1, unit: 'day' });
  const next = nextRepeatTask(original, [], 'next');
  assert.equal(nextRepeatTask(original, [original, next]), undefined);
});
test('unscheduled, nonrepeating and invalid rules never generate bad tasks', () => {
  const original = task(new Date(2026, 8, 26), { interval: 1, unit: 'day' });
  assert.equal(nextRepeatTask({ ...original, doDate: undefined }, []), undefined);
  assert.equal(nextRepeatTask({ ...original, repeat: 'none' }, []), undefined);
  assert.equal(nextRepeatTask({ ...original, repeatRule: { unit: 'day', interval: 0 } }, []), undefined);
  assert.equal(nextRepeatTask({ ...original, repeatRule: { unit: 'week', interval: 1, weekdays: [] } }, []), undefined);
});
test('rescheduling a weekly series before its old anchor still generates the next task', () => {
  assert.equal(typeof rescheduleTask, 'function', 'schedule mutations need a shared recurrence-aware path');
  const original = { ...task(new Date(2026, 9, 26), { interval: 2, unit: 'week', weekdays: [1, 3] }), repeatAnchorDate: '2026-10-26' };
  const moved = rescheduleTask(original, new Date(2026, 8, 28), '10:07', 7);
  assert.equal(moved.repeatAnchorDate, '2026-09-28');
  assert.deepEqual(local(nextRepeatTask(moved, []).doDate), [2026, 9, 30]);
  const fromBacklog = rescheduleTask({ ...original, doDate: undefined }, new Date(2026, 8, 28));
  assert.deepEqual(local(nextRepeatTask(fromBacklog, []).doDate), [2026, 9, 30]);
  const legacy = rescheduleTask({ ...original, repeat: 'weekly' }, new Date(2026, 8, 28));
  assert.deepEqual(local(nextRepeatTask(legacy, []).doDate), [2026, 10, 5]);
});
test('minute-only adjustments preserve the original monthly anchor', () => {
  assert.equal(typeof rescheduleTask, 'function');
  const feb = { ...task(new Date(2026, 1, 28), { interval: 1, unit: 'month' }), repeatAnchorDate: '2026-01-31' };
  const timed = rescheduleTask(feb, new Date(2026, 1, 28), '09:04', 8);
  assert.equal(timed.repeatAnchorDate, '2026-01-31');
  assert.equal(timed.startTime, '09:04');
  assert.equal(timed.duration, 8);
  assert.deepEqual(local(nextRepeatTask(timed, []).doDate), [2026, 3, 31]);
});

test('first timed schedule uses the estimate as the card duration', () => {
  const backlog = { id: 'estimated', title: 'report', isCompleted: false, estimatedDuration: 160 };
  const scheduled = rescheduleTask(backlog, new Date(2026, 8, 28), '09:00');
  assert.equal(scheduled.duration, 160);

  const nearMidnight = rescheduleTask(backlog, new Date(2026, 8, 28), '23:00');
  assert.equal(nearMidnight.duration, 60);
});

test('explicit or previously adjusted card duration takes priority over estimate', () => {
  const estimated = { id: 'estimated', title: 'report', isCompleted: false, estimatedDuration: 160 };
  assert.equal(rescheduleTask(estimated, new Date(2026, 8, 28), '09:00', 45).duration, 45);

  const adjusted = { ...estimated, duration: 75 };
  assert.equal(rescheduleTask(adjusted, new Date(2026, 8, 29), '09:00').duration, 75);
  assert.equal(rescheduleTask(estimated, new Date(2026, 8, 29), null).duration, undefined);
});

test('ineligible tasks complete without touching the successor id provider', () => {
  let calls = 0;
  const idFactory = () => {
    calls += 1;
    throw new Error('unsupported randomUUID');
  };
  const ordinary = { id: 'ordinary', title: 'ordinary', isCompleted: false, repeat: 'none' };

  assert.doesNotThrow(() => nextRepeatTask(ordinary, [], undefined, idFactory));
  assert.equal(nextRepeatTask(ordinary, [], undefined, idFactory), undefined);
  assert.equal(calls, 0);
});

test('eligible recurrence generates its id only after validation', () => {
  let calls = 0;
  const original = task(new Date(2026, 8, 26), { interval: 1, unit: 'day' });
  const next = nextRepeatTask(original, [], undefined, () => {
    calls += 1;
    return 'lazy-id';
  });

  assert.equal(next.id, 'lazy-id');
  assert.equal(calls, 1);
});

test('malformed legacy recurrence data is ignored instead of throwing', () => {
  const original = task(new Date(2026, 8, 26), { interval: 1, unit: 'week', weekdays: [1] });
  const badAnchor = { ...original, repeatAnchorDate: 123 };
  const badWeekdays = { ...original, repeatRule: { interval: 1, unit: 'week', weekdays: '1' } };

  assert.doesNotThrow(() => nextRepeatTask(badAnchor, []));
  assert.equal(nextRepeatTask(badAnchor, []), undefined);
  assert.doesNotThrow(() => nextRepeatTask(badWeekdays, []));
  assert.equal(nextRepeatTask(badWeekdays, []), undefined);
});

test('task id creation falls back when randomUUID throws', () => {
  assert.equal(createTaskId(() => { throw new Error('not supported'); }, () => 0.5), 'i');
});
