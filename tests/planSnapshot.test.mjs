import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../data/planSnapshot.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const snapshotModule = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const { decodeBackup, decodeSnapshot, emptySnapshot, encodeSnapshot, readLegacySnapshot } = snapshotModule;

const memoryStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
};

test('legacy snapshot hydrates dates and preserves all collections', () => {
  const storage = memoryStorage({
    planflow_categories: JSON.stringify({ work: { id: 'work', name: '工作', colorBg: 'bg-blue-100', colorText: 'text-blue-600' } }),
    planflow_tasks: JSON.stringify([{ id: 't1', title: '计划', isCompleted: false, doDate: '2026-09-28T00:00:00.000Z' }]),
    planflow_habits: JSON.stringify([{ id: 'h1', title: '阅读', completedDates: [], streak: 0 }]),
    planflow_username: 'Qiu'
  });

  const snapshot = readLegacySnapshot(storage);

  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.username, 'Qiu');
  assert.equal(snapshot.tasks[0].doDate instanceof Date, true);
  assert.equal(snapshot.habits[0].id, 'h1');
  assert.equal(snapshot.categories.work.id, 'work');
});

test('one malformed legacy collection does not discard the others', () => {
  const storage = memoryStorage({
    planflow_categories: '{bad json',
    planflow_tasks: JSON.stringify([{ id: 't1', title: '保留', isCompleted: false }]),
    planflow_habits: JSON.stringify([{ id: 'h1', title: '习惯', completedDates: [], streak: 0 }]),
    planflow_username: 'Qiu'
  });

  const snapshot = readLegacySnapshot(storage);

  assert.deepEqual(snapshot.categories, {});
  assert.equal(snapshot.tasks[0].id, 't1');
  assert.equal(snapshot.habits[0].id, 'h1');
  assert.equal(snapshot.username, 'Qiu');
});

test('snapshot encoding round-trips supported task dates', () => {
  const snapshot = emptySnapshot();
  snapshot.tasks.push({
    id: 't1',
    title: '有日期',
    isCompleted: false,
    doDate: new Date('2026-09-28T01:00:00.000Z'),
    deadline: new Date('2026-09-30T01:00:00.000Z')
  });

  const decoded = decodeSnapshot(encodeSnapshot(snapshot));

  assert.equal(decoded.tasks[0].doDate instanceof Date, true);
  assert.equal(decoded.tasks[0].deadline instanceof Date, true);
  assert.equal(decoded.tasks[0].doDate.toISOString(), '2026-09-28T01:00:00.000Z');
});

test('snapshot decoder rejects invalid top-level collection shapes', () => {
  assert.throws(
    () => decodeSnapshot(JSON.stringify({ version: 1, categories: [], tasks: {}, habits: [], username: 'Qiu' })),
    /快照格式/
  );
});

test('backup decoder accepts old exports and new snapshots', () => {
  const legacy = decodeBackup(JSON.stringify({
    tasks: '[]',
    habits: '[]',
    categories: '{}',
    username: 'Qiu'
  }));
  assert.equal(legacy.username, 'Qiu');
  assert.deepEqual(legacy.tasks, []);

  assert.deepEqual(decodeBackup(encodeSnapshot(emptySnapshot())).tasks, []);
  assert.throws(() => decodeBackup('{"other":true}'), /备份文件/);
});
