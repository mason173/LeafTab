import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { defaultScenarioModes, SCENARIO_MODES_KEY, SCENARIO_SELECTED_KEY } from '@/scenario/scenario';
import type { ScenarioMode, ScenarioShortcuts } from '@/types';
import {
  clearLocalNeedsCloudReconcile,
  LOCAL_PROFILE_SNAPSHOT_KEY,
  LOCAL_SHORTCUTS_KEY,
  markLocalNeedsCloudReconcile,
  persistLocalProfileSnapshot,
  readLocalProfileSnapshot,
} from '@/utils/localProfileStorage';
import { LOCAL_PROFILE_UPDATED_MESSAGE_TYPE } from '@/utils/localProfileSync';
import { loadRoleProfileDataForReset } from '@/utils/roleProfile';
import { useCloudSync } from '@/hooks/useCloudSync';
import type {
  NormalizeScenarioModesList,
  NormalizeScenarioShortcuts,
  ShortcutStoreRefs,
  ShortcutStoreSetters,
} from './types';

const LEGACY_SHORTCUTS_KEY = 'local_shortcuts';

type UseShortcutPersistenceSyncParams = {
  user: string | null;
  API_URL: string;
  handleLogout: (input?: string | { message?: string; clearLocal?: boolean }) => void;
  isDragging: boolean;
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
  normalizeScenarioModesList: NormalizeScenarioModesList;
  normalizeScenarioShortcuts: NormalizeScenarioShortcuts;
  localDirtyRef: MutableRefObject<boolean>;
  language: string;
  defaultProfileData?: unknown;
} & ShortcutStoreRefs & ShortcutStoreSetters;

export function useShortcutPersistenceSync({
  user,
  API_URL,
  handleLogout,
  isDragging,
  scenarioModes,
  selectedScenarioId,
  scenarioShortcuts,
  setScenarioModes,
  setSelectedScenarioId,
  setScenarioShortcuts,
  scenarioModesRef,
  selectedScenarioIdRef,
  scenarioShortcutsRef,
  normalizeScenarioModesList,
  normalizeScenarioShortcuts,
  localDirtyRef,
  language,
  defaultProfileData,
}: UseShortcutPersistenceSyncParams) {
  const cloudSyncInitializedForUi = Boolean(user);
  const [userRole, setUserRole] = useState<string | null>(null);

  const {
    setCloudSyncInitialized,
    syncState: cloudSyncState,
    conflictModalOpen,
    setConflictModalOpen,
    pendingLocalPayload,
    setPendingLocalPayload,
    pendingCloudPayload,
    setPendingCloudPayload,
    cloudConflictPending,
    lastSavedShortcutsJson,
    resolveWithCloud,
    resolveWithLocal,
    resolveWithMerge,
    applyUndoPayload,
    triggerCloudSyncNow,
  } = useCloudSync({
    runtimeEnabled: false,
    user,
    API_URL,
    handleLogout,
    isDragging,
    scenarioModes,
    selectedScenarioId,
    scenarioShortcuts,
    setScenarioModes,
    setSelectedScenarioId,
    setScenarioShortcuts,
    setUserRole,
    normalizeScenarioModesList,
    normalizeScenarioShortcuts,
    localDirtyRef,
  });

  useEffect(() => {
    localStorage.setItem(SCENARIO_MODES_KEY, JSON.stringify(scenarioModes));
  }, [scenarioModes]);

  useEffect(() => {
    try {
      const snapshot = {
        scenarioModes,
        selectedScenarioId,
        scenarioShortcuts,
      };
      persistLocalProfileSnapshot(snapshot);
      if (user) {
        const payload = {
          version: 3 as const,
          scenarioModes: snapshot.scenarioModes,
          selectedScenarioId: snapshot.selectedScenarioId,
          scenarioShortcuts: snapshot.scenarioShortcuts,
        };
        const json = JSON.stringify(payload);
        clearLocalNeedsCloudReconcile();
        localStorage.setItem('leaf_tab_shortcuts_cache', json);
        if (json !== lastSavedShortcutsJson.current) {
          localStorage.setItem('leaf_tab_sync_pending', 'true');
        }
      } else {
        const hasStoredCloudSession = Boolean(localStorage.getItem('token') && localStorage.getItem('username'));
        if (!hasStoredCloudSession) {
          markLocalNeedsCloudReconcile('signed_out_edit');
        }
      }
    } catch {}
  }, [lastSavedShortcutsJson, scenarioModes, scenarioShortcuts, selectedScenarioId, user]);

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_SHORTCUTS_KEY);
    } catch {}
  }, []);

  const hasLoadedLocalShortcutsRef = useRef(false);
  useEffect(() => {
    if (user) {
      hasLoadedLocalShortcutsRef.current = false;
      return;
    }
    if (hasLoadedLocalShortcutsRef.current) {
      return;
    }

    const localProfile = readLocalProfileSnapshot();
    if (localProfile) {
      setScenarioModes(normalizeScenarioModesList(localProfile.scenarioModes));
      setSelectedScenarioId(localProfile.selectedScenarioId);
      setScenarioShortcuts(normalizeScenarioShortcuts(localProfile.scenarioShortcuts));
    }
    hasLoadedLocalShortcutsRef.current = true;
  }, [
    normalizeScenarioModesList,
    normalizeScenarioShortcuts,
    setScenarioModes,
    setScenarioShortcuts,
    setSelectedScenarioId,
    user,
  ]);

  const syncFromLocalProfile = useCallback(() => {
    const localProfile = readLocalProfileSnapshot();
    if (!localProfile) return;

    const nextScenarioModes = normalizeScenarioModesList(localProfile.scenarioModes);
    const nextSelectedScenarioId = nextScenarioModes.some((mode) => mode.id === localProfile.selectedScenarioId)
      ? localProfile.selectedScenarioId
      : nextScenarioModes[0]?.id || defaultScenarioModes[0].id;
    const nextScenarioShortcuts = normalizeScenarioShortcuts(localProfile.scenarioShortcuts);
    const currentSignature = JSON.stringify({
      scenarioModes: scenarioModesRef.current,
      selectedScenarioId: selectedScenarioIdRef.current,
      scenarioShortcuts: scenarioShortcutsRef.current,
    });
    const nextSignature = JSON.stringify({
      scenarioModes: nextScenarioModes,
      selectedScenarioId: nextSelectedScenarioId,
      scenarioShortcuts: nextScenarioShortcuts,
    });

    if (nextSignature === currentSignature) return;

    scenarioModesRef.current = nextScenarioModes;
    selectedScenarioIdRef.current = nextSelectedScenarioId;
    scenarioShortcutsRef.current = nextScenarioShortcuts;

    setScenarioModes(nextScenarioModes);
    setSelectedScenarioId(nextSelectedScenarioId);
    setScenarioShortcuts(nextScenarioShortcuts);
  }, [
    normalizeScenarioModesList,
    normalizeScenarioShortcuts,
    scenarioModesRef,
    scenarioShortcutsRef,
    selectedScenarioIdRef,
    setScenarioModes,
    setScenarioShortcuts,
    setSelectedScenarioId,
  ]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key
        && event.key !== 'local_shortcuts_updated_at'
        && event.key !== LOCAL_PROFILE_SNAPSHOT_KEY
        && event.key !== LOCAL_SHORTCUTS_KEY
        && event.key !== SCENARIO_MODES_KEY
        && event.key !== SCENARIO_SELECTED_KEY
      ) {
        return;
      }
      syncFromLocalProfile();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromLocalProfile();
      }
    };

    const handleRuntimeMessage = (message: unknown) => {
      if ((message as { type?: unknown })?.type === LOCAL_PROFILE_UPDATED_MESSAGE_TYPE) {
        syncFromLocalProfile();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', syncFromLocalProfile);
    window.addEventListener(LOCAL_PROFILE_UPDATED_MESSAGE_TYPE, syncFromLocalProfile);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (typeof chrome !== 'undefined') {
      chrome.runtime?.onMessage?.addListener?.(handleRuntimeMessage);
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', syncFromLocalProfile);
      window.removeEventListener(LOCAL_PROFILE_UPDATED_MESSAGE_TYPE, syncFromLocalProfile);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (typeof chrome !== 'undefined') {
        chrome.runtime?.onMessage?.removeListener?.(handleRuntimeMessage);
      }
    };
  }, [syncFromLocalProfile]);

  const applyRoleProfileData = useCallback((profileData: any, roleId?: string | null) => {
    const normalizedModes = normalizeScenarioModesList(profileData?.scenarioModes);
    const nextSelectedId = typeof profileData?.selectedScenarioId === 'string'
      ? profileData.selectedScenarioId
      : normalizedModes[0]?.id;
    const nextShortcuts = normalizeScenarioShortcuts(profileData?.scenarioShortcuts);
    const snapshot = {
      scenarioModes: normalizedModes,
      selectedScenarioId: nextSelectedId || normalizedModes[0]?.id || defaultScenarioModes[0].id,
      scenarioShortcuts: nextShortcuts,
    };
    setScenarioModes(snapshot.scenarioModes);
    if (snapshot.selectedScenarioId) {
      setSelectedScenarioId(snapshot.selectedScenarioId);
    }
    setScenarioShortcuts(snapshot.scenarioShortcuts);
    persistLocalProfileSnapshot(snapshot);
    localStorage.removeItem('leaf_tab_shortcuts_cache');
    localStorage.removeItem('leaf_tab_sync_pending');
    localStorage.removeItem('cloud_shortcuts_fetched_at');
    localDirtyRef.current = true;
    if (roleId) {
      setUserRole(roleId);
    }
  }, [
    localDirtyRef,
    normalizeScenarioModesList,
    normalizeScenarioShortcuts,
    setScenarioModes,
    setScenarioShortcuts,
    setSelectedScenarioId,
  ]);

  const resetLocalShortcutsByRole = useCallback(async (roleId?: string | null) => {
    const { profileData, role } = await loadRoleProfileDataForReset({
      roleId,
      language,
      defaultProfileData,
    });
    applyRoleProfileData(profileData, role || undefined);
  }, [applyRoleProfileData, defaultProfileData, language]);

  return {
    cloudSyncInitialized: cloudSyncInitializedForUi,
    setCloudSyncInitialized,
    cloudSyncState,
    userRole,
    setUserRole,
    conflictModalOpen,
    setConflictModalOpen,
    pendingLocalPayload,
    setPendingLocalPayload,
    pendingCloudPayload,
    setPendingCloudPayload,
    cloudConflictPending,
    resolveWithCloud,
    resolveWithLocal,
    resolveWithMerge,
    applyUndoPayload,
    triggerCloudSyncNow,
    resetLocalShortcutsByRole,
  };
}
