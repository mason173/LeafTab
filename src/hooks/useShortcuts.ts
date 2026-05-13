import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import defaultProfile from '../assets/profiles/default-profile.json';
import { useShortcutStore } from '@/features/shortcuts/model/useShortcutStore';
import { useShortcutPersistenceSync } from '@/features/shortcuts/model/useShortcutPersistenceSync';
import { useShortcutUiState } from '@/features/shortcuts/model/useShortcutUiState';
import { useShortcutDomainReporting } from './useShortcutDomainReporting';
import { useShortcutActions } from './useShortcutActions';
import { normalizeScenarioModesList as normalizeScenarioModesListRaw, normalizeScenarioShortcuts as normalizeScenarioShortcutsRaw } from '@/utils/shortcutsPayload';

export function useShortcuts(
  user: string | null,
  openInNewTab: boolean,
  API_URL: string,
  handleLogout: (input?: string | { message?: string; clearLocal?: boolean }) => void,
  options?: {
    onShortcutCreated?: Parameters<typeof useShortcutActions>[0]['onShortcutCreated'];
  },
) {
  const { t, i18n } = useTranslation();

  const normalizeScenarioModesList = useCallback((raw: unknown) => {
    return normalizeScenarioModesListRaw(raw, t('scenario.unnamed'));
  }, [t]);

  const normalizeScenarioShortcuts = useCallback((raw: unknown) => {
    return normalizeScenarioShortcutsRaw(raw);
  }, []);

  const localDirtyRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const userRef = useRef(user);

  const markScenarioShortcutsDirty = useCallback(() => {
    if (!userRef.current) localDirtyRef.current = true;
  }, []);

  const {
    scenarioModes,
    setScenarioModes,
    selectedScenarioId,
    setSelectedScenarioId,
    scenarioShortcuts,
    setScenarioShortcuts,
    shortcuts,
    totalShortcuts,
    scenarioModesRef,
    selectedScenarioIdRef,
    scenarioShortcutsRef,
    updateScenarioShortcuts,
  } = useShortcutStore({
    normalizeScenarioModesList,
    normalizeScenarioShortcuts,
    defaultScenarioShortcuts: defaultProfile?.data?.scenarioShortcuts,
    onScenarioShortcutsDirty: markScenarioShortcutsDirty,
  });

  const {
    cloudSyncInitialized,
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
  } = useShortcutPersistenceSync({
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
    language: i18n.language,
    defaultProfileData: defaultProfile?.data,
  });

  const {
    contextMenu,
    setContextMenu,
    contextMenuRef,
    shortcutEditOpen,
    setShortcutEditOpen,
    shortcutModalMode,
    setShortcutModalMode,
    shortcutDeleteOpen,
    setShortcutDeleteOpen,
    scenarioModeOpen,
    setScenarioModeOpen,
    scenarioCreateOpen,
    setScenarioCreateOpen,
    scenarioEditOpen,
    setScenarioEditOpen,
    selectedShortcut,
    setSelectedShortcut,
    editingTitle,
    setEditingTitle,
    editingUrl,
    setEditingUrl,
    currentEditScenarioId,
    setCurrentEditScenarioId,
    currentInsertIndex,
    setCurrentInsertIndex,
  } = useShortcutUiState();

  const { reportDomain } = useShortcutDomainReporting({
    user,
    API_URL,
    cloudSyncInitialized,
    scenarioShortcuts,
  });

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const {
    handleCreateScenarioMode,
    handleOpenEditScenarioMode,
    handleUpdateScenarioMode,
    handleDeleteScenarioMode,
    handleShortcutOpen,
    handleShortcutContextMenu,
    handleGridContextMenu,
    handleShortcutReorder,
    handleSaveShortcutEdit,
    handleConfirmDeleteShortcut,
    handleConfirmDeleteShortcuts,
  } = useShortcutActions({
    user,
    openInNewTab,
    translate: t,
    reportDomain,
    onShortcutCreated: options?.onShortcutCreated,
    shortcutModalMode,
    currentInsertIndex,
    currentEditScenarioId,
    selectedShortcut,
    updateScenarioShortcuts,
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
    cloudSyncState,
    userRole, setUserRole,
    totalShortcuts,
    conflictModalOpen, setConflictModalOpen,
    pendingLocalPayload, setPendingLocalPayload,
    pendingCloudPayload, setPendingCloudPayload,
    cloudConflictPending,
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
    localDirtyRef,
    handleCreateScenarioMode, handleOpenEditScenarioMode, handleUpdateScenarioMode, handleDeleteScenarioMode,
    handleShortcutOpen, handleShortcutContextMenu, handleGridContextMenu,
    handleSaveShortcutEdit, handleConfirmDeleteShortcut, handleConfirmDeleteShortcuts, handleShortcutReorder, contextMenuRef,
    resolveWithCloud, resolveWithLocal, resolveWithMerge,
    applyUndoPayload,
    resetLocalShortcutsByRole,
    scenarioModeOpen, setScenarioModeOpen,
    scenarioCreateOpen, setScenarioCreateOpen,
    scenarioEditOpen, setScenarioEditOpen
  };
}
