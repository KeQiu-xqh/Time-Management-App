import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decryptPayload, encryptPayload } from '../sync/crypto.ts';
import { runSync } from '../sync/engine.ts';
import { StorageProviderError } from '../storage/provider.ts';
import { emptyPayload, updatePayloadFromSnapshot } from '../sync/projection.ts';

const snapshot = (taskId = 'local') => ({
  version: 1,
  username: 'Qiu',
  categories: {},
  tasks: [{ id: taskId, title: taskId, isCompleted: false }],
  habits: []
});

class MemoryProvider {
  constructor(content = null) {
    this.content = content;
    this.etag = content ? '1' : null;
    this.writes = 0;
    this.conflictsRemaining = 0;
  }
  async read() {
    return { content: this.content, etag: this.etag };
  }
  async write(content, expectedEtag) {
    this.writes += 1;
    if (this.conflictsRemaining > 0) {
      this.conflictsRemaining -= 1;
      throw new StorageProviderError('etag_conflict', 'conflict');
    }
    if (expectedEtag !== this.etag) throw new StorageProviderError('etag_conflict', 'conflict');
    this.content = content;
    this.etag = String(Number(this.etag ?? '0') + 1);
    return { etag: this.etag };
  }
}

test('first sync uploads an encrypted local payload', async () => {
  const provider = new MemoryProvider();

  const result = await runSync({
    snapshot: snapshot(),
    payload: null,
    deviceId: 'phone',
    passphrase: 'secret',
    provider
  });

  assert.equal(provider.writes, 1);
  assert.equal(provider.content.includes('local'), false);
  assert.equal(result.snapshot.tasks[0].id, 'local');
  assert.deepEqual(await decryptPayload(provider.content, 'secret'), result.payload);
});

test('sync merges remote and local records', async () => {
  const remotePayload = updatePayloadFromSnapshot(snapshot('remote'), emptyPayload(), 'desktop');
  const provider = new MemoryProvider(await encryptPayload(remotePayload, 'secret', { iterations: 1000 }));

  const result = await runSync({
    snapshot: snapshot('local'),
    payload: null,
    deviceId: 'phone',
    passphrase: 'secret',
    provider
  });

  assert.deepEqual(result.snapshot.tasks.map(task => task.id), ['local', 'remote']);
});

test('ETag conflict rereads remote and retries', async () => {
  const provider = new MemoryProvider();
  provider.conflictsRemaining = 1;

  await runSync({
    snapshot: snapshot(),
    payload: null,
    deviceId: 'phone',
    passphrase: 'secret',
    provider,
    maxConflictRetries: 2
  });

  assert.equal(provider.writes, 2);
});

test('wrong passphrase never overwrites remote content', async () => {
  const remotePayload = updatePayloadFromSnapshot(snapshot('remote'), emptyPayload(), 'desktop');
  const provider = new MemoryProvider(await encryptPayload(remotePayload, 'right', { iterations: 1000 }));

  await assert.rejects(runSync({
    snapshot: snapshot('local'),
    payload: null,
    deviceId: 'phone',
    passphrase: 'wrong',
    provider
  }), /口令错误/);
  assert.equal(provider.writes, 0);
});

test('non-conflict write errors are not retried', async () => {
  const provider = new MemoryProvider();
  provider.write = async () => {
    provider.writes += 1;
    throw new StorageProviderError('quota_exceeded', '网盘空间不足');
  };

  await assert.rejects(runSync({
    snapshot: snapshot(),
    payload: null,
    deviceId: 'phone',
    passphrase: 'secret',
    provider
  }), /网盘空间不足/);
  assert.equal(provider.writes, 1);
});
