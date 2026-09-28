import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WebDavProvider } from '../storage/webdavProvider.ts';

const response = (body, init = {}) => new Response(body, init);

test('WebDAV reads and conditionally writes an encrypted file', async () => {
  const requests = [];
  const provider = new WebDavProvider({
    endpoint: 'https://dav.example.com/planflow-sync-v1.bin',
    username: 'user',
    appPassword: 'password',
    fetch: async (url, init) => {
      requests.push({ url, init });
      if (init.method === 'GET') return response('ciphertext', { status: 200, headers: { ETag: 'etag-1' } });
      return response(null, { status: 204, headers: { ETag: 'etag-2' } });
    }
  });

  assert.deepEqual(await provider.read(), { content: 'ciphertext', etag: 'etag-1' });
  assert.deepEqual(await provider.write('next', 'etag-1'), { etag: 'etag-2' });
  assert.equal(requests[0].init.headers.get('Authorization').startsWith('Basic '), true);
  assert.equal(requests[1].init.headers.get('If-Match'), 'etag-1');
});

test('WebDAV maps missing files and conflicts', async () => {
  const missing = new WebDavProvider({
    endpoint: 'https://dav.example.com/file', username: 'u', appPassword: 'p', fetch: async () => response('', { status: 404 })
  });
  assert.deepEqual(await missing.read(), { content: null, etag: null });

  const conflict = new WebDavProvider({
    endpoint: 'https://dav.example.com/file', username: 'u', appPassword: 'p', fetch: async () => response('', { status: 412 })
  });
  await assert.rejects(conflict.write('next', 'etag'), error => error.code === 'etag_conflict');
});

test('WebDAV relay keeps target and credentials out of the URL', async () => {
  let request;
  const provider = new WebDavProvider({
    endpoint: 'https://dav.example.com/private/file',
    username: 'user',
    appPassword: 'password',
    useRelay: true,
    fetch: async (url, init) => {
      request = { url, init };
      return response('', { status: 404 });
    }
  });

  await provider.read();
  assert.equal(request.url, '/api/storage/webdav');
  assert.equal(request.init.headers.get('X-PlanFlow-WebDAV-Target'), 'https://dav.example.com/private/file');
  assert.equal(request.url.includes('password'), false);
});

test('WebDAV rejects non-HTTPS endpoints before network access', () => {
  assert.throws(() => new WebDavProvider({
    endpoint: 'http://dav.example.com/file', username: 'u', appPassword: 'p'
  }), /HTTPS/);
});
