import test from 'node:test';
import assert from 'node:assert/strict';

const entrypoints = [
  '../api/auth/wechat/logout.ts',
  '../api/auth/wechat/me.ts',
  '../api/auth/wechat/session.ts',
  '../api/auth/wechat/status.ts',
  '../api/storage/webdav.ts',
  '../api/wechat/webhook.ts',
];

test('all Vercel entrypoints load as native ESM modules', async () => {
  for (const entrypoint of entrypoints) {
    const module = await import(entrypoint);
    assert.ok(module.default || module.GET || module.POST, `${entrypoint} has no request handler`);
  }
});
