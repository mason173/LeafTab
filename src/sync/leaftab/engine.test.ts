// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import { createLeafTabSyncBaseline, LeafTabSyncMemoryBaselineStore } from './baseline';
import { LeafTabSyncEngine } from './engine';
import type { LeafTabSyncRemoteStore } from './remoteStore';
import type { LeafTabSyncSnapshot } from './schema';

function createEmptySnapshot(deviceId: string): LeafTabSyncSnapshot {
  const now = new Date().toISOString();
  return {
    meta: {
      version: 2,
      deviceId,
      generatedAt: now,
    },
    preferences: null,
    scenarios: {},
    shortcuts: {},
    customShortcutIcons: {},
    bookmarkFolders: {},
    bookmarkItems: {},
    scenarioOrder: {
      type: 'scenario-order',
      ids: [],
      updatedAt: now,
      updatedBy: deviceId,
      revision: 1,
    },
    shortcutOrders: {},
    bookmarkOrders: {},
    tombstones: {},
  };
}

describe('LeafTabSyncEngine performance shortcuts', () => {
  it('skips snapshot build and full remote read when local is clean and remote head is unchanged', async () => {
    const deviceId = 'device-a';
    const snapshot = createEmptySnapshot(deviceId);
    const baselineStore = new LeafTabSyncMemoryBaselineStore();
    await baselineStore.save(createLeafTabSyncBaseline({
      snapshot,
      commitId: 'commit-a',
      rootPath: 'leaftab/v1',
    }));

    const remoteStore: LeafTabSyncRemoteStore = {
      acquireLock: vi.fn(),
      releaseLock: vi.fn(),
      readHead: vi.fn(async () => ({
        version: 2 as const,
        commitId: 'commit-a',
        updatedAt: snapshot.meta.generatedAt,
      })),
      readState: vi.fn(async () => {
        throw new Error('readState should not be called for clean unchanged auto sync');
      }),
      writeState: vi.fn(),
    };
    const buildLocalSnapshot = vi.fn(async () => {
      throw new Error('buildLocalSnapshot should not be called for clean unchanged auto sync');
    });

    const engine = new LeafTabSyncEngine({
      deviceId,
      remoteStore,
      baselineStore,
      buildLocalSnapshot,
      applyLocalSnapshot: vi.fn(),
      createEmptySnapshot: () => createEmptySnapshot(deviceId),
      isLocalDirty: () => false,
      rootPath: 'leaftab/v1',
    });

    const result = await engine.sync('auto');

    expect(result.kind).toBe('noop');
    expect(result.remoteCommitId).toBe('commit-a');
    expect(buildLocalSnapshot).not.toHaveBeenCalled();
    expect(remoteStore.readHead).toHaveBeenCalledTimes(1);
    expect(remoteStore.readState).not.toHaveBeenCalled();
    expect(remoteStore.writeState).not.toHaveBeenCalled();
  });
});
