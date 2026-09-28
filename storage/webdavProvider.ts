import type { StorageProvider, StorageReadResult, StorageWriteResult } from './provider';
import { StorageProviderError } from './provider';

type FetchBoundary = typeof fetch;

export interface WebDavProviderOptions {
  endpoint: string;
  username: string;
  appPassword: string;
  useRelay?: boolean;
  fetch?: FetchBoundary;
}

const basicAuthorization = (username: string, password: string) => {
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `Basic ${btoa(binary)}`;
};

export class WebDavProvider implements StorageProvider {
  private readonly endpoint: string;
  private readonly authorization: string;
  private readonly useRelay: boolean;
  private readonly fetcher: FetchBoundary;

  constructor(options: WebDavProviderOptions) {
    const endpoint = new URL(options.endpoint);
    if (endpoint.protocol !== 'https:') throw new Error('WebDAV 地址必须使用 HTTPS');
    this.endpoint = endpoint.toString();
    this.authorization = basicAuthorization(options.username, options.appPassword);
    this.useRelay = options.useRelay ?? false;
    this.fetcher = options.fetch ?? fetch;
  }

  private requestDetails(method: 'GET' | 'PUT', body?: string) {
    const headers = new Headers();
    let url = this.endpoint;
    if (this.useRelay) {
      url = '/api/storage/webdav';
      headers.set('X-PlanFlow-WebDAV-Target', this.endpoint);
      headers.set('X-PlanFlow-WebDAV-Authorization', this.authorization);
    } else {
      headers.set('Authorization', this.authorization);
    }
    if (body !== undefined) headers.set('Content-Type', 'application/octet-stream');
    return { url, init: { method, headers, body } satisfies RequestInit };
  }

  private failure(response: Response) {
    if (response.status === 401 || response.status === 403) {
      return new StorageProviderError('authentication_required', 'WebDAV 用户名或应用密码无效');
    }
    if (response.status === 412) return new StorageProviderError('etag_conflict', '远端文件已被其他设备更新');
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      return new StorageProviderError('rate_limited', 'WebDAV 请求过于频繁', Number.isFinite(retryAfter) ? retryAfter : undefined);
    }
    if (response.status === 507) return new StorageProviderError('quota_exceeded', 'WebDAV 空间不足');
    return new StorageProviderError('network_error', `WebDAV 请求失败（${response.status}）`);
  }

  private async request(method: 'GET' | 'PUT', body?: string) {
    const { url, init } = this.requestDetails(method, body);
    try {
      return await this.fetcher(url, init);
    } catch {
      throw new StorageProviderError('network_error', '无法连接 WebDAV；如果网盘不允许浏览器跨域，请启用安全转发');
    }
  }

  async read(): Promise<StorageReadResult> {
    const response = await this.request('GET');
    if (response.status === 404) return { content: null, etag: null };
    if (!response.ok) throw this.failure(response);
    return { content: await response.text(), etag: response.headers.get('ETag') };
  }

  async write(content: string, expectedEtag: string | null): Promise<StorageWriteResult> {
    const details = this.requestDetails('PUT', content);
    if (expectedEtag) details.init.headers.set('If-Match', expectedEtag);
    else details.init.headers.set('If-None-Match', '*');
    let response: Response;
    try {
      response = await this.fetcher(details.url, details.init);
    } catch {
      throw new StorageProviderError('network_error', '无法连接 WebDAV；如果网盘不允许浏览器跨域，请启用安全转发');
    }
    if (!response.ok) throw this.failure(response);
    return { etag: response.headers.get('ETag') };
  }
}
