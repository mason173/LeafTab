import { memo, useEffect, type ReactNode, type RefObject } from 'react';
import { ShortcutSelectionProvider } from '@/features/shortcuts/selection/ShortcutSelectionContext';
import { ShortcutSelectionBulkDeleteDialog } from '@/features/shortcuts/selection/ShortcutSelectionBulkDeleteDialog';
import { ShortcutSelectionContextMenu } from '@/features/shortcuts/selection/ShortcutSelectionContextMenu';
import { ShortcutSelectionToolbar } from '@/features/shortcuts/selection/ShortcutSelectionToolbar';
import { HOME_ROOT_SHORTCUT_GRID_ANCHOR } from '@/features/shortcuts/selection/shortcutSelectionLayout';
import { useShortcutSelectionController } from '@/features/shortcuts/selection/useShortcutSelectionController';
import type { ContextMenuState, ScenarioMode, Shortcut } from '@/types';

export type ShortcutSelectionShellProps = {
  contextMenu: ContextMenuState | null;
  setContextMenu: (value: ContextMenuState | null) => void;
  contextMenuRef: RefObject<HTMLDivElement | null>;
  shortcuts: Shortcut[];
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  onCreateShortcut: (insertIndex: number) => void;
  onEditShortcut: (shortcutIndex: number, shortcut: Shortcut) => void;
  onEditFolderShortcut: (folderId: string, shortcut: Shortcut) => void;
  onDeleteShortcut: (shortcutIndex: number, shortcut: Shortcut) => void;
  onDeleteFolderShortcut: (folderId: string, shortcut: Shortcut) => void;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onDeleteSelectedShortcuts: (selectedIndexes: number[]) => void;
  onCreateFolder: (selectedIndexes: number[]) => void;
  onPinSelectedShortcuts: (selectedIndexes: number[], position: 'top' | 'bottom') => number[] | void;
  onMoveSelectedShortcutsToScenario: (selectedIndexes: number[], targetScenarioId: string) => void;
  onMoveSelectedShortcutsToFolder: (selectedIndexes: number[], targetFolderId: string) => void;
  onDissolveFolder: (shortcutIndex: number, shortcut: Shortcut) => void;
  onSetFolderDisplayMode?: (shortcutIndex: number, shortcut: Shortcut, mode: 'small' | 'large') => void;
  children: ReactNode;
};

export const ShortcutSelectionShell = memo(function ShortcutSelectionShell({
  contextMenu,
  setContextMenu,
  contextMenuRef,
  shortcuts,
  scenarioModes,
  selectedScenarioId,
  onCreateShortcut,
  onEditShortcut,
  onEditFolderShortcut,
  onDeleteShortcut,
  onDeleteFolderShortcut,
  onShortcutOpen,
  onDeleteSelectedShortcuts,
  onCreateFolder,
  onPinSelectedShortcuts,
  onMoveSelectedShortcutsToScenario,
  onMoveSelectedShortcutsToFolder,
  onDissolveFolder,
  onSetFolderDisplayMode,
  children,
}: ShortcutSelectionShellProps) {
  const {
    t,
    shortcutMultiSelectMode,
    selectedShortcutIndexes,
    selectedShortcutCount,
    moveTargetScenarioModes,
    moveTargetFolders,
    selectedLinkCount,
    selectedFolderCount,
    pinTopDisabled,
    pinBottomDisabled,
    bulkShortcutDeleteOpen,
    setBulkShortcutDeleteOpen,
    multiSelectMoveOpen,
    setMultiSelectMoveOpen,
    multiSelectFolderOpen,
    setMultiSelectFolderOpen,
    contextScenarioMoveOpen,
    setContextScenarioMoveOpen,
    multiSelectMoveRef,
    multiSelectFolderRef,
    clearShortcutMultiSelect,
    openShortcutMultiSelect,
    toggleShortcutMultiSelect,
    requestBulkDeleteShortcuts,
    handleConfirmBulkDeleteShortcuts,
    handlePinSelectedShortcuts,
    handleMoveSelectedShortcutsToScenario,
    handleCreateFolder,
    handleMoveSelectedShortcutsToFolder,
    handleMoveSingleShortcutToScenario,
    handleCopyShortcutLink,
  } = useShortcutSelectionController({
    contextMenu,
    setContextMenu,
    shortcuts,
    scenarioModes,
    selectedScenarioId,
    onCreateFolder,
    onDeleteSelectedShortcuts,
    onMoveSelectedShortcutsToScenario,
    onMoveSelectedShortcutsToFolder,
    onPinSelectedShortcuts,
  });

  useEffect(() => {
    if (!shortcutMultiSelectMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      clearShortcutMultiSelect();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clearShortcutMultiSelect, shortcutMultiSelectMode]);

  return (
    <ShortcutSelectionProvider value={{
      selectionMode: shortcutMultiSelectMode,
      selectedShortcutIndexes,
      onToggleShortcutSelection: toggleShortcutMultiSelect,
    }}>
      {children}

      <ShortcutSelectionContextMenu
        t={t}
        contextMenu={contextMenu}
        contextMenuRef={contextMenuRef}
        shortcuts={shortcuts}
        moveTargetScenarioModes={moveTargetScenarioModes}
        selectedShortcutCount={selectedShortcutCount}
        shortcutMultiSelectMode={shortcutMultiSelectMode}
        contextScenarioMoveOpen={contextScenarioMoveOpen}
        setContextScenarioMoveOpen={setContextScenarioMoveOpen}
        onCreateShortcut={onCreateShortcut}
        onEditShortcut={onEditShortcut}
        onEditFolderShortcut={onEditFolderShortcut}
        onDeleteShortcut={onDeleteShortcut}
        onDeleteFolderShortcut={onDeleteFolderShortcut}
        onShortcutOpen={onShortcutOpen}
        onDissolveFolder={onDissolveFolder}
        onSetFolderDisplayMode={onSetFolderDisplayMode}
        onHandleMoveSingleShortcutToScenario={handleMoveSingleShortcutToScenario}
        onToggleShortcutMultiSelect={toggleShortcutMultiSelect}
        onOpenShortcutMultiSelect={openShortcutMultiSelect}
        onRequestBulkDeleteShortcuts={requestBulkDeleteShortcuts}
        onClearShortcutMultiSelect={clearShortcutMultiSelect}
        onCopyShortcutLink={handleCopyShortcutLink}
        onCloseContextMenu={() => setContextMenu(null)}
        selectedShortcutIndexes={selectedShortcutIndexes}
      />

      {shortcutMultiSelectMode ? (
        <ShortcutSelectionToolbar
          anchorId={HOME_ROOT_SHORTCUT_GRID_ANCHOR}
          t={t}
          selectedShortcutCount={selectedShortcutCount}
          moveTargetScenarioModes={moveTargetScenarioModes}
          moveTargetFolders={moveTargetFolders}
          selectedLinkCount={selectedLinkCount}
          selectedFolderCount={selectedFolderCount}
          pinTopDisabled={pinTopDisabled}
          pinBottomDisabled={pinBottomDisabled}
          multiSelectMoveOpen={multiSelectMoveOpen}
          setMultiSelectMoveOpen={setMultiSelectMoveOpen}
          multiSelectFolderOpen={multiSelectFolderOpen}
          setMultiSelectFolderOpen={setMultiSelectFolderOpen}
          multiSelectMoveRef={multiSelectMoveRef}
          multiSelectFolderRef={multiSelectFolderRef}
          onHandleMoveSelectedShortcutsToScenario={handleMoveSelectedShortcutsToScenario}
          onHandleMoveSelectedShortcutsToFolder={handleMoveSelectedShortcutsToFolder}
          onHandleCreateFolder={handleCreateFolder}
          onHandlePinSelectedShortcuts={handlePinSelectedShortcuts}
          onRequestBulkDeleteShortcuts={requestBulkDeleteShortcuts}
          onClearShortcutMultiSelect={clearShortcutMultiSelect}
        />
      ) : null}

      <ShortcutSelectionBulkDeleteDialog
        t={t}
        open={bulkShortcutDeleteOpen}
        selectedShortcutCount={selectedShortcutCount}
        onOpenChange={setBulkShortcutDeleteOpen}
        onConfirm={handleConfirmBulkDeleteShortcuts}
      />
    </ShortcutSelectionProvider>
  );
});
