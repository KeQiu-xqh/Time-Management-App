import { assertWebDavTarget } from '../../server/webdavTarget.js';

const MAX_BYTES = 2 * 1024 * 1024;

const jsonError = (message: string, status: number) =>
  Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });

const relay = async (request: Request) => {
  if (process.env.WEBDAV_PROXY_ENABLED !== 'true') return jsonError('WebDAV 安全转发未启用', 503);
  if (request.method !== 'GET' && request.method !== 'PUT') return jsonError('不支持的请求方法', 405);
  const targetValue = request.headers.get('X-PlanFlow-WebDAV-Target');
  const authorization = request.headers.get('X-PlanFlow-WebDAV-Authorization');
  if (!targetValue || !authorization?.startsWith('Basic ')) return jsonError('缺少 WebDAV 配置', 400);

  let target: URL;
  try {
    target = await assertWebDavTarget(targetValue);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'WebDAV 目标无效', 400);
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? '0');
  if (contentLength > MAX_BYTES) return jsonError('同步文件超过 2 MiB 限制', 413);
  const body = request.method === 'PUT' ? await request.arrayBuffer() : undefined;
  if (body && body.byteLength > MAX_BYTES) return jsonError('同步文件超过 2 MiB 限制', 413);

  const headers = new Headers({ Authorization: authorization });
  const ifMatch = request.headers.get('If-Match');
  const ifNoneMatch = request.headers.get('If-None-Match');
  if (ifMatch) headers.set('If-Match', ifMatch);
  if (ifNoneMatch) headers.set('If-None-Match', ifNoneMatch);
  if (body) headers.set('Content-Type', 'application/octet-stream');

  const upstream = await fetch(target, { method: request.method, headers, body, redirect: 'manual' });
  if (upstream.status >= 300 && upstream.status < 400) return jsonError('WebDAV 服务器重定向已被安全策略阻止', 502);
  const upstreamLength = Number(upstream.headers.get('Content-Length') ?? '0');
  if (upstreamLength > MAX_BYTES) return jsonError('远端同步文件超过 2 MiB 限制', 413);
  const responseBody = await upstream.arrayBuffer();
  if (responseBody.byteLength > MAX_BYTES) return jsonError('远端同步文件超过 2 MiB 限制', 413);

  const responseHeaders = new Headers({ 'Cache-Control': 'no-store' });
  for (const name of ['ETag', 'Retry-After', 'Content-Type']) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(responseBody, { status: upstream.status, headers: responseHeaders });
};

export default { fetch: relay };
