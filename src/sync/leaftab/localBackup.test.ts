import { describe, expect, it } from 'vitest';
import { getDefaultSyncablePreferences } from '@/utils/syncablePreferences';
import { buildLeafTabSyncSnapshot } from './snapshot';
import {
  createLeafTabLocalBackupBundle,
  filterLeafTabLocalBackupSnapshot,
  mergeLeafTabLocalBackupSnapshotWithBase,
  parseLeafTabLocalBackupImport,
  restrictLeafTabLocalBackupImportScope,
} from './localBackup';
import type { LeafTabSyncSnapshot } from './schema';
import { LEAFTAB_SYNC_SCHEMA_VERSION } from './schema';

const createSnapshot = (): LeafTabSyncSnapshot => ({
  meta: {
    version: LEAFTAB_SYNC_SCHEMA_VERSION,
    deviceId: 'device-a',
    generatedAt: '2026-03-27T12:00:00.000Z',
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
      createdAt: '2026-03-27T11:00:00.000Z',
      updatedAt: '2026-03-27T11:00:00.000Z',
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
      createdAt: '2026-03-27T11:00:00.000Z',
      updatedAt: '2026-03-27T11:00:00.000Z',
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
      createdAt: '2026-03-27T11:00:00.000Z',
      updatedAt: '2026-03-27T11:00:00.000Z',
      updatedBy: 'device-a',
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
      createdAt: '2026-03-27T11:00:00.000Z',
      updatedAt: '2026-03-27T11:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
  },
  scenarioOrder: {
    type: 'scenario-order',
    ids: ['work'],
    updatedAt: '2026-03-27T11:00:00.000Z',
    updatedBy: 'device-a',
    revision: 1,
  },
  shortcutOrders: {
    work: {
      type: 'shortcut-order',
      scenarioId: 'work',
      ids: ['github'],
      updatedAt: '2026-03-27T11:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
  },
  bookmarkOrders: {
    __root__: {
      type: 'bookmark-order',
      parentId: null,
      ids: ['browser_root_toolbar'],
      updatedAt: '2026-03-27T11:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
    browser_root_toolbar: {
      type: 'bookmark-order',
      parentId: 'browser_root_toolbar',
      ids: ['bookmark_a'],
      updatedAt: '2026-03-27T11:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
  },
  tombstones: {
    deleted_shortcut: {
      id: 'deleted_shortcut',
      type: 'shortcut',
      deletedAt: '2026-03-27T11:05:00.000Z',
      deletedBy: 'device-a',
      lastKnownRevision: 2,
    },
    deleted_bookmark: {
      id: 'deleted_bookmark',
      type: 'bookmark-item',
      deletedAt: '2026-03-27T11:06:00.000Z',
      deletedBy: 'device-a',
      lastKnownRevision: 3,
    },
  },
});

describe('local backup bookmark scope handling', () => {
  it('filters snapshots to bookmark-only exports without leaking shortcut state', () => {
    const filtered = filterLeafTabLocalBackupSnapshot(createSnapshot(), {
      shortcuts: false,
      bookmarks: true,
    });

    expect(filtered.scenarios).toEqual({});
    expect(filtered.shortcuts).toEqual({});
    expect(filtered.shortcutOrders).toEqual({});
    expect(filtered.bookmarkFolders).not.toEqual({});
    expect(filtered.bookmarkItems).not.toEqual({});
    expect(filtered.tombstones).toEqual({
      deleted_bookmark: expect.objectContaining({ type: 'bookmark-item' }),
    });
  });

  it('merges imported bookmark-only backups into a base snapshot without touching shortcuts', () => {
    const baseSnapshot = createSnapshot();
    const importedSnapshot = createSnapshot();
    importedSnapshot.bookmarkItems.bookmark_b = {
      id: 'bookmark_b',
      type: 'bookmark-item',
      parentId: 'browser_root_toolbar',
      title: 'Another Example',
      url: 'https://example.org',
      createdAt: '2026-03-27T12:10:00.000Z',
      updatedAt: '2026-03-27T12:10:00.000Z',
      updatedBy: 'device-b',
      revision: 1,
    };
    importedSnapshot.bookmarkOrders.browser_root_toolbar.ids = ['bookmark_a', 'bookmark_b'];

    const merged = mergeLeafTabLocalBackupSnapshotWithBase({
      baseSnapshot,
      importedSnapshot,
      exportScope: {
        shortcuts: false,
        bookmarks: true,
      },
    });

    expect(merged.shortcuts).toEqual(baseSnapshot.shortcuts);
    expect(merged.bookmarkItems.bookmark_b).toEqual(importedSnapshot.bookmarkItems.bookmark_b);
    expect(merged.bookmarkOrders.browser_root_toolbar.ids).toEqual(['bookmark_a', 'bookmark_b']);
  });

  it('round-trips bundle export/import scope and can restrict imported scope to bookmarks only', () => {
    const bundle = createLeafTabLocalBackupBundle({
      snapshot: createSnapshot(),
      selectedScenarioId: 'work',
      exportScope: {
        shortcuts: true,
        bookmarks: true,
      },
      exportedAt: '2026-03-27T12:30:00.000Z',
    });

    const parsed = parseLeafTabLocalBackupImport(bundle);
    expect(parsed?.kind).toBe('engine-bundle');

    const restricted = restrictLeafTabLocalBackupImportScope(parsed!, {
      shortcuts: false,
      bookmarks: true,
    });

    expect(restricted.kind).toBe('engine-bundle');
    expect(restricted.snapshot.shortcuts).toEqual({});
    expect(Object.keys(restricted.snapshot.bookmarkItems).length).toBeGreaterThan(0);
    expect(restricted.selectedScenarioId).toBe('');
    expect(restricted.exportScope).toEqual({
      shortcuts: false,
      bookmarks: true,
    });
  });

  it('preserves icon preference settings and per-shortcut custom colors in exported bundles', () => {
    const snapshot = buildLeafTabSyncSnapshot({
      deviceId: 'device-a',
      generatedAt: '2026-03-27T12:45:00.000Z',
      preferences: {
        ...getDefaultSyncablePreferences(),
        accentColor: 'dynamic',
        shortcutIconAppearance: 'monochrome',
        shortcutIconCornerRadius: 39,
        shortcutIconScale: 108,
      },
      scenarioModes: [
        {
          id: 'work',
          name: 'Work',
          color: '#000000',
          icon: 'briefcase',
        },
      ],
      scenarioShortcuts: {
        work: [
          {
            id: 'github',
            title: 'GitHub',
            url: 'https://github.com',
            icon: '',
            iconRendering: 'letter',
            officialIconColorOverride: true,
            iconColor: '#12ab90',
          },
        ],
      },
    });

    const bundle = createLeafTabLocalBackupBundle({
      snapshot,
      selectedScenarioId: 'work',
      exportScope: {
        shortcuts: true,
        bookmarks: true,
      },
      exportedAt: '2026-03-27T12:46:00.000Z',
    });

    const parsed = parseLeafTabLocalBackupImport(bundle);
    expect(parsed?.kind).toBe('engine-bundle');
    expect(parsed?.snapshot.preferences?.value).toEqual(expect.objectContaining({
      accentColor: 'dynamic',
      shortcutIconAppearance: 'monochrome',
      shortcutIconCornerRadius: 39,
      shortcutIconScale: 108,
    }));
    expect(parsed?.snapshot.shortcuts.github).toEqual(expect.objectContaining({
      iconRendering: 'letter',
      officialIconColorOverride: true,
      iconColor: '#12AB90',
    }));
  });
});
