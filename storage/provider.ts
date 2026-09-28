export interface StorageReadResult {
  content: string | null;
  etag: string | null;
}

export interface StorageWriteResult {
  etag: string | null;
}

export interface StorageProvider {
  read(): Promise<StorageReadResult>;
  write(content: string, expectedEtag: string | null): Promise<StorageWriteResult>;
}

export type StorageErrorCode =
  | 'authentication_required'
  | 'etag_conflict'
  | 'quota_exceeded'
  | 'rate_limited'
  | 'network_error'
  | 'invalid_configuration';

export class StorageProviderError extends Error {
  constructor(public readonly code: StorageErrorCode, message: string, public readonly retryAfter?: number) {
    super(message);
    this.name = 'StorageProviderError';
  }
}
