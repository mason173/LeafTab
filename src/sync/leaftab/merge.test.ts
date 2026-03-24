import { describe, expect, it } from 'vitest';
import type { LeafTabSyncSnapshot } from './schema';
import { LEAFTAB_SYNC_SCHEMA_VERSION } from './schema';
import { mergeLeafTabSyncSnapshot } from './merge';

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
});
