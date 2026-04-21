import { useShortcuts } from '@/hooks/useShortcuts';
import type { ShortcutAppContextValue } from '@/features/shortcuts/app/ShortcutAppContext';

type UseShortcutAppContextValueParams = Parameters<typeof useShortcuts>;

export function useShortcutAppContextValue(
  ...params: UseShortcutAppContextValueParams
): ShortcutAppContextValue {
  const shortcutApp = useShortcuts(...params);

  return {
    state: {
      domain: {
        scenarioModes: shortcutApp.scenarioModes,
        selectedScenarioId: shortcutApp.selectedScenarioId,
        scenarioShortcuts: shortcutApp.scenarioShortcuts,
        shortcuts: shortcutApp.shortcuts,
        totalShortcuts: shortcutApp.totalShortcuts,
      },
      ui: {
        contextMenu: shortcutApp.contextMenu,
        shortcutEditOpen: shortcutApp.shortcutEditOpen,
        shortcutModalMode: shortcutApp.shortcutModalMode,
        shortcutDeleteOpen: shortcutApp.shortcutDeleteOpen,
        selectedShortcut: shortcutApp.selectedShortcut,
        editingTitle: shortcutApp.editingTitle,
        editingUrl: shortcutApp.editingUrl,
        isDragging: shortcutApp.isDragging,
        currentEditScenarioId: shortcutApp.currentEditScenarioId,
        currentInsertIndex: shortcutApp.currentInsertIndex,
        scenarioModeOpen: shortcutApp.scenarioModeOpen,
        scenarioCreateOpen: shortcutApp.scenarioCreateOpen,
        scenarioEditOpen: shortcutApp.scenarioEditOpen,
      },
      persistence: {
        cloudSyncInitialized: shortcutApp.cloudSyncInitialized,
        cloudSyncState: shortcutApp.cloudSyncState,
        userRole: shortcutApp.userRole,
        conflictModalOpen: shortcutApp.conflictModalOpen,
        pendingLocalPayload: shortcutApp.pendingLocalPayload,
        pendingCloudPayload: shortcutApp.pendingCloudPayload,
        cloudConflictPending: shortcutApp.cloudConflictPending,
      },
    },
    actions: {
      domain: {
        setScenarioModes: shortcutApp.setScenarioModes,
        setSelectedScenarioId: shortcutApp.setSelectedScenarioId,
        setScenarioShortcuts: shortcutApp.setScenarioShortcuts,
      },
      ui: {
        setContextMenu: shortcutApp.setContextMenu,
        setShortcutEditOpen: shortcutApp.setShortcutEditOpen,
        setShortcutModalMode: shortcutApp.setShortcutModalMode,
        setShortcutDeleteOpen: shortcutApp.setShortcutDeleteOpen,
        setSelectedShortcut: shortcutApp.setSelectedShortcut,
        setEditingTitle: shortcutApp.setEditingTitle,
        setEditingUrl: shortcutApp.setEditingUrl,
        setIsDragging: shortcutApp.setIsDragging,
        setCurrentEditScenarioId: shortcutApp.setCurrentEditScenarioId,
        setCurrentInsertIndex: shortcutApp.setCurrentInsertIndex,
        setScenarioModeOpen: shortcutApp.setScenarioModeOpen,
        setScenarioCreateOpen: shortcutApp.setScenarioCreateOpen,
        setScenarioEditOpen: shortcutApp.setScenarioEditOpen,
      },
      shortcuts: {
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
      persistence: {
        setCloudSyncInitialized: shortcutApp.setCloudSyncInitialized,
        setUserRole: shortcutApp.setUserRole,
        setConflictModalOpen: shortcutApp.setConflictModalOpen,
        setPendingLocalPayload: shortcutApp.setPendingLocalPayload,
        setPendingCloudPayload: shortcutApp.setPendingCloudPayload,
        triggerCloudSyncNow: shortcutApp.triggerCloudSyncNow,
        resolveWithCloud: shortcutApp.resolveWithCloud,
        resolveWithLocal: shortcutApp.resolveWithLocal,
        resolveWithMerge: shortcutApp.resolveWithMerge,
        applyUndoPayload: shortcutApp.applyUndoPayload,
        resetLocalShortcutsByRole: shortcutApp.resetLocalShortcutsByRole,
      },
    },
    meta: {
      contextMenuRef: shortcutApp.contextMenuRef,
      localDirtyRef: shortcutApp.localDirtyRef,
    },
  };
}
