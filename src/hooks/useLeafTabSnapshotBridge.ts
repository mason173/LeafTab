import { useCallback, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import type { ScenarioMode, ScenarioShortcuts } from '@/types';
import { defaultScenarioModes } from '@/scenario/scenario';
import {
  buildLeafTabSyncSnapshot,
  captureLeafTabBookmarkTreeDraft,
  createLeafTabSyncBuildState,
  LEAFTAB_SYNC_SCHEMA_VERSION,
  projectLeafTabSyncSnapshotToAppState,
  replaceLeafTabBookmarkTree,
  type LeafTabBookmarkSyncScope,
  type LeafTabSyncSnapshot,
} from '@/sync/leaftab';
import { clearLocalNeedsCloudReconcile, markLocalNeedsCloudReconcile, persistLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { flushQueuedLocalStorageWrites } from '@/utils/storageWriteQueue';

const EMPTY_TIMESTAMP = '1970-01-01T00:00:00.000Z';

type SnapshotBuildCacheEntry = {
  signature: string;
  snapshot: LeafTabSyncSnapshot;
};

const cloneLeafTabSyncSnapshot = (snapshot: LeafTabSyncSnapshot): LeafTabSyncSnapshot => {
  return JSON.parse(JSON.stringify(snapshot)) as LeafTabSyncSnapshot;
};

const createComparableSnapshotSignature = (snapshot: LeafTabSyncSnapshot | null | undefined) => {
  if (!snapshot) return null;
  return {
    scenarios: snapshot.scenarios,
    shortcuts: snapshot.shortcuts,
    bookmarkFolders: snapshot.bookmarkFolders,
    bookmarkItems: snapshot.bookmarkItems,
    scenarioOrder: snapshot.scenarioOrder,
    shortcutOrders: snapshot.shortcutOrders,
    bookmarkOrders: snapshot.bookmarkOrders,
    tombstones: snapshot.tombstones,
  };
};

export const createSnapshotBuildSignature = (params: {
  baselineSnapshot?: LeafTabSyncSnapshot | null;
  scenarioModes: ScenarioMode[];
  scenarioShortcuts: ScenarioShortcuts;
  bookmarkTree: Awaited<ReturnType<typeof captureLeafTabBookmarkTreeDraft>> | null | undefined;
}) => {
  return JSON.stringify({
    baseline: createComparableSnapshotSignature(params.baselineSnapshot),
    scenarioModes: params.scenarioModes,
    scenarioShortcuts: params.scenarioShortcuts,
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
  scenarios: {},
  shortcuts: {},
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
  snapshot: LeafTabSyncSnapshot;
  selectedScenarioId: string;
  preferredSelectedScenarioId?: string | null;
};

export const deriveLeafTabSyncApplyState = ({
  snapshot,
  selectedScenarioId,
  preferredSelectedScenarioId,
}: DeriveLeafTabSyncApplyStateParams) => {
  const projected = projectLeafTabSyncSnapshotToAppState(snapshot);
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
    nextScenarioModes,
    nextScenarioShortcuts,
    nextSelectedScenarioId,
    nextProfileSnapshot: {
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
  setScenarioModes,
  setSelectedScenarioId,
  setScenarioShortcuts,
  readBaselineSnapshot,
}: UseLeafTabSnapshotBridgeOptions) {
  const snapshotBuildCacheRef = useRef<Record<string, SnapshotBuildCacheEntry>>({});

  const buildSnapshotFromCurrentState = useCallback(async (options?: {
    requestBookmarkPermission?: boolean;
    baselineStorageKey?: string;
  }) => {
    flushQueuedLocalStorageWrites();
    const baselineStorageKey = options?.baselineStorageKey || leafTabSyncBaselineStorageKey;
    const baselineSnapshot = readBaselineSnapshot(
      baselineStorageKey,
    );
    const bookmarkTree = await captureLeafTabBookmarkTreeDraft({
      scope: leafTabBookmarkSyncScope,
      requestPermission: options?.requestBookmarkPermission === true,
    });
    const signature = createSnapshotBuildSignature({
      baselineSnapshot,
      scenarioModes,
      scenarioShortcuts,
      bookmarkTree,
    });
    const cached = snapshotBuildCacheRef.current[baselineStorageKey];
    if (cached && cached.signature === signature) {
      return cloneLeafTabSyncSnapshot(cached.snapshot);
    }

    const generatedAt = new Date().toISOString();
    const state = createLeafTabSyncBuildState({
      previousSnapshot: baselineSnapshot,
      scenarioModes,
      scenarioShortcuts,
      bookmarkTree,
      deviceId: leafTabSyncDeviceId,
      generatedAt,
    });
    const nextSnapshot = buildLeafTabSyncSnapshot({
      scenarioModes,
      scenarioShortcuts,
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
    options?: {
      preferredSelectedScenarioId?: string | null;
    },
  ) => {
    const {
      projected,
      nextScenarioModes,
      nextScenarioShortcuts,
      nextProfileSnapshot,
      nextSelectedScenarioId,
    } = deriveLeafTabSyncApplyState({
      snapshot,
      selectedScenarioId,
      preferredSelectedScenarioId: options?.preferredSelectedScenarioId,
    });

    flushSync(() => {
      setScenarioModes(nextScenarioModes);
      setSelectedScenarioId(nextSelectedScenarioId);
      setScenarioShortcuts(nextScenarioShortcuts);
    });

    await replaceLeafTabBookmarkTree({
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
    selectedScenarioId,
    setScenarioModes,
    setScenarioShortcuts,
    setSelectedScenarioId,
    user,
  ]);

  const applySnapshot = useCallback(async (snapshot: LeafTabSyncSnapshot) => {
    await applySnapshotToLocalState(snapshot);
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
