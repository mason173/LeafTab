import { describe, expect, it } from 'vitest';
import { createLeafTabSyncBuildState } from './snapshot';
import type { LeafTabBookmarkTreeDraft } from './bookmarks';
import type { LeafTabSyncSnapshot } from './schema';
import type { SyncablePreferences } from '@/types';
import { getDefaultSyncablePreferences } from '@/utils/syncablePreferences';

const preferences: SyncablePreferences = getDefaultSyncablePreferences();
const createEmptySnapshot = (deviceId: string): LeafTabSyncSnapshot => ({
  meta: {
    version: 2,
    deviceId,
    generatedAt: '2026-03-27T14:00:00.000Z',
  },
  preferences: null,
  scenarios: {},
  shortcuts: {},
  bookmarkFolders: {},
  bookmarkItems: {},
  scenarioOrder: {
    type: 'scenario-order',
    ids: [],
    updatedAt: '2026-03-27T14:00:00.000Z',
    updatedBy: deviceId,
    revision: 1,
  },
  shortcutOrders: {},
  bookmarkOrders: {
    __root__: {
      type: 'bookmark-order',
      parentId: null,
      ids: [],
      updatedAt: '2026-03-27T14:00:00.000Z',
      updatedBy: deviceId,
      revision: 1,
    },
  },
  tombstones: {},
});

const bookmarkTree: LeafTabBookmarkTreeDraft = {
  folders: [
    {
      entityId: 'browser_root_toolbar',
      localNodeId: '1',
      parentId: null,
      title: 'Bookmarks Bar',
    },
    {
      entityId: 'folder_work',
      localNodeId: '10',
      parentId: 'browser_root_toolbar',
      title: 'Work',
    },
  ],
  items: [
    {
      entityId: 'bookmark_github',
      localNodeId: '100',
      parentId: 'folder_work',
      title: 'GitHub',
      url: 'https://github.com',
    },
  ],
  orderIdsByParent: {
    __root__: ['browser_root_toolbar'],
    browser_root_toolbar: ['folder_work'],
    folder_work: ['bookmark_github'],
  },
  nodeIdToEntityId: {
    '1': 'browser_root_toolbar',
    '10': 'folder_work',
    '100': 'bookmark_github',
  },
};

describe('snapshot bookmark build state', () => {
  it('preserves bookmark entity metadata and order metadata when bookmark content is unchanged', () => {
    const previousSnapshot = {
      ...createEmptySnapshot('device-a'),
      meta: {
        version: 2 as const,
        deviceId: 'device-a',
        generatedAt: '2026-03-27T14:00:00.000Z',
      },
      bookmarkFolders: {
        browser_root_toolbar: {
          id: 'browser_root_toolbar',
          type: 'bookmark-folder' as const,
          parentId: null,
          title: 'Bookmarks Bar',
          createdAt: '2026-03-27T13:00:00.000Z',
          updatedAt: '2026-03-27T13:00:00.000Z',
          updatedBy: 'device-a',
          revision: 1,
        },
        folder_work: {
          id: 'folder_work',
          type: 'bookmark-folder' as const,
          parentId: 'browser_root_toolbar',
          title: 'Work',
          createdAt: '2026-03-27T13:00:00.000Z',
          updatedAt: '2026-03-27T13:00:00.000Z',
          updatedBy: 'device-a',
          revision: 1,
        },
      },
      bookmarkItems: {
        bookmark_github: {
          id: 'bookmark_github',
          type: 'bookmark-item' as const,
          parentId: 'folder_work',
          title: 'GitHub',
          url: 'https://github.com',
          createdAt: '2026-03-27T13:00:00.000Z',
          updatedAt: '2026-03-27T13:00:00.000Z',
          updatedBy: 'device-a',
          revision: 1,
        },
      },
      bookmarkOrders: {
        __root__: {
          type: 'bookmark-order' as const,
          parentId: null,
          ids: ['browser_root_toolbar'],
          updatedAt: '2026-03-27T13:00:00.000Z',
          updatedBy: 'device-a',
          revision: 1,
        },
        browser_root_toolbar: {
          type: 'bookmark-order' as const,
          parentId: 'browser_root_toolbar',
          ids: ['folder_work'],
          updatedAt: '2026-03-27T13:00:00.000Z',
          updatedBy: 'device-a',
          revision: 1,
        },
        folder_work: {
          type: 'bookmark-order' as const,
          parentId: 'folder_work',
          ids: ['bookmark_github'],
          updatedAt: '2026-03-27T13:00:00.000Z',
          updatedBy: 'device-a',
          revision: 1,
        },
      },
    };

    const state = createLeafTabSyncBuildState({
      previousSnapshot,
      preferences,
      scenarioModes: [],
      scenarioShortcuts: {},
      bookmarkTree,
      deviceId: 'device-b',
      generatedAt: '2026-03-27T15:00:00.000Z',
    });

    expect(state.entities?.bookmark_github).toEqual({
      createdAt: '2026-03-27T13:00:00.000Z',
      updatedAt: '2026-03-27T13:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    });
    expect(state.orders?.bookmarkOrders?.folder_work).toEqual({
      updatedAt: '2026-03-27T13:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    });
  });

  it('creates bookmark tombstones and clears bookmark order entries when a bookmark is removed', () => {
    const previousSnapshot = {
      ...createEmptySnapshot('device-a'),
      meta: {
        version: 2 as const,
        deviceId: 'device-a',
        generatedAt: '2026-03-27T14:00:00.000Z',
      },
      bookmarkFolders: {
        browser_root_toolbar: {
          id: 'browser_root_toolbar',
          type: 'bookmark-folder' as const,
          parentId: null,
          title: 'Bookmarks Bar',
          createdAt: '2026-03-27T13:00:00.000Z',
          updatedAt: '2026-03-27T13:00:00.000Z',
          updatedBy: 'device-a',
          revision: 1,
        },
      },
      bookmarkItems: {
        bookmark_github: {
          id: 'bookmark_github',
          type: 'bookmark-item' as const,
          parentId: 'browser_root_toolbar',
          title: 'GitHub',
          url: 'https://github.com',
          createdAt: '2026-03-27T13:00:00.000Z',
          updatedAt: '2026-03-27T13:00:00.000Z',
          updatedBy: 'device-a',
          revision: 1,
        },
      },
      bookmarkOrders: {
        __root__: {
          type: 'bookmark-order' as const,
          parentId: null,
          ids: ['browser_root_toolbar'],
          updatedAt: '2026-03-27T13:00:00.000Z',
          updatedBy: 'device-a',
          revision: 1,
        },
        browser_root_toolbar: {
          type: 'bookmark-order' as const,
          parentId: 'browser_root_toolbar',
          ids: ['bookmark_github'],
          updatedAt: '2026-03-27T13:00:00.000Z',
          updatedBy: 'device-a',
          revision: 1,
        },
      },
    };

    const state = createLeafTabSyncBuildState({
      previousSnapshot,
      preferences,
      scenarioModes: [],
      scenarioShortcuts: {},
      bookmarkTree: {
        folders: bookmarkTree.folders.filter((folder) => folder.entityId === 'browser_root_toolbar'),
        items: [],
        orderIdsByParent: {
          __root__: ['browser_root_toolbar'],
          browser_root_toolbar: [],
        },
        nodeIdToEntityId: {
          '1': 'browser_root_toolbar',
        },
      },
      deviceId: 'device-b',
      generatedAt: '2026-03-27T15:10:00.000Z',
    });

    expect(state.tombstones?.bookmark_github).toEqual({
      id: 'bookmark_github',
      type: 'bookmark-item',
      deletedAt: '2026-03-27T15:10:00.000Z',
      deletedBy: 'device-b',
      lastKnownRevision: 1,
    });
    expect(state.orders?.bookmarkOrders?.browser_root_toolbar).toEqual({
      updatedAt: '2026-03-27T15:10:00.000Z',
      updatedBy: 'device-b',
      revision: 2,
    });
  });
});
