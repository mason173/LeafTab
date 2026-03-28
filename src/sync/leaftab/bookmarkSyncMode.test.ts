import { describe, expect, it, vi } from 'vitest';
import type { LeafTabSyncRemoteStore, LeafTabSyncSnapshot } from './remoteStore';
import {
  LeafTabSyncBookmarksDisabledRemoteStore,
  mergeLeafTabSyncSnapshotWithBookmarks,
  stripBookmarksFromLeafTabSyncSnapshot,
} from './bookmarkSyncMode';
import { createLeafTabSyncSerializedSnapshot } from './fileMap';
import { materializeLeafTabSyncSnapshotFromFiles } from './snapshotCodec';
import { LEAFTAB_SYNC_SCHEMA_VERSION } from './schema';

const createSnapshot = (deviceId: string): LeafTabSyncSnapshot => ({
  meta: {
    version: LEAFTAB_SYNC_SCHEMA_VERSION,
    deviceId,
    generatedAt: '2026-03-27T10:00:00.000Z',
  },
  preferences: null,
  scenarios: {
    work: {
      id: 'work',
      type: 'scenario',
      name: 'Work',
      color: '#111111',
      icon: 'briefcase',
      archived: false,
      createdAt: '2026-03-27T09:00:00.000Z',
      updatedAt: '2026-03-27T09:00:00.000Z',
      updatedBy: deviceId,
      revision: 1,
    },
  },
  shortcuts: {
    shortcut_a: {
      id: 'shortcut_a',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'GitHub',
      url: 'https://github.com',
      icon: '',
      description: '',
      createdAt: '2026-03-27T09:00:00.000Z',
      updatedAt: '2026-03-27T09:00:00.000Z',
      updatedBy: deviceId,
      revision: 1,
    },
  },
  bookmarkFolders: {
    browser_root_toolbar: {
      id: 'browser_root_toolbar',
      type: 'bookmark-folder',
      parentId: null,
      title: 'Bookmarks Bar',
      createdAt: '2026-03-27T09:00:00.000Z',
      updatedAt: '2026-03-27T09:00:00.000Z',
      updatedBy: deviceId,
      revision: 1,
    },
  },
  bookmarkItems: {
    bookmark_a: {
      id: 'bookmark_a',
      type: 'bookmark-item',
      parentId: 'browser_root_toolbar',
      title: 'Example',
      url: 'https://example.com',
      createdAt: '2026-03-27T09:00:00.000Z',
      updatedAt: '2026-03-27T09:00:00.000Z',
      updatedBy: deviceId,
      revision: 1,
    },
  },
  scenarioOrder: {
    type: 'scenario-order',
    ids: ['work'],
    updatedAt: '2026-03-27T09:00:00.000Z',
    updatedBy: deviceId,
    revision: 1,
  },
  shortcutOrders: {
    work: {
      type: 'shortcut-order',
      scenarioId: 'work',
      ids: ['shortcut_a'],
      updatedAt: '2026-03-27T09:00:00.000Z',
      updatedBy: deviceId,
      revision: 1,
    },
  },
  bookmarkOrders: {
    __root__: {
      type: 'bookmark-order',
      parentId: null,
      ids: ['browser_root_toolbar'],
      updatedAt: '2026-03-27T09:00:00.000Z',
      updatedBy: deviceId,
      revision: 1,
    },
    browser_root_toolbar: {
      type: 'bookmark-order',
      parentId: 'browser_root_toolbar',
      ids: ['bookmark_a'],
      updatedAt: '2026-03-27T09:00:00.000Z',
      updatedBy: deviceId,
      revision: 1,
    },
  },
  tombstones: {
    shortcut_deleted: {
      id: 'shortcut_deleted',
      type: 'shortcut',
      deletedAt: '2026-03-27T09:10:00.000Z',
      deletedBy: deviceId,
      lastKnownRevision: 2,
    },
    bookmark_deleted: {
      id: 'bookmark_deleted',
      type: 'bookmark-item',
      deletedAt: '2026-03-27T09:11:00.000Z',
      deletedBy: deviceId,
      lastKnownRevision: 3,
    },
  },
});

describe('bookmarkSyncMode helpers', () => {
  it('strips bookmark entities and bookmark tombstones from a snapshot', () => {
    const snapshot = createSnapshot('local-device');

    const stripped = stripBookmarksFromLeafTabSyncSnapshot(snapshot);

    expect(stripped?.scenarios).toEqual(snapshot.scenarios);
    expect(stripped?.shortcuts).toEqual(snapshot.shortcuts);
    expect(stripped?.bookmarkFolders).toEqual({});
    expect(stripped?.bookmarkItems).toEqual({});
    expect(stripped?.bookmarkOrders).toEqual({
      __root__: expect.objectContaining({
        type: 'bookmark-order',
        parentId: null,
        ids: [],
      }),
    });
    expect(stripped?.tombstones).toEqual({
      shortcut_deleted: snapshot.tombstones.shortcut_deleted,
    });
  });

  it('merges bookmark data from one snapshot into another while preserving non-bookmark tombstones', () => {
    const snapshot = createSnapshot('local-device');
    const bookmarksSource = createSnapshot('remote-device');
    delete bookmarksSource.tombstones.shortcut_deleted;

    const merged = mergeLeafTabSyncSnapshotWithBookmarks(
      stripBookmarksFromLeafTabSyncSnapshot(snapshot) || snapshot,
      bookmarksSource,
    );

    expect(merged.bookmarkFolders).toEqual(bookmarksSource.bookmarkFolders);
    expect(merged.bookmarkItems).toEqual(bookmarksSource.bookmarkItems);
    expect(merged.bookmarkOrders).toEqual(bookmarksSource.bookmarkOrders);
    expect(merged.tombstones.shortcut_deleted).toEqual(snapshot.tombstones.shortcut_deleted);
    expect(merged.tombstones.bookmark_deleted).toEqual(bookmarksSource.tombstones.bookmark_deleted);
  });

  it('preserves local bookmarks when applying a remote snapshot while bookmark sync is disabled', () => {
    const localSnapshot = createSnapshot('local-device');
    const remoteSnapshot = createSnapshot('remote-device');
    remoteSnapshot.shortcuts.shortcut_a = {
      ...remoteSnapshot.shortcuts.shortcut_a,
      title: 'GitHub Remote',
      updatedAt: '2026-03-27T10:05:00.000Z',
      updatedBy: 'remote-device',
      revision: 2,
    };
    remoteSnapshot.bookmarkItems = {};
    remoteSnapshot.bookmarkFolders = {};
    remoteSnapshot.bookmarkOrders = {
      __root__: {
        type: 'bookmark-order',
        parentId: null,
        ids: [],
        updatedAt: '2026-03-27T10:05:00.000Z',
        updatedBy: 'remote-device',
        revision: 1,
      },
    };
    delete remoteSnapshot.tombstones.bookmark_deleted;

    const applied = mergeLeafTabSyncSnapshotWithBookmarks(remoteSnapshot, localSnapshot);

    expect(applied.shortcuts.shortcut_a.title).toBe('GitHub Remote');
    expect(applied.bookmarkFolders).toEqual(localSnapshot.bookmarkFolders);
    expect(applied.bookmarkItems).toEqual(localSnapshot.bookmarkItems);
    expect(applied.bookmarkOrders).toEqual(localSnapshot.bookmarkOrders);
    expect(applied.tombstones.bookmark_deleted).toEqual(localSnapshot.tombstones.bookmark_deleted);
  });

  it('round-trips non-bookmark state consistently through disabled-bookmark serialization', () => {
    const snapshot = createSnapshot('local-device');
    const stripped = stripBookmarksFromLeafTabSyncSnapshot(snapshot);
    if (!stripped) {
      throw new Error('Expected stripped snapshot');
    }

    const serialized = createLeafTabSyncSerializedSnapshot(stripped, {
      rootPath: 'leaftab/v1',
    });
    const restored = materializeLeafTabSyncSnapshotFromFiles(serialized.files, 'leaftab/v1');

    expect(restored).toEqual(stripped);
    expect(restored?.bookmarkFolders).toEqual({});
    expect(restored?.bookmarkItems).toEqual({});
    expect(restored?.shortcuts).toEqual(snapshot.shortcuts);
    expect(restored?.scenarios).toEqual(snapshot.scenarios);
  });

  it('wraps a remote store so bookmark data is hidden from reads and preserved on writes', async () => {
    const remoteSnapshot = createSnapshot('remote-device');
    const readState = vi.fn(async () => ({
      head: null,
      commit: null,
      snapshot: remoteSnapshot,
    }));
    const writeState = vi.fn(async () => ({
      head: {
        version: LEAFTAB_SYNC_SCHEMA_VERSION,
        commitId: 'commit-1',
        updatedAt: '2026-03-27T10:10:00.000Z',
      },
      commit: {
        id: 'commit-1',
        version: LEAFTAB_SYNC_SCHEMA_VERSION,
        deviceId: 'remote-device',
        createdAt: '2026-03-27T10:10:00.000Z',
        parentCommitId: null,
        manifestPath: 'leaftab/v1/manifest.json',
        summary: {
          scenarios: 1,
          shortcuts: 1,
          bookmarkFolders: 0,
          bookmarkItems: 0,
          tombstones: 1,
        },
      },
    }));
    const remoteStore: LeafTabSyncRemoteStore = {
      acquireLock: vi.fn(async () => null),
      releaseLock: vi.fn(async () => {}),
      readState,
      writeState,
    };

    const wrapped = new LeafTabSyncBookmarksDisabledRemoteStore(remoteStore);
    const remoteState = await wrapped.readState();
    const writeSnapshot = createSnapshot('local-device');

    await wrapped.writeState({
      snapshot: writeSnapshot,
      previousSnapshot: writeSnapshot,
      deviceId: 'local-device',
    });

    expect(remoteState.snapshot?.bookmarkFolders).toEqual({});
    expect(remoteState.snapshot?.bookmarkItems).toEqual({});
    expect(writeState).toHaveBeenCalledWith(expect.objectContaining({
      snapshot: expect.objectContaining({
        bookmarkFolders: remoteSnapshot.bookmarkFolders,
        bookmarkItems: remoteSnapshot.bookmarkItems,
      }),
      previousSnapshot: expect.objectContaining({
        bookmarkFolders: remoteSnapshot.bookmarkFolders,
        bookmarkItems: remoteSnapshot.bookmarkItems,
      }),
    }));
  });

  it('preserves remote bookmarks when bookmark sync is disabled but other data is written', async () => {
    const remoteSnapshot = createSnapshot('remote-device');
    const writeState = vi.fn(async () => ({
      head: {
        version: LEAFTAB_SYNC_SCHEMA_VERSION,
        commitId: 'commit-2',
        updatedAt: '2026-03-27T10:20:00.000Z',
      },
      commit: {
        id: 'commit-2',
        version: LEAFTAB_SYNC_SCHEMA_VERSION,
        deviceId: 'remote-device',
        createdAt: '2026-03-27T10:20:00.000Z',
        parentCommitId: 'commit-1',
        manifestPath: 'leaftab/v1/manifest.json',
        summary: {
          scenarios: 1,
          shortcuts: 1,
          bookmarkFolders: 1,
          bookmarkItems: 1,
          tombstones: 2,
        },
      },
    }));
    const remoteStore: LeafTabSyncRemoteStore = {
      acquireLock: vi.fn(async () => null),
      releaseLock: vi.fn(async () => {}),
      readState: vi.fn(async () => ({
        head: null,
        commit: null,
        snapshot: remoteSnapshot,
      })),
      writeState,
    };

    const wrapped = new LeafTabSyncBookmarksDisabledRemoteStore(remoteStore);
    await wrapped.readState();

    const localSnapshot = stripBookmarksFromLeafTabSyncSnapshot(createSnapshot('local-device')) || createSnapshot('local-device');
    localSnapshot.shortcuts.shortcut_a = {
      ...localSnapshot.shortcuts.shortcut_a,
      title: 'Updated Locally',
    };

    await wrapped.writeState({
      snapshot: localSnapshot,
      previousSnapshot: localSnapshot,
      deviceId: 'local-device',
    });

    expect(writeState).toHaveBeenCalledWith(expect.objectContaining({
      snapshot: expect.objectContaining({
        bookmarkFolders: remoteSnapshot.bookmarkFolders,
        bookmarkItems: remoteSnapshot.bookmarkItems,
        bookmarkOrders: remoteSnapshot.bookmarkOrders,
      }),
      previousSnapshot: expect.objectContaining({
        bookmarkFolders: remoteSnapshot.bookmarkFolders,
        bookmarkItems: remoteSnapshot.bookmarkItems,
        bookmarkOrders: remoteSnapshot.bookmarkOrders,
      }),
    }));
  });

  it('does not propagate local bookmark tombstones when bookmark sync is disabled', async () => {
    const remoteSnapshot = createSnapshot('remote-device');
    const writeState = vi.fn(async () => ({
      head: {
        version: LEAFTAB_SYNC_SCHEMA_VERSION,
        commitId: 'commit-2',
        updatedAt: '2026-03-27T10:24:00.000Z',
      },
      commit: {
        id: 'commit-2',
        version: LEAFTAB_SYNC_SCHEMA_VERSION,
        deviceId: 'remote-device',
        createdAt: '2026-03-27T10:24:00.000Z',
        parentCommitId: 'commit-1',
        manifestPath: 'leaftab/v1/manifest.json',
        summary: {
          scenarios: 1,
          shortcuts: 1,
          bookmarkFolders: 1,
          bookmarkItems: 1,
          tombstones: 2,
        },
      },
    }));
    const remoteStore: LeafTabSyncRemoteStore = {
      acquireLock: vi.fn(async () => null),
      releaseLock: vi.fn(async () => {}),
      readState: vi.fn(async () => ({
        head: null,
        commit: null,
        snapshot: remoteSnapshot,
      })),
      writeState,
    };

    const wrapped = new LeafTabSyncBookmarksDisabledRemoteStore(remoteStore);
    await wrapped.readState();

    const localSnapshot = stripBookmarksFromLeafTabSyncSnapshot(createSnapshot('local-device')) || createSnapshot('local-device');
    localSnapshot.tombstones.bookmark_a = {
      id: 'bookmark_a',
      type: 'bookmark-item',
      deletedAt: '2026-03-27T10:25:00.000Z',
      deletedBy: 'local-device',
      lastKnownRevision: 9,
    };

    await wrapped.writeState({
      snapshot: localSnapshot,
      previousSnapshot: localSnapshot,
      deviceId: 'local-device',
    });

    const writePayload = writeState.mock.calls[0]?.[0];
    expect(writePayload?.snapshot?.bookmarkItems).toEqual(remoteSnapshot.bookmarkItems);
    expect(writePayload?.snapshot?.bookmarkFolders).toEqual(remoteSnapshot.bookmarkFolders);
    expect(writePayload?.snapshot?.tombstones?.bookmark_a).toBeUndefined();
  });

  it('reloads the full remote snapshot before writing when no cached remote snapshot is available', async () => {
    const remoteSnapshot = createSnapshot('remote-device');
    const readState = vi.fn(async () => ({
      head: null,
      commit: null,
      snapshot: remoteSnapshot,
    }));
    const writeState = vi.fn(async () => ({
      head: {
        version: LEAFTAB_SYNC_SCHEMA_VERSION,
        commitId: 'commit-3',
        updatedAt: '2026-03-27T10:30:00.000Z',
      },
      commit: {
        id: 'commit-3',
        version: LEAFTAB_SYNC_SCHEMA_VERSION,
        deviceId: 'remote-device',
        createdAt: '2026-03-27T10:30:00.000Z',
        parentCommitId: 'commit-2',
        manifestPath: 'leaftab/v1/manifest.json',
        summary: {
          scenarios: 1,
          shortcuts: 1,
          bookmarkFolders: 1,
          bookmarkItems: 1,
          tombstones: 2,
        },
      },
    }));
    const remoteStore: LeafTabSyncRemoteStore = {
      acquireLock: vi.fn(async () => null),
      releaseLock: vi.fn(async () => {}),
      readState,
      writeState,
    };

    const wrapped = new LeafTabSyncBookmarksDisabledRemoteStore(remoteStore);
    const localSnapshot = stripBookmarksFromLeafTabSyncSnapshot(createSnapshot('local-device')) || createSnapshot('local-device');

    await wrapped.writeState({
      snapshot: localSnapshot,
      previousSnapshot: localSnapshot,
      deviceId: 'local-device',
    });

    expect(readState).toHaveBeenCalledTimes(1);
    expect(writeState).toHaveBeenCalledWith(expect.objectContaining({
      snapshot: expect.objectContaining({
        bookmarkFolders: remoteSnapshot.bookmarkFolders,
        bookmarkItems: remoteSnapshot.bookmarkItems,
      }),
    }));
  });
});
