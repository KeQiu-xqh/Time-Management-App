import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createSessionResponse, pollSessionResponse, webhookResponse } from '../server/wechatHandlers.ts';
import { LoginSessionService, MemoryLoginSessionStore } from '../server/loginSessionStore.ts';

const service = () => new LoginSessionService(new MemoryLoginSessionStore(), 'hash-secret');

test('session creation and verified polling issue an HttpOnly cookie', async () => {
  const sessions = service();
  const createdResponse = await createSessionResponse(sessions);
  const created = await createdResponse.json();
  assert.match(created.code, /^\d{6}$/);
  assert.equal((await (await pollSessionResponse(new Request(`https://app.test/?id=${created.sessionId}&secret=${created.pollSecret}`), sessions, 'cookie-secret')).json()).status, 'pending');
  await sessions.verifyCode(created.code, 'wx_user');
  const verified = await pollSessionResponse(new Request(`https://app.test/?id=${created.sessionId}&secret=${created.pollSecret}`), sessions, 'cookie-secret');
  assert.match(verified.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax/);
});

test('webhook verifies signature and consumes a text code', async () => {
  const sessions = service();
  const created = await (await createSessionResponse(sessions)).json();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = 'nonce';
  const signature = createHash('sha1').update(['wechat-token', timestamp, nonce].sort().join('')).digest('hex');
  const xml = `<xml><ToUserName><![CDATA[to]]></ToUserName><FromUserName><![CDATA[openid]]></FromUserName><CreateTime>${timestamp}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[${created.code}]]></Content></xml>`;
  const response = await webhookResponse(new Request(`https://app.test/?timestamp=${timestamp}&nonce=${nonce}&signature=${signature}`, { method: 'POST', body: xml }), sessions, { token: 'wechat-token', userSecret: 'user-secret' });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /登录成功/);
});
