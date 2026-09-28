import type { SyncPayload, SyncRecord } from './records';

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)])
    );
  }
  return value;
};

const compareRecords = (left: SyncRecord, right: SyncRecord): number => {
  if (left.logicalClock !== right.logicalClock) return left.logicalClock - right.logicalClock;
  const deviceOrder = left.deviceId.localeCompare(right.deviceId);
  if (deviceOrder !== 0) return deviceOrder;
  return JSON.stringify(stableValue(left)).localeCompare(JSON.stringify(stableValue(right)));
};

export function mergeRecords(local: SyncRecord[], remote: SyncRecord[]): SyncRecord[] {
  const records = new Map<string, SyncRecord>();
  for (const candidate of [...local, ...remote]) {
    const current = records.get(candidate.key);
    if (!current || compareRecords(current, candidate) < 0) records.set(candidate.key, candidate);
  }
  return [...records.values()].sort((left, right) => left.key.localeCompare(right.key));
}

export function mergePayloads(local: SyncPayload, remote: SyncPayload): SyncPayload {
  if (local.schemaVersion !== 1 || remote.schemaVersion !== 1) {
    throw new Error('不支持的同步数据版本');
  }
  return {
    schemaVersion: 1,
    clock: Math.max(local.clock, remote.clock) + 1,
    records: mergeRecords(local.records, remote.records)
  };
}
