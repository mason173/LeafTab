import type { LeafTabSyncCommitFile, LeafTabSyncHeadFile, LeafTabSyncSnapshot } from './schema';

export interface LeafTabSyncRemoteState {
  head: LeafTabSyncHeadFile | null;
  commit: LeafTabSyncCommitFile | null;
  snapshot: LeafTabSyncSnapshot | null;
}

export interface LeafTabSyncWriteStateParams {
  snapshot: LeafTabSyncSnapshot;
  previousSnapshot?: LeafTabSyncSnapshot | null;
  deviceId: string;
  parentCommitId?: string | null;
  createdAt?: string;
}

export interface LeafTabSyncWriteStateResult {
  head: LeafTabSyncHeadFile;
  commit: LeafTabSyncCommitFile;
}

export interface LeafTabSyncRemoteStore {
  acquireLock(deviceId: string, ttlMs?: number): Promise<unknown>;
  releaseLock(): Promise<void>;
  readState(): Promise<LeafTabSyncRemoteState>;
  writeState(params: LeafTabSyncWriteStateParams): Promise<LeafTabSyncWriteStateResult>;
}

