import { beforeEach, describe, expect, it } from 'vitest';
import { LeafTabLegacySingleFileCompat } from './legacySingleFileCompat';
import { LeafTabSyncMemoryBaselineStore } from './baseline';
import { LEAFTAB_SYNC_SCHEMA_VERSION, type LeafTabSyncSnapshot } from './schema';

const createEmptySnapshot = (deviceId: string, generatedAt: string): LeafTabSyncSnapshot => ({
  meta: { version: LEAFTAB_SYNC_SCHEMA_VERSION, deviceId, generatedAt },
  preferences: null,
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

const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
};

const createShortcutSnapshot = (
  order: string[],
  options?: {
    deviceId?: string;
    generatedAt?: string;
  },
): LeafTabSyncSnapshot => {
  const deviceId = options?.deviceId || 'local-device';
  const generatedAt = options?.generatedAt || '2026-04-11T10:00:00.000Z';
  const snapshot = createEmptySnapshot(deviceId, generatedAt);

  snapshot.scenarios.work = {
    id: 'work',
    type: 'scenario',
    name: 'Work',
    color: '#16a34a',
    icon: 'briefcase',
    archived: false,
    createdAt: generatedAt,
    updatedAt: generatedAt,
    updatedBy: deviceId,
    revision: 1,
  };
  snapshot.scenarioOrder.ids = ['work'];

  order.forEach((shortcutId, index) => {
    snapshot.shortcuts[shortcutId] = {
      id: shortcutId,
      type: 'shortcut',
      scenarioId: 'work',
      title: shortcutId.toUpperCase(),
      url: `https://example.com/${shortcutId}`,
      icon: '',
      description: '',
      kind: 'link',
      children: undefined,
      folderDisplayMode: undefined,
      useOfficialIcon: true,
      autoUseOfficialIcon: true,
      officialIconAvailableAtSave: false,
      iconRendering: 'favicon',
      iconColor: '',
      createdAt: generatedAt,
      updatedAt: generatedAt,
      updatedBy: deviceId,
      revision: index + 1,
    };
  });

  snapshot.shortcutOrders.work = {
    type: 'shortcut-order',
    scenarioId: 'work',
    ids: order.slice(),
    updatedAt: generatedAt,
    updatedBy: deviceId,
    revision: 1,
  };

  return snapshot;
};

describe('LeafTabLegacySingleFileCompat.prepareLocalSnapshot', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createMemoryStorage(),
      configurable: true,
    });
  });

  it('keeps the current local shortcut order once new-engine sync state already exists', async () => {
    const baselineStore = new LeafTabSyncMemoryBaselineStore();
    const localSnapshot = createShortcutSnapshot(['b', 'a']);

    const compat = new LeafTabLegacySingleFileCompat({
      deviceId: 'local-device',
      baselineStore,
      remoteStore: {
        async readState() {
          return {
            head: {
              version: LEAFTAB_SYNC_SCHEMA_VERSION,
              commitId: 'commit-1',
              updatedAt: '2026-04-11T10:05:00.000Z',
            },
            commit: null,
            snapshot: createShortcutSnapshot(['a', 'b'], {
              deviceId: 'remote-device',
              generatedAt: '2026-04-11T10:05:00.000Z',
            }),
          };
        },
      } as any,
      legacyDriver: {
        async readLegacyPayload() {
          return {
            scenarioModes: [
              { id: 'work', name: 'Work', color: '#16a34a', icon: 'briefcase' },
            ],
            selectedScenarioId: 'work',
            scenarioShortcuts: {
              work: [
                { id: 'a', title: 'A', url: 'https://example.com/a', icon: '' },
                { id: 'b', title: 'B', url: 'https://example.com/b', icon: '' },
              ],
            },
          };
        },
        async writeLegacyPayload() {},
      },
      buildLocalSnapshot: async () => localSnapshot,
      applyLocalSnapshot: async () => {},
    });

    const prepared = await compat.prepareLocalSnapshot(localSnapshot);

    expect(prepared.migrated).toBe(false);
    expect(prepared.importedLegacy).toBe(false);
    expect(prepared.snapshot).toEqual(localSnapshot);
    expect(prepared.snapshot.shortcutOrders.work?.ids).toEqual(['b', 'a']);
  });

  it('still migrates legacy shortcut data when no new-engine sync state exists yet', async () => {
    const baselineStore = new LeafTabSyncMemoryBaselineStore();
    const localSnapshot = createShortcutSnapshot(['b', 'a']);

    const compat = new LeafTabLegacySingleFileCompat({
      deviceId: 'local-device',
      baselineStore,
      remoteStore: {
        async readState() {
          return {
            head: null,
            commit: null,
            snapshot: null,
          };
        },
      } as any,
      legacyDriver: {
        async readLegacyPayload() {
          return {
            scenarioModes: [
              { id: 'work', name: 'Work', color: '#16a34a', icon: 'briefcase' },
            ],
            selectedScenarioId: 'work',
            scenarioShortcuts: {
              work: [
                { id: 'a', title: 'A', url: 'https://example.com/a', icon: '' },
                { id: 'b', title: 'B', url: 'https://example.com/b', icon: '' },
                { id: 'c', title: 'C', url: 'https://example.com/c', icon: '' },
              ],
            },
          };
        },
        async writeLegacyPayload() {},
      },
      buildLocalSnapshot: async () => localSnapshot,
      applyLocalSnapshot: async () => {},
    });

    const prepared = await compat.prepareLocalSnapshot(localSnapshot);

    expect(prepared.migrated).toBe(true);
    expect(prepared.importedLegacy).toBe(true);
    expect(prepared.snapshot.shortcutOrders.work?.ids).toEqual(['b', 'a', 'c']);
    expect(prepared.snapshot.shortcuts.c?.url).toBe('https://example.com/c');
  });

  it('writes a flattened legacy mirror so older clients keep working with folder data', async () => {
    const baselineStore = new LeafTabSyncMemoryBaselineStore();
    const localSnapshot = createShortcutSnapshot(['chat']);
    localSnapshot.shortcuts.folder = {
      id: 'folder',
      type: 'shortcut',
      scenarioId: 'work',
      title: 'Folder',
      url: '',
      icon: '',
      description: '',
      kind: 'folder',
      children: [
        {
          id: 'docs',
          title: 'Docs',
          url: 'https://docs.example',
          icon: '',
          kind: 'link',
        },
      ],
      folderDisplayMode: 'large',
      useOfficialIcon: true,
      autoUseOfficialIcon: true,
      officialIconAvailableAtSave: false,
      iconRendering: 'favicon',
      iconColor: '',
      createdAt: '2026-04-11T10:00:00.000Z',
      updatedAt: '2026-04-11T10:00:00.000Z',
      updatedBy: 'local-device',
      revision: 2,
    };
    localSnapshot.shortcutOrders.work.ids = ['folder', 'chat'];

    let mirroredPayload: any = null;
    const compat = new LeafTabLegacySingleFileCompat({
      deviceId: 'local-device',
      baselineStore,
      remoteStore: {
        async readState() {
          return { head: null, commit: null, snapshot: null };
        },
      } as any,
      legacyDriver: {
        async readLegacyPayload() {
          return null;
        },
        async writeLegacyPayload(payload) {
          mirroredPayload = payload;
        },
      },
      buildLocalSnapshot: async () => localSnapshot,
      applyLocalSnapshot: async () => {},
    });

    await compat.writeLegacyMirrorFromSnapshot(localSnapshot);

    expect(mirroredPayload?.scenarioShortcuts?.work).toEqual([
      expect.objectContaining({
        id: 'docs',
        kind: 'link',
        url: 'https://docs.example',
      }),
      expect.objectContaining({
        id: 'chat',
        kind: 'link',
        url: 'https://example.com/chat',
      }),
    ]);
    expect(mirroredPayload?.scenarioShortcuts?.work.some((shortcut: any) => shortcut.kind === 'folder')).toBe(false);
  });
});
