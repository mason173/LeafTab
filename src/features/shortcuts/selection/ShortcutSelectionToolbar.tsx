import type { RefObject } from 'react';
import {
  ShortcutSelectionCancelAction,
  ShortcutSelectionCreateFolderAction,
  ShortcutSelectionDeleteAction,
  ShortcutSelectionFolderMoveAction,
  ShortcutSelectionPinAction,
  ShortcutSelectionScenarioMoveAction,
} from '@/features/shortcuts/selection/ShortcutSelectionToolbarActions';
import type { ScenarioMode, Shortcut } from '@/types';

type ShortcutSelectionToolbarProps = {
  t: (key: string, options?: Record<string, unknown>) => string;
  selectedShortcutCount: number;
  moveTargetScenarioModes: ScenarioMode[];
  moveTargetFolders: Shortcut[];
  selectedLinkCount: number;
  selectedFolderCount: number;
  pinTopDisabled: boolean;
  pinBottomDisabled: boolean;
  multiSelectMoveOpen: boolean;
  setMultiSelectMoveOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  multiSelectFolderOpen: boolean;
  setMultiSelectFolderOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  multiSelectMoveRef: RefObject<HTMLDivElement | null>;
  multiSelectFolderRef: RefObject<HTMLDivElement | null>;
  onHandleMoveSelectedShortcutsToScenario: (targetScenarioId: string) => void;
  onHandleMoveSelectedShortcutsToFolder: (targetFolderId: string) => void;
  onHandleCreateFolder: () => void;
  onHandlePinSelectedShortcuts: (position: 'top' | 'bottom') => void;
  onRequestBulkDeleteShortcuts: () => void;
  onClearShortcutMultiSelect: () => void;
};

export function ShortcutSelectionToolbar({
  t,
  selectedShortcutCount,
  moveTargetScenarioModes,
  moveTargetFolders,
  selectedLinkCount,
  selectedFolderCount,
  pinTopDisabled,
  pinBottomDisabled,
  multiSelectMoveOpen,
  setMultiSelectMoveOpen,
  multiSelectFolderOpen,
  setMultiSelectFolderOpen,
  multiSelectMoveRef,
  multiSelectFolderRef,
  onHandleMoveSelectedShortcutsToScenario,
  onHandleMoveSelectedShortcutsToFolder,
  onHandleCreateFolder,
  onHandlePinSelectedShortcuts,
  onRequestBulkDeleteShortcuts,
  onClearShortcutMultiSelect,
}: ShortcutSelectionToolbarProps) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[17025] -translate-x-1/2 rounded-full border border-border bg-popover/95 px-3 py-2 shadow-xl backdrop-blur-xl" data-testid="shortcut-multi-select-toolbar">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground min-w-[88px]">
          {t('context.selectedCount', { count: selectedShortcutCount, defaultValue: '已选 {{count}} 项' })}
        </span>
        <ShortcutSelectionScenarioMoveAction
          t={t}
          selectedShortcutCount={selectedShortcutCount}
          moveTargetScenarioModes={moveTargetScenarioModes}
          multiSelectMoveOpen={multiSelectMoveOpen}
          setMultiSelectMoveOpen={setMultiSelectMoveOpen}
          multiSelectMoveRef={multiSelectMoveRef}
          onMoveSelectedShortcutsToScenario={onHandleMoveSelectedShortcutsToScenario}
        />
        <ShortcutSelectionFolderMoveAction
          t={t}
          moveTargetFolders={moveTargetFolders}
          selectedLinkCount={selectedLinkCount}
          selectedFolderCount={selectedFolderCount}
          multiSelectFolderOpen={multiSelectFolderOpen}
          setMultiSelectFolderOpen={setMultiSelectFolderOpen}
          multiSelectFolderRef={multiSelectFolderRef}
          onMoveSelectedShortcutsToFolder={onHandleMoveSelectedShortcutsToFolder}
        />
        <ShortcutSelectionCreateFolderAction
          t={t}
          selectedLinkCount={selectedLinkCount}
          selectedFolderCount={selectedFolderCount}
          onCreateFolder={onHandleCreateFolder}
        />
        <ShortcutSelectionPinAction
          t={t}
          position="top"
          disabled={pinTopDisabled}
          onPinSelectedShortcuts={onHandlePinSelectedShortcuts}
        />
        <ShortcutSelectionPinAction
          t={t}
          position="bottom"
          disabled={pinBottomDisabled}
          onPinSelectedShortcuts={onHandlePinSelectedShortcuts}
        />
        <ShortcutSelectionDeleteAction
          t={t}
          selectedShortcutCount={selectedShortcutCount}
          onRequestBulkDeleteShortcuts={onRequestBulkDeleteShortcuts}
        />
        <ShortcutSelectionCancelAction
          t={t}
          onClearShortcutMultiSelect={onClearShortcutMultiSelect}
        />
      </div>
    </div>
  );
}
