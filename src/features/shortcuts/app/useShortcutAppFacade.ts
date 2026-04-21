import { useShortcuts } from '@/hooks/useShortcuts';

type UseShortcutsResult = ReturnType<typeof useShortcuts>;

type ShortcutDomainSlice = Pick<
  UseShortcutsResult,
  | 'scenarioModes'
  | 'setScenarioModes'
  | 'selectedScenarioId'
  | 'setSelectedScenarioId'
  | 'scenarioShortcuts'
  | 'setScenarioShortcuts'
  | 'shortcuts'
  | 'totalShortcuts'
>;

type ShortcutUiSlice = Pick<
  UseShortcutsResult,
  | 'contextMenu'
  | 'setContextMenu'
  | 'contextMenuRef'
  | 'shortcutEditOpen'
  | 'setShortcutEditOpen'
  | 'shortcutModalMode'
  | 'setShortcutModalMode'
  | 'shortcutDeleteOpen'
  | 'setShortcutDeleteOpen'
  | 'selectedShortcut'
  | 'setSelectedShortcut'
  | 'editingTitle'
  | 'setEditingTitle'
  | 'editingUrl'
  | 'setEditingUrl'
  | 'isDragging'
  | 'setIsDragging'
  | 'currentEditScenarioId'
  | 'setCurrentEditScenarioId'
  | 'currentInsertIndex'
  | 'setCurrentInsertIndex'
  | 'scenarioModeOpen'
  | 'setScenarioModeOpen'
  | 'scenarioCreateOpen'
  | 'setScenarioCreateOpen'
  | 'scenarioEditOpen'
  | 'setScenarioEditOpen'
>;

type ShortcutActionSlice = Pick<
  UseShortcutsResult,
  | 'handleCreateScenarioMode'
  | 'handleOpenEditScenarioMode'
  | 'handleUpdateScenarioMode'
  | 'handleDeleteScenarioMode'
  | 'handleShortcutOpen'
  | 'handleShortcutContextMenu'
  | 'handleGridContextMenu'
  | 'handleSaveShortcutEdit'
  | 'handleConfirmDeleteShortcut'
  | 'handleConfirmDeleteShortcuts'
  | 'handleShortcutReorder'
>;

type ShortcutPersistenceSlice = Pick<
  UseShortcutsResult,
  | 'cloudSyncInitialized'
  | 'setCloudSyncInitialized'
  | 'cloudSyncState'
  | 'userRole'
  | 'setUserRole'
  | 'conflictModalOpen'
  | 'setConflictModalOpen'
  | 'pendingLocalPayload'
  | 'setPendingLocalPayload'
  | 'pendingCloudPayload'
  | 'setPendingCloudPayload'
  | 'cloudConflictPending'
  | 'triggerCloudSyncNow'
  | 'resolveWithCloud'
  | 'resolveWithLocal'
  | 'resolveWithMerge'
  | 'applyUndoPayload'
  | 'resetLocalShortcutsByRole'
  | 'localDirtyRef'
>;

export type ShortcutAppFacade = {
  shortcutDomain: ShortcutDomainSlice;
  shortcutUi: ShortcutUiSlice;
  shortcutActions: ShortcutActionSlice;
  shortcutPersistence: ShortcutPersistenceSlice;
};

type UseShortcutAppFacadeParams = Parameters<typeof useShortcuts>;

export function useShortcutAppFacade(
  ...params: UseShortcutAppFacadeParams
): ShortcutAppFacade {
  const shortcutApp = useShortcuts(...params);

  return {
    shortcutDomain: {
      scenarioModes: shortcutApp.scenarioModes,
      setScenarioModes: shortcutApp.setScenarioModes,
      selectedScenarioId: shortcutApp.selectedScenarioId,
      setSelectedScenarioId: shortcutApp.setSelectedScenarioId,
      scenarioShortcuts: shortcutApp.scenarioShortcuts,
      setScenarioShortcuts: shortcutApp.setScenarioShortcuts,
      shortcuts: shortcutApp.shortcuts,
      totalShortcuts: shortcutApp.totalShortcuts,
    },
    shortcutUi: {
      contextMenu: shortcutApp.contextMenu,
      setContextMenu: shortcutApp.setContextMenu,
      contextMenuRef: shortcutApp.contextMenuRef,
      shortcutEditOpen: shortcutApp.shortcutEditOpen,
      setShortcutEditOpen: shortcutApp.setShortcutEditOpen,
      shortcutModalMode: shortcutApp.shortcutModalMode,
      setShortcutModalMode: shortcutApp.setShortcutModalMode,
      shortcutDeleteOpen: shortcutApp.shortcutDeleteOpen,
      setShortcutDeleteOpen: shortcutApp.setShortcutDeleteOpen,
      selectedShortcut: shortcutApp.selectedShortcut,
      setSelectedShortcut: shortcutApp.setSelectedShortcut,
      editingTitle: shortcutApp.editingTitle,
      setEditingTitle: shortcutApp.setEditingTitle,
      editingUrl: shortcutApp.editingUrl,
      setEditingUrl: shortcutApp.setEditingUrl,
      isDragging: shortcutApp.isDragging,
      setIsDragging: shortcutApp.setIsDragging,
      currentEditScenarioId: shortcutApp.currentEditScenarioId,
      setCurrentEditScenarioId: shortcutApp.setCurrentEditScenarioId,
      currentInsertIndex: shortcutApp.currentInsertIndex,
      setCurrentInsertIndex: shortcutApp.setCurrentInsertIndex,
      scenarioModeOpen: shortcutApp.scenarioModeOpen,
      setScenarioModeOpen: shortcutApp.setScenarioModeOpen,
      scenarioCreateOpen: shortcutApp.scenarioCreateOpen,
      setScenarioCreateOpen: shortcutApp.setScenarioCreateOpen,
      scenarioEditOpen: shortcutApp.scenarioEditOpen,
      setScenarioEditOpen: shortcutApp.setScenarioEditOpen,
    },
    shortcutActions: {
      handleCreateScenarioMode: shortcutApp.handleCreateScenarioMode,
      handleOpenEditScenarioMode: shortcutApp.handleOpenEditScenarioMode,
      handleUpdateScenarioMode: shortcutApp.handleUpdateScenarioMode,
      handleDeleteScenarioMode: shortcutApp.handleDeleteScenarioMode,
      handleShortcutOpen: shortcutApp.handleShortcutOpen,
      handleShortcutContextMenu: shortcutApp.handleShortcutContextMenu,
      handleGridContextMenu: shortcutApp.handleGridContextMenu,
      handleSaveShortcutEdit: shortcutApp.handleSaveShortcutEdit,
      handleConfirmDeleteShortcut: shortcutApp.handleConfirmDeleteShortcut,
      handleConfirmDeleteShortcuts: shortcutApp.handleConfirmDeleteShortcuts,
      handleShortcutReorder: shortcutApp.handleShortcutReorder,
    },
    shortcutPersistence: {
      cloudSyncInitialized: shortcutApp.cloudSyncInitialized,
      setCloudSyncInitialized: shortcutApp.setCloudSyncInitialized,
      cloudSyncState: shortcutApp.cloudSyncState,
      userRole: shortcutApp.userRole,
      setUserRole: shortcutApp.setUserRole,
      conflictModalOpen: shortcutApp.conflictModalOpen,
      setConflictModalOpen: shortcutApp.setConflictModalOpen,
      pendingLocalPayload: shortcutApp.pendingLocalPayload,
      setPendingLocalPayload: shortcutApp.setPendingLocalPayload,
      pendingCloudPayload: shortcutApp.pendingCloudPayload,
      setPendingCloudPayload: shortcutApp.setPendingCloudPayload,
      cloudConflictPending: shortcutApp.cloudConflictPending,
      triggerCloudSyncNow: shortcutApp.triggerCloudSyncNow,
      resolveWithCloud: shortcutApp.resolveWithCloud,
      resolveWithLocal: shortcutApp.resolveWithLocal,
      resolveWithMerge: shortcutApp.resolveWithMerge,
      applyUndoPayload: shortcutApp.applyUndoPayload,
      resetLocalShortcutsByRole: shortcutApp.resetLocalShortcutsByRole,
      localDirtyRef: shortcutApp.localDirtyRef,
    },
  };
}
