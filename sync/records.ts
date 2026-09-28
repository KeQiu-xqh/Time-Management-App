export type SyncEntity = 'category' | 'task' | 'habit' | 'profile';

export interface SyncRecord<T = unknown> {
  key: `${SyncEntity}:${string}`;
  value: T | null;
  updatedAt: string;
  logicalClock: number;
  deviceId: string;
  deletedAt?: string;
}

export interface SyncPayload {
  schemaVersion: 1;
  clock: number;
  records: SyncRecord[];
}
