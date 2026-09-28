import { decodeSnapshot, emptySnapshot, readLegacySnapshot, type PlanSnapshot } from './planSnapshot';

const DATABASE_VERSION = 1;
const STORE_NAME = 'app';
const SNAPSHOT_KEY = 'snapshot';
const MIGRATION_KEY = 'migration-v1';
const LEGACY_KEYS = [
  'planflow_categories',
  'planflow_tasks',
  'planflow_habits',
  'planflow_username'
] as const;

type StorageBoundary = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface PlanRepositoryOptions {
  indexedDB?: IDBFactory;
  storage?: StorageBoundary;
  databaseName?: string;
}

const requestResult = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('IndexedDB 请求失败'));
});

const transactionDone = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB 事务失败'));
  transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB 事务已中止'));
});

export class PlanRepository {
  private readonly factory: IDBFactory;
  private readonly storage?: StorageBoundary;
  private readonly databaseName: string;

  constructor(options: PlanRepositoryOptions = {}) {
    const factory = options.indexedDB ?? globalThis.indexedDB;
    if (!factory) throw new Error('当前浏览器不支持 IndexedDB');
    this.factory = factory;
    this.storage = options.storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
    this.databaseName = options.databaseName ?? 'planflow';
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = this.factory.open(this.databaseName, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库'));
      request.onblocked = () => reject(new Error('本地数据库正被其他页面占用'));
    });
  }

  async load(): Promise<PlanSnapshot> {
    const database = await this.open();
    try {
      const readTransaction = database.transaction(STORE_NAME, 'readonly');
      const stored = await requestResult(readTransaction.objectStore(STORE_NAME).get(SNAPSHOT_KEY));
      await transactionDone(readTransaction);
      if (stored !== undefined) return decodeSnapshot(JSON.stringify(stored));

      const snapshot = this.storage ? readLegacySnapshot(this.storage) : emptySnapshot();
      const writeTransaction = database.transaction(STORE_NAME, 'readwrite');
      const store = writeTransaction.objectStore(STORE_NAME);
      store.put(snapshot, SNAPSHOT_KEY);
      store.put({ completedAt: new Date().toISOString() }, MIGRATION_KEY);
      await transactionDone(writeTransaction);
      return snapshot;
    } finally {
      database.close();
    }
  }

  async save(snapshot: PlanSnapshot): Promise<void> {
    const validated = decodeSnapshot(JSON.stringify(snapshot));
    const database = await this.open();
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(validated, SNAPSHOT_KEY);
      await transactionDone(transaction);
    } finally {
      database.close();
    }
  }

  async clear(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const request = this.factory.deleteDatabase(this.databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('无法清除本地数据库'));
      request.onblocked = () => reject(new Error('请关闭其他 PlanFlow 页面后重试'));
    });
    for (const key of LEGACY_KEYS) this.storage?.removeItem(key);
  }
}
