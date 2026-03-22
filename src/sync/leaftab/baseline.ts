import { normalizeLeafTabSyncSnapshot, type LeafTabSyncBaseline, type LeafTabSyncSnapshot } from './schema';
import { createLeafTabSyncBaselineFromSnapshot, type LeafTabSyncFileMap } from './fileMap';

export interface LeafTabSyncBaselineStore {
  load(): Promise<LeafTabSyncBaseline | null>;
  save(baseline: LeafTabSyncBaseline): Promise<void>;
  clear(): Promise<void>;
}

export class LeafTabSyncMemoryBaselineStore implements LeafTabSyncBaselineStore {
  private value: LeafTabSyncBaseline | null = null;

  async load() {
    return this.value ? JSON.parse(JSON.stringify(this.value)) as LeafTabSyncBaseline : null;
  }

  async save(baseline: LeafTabSyncBaseline) {
    this.value = JSON.parse(JSON.stringify(baseline)) as LeafTabSyncBaseline;
  }

  async clear() {
    this.value = null;
  }
}

export class LeafTabSyncLocalStorageBaselineStore implements LeafTabSyncBaselineStore {
  private readonly key: string;
  private readonly storage: Storage;

  constructor(key = 'leaftab_sync_v1_baseline', storage?: Storage) {
    this.key = key;
    const resolvedStorage = storage || globalThis.localStorage;
    if (!resolvedStorage) {
      throw new Error('localStorage is not available for LeafTab sync baseline storage');
    }
    this.storage = resolvedStorage;
  }

  async load() {
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LeafTabSyncBaseline;
    } catch {
      return null;
    }
  }

  async save(baseline: LeafTabSyncBaseline) {
    this.storage.setItem(this.key, JSON.stringify(baseline));
  }

  async clear() {
    this.storage.removeItem(this.key);
  }
}

export const createLeafTabSyncBaseline = (params: {
  snapshot: LeafTabSyncSnapshot;
  commitId?: string | null;
  rootPath?: string;
}) => {
  return createLeafTabSyncBaselineFromSnapshot(params.snapshot, {
    commitId: params.commitId ?? null,
    rootPath: params.rootPath,
  });
};

export const getLeafTabSyncBaselineSnapshot = (
  baseline: LeafTabSyncBaseline | null,
): LeafTabSyncSnapshot | null => {
  return normalizeLeafTabSyncSnapshot(baseline?.snapshot || null);
};

export const getLeafTabSyncBaselineFileMap = (
  baseline: LeafTabSyncBaseline | null,
): LeafTabSyncFileMap => {
  if (!baseline) return {};
  return Object.fromEntries(
    Object.entries(baseline.files || {}).map(([path, entry]) => [path, entry.content]),
  );
};
