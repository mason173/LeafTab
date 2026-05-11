import { useCallback, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import type { ScenarioMode, ScenarioShortcuts, SyncablePreferences } from '@/types';
import { defaultScenarioModes } from '@/scenario/scenario';
import { importLeafTabSyncSnapshotRuntime } from '@/lazy/sync';
import type { LeafTabBookmarkTreeDraft } from '@/sync/leaftab/bookmarks';
import type { LeafTabBookmarkSyncScope } from '@/sync/leaftab/bookmarkScope';
import { LEAFTAB_SYNC_SCHEMA_VERSION, type LeafTabSyncSnapshot } from '@/sync/leaftab/schema';
import { clearLocalNeedsCloudReconcile, markLocalNeedsCloudReconcile, persistLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { applyShortcutCustomIcons, exportShortcutCustomIcons } from '@/utils/shortcutCustomIcons';
import { collectShortcutIds } from '@/utils/shortcutFolders';
import { normalizeSyncablePreferences } from '@/utils/syncablePreferences';
import { flushQueuedLocalStorageWrites } from '@/utils/storageWriteQueue';

const EMPTY_TIMESTAMP = '1970-01-01T00:00:00.000Z';

type SnapshotBuildCacheEntry = {
  signature: string;
  snapshot: LeafTabSyncSnapshot;
};

type BuildSnapshotFromCurrentStateOptions = {
  requestBookmarkPermission?: boolean;
  baselineStorageKey?: string;
  includeBookmarks?: boolean;
  preferencesTransform?: (preferences: SyncablePreferences) => SyncablePreferences;
};

type ApplySnapshotToLocalStateOptions = {
  preferredSelectedScenarioId?: string | null;
  skipBookmarkApply?: boolean;
};

const cloneLeafTabSyncSnapshot = (snapshot: LeafTabSyncSnapshot): LeafTabSyncSnapshot => {
  return JSON.parse(JSON.stringify(snapshot)) as LeafTabSyncSnapshot;
};

const createComparableSnapshotSignature = (snapshot: LeafTabSyncSnapshot | null | undefined) => {
  if (!snapshot) return null;
  return {
    preferences: snapshot.preferences,
    scenarios: snapshot.scenarios,
    shortcuts: snapshot.shortcuts,
    customShortcutIcons: snapshot.customShortcutIcons,
    bookmarkFolders: snapshot.bookmarkFolders,
    bookmarkItems: snapshot.bookmarkItems,
    scenarioOrder: snapshot.scenarioOrder,
    shortcutOrders: snapshot.shortcutOrders,
    bookmarkOrders: snapshot.bookmarkOrders,
    tombstones: snapshot.tombstones,
  };
};

const collectScenarioShortcutIds = (scenarioShortcuts: ScenarioShortcuts) => {
  return Object.values(scenarioShortcuts || {}).flatMap((shortcuts) => (
    Array.isArray(shortcuts) ? collectShortcutIds(shortcuts) : []
  ));
};

export const createSnapshotBuildSignature = (params: {
  baselineSnapshot?: LeafTabSyncSnapshot | null;
  preferences: SyncablePreferences;
  scenarioModes: ScenarioMode[];
  scenarioShortcuts: ScenarioShortcuts;
  customShortcutIcons?: Record<string, string>;
  bookmarkTree: LeafTabBookmarkTreeDraft | null | undefined;
}) => {
  return JSON.stringify({
    baseline: createComparableSnapshotSignature(params.baselineSnapshot),
    preferences: params.preferences,
    scenarioModes: params.scenarioModes,
    scenarioShortcuts: params.scenarioShortcuts,
    customShortcutIcons: params.customShortcutIcons || {},
    bookmarks: {
      folders: params.bookmarkTree?.folders || [],
      items: params.bookmarkTree?.items || [],
      orderIdsByParent: params.bookmarkTree?.orderIdsByParent || {},
    },
  });
};

export const createEmptyLeafTabSyncSnapshot = (deviceId: string): LeafTabSyncSnapshot => ({
  meta: {
    version: LEAFTAB_SYNC_SCHEMA_VERSION,
    deviceId,
    generatedAt: EMPTY_TIMESTAMP,
  },
  preferences: null,
  scenarios: {},
  shortcuts: {},
  customShortcutIcons: {},
  bookmarkFolders: {},
  bookmarkItems: {},
  scenarioOrder: {
    type: 'scenario-order',
    ids: [],
    updatedAt: EMPTY_TIMESTAMP,
    updatedBy: deviceId,
    revision: 1,
  },
  shortcutOrders: {},
  bookmarkOrders: {
    __root__: {
      type: 'bookmark-order',
      parentId: null,
      ids: [],
      updatedAt: EMPTY_TIMESTAMP,
      updatedBy: deviceId,
      revision: 1,
    },
  },
  tombstones: {},
});

type DeriveLeafTabSyncApplyStateParams = {
  projected: {
    preferences: SyncablePreferences | null;
    scenarioModes: ScenarioMode[];
    scenarioShortcuts: ScenarioShortcuts;
    bookmarkFolders: Record<string, { id: string; title: string; parentId: string | null }>;
    bookmarkItems: Record<string, { id: string; title: string; parentId: string | null; url: string }>;
    bookmarkOrders: Record<string, { ids: string[] }>;
  };
  selectedScenarioId: string;
  preferredSelectedScenarioId?: string | null;
};

export const deriveLeafTabSyncApplyState = ({
  projected,
  selectedScenarioId,
  preferredSelectedScenarioId,
}: DeriveLeafTabSyncApplyStateParams) => {
  const nextScenarioModes = projected.scenarioModes.length > 0
    ? projected.scenarioModes
    : defaultScenarioModes;
  const nextScenarioShortcuts = nextScenarioModes.reduce<ScenarioShortcuts>((acc, mode) => {
    acc[mode.id] = projected.scenarioShortcuts[mode.id] || [];
    return acc;
  }, {});
  const preferredId = preferredSelectedScenarioId || '';
  const nextSelectedScenarioId = nextScenarioModes.some((mode) => mode.id === preferredId)
    ? preferredId
    : nextScenarioModes.some((mode) => mode.id === selectedScenarioId)
      ? selectedScenarioId
      : nextScenarioModes[0]?.id || '';

  return {
    projected,
    nextPreferences: projected.preferences,
    nextScenarioModes,
    nextScenarioShortcuts,
    nextSelectedScenarioId,
    nextProfileSnapshot: {
      preferences: projected.preferences || undefined,
      scenarioModes: nextScenarioModes,
      selectedScenarioId: nextSelectedScenarioId,
      scenarioShortcuts: nextScenarioShortcuts,
    },
  };
};

type UseLeafTabSnapshotBridgeOptions = {
  leafTabBookmarkSyncScope: LeafTabBookmarkSyncScope;
  leafTabSyncDeviceId: string;
  leafTabSyncBaselineStorageKey: string;
  cloudSyncBaselineStorageKey: string;
  scenarioModes: ScenarioMode[];
  scenarioShortcuts: ScenarioShortcuts;
  selectedScenarioId: string;
  user: string | null;
  localDirtyRef: MutableRefObject<boolean>;
  buildPreferencesSnapshot: () => SyncablePreferences;
  applyPreferencesSnapshot: (preferences: SyncablePreferences | null) => Promise<void> | void;
  setScenarioModes: Dispatch<SetStateAction<ScenarioMode[]>>;
  setSelectedScenarioId: Dispatch<SetStateAction<string>>;
  setScenarioShortcuts: Dispatch<SetStateAction<ScenarioShortcuts>>;
  readBaselineSnapshot: (storageKey: string) => LeafTabSyncSnapshot | null;
};

export function useLeafTabSnapshotBridge({
  leafTabBookmarkSyncScope,
  leafTabSyncDeviceId,
  leafTabSyncBaselineStorageKey,
  cloudSyncBaselineStorageKey,
  scenarioModes,
  scenarioShortcuts,
  selectedScenarioId,
  user,
  localDirtyRef,
  buildPreferencesSnapshot,
  applyPreferencesSnapshot,
  setScenarioModes,
  setSelectedScenarioId,
  setScenarioShortcuts,
  readBaselineSnapshot,
}: UseLeafTabSnapshotBridgeOptions) {
  const snapshotBuildCacheRef = useRef<Record<string, SnapshotBuildCacheEntry>>({});

  const buildSnapshotFromCurrentState = useCallback(async (options?: BuildSnapshotFromCurrentStateOptions) => {
    const snapshotRuntime = await importLeafTabSyncSnapshotRuntime();
    flushQueuedLocalStorageWrites();
    const baselineStorageKey = options?.baselineStorageKey || leafTabSyncBaselineStorageKey;
    const baselineSnapshot = readBaselineSnapshot(
      baselineStorageKey,
    );
    const bookmarkTree = options?.includeBookmarks === false
      ? null
      : await snapshotRuntime.captureLeafTabBookmarkTreeDraft({
          scope: leafTabBookmarkSyncScope,
          requestPermission: options?.requestBookmarkPermission === true,
          throwOnPermissionDenied: true,
        });
    const basePreferences = buildPreferencesSnapshot();
    const preferences = normalizeSyncablePreferences(
      options?.preferencesTransform
        ? options.preferencesTransform(basePreferences)
        : basePreferences,
    );
    const customShortcutIcons = exportShortcutCustomIcons(collectScenarioShortcutIds(scenarioShortcuts));
    const signature = createSnapshotBuildSignature({
      baselineSnapshot,
      preferences,
      scenarioModes,
      scenarioShortcuts,
      customShortcutIcons,
      bookmarkTree,
    });
    const cached = snapshotBuildCacheRef.current[baselineStorageKey];
    if (cached && cached.signature === signature) {
      return cloneLeafTabSyncSnapshot(cached.snapshot);
    }

    const generatedAt = new Date().toISOString();
    const state = snapshotRuntime.createLeafTabSyncBuildState({
      previousSnapshot: baselineSnapshot,
      preferences,
      scenarioModes,
      scenarioShortcuts,
      bookmarkTree,
      deviceId: leafTabSyncDeviceId,
      generatedAt,
    });
    const nextSnapshot = snapshotRuntime.buildLeafTabSyncSnapshot({
      preferences,
      scenarioModes,
      scenarioShortcuts,
      customShortcutIcons,
      bookmarkTree,
      deviceId: leafTabSyncDeviceId,
      generatedAt,
      state,
    });
    snapshotBuildCacheRef.current[baselineStorageKey] = {
      signature,
      snapshot: cloneLeafTabSyncSnapshot(nextSnapshot),
    };
    return nextSnapshot;
  }, [
    leafTabBookmarkSyncScope,
    leafTabSyncBaselineStorageKey,
    leafTabSyncDeviceId,
    readBaselineSnapshot,
    buildPreferencesSnapshot,
    scenarioModes,
    scenarioShortcuts,
  ]);

  const buildLocalSnapshot = useCallback(async () => {
    return buildSnapshotFromCurrentState({
      baselineStorageKey: leafTabSyncBaselineStorageKey,
    });
  }, [buildSnapshotFromCurrentState, leafTabSyncBaselineStorageKey]);

  const buildCloudSnapshot = useCallback(async () => {
    return buildSnapshotFromCurrentState({
      baselineStorageKey: cloudSyncBaselineStorageKey,
    });
  }, [buildSnapshotFromCurrentState, cloudSyncBaselineStorageKey]);

  const applySnapshotToLocalState = useCallback(async (
    snapshot: LeafTabSyncSnapshot,
    options?: ApplySnapshotToLocalStateOptions,
  ) => {
    const snapshotRuntime = await importLeafTabSyncSnapshotRuntime();
    const projected = snapshotRuntime.projectLeafTabSyncSnapshotToAppState(snapshot);
    const {
      nextPreferences,
      nextScenarioModes,
      nextScenarioShortcuts,
      nextProfileSnapshot,
      nextSelectedScenarioId,
    } = deriveLeafTabSyncApplyState({
      projected,
      selectedScenarioId,
      preferredSelectedScenarioId: options?.preferredSelectedScenarioId,
    });
    const nextShortcutIds = collectScenarioShortcutIds(nextScenarioShortcuts);

    flushSync(() => {
      setScenarioModes(nextScenarioModes);
      setSelectedScenarioId(nextSelectedScenarioId);
      setScenarioShortcuts(nextScenarioShortcuts);
    });

    if (!options?.skipBookmarkApply) {
      const bookmarksApplied = await snapshotRuntime.replaceLeafTabBookmarkTree({
        scope: leafTabBookmarkSyncScope,
        folderLookup: Object.fromEntries(
          Object.values(projected.bookmarkFolders).map((folder) => [
            folder.id,
            {
              title: folder.title,
              parentId: folder.parentId,
            },
          ]),
        ),
        itemLookup: Object.fromEntries(
          Object.values(projected.bookmarkItems).map((item) => [
            item.id,
            {
              title: item.title,
              parentId: item.parentId,
              url: item.url,
            },
          ]),
        ),
        orderIdsByParent: Object.fromEntries(
          Object.entries(projected.bookmarkOrders).map(([key, order]) => [key, order.ids.slice()]),
        ),
        requestPermission: false,
      });
      if (!bookmarksApplied) {
        throw new snapshotRuntime.LeafTabBookmarkPermissionDeniedError();
      }
    }

    applyShortcutCustomIcons(projected.customShortcutIcons || {}, {
      replace: true,
      shortcutIds: nextShortcutIds,
    });
    flushQueuedLocalStorageWrites();

    await applyPreferencesSnapshot(nextPreferences);

    persistLocalProfileSnapshot(nextProfileSnapshot);

    if (user) {
      const payload = {
        version: 3 as const,
        ...nextProfileSnapshot,
      };
      localStorage.setItem('leaf_tab_shortcuts_cache', JSON.stringify(payload));
      localStorage.setItem('leaf_tab_sync_pending', 'true');
      clearLocalNeedsCloudReconcile();
      return;
    }

    const hasStoredCloudSession = Boolean(localStorage.getItem('token') && localStorage.getItem('username'));
    if (!hasStoredCloudSession) {
      markLocalNeedsCloudReconcile('signed_out_edit');
    }
    localDirtyRef.current = true;
  }, [
    leafTabBookmarkSyncScope,
    localDirtyRef,
    applyPreferencesSnapshot,
    selectedScenarioId,
    setScenarioModes,
    setScenarioShortcuts,
    setSelectedScenarioId,
    user,
  ]);

  const applySnapshot = useCallback(async (
    snapshot: LeafTabSyncSnapshot,
    options?: ApplySnapshotToLocalStateOptions,
  ) => {
    await applySnapshotToLocalState(snapshot, options);
  }, [applySnapshotToLocalState]);

  return {
    buildSnapshotFromCurrentState,
    buildLocalSnapshot,
    buildCloudSnapshot,
    createEmptySnapshot: useCallback(() => createEmptyLeafTabSyncSnapshot(leafTabSyncDeviceId), [leafTabSyncDeviceId]),
    applySnapshotToLocalState,
    applySnapshot,
  };
}
