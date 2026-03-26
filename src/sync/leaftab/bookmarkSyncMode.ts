import type { LeafTabSyncRemoteState, LeafTabSyncRemoteStore, LeafTabSyncWriteStateParams, LeafTabSyncWriteStateResult } from './remoteStore';
import type { LeafTabSyncBookmarkOrder, LeafTabSyncSnapshot, LeafTabSyncTombstone } from './schema';

const ROOT_ORDER_KEY = '__root__';

const isBookmarkTombstone = (tombstone: LeafTabSyncTombstone) => (
  tombstone.type === 'bookmark-folder' || tombstone.type === 'bookmark-item'
);

const createEmptyBookmarkOrders = (snapshot: LeafTabSyncSnapshot): Record<string, LeafTabSyncBookmarkOrder> => ({
  [ROOT_ORDER_KEY]: {
    type: 'bookmark-order',
    parentId: null,
    ids: [],
    updatedAt: snapshot.meta.generatedAt,
    updatedBy: snapshot.meta.deviceId,
    revision: 1,
  },
});

export const stripBookmarksFromLeafTabSyncSnapshot = (snapshot: LeafTabSyncSnapshot | null): LeafTabSyncSnapshot | null => {
  if (!snapshot) return null;
  return {
    ...snapshot,
    bookmarkFolders: {},
    bookmarkItems: {},
    bookmarkOrders: createEmptyBookmarkOrders(snapshot),
    tombstones: Object.fromEntries(
      Object.entries(snapshot.tombstones).filter(([, tombstone]) => !isBookmarkTombstone(tombstone)),
    ),
  };
};

export const mergeLeafTabSyncSnapshotWithBookmarks = (snapshot: LeafTabSyncSnapshot, bookmarksSource: LeafTabSyncSnapshot) => {
  return {
    ...snapshot,
    bookmarkFolders: bookmarksSource.bookmarkFolders,
    bookmarkItems: bookmarksSource.bookmarkItems,
    bookmarkOrders: bookmarksSource.bookmarkOrders,
    tombstones: {
      ...Object.fromEntries(
        Object.entries(snapshot.tombstones).filter(([, tombstone]) => !isBookmarkTombstone(tombstone)),
      ),
      ...Object.fromEntries(
        Object.entries(bookmarksSource.tombstones).filter(([, tombstone]) => isBookmarkTombstone(tombstone)),
      ),
    },
  } satisfies LeafTabSyncSnapshot;
};

export class LeafTabSyncBookmarksDisabledRemoteStore implements LeafTabSyncRemoteStore {
  private readonly remoteStore: LeafTabSyncRemoteStore;

  constructor(remoteStore: LeafTabSyncRemoteStore) {
    this.remoteStore = remoteStore;
  }

  async acquireLock(deviceId: string, ttlMs?: number) {
    return this.remoteStore.acquireLock(deviceId, ttlMs);
  }

  async releaseLock() {
    await this.remoteStore.releaseLock();
  }

  async readState(): Promise<LeafTabSyncRemoteState> {
    const state = await this.remoteStore.readState();
    return {
      ...state,
      snapshot: stripBookmarksFromLeafTabSyncSnapshot(state.snapshot),
    };
  }

  async writeState(params: LeafTabSyncWriteStateParams): Promise<LeafTabSyncWriteStateResult> {
    return this.remoteStore.writeState({
      ...params,
      snapshot: stripBookmarksFromLeafTabSyncSnapshot(params.snapshot) || params.snapshot,
      previousSnapshot: stripBookmarksFromLeafTabSyncSnapshot(params.previousSnapshot || null),
    });
  }
}
