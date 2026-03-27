import { describe, expect, it } from 'vitest';
import type { LeafTabSyncSnapshot } from './schema';
import { LEAFTAB_SYNC_SCHEMA_VERSION } from './schema';
import { mergeLeafTabSyncSnapshot } from './merge';
import { getDefaultSyncablePreferences } from '@/utils/syncablePreferences';

const createEmptySnapshot = (deviceId: string, generatedAt: string): LeafTabSyncSnapshot => ({
  meta: { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId, generatedAt },
  scenarios: {},
  shortcuts: {},
  bookmarkFolders: {},
  bookmarkItems: {},
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
      ids: [],
      updatedAt: generatedAt,
      updatedBy: deviceId,
      revision: 1,
    },
  },
  tombstones: {},
});

describe('mergeLeafTabSyncSnapshot', () => {
  it('merges preference fields changed independently on different devices', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.preferences = {
      revision: 1,
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      value: getDefaultSyncablePreferences(),
    };

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    local.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'local', generatedAt: '2026-03-21T10:01:00.000Z' };
    local.preferences = {
      revision: 2,
      updatedAt: '2026-03-21T10:01:00.000Z',
      updatedBy: 'local',
      value: {
        ...getDefaultSyncablePreferences(),
        showDate: false,
      },
    };

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'remote', generatedAt: '2026-03-21T10:02:00.000Z' };
    remote.preferences = {
      revision: 2,
      updatedAt: '2026-03-21T10:02:00.000Z',
      updatedBy: 'remote',
      value: {
        ...getDefaultSyncablePreferences(),
        showWeekday: false,
      },
    };

    const result = mergeLeafTabSyncSnapshot(base, local, remote, {
      deviceId: 'merge-device',
      generatedAt: '2026-03-21T10:03:00.000Z',
    });

    expect(result.snapshot.preferences?.value.showDate).toBe(false);
    expect(result.snapshot.preferences?.value.showWeekday).toBe(false);
    expect(result.snapshot.preferences?.revision).toBe(3);
    expect(result.snapshot.preferences?.updatedBy).toBe('merge-device');
    expect(result.orderSources.preferences).toBe('merged');
  });

  it('uses the fresher side when the same preference field conflicts', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.preferences = {
      revision: 1,
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      value: getDefaultSyncablePreferences(),
    };

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    local.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'local', generatedAt: '2026-03-21T10:01:00.000Z' };
    local.preferences = {
      revision: 2,
      updatedAt: '2026-03-21T10:01:00.000Z',
      updatedBy: 'local',
      value: {
        ...getDefaultSyncablePreferences(),
        theme: 'dark',
      },
    };

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'remote', generatedAt: '2026-03-21T10:02:00.000Z' };
    remote.preferences = {
      revision: 3,
      updatedAt: '2026-03-21T10:02:00.000Z',
      updatedBy: 'remote',
      value: {
        ...getDefaultSyncablePreferences(),
        theme: 'light',
      },
    };

    const result = mergeLeafTabSyncSnapshot(base, local, remote);

    expect(result.snapshot.preferences?.value.theme).toBe('light');
    expect(result.snapshot.preferences?.revision).toBe(3);
    expect(result.snapshot.preferences?.updatedBy).toBe('remote');
    expect(result.orderSources.preferences).toBe('remote');
  });

  it('merges shortcut fields changed on different sides', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.scenarios.work = {
      id: 'work',
      type: 'scenario',
      name: 'Work',
      color: '#000000',
      icon: 'briefcase',
      archived: false,
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.shortcuts.github = {
      id: 'github',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'GitHub',
      url: 'https://github.com',
      icon: 'github',
      description: '',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.scenarioOrder.ids = ['work'];
    base.shortcutOrders.work = {
      type: 'shortcut-order',
      scenarioId: 'work',
      ids: ['github'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    local.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'local', generatedAt: '2026-03-21T10:01:00.000Z' };
    local.shortcuts.github = {
      ...local.shortcuts.github,
      title: 'GitHub Home',
      updatedAt: '2026-03-21T10:01:00.000Z',
      updatedBy: 'local',
      revision: 2,
    };

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'remote', generatedAt: '2026-03-21T10:02:00.000Z' };
    remote.shortcuts.github = {
      ...remote.shortcuts.github,
      icon: 'github-fill',
      updatedAt: '2026-03-21T10:02:00.000Z',
      updatedBy: 'remote',
      revision: 2,
    };

    const result = mergeLeafTabSyncSnapshot(base, local, remote, {
      deviceId: 'merge-device',
      generatedAt: '2026-03-21T10:03:00.000Z',
    });

    expect(result.snapshot.shortcuts.github.title).toBe('GitHub Home');
    expect(result.snapshot.shortcuts.github.icon).toBe('github-fill');
    expect(result.entitySources.github).toBe('local');
  });

  it('lets a newer tombstone beat an older update', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.scenarios.work = {
      id: 'work',
      type: 'scenario',
      name: 'Work',
      color: '#000000',
      icon: 'briefcase',
      archived: false,
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.scenarioOrder.ids = ['work'];

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    local.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'local', generatedAt: '2026-03-21T10:05:00.000Z' };
    delete local.scenarios.work;
    local.tombstones.work = {
      id: 'work',
      type: 'scenario',
      deletedAt: '2026-03-21T10:05:00.000Z',
      deletedBy: 'local',
      lastKnownRevision: 1,
    };
    local.scenarioOrder.ids = [];

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'remote', generatedAt: '2026-03-21T10:04:00.000Z' };
    remote.scenarios.work = {
      ...remote.scenarios.work,
      name: 'Office',
      updatedAt: '2026-03-21T10:04:00.000Z',
      updatedBy: 'remote',
      revision: 2,
    };

    const result = mergeLeafTabSyncSnapshot(base, local, remote);

    expect(result.snapshot.scenarios.work).toBeUndefined();
    expect(result.snapshot.tombstones.work?.type).toBe('scenario');
    expect(result.entitySources.work).toBe('tombstone');
  });

  it('keeps a remote tombstone when the remote entity is already absent and baseline is empty', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');

    const local = createEmptySnapshot('local', '2026-03-21T10:01:00.000Z');
    local.scenarios.work = {
      id: 'work',
      type: 'scenario',
      name: 'Work',
      color: '#000000',
      icon: 'briefcase',
      archived: false,
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'local',
      revision: 1,
    };
    local.shortcuts.github = {
      id: 'github',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'GitHub',
      url: 'https://github.com',
      icon: '',
      description: '',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'local',
      revision: 1,
    };
    local.scenarioOrder.ids = ['work'];
    local.shortcutOrders.work = {
      type: 'shortcut-order',
      scenarioId: 'work',
      ids: ['github'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'local',
      revision: 1,
    };

    const remote = createEmptySnapshot('remote', '2026-03-21T10:02:00.000Z');
    remote.tombstones.github = {
      id: 'github',
      type: 'shortcut',
      deletedAt: '2026-03-21T10:02:00.000Z',
      deletedBy: 'remote',
      lastKnownRevision: 1,
    };

    const result = mergeLeafTabSyncSnapshot(base, local, remote, {
      deviceId: 'merge-device',
      generatedAt: '2026-03-21T10:03:00.000Z',
    });

    expect(result.snapshot.shortcuts.github).toBeUndefined();
    expect(result.snapshot.tombstones.github?.type).toBe('shortcut');
    expect(result.entitySources.github).toBe('tombstone');
    expect(result.snapshot.shortcutOrders.work.ids).toEqual([]);
  });

  it('merges order files without dropping independent additions', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.scenarios.work = {
      id: 'work',
      type: 'scenario',
      name: 'Work',
      color: '#000000',
      icon: 'briefcase',
      archived: false,
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.scenarioOrder.ids = ['work'];
    base.shortcuts.a = {
      id: 'a',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'A',
      url: 'https://a.example',
      icon: '',
      description: '',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.shortcuts.b = {
      id: 'b',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'B',
      url: 'https://b.example',
      icon: '',
      description: '',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.shortcutOrders.work = {
      type: 'shortcut-order',
      scenarioId: 'work',
      ids: ['a', 'b'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    local.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'local', generatedAt: '2026-03-21T10:01:00.000Z' };
    local.shortcuts.c = {
      id: 'c',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'C',
      url: 'https://c.example',
      icon: '',
      description: '',
      createdAt: '2026-03-21T10:01:00.000Z',
      updatedAt: '2026-03-21T10:01:00.000Z',
      updatedBy: 'local',
      revision: 1,
    };
    local.shortcutOrders.work.ids = ['a', 'b', 'c'];

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'remote', generatedAt: '2026-03-21T10:02:00.000Z' };
    delete remote.shortcuts.a;
    remote.tombstones.a = {
      id: 'a',
      type: 'shortcut',
      deletedAt: '2026-03-21T10:02:00.000Z',
      deletedBy: 'remote',
      lastKnownRevision: 1,
    };
    remote.shortcutOrders.work.ids = ['b'];

    const result = mergeLeafTabSyncSnapshot(base, local, remote);

    expect(result.snapshot.shortcutOrders.work.ids).toEqual(['b', 'c']);
  });

  it('rebuilds shortcut order when order entries are missing but entities still exist', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.scenarios.work = {
      id: 'work',
      type: 'scenario',
      name: 'Work',
      color: '#000000',
      icon: 'briefcase',
      archived: false,
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.shortcuts.a = {
      id: 'a',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'A',
      url: 'https://a.example',
      icon: '',
      description: '',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.shortcuts.b = {
      id: 'b',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'B',
      url: 'https://b.example',
      icon: '',
      description: '',
      createdAt: '2026-03-20T10:01:00.000Z',
      updatedAt: '2026-03-20T10:01:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.scenarioOrder.ids = ['work'];
    base.shortcutOrders.work = {
      type: 'shortcut-order',
      scenarioId: 'work',
      ids: ['a', 'b'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    local.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'local', generatedAt: '2026-03-21T10:01:00.000Z' };
    local.shortcutOrders.work.ids = [];

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'remote', generatedAt: '2026-03-21T10:02:00.000Z' };
    remote.shortcutOrders.work.ids = [];

    const result = mergeLeafTabSyncSnapshot(base, local, remote);

    expect(result.snapshot.shortcuts.a).toBeDefined();
    expect(result.snapshot.shortcuts.b).toBeDefined();
    expect(result.snapshot.shortcutOrders.work.ids).toEqual(['a', 'b']);
  });

  it('uses one fresher shortcut order when both sides only reordered the same ids', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.scenarios.work = {
      id: 'work',
      type: 'scenario',
      name: 'Work',
      color: '#000000',
      icon: 'briefcase',
      archived: false,
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.shortcuts.a = {
      id: 'a',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'A',
      url: 'https://a.example',
      icon: '',
      description: '',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.shortcuts.b = {
      id: 'b',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'B',
      url: 'https://b.example',
      icon: '',
      description: '',
      createdAt: '2026-03-20T10:01:00.000Z',
      updatedAt: '2026-03-20T10:01:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.scenarioOrder.ids = ['work'];
    base.shortcutOrders.work = {
      type: 'shortcut-order',
      scenarioId: 'work',
      ids: ['a', 'b'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    local.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'local', generatedAt: '2026-03-21T10:01:00.000Z' };
    local.shortcutOrders.work = {
      ...local.shortcutOrders.work,
      ids: ['b', 'a'],
      updatedAt: '2026-03-21T10:01:00.000Z',
      updatedBy: 'local',
      revision: 2,
    };

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'remote', generatedAt: '2026-03-21T10:02:00.000Z' };
    remote.shortcutOrders.work = {
      ...remote.shortcutOrders.work,
      ids: ['a', 'b'],
      updatedAt: '2026-03-21T10:02:00.000Z',
      updatedBy: 'remote',
      revision: 3,
    };

    const result = mergeLeafTabSyncSnapshot(base, local, remote);

    expect(result.snapshot.shortcutOrders.work.ids).toEqual(['a', 'b']);
    expect(result.orderSources['scenario:work']).toBe('remote');
  });

  it('merges bookmark moves and keeps independent additions', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.bookmarkFolders.dev = {
      id: 'dev',
      type: 'bookmark-folder',
      parentId: null,
      title: 'Dev',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkFolders.reading = {
      id: 'reading',
      type: 'bookmark-folder',
      parentId: null,
      title: 'Reading',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkItems.a = {
      id: 'a',
      type: 'bookmark-item',
      parentId: 'dev',
      title: 'A',
      url: 'https://a.example',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkItems.b = {
      id: 'b',
      type: 'bookmark-item',
      parentId: 'dev',
      title: 'B',
      url: 'https://b.example',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.__root__.ids = ['dev', 'reading'];
    base.bookmarkOrders.dev = {
      type: 'bookmark-order',
      parentId: 'dev',
      ids: ['a', 'b'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.reading = {
      type: 'bookmark-order',
      parentId: 'reading',
      ids: [],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    local.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'local', generatedAt: '2026-03-21T10:01:00.000Z' };
    local.bookmarkItems.c = {
      id: 'c',
      type: 'bookmark-item',
      parentId: 'dev',
      title: 'C',
      url: 'https://c.example',
      createdAt: '2026-03-21T10:01:00.000Z',
      updatedAt: '2026-03-21T10:01:00.000Z',
      updatedBy: 'local',
      revision: 1,
    };
    local.bookmarkOrders.dev.ids = ['a', 'b', 'c'];

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.meta = { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId: 'remote', generatedAt: '2026-03-21T10:02:00.000Z' };
    remote.bookmarkItems.b = {
      ...remote.bookmarkItems.b,
      parentId: 'reading',
      updatedAt: '2026-03-21T10:02:00.000Z',
      updatedBy: 'remote',
      revision: 2,
    };
    remote.bookmarkOrders.dev.ids = ['a'];
    remote.bookmarkOrders.reading.ids = ['b'];

    const result = mergeLeafTabSyncSnapshot(base, local, remote);

    expect(result.snapshot.bookmarkItems.b.parentId).toBe('reading');
    expect(result.snapshot.bookmarkOrders.dev.ids).toEqual(['a', 'c']);
    expect(result.snapshot.bookmarkOrders.reading.ids).toEqual(['b']);
  });

  it('lets a newer bookmark tombstone beat an older bookmark update', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.bookmarkFolders.toolbar = {
      id: 'toolbar',
      type: 'bookmark-folder',
      parentId: null,
      title: 'Bookmarks Bar',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkItems.bookmark_a = {
      id: 'bookmark_a',
      type: 'bookmark-item',
      parentId: 'toolbar',
      title: 'Example',
      url: 'https://example.com',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.__root__.ids = ['toolbar'];
    base.bookmarkOrders.toolbar = {
      type: 'bookmark-order',
      parentId: 'toolbar',
      ids: ['bookmark_a'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    delete local.bookmarkItems.bookmark_a;
    local.bookmarkOrders.toolbar.ids = [];
    local.tombstones.bookmark_a = {
      id: 'bookmark_a',
      type: 'bookmark-item',
      deletedAt: '2026-03-21T10:05:00.000Z',
      deletedBy: 'local',
      lastKnownRevision: 1,
    };

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.bookmarkItems.bookmark_a = {
      ...remote.bookmarkItems.bookmark_a,
      title: 'Example updated',
      updatedAt: '2026-03-21T10:04:00.000Z',
      updatedBy: 'remote',
      revision: 2,
    };

    const result = mergeLeafTabSyncSnapshot(base, local, remote);

    expect(result.snapshot.bookmarkItems.bookmark_a).toBeUndefined();
    expect(result.snapshot.tombstones.bookmark_a).toEqual(expect.objectContaining({
      type: 'bookmark-item',
      deletedBy: 'local',
    }));
    expect(result.entitySources.bookmark_a).toBe('tombstone');
    expect(result.snapshot.bookmarkOrders.toolbar.ids).toEqual([]);
  });

  it('prunes orphaned bookmark descendants when a parent folder is deleted', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.bookmarkFolders.toolbar = {
      id: 'toolbar',
      type: 'bookmark-folder',
      parentId: null,
      title: 'Bookmarks Bar',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkFolders.folder_work = {
      id: 'folder_work',
      type: 'bookmark-folder',
      parentId: 'toolbar',
      title: 'Work',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkItems.bookmark_a = {
      id: 'bookmark_a',
      type: 'bookmark-item',
      parentId: 'folder_work',
      title: 'Example',
      url: 'https://example.com',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.__root__.ids = ['toolbar'];
    base.bookmarkOrders.toolbar = {
      type: 'bookmark-order',
      parentId: 'toolbar',
      ids: ['folder_work'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.folder_work = {
      type: 'bookmark-order',
      parentId: 'folder_work',
      ids: ['bookmark_a'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    delete local.bookmarkFolders.folder_work;
    delete local.bookmarkItems.bookmark_a;
    delete local.bookmarkOrders.folder_work;
    local.bookmarkOrders.toolbar.ids = [];
    local.tombstones.folder_work = {
      id: 'folder_work',
      type: 'bookmark-folder',
      deletedAt: '2026-03-21T10:05:00.000Z',
      deletedBy: 'local',
      lastKnownRevision: 1,
    };

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.bookmarkItems.bookmark_a = {
      ...remote.bookmarkItems.bookmark_a,
      title: 'Example updated',
      updatedAt: '2026-03-21T10:04:00.000Z',
      updatedBy: 'remote',
      revision: 2,
    };

    const result = mergeLeafTabSyncSnapshot(base, local, remote, {
      deviceId: 'merge-device',
      generatedAt: '2026-03-21T10:06:00.000Z',
    });

    expect(result.snapshot.bookmarkFolders.folder_work).toBeUndefined();
    expect(result.snapshot.bookmarkItems.bookmark_a).toBeUndefined();
    expect(result.snapshot.tombstones.folder_work).toEqual(expect.objectContaining({
      type: 'bookmark-folder',
      deletedBy: 'local',
    }));
    expect(result.snapshot.tombstones.bookmark_a).toEqual(expect.objectContaining({
      type: 'bookmark-item',
    }));
    expect(result.entitySources.folder_work).toBe('tombstone');
    expect(result.entitySources.bookmark_a).toBe('tombstone');
  });

  it('merges nested bookmark order changes without dropping additions from different levels', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.bookmarkFolders.toolbar = {
      id: 'toolbar',
      type: 'bookmark-folder',
      parentId: null,
      title: 'Bookmarks Bar',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkFolders.folder_alpha = {
      id: 'folder_alpha',
      type: 'bookmark-folder',
      parentId: 'toolbar',
      title: 'Alpha',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkFolders.folder_beta = {
      id: 'folder_beta',
      type: 'bookmark-folder',
      parentId: 'toolbar',
      title: 'Beta',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkItems.bookmark_a = {
      id: 'bookmark_a',
      type: 'bookmark-item',
      parentId: 'folder_alpha',
      title: 'A',
      url: 'https://a.example',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkItems.bookmark_b = {
      id: 'bookmark_b',
      type: 'bookmark-item',
      parentId: 'folder_alpha',
      title: 'B',
      url: 'https://b.example',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.__root__.ids = ['toolbar'];
    base.bookmarkOrders.toolbar = {
      type: 'bookmark-order',
      parentId: 'toolbar',
      ids: ['folder_alpha', 'folder_beta'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.folder_alpha = {
      type: 'bookmark-order',
      parentId: 'folder_alpha',
      ids: ['bookmark_a', 'bookmark_b'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.folder_beta = {
      type: 'bookmark-order',
      parentId: 'folder_beta',
      ids: [],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    local.bookmarkFolders.folder_gamma = {
      id: 'folder_gamma',
      type: 'bookmark-folder',
      parentId: 'toolbar',
      title: 'Gamma',
      createdAt: '2026-03-21T10:01:00.000Z',
      updatedAt: '2026-03-21T10:01:00.000Z',
      updatedBy: 'local',
      revision: 1,
    };
    local.bookmarkItems.bookmark_c = {
      id: 'bookmark_c',
      type: 'bookmark-item',
      parentId: 'folder_alpha',
      title: 'C',
      url: 'https://c.example',
      createdAt: '2026-03-21T10:01:00.000Z',
      updatedAt: '2026-03-21T10:01:00.000Z',
      updatedBy: 'local',
      revision: 1,
    };
    local.bookmarkOrders.toolbar.ids = ['folder_beta', 'folder_alpha', 'folder_gamma'];
    local.bookmarkOrders.folder_alpha.ids = ['bookmark_b', 'bookmark_a', 'bookmark_c'];
    local.bookmarkOrders.folder_gamma = {
      type: 'bookmark-order',
      parentId: 'folder_gamma',
      ids: [],
      updatedAt: '2026-03-21T10:01:00.000Z',
      updatedBy: 'local',
      revision: 1,
    };

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.bookmarkItems.bookmark_d = {
      id: 'bookmark_d',
      type: 'bookmark-item',
      parentId: 'folder_beta',
      title: 'D',
      url: 'https://d.example',
      createdAt: '2026-03-21T10:02:00.000Z',
      updatedAt: '2026-03-21T10:02:00.000Z',
      updatedBy: 'remote',
      revision: 1,
    };
    remote.bookmarkOrders.toolbar.ids = ['folder_alpha', 'folder_beta'];
    remote.bookmarkOrders.folder_alpha.ids = ['bookmark_a', 'bookmark_b'];
    remote.bookmarkOrders.folder_beta.ids = ['bookmark_d'];

    const result = mergeLeafTabSyncSnapshot(base, local, remote, {
      deviceId: 'merge-device',
      generatedAt: '2026-03-21T10:03:00.000Z',
    });

    expect(result.snapshot.bookmarkOrders.toolbar.ids).toEqual(['folder_beta', 'folder_alpha', 'folder_gamma']);
    expect(result.snapshot.bookmarkOrders.folder_alpha.ids).toEqual(['bookmark_b', 'bookmark_a', 'bookmark_c']);
    expect(result.snapshot.bookmarkOrders.folder_beta.ids).toEqual(['bookmark_d']);
    expect(result.snapshot.bookmarkFolders.folder_gamma).toEqual(expect.objectContaining({ title: 'Gamma' }));
    expect(result.snapshot.bookmarkItems.bookmark_c).toEqual(expect.objectContaining({ title: 'C' }));
    expect(result.snapshot.bookmarkItems.bookmark_d).toEqual(expect.objectContaining({ title: 'D' }));
  });

  it('keeps moved bookmark items when a parent folder is renamed on the other side', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.bookmarkFolders.toolbar = {
      id: 'toolbar',
      type: 'bookmark-folder',
      parentId: null,
      title: 'Bookmarks Bar',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkFolders.folder_work = {
      id: 'folder_work',
      type: 'bookmark-folder',
      parentId: 'toolbar',
      title: 'Work',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkFolders.folder_archive = {
      id: 'folder_archive',
      type: 'bookmark-folder',
      parentId: 'toolbar',
      title: 'Archive',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkItems.bookmark_a = {
      id: 'bookmark_a',
      type: 'bookmark-item',
      parentId: 'folder_work',
      title: 'Example',
      url: 'https://example.com',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.__root__.ids = ['toolbar'];
    base.bookmarkOrders.toolbar = {
      type: 'bookmark-order',
      parentId: 'toolbar',
      ids: ['folder_work', 'folder_archive'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.folder_work = {
      type: 'bookmark-order',
      parentId: 'folder_work',
      ids: ['bookmark_a'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.folder_archive = {
      type: 'bookmark-order',
      parentId: 'folder_archive',
      ids: [],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    local.bookmarkItems.bookmark_a = {
      ...local.bookmarkItems.bookmark_a,
      parentId: 'folder_archive',
      updatedAt: '2026-03-21T10:01:00.000Z',
      updatedBy: 'local',
      revision: 2,
    };
    local.bookmarkOrders.folder_work.ids = [];
    local.bookmarkOrders.folder_archive.ids = ['bookmark_a'];

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.bookmarkFolders.folder_work = {
      ...remote.bookmarkFolders.folder_work,
      title: 'Work Projects',
      updatedAt: '2026-03-21T10:02:00.000Z',
      updatedBy: 'remote',
      revision: 2,
    };

    const result = mergeLeafTabSyncSnapshot(base, local, remote, {
      deviceId: 'merge-device',
      generatedAt: '2026-03-21T10:03:00.000Z',
    });

    expect(result.snapshot.bookmarkFolders.folder_work.title).toBe('Work Projects');
    expect(result.snapshot.bookmarkItems.bookmark_a.parentId).toBe('folder_archive');
    expect(result.snapshot.bookmarkOrders.folder_work.ids).toEqual([]);
    expect(result.snapshot.bookmarkOrders.folder_archive.ids).toEqual(['bookmark_a']);
  });

  it('keeps a child bookmark when it was moved out before its old parent folder was deleted', () => {
    const base = createEmptySnapshot('base', '2026-03-21T10:00:00.000Z');
    base.bookmarkFolders.toolbar = {
      id: 'toolbar',
      type: 'bookmark-folder',
      parentId: null,
      title: 'Bookmarks Bar',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkFolders.folder_work = {
      id: 'folder_work',
      type: 'bookmark-folder',
      parentId: 'toolbar',
      title: 'Work',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkFolders.folder_archive = {
      id: 'folder_archive',
      type: 'bookmark-folder',
      parentId: 'toolbar',
      title: 'Archive',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkItems.bookmark_a = {
      id: 'bookmark_a',
      type: 'bookmark-item',
      parentId: 'folder_work',
      title: 'Example',
      url: 'https://example.com',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.__root__.ids = ['toolbar'];
    base.bookmarkOrders.toolbar = {
      type: 'bookmark-order',
      parentId: 'toolbar',
      ids: ['folder_work', 'folder_archive'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.folder_work = {
      type: 'bookmark-order',
      parentId: 'folder_work',
      ids: ['bookmark_a'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };
    base.bookmarkOrders.folder_archive = {
      type: 'bookmark-order',
      parentId: 'folder_archive',
      ids: [],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'base',
      revision: 1,
    };

    const local: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    delete local.bookmarkFolders.folder_work;
    delete local.bookmarkOrders.folder_work;
    local.bookmarkOrders.toolbar.ids = ['folder_archive'];
    local.tombstones.folder_work = {
      id: 'folder_work',
      type: 'bookmark-folder',
      deletedAt: '2026-03-21T10:05:00.000Z',
      deletedBy: 'local',
      lastKnownRevision: 1,
    };

    const remote: LeafTabSyncSnapshot = JSON.parse(JSON.stringify(base));
    remote.bookmarkItems.bookmark_a = {
      ...remote.bookmarkItems.bookmark_a,
      parentId: 'folder_archive',
      title: 'Example moved',
      updatedAt: '2026-03-21T10:06:00.000Z',
      updatedBy: 'remote',
      revision: 2,
    };
    remote.bookmarkOrders.folder_work.ids = [];
    remote.bookmarkOrders.folder_archive.ids = ['bookmark_a'];

    const result = mergeLeafTabSyncSnapshot(base, local, remote, {
      deviceId: 'merge-device',
      generatedAt: '2026-03-21T10:07:00.000Z',
    });

    expect(result.snapshot.bookmarkFolders.folder_work).toBeUndefined();
    expect(result.snapshot.bookmarkItems.bookmark_a).toEqual(expect.objectContaining({
      parentId: 'folder_archive',
      title: 'Example moved',
    }));
    expect(result.snapshot.bookmarkOrders.folder_archive.ids).toEqual(['bookmark_a']);
    expect(result.snapshot.tombstones.folder_work).toEqual(expect.objectContaining({
      type: 'bookmark-folder',
    }));
  });
});
