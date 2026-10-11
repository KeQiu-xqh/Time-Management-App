import { test } from 'node:test';
import assert from 'node:assert/strict';
import webdavHandler from '../api/storage/webdav.ts';

test('WebDAV relay returns a bodyless response for an upstream 204', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnabled = process.env.WEBDAV_PROXY_ENABLED;
  process.env.WEBDAV_PROXY_ENABLED = 'true';
  globalThis.fetch = async () => new Response(null, {
    status: 204,
    headers: { ETag: 'etag-2' }
  });

  try {
    const request = new Request('https://planflow.example/api/storage/webdav', {
      method: 'PUT',
      headers: {
        'X-PlanFlow-WebDAV-Target': 'https://1.1.1.1/planflow-sync-v1.bin',
        'X-PlanFlow-WebDAV-Authorization': 'Basic dGVzdDp0ZXN0'
      },
      body: 'encrypted payload',
      duplex: 'half'
    });

    const response = await webdavHandler.fetch(request);

    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');
    assert.equal(response.headers.get('ETag'), 'etag-2');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalEnabled === undefined) delete process.env.WEBDAV_PROXY_ENABLED;
    else process.env.WEBDAV_PROXY_ENABLED = originalEnabled;
  }
});
