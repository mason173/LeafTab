import { describe, expect, it } from 'vitest';
import type { LeafTabSyncSnapshot } from '@/sync/leaftab';
import {
  createEmptyLeafTabSyncSnapshot,
  createSnapshotBuildSignature,
  deriveLeafTabSyncApplyState,
} from '@/hooks/useLeafTabSnapshotBridge';

const createSnapshot = (): LeafTabSyncSnapshot => ({
  ...createEmptyLeafTabSyncSnapshot('device'),
  meta: {
    version: 2,
    deviceId: 'device',
    generatedAt: '2026-03-24T10:00:00.000Z',
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
    life: {
      id: 'life',
      type: 'scenario',
      name: 'Life',
      color: '#ffffff',
      icon: 'home',
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
  },
  scenarioOrder: {
    type: 'scenario-order',
    ids: ['work', 'life'],
    updatedAt: '2026-03-20T10:00:00.000Z',
    updatedBy: 'device',
    revision: 1,
  },
  shortcutOrders: {
    work: {
      type: 'shortcut-order',
      scenarioId: 'work',
      ids: ['a'],
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'device',
      revision: 1,
    },
  },
});

describe('deriveLeafTabSyncApplyState', () => {
  it('prefers the explicitly requested selected scenario when it exists', () => {
    const result = deriveLeafTabSyncApplyState({
      snapshot: createSnapshot(),
      selectedScenarioId: 'work',
      preferredSelectedScenarioId: 'life',
    });

    expect(result.nextSelectedScenarioId).toBe('life');
  });

  it('falls back to the current selected scenario before using the first available scenario', () => {
    const result = deriveLeafTabSyncApplyState({
      snapshot: createSnapshot(),
      selectedScenarioId: 'work',
      preferredSelectedScenarioId: 'missing',
    });

    expect(result.nextSelectedScenarioId).toBe('work');
    expect(result.nextProfileSnapshot.scenarioShortcuts.work).toEqual([
      expect.objectContaining({
        id: 'a',
        title: 'A',
        url: 'https://a.example',
        icon: '',
      }),
    ]);
  });

  it('keeps folder shortcuts when projecting a sync snapshot back into app state', () => {
    const snapshot = createSnapshot();
    snapshot.shortcuts.folder_1 = {
      id: 'folder_1',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'Workspace',
      url: '',
      icon: '',
      description: '',
      kind: 'folder',
      children: [
        {
          id: 'child_1',
          kind: 'link',
          title: 'Docs',
          url: 'https://docs.example',
          icon: '',
        },
      ],
      createdAt: '2026-03-20T10:00:00.000Z',
      updatedAt: '2026-03-20T10:00:00.000Z',
      updatedBy: 'device',
      revision: 1,
    };
    snapshot.shortcutOrders.work.ids = ['folder_1', 'a'];

    const result = deriveLeafTabSyncApplyState({
      snapshot,
      selectedScenarioId: 'work',
    });

    expect(result.nextProfileSnapshot.scenarioShortcuts.work[0]).toEqual(
      expect.objectContaining({
        id: 'folder_1',
        kind: 'folder',
        title: 'Workspace',
        children: [
          expect.objectContaining({
            id: 'child_1',
            kind: 'link',
            url: 'https://docs.example',
          }),
        ],
      }),
    );
  });
});

describe('createSnapshotBuildSignature', () => {
  it('changes when baseline snapshot changes even if local content stays the same', () => {
    const base = createSnapshot();
    const changedBaseline: LeafTabSyncSnapshot = {
      ...createSnapshot(),
      bookmarkItems: {
        bookmark_a: {
          id: 'bookmark_a',
          type: 'bookmark-item',
          parentId: 'browser_root_toolbar',
          title: 'Example',
          url: 'https://example.com',
          createdAt: '2026-03-20T10:00:00.000Z',
          updatedAt: '2026-03-24T10:00:00.000Z',
          updatedBy: 'device',
          revision: 2,
        },
      },
      bookmarkOrders: {
        __root__: {
          type: 'bookmark-order',
          parentId: null,
          ids: ['browser_root_toolbar'],
          updatedAt: '2026-03-20T10:00:00.000Z',
          updatedBy: 'device',
          revision: 1,
        },
        browser_root_toolbar: {
          type: 'bookmark-order',
          parentId: 'browser_root_toolbar',
          ids: ['bookmark_a'],
          updatedAt: '2026-03-24T10:00:00.000Z',
          updatedBy: 'device',
          revision: 2,
        },
      },
    };

    const localInput = {
      scenarioModes: [
        {
          id: 'work',
          name: 'Work',
          color: '#000000',
          icon: 'briefcase' as const,
        },
        {
          id: 'life',
          name: 'Life',
          color: '#ffffff',
          icon: 'home' as const,
        },
      ],
      scenarioShortcuts: {
        work: [
          {
            id: 'a',
            title: 'A',
            url: 'https://a.example',
            icon: '',
          },
        ],
        life: [],
      },
      bookmarkTree: {
        folders: [
          {
            entityId: 'browser_root_toolbar',
            localNodeId: '1',
            parentId: null,
            title: '书签栏',
          },
        ],
        items: [
          {
            entityId: 'bookmark_a',
            localNodeId: '101',
            parentId: 'browser_root_toolbar',
            title: 'Example',
            url: 'https://example.com',
          },
        ],
        orderIdsByParent: {
          __root__: ['browser_root_toolbar'],
          browser_root_toolbar: ['bookmark_a'],
        },
        nodeIdToEntityId: {
          '1': 'browser_root_toolbar',
          '101': 'bookmark_a',
        },
      },
    };

    const signatureWithBase = createSnapshotBuildSignature({
      baselineSnapshot: base,
      ...localInput,
    });
    const signatureWithChangedBaseline = createSnapshotBuildSignature({
      baselineSnapshot: changedBaseline,
      ...localInput,
    });

    expect(signatureWithChangedBaseline).not.toBe(signatureWithBase);
  });
});
