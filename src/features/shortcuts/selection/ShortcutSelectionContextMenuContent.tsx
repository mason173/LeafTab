import type { ReactNode } from 'react';
import { RiArrowRightSLine } from '@/icons/ri-compat';
import { FrostedSurface } from '@/components/frosted/FrostedSurface';
import type { ContextMenuState, ScenarioMode, Shortcut } from '@/types';
import { isShortcutFolder } from '@/utils/shortcutFolders';

type SelectionMenuTranslation = (key: string, options?: Record<string, unknown>) => string;

function ContextMenuItem({
  label,
  onSelect,
  variant = 'default',
  disabled = false,
  iconRight,
  testId,
}: {
  label: string;
  onSelect: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  iconRight?: ReactNode;
  testId?: string;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      data-testid={testId}
      className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors flex items-center justify-between ${
        variant === 'destructive'
          ? 'text-destructive hover:bg-destructive/15 dark:hover:bg-destructive/25 font-medium'
          : 'text-foreground hover:bg-accent hover:text-accent-foreground'
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <span>{label}</span>
      {iconRight}
    </button>
  );
}

function ContextMenuSubmenuItem({
  label,
  open,
  disabled = false,
  onOpenChange,
  testId,
  children,
}: {
  label: string;
  open: boolean;
  disabled?: boolean;
  onOpenChange: (open: boolean) => void;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (!disabled) onOpenChange(true);
      }}
      onMouseLeave={() => onOpenChange(false)}
    >
      <button
        type="button"
        data-testid={testId}
        disabled={disabled}
        className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
          disabled
            ? 'cursor-not-allowed text-muted-foreground opacity-50'
            : 'text-foreground hover:bg-accent hover:text-accent-foreground'
        }`}
      >
        <span>{label}</span>
        <RiArrowRightSLine className="size-4" />
      </button>
      {open ? (
        <FrostedSurface
          preset="dropdown-panel"
          className="absolute left-[calc(100%+10px)] top-[-8px] z-[17030] w-[220px] rounded-[18px] border border-border shadow-lg"
          contentClassName="p-[6px]"
        >
          {children}
        </FrostedSurface>
      ) : null}
    </div>
  );
}

type ShortcutContextMenuContentProps = {
  t: SelectionMenuTranslation;
  contextMenu: Extract<ContextMenuState, { kind: 'shortcut' }>;
  shortcutsLength: number;
  moveTargetScenarioModes: ScenarioMode[];
  selectedShortcutCount: number;
  shortcutMultiSelectMode: boolean;
  contextScenarioMoveOpen: boolean;
  setContextScenarioMoveOpen: (open: boolean) => void;
  onCreateShortcut: (insertIndex: number) => void;
  onEditShortcut: (shortcutIndex: number, shortcut: Shortcut) => void;
  onDeleteShortcut: (shortcutIndex: number, shortcut: Shortcut) => void;
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

export function ShortcutContextMenuContent({
  t,
  contextMenu,
  shortcutsLength,
  moveTargetScenarioModes,
  selectedShortcutCount,
  shortcutMultiSelectMode,
  contextScenarioMoveOpen,
  setContextScenarioMoveOpen,
  onCreateShortcut,
  onEditShortcut,
  onDeleteShortcut,
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
}: ShortcutContextMenuContentProps) {
  if (shortcutMultiSelectMode) {
    return (
      <>
        <ContextMenuItem
          label={selectedShortcutIndexes.has(contextMenu.shortcutIndex)
            ? t('context.unselect', { defaultValue: '取消选择' })
            : t('context.select', { defaultValue: '选择' })}
          testId="shortcut-context-toggle-select"
          onSelect={() => {
            onToggleShortcutMultiSelect(contextMenu.shortcutIndex);
            onCloseContextMenu();
          }}
        />
        <ContextMenuItem
          label={t('context.deleteSelected', { defaultValue: '删除已选' })}
          testId="shortcut-context-delete-selected"
          onSelect={onRequestBulkDeleteShortcuts}
          variant="destructive"
          disabled={selectedShortcutCount <= 0}
        />
        <ContextMenuItem
          label={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
          testId="shortcut-context-cancel-multi-select"
          onSelect={() => {
            onClearShortcutMultiSelect();
            onCloseContextMenu();
          }}
        />
      </>
    );
  }

  if (isShortcutFolder(contextMenu.shortcut)) {
    return (
      <>
        <ContextMenuItem
          label={t('context.editFolder', { defaultValue: '重命名文件夹' })}
          testId="shortcut-context-edit-folder"
          onSelect={() => {
            onEditShortcut(contextMenu.shortcutIndex, contextMenu.shortcut);
            onCloseContextMenu();
          }}
        />
        {onSetFolderDisplayMode ? (
          <ContextMenuItem
            label={contextMenu.shortcut.folderDisplayMode === 'large'
              ? t('context.showAsSmallFolder', { defaultValue: '显示为小文件夹' })
              : t('context.showAsLargeFolder', { defaultValue: '显示为大文件夹' })}
            testId="shortcut-context-toggle-folder-display-mode"
            onSelect={() => {
              onSetFolderDisplayMode(
                contextMenu.shortcutIndex,
                contextMenu.shortcut,
                contextMenu.shortcut.folderDisplayMode === 'large' ? 'small' : 'large',
              );
              onCloseContextMenu();
            }}
          />
        ) : null}
        <ContextMenuSubmenuItem
          label={t('context.moveToScenario', { defaultValue: '移动到' })}
          testId="shortcut-context-move-to-scenario-folder"
          open={contextScenarioMoveOpen}
          onOpenChange={setContextScenarioMoveOpen}
          disabled={moveTargetScenarioModes.length === 0}
        >
          {moveTargetScenarioModes.length > 0 ? moveTargetScenarioModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              data-testid={`shortcut-context-move-folder-target-${mode.id}`}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
              onClick={() => onHandleMoveSingleShortcutToScenario(contextMenu.shortcutIndex, mode.id)}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: mode.color || '#60a5fa' }}
                aria-hidden="true"
              />
              <span className="truncate">{mode.name}</span>
            </button>
          )) : (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              {t('context.noScenarioTarget', { defaultValue: '暂无可移动的目标情景模式' })}
            </div>
          )}
        </ContextMenuSubmenuItem>
        <ContextMenuItem
          label={t('context.dissolveFolder', { defaultValue: '解散文件夹' })}
          testId="shortcut-context-dissolve-folder"
          onSelect={() => {
            onDissolveFolder(contextMenu.shortcutIndex, contextMenu.shortcut);
            onCloseContextMenu();
          }}
        />
        <ContextMenuItem
          label={t('context.deleteFolder', { defaultValue: '删除文件夹' })}
          testId="shortcut-context-delete-folder"
          onSelect={() => {
            onDeleteShortcut(contextMenu.shortcutIndex, contextMenu.shortcut);
            onCloseContextMenu();
          }}
          variant="destructive"
        />
      </>
    );
  }

  return (
    <>
      <ContextMenuItem
        label={t('context.newShortcut')}
        testId="shortcut-context-new-shortcut"
        onSelect={() => {
          onCreateShortcut(Math.min(contextMenu.shortcutIndex + 1, shortcutsLength));
          onCloseContextMenu();
        }}
      />
      <ContextMenuItem
        label={t('context.open')}
        testId="shortcut-context-open"
        onSelect={() => {
          onShortcutOpen(contextMenu.shortcut);
          onCloseContextMenu();
        }}
      />
      <ContextMenuItem
        label={t('context.copyLink')}
        testId="shortcut-context-copy-link"
        onSelect={() => onCopyShortcutLink(contextMenu.shortcut)}
      />
      <ContextMenuItem
        label={t('context.edit')}
        testId="shortcut-context-edit"
        onSelect={() => {
          onEditShortcut(contextMenu.shortcutIndex, contextMenu.shortcut);
          onCloseContextMenu();
        }}
      />
      <ContextMenuSubmenuItem
        label={t('context.moveToScenario', { defaultValue: '移动到' })}
        testId="shortcut-context-move-to-scenario"
        open={contextScenarioMoveOpen}
        onOpenChange={setContextScenarioMoveOpen}
        disabled={moveTargetScenarioModes.length === 0}
      >
        {moveTargetScenarioModes.length > 0 ? moveTargetScenarioModes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            data-testid={`shortcut-context-move-target-${mode.id}`}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
            onClick={() => onHandleMoveSingleShortcutToScenario(contextMenu.shortcutIndex, mode.id)}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: mode.color || '#60a5fa' }}
              aria-hidden="true"
            />
            <span className="truncate">{mode.name}</span>
          </button>
        )) : (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            {t('context.noScenarioTarget', { defaultValue: '暂无可移动的目标情景模式' })}
          </div>
        )}
      </ContextMenuSubmenuItem>
      <ContextMenuItem
        label={t('context.multiSelect', { defaultValue: '多选' })}
        testId="shortcut-context-multi-select"
        onSelect={() => {
          onOpenShortcutMultiSelect(contextMenu.shortcutIndex);
          onCloseContextMenu();
        }}
      />
      <ContextMenuItem
        label={t('context.delete')}
        testId="shortcut-context-delete"
        onSelect={() => {
          onDeleteShortcut(contextMenu.shortcutIndex, contextMenu.shortcut);
          onCloseContextMenu();
        }}
        variant="destructive"
      />
    </>
  );
}

type FolderShortcutContextMenuContentProps = {
  t: SelectionMenuTranslation;
  contextMenu: Extract<ContextMenuState, { kind: 'folder-shortcut' }>;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onCopyShortcutLink: (shortcut: Shortcut) => void;
  onEditFolderShortcut: (folderId: string, shortcut: Shortcut) => void;
  onDeleteFolderShortcut: (folderId: string, shortcut: Shortcut) => void;
  onCloseContextMenu: () => void;
};

export function FolderShortcutContextMenuContent({
  t,
  contextMenu,
  onShortcutOpen,
  onCopyShortcutLink,
  onEditFolderShortcut,
  onDeleteFolderShortcut,
  onCloseContextMenu,
}: FolderShortcutContextMenuContentProps) {
  const isFolder = isShortcutFolder(contextMenu.shortcut);

  return (
    <>
      {!isFolder ? (
        <>
          <ContextMenuItem
            label={t('context.open')}
            testId="folder-shortcut-context-open"
            onSelect={() => {
              onShortcutOpen(contextMenu.shortcut);
              onCloseContextMenu();
            }}
          />
          <ContextMenuItem
            label={t('context.copyLink')}
            testId="folder-shortcut-context-copy-link"
            onSelect={() => onCopyShortcutLink(contextMenu.shortcut)}
          />
        </>
      ) : null}
      <ContextMenuItem
        label={isFolder
          ? t('context.editFolder', { defaultValue: '重命名文件夹' })
          : t('context.edit')}
        testId="folder-shortcut-context-edit"
        onSelect={() => {
          onEditFolderShortcut(contextMenu.folderId, contextMenu.shortcut);
          onCloseContextMenu();
        }}
      />
      <ContextMenuItem
        label={isFolder
          ? t('context.deleteFolder', { defaultValue: '删除文件夹' })
          : t('context.delete')}
        testId={isFolder ? 'folder-shortcut-context-delete-folder' : 'folder-shortcut-context-delete'}
        onSelect={() => {
          onDeleteFolderShortcut(contextMenu.folderId, contextMenu.shortcut);
          onCloseContextMenu();
        }}
        variant="destructive"
      />
    </>
  );
}

type GridContextMenuContentProps = {
  t: SelectionMenuTranslation;
  shortcutsLength: number;
  selectedShortcutCount: number;
  shortcutMultiSelectMode: boolean;
  onCreateShortcut: (insertIndex: number) => void;
  onOpenShortcutMultiSelect: (initialIndex?: number) => void;
  onRequestBulkDeleteShortcuts: () => void;
  onClearShortcutMultiSelect: () => void;
  onCloseContextMenu: () => void;
};

export function GridContextMenuContent({
  t,
  shortcutsLength,
  selectedShortcutCount,
  shortcutMultiSelectMode,
  onCreateShortcut,
  onOpenShortcutMultiSelect,
  onRequestBulkDeleteShortcuts,
  onClearShortcutMultiSelect,
  onCloseContextMenu,
}: GridContextMenuContentProps) {
  if (shortcutMultiSelectMode) {
    return (
      <>
        <ContextMenuItem
          label={t('context.deleteSelected', { defaultValue: '删除已选' })}
          testId="grid-context-delete-selected"
          onSelect={onRequestBulkDeleteShortcuts}
          variant="destructive"
          disabled={selectedShortcutCount <= 0}
        />
        <ContextMenuItem
          label={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
          testId="grid-context-cancel-multi-select"
          onSelect={() => {
            onClearShortcutMultiSelect();
            onCloseContextMenu();
          }}
        />
      </>
    );
  }

  return (
    <>
      <ContextMenuItem
        label={t('context.addShortcut')}
        testId="grid-context-add-shortcut"
        onSelect={() => {
          onCreateShortcut(shortcutsLength);
          onCloseContextMenu();
        }}
      />
      <ContextMenuItem
        label={t('context.multiSelect', { defaultValue: '多选' })}
        testId="grid-context-multi-select"
        onSelect={() => {
          onOpenShortcutMultiSelect();
          onCloseContextMenu();
        }}
      />
    </>
  );
}
