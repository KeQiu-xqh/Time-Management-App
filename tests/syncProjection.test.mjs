import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyPayload, snapshotFromPayload, updatePayloadFromSnapshot } from '../sync/projection.ts';

const timestamp = () => '2026-09-28T12:00:00.000Z';
const snapshot = () => ({
  version: 1,
  username: 'Qiu',
  categories: {
    work: { id: 'work', name: '工作', colorBg: 'bg-blue-100', colorText: 'text-blue-600' }
  },
  tasks: [{
    id: 't1',
    title: '计划',
    isCompleted: false,
    doDate: new Date('2026-09-28T01:00:00.000Z')
  }],
  habits: [{ id: 'h1', title: '阅读', completedDates: [], streak: 0 }]
});

test('snapshot projects all entity types into stable record keys', () => {
  const payload = updatePayloadFromSnapshot(snapshot(), emptyPayload(), 'phone', timestamp);

  assert.deepEqual(payload.records.map(record => record.key), [
    'category:work',
    'habit:h1',
    'profile:default',
    'task:t1'
  ]);
  assert.equal(payload.records.find(record => record.key === 'task:t1').value.doDate, '2026-09-28T01:00:00.000Z');
  assert.equal(payload.clock, 4);
});

test('unchanged snapshots retain their records and clock', () => {
  const first = updatePayloadFromSnapshot(snapshot(), emptyPayload(), 'phone', timestamp);
  const unchanged = updatePayloadFromSnapshot(snapshot(), first, 'phone', timestamp);

  assert.deepEqual(unchanged, first);
});

test('changes advance the clock and removals create tombstones', () => {
  const first = updatePayloadFromSnapshot(snapshot(), emptyPayload(), 'phone', timestamp);
  const nextSnapshot = snapshot();
  nextSnapshot.tasks = [];
  nextSnapshot.username = 'New name';

  const changed = updatePayloadFromSnapshot(nextSnapshot, first, 'phone', timestamp);
  const tombstone = changed.records.find(record => record.key === 'task:t1');

  assert.equal(changed.clock, first.clock + 2);
  assert.equal(tombstone.value, null);
  assert.equal(tombstone.deletedAt, timestamp());
});

test('payload reconstructs a snapshot and hydrates task dates', () => {
  const payload = updatePayloadFromSnapshot(snapshot(), emptyPayload(), 'phone', timestamp);
  const restored = snapshotFromPayload(payload);

  assert.equal(restored.username, 'Qiu');
  assert.equal(restored.tasks[0].doDate instanceof Date, true);
  assert.equal(restored.tasks[0].doDate.toISOString(), '2026-09-28T01:00:00.000Z');
  assert.equal(restored.categories.work.id, 'work');
  assert.equal(restored.habits[0].id, 'h1');
});

test('existing tombstones survive later projections', () => {
  const first = updatePayloadFromSnapshot(snapshot(), emptyPayload(), 'phone', timestamp);
  const withoutTask = snapshot();
  withoutTask.tasks = [];
  const deleted = updatePayloadFromSnapshot(withoutTask, first, 'phone', timestamp);

  assert.deepEqual(updatePayloadFromSnapshot(withoutTask, deleted, 'phone', timestamp), deleted);
});
