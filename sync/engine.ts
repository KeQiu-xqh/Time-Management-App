import type { PlanSnapshot } from '../data/planSnapshot';
import type { StorageProvider } from '../storage/provider';
import { StorageProviderError } from '../storage/provider';
import { decryptPayload, encryptPayload } from './crypto';
import { mergePayloads } from './merge';
import { emptyPayload, snapshotFromPayload, updatePayloadFromSnapshot } from './projection';
import type { SyncPayload } from './records';

export interface SyncEngineInput {
  snapshot: PlanSnapshot;
  payload: SyncPayload | null;
  deviceId: string;
  passphrase: string;
  provider: StorageProvider;
  maxConflictRetries?: number;
}

export interface SyncEngineResult {
  snapshot: PlanSnapshot;
  payload: SyncPayload;
  etag: string | null;
}

export async function runSync(input: SyncEngineInput): Promise<SyncEngineResult> {
  const localPayload = updatePayloadFromSnapshot(
    input.snapshot,
    input.payload ?? emptyPayload(),
    input.deviceId
  );
  const maxConflictRetries = input.maxConflictRetries ?? 2;

  for (let attempt = 0; attempt <= maxConflictRetries; attempt += 1) {
    const remote = await input.provider.read();
    const merged = remote.content
      ? mergePayloads(localPayload, await decryptPayload(remote.content, input.passphrase))
      : localPayload;
    const encrypted = await encryptPayload(merged, input.passphrase);

    try {
      const written = await input.provider.write(encrypted, remote.etag);
      return {
        snapshot: snapshotFromPayload(merged),
        payload: merged,
        etag: written.etag
      };
    } catch (error) {
      const conflict = error instanceof StorageProviderError && error.code === 'etag_conflict';
      if (!conflict || attempt === maxConflictRetries) throw error;
    }
  }

  throw new Error('同步重试次数已耗尽');
}
