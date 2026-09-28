import type { StorageProvider, StorageReadResult, StorageWriteResult } from './provider';
import { StorageProviderError } from './provider';

const ITEM_URL = 'https://graph.microsoft.com/v1.0/me/drive/special/approot:/planflow-sync-v1.bin';
const CONTENT_URL = `${ITEM_URL}:/content`;

type FetchBoundary = typeof fetch;

export interface OneDriveProviderOptions {
  accessToken: string;
  fetch?: FetchBoundary;
}

export class OneDriveProvider implements StorageProvider {
  private readonly accessToken: string;
  private readonly fetcher: FetchBoundary;

  constructor(options: OneDriveProviderOptions) {
    this.accessToken = options.accessToken;
    this.fetcher = options.fetch ?? fetch;
  }

  private headers() {
    return new Headers({ Authorization: `Bearer ${this.accessToken}` });
  }

  private failure(response: Response): StorageProviderError {
    if (response.status === 401 || response.status === 403) {
      return new StorageProviderError('authentication_required', 'OneDrive 授权已失效，请重新连接');
    }
    if (response.status === 412) return new StorageProviderError('etag_conflict', '远端文件已被其他设备更新');
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      return new StorageProviderError('rate_limited', 'OneDrive 请求过于频繁', Number.isFinite(retryAfter) ? retryAfter : undefined);
    }
    if (response.status === 507) return new StorageProviderError('quota_exceeded', 'OneDrive 空间不足');
    return new StorageProviderError('network_error', `OneDrive 请求失败（${response.status}）`);
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetcher(url, init);
    } catch {
      throw new StorageProviderError('network_error', '无法连接 OneDrive');
    }
  }

  async read(): Promise<StorageReadResult> {
    const metadata = await this.request(ITEM_URL, { method: 'GET', headers: this.headers() });
    if (metadata.status === 404) return { content: null, etag: null };
    if (!metadata.ok) throw this.failure(metadata);
    const item = await metadata.json() as { eTag?: unknown };
    const etag = typeof item.eTag === 'string' ? item.eTag : null;

    const content = await this.request(CONTENT_URL, { method: 'GET', headers: this.headers() });
    if (!content.ok) throw this.failure(content);
    return { content: await content.text(), etag };
  }

  async write(content: string, expectedEtag: string | null): Promise<StorageWriteResult> {
    const headers = this.headers();
    headers.set('Content-Type', 'application/octet-stream');
    if (expectedEtag) headers.set('If-Match', expectedEtag);
    else headers.set('If-None-Match', '*');
    const response = await this.request(CONTENT_URL, { method: 'PUT', headers, body: content });
    if (!response.ok) throw this.failure(response);
    const item = await response.json().catch(() => ({})) as { eTag?: unknown };
    const headerEtag = response.headers.get('ETag');
    return { etag: typeof item.eTag === 'string' ? item.eTag : headerEtag };
  }
}
