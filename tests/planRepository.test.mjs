import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';
import { PlanRepository } from '../data/planRepository.ts';
import { emptySnapshot } from '../data/planSnapshot.ts';

const memoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
};

const legacyTask = id => JSON.stringify([{ id, title: id, isCompleted: false }]);

test('repository migrates legacy data only when IndexedDB is empty', async () => {
  const indexedDB = new IDBFactory();
  const storage = memoryStorage({
    planflow_tasks: legacyTask('legacy'),
    planflow_categories: '{}',
    planflow_habits: '[]',
    planflow_username: 'Qiu'
  });
  const repository = new PlanRepository({ indexedDB, storage, databaseName: 'migration-test' });

  const first = await repository.load();
  assert.equal(first.tasks[0].id, 'legacy');

  storage.setItem('planflow_tasks', legacyTask('changed'));
  const second = await repository.load();
  assert.equal(second.tasks[0].id, 'legacy');
});

test('repository round-trips a snapshot and clears its database', async () => {
  const indexedDB = new IDBFactory();
  const storage = memoryStorage();
  const repository = new PlanRepository({ indexedDB, storage, databaseName: 'roundtrip-test' });
  const snapshot = emptySnapshot();
  snapshot.username = 'Qiu';
  snapshot.tasks.push({
    id: 't1',
    title: '计划',
    isCompleted: false,
    doDate: new Date('2026-09-28T01:00:00.000Z')
  });

  await repository.save(snapshot);
  const loaded = await repository.load();
  assert.equal(loaded.username, 'Qiu');
  assert.equal(loaded.tasks[0].doDate instanceof Date, true);
  assert.equal(loaded.tasks[0].doDate.toISOString(), '2026-09-28T01:00:00.000Z');

  await repository.clear();
  assert.deepEqual(await repository.load(), emptySnapshot());
});

test('clear removes only PlanFlow legacy keys', async () => {
  const indexedDB = new IDBFactory();
  const storage = memoryStorage({
    planflow_tasks: '[]',
    planflow_categories: '{}',
    planflow_habits: '[]',
    planflow_username: 'Qiu',
    unrelated: 'keep'
  });
  const repository = new PlanRepository({ indexedDB, storage, databaseName: 'clear-test' });

  await repository.clear();

  assert.equal(storage.getItem('planflow_tasks'), null);
  assert.equal(storage.getItem('planflow_categories'), null);
  assert.equal(storage.getItem('planflow_habits'), null);
  assert.equal(storage.getItem('planflow_username'), null);
  assert.equal(storage.getItem('unrelated'), 'keep');
});
