import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../components/calendarGesture.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const {
  gestureRange, dateKey, monday, shiftDay, timeLabel, timeMinutes, durationFromTimes, endTimeForDuration,
  LONG_PRESS_MS, TOUCH_SLOP_PX, requiresCalendarLongPress, exceedsTouchSlop,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

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

test('moving defaults to one minute and offers optional coarse snapping', () => {
  assert.deepEqual(gestureRange('move', 540, 60, 38), { start: 578, duration: 60 });
  assert.deepEqual(gestureRange('move', 540, 60, -38), { start: 502, duration: 60 });
  assert.deepEqual(gestureRange('move', 540, 60, 38, 15), { start: 585, duration: 60 });
  assert.deepEqual(gestureRange('move', 540, 60, 38, 5), { start: 580, duration: 60 });
  assert.deepEqual(gestureRange('move', 543, 7, 1), { start: 544, duration: 7 });
});
test('moving clamps both ends inside the day', () => {
  assert.deepEqual(gestureRange('move', 60, 90, -300), { start: 0, duration: 90 });
  assert.deepEqual(gestureRange('move', 1200, 90, 300), { start: 1350, duration: 90 });
});
test('top edge changes start while preserving end', () => {
  assert.deepEqual(gestureRange('start', 540, 60, -30), { start: 510, duration: 90 });
  assert.deepEqual(gestureRange('start', 540, 60, 30), { start: 570, duration: 30 });
  assert.deepEqual(gestureRange('start', 540, 60, 90), { start: 599, duration: 1 });
});
test('both resize edges can change by one minute with a one minute minimum', () => {
  assert.deepEqual(gestureRange('start', 540, 7, 1), { start: 541, duration: 6 });
  assert.deepEqual(gestureRange('end', 540, 7, 1), { start: 540, duration: 8 });
  assert.deepEqual(gestureRange('end', 540, 60, 30), { start: 540, duration: 90 });
  assert.deepEqual(gestureRange('end', 540, 60, -90), { start: 540, duration: 1 });
  assert.deepEqual(gestureRange('end', 1380, 30, 90), { start: 1380, duration: 60 });
});
test('range invariant holds across all gesture modes and day boundaries', () => {
  for (const mode of ['move', 'start', 'end']) {
    for (const start of [0, 15, 540, 1380, 1425]) {
      for (const delta of [-2000, -60, -14, 0, 14, 60, 2000]) {
        const result = gestureRange(mode, start, 15, delta);
        assert.ok(result.start >= 0);
        assert.ok(result.duration >= 1);
        assert.ok(result.start + result.duration <= 1440);
      }
    }
  }
});
test('local calendar dates and Monday week handle month/year boundaries', () => {
  assert.equal(dateKey(new Date(2026, 8, 25, 0)), '2026-09-25');
  assert.equal(dateKey(monday(new Date(2026, 8, 27))), '2026-09-21');
  assert.equal(dateKey(shiftDay(new Date(2026, 11, 31), 1)), '2027-01-01');
  assert.equal(dateKey(shiftDay(new Date(2024, 1, 28), 1)), '2024-02-29');
});
test('labels include an end-of-day 24:00 without wrapping', () => {
  assert.equal(timeLabel(timeMinutes('09:15')), '09:15');
  assert.equal(timeLabel(1440), '24:00');
});
test('time editor can reopen and save a one-minute task ending at midnight', () => {
  assert.equal(endTimeForDuration('23:59', 1), '00:00');
  assert.equal(durationFromTimes('23:59', '00:00'), 1);
  assert.equal(durationFromTimes('00:00', '00:00'), 1440);
  assert.equal(endTimeForDuration('23:50', 30), '00:00');
  assert.equal(durationFromTimes('09:03', '09:10'), 7);
  assert.equal(durationFromTimes('09:03', '09:03'), 0);
  assert.ok(Number.isNaN(durationFromTimes('', '09:10')));
  assert.ok(Number.isNaN(durationFromTimes('09:03', '')));
});
