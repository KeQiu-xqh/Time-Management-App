import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { deriveUserId, parseWechatTextMessage, signAppSession, verifyAppSession, verifyWechatSignature } from '../server/wechatSecurity.ts';

test('verifies official-account SHA-1 signatures within the replay window', () => {
  const token = 'token';
  const timestamp = '1700000000';
  const nonce = 'nonce';
  const signature = createHash('sha1').update([token, timestamp, nonce].sort().join('')).digest('hex');
  assert.equal(verifyWechatSignature(token, timestamp, nonce, signature, 1700000100), true);
  assert.equal(verifyWechatSignature(token, timestamp, nonce, signature, 1700001000), false);
  assert.equal(verifyWechatSignature(token, timestamp, nonce, 'bad', 1700000100), false);
});

test('parses text callbacks and rejects entity-bearing XML', () => {
  const xml = '<xml><ToUserName><![CDATA[to]]></ToUserName><FromUserName><![CDATA[openid]]></FromUserName><CreateTime>1700000000</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[123456]]></Content></xml>';
  assert.deepEqual(parseWechatTextMessage(xml), { fromUserName: 'openid', toUserName: 'to', content: '123456', createTime: 1700000000 });
  assert.equal(parseWechatTextMessage('<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]><xml/>'), null);
  assert.equal(parseWechatTextMessage(xml.replace('text', 'image')), null);
});

test('derived user IDs are stable and do not expose openid', () => {
  const first = deriveUserId('openid-secret', 'app-secret');
  assert.equal(first, deriveUserId('openid-secret', 'app-secret'));
  assert.equal(first.includes('openid-secret'), false);
});

test('signed app sessions round-trip and reject tampering or expiry', async () => {
  const token = await signAppSession('user-1', 'cookie-secret', 1700001000);
  assert.deepEqual(await verifyAppSession(token, 'cookie-secret', 1700000000), { userId: 'user-1', expiresAt: 1700001000 });
  assert.equal(await verifyAppSession(`${token}x`, 'cookie-secret', 1700000000), null);
  assert.equal(await verifyAppSession(token, 'cookie-secret', 1700001001), null);
});
