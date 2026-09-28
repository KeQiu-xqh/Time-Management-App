# User-Owned Storage Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize encrypted PlanFlow records through a user's OneDrive App Folder or WebDAV account without storing schedule content on the project server.

**Architecture:** Convert `PlanSnapshot` into stable per-entity records, persist sync metadata beside the local snapshot, and run an ETag-protected download/merge/upload cycle. Storage providers implement one small interface; OneDrive talks directly to Microsoft Graph, while WebDAV tries direct CORS access and can use a hardened Vercel relay when explicitly enabled.

**Tech Stack:** TypeScript, Web Crypto, Microsoft identity platform OAuth 2.0 PKCE, Microsoft Graph App Folder, WebDAV, Vercel Node Functions, Node test runner.

---

### Task 1: Snapshot and record projection

**Files:**
- Modify: `sync/records.ts`
- Create: `sync/projection.ts`
- Test: `tests/syncProjection.test.mjs`

- [ ] **Step 1: Write failing tests**

Test that categories, tasks, habits, and profile become stable keys; dates serialize to ISO strings; unchanged values retain revisions; changed values increment the payload clock; and removed values create tombstones.

```js
const first = updatePayloadFromSnapshot(snapshot, emptyPayload(), 'phone', now);
const unchanged = updatePayloadFromSnapshot(snapshot, first, 'phone', now);
assert.deepEqual(unchanged, first);
const removed = updatePayloadFromSnapshot({ ...snapshot, tasks: [] }, first, 'phone', now);
assert.equal(removed.records.find(r => r.key === 'task:t1').value, null);
assert.equal(snapshotFromPayload(first).tasks[0].doDate instanceof Date, true);
```

- [ ] **Step 2: Verify RED**

Run: `node --import tsx --test tests/syncProjection.test.mjs`

Expected: FAIL because `sync/projection.ts` does not exist.

- [ ] **Step 3: Implement projection**

Export:

```ts
export const emptyPayload = (): SyncPayload => ({ schemaVersion: 1, clock: 0, records: [] });
export function updatePayloadFromSnapshot(snapshot: PlanSnapshot, previous: SyncPayload, deviceId: string, now?: () => string): SyncPayload;
export function snapshotFromPayload(payload: SyncPayload): PlanSnapshot;
```

Increment the clock once per changed or deleted entity, retain existing tombstones, compare canonical JSON, and sort keys. Use `profile:default` for the username.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npm test`

Expected: all tests PASS.

```powershell
git add sync/records.ts sync/projection.ts tests/syncProjection.test.mjs
git commit -m "feat: project plan snapshots into sync records"
```

### Task 2: Persist local sync metadata

**Files:**
- Modify: `data/planRepository.ts`
- Test: `tests/planRepository.test.mjs`

- [ ] **Step 1: Add a failing round-trip test**

```js
await repository.saveSyncPayload(payload);
assert.deepEqual(await repository.loadSyncPayload(), payload);
await repository.clear();
assert.equal(await repository.loadSyncPayload(), null);
```

- [ ] **Step 2: Verify RED**

Run: `node --import tsx --test tests/planRepository.test.mjs`

Expected: FAIL because the methods do not exist.

- [ ] **Step 3: Implement metadata methods**

Add `loadSyncPayload(): Promise<SyncPayload | null>` and `saveSyncPayload(payload: SyncPayload): Promise<void>` using key `sync-payload` in the existing `app` store. Validate schema version, clock, records, and record keys before returning data.

- [ ] **Step 4: Verify and commit**

Run: `npm test`

Expected: all tests PASS.

```powershell
git add data/planRepository.ts tests/planRepository.test.mjs
git commit -m "feat: persist sync metadata locally"
```

### Task 3: Storage provider contract and sync engine

**Files:**
- Create: `storage/provider.ts`
- Create: `sync/engine.ts`
- Test: `tests/syncEngine.test.mjs`

- [ ] **Step 1: Write failing engine tests**

Use an in-memory provider to cover first upload, remote download, concurrent ETag conflict followed by retry, wrong passphrase without upload, and local repository save only after a successful remote write.

```ts
export interface StorageReadResult { content: string | null; etag: string | null }
export interface StorageWriteResult { etag: string | null }
export interface StorageProvider {
  read(): Promise<StorageReadResult>;
  write(content: string, expectedEtag: string | null): Promise<StorageWriteResult>;
}
```

- [ ] **Step 2: Verify RED**

Run: `node --import tsx --test tests/syncEngine.test.mjs`

Expected: FAIL because the engine does not exist.

- [ ] **Step 3: Implement one sync cycle**

Export:

```ts
export interface SyncEngineInput {
  snapshot: PlanSnapshot;
  payload: SyncPayload | null;
  deviceId: string;
  passphrase: string;
  provider: StorageProvider;
  maxConflictRetries?: number;
}
export interface SyncEngineResult { snapshot: PlanSnapshot; payload: SyncPayload; etag: string | null }
export async function runSync(input: SyncEngineInput): Promise<SyncEngineResult>;
```

Build the local payload, read and decrypt remote content when present, merge, conditionally write, and retry a provider error with code `etag_conflict` up to two times. Never call `write` if decryption fails.

- [ ] **Step 4: Verify and commit**

Run: `npm test`

Expected: all tests PASS.

```powershell
git add storage/provider.ts sync/engine.ts tests/syncEngine.test.mjs
git commit -m "feat: add encrypted storage sync engine"
```

### Task 4: OneDrive App Folder provider

**Files:**
- Create: `storage/onedriveAuth.ts`
- Create: `storage/onedriveProvider.ts`
- Test: `tests/oneDriveProvider.test.mjs`
- Create: `.env.example`

- [ ] **Step 1: Write failing provider tests**

Stub `fetch` and test PKCE URL fields, state verification, token exchange, missing-file handling, ETag extraction, `If-Match` writes, 401 reauthorization, 412 conflict mapping, and 429 retry metadata.

```js
const provider = new OneDriveProvider({ accessToken: 'token', fetch });
await provider.write('ciphertext', 'etag-1');
assert.equal(fetch.calls[0].headers.get('If-Match'), 'etag-1');
```

- [ ] **Step 2: Verify RED**

Run: `node --import tsx --test tests/oneDriveProvider.test.mjs`

Expected: FAIL because the provider does not exist.

- [ ] **Step 3: Implement OAuth PKCE and Graph access**

Use authorization endpoint `https://login.microsoftonline.com/common/oauth2/v2.0/authorize`, token endpoint `https://login.microsoftonline.com/common/oauth2/v2.0/token`, scopes `openid profile offline_access Files.ReadWrite.AppFolder`, and Graph path `https://graph.microsoft.com/v1.0/me/drive/special/approot:/planflow-sync-v1.bin:/content`. Keep OAuth state and verifier in `sessionStorage`; keep access and refresh tokens in session-only encrypted state, never localStorage.

`.env.example` must contain only:

```dotenv
VITE_ONEDRIVE_CLIENT_ID=
VITE_ONEDRIVE_REDIRECT_URI=https://time-management-app-ashen.vercel.app/
```

- [ ] **Step 4: Verify and commit**

Run: `npm test`

Expected: all tests PASS.

```powershell
git add storage/onedriveAuth.ts storage/onedriveProvider.ts tests/oneDriveProvider.test.mjs .env.example
git commit -m "feat: add OneDrive app-folder provider"
```

### Task 5: WebDAV provider and hardened relay

**Files:**
- Create: `storage/webdavProvider.ts`
- Create: `api/storage/webdav.ts`
- Create: `server/webdavTarget.ts`
- Test: `tests/webdavProvider.test.mjs`
- Test: `tests/webdavTarget.test.mjs`

- [ ] **Step 1: Write failing tests**

Test direct GET/PUT, 404-as-empty, ETag forwarding, 412 mapping, proxy fallback, HTTPS-only targets, rejection of localhost/private/link-local addresses, non-443 ports, redirects, files above 2 MiB, and disabled proxy behavior.

```js
assert.equal(await validateWebDavTarget('http://example.com/file'), false);
assert.equal(await validateWebDavTarget('https://127.0.0.1/file'), false);
assert.equal(await validateWebDavTarget('https://example.com:8443/file'), false);
```

- [ ] **Step 2: Verify RED**

Run: `node --import tsx --test tests/webdavProvider.test.mjs tests/webdavTarget.test.mjs`

Expected: FAIL because the WebDAV modules do not exist.

- [ ] **Step 3: Implement provider and relay**

`WebDavProvider` accepts endpoint, username, app password, fetch, and `useRelay`. It sends Basic authorization only to the configured HTTPS endpoint or same-origin relay. The Vercel function uses Web `Request`/`Response`, is enabled only when `WEBDAV_PROXY_ENABLED=true`, resolves DNS before fetch, rejects private targets, allows only GET/PUT, uses `redirect: 'manual'`, caps request/response bodies at 2 MiB, and never logs credentials or bodies.

- [ ] **Step 4: Verify and commit**

Run: `npm test`

Expected: all tests PASS.

```powershell
git add storage/webdavProvider.ts api/storage/webdav.ts server/webdavTarget.ts tests/webdavProvider.test.mjs tests/webdavTarget.test.mjs
git commit -m "feat: add guarded WebDAV storage provider"
```

### Task 6: Account and sync settings UI

**Files:**
- Create: `sync/useCloudSync.ts`
- Create: `components/SyncSettings.tsx`
- Modify: `components/SettingsModal.tsx`
- Modify: `App.tsx`
- Modify: `README.md`

- [ ] **Step 1: Implement the UI state machine**

Expose statuses `disconnected`, `ready`, `syncing`, `synced`, `offline`, `reauthorize`, and `error`. Generate and store a random device ID locally. Keep the sync passphrase and WebDAV app password only in component memory. Trigger sync manually, after a 2-second local change debounce, on `online`, and on `visibilitychange` when visible.

- [ ] **Step 2: Add settings controls**

Show OneDrive and WebDAV cards, configuration status, passphrase input, connect/disconnect, immediate sync, last-success time, and actionable Chinese errors. If `VITE_ONEDRIVE_CLIENT_ID` is missing, show the exact required environment variable instead of initiating OAuth. Require confirmation before first upload or merging non-empty local and remote data.

- [ ] **Step 3: Document operator configuration**

Document Microsoft Entra SPA registration, production redirect URI, delegated `Files.ReadWrite.AppFolder`, Vercel environment variables, WebDAV relay opt-in, 2 MiB limit, and the fact that users bear their own storage quota.

- [ ] **Step 4: Final verification and commit**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: production build succeeds.

Run: `git diff --check`

Expected: no whitespace errors.

```powershell
git add sync/useCloudSync.ts components/SyncSettings.tsx components/SettingsModal.tsx App.tsx README.md
git commit -m "feat: add user-owned storage sync settings"
```

