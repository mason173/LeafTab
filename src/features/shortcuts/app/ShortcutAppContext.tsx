import { useMemo, type ReactNode } from 'react';
import { getStrictContext } from '@/lib/get-strict-context';
import { useShortcuts } from '@/hooks/useShortcuts';

type UseShortcutsResult = ReturnType<typeof useShortcuts>;

export type ShortcutAppController = UseShortcutsResult;

export type ShortcutDomainState = Pick<
  UseShortcutsResult,
  | 'scenarioModes'
  | 'selectedScenarioId'
  | 'scenarioShortcuts'
  | 'shortcuts'
  | 'totalShortcuts'
>;

export type ShortcutUiState = Pick<
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

export type ShortcutPersistenceState = Pick<
  UseShortcutsResult,
  | 'cloudSyncInitialized'
  | 'cloudSyncState'
  | 'userRole'
  | 'conflictModalOpen'
  | 'pendingLocalPayload'
  | 'pendingCloudPayload'
  | 'cloudConflictPending'
>;

export type ShortcutDomainActions = Pick<
  UseShortcutsResult,
  | 'setScenarioModes'
  | 'setSelectedScenarioId'
  | 'setScenarioShortcuts'
>;

export type ShortcutUiActions = Pick<
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

export type ShortcutFeatureActions = Pick<
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

export type ShortcutPersistenceActions = Pick<
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

export type ShortcutAppMeta = Pick<
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

type ShortcutDomainContextValue = {
  state: ShortcutDomainState;
  actions: ShortcutDomainActions;
};

type ShortcutUiContextValue = {
  state: ShortcutUiState;
  actions: ShortcutUiActions;
};

type ShortcutPersistenceContextValue = {
  state: ShortcutPersistenceState;
  actions: ShortcutPersistenceActions;
};

const [ShortcutDomainProvider, useShortcutDomainContext] =
  getStrictContext<ShortcutDomainContextValue>('ShortcutDomainProvider');
const [ShortcutUiProvider, useShortcutUiContext] =
  getStrictContext<ShortcutUiContextValue>('ShortcutUiProvider');
const [ShortcutPersistenceProvider, useShortcutPersistenceContext] =
  getStrictContext<ShortcutPersistenceContextValue>('ShortcutPersistenceProvider');
const [ShortcutFeatureActionsProvider, useShortcutFeatureActionsContext] =
  getStrictContext<ShortcutFeatureActions>('ShortcutFeatureActionsProvider');
const [ShortcutMetaProvider, useShortcutMetaContext] =
  getStrictContext<ShortcutAppMeta>('ShortcutMetaProvider');

export {
  useShortcutDomainContext,
  useShortcutUiContext,
  useShortcutPersistenceContext,
  useShortcutFeatureActionsContext,
  useShortcutMetaContext,
};

export function ShortcutAppProvider({
  value,
  children,
}: {
  value: ShortcutAppController;
  children?: ReactNode;
}) {
  const domain = useMemo<ShortcutDomainContextValue>(() => ({
    state: {
      scenarioModes: value.scenarioModes,
      selectedScenarioId: value.selectedScenarioId,
      scenarioShortcuts: value.scenarioShortcuts,
      shortcuts: value.shortcuts,
      totalShortcuts: value.totalShortcuts,
    },
    actions: {
      setScenarioModes: value.setScenarioModes,
      setSelectedScenarioId: value.setSelectedScenarioId,
      setScenarioShortcuts: value.setScenarioShortcuts,
    },
  }), [
    value.scenarioModes,
    value.selectedScenarioId,
    value.scenarioShortcuts,
    value.shortcuts,
    value.totalShortcuts,
    value.setScenarioModes,
    value.setSelectedScenarioId,
    value.setScenarioShortcuts,
  ]);

  const ui = useMemo<ShortcutUiContextValue>(() => ({
    state: {
      contextMenu: value.contextMenu,
      shortcutEditOpen: value.shortcutEditOpen,
      shortcutModalMode: value.shortcutModalMode,
      shortcutDeleteOpen: value.shortcutDeleteOpen,
      selectedShortcut: value.selectedShortcut,
      editingTitle: value.editingTitle,
      editingUrl: value.editingUrl,
      isDragging: value.isDragging,
      currentEditScenarioId: value.currentEditScenarioId,
      currentInsertIndex: value.currentInsertIndex,
      scenarioModeOpen: value.scenarioModeOpen,
      scenarioCreateOpen: value.scenarioCreateOpen,
      scenarioEditOpen: value.scenarioEditOpen,
    },
    actions: {
      setContextMenu: value.setContextMenu,
      setShortcutEditOpen: value.setShortcutEditOpen,
      setShortcutModalMode: value.setShortcutModalMode,
      setShortcutDeleteOpen: value.setShortcutDeleteOpen,
      setSelectedShortcut: value.setSelectedShortcut,
      setEditingTitle: value.setEditingTitle,
      setEditingUrl: value.setEditingUrl,
      setIsDragging: value.setIsDragging,
      setCurrentEditScenarioId: value.setCurrentEditScenarioId,
      setCurrentInsertIndex: value.setCurrentInsertIndex,
      setScenarioModeOpen: value.setScenarioModeOpen,
      setScenarioCreateOpen: value.setScenarioCreateOpen,
      setScenarioEditOpen: value.setScenarioEditOpen,
    },
  }), [
    value.contextMenu,
    value.shortcutEditOpen,
    value.shortcutModalMode,
    value.shortcutDeleteOpen,
    value.selectedShortcut,
    value.editingTitle,
    value.editingUrl,
    value.isDragging,
    value.currentEditScenarioId,
    value.currentInsertIndex,
    value.scenarioModeOpen,
    value.scenarioCreateOpen,
    value.scenarioEditOpen,
    value.setContextMenu,
    value.setShortcutEditOpen,
    value.setShortcutModalMode,
    value.setShortcutDeleteOpen,
    value.setSelectedShortcut,
    value.setEditingTitle,
    value.setEditingUrl,
    value.setIsDragging,
    value.setCurrentEditScenarioId,
    value.setCurrentInsertIndex,
    value.setScenarioModeOpen,
    value.setScenarioCreateOpen,
    value.setScenarioEditOpen,
  ]);

  const persistence = useMemo<ShortcutPersistenceContextValue>(() => ({
    state: {
      cloudSyncInitialized: value.cloudSyncInitialized,
      cloudSyncState: value.cloudSyncState,
      userRole: value.userRole,
      conflictModalOpen: value.conflictModalOpen,
      pendingLocalPayload: value.pendingLocalPayload,
      pendingCloudPayload: value.pendingCloudPayload,
      cloudConflictPending: value.cloudConflictPending,
    },
    actions: {
      setCloudSyncInitialized: value.setCloudSyncInitialized,
      setUserRole: value.setUserRole,
      setConflictModalOpen: value.setConflictModalOpen,
      setPendingLocalPayload: value.setPendingLocalPayload,
      setPendingCloudPayload: value.setPendingCloudPayload,
      triggerCloudSyncNow: value.triggerCloudSyncNow,
      resolveWithCloud: value.resolveWithCloud,
      resolveWithLocal: value.resolveWithLocal,
      resolveWithMerge: value.resolveWithMerge,
      applyUndoPayload: value.applyUndoPayload,
      resetLocalShortcutsByRole: value.resetLocalShortcutsByRole,
    },
  }), [
    value.cloudSyncInitialized,
    value.cloudSyncState,
    value.userRole,
    value.conflictModalOpen,
    value.pendingLocalPayload,
    value.pendingCloudPayload,
    value.cloudConflictPending,
    value.setCloudSyncInitialized,
    value.setUserRole,
    value.setConflictModalOpen,
    value.setPendingLocalPayload,
    value.setPendingCloudPayload,
    value.triggerCloudSyncNow,
    value.resolveWithCloud,
    value.resolveWithLocal,
    value.resolveWithMerge,
    value.applyUndoPayload,
    value.resetLocalShortcutsByRole,
  ]);

  const shortcutActions = useMemo<ShortcutFeatureActions>(() => ({
    handleCreateScenarioMode: value.handleCreateScenarioMode,
    handleOpenEditScenarioMode: value.handleOpenEditScenarioMode,
    handleUpdateScenarioMode: value.handleUpdateScenarioMode,
    handleDeleteScenarioMode: value.handleDeleteScenarioMode,
    handleShortcutOpen: value.handleShortcutOpen,
    handleShortcutContextMenu: value.handleShortcutContextMenu,
    handleGridContextMenu: value.handleGridContextMenu,
    handleSaveShortcutEdit: value.handleSaveShortcutEdit,
    handleConfirmDeleteShortcut: value.handleConfirmDeleteShortcut,
    handleConfirmDeleteShortcuts: value.handleConfirmDeleteShortcuts,
    handleShortcutReorder: value.handleShortcutReorder,
  }), [
    value.handleCreateScenarioMode,
    value.handleOpenEditScenarioMode,
    value.handleUpdateScenarioMode,
    value.handleDeleteScenarioMode,
    value.handleShortcutOpen,
    value.handleShortcutContextMenu,
    value.handleGridContextMenu,
    value.handleSaveShortcutEdit,
    value.handleConfirmDeleteShortcut,
    value.handleConfirmDeleteShortcuts,
    value.handleShortcutReorder,
  ]);

  const meta = useMemo<ShortcutAppMeta>(() => ({
    contextMenuRef: value.contextMenuRef,
    localDirtyRef: value.localDirtyRef,
  }), [value.contextMenuRef, value.localDirtyRef]);

  return (
    <ShortcutDomainProvider value={domain}>
      <ShortcutUiProvider value={ui}>
        <ShortcutPersistenceProvider value={persistence}>
          <ShortcutFeatureActionsProvider value={shortcutActions}>
            <ShortcutMetaProvider value={meta}>
              {children}
            </ShortcutMetaProvider>
          </ShortcutFeatureActionsProvider>
        </ShortcutPersistenceProvider>
      </ShortcutUiProvider>
    </ShortcutDomainProvider>
  );
}
