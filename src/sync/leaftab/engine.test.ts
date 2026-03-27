import { describe, expect, it, vi } from 'vitest';
import { LeafTabSyncEngine, LeafTabDestructiveBookmarkChangeError } from './engine';
import { LeafTabSyncMemoryBaselineStore } from './baseline';
import { LEAFTAB_SYNC_SCHEMA_VERSION, type LeafTabSyncSnapshot } from './schema';
import type { LeafTabSyncRemoteStore, LeafTabSyncWriteStateResult } from './remoteStore';

const createBookmarkSnapshot = (
  bookmarkCount: number,
  options?: {
    deviceId?: string;
    generatedAt?: string;
  },
): LeafTabSyncSnapshot => {
  const deviceId = options?.deviceId || 'device';
  const generatedAt = options?.generatedAt || '2026-03-27T10:00:00.000Z';
  const bookmarkItems = Object.fromEntries(
    Array.from({ length: bookmarkCount }, (_, index) => {
      const id = `bookmark_${index}`;
      return [id, {
        id,
        type: 'bookmark-item' as const,
        parentId: null,
        title: `Bookmark ${index}`,
        url: `https://example.com/${index}`,
        createdAt: generatedAt,
        updatedAt: generatedAt,
        updatedBy: deviceId,
        revision: 1,
      }];
    }),
  );

  return {
    meta: {
      version: LEAFTAB_SYNC_SCHEMA_VERSION,
      deviceId,
      generatedAt,
    },
    preferences: null,
    scenarios: {},
    shortcuts: {},
    bookmarkFolders: {},
    bookmarkItems,
    scenarioOrder: {
      type: 'scenario-order',
      ids: [],
      updatedAt: generatedAt,
      updatedBy: deviceId,
      revision: 1,
    },
    shortcutOrders: {},
    bookmarkOrders: {
      __root__: {
        type: 'bookmark-order',
        parentId: null,
        ids: Object.keys(bookmarkItems),
        updatedAt: generatedAt,
        updatedBy: deviceId,
        revision: 1,
      },
    },
    tombstones: {},
  };
};

const createWriteResult = (snapshot: LeafTabSyncSnapshot): LeafTabSyncWriteStateResult => ({
  head: {
    version: LEAFTAB_SYNC_SCHEMA_VERSION,
    commitId: 'commit-1',
    updatedAt: snapshot.meta.generatedAt,
  },
  commit: {
    id: 'commit-1',
    version: LEAFTAB_SYNC_SCHEMA_VERSION,
    deviceId: snapshot.meta.deviceId,
    createdAt: snapshot.meta.generatedAt,
    parentCommitId: null,
    manifestPath: 'leaftab/v1/manifest.json',
    summary: {
      scenarios: 0,
      shortcuts: 0,
      bookmarkFolders: 0,
      bookmarkItems: Object.keys(snapshot.bookmarkItems).length,
      tombstones: 0,
    },
  },
});

const createRemoteStore = (snapshot: LeafTabSyncSnapshot): LeafTabSyncRemoteStore & {
  readState: ReturnType<typeof vi.fn>;
  writeState: ReturnType<typeof vi.fn>;
  acquireLock: ReturnType<typeof vi.fn>;
  releaseLock: ReturnType<typeof vi.fn>;
} => ({
  acquireLock: vi.fn(async () => null),
  releaseLock: vi.fn(async () => {}),
  readState: vi.fn(async () => ({
    head: {
      version: LEAFTAB_SYNC_SCHEMA_VERSION,
      commitId: 'remote-commit',
      updatedAt: snapshot.meta.generatedAt,
    },
    commit: {
      id: 'remote-commit',
      version: LEAFTAB_SYNC_SCHEMA_VERSION,
      deviceId: snapshot.meta.deviceId,
      createdAt: snapshot.meta.generatedAt,
      parentCommitId: null,
      manifestPath: 'leaftab/v1/manifest.json',
      summary: {
        scenarios: 0,
        shortcuts: 0,
        bookmarkFolders: 0,
        bookmarkItems: Object.keys(snapshot.bookmarkItems).length,
        tombstones: 0,
      },
    },
    snapshot,
  })),
  writeState: vi.fn(async ({ snapshot: nextSnapshot }) => createWriteResult(nextSnapshot)),
});

const createEngine = (params: {
  localSnapshot: LeafTabSyncSnapshot;
  remoteSnapshot: LeafTabSyncSnapshot;
  applyLocalSnapshot?: ReturnType<typeof vi.fn>;
}) => {
  const baselineStore = new LeafTabSyncMemoryBaselineStore();
  const remoteStore = createRemoteStore(params.remoteSnapshot);
  const applyLocalSnapshot = params.applyLocalSnapshot || vi.fn(async () => {});
  const engine = new LeafTabSyncEngine({
    deviceId: 'test-device',
    remoteStore,
    baselineStore,
    buildLocalSnapshot: async () => params.localSnapshot,
    applyLocalSnapshot,
    createEmptySnapshot: () => createBookmarkSnapshot(0, { deviceId: 'empty-device' }),
  });

  return {
    engine,
    remoteStore,
    baselineStore,
    applyLocalSnapshot,
  };
};

describe('LeafTabSyncEngine destructive bookmark protection', () => {
  it('blocks push-local when local bookmarks would wipe a populated remote snapshot', async () => {
    const localSnapshot = createBookmarkSnapshot(1, { deviceId: 'local-device' });
    const remoteSnapshot = createBookmarkSnapshot(200, { deviceId: 'remote-device' });
    const { engine, remoteStore } = createEngine({
      localSnapshot,
      remoteSnapshot,
    });

    await expect(engine.sync('push-local')).rejects.toBeInstanceOf(LeafTabDestructiveBookmarkChangeError);
    expect(remoteStore.writeState).not.toHaveBeenCalled();
  });

  it('blocks pull-remote before applying a destructive remote snapshot locally', async () => {
    const localSnapshot = createBookmarkSnapshot(200, { deviceId: 'local-device' });
    const remoteSnapshot = createBookmarkSnapshot(1, { deviceId: 'remote-device' });
    const applyLocalSnapshot = vi.fn(async () => {});
    const { engine } = createEngine({
      localSnapshot,
      remoteSnapshot,
      applyLocalSnapshot,
    });

    await expect(engine.sync('pull-remote')).rejects.toBeInstanceOf(LeafTabDestructiveBookmarkChangeError);
    expect(applyLocalSnapshot).not.toHaveBeenCalled();
  });

  it('still allows an explicit repair override to push a destructive bookmark change', async () => {
    const localSnapshot = createBookmarkSnapshot(1, { deviceId: 'local-device' });
    const remoteSnapshot = createBookmarkSnapshot(200, { deviceId: 'remote-device' });
    const { engine, remoteStore, baselineStore } = createEngine({
      localSnapshot,
      remoteSnapshot,
    });

    const result = await engine.sync('push-local', {
      allowDestructiveBookmarkChanges: true,
    });
    const baseline = await baselineStore.load();

    expect(result.kind).toBe('push');
    expect(remoteStore.writeState).toHaveBeenCalledOnce();
    expect(baseline?.commitId).toBe('commit-1');
    expect(baseline?.snapshot?.bookmarkItems).toEqual(localSnapshot.bookmarkItems);
  });
});
