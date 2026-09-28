import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergePayloads, mergeRecords } from '../sync/merge.ts';

const record = (key, logicalClock, deviceId, value, deletedAt) => ({
  key,
  value,
  updatedAt: `2026-09-28T10:00:0${logicalClock}.000Z`,
  logicalClock,
  deviceId,
  ...(deletedAt ? { deletedAt } : {})
});

test('merge unions different records and sorts them by key', () => {
  const task = record('task:t1', 1, 'phone', { title: '任务' });
  const habit = record('habit:h1', 1, 'phone', { title: '习惯' });

  assert.deepEqual(mergeRecords([task], [habit]), [habit, task]);
});

test('larger logical clock wins for the same record', () => {
  const older = record('task:t1', 2, 'phone', { title: '旧标题' });
  const newer = record('task:t1', 3, 'desktop', { title: '新标题' });

  assert.deepEqual(mergeRecords([older], [newer]), [newer]);
});

test('merge converges for simultaneous edits regardless of argument order', () => {
  const phone = record('task:t1', 4, 'phone', { title: '手机修改' });
  const desktop = record('task:t1', 4, 'desktop', { title: '电脑修改' });

  assert.deepEqual(mergeRecords([phone], [desktop]), mergeRecords([desktop], [phone]));
  assert.equal(mergeRecords([phone], [desktop])[0].deviceId, 'phone');
});

test('newer tombstone prevents deleted data from reappearing', () => {
  const live = record('task:t1', 2, 'phone', { title: '旧任务' });
  const deleted = record('task:t1', 3, 'desktop', null, '2026-09-28T10:00:03.000Z');

  assert.deepEqual(mergeRecords([live], [deleted]), [deleted]);
});

test('newer edit wins over an older tombstone', () => {
  const deleted = record('task:t1', 2, 'desktop', null, '2026-09-28T10:00:02.000Z');
  const restored = record('task:t1', 3, 'phone', { title: '恢复任务' });

  assert.deepEqual(mergeRecords([deleted], [restored]), [restored]);
});

test('payload merge advances the observed logical clock', () => {
  const local = { schemaVersion: 1, clock: 4, records: [record('task:t1', 4, 'phone', { title: '本地' })] };
  const remote = { schemaVersion: 1, clock: 8, records: [record('habit:h1', 8, 'desktop', { title: '远端' })] };

  const merged = mergePayloads(local, remote);

  assert.equal(merged.clock, 9);
  assert.deepEqual(merged.records.map(item => item.key), ['habit:h1', 'task:t1']);
});
