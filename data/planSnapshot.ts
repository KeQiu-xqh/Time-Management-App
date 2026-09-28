import type { Category, Habit, Task } from '../types';

export const SNAPSHOT_VERSION = 1 as const;

export interface PlanSnapshot {
  version: typeof SNAPSHOT_VERSION;
  categories: Record<string, Category>;
  tasks: Task[];
  habits: Habit[];
  username: string;
}

export const emptySnapshot = (): PlanSnapshot => ({
  version: SNAPSHOT_VERSION,
  categories: {},
  tasks: [],
  habits: [],
  username: 'Guest User'
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseCollection = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const toDate = (value: unknown): Date | undefined => {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value;
  if (typeof value !== 'string') return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
};

const hydrateTask = (value: unknown): Task => {
  const task = isRecord(value) ? { ...value } : {};
  const doDate = toDate(task.doDate);
  const deadline = toDate(task.deadline);
  if (doDate) task.doDate = doDate;
  else delete task.doDate;
  if (deadline) task.deadline = deadline;
  else delete task.deadline;
  return task as unknown as Task;
};

const validateSnapshotValue = (value: unknown): PlanSnapshot => {
  if (!isRecord(value)
    || value.version !== SNAPSHOT_VERSION
    || !isRecord(value.categories)
    || !Array.isArray(value.tasks)
    || !Array.isArray(value.habits)
    || typeof value.username !== 'string') {
    throw new Error('计划快照格式无效');
  }

  return {
    version: SNAPSHOT_VERSION,
    categories: value.categories as Record<string, Category>,
    tasks: value.tasks.map(hydrateTask),
    habits: value.habits as Habit[],
    username: value.username.trim() || 'Guest User'
  };
};

export function readLegacySnapshot(storage: Pick<Storage, 'getItem'>): PlanSnapshot {
  const categories = parseCollection<unknown>(storage.getItem('planflow_categories'), {});
  const tasks = parseCollection<unknown>(storage.getItem('planflow_tasks'), []);
  const habits = parseCollection<unknown>(storage.getItem('planflow_habits'), []);
  const username = storage.getItem('planflow_username');

  return {
    version: SNAPSHOT_VERSION,
    categories: isRecord(categories) ? categories as Record<string, Category> : {},
    tasks: Array.isArray(tasks) ? tasks.map(hydrateTask) : [],
    habits: Array.isArray(habits) ? habits as Habit[] : [],
    username: username?.trim() || 'Guest User'
  };
}

export function encodeSnapshot(snapshot: PlanSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function decodeSnapshot(value: string): PlanSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('计划快照格式无效');
  }
  return validateSnapshotValue(parsed);
}
