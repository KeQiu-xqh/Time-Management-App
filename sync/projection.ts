import { decodeSnapshot, emptySnapshot, type PlanSnapshot } from '../data/planSnapshot';
import type { SyncPayload, SyncRecord } from './records';

export const emptyPayload = (): SyncPayload => ({ schemaVersion: 1, clock: 0, records: [] });

const serializable = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    );
  }
  return value;
};

const equalValues = (left: unknown, right: unknown) =>
  JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));

const desiredRecords = (snapshot: PlanSnapshot): Map<string, unknown> => {
  const desired = new Map<string, unknown>();
  for (const category of Object.values(snapshot.categories)) desired.set(`category:${category.id}`, serializable(category));
  for (const habit of snapshot.habits) desired.set(`habit:${habit.id}`, serializable(habit));
  for (const task of snapshot.tasks) desired.set(`task:${task.id}`, serializable(task));
  desired.set('profile:default', { username: snapshot.username });
  return desired;
};

export function updatePayloadFromSnapshot(
  snapshot: PlanSnapshot,
  previous: SyncPayload,
  deviceId: string,
  now: () => string = () => new Date().toISOString()
): SyncPayload {
  if (!deviceId.trim()) throw new Error('设备标识不能为空');
  const desired = desiredRecords(snapshot);
  const existing = new Map(previous.records.map(record => [record.key, record]));
  const records: SyncRecord[] = [];
  let clock = previous.clock;

  for (const [key, value] of desired) {
    const old = existing.get(key);
    if (old && old.value !== null && equalValues(old.value, value)) {
      records.push(old);
    } else {
      clock += 1;
      records.push({
        key: key as SyncRecord['key'],
        value,
        updatedAt: now(),
        logicalClock: clock,
        deviceId
      });
    }
  }

  for (const old of previous.records) {
    if (desired.has(old.key)) continue;
    if (old.value === null) {
      records.push(old);
      continue;
    }
    clock += 1;
    const deletedAt = now();
    records.push({
      key: old.key,
      value: null,
      updatedAt: deletedAt,
      logicalClock: clock,
      deviceId,
      deletedAt
    });
  }

  return {
    schemaVersion: 1,
    clock,
    records: records.sort((left, right) => left.key.localeCompare(right.key))
  };
}

export function snapshotFromPayload(payload: SyncPayload): PlanSnapshot {
  const snapshot = emptySnapshot();
  for (const record of payload.records) {
    if (record.value === null) continue;
    const [entity, id] = record.key.split(':', 2);
    if (entity === 'category') snapshot.categories[id] = record.value as PlanSnapshot['categories'][string];
    if (entity === 'habit') snapshot.habits.push(record.value as PlanSnapshot['habits'][number]);
    if (entity === 'task') snapshot.tasks.push(record.value as PlanSnapshot['tasks'][number]);
    if (entity === 'profile' && id === 'default') {
      const profile = record.value as { username?: unknown };
      if (typeof profile.username === 'string') snapshot.username = profile.username;
    }
  }
  snapshot.habits.sort((left, right) => left.id.localeCompare(right.id));
  snapshot.tasks.sort((left, right) => left.id.localeCompare(right.id));
  return decodeSnapshot(JSON.stringify(snapshot));
}
