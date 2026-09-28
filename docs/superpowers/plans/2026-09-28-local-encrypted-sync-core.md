# Local Encrypted Sync Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Move PlanFlow from direct `localStorage` persistence to a tested IndexedDB repository and add the deterministic record merge and client-side encrypted bundle primitives required by later OneDrive/WebDAV synchronization.

**Architecture:** Keep the current React state and UI behavior, but bootstrap and persist a versioned `PlanSnapshot` through one repository boundary. Mirror legacy localStorage during the migration release for rollback. Implement sync records, merge, and encryption as pure modules so cloud providers can consume them without coupling to React.

**Tech Stack:** React 19, TypeScript 5.8, native IndexedDB, Web Crypto API, Node test runner, tsx, fake-indexeddb.

---

## File map

- Create `data/planSnapshot.ts`: canonical serializable snapshot, legacy parsing, date hydration, and validation.
- Create `data/planRepository.ts`: IndexedDB open/read/write/reset and one-time legacy migration.
- Create `data/usePlanPersistence.ts`: React bootstrap and debounced persistence lifecycle.
- Create `sync/records.ts`: record envelope, device clock, snapshot-to-record conversion.
- Create `sync/merge.ts`: deterministic per-record merge and tombstone handling.
- Create `sync/crypto.ts`: versioned PBKDF2/AES-GCM encrypted bundle encoding.
- Modify `App.tsx`: load through repository, gate persistence until bootstrap, and reset both stores.
- Modify `components/SettingsModal.tsx`: export/import through application callbacks instead of reading localStorage directly.
- Modify `package.json` / `package-lock.json`: add `tsx` and `fake-indexeddb` for direct TypeScript module and repository tests.
- Create `tests/planSnapshot.test.mjs`, `tests/planRepository.test.mjs`, `tests/syncMerge.test.mjs`, and `tests/syncCrypto.test.mjs`.

### Task 1: Canonical snapshot and legacy migration

**Files:**
- Create: `data/planSnapshot.ts`
- Test: `tests/planSnapshot.test.mjs`

- [x] **Step 1: Write the failing snapshot test**

The test must transpile `data/planSnapshot.ts`, construct a storage-like map with all four existing keys, and assert that `readLegacySnapshot()` returns version `1`, preserves the profile and collections, hydrates task dates to `Date`, and returns an empty snapshot for malformed JSON without mutating the input map.

```js
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
```

- [x] **Step 2: Run the test and verify RED**

Run: `node --test tests/planSnapshot.test.mjs`

Expected: FAIL because `data/planSnapshot.ts` does not exist.

- [x] **Step 3: Implement the snapshot boundary**

Define and export these exact APIs:

```ts
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
export function readLegacySnapshot(storage: Pick<Storage, 'getItem'>): PlanSnapshot;
export function encodeSnapshot(snapshot: PlanSnapshot): string;
export function decodeSnapshot(value: string): PlanSnapshot;
```

`decodeSnapshot()` must validate top-level collection shapes and hydrate only `doDate` and `deadline` into valid `Date` objects. `readLegacySnapshot()` must isolate parsing errors per collection so one bad key does not destroy the other valid collections.

- [x] **Step 4: Run the snapshot tests and verify GREEN**

Run: `node --test tests/planSnapshot.test.mjs`

Expected: all snapshot tests PASS.

- [x] **Step 5: Commit**

```powershell
git add data/planSnapshot.ts tests/planSnapshot.test.mjs
git commit -m "feat: add versioned plan snapshot migration"
```

### Task 2: IndexedDB repository

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `data/planRepository.ts`
- Test: `tests/planRepository.test.mjs`

- [x] **Step 1: Install the test-only IndexedDB implementation**

Run: `npm install --save-dev fake-indexeddb tsx`

Expected: `fake-indexeddb` and `tsx` appear under `devDependencies` and npm completes without install errors. Change the test script to `node --import tsx --test tests/*.test.mjs` so new tests can import `.ts` modules directly while existing tests remain valid.

- [x] **Step 2: Write the failing repository tests**

Cover these behaviors with a fresh fake IndexedDB factory per test:

```js
test('repository migrates legacy data only when IndexedDB is empty', async () => {
  const repository = new PlanRepository({ indexedDB, storage });
  const first = await repository.load();
  assert.equal(first.tasks[0].id, 'legacy');
  storage.setItem('planflow_tasks', JSON.stringify([{ id: 'changed' }]));
  const second = await repository.load();
  assert.equal(second.tasks[0].id, 'legacy');
});

test('repository round-trips a snapshot and clears its database', async () => {
  await repository.save(snapshot);
  assert.deepEqual(await repository.load(), snapshot);
  await repository.clear();
  assert.deepEqual(await repository.load(), emptySnapshot());
});
```

- [x] **Step 3: Run repository tests and verify RED**

Run: `node --test tests/planRepository.test.mjs`

Expected: FAIL because `PlanRepository` is not implemented.

- [x] **Step 4: Implement `PlanRepository`**

Expose a single class with dependency injection for tests:

```ts
export interface PlanRepositoryOptions {
  indexedDB?: IDBFactory;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  databaseName?: string;
}

export class PlanRepository {
  constructor(options: PlanRepositoryOptions = {});
  load(): Promise<PlanSnapshot>;
  save(snapshot: PlanSnapshot): Promise<void>;
  clear(): Promise<void>;
}
```

Use database version `1`, object store `app`, record key `snapshot`. On the first empty load, read legacy values, save the resulting snapshot transactionally, and set metadata key `migration-v1`. `save()` must await transaction completion; `clear()` must delete the database and remove only PlanFlow legacy keys, never call `localStorage.clear()`.

- [x] **Step 5: Run repository and complete test suites**

Run: `npm test`

Expected: repository tests and the original 20 tests PASS.

- [x] **Step 6: Commit**

```powershell
git add package.json package-lock.json data/planRepository.ts tests/planRepository.test.mjs
git commit -m "feat: persist plan data in IndexedDB"
```

### Task 3: React persistence integration and backup callbacks

**Files:**
- Create: `data/usePlanPersistence.ts`
- Modify: `App.tsx`
- Modify: `components/SettingsModal.tsx`
- Test: `tests/planSnapshot.test.mjs`

- [x] **Step 1: Add failing tests for backup validation**

Add assertions that `decodeBackup()` accepts both the current backup shape where collection values are JSON strings and the new snapshot shape where they are arrays/objects. It must reject a backup with no recognizable PlanFlow fields.

```js
test('backup decoder accepts old exports and new snapshots', () => {
  assert.equal(decodeBackup(JSON.stringify({ tasks: '[]', habits: '[]', categories: '{}', username: 'Qiu' })).username, 'Qiu');
  assert.deepEqual(decodeBackup(encodeSnapshot(emptySnapshot())).tasks, []);
  assert.throws(() => decodeBackup('{"other":true}'), /备份文件/);
});
```

- [x] **Step 2: Run the test and verify RED**

Run: `node --test tests/planSnapshot.test.mjs`

Expected: FAIL because `decodeBackup` is not exported.

- [x] **Step 3: Implement backup compatibility and the persistence hook**

Add:

```ts
export function decodeBackup(value: string): PlanSnapshot;
```

Create `usePlanPersistence` with this interface:

```ts
export interface PlanStateSetters {
  setCategories(value: Record<string, Category>): void;
  setTasks(value: Task[]): void;
  setHabits(value: Habit[]): void;
  setUserName(value: string): void;
}

export function usePlanPersistence(snapshot: PlanSnapshot, setters: PlanStateSetters) {
  return { ready, error, importSnapshot, resetData };
}
```

The hook loads once, applies the repository snapshot, and does not save until bootstrap completes. After bootstrap, debounce writes by 250 ms and mirror the four old localStorage keys for one rollback release. `importSnapshot()` saves before applying state. `resetData()` clears the PlanFlow repository and its four legacy keys, then reloads.

- [x] **Step 4: Route App and Settings through the repository**

In `App.tsx`, replace lazy localStorage reads and four direct persistence effects with `emptySnapshot()` initial values and `usePlanPersistence()`. Pass the current snapshot to the hook. Display a non-destructive loading state until bootstrap completes and a recovery message with export access on repository failure. Gate the daily-review effect on `ready` so expired tasks are evaluated after repository bootstrap rather than against the initial empty array.

Change `SettingsModal` props to:

```ts
interface SettingsModalProps {
  currentName: string;
  snapshot: PlanSnapshot;
  onSaveName(name: string): void;
  onImportSnapshot(snapshot: PlanSnapshot): Promise<void>;
  onResetData(): Promise<void>;
  onClearCompleted(): void;
  onClose(): void;
}
```

Export `encodeSnapshot(snapshot)` and import with `decodeBackup(content)`. No component may read or write localStorage directly.

- [x] **Step 5: Run all tests and build**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: Vite production build succeeds with no TypeScript transform errors.

- [x] **Step 6: Commit**

```powershell
git add App.tsx components/SettingsModal.tsx data/usePlanPersistence.ts data/planSnapshot.ts tests/planSnapshot.test.mjs
git commit -m "refactor: route app persistence through repository"
```

### Task 4: Deterministic sync records and conflict merge

**Files:**
- Create: `sync/records.ts`
- Create: `sync/merge.ts`
- Test: `tests/syncMerge.test.mjs`

- [x] **Step 1: Write failing merge tests**

Cover different-record union, larger logical clock winning, `deviceId` tie-break, a newer tombstone deleting an older live record, an older tombstone losing to a newer edit, and deterministic output ordering.

```js
test('merge converges for simultaneous edits regardless of argument order', () => {
  const a = record('task:t1', 4, 'phone', { title: '手机修改' });
  const b = record('task:t1', 4, 'desktop', { title: '电脑修改' });
  assert.deepEqual(mergeRecords([a], [b]), mergeRecords([b], [a]));
});

test('newer tombstone prevents deleted data from reappearing', () => {
  const live = record('task:t1', 2, 'phone', { title: '旧任务' });
  const deleted = record('task:t1', 3, 'desktop', null, '2026-09-28T10:00:00.000Z');
  assert.equal(mergeRecords([live], [deleted])[0].value, null);
});
```

- [x] **Step 2: Run merge tests and verify RED**

Run: `node --test tests/syncMerge.test.mjs`

Expected: FAIL because the sync modules do not exist.

- [x] **Step 3: Implement record types and merge**

Use the exact public types:

```ts
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
export function mergeRecords(local: SyncRecord[], remote: SyncRecord[]): SyncRecord[];
export function mergePayloads(local: SyncPayload, remote: SyncPayload): SyncPayload;
```

Compare records by `logicalClock`, then `deviceId`, then the serialized record as a final stable tie-break. Return records sorted by key. `mergePayloads()` sets clock to `max(local.clock, remote.clock) + 1`.

- [x] **Step 4: Run merge tests and full suite**

Run: `npm test`

Expected: all tests PASS.

- [x] **Step 5: Commit**

```powershell
git add sync/records.ts sync/merge.ts tests/syncMerge.test.mjs
git commit -m "feat: add deterministic sync merge"
```

### Task 5: Client-side encrypted bundle

**Files:**
- Create: `sync/crypto.ts`
- Test: `tests/syncCrypto.test.mjs`

- [x] **Step 1: Write failing encryption tests**

Use a low iteration count only in tests by passing options. Assert round-trip, random salt/IV producing different ciphertext, wrong passphrase rejection, and tamper rejection.

```js
test('encrypted bundle round-trips without exposing plan text', async () => {
  const payload = { schemaVersion: 1, clock: 1, records: [record('task:t1', 1, 'phone', { title: '秘密计划' })] };
  const encrypted = await encryptPayload(payload, 'correct horse', { iterations: 1000 });
  assert.equal(encrypted.includes('秘密计划'), false);
  assert.deepEqual(await decryptPayload(encrypted, 'correct horse'), payload);
});

test('wrong passphrase and tampering are rejected', async () => {
  const encrypted = await encryptPayload(payload, 'right', { iterations: 1000 });
  await assert.rejects(decryptPayload(encrypted, 'wrong'));
  await assert.rejects(decryptPayload(encrypted.slice(0, -2) + 'AA', 'right'));
});
```

- [x] **Step 2: Run encryption tests and verify RED**

Run: `node --test tests/syncCrypto.test.mjs`

Expected: FAIL because `sync/crypto.ts` does not exist.

- [x] **Step 3: Implement the versioned envelope**

Expose:

```ts
export interface EncryptionOptions { iterations?: number }
export interface EncryptedEnvelopeV1 {
  format: 'planflow-encrypted';
  version: 1;
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}
export async function encryptPayload(payload: SyncPayload, passphrase: string, options?: EncryptionOptions): Promise<string>;
export async function decryptPayload(bundle: string, passphrase: string): Promise<SyncPayload>;
```

Use `crypto.subtle`, a 16-byte salt, 12-byte IV, AES-GCM 256-bit key, and default PBKDF2 iteration count `310000`. Reject empty passphrases, malformed base64, unsupported versions, iteration counts below `1000`, and payloads whose schema is not version `1`.

- [x] **Step 4: Run crypto and complete suites**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: production build succeeds.

- [x] **Step 5: Commit**

```powershell
git add sync/crypto.ts tests/syncCrypto.test.mjs
git commit -m "feat: encrypt sync bundles in the browser"
```

### Task 6: Phase verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-09-28-local-encrypted-sync-core.md`

- [x] **Step 1: Document local migration and security boundary**

Add a README section stating that local data now uses IndexedDB, legacy localStorage is temporarily mirrored for rollback, cloud sync is not enabled until a provider is connected, and forgetting the later sync passphrase will make cloud ciphertext unrecoverable.

- [x] **Step 2: Run final verification**

Run: `npm test`

Expected: every test passes with zero failures.

Run: `npm run build`

Expected: production bundle builds successfully.

Run: `git diff --check`

Expected: no whitespace errors.

- [x] **Step 3: Mark completed plan checkboxes and commit**

```powershell
git add README.md docs/superpowers/plans/2026-09-28-local-encrypted-sync-core.md
git commit -m "docs: describe encrypted local sync foundation"
```
