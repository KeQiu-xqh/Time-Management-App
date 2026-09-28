import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOneDriveAuthorization, exchangeOneDriveCode } from '../storage/onedriveAuth.ts';
import { OneDriveProvider } from '../storage/onedriveProvider.ts';

const response = (body, init = {}) => new Response(body, init);

test('authorization request uses PKCE, state, and least-privilege app-folder scope', async () => {
  const auth = await createOneDriveAuthorization({
    clientId: 'client-id',
    redirectUri: 'https://example.com/',
    state: 'fixed-state',
    verifier: 'a'.repeat(64)
  });
  const url = new URL(auth.url);

  assert.equal(url.origin + url.pathname, 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('state'), 'fixed-state');
  assert.equal(url.searchParams.get('scope'), 'openid profile offline_access Files.ReadWrite.AppFolder');
  assert.equal(auth.verifier, 'a'.repeat(64));
});

test('code exchange posts the verifier and rejects mismatched state', async () => {
  let request;
  const fetch = async (url, init) => {
    request = { url, init };
    return response(JSON.stringify({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const token = await exchangeOneDriveCode({
    clientId: 'client-id',
    redirectUri: 'https://example.com/',
    code: 'code',
    state: 'state',
    expectedState: 'state',
    verifier: 'verifier',
    fetch
  });

  assert.equal(token.accessToken, 'access');
  assert.equal(request.url, 'https://login.microsoftonline.com/common/oauth2/v2.0/token');
  assert.match(request.init.body, /code_verifier=verifier/);
  await assert.rejects(exchangeOneDriveCode({
    clientId: 'client-id', redirectUri: 'https://example.com/', code: 'code', state: 'bad', expectedState: 'state', verifier: 'v', fetch
  }), /状态校验失败/);
});

test('provider treats a missing file as empty remote storage', async () => {
  const provider = new OneDriveProvider({
    accessToken: 'token',
    fetch: async () => response('', { status: 404 })
  });

  assert.deepEqual(await provider.read(), { content: null, etag: null });
});

test('provider reads content and ETag from the app folder', async () => {
  const requests = [];
  const provider = new OneDriveProvider({
    accessToken: 'token',
    fetch: async (url, init) => {
      requests.push({ url, init });
      if (requests.length === 1) {
        return response(JSON.stringify({ eTag: 'etag-1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return response('ciphertext', { status: 200 });
    }
  });

  assert.deepEqual(await provider.read(), { content: 'ciphertext', etag: 'etag-1' });
  assert.match(requests[0].url, /special\/approot.*planflow-sync-v1\.bin$/);
  assert.match(requests[1].url, /special\/approot.*planflow-sync-v1\.bin.*content/);
  assert.equal(requests[0].init.headers.get('Authorization'), 'Bearer token');
});

test('provider performs conditional writes and maps conflicts', async () => {
  let headers;
  const provider = new OneDriveProvider({
    accessToken: 'token',
    fetch: async (_url, init) => {
      headers = init.headers;
      return response('{}', { status: 200, headers: { ETag: 'etag-2' } });
    }
  });

  assert.deepEqual(await provider.write('ciphertext', 'etag-1'), { etag: 'etag-2' });
  assert.equal(headers.get('If-Match'), 'etag-1');

  const conflicting = new OneDriveProvider({ accessToken: 'token', fetch: async () => response('', { status: 412 }) });
  await assert.rejects(conflicting.write('ciphertext', 'etag-1'), error => error.code === 'etag_conflict');
});

test('provider maps authorization and rate-limit failures', async () => {
  const unauthorized = new OneDriveProvider({ accessToken: 'token', fetch: async () => response('', { status: 401 }) });
  await assert.rejects(unauthorized.read(), error => error.code === 'authentication_required');

  const limited = new OneDriveProvider({
    accessToken: 'token',
    fetch: async () => response('', { status: 429, headers: { 'Retry-After': '30' } })
  });
  await assert.rejects(limited.read(), error => error.code === 'rate_limited' && error.retryAfter === 30);
});
