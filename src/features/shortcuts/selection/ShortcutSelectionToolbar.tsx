import type { RefObject } from 'react';
import { FrostedSurface } from '@/components/frosted/FrostedSurface';
import {
  ShortcutSelectionCancelAction,
  ShortcutSelectionCreateFolderAction,
  ShortcutSelectionDeleteAction,
  ShortcutSelectionFolderMoveAction,
  ShortcutSelectionPinAction,
  ShortcutSelectionSelectAllAction,
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
  selectAllDisabled: boolean;
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
  onSelectAllShortcuts: () => void;
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
  selectAllDisabled,
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
  onSelectAllShortcuts,
  onRequestBulkDeleteShortcuts,
  onClearShortcutMultiSelect,
}: ShortcutSelectionToolbarProps) {
  return (
    <FrostedSurface
      preset="floating-toolbar"
      radiusClassName="rounded-full"
      className="fixed left-1/2 z-[17025] max-w-[calc(100vw-12px)] -translate-x-1/2 rounded-full shadow-[0_18px_44px_rgba(8,10,14,0.22)]"
      contentClassName="flex items-center justify-center px-2.5 py-2.5"
      dataTestId="shortcut-multi-select-toolbar"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
      }}
    >
      <div className="flex max-w-full flex-wrap items-center justify-center gap-2">
        <span className="inline-flex h-10 min-w-[64px] items-center justify-center rounded-full bg-black/10 px-3 text-center text-[12px] font-medium tracking-[0.01em] text-black/68 dark:bg-white/10 dark:text-white/84">
          {`${selectedShortcutCount}项`}
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
        <ShortcutSelectionSelectAllAction
          t={t}
          disabled={selectAllDisabled}
          onSelectAllShortcuts={onSelectAllShortcuts}
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
    </FrostedSurface>
  );
}
