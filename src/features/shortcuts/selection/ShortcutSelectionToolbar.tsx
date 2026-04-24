import { useMemo, type CSSProperties, type RefObject } from 'react';
import { FrostedSurface } from '@/components/frosted/FrostedSurface';
import { useDocumentElementById } from '@/components/frosted/useDocumentElementById';
import { useLiveViewportRect } from '@/hooks/useLiveViewportRect';
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
  anchorId: string;
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

const TOOLBAR_WIDTH_PX = 60;
const TOOLBAR_OFFSET_PX = 14;
const TOOLBAR_VIEWPORT_MARGIN_PX = 14;

export function ShortcutSelectionToolbar({
  anchorId,
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
  const anchorElement = useDocumentElementById(anchorId, true);
  const anchorRect = useLiveViewportRect(anchorElement, Boolean(anchorElement));
  const toolbarStyle = useMemo<CSSProperties>(() => {
    if (typeof window === 'undefined') {
      return {
        right: `${TOOLBAR_VIEWPORT_MARGIN_PX}px`,
        top: '50%',
        transform: 'translate3d(0, -50%, 0)',
      };
    }

    const fallbackLeft = Math.max(
      TOOLBAR_VIEWPORT_MARGIN_PX,
      window.innerWidth - TOOLBAR_VIEWPORT_MARGIN_PX - TOOLBAR_WIDTH_PX,
    );

    if (!anchorRect) {
      return {
        left: `${fallbackLeft}px`,
        top: '50%',
        transform: 'translate3d(0, -50%, 0)',
      };
    }

    const preferredLeft = anchorRect.left + anchorRect.width + TOOLBAR_OFFSET_PX;
    const maxLeft = Math.max(
      TOOLBAR_VIEWPORT_MARGIN_PX,
      window.innerWidth - TOOLBAR_VIEWPORT_MARGIN_PX - TOOLBAR_WIDTH_PX,
    );

    return {
      left: `${Math.min(maxLeft, preferredLeft)}px`,
      top: '50%',
      transform: 'translate3d(0, -50%, 0)',
    };
  }, [anchorRect]);

  return (
    <FrostedSurface
      preset="floating-toolbar"
      radiusClassName="rounded-[28px]"
      className="fixed z-[17025] rounded-[28px] shadow-[0_18px_44px_rgba(8,10,14,0.22)]"
      contentClassName="flex flex-col items-center gap-2.5 px-2.5 py-3"
      dataTestId="shortcut-multi-select-toolbar"
      style={toolbarStyle}
    >
      <div className="flex flex-col items-center gap-2.5">
        <span className="min-w-[36px] text-center text-[12px] font-medium tracking-[0.01em] text-black/68 dark:text-white/84">
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
