import { describe, expect, it } from 'vitest';
import type { LeafTabSyncSnapshot } from './schema';
import { projectLeafTabSyncSnapshotToAppState } from './snapshot';

const createSnapshot = (): LeafTabSyncSnapshot => ({
  meta: {
    version: 2,
    deviceId: 'device',
    generatedAt: '2026-03-22T10:00:00.000Z',
  },
  scenarios: {
    work: {
      id: 'work',
      type: 'scenario',
      name: 'Work',
      color: '#000000',
      icon: 'briefcase',
      archived: false,
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'device',
      revision: 1,
    },
  },
  shortcuts: {
    a: {
      id: 'a',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'A',
      url: 'https://a.example',
      icon: '',
      description: '',
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'device',
      revision: 1,
    },
    b: {
      id: 'b',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'B',
      url: 'https://b.example',
      icon: '',
      description: '',
      createdAt: '2026-03-20T10:01:00.000Z',
      updatedAt: '2026-03-20T10:01:00.000Z',
      updatedBy: 'device',
      revision: 1,
    },
  },
  bookmarkFolders: {},
  bookmarkItems: {},
  scenarioOrder: {
    type: 'scenario-order',
    ids: ['work'],
    updatedAt: '2026-03-20T10:00:00.000Z',
    updatedBy: 'device',
    revision: 1,
  },
  shortcutOrders: {
    work: {
      type: 'shortcut-order',
      scenarioId: 'work',
      ids: [],
      updatedAt: '2026-03-22T10:00:00.000Z',
      updatedBy: 'device',
      revision: 2,
    },
  },
  bookmarkOrders: {
    __root__: {
      type: 'bookmark-order',
      parentId: null,
      ids: [],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'device',
      revision: 1,
    },
  },
  tombstones: {},
});

describe('projectLeafTabSyncSnapshotToAppState', () => {
  it('keeps unordered shortcut entities instead of projecting an empty scenario list', () => {
    const projected = projectLeafTabSyncSnapshotToAppState(createSnapshot());

    expect(projected.scenarioShortcuts.work).toEqual([
      {
        id: 'a',
        title: 'A',
        url: 'https://a.example',
        icon: '',
      },
      {
        id: 'b',
        title: 'B',
        url: 'https://b.example',
        icon: '',
      },
    ]);
  });
});
