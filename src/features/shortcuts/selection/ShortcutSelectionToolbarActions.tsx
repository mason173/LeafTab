import type { RefObject, ReactNode } from 'react';
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiDashboardFill,
  RiDeleteBinLine,
  RiFolderChartFill,
  RiFolderTransferLine,
} from '@/icons/ri-compat';
import { Button } from '@/components/ui/button';
import type { ScenarioMode, Shortcut } from '@/types';

type SelectionToolbarTranslation = (key: string, options?: Record<string, unknown>) => string;
type ToggleOpen = (value: boolean | ((prev: boolean) => boolean)) => void;

function SelectionToolbarPopover({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="absolute bottom-[calc(100%+10px)] left-1/2 z-[15050] w-[280px] -translate-x-1/2 rounded-2xl border border-border bg-popover/95 p-2 text-foreground shadow-2xl backdrop-blur-xl">
      <div className="px-2 pb-1 pt-1 text-xs text-muted-foreground">
        {title}
      </div>
      <div className="max-h-[260px] space-y-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

function SelectionToolbarActionButton({
  title,
  testId,
  disabled = false,
  ariaExpanded,
  onClick,
  children,
  className = 'h-8 w-8 rounded-xl',
}: {
  title: string;
  testId: string;
  disabled?: boolean;
  ariaExpanded?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Button
      size="icon"
      variant="secondary"
      className={className}
      data-testid={testId}
      title={title}
      aria-label={title}
      aria-expanded={ariaExpanded}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

type ShortcutSelectionScenarioMoveActionProps = {
  t: SelectionToolbarTranslation;
  selectedShortcutCount: number;
  moveTargetScenarioModes: ScenarioMode[];
  multiSelectMoveOpen: boolean;
  setMultiSelectMoveOpen: ToggleOpen;
  multiSelectMoveRef: RefObject<HTMLDivElement | null>;
  onMoveSelectedShortcutsToScenario: (targetScenarioId: string) => void;
};

export function ShortcutSelectionScenarioMoveAction({
  t,
  selectedShortcutCount,
  moveTargetScenarioModes,
  multiSelectMoveOpen,
  setMultiSelectMoveOpen,
  multiSelectMoveRef,
  onMoveSelectedShortcutsToScenario,
}: ShortcutSelectionScenarioMoveActionProps) {
  const moveToScenarioLabel = t('context.moveToScenario', { defaultValue: '移动到情景模式' });

  return (
    <div ref={multiSelectMoveRef} className="relative">
      <SelectionToolbarActionButton
        testId="shortcut-multi-select-move"
        title={moveToScenarioLabel}
        ariaExpanded={multiSelectMoveOpen}
        onClick={() => setMultiSelectMoveOpen((prev) => !prev)}
      >
        <RiDashboardFill className="size-4" />
      </SelectionToolbarActionButton>
      {multiSelectMoveOpen ? (
        <SelectionToolbarPopover title={moveToScenarioLabel}>
          {selectedShortcutCount <= 0 ? (
            <div className="px-2 py-5 text-center text-sm text-muted-foreground">
              {t('context.selectBeforeMove', { defaultValue: '请先选择快捷方式' })}
            </div>
          ) : null}
          {selectedShortcutCount > 0 && moveTargetScenarioModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              data-testid={`shortcut-multi-select-move-target-${mode.id}`}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
              onClick={() => onMoveSelectedShortcutsToScenario(mode.id)}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: mode.color || '#60a5fa' }}
                aria-hidden="true"
              />
              <span className="truncate">{mode.name}</span>
            </button>
          ))}
          {selectedShortcutCount > 0 && moveTargetScenarioModes.length === 0 ? (
            <div className="px-2 py-5 text-center text-sm text-muted-foreground">
              {t('context.noScenarioTarget', { defaultValue: '暂无可移动的目标情景模式' })}
            </div>
          ) : null}
        </SelectionToolbarPopover>
      ) : null}
    </div>
  );
}

type ShortcutSelectionFolderMoveActionProps = {
  t: SelectionToolbarTranslation;
  moveTargetFolders: Shortcut[];
  selectedLinkCount: number;
  selectedFolderCount: number;
  multiSelectFolderOpen: boolean;
  setMultiSelectFolderOpen: ToggleOpen;
  multiSelectFolderRef: RefObject<HTMLDivElement | null>;
  onMoveSelectedShortcutsToFolder: (targetFolderId: string) => void;
};

export function ShortcutSelectionFolderMoveAction({
  t,
  moveTargetFolders,
  selectedLinkCount,
  selectedFolderCount,
  multiSelectFolderOpen,
  setMultiSelectFolderOpen,
  multiSelectFolderRef,
  onMoveSelectedShortcutsToFolder,
}: ShortcutSelectionFolderMoveActionProps) {
  const moveToFolderLabel = t('context.moveToFolder', { defaultValue: '移入文件夹' });

  return (
    <div ref={multiSelectFolderRef} className="relative">
      <SelectionToolbarActionButton
        testId="shortcut-multi-select-folder"
        title={moveToFolderLabel}
        ariaExpanded={multiSelectFolderOpen}
        disabled={selectedLinkCount <= 0 || selectedFolderCount > 0}
        onClick={() => setMultiSelectFolderOpen((prev) => !prev)}
      >
        <RiFolderTransferLine className="size-4" />
      </SelectionToolbarActionButton>
      {multiSelectFolderOpen ? (
        <SelectionToolbarPopover title={moveToFolderLabel}>
          {selectedFolderCount > 0 ? (
            <div className="px-2 py-5 text-center text-sm text-muted-foreground">
              {t('context.folderMoveOnlyLinks', { defaultValue: '暂不支持把文件夹再移入文件夹' })}
            </div>
          ) : null}
          {selectedFolderCount === 0 && selectedLinkCount > 0 && moveTargetFolders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              data-testid={`shortcut-multi-select-folder-target-${folder.id}`}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
              onClick={() => onMoveSelectedShortcutsToFolder(folder.id)}
            >
              <RiFolderChartFill className="size-4 text-muted-foreground" />
              <span className="truncate">{folder.title}</span>
            </button>
          ))}
          {selectedFolderCount === 0 && selectedLinkCount > 0 && moveTargetFolders.length === 0 ? (
            <div className="px-2 py-5 text-center text-sm text-muted-foreground">
              {t('context.noFolderTarget', { defaultValue: '当前还没有可用的文件夹' })}
            </div>
          ) : null}
        </SelectionToolbarPopover>
      ) : null}
    </div>
  );
}

type ShortcutSelectionCreateFolderActionProps = {
  t: SelectionToolbarTranslation;
  selectedLinkCount: number;
  selectedFolderCount: number;
  onCreateFolder: () => void;
};

export function ShortcutSelectionCreateFolderAction({
  t,
  selectedLinkCount,
  selectedFolderCount,
  onCreateFolder,
}: ShortcutSelectionCreateFolderActionProps) {
  return (
    <SelectionToolbarActionButton
      testId="shortcut-multi-select-create-folder"
      title={t('context.createFolder', { defaultValue: '创建文件夹' })}
      disabled={selectedLinkCount < 2 || selectedFolderCount > 0}
      onClick={onCreateFolder}
    >
      <RiAddLine className="size-4" />
    </SelectionToolbarActionButton>
  );
}

type ShortcutSelectionPinActionProps = {
  t: SelectionToolbarTranslation;
  position: 'top' | 'bottom';
  disabled: boolean;
  onPinSelectedShortcuts: (position: 'top' | 'bottom') => void;
};

export function ShortcutSelectionPinAction({
  t,
  position,
  disabled,
  onPinSelectedShortcuts,
}: ShortcutSelectionPinActionProps) {
  const isTop = position === 'top';
  return (
    <SelectionToolbarActionButton
      testId={isTop ? 'shortcut-multi-select-pin-top' : 'shortcut-multi-select-pin-bottom'}
      title={t(isTop ? 'context.pinTop' : 'context.pinBottom', {
        defaultValue: isTop ? '置顶已选' : '置底已选',
      })}
      disabled={disabled}
      className="h-8 w-8 rounded-xl disabled:pointer-events-auto disabled:cursor-not-allowed disabled:bg-secondary/55 disabled:text-muted-foreground"
      onClick={() => onPinSelectedShortcuts(position)}
    >
      {isTop ? <RiArrowUpLine className="size-4" /> : <RiArrowDownLine className="size-4" />}
    </SelectionToolbarActionButton>
  );
}

type ShortcutSelectionDeleteActionProps = {
  t: SelectionToolbarTranslation;
  selectedShortcutCount: number;
  onRequestBulkDeleteShortcuts: () => void;
};

export function ShortcutSelectionDeleteAction({
  t,
  selectedShortcutCount,
  onRequestBulkDeleteShortcuts,
}: ShortcutSelectionDeleteActionProps) {
  return (
    <SelectionToolbarActionButton
      testId="shortcut-multi-select-delete"
      title={t('context.deleteSelected', { defaultValue: '删除已选' })}
      disabled={selectedShortcutCount <= 0}
      onClick={onRequestBulkDeleteShortcuts}
    >
      <RiDeleteBinLine className="size-4" />
    </SelectionToolbarActionButton>
  );
}

type ShortcutSelectionCancelActionProps = {
  t: SelectionToolbarTranslation;
  onClearShortcutMultiSelect: () => void;
};

export function ShortcutSelectionCancelAction({
  t,
  onClearShortcutMultiSelect,
}: ShortcutSelectionCancelActionProps) {
  return (
    <SelectionToolbarActionButton
      testId="shortcut-multi-select-cancel"
      title={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
      onClick={onClearShortcutMultiSelect}
    >
      <RiCloseLine className="size-4" />
    </SelectionToolbarActionButton>
  );
}
