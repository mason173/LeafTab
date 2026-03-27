import { describe, expect, it } from 'vitest';
import {
  collectLeafTabSyncChangedPayloadPaths,
  createLeafTabSyncSerializedSnapshot,
} from './fileMap';
import { materializeLeafTabSyncSnapshotFromFiles } from './snapshotCodec';
import type { LeafTabSyncSnapshot } from './schema';
import { LEAFTAB_SYNC_SCHEMA_VERSION } from './schema';

const createSnapshot = (): LeafTabSyncSnapshot => ({
  meta: {
    version: LEAFTAB_SYNC_SCHEMA_VERSION,
    deviceId: 'device-a',
    generatedAt: '2026-03-27T15:00:00.000Z',
  },
  preferences: null,
  scenarios: {
    work: {
      id: 'work',
      type: 'scenario',
      name: 'Work',
      color: '#000000',
      icon: 'briefcase',
      archived: false,
      createdAt: '2026-03-27T14:00:00.000Z',
      updatedAt: '2026-03-27T14:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
  },
  shortcuts: {
    github: {
      id: 'github',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'GitHub',
      url: 'https://github.com',
      icon: '',
      description: '',
      createdAt: '2026-03-27T14:00:00.000Z',
      updatedAt: '2026-03-27T14:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
  },
  bookmarkFolders: {
    browser_root_toolbar: {
      id: 'browser_root_toolbar',
      type: 'bookmark-folder',
      parentId: null,
      title: 'Bookmarks Bar',
      createdAt: '2026-03-27T14:00:00.000Z',
      updatedAt: '2026-03-27T14:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
    folder_work: {
      id: 'folder_work',
      type: 'bookmark-folder',
      parentId: 'browser_root_toolbar',
      title: 'Work',
      createdAt: '2026-03-27T14:00:00.000Z',
      updatedAt: '2026-03-27T14:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
  },
  bookmarkItems: {
    bookmark_github: {
      id: 'bookmark_github',
      type: 'bookmark-item',
      parentId: 'folder_work',
      title: 'GitHub',
      url: 'https://github.com',
      createdAt: '2026-03-27T14:00:00.000Z',
      updatedAt: '2026-03-27T14:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
    bookmark_docs: {
      id: 'bookmark_docs',
      type: 'bookmark-item',
      parentId: 'browser_root_toolbar',
      title: 'Docs',
      url: 'https://example.com/docs',
      createdAt: '2026-03-27T14:00:00.000Z',
      updatedAt: '2026-03-27T14:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
  },
  scenarioOrder: {
    type: 'scenario-order',
    ids: ['work'],
    updatedAt: '2026-03-27T14:00:00.000Z',
    updatedBy: 'device-a',
    revision: 1,
  },
  shortcutOrders: {
    work: {
      type: 'shortcut-order',
      scenarioId: 'work',
      ids: ['github'],
      updatedAt: '2026-03-27T14:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
  },
  bookmarkOrders: {
    __root__: {
      type: 'bookmark-order',
      parentId: null,
      ids: ['browser_root_toolbar'],
      updatedAt: '2026-03-27T14:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
    browser_root_toolbar: {
      type: 'bookmark-order',
      parentId: 'browser_root_toolbar',
      ids: ['folder_work', 'bookmark_docs'],
      updatedAt: '2026-03-27T14:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
    folder_work: {
      type: 'bookmark-order',
      parentId: 'folder_work',
      ids: ['bookmark_github'],
      updatedAt: '2026-03-27T14:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
  },
  tombstones: {
    deleted_bookmark: {
      id: 'deleted_bookmark',
      type: 'bookmark-item',
      deletedAt: '2026-03-27T14:30:00.000Z',
      deletedBy: 'device-a',
      lastKnownRevision: 2,
    },
  },
});

describe('fileMap bookmark round-trip', () => {
  it('round-trips nested bookmark folders/items through the serialized file map', () => {
    const snapshot = createSnapshot();
    const serialized = createLeafTabSyncSerializedSnapshot(snapshot, {
      rootPath: 'leaftab/v1',
    });

    const restored = materializeLeafTabSyncSnapshotFromFiles(serialized.files, 'leaftab/v1');

    expect(restored).toEqual(snapshot);
  });

  it('reports only bookmark-related payload paths when a nested bookmark changes', () => {
    const previousSnapshot = createSnapshot();
    const nextSnapshot = createSnapshot();
    nextSnapshot.bookmarkItems.bookmark_github = {
      ...nextSnapshot.bookmarkItems.bookmark_github,
      title: 'GitHub Docs',
      revision: 2,
      updatedAt: '2026-03-27T15:10:00.000Z',
      updatedBy: 'device-b',
    };

    const changedPaths = collectLeafTabSyncChangedPayloadPaths(previousSnapshot, nextSnapshot, {
      rootPath: 'leaftab/v1',
    });

    const changed = Array.from(changedPaths || []);
    expect(changed).toEqual(expect.arrayContaining([
      expect.stringContaining('bookmark-items-'),
      'leaftab/v1/manifest.json',
    ]));
    expect(changed.some((entry) => entry.includes('/shortcuts-'))).toBe(false);
  });
});
