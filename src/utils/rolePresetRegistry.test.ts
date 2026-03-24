import { describe, expect, it } from 'vitest';
import {
  createLeafTabLocalBackupBundle,
  LEAFTAB_SYNC_SCHEMA_VERSION,
  type LeafTabSyncSnapshot,
} from '@/sync/leaftab';
import {
  buildRolePresetSnapshotFromData,
  resolveRolePresetFile,
} from './rolePresetRegistry';

const createSnapshot = (): LeafTabSyncSnapshot => ({
  meta: {
    version: LEAFTAB_SYNC_SCHEMA_VERSION,
    deviceId: 'device-a',
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
      createdAt: '2026-03-24T10:00:00.000Z',
      updatedAt: '2026-03-24T10:00:00.000Z',
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
      createdAt: '2026-03-24T10:00:00.000Z',
      updatedAt: '2026-03-24T10:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
  },
  bookmarkFolders: {},
  bookmarkItems: {},
  scenarioOrder: {
    type: 'scenario-order',
    ids: ['work'],
    updatedAt: '2026-03-24T10:00:00.000Z',
    updatedBy: 'device-a',
    revision: 1,
  },
  shortcutOrders: {
    work: {
      type: 'shortcut-order',
      scenarioId: 'work',
      ids: ['github'],
      updatedAt: '2026-03-24T10:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
  },
  bookmarkOrders: {
    __root__: {
      type: 'bookmark-order',
      parentId: null,
      ids: [],
      updatedAt: '2026-03-24T10:00:00.000Z',
      updatedBy: 'device-a',
      revision: 1,
    },
  },
  tombstones: {},
});

describe('rolePresetRegistry', () => {
  it('resolves localized legacy preset files from registry', () => {
    expect(resolveRolePresetFile('programmer', 'zh-CN')).toBe('leaftab_backup_Programmer.leaftab');
    expect(resolveRolePresetFile('programmer', 'en-US')).toBe('leaftab_backup_Programmer_en.leaftab');
  });

  it('builds a preset snapshot from legacy backup payloads', () => {
    const snapshot = buildRolePresetSnapshotFromData({
      type: 'leaftab_backup',
      version: 4,
      data: {
        scenarioModes: [
          { id: 'work', name: 'Work', color: '#000000', icon: 'briefcase' },
        ],
        selectedScenarioId: 'work',
        scenarioShortcuts: {
          work: [{ id: 'github', title: 'GitHub', url: 'https://github.com', icon: '' }],
        },
      },
    });

    expect(snapshot).not.toBeNull();
    expect(snapshot?.selectedScenarioId).toBe('work');
    expect(snapshot?.scenarioShortcuts.work).toEqual([
      { id: 'github', title: 'GitHub', url: 'https://github.com', icon: '' },
    ]);
  });

  it('builds a preset snapshot from future engine bundle payloads', () => {
    const bundle = createLeafTabLocalBackupBundle({
      snapshot: createSnapshot(),
      selectedScenarioId: 'work',
      exportedAt: '2026-03-24T10:05:00.000Z',
    });

    const snapshot = buildRolePresetSnapshotFromData(bundle);

    expect(snapshot).not.toBeNull();
    expect(snapshot?.selectedScenarioId).toBe('work');
    expect(snapshot?.scenarioModes.map((item) => item.id)).toEqual(['work']);
    expect(snapshot?.scenarioShortcuts.work).toEqual([
      { id: 'github', title: 'GitHub', url: 'https://github.com', icon: '' },
    ]);
  });
});
