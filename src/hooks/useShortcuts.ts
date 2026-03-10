import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScenarioShortcuts, Shortcut, ScenarioMode, ContextMenuState } from '../types';
import { defaultScenarioModes, SCENARIO_MODES_KEY, SCENARIO_SELECTED_KEY } from "@/scenario/scenario";
import defaultProfile from '../assets/profiles/default-profile.json';
import { clampShortcutsRowsPerColumn } from '@/utils/backupData';
import { clearLocalNeedsCloudReconcile, markLocalNeedsCloudReconcile, persistLocalProfileSnapshot, readLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { useCloudSync } from './useCloudSync';
import { useShortcutDomainReporting } from './useShortcutDomainReporting';
import { useShortcutActions } from './useShortcutActions';
import { normalizeScenarioModesList as normalizeScenarioModesListRaw, normalizeScenarioShortcuts as normalizeScenarioShortcutsRaw } from '@/utils/shortcutsPayload';
import { loadRoleProfileDataForReset } from '@/utils/roleProfile';

const LEGACY_SHORTCUTS_KEY = 'local_shortcuts';

export function useShortcuts(
  user: string | null,
  openInNewTab: boolean,
  API_URL: string,
  handleLogout: (input?: string | { message?: string; clearLocal?: boolean }) => void,
  shortcutsRowsPerColumn: number
) {
  const { t, i18n } = useTranslation();

  const normalizeScenarioModesList = useCallback((raw: unknown) => {
    return normalizeScenarioModesListRaw(raw, t('scenario.unnamed'));
  }, [t]);

  const normalizeScenarioShortcuts = useCallback((raw: unknown) => {
    return normalizeScenarioShortcutsRaw(raw);
  }, []);

  const initialLocalProfile = readLocalProfileSnapshot();

  const [scenarioModes, setScenarioModes] = useState<ScenarioMode[]>(() => {
    if (initialLocalProfile?.scenarioModes?.length) {
      return normalizeScenarioModesList(initialLocalProfile.scenarioModes);
    }
    return defaultScenarioModes;
  });

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(() => {
    if (initialLocalProfile?.selectedScenarioId) return initialLocalProfile.selectedScenarioId;
    const cached = localStorage.getItem(SCENARIO_SELECTED_KEY);
    return cached || defaultScenarioModes[0].id;
  });

  const [scenarioShortcuts, setScenarioShortcuts] = useState<ScenarioShortcuts>(() => {
    if (initialLocalProfile?.scenarioShortcuts) {
      const normalized = normalizeScenarioShortcuts(initialLocalProfile.scenarioShortcuts);
      if (Object.keys(normalized).length) return normalized;
    }
    const initial = normalizeScenarioShortcuts(defaultProfile?.data?.scenarioShortcuts);
    if (Object.keys(initial).length) return initial;
    return { [defaultScenarioModes[0].id]: [] };
  });

  const [userRole, setUserRole] = useState<string | null>(null);
  const localDirtyRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const scenarioModesRef = useRef(scenarioModes);
  const selectedScenarioIdRef = useRef(selectedScenarioId);
  const scenarioShortcutsRef = useRef(scenarioShortcuts);
  const userRef = useRef(user);

  const {
    cloudSyncInitialized,
    setCloudSyncInitialized,
    conflictModalOpen,
    setConflictModalOpen,
    pendingLocalPayload,
    setPendingLocalPayload,
    pendingCloudPayload,
    setPendingCloudPayload,
    syncState: cloudSyncState,
    lastSavedShortcutsJson,
    resolveWithCloud,
    resolveWithLocal,
    resolveWithMerge,
    applyUndoPayload,
    triggerCloudSyncNow,
  } = useCloudSync({
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

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [shortcutEditOpen, setShortcutEditOpen] = useState(false);
  const [shortcutModalMode, setShortcutModalMode] = useState<'add' | 'edit'>('add');
  const [shortcutDeleteOpen, setShortcutDeleteOpen] = useState(false);
  const [scenarioModeOpen, setScenarioModeOpen] = useState(false);
  const [scenarioCreateOpen, setScenarioCreateOpen] = useState(false);
  const [scenarioEditOpen, setScenarioEditOpen] = useState(false);
  const [selectedShortcut, setSelectedShortcut] = useState<{ index: number; shortcut: Shortcut } | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingUrl, setEditingUrl] = useState('');
  const [currentEditScenarioId, setCurrentEditScenarioId] = useState<string>('');
  const [currentInsertIndex, setCurrentInsertIndex] = useState<number | null>(null);

  const { reportDomain } = useShortcutDomainReporting({
    user,
    API_URL,
    cloudSyncInitialized,
    scenarioShortcuts,
  });

  const shortcuts = scenarioShortcuts[selectedScenarioId] ?? [];
  const maxShortcutsPerColumn = useMemo(() => clampShortcutsRowsPerColumn(shortcutsRowsPerColumn), [shortcutsRowsPerColumn]);
  const shortcutsPageCapacity = maxShortcutsPerColumn * 3;

  const totalShortcuts = useMemo(() => {
    let count = 0;
    Object.values(scenarioShortcuts).forEach((list) => {
      if (Array.isArray(list)) count += list.length;
    });
    return count;
  }, [scenarioShortcuts]);

  const getMaxPageIndex = useCallback((length: number) => {
    if (length <= 0) return 0;
    return Math.max(0, Math.ceil(length / shortcutsPageCapacity) - 1);
  }, [shortcutsPageCapacity]);

  const updateScenarioShortcuts = useCallback((updater: (prev: Shortcut[]) => Shortcut[]) => {
    const currentScenarioId = selectedScenarioIdRef.current;
    const currentShortcutsMap = scenarioShortcutsRef.current;
    const current = currentShortcutsMap[currentScenarioId] ?? [];
    const nextCurrent = updater(current);
    if (nextCurrent === current) return;

    const nextShortcutsMap = { ...currentShortcutsMap, [currentScenarioId]: nextCurrent };
    scenarioShortcutsRef.current = nextShortcutsMap;

    try {
      const snapshot = {
        scenarioModes: scenarioModesRef.current,
        selectedScenarioId: currentScenarioId,
        scenarioShortcuts: nextShortcutsMap,
      };
      persistLocalProfileSnapshot(snapshot);
      if (userRef.current) {
        const payload = {
          version: 3 as const,
          scenarioModes: snapshot.scenarioModes,
          selectedScenarioId: snapshot.selectedScenarioId,
          scenarioShortcuts: snapshot.scenarioShortcuts,
        };
        localStorage.setItem('leaf_tab_shortcuts_cache', JSON.stringify(payload));
        localStorage.setItem('leaf_tab_sync_pending', 'true');
        clearLocalNeedsCloudReconcile();
      } else {
        const hasStoredCloudSession = Boolean(localStorage.getItem('token') && localStorage.getItem('username'));
        if (!hasStoredCloudSession) {
          markLocalNeedsCloudReconcile('signed_out_edit');
        }
      }
    } catch {}

    if (!userRef.current) localDirtyRef.current = true;
    setScenarioShortcuts(nextShortcutsMap);
  }, []);

  useEffect(() => {
    scenarioModesRef.current = scenarioModes;
  }, [scenarioModes]);

  useEffect(() => {
    selectedScenarioIdRef.current = selectedScenarioId;
  }, [selectedScenarioId]);

  useEffect(() => {
    scenarioShortcutsRef.current = scenarioShortcuts;
  }, [scenarioShortcuts]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const findInsertIndex = useCallback((startPageIndex: number) => {
    const current = scenarioShortcuts[selectedScenarioId] ?? [];
    const maxPage = getMaxPageIndex(current.length);
    for (let page = startPageIndex; page <= maxPage; page += 1) {
      const start = page * shortcutsPageCapacity;
      const end = Math.min(start + shortcutsPageCapacity, current.length);
      if (end - start < shortcutsPageCapacity) {
        return { targetIndex: end, targetPage: page };
      }
    }
    const targetPage = maxPage + 1;
    return { targetIndex: current.length, targetPage };
  }, [scenarioShortcuts, selectedScenarioId, getMaxPageIndex, shortcutsPageCapacity]);

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
  }, [scenarioModes, selectedScenarioId, scenarioShortcuts, user, lastSavedShortcutsJson]);

  useEffect(() => {
    try { localStorage.removeItem(LEGACY_SHORTCUTS_KEY); } catch {}
  }, []);

  const hasLoadedLocalShortcutsRef = useRef(false);
  useEffect(() => {
    if (user) {
      hasLoadedLocalShortcutsRef.current = false;
      return;
    }
    if (hasLoadedLocalShortcutsRef.current) return;
    const localProfile = readLocalProfileSnapshot();
    if (localProfile) {
      setScenarioModes(normalizeScenarioModesList(localProfile.scenarioModes));
      setSelectedScenarioId(localProfile.selectedScenarioId);
      setScenarioShortcuts(normalizeScenarioShortcuts(localProfile.scenarioShortcuts));
    }
    hasLoadedLocalShortcutsRef.current = true;
  }, [user, normalizeScenarioModesList, normalizeScenarioShortcuts]);

  useEffect(() => {
    setScenarioShortcuts((prev) => {
      if (prev[selectedScenarioId]) return prev;
      return { ...prev, [selectedScenarioId]: [] };
    });
  }, [selectedScenarioId]);

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
    if (snapshot.selectedScenarioId) setSelectedScenarioId(snapshot.selectedScenarioId);
    setScenarioShortcuts(snapshot.scenarioShortcuts);
    persistLocalProfileSnapshot(snapshot);
    localStorage.removeItem('leaf_tab_shortcuts_cache');
    localStorage.removeItem('leaf_tab_sync_pending');
    localStorage.removeItem('cloud_shortcuts_fetched_at');
    localDirtyRef.current = true;
    if (roleId) setUserRole(roleId);
  }, [normalizeScenarioModesList, normalizeScenarioShortcuts, setScenarioModes, setSelectedScenarioId, setScenarioShortcuts, localDirtyRef, setUserRole]);

  const resetLocalShortcutsByRole = useCallback(async (roleId?: string | null) => {
    const { profileData, role } = await loadRoleProfileDataForReset({
      roleId,
      language: i18n.language,
      defaultProfileData: defaultProfile?.data,
    });
    applyRoleProfileData(profileData, role || undefined);
  }, [applyRoleProfileData, i18n.language]);

  const {
    handleCreateScenarioMode,
    handleOpenEditScenarioMode,
    handleUpdateScenarioMode,
    handleDeleteScenarioMode,
    handleShortcutOpen,
    handleShortcutContextMenu,
    handlePageContextMenu,
    handlePageReorder,
    moveShortcutToPage,
    handleSaveShortcutEdit,
    handleConfirmDeleteShortcut,
    findOrCreateAvailableIndex,
    handleDeletePage,
  } = useShortcutActions({
    user,
    openInNewTab,
    translate: t,
    reportDomain,
    shortcutModalMode,
    currentInsertIndex,
    currentEditScenarioId,
    selectedShortcut,
    shortcutsPageCapacity,
    updateScenarioShortcuts,
    getMaxPageIndex,
    findInsertIndex,
    localDirtyRef,
    setScenarioModes,
    setScenarioShortcuts,
    setSelectedScenarioId,
    setScenarioEditOpen,
    setCurrentEditScenarioId,
    setContextMenu,
    setShortcutEditOpen,
    setSelectedShortcut,
    setCurrentInsertIndex,
    setShortcutDeleteOpen,
  });

  return {
    scenarioModes, setScenarioModes,
    selectedScenarioId, setSelectedScenarioId,
    scenarioShortcuts, setScenarioShortcuts,
    cloudSyncInitialized, setCloudSyncInitialized,
    userRole, setUserRole,
    totalShortcuts,
    conflictModalOpen, setConflictModalOpen,
    pendingLocalPayload, setPendingLocalPayload,
    pendingCloudPayload, setPendingCloudPayload,
    cloudSyncState,
    triggerCloudSyncNow,
    contextMenu, setContextMenu,
    shortcutEditOpen, setShortcutEditOpen,
    shortcutModalMode, setShortcutModalMode,
    shortcutDeleteOpen, setShortcutDeleteOpen,
    selectedShortcut, setSelectedShortcut,
    editingTitle, setEditingTitle,
    editingUrl, setEditingUrl,
    isDragging, setIsDragging,
    currentEditScenarioId, setCurrentEditScenarioId,
    currentInsertIndex, setCurrentInsertIndex,
    shortcuts,
    localDirtyRef, lastSavedShortcutsJson,
    handleCreateScenarioMode, handleOpenEditScenarioMode, handleUpdateScenarioMode, handleDeleteScenarioMode,
    handleShortcutOpen, handleShortcutContextMenu, handlePageContextMenu,
    handleSaveShortcutEdit, handleConfirmDeleteShortcut, handlePageReorder,
    moveShortcutToPage,
    findOrCreateAvailableIndex, handleDeletePage, getMaxPageIndex, contextMenuRef,
    resolveWithCloud, resolveWithLocal, resolveWithMerge,
    applyUndoPayload,
    resetLocalShortcutsByRole,
    scenarioModeOpen, setScenarioModeOpen,
    scenarioCreateOpen, setScenarioCreateOpen,
    scenarioEditOpen, setScenarioEditOpen
  };
}
