import { describe, expect, it } from 'vitest';
import { LeafTabSyncMemoryBaselineStore } from './baseline';
import { LEAFTAB_SYNC_SCHEMA_VERSION, type LeafTabSyncSnapshot } from './schema';
import { LeafTabLegacyWebdavCompat } from './legacyWebdavMigration';

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

describe('LeafTabLegacyWebdavCompat', () => {
  it('migrates a legacy single-file payload into the new WebDAV engine snapshot', async () => {
    const baselineStore = new LeafTabSyncMemoryBaselineStore();
    const localSnapshot = createEmptySnapshot('local-device', '2026-03-22T10:00:00.000Z');
    localSnapshot.bookmarkFolders.bookmarks_bar = {
      id: 'bookmarks_bar',
      type: 'bookmark-folder',
      parentId: null,
      title: 'Bookmarks Bar',
      createdAt: '2026-03-22T09:00:00.000Z',
      updatedAt: '2026-03-22T09:00:00.000Z',
      updatedBy: 'local-device',
      revision: 1,
    };
    localSnapshot.bookmarkOrders.__root__.ids = ['bookmarks_bar'];

    let appliedSnapshot: LeafTabSyncSnapshot | null = null;
    let mirroredLegacyPayload: unknown = null;
    let writtenSnapshot: LeafTabSyncSnapshot | null = null;

    const compat = new LeafTabLegacyWebdavCompat({
      deviceId: 'new-device',
      rootPath: 'leaftab/v1',
      legacyFilePath: 'leaftab_sync.leaftab',
      bridgeEnabled: true,
      baselineStore,
      webdavStore: {
        async readState() {
          return { head: null, commit: null, snapshot: null };
        },
        async readJsonFile() {
          return {
            type: 'leaftab_backup',
            version: 4,
            data: {
              scenarioModes: [
                { id: 'work', name: 'Work', color: '#16a34a', icon: 'briefcase' },
              ],
              selectedScenarioId: 'work',
              scenarioShortcuts: {
                work: [
                  { id: 'gh', title: 'GitHub', url: 'https://github.com', icon: 'github' },
                ],
              },
            },
          };
        },
        async writeState({ snapshot }: { snapshot: LeafTabSyncSnapshot }) {
          writtenSnapshot = snapshot;
          return {
            head: {
              version: LEAFTAB_SYNC_SCHEMA_VERSION,
              commitId: 'commit-1',
              updatedAt: snapshot.meta.generatedAt,
            },
            commit: {
              id: 'commit-1',
              version: LEAFTAB_SYNC_SCHEMA_VERSION,
              deviceId: 'new-device',
              createdAt: snapshot.meta.generatedAt,
              parentCommitId: null,
              manifestPath: 'leaftab/v1/manifest.json',
            },
          };
        },
        async writeJsonFile(_relativePath: string, payload: unknown) {
          mirroredLegacyPayload = payload;
        },
        async acquireLock() {},
        async releaseLock() {},
      } as any,
      buildLocalSnapshot: async () => localSnapshot,
      applyLocalSnapshot: async (snapshot) => {
        appliedSnapshot = snapshot;
      },
    });

    const result = await compat.ensureMigrated();
    const baseline = await baselineStore.load();
    const written = writtenSnapshot as unknown as LeafTabSyncSnapshot;
    const applied = appliedSnapshot as unknown as LeafTabSyncSnapshot;

    expect(result.migrated).toBe(true);
    expect(result.legacyPayloadFound).toBe(true);
    expect(written.shortcuts.gh?.title).toBe('GitHub');
    expect(written.bookmarkFolders.bookmarks_bar?.title).toBe('Bookmarks Bar');
    expect(applied.shortcuts.gh?.url).toBe('https://github.com');
    expect(baseline?.commitId).toBe('commit-1');
    expect((mirroredLegacyPayload as { type?: string } | null)?.type).toBe('leaftab_backup');
  });
});
