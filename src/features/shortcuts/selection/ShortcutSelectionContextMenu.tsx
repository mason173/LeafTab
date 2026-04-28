import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { FrostedSurface } from '@/components/frosted/FrostedSurface';
import {
  FolderShortcutContextMenuContent,
  GridContextMenuContent,
  ShortcutContextMenuContent,
} from '@/features/shortcuts/selection/ShortcutSelectionContextMenuContent';
import type { ContextMenuState, ScenarioMode, Shortcut } from '@/types';

type ShortcutSelectionContextMenuProps = {
  t: (key: string, options?: Record<string, unknown>) => string;
  contextMenu: ContextMenuState | null;
  contextMenuRef: RefObject<HTMLDivElement | null>;
  shortcuts: Shortcut[];
  moveTargetScenarioModes: ScenarioMode[];
  selectedShortcutCount: number;
  shortcutMultiSelectMode: boolean;
  contextScenarioMoveOpen: boolean;
  setContextScenarioMoveOpen: (open: boolean) => void;
  onCreateShortcut: (insertIndex: number) => void;
  onEditShortcut: (shortcutIndex: number, shortcut: Shortcut) => void;
  onEditFolderShortcut: (folderId: string, shortcut: Shortcut) => void;
  onDeleteShortcut: (shortcutIndex: number, shortcut: Shortcut) => void;
  onDeleteFolderShortcut: (folderId: string, shortcut: Shortcut) => void;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onDissolveFolder: (shortcutIndex: number, shortcut: Shortcut) => void;
  onSetFolderDisplayMode?: (shortcutIndex: number, shortcut: Shortcut, mode: 'small' | 'large') => void;
  onHandleMoveSingleShortcutToScenario: (shortcutIndex: number, targetScenarioId: string) => void;
  onToggleShortcutMultiSelect: (shortcutIndex: number) => void;
  onOpenShortcutMultiSelect: (initialIndex?: number) => void;
  onRequestBulkDeleteShortcuts: () => void;
  onClearShortcutMultiSelect: () => void;
  onCopyShortcutLink: (shortcut: Shortcut) => void;
  onCloseContextMenu: () => void;
  selectedShortcutIndexes: ReadonlySet<number>;
};

export function ShortcutSelectionContextMenu({
  t,
  contextMenu,
  contextMenuRef,
  shortcuts,
  moveTargetScenarioModes,
  selectedShortcutCount,
  shortcutMultiSelectMode,
  contextScenarioMoveOpen,
  setContextScenarioMoveOpen,
  onCreateShortcut,
  onEditShortcut,
  onEditFolderShortcut,
  onDeleteShortcut,
  onDeleteFolderShortcut,
  onShortcutOpen,
  onDissolveFolder,
  onSetFolderDisplayMode,
  onHandleMoveSingleShortcutToScenario,
  onToggleShortcutMultiSelect,
  onOpenShortcutMultiSelect,
  onRequestBulkDeleteShortcuts,
  onClearShortcutMultiSelect,
  onCopyShortcutLink,
  onCloseContextMenu,
  selectedShortcutIndexes,
}: ShortcutSelectionContextMenuProps) {
  if (!contextMenu) {
    return null;
  }

  const menu = (
    <div ref={contextMenuRef} className="fixed z-[17020]" data-testid="shortcut-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
      <FrostedSurface
        preset="dropdown-panel"
        className="w-[160px] overflow-visible rounded-[20px] border border-border shadow-lg"
        contentClassName="p-[6px]"
      >
        {contextMenu.kind === 'shortcut' ? (
          <ShortcutContextMenuContent
            t={t}
            contextMenu={contextMenu}
            shortcutsLength={shortcuts.length}
            moveTargetScenarioModes={moveTargetScenarioModes}
            selectedShortcutCount={selectedShortcutCount}
            shortcutMultiSelectMode={shortcutMultiSelectMode}
            contextScenarioMoveOpen={contextScenarioMoveOpen}
            setContextScenarioMoveOpen={setContextScenarioMoveOpen}
            onCreateShortcut={onCreateShortcut}
            onEditShortcut={onEditShortcut}
            onDeleteShortcut={onDeleteShortcut}
            onShortcutOpen={onShortcutOpen}
            onDissolveFolder={onDissolveFolder}
            onSetFolderDisplayMode={onSetFolderDisplayMode}
            onHandleMoveSingleShortcutToScenario={onHandleMoveSingleShortcutToScenario}
            onToggleShortcutMultiSelect={onToggleShortcutMultiSelect}
            onOpenShortcutMultiSelect={onOpenShortcutMultiSelect}
            onRequestBulkDeleteShortcuts={onRequestBulkDeleteShortcuts}
            onClearShortcutMultiSelect={onClearShortcutMultiSelect}
            onCopyShortcutLink={onCopyShortcutLink}
            onCloseContextMenu={onCloseContextMenu}
            selectedShortcutIndexes={selectedShortcutIndexes}
          />
        ) : null}
        {contextMenu.kind === 'folder-shortcut' ? (
          <FolderShortcutContextMenuContent
            t={t}
            contextMenu={contextMenu}
            onShortcutOpen={onShortcutOpen}
            onCopyShortcutLink={onCopyShortcutLink}
            onEditFolderShortcut={onEditFolderShortcut}
            onDeleteFolderShortcut={onDeleteFolderShortcut}
            onCloseContextMenu={onCloseContextMenu}
          />
        ) : null}
        {contextMenu.kind === 'grid' ? (
          <GridContextMenuContent
            t={t}
            shortcutsLength={shortcuts.length}
            selectedShortcutCount={selectedShortcutCount}
            shortcutMultiSelectMode={shortcutMultiSelectMode}
            onCreateShortcut={onCreateShortcut}
            onOpenShortcutMultiSelect={onOpenShortcutMultiSelect}
            onRequestBulkDeleteShortcuts={onRequestBulkDeleteShortcuts}
            onClearShortcutMultiSelect={onClearShortcutMultiSelect}
            onCloseContextMenu={onCloseContextMenu}
          />
        ) : null}
      </FrostedSurface>
    </div>
  );

  if (typeof document === 'undefined') {
    return menu;
  }

  return createPortal(menu, document.body);
}
