import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decryptPayload, encryptPayload } from '../sync/crypto.ts';

const payload = {
  schemaVersion: 1,
  clock: 1,
  records: [{
    key: 'task:t1',
    value: { title: '秘密计划' },
    updatedAt: '2026-09-28T10:00:00.000Z',
    logicalClock: 1,
    deviceId: 'phone'
  }]
};

test('encrypted bundle round-trips without exposing plan text', async () => {
  const encrypted = await encryptPayload(payload, 'correct horse', { iterations: 1000 });

  assert.equal(encrypted.includes('秘密计划'), false);
  assert.deepEqual(await decryptPayload(encrypted, 'correct horse'), payload);
});

test('random salt and IV produce different ciphertext for the same payload', async () => {
  const first = await encryptPayload(payload, 'same password', { iterations: 1000 });
  const second = await encryptPayload(payload, 'same password', { iterations: 1000 });

  assert.notEqual(first, second);
});

test('wrong passphrase is rejected', async () => {
  const encrypted = await encryptPayload(payload, 'right', { iterations: 1000 });

  await assert.rejects(decryptPayload(encrypted, 'wrong'));
});

test('tampered ciphertext is rejected', async () => {
  const encrypted = await encryptPayload(payload, 'right', { iterations: 1000 });
  const envelope = JSON.parse(encrypted);
  const replacement = envelope.ciphertext[0] === 'A' ? 'B' : 'A';
  envelope.ciphertext = replacement + envelope.ciphertext.slice(1);

  await assert.rejects(decryptPayload(JSON.stringify(envelope), 'right'));
});

test('empty passphrases and unsafe iteration counts are rejected', async () => {
  await assert.rejects(encryptPayload(payload, '', { iterations: 1000 }), /同步口令/);
  await assert.rejects(encryptPayload(payload, 'secret', { iterations: 999 }), /迭代次数/);
});
