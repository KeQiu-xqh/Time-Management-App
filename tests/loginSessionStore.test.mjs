import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LoginSessionService, MemoryLoginSessionStore } from '../server/loginSessionStore.ts';

test('login session verifies a code and can be consumed only once', async () => {
  let now = 1700000000;
  const store = new MemoryLoginSessionStore(() => now);
  const service = new LoginSessionService(store, 'hash-secret', () => now);
  const created = await service.create();

  assert.equal((await service.poll(created.sessionId, created.pollSecret)).status, 'pending');
  assert.equal(await service.verifyCode(created.code, 'wx_user'), true);
  assert.deepEqual(await service.poll(created.sessionId, created.pollSecret), { status: 'verified', userId: 'wx_user' });
  assert.equal(await service.consume(created.sessionId, created.pollSecret), 'wx_user');
  assert.equal(await service.consume(created.sessionId, created.pollSecret), null);
});

test('wrong poll secret and expired sessions reveal no identity', async () => {
  let now = 1700000000;
  const service = new LoginSessionService(new MemoryLoginSessionStore(() => now), 'hash-secret', () => now);
  const created = await service.create();
  assert.equal((await service.poll(created.sessionId, 'wrong')).status, 'expired');
  now += 301;
  assert.equal((await service.poll(created.sessionId, created.pollSecret)).status, 'expired');
  assert.equal(await service.verifyCode(created.code, 'wx_user'), false);
});
