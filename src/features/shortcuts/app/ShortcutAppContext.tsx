import { getStrictContext } from '@/lib/get-strict-context';
import { useShortcuts } from '@/hooks/useShortcuts';

type UseShortcutsResult = ReturnType<typeof useShortcuts>;

type ShortcutDomainState = Pick<
  UseShortcutsResult,
  | 'scenarioModes'
  | 'selectedScenarioId'
  | 'scenarioShortcuts'
  | 'shortcuts'
  | 'totalShortcuts'
>;

type ShortcutUiState = Pick<
  UseShortcutsResult,
  | 'contextMenu'
  | 'shortcutEditOpen'
  | 'shortcutModalMode'
  | 'shortcutDeleteOpen'
  | 'selectedShortcut'
  | 'editingTitle'
  | 'editingUrl'
  | 'isDragging'
  | 'currentEditScenarioId'
  | 'currentInsertIndex'
  | 'scenarioModeOpen'
  | 'scenarioCreateOpen'
  | 'scenarioEditOpen'
>;

type ShortcutPersistenceState = Pick<
  UseShortcutsResult,
  | 'cloudSyncInitialized'
  | 'cloudSyncState'
  | 'userRole'
  | 'conflictModalOpen'
  | 'pendingLocalPayload'
  | 'pendingCloudPayload'
  | 'cloudConflictPending'
>;

type ShortcutDomainActions = Pick<
  UseShortcutsResult,
  | 'setScenarioModes'
  | 'setSelectedScenarioId'
  | 'setScenarioShortcuts'
>;

type ShortcutUiActions = Pick<
  UseShortcutsResult,
  | 'setContextMenu'
  | 'setShortcutEditOpen'
  | 'setShortcutModalMode'
  | 'setShortcutDeleteOpen'
  | 'setSelectedShortcut'
  | 'setEditingTitle'
  | 'setEditingUrl'
  | 'setIsDragging'
  | 'setCurrentEditScenarioId'
  | 'setCurrentInsertIndex'
  | 'setScenarioModeOpen'
  | 'setScenarioCreateOpen'
  | 'setScenarioEditOpen'
>;

type ShortcutFeatureActions = Pick<
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

type ShortcutPersistenceActions = Pick<
  UseShortcutsResult,
  | 'setCloudSyncInitialized'
  | 'setUserRole'
  | 'setConflictModalOpen'
  | 'setPendingLocalPayload'
  | 'setPendingCloudPayload'
  | 'triggerCloudSyncNow'
  | 'resolveWithCloud'
  | 'resolveWithLocal'
  | 'resolveWithMerge'
  | 'applyUndoPayload'
  | 'resetLocalShortcutsByRole'
>;

type ShortcutAppMeta = Pick<
  UseShortcutsResult,
  | 'contextMenuRef'
  | 'localDirtyRef'
>;

export type ShortcutAppContextValue = {
  state: {
    domain: ShortcutDomainState;
    ui: ShortcutUiState;
    persistence: ShortcutPersistenceState;
  };
  actions: {
    domain: ShortcutDomainActions;
    ui: ShortcutUiActions;
    shortcuts: ShortcutFeatureActions;
    persistence: ShortcutPersistenceActions;
  };
  meta: ShortcutAppMeta;
};

export const [ShortcutAppProvider, useShortcutAppContext] =
  getStrictContext<ShortcutAppContextValue>('ShortcutAppProvider');
