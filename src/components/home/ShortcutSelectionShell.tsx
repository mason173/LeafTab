import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
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
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from '@/components/ui/sonner';
import type { ContextMenuState, ScenarioMode, Shortcut } from '@/types';
import { extractDomainFromUrl } from '@/utils';
import { isShortcutFolder, isShortcutLink } from '@/utils/shortcutFolders';

type ShortcutSelectionRenderProps = {
  selectionMode: boolean;
  selectedShortcutIndexes: Set<number>;
  onToggleShortcutSelection: (shortcutIndex: number) => void;
};

type ShortcutSelectionShellProps = {
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
  onPinSelectedShortcuts: (selectedIndexes: number[], position: 'top' | 'bottom') => void;
  onMoveSelectedShortcutsToScenario: (selectedIndexes: number[], targetScenarioId: string) => void;
  onMoveSelectedShortcutsToFolder: (selectedIndexes: number[], targetFolderId: string) => void;
  onDissolveFolder: (shortcutIndex: number, shortcut: Shortcut) => void;
  children: (props: ShortcutSelectionRenderProps) => ReactNode;
};

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
  iconRight?: React.ReactNode;
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
  children,
}: ShortcutSelectionShellProps) {
  const { t } = useTranslation();
  const [shortcutMultiSelectMode, setShortcutMultiSelectMode] = useState(false);
  const [selectedShortcutIndexesState, setSelectedShortcutIndexesState] = useState<number[]>([]);
  const [bulkShortcutDeleteOpen, setBulkShortcutDeleteOpen] = useState(false);
  const [multiSelectMoveOpen, setMultiSelectMoveOpen] = useState(false);
  const [multiSelectFolderOpen, setMultiSelectFolderOpen] = useState(false);
  const multiSelectMoveRef = useRef<HTMLDivElement>(null);
  const multiSelectFolderRef = useRef<HTMLDivElement>(null);

  const selectedShortcutIndexes = useMemo(
    () => new Set(selectedShortcutIndexesState),
    [selectedShortcutIndexesState],
  );
  const selectedShortcutCount = selectedShortcutIndexesState.length;
  const moveTargetScenarioModes = useMemo(
    () => scenarioModes.filter((mode) => mode.id !== selectedScenarioId),
    [scenarioModes, selectedScenarioId],
  );
  const moveTargetFolders = useMemo(
    () => shortcuts.filter((shortcut) => isShortcutFolder(shortcut)),
    [shortcuts],
  );
  const selectedShortcutItems = useMemo(
    () => selectedShortcutIndexesState
      .map((index) => shortcuts[index])
      .filter((shortcut): shortcut is Shortcut => Boolean(shortcut)),
    [selectedShortcutIndexesState, shortcuts],
  );
  const selectedLinkCount = useMemo(
    () => selectedShortcutItems.filter((shortcut) => isShortcutLink(shortcut)).length,
    [selectedShortcutItems],
  );
  const selectedFolderCount = useMemo(
    () => selectedShortcutItems.filter((shortcut) => isShortcutFolder(shortcut)).length,
    [selectedShortcutItems],
  );

  const clearShortcutMultiSelect = useCallback(() => {
    setShortcutMultiSelectMode(false);
    setSelectedShortcutIndexesState([]);
    setBulkShortcutDeleteOpen(false);
    setMultiSelectMoveOpen(false);
    setMultiSelectFolderOpen(false);
  }, []);

  const openShortcutMultiSelect = useCallback((initialIndex?: number) => {
    setShortcutMultiSelectMode(true);
    if (typeof initialIndex === 'number' && initialIndex >= 0) {
      setSelectedShortcutIndexesState([initialIndex]);
      return;
    }
    setSelectedShortcutIndexesState([]);
  }, []);

  const toggleShortcutMultiSelect = useCallback((shortcutIndex: number) => {
    setSelectedShortcutIndexesState((prev) => {
      if (prev.includes(shortcutIndex)) {
        return prev.filter((index) => index !== shortcutIndex);
      }
      return [...prev, shortcutIndex];
    });
  }, []);

  const requestBulkDeleteShortcuts = useCallback(() => {
    if (selectedShortcutCount <= 0) return;
    setBulkShortcutDeleteOpen(true);
    setContextMenu(null);
  }, [selectedShortcutCount, setContextMenu]);

  const handleConfirmBulkDeleteShortcuts = useCallback(() => {
    if (selectedShortcutIndexesState.length === 0) return;
    onDeleteSelectedShortcuts(selectedShortcutIndexesState);
    setBulkShortcutDeleteOpen(false);
    setContextMenu(null);
    clearShortcutMultiSelect();
  }, [clearShortcutMultiSelect, onDeleteSelectedShortcuts, selectedShortcutIndexesState, setContextMenu]);

  const handlePinSelectedShortcuts = useCallback((position: 'top' | 'bottom') => {
    if (selectedShortcutIndexesState.length === 0) return;
    onPinSelectedShortcuts(selectedShortcutIndexesState, position);
    setContextMenu(null);
  }, [onPinSelectedShortcuts, selectedShortcutIndexesState, setContextMenu]);

  const handleMoveSelectedShortcutsToScenario = useCallback((targetScenarioId: string) => {
    if (!targetScenarioId || targetScenarioId === selectedScenarioId) return;
    if (selectedShortcutIndexesState.length === 0) return;
    onMoveSelectedShortcutsToScenario(selectedShortcutIndexesState, targetScenarioId);
    setMultiSelectMoveOpen(false);
    setContextMenu(null);
    clearShortcutMultiSelect();
  }, [
    clearShortcutMultiSelect,
    onMoveSelectedShortcutsToScenario,
    selectedScenarioId,
    selectedShortcutIndexesState,
    setContextMenu,
  ]);

  const handleCreateFolder = useCallback(() => {
    if (selectedLinkCount < 2 || selectedFolderCount > 0) return;
    onCreateFolder(selectedShortcutIndexesState);
    setContextMenu(null);
    clearShortcutMultiSelect();
  }, [
    clearShortcutMultiSelect,
    onCreateFolder,
    selectedFolderCount,
    selectedLinkCount,
    selectedShortcutIndexesState,
    setContextMenu,
  ]);

  const handleMoveSelectedShortcutsToFolder = useCallback((targetFolderId: string) => {
    if (!targetFolderId || selectedLinkCount <= 0 || selectedFolderCount > 0) return;
    onMoveSelectedShortcutsToFolder(selectedShortcutIndexesState, targetFolderId);
    setMultiSelectFolderOpen(false);
    setContextMenu(null);
    clearShortcutMultiSelect();
  }, [
    clearShortcutMultiSelect,
    onMoveSelectedShortcutsToFolder,
    selectedFolderCount,
    selectedLinkCount,
    selectedShortcutIndexesState,
    setContextMenu,
  ]);

  useEffect(() => {
    setSelectedShortcutIndexesState((prev) => prev.filter((index) => index >= 0 && index < shortcuts.length));
  }, [shortcuts.length]);

  useEffect(() => {
    clearShortcutMultiSelect();
  }, [clearShortcutMultiSelect, selectedScenarioId]);

  return (
    <>
      {children({
        selectionMode: shortcutMultiSelectMode,
        selectedShortcutIndexes,
        onToggleShortcutSelection: toggleShortcutMultiSelect,
      })}

      {contextMenu && (
        <div ref={contextMenuRef} className="fixed z-[17020]" data-testid="shortcut-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="bg-popover rounded-[20px] border border-border shadow-lg w-[160px] p-[6px]">
            {contextMenu.kind === 'shortcut' ? (
              shortcutMultiSelectMode ? (
                <>
                  <ContextMenuItem
                    label={selectedShortcutIndexes.has(contextMenu.shortcutIndex)
                      ? t('context.unselect', { defaultValue: '取消选择' })
                      : t('context.select', { defaultValue: '选择' })}
                    testId="shortcut-context-toggle-select"
                    onSelect={() => {
                      toggleShortcutMultiSelect(contextMenu.shortcutIndex);
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.deleteSelected', { defaultValue: '删除已选' })}
                    testId="shortcut-context-delete-selected"
                    onSelect={requestBulkDeleteShortcuts}
                    variant="destructive"
                    disabled={selectedShortcutCount <= 0}
                  />
                  <ContextMenuItem
                    label={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
                    testId="shortcut-context-cancel-multi-select"
                    onSelect={() => {
                      clearShortcutMultiSelect();
                      setContextMenu(null);
                    }}
                  />
                </>
              ) : (
                isShortcutFolder(contextMenu.shortcut) ? (
                  <>
                    <ContextMenuItem
                      label={t('context.editFolder', { defaultValue: '重命名文件夹' })}
                      testId="shortcut-context-edit-folder"
                      onSelect={() => {
                        onEditShortcut(contextMenu.shortcutIndex, contextMenu.shortcut);
                        setContextMenu(null);
                      }}
                    />
                    <ContextMenuItem
                      label={t('context.multiSelect', { defaultValue: '多选' })}
                      testId="shortcut-context-multi-select-folder"
                      onSelect={() => {
                        openShortcutMultiSelect(contextMenu.shortcutIndex);
                        setContextMenu(null);
                      }}
                    />
                    <ContextMenuItem
                      label={t('context.dissolveFolder', { defaultValue: '解散文件夹' })}
                      testId="shortcut-context-dissolve-folder"
                      onSelect={() => {
                        onDissolveFolder(contextMenu.shortcutIndex, contextMenu.shortcut);
                        setContextMenu(null);
                      }}
                    />
                  </>
                ) : (
                <>
                  <ContextMenuItem
                    label={t('context.newShortcut')}
                    testId="shortcut-context-new-shortcut"
                    onSelect={() => {
                      onCreateShortcut(Math.min(contextMenu.shortcutIndex + 1, shortcuts.length));
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.open')}
                    testId="shortcut-context-open"
                    onSelect={() => {
                      onShortcutOpen(contextMenu.shortcut);
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.copyLink')}
                    testId="shortcut-context-copy-link"
                    onSelect={() => {
                      const raw = contextMenu.shortcut.url || '';
                      let hostname = extractDomainFromUrl(raw);
                      if (!hostname) {
                        try {
                          const normalized = raw.includes('://') ? raw : `https://${raw}`;
                          hostname = new URL(normalized).hostname;
                        } catch {
                          hostname = '';
                        }
                      }
                      if (!hostname) {
                        toast.error(t('toast.linkCopyFailed'));
                        setContextMenu(null);
                        return;
                      }
                      navigator.clipboard.writeText(hostname).then(() => {
                        toast.success(t('toast.linkCopied'));
                      }).catch(() => {
                        try {
                          const textarea = document.createElement('textarea');
                          textarea.value = hostname;
                          document.body.appendChild(textarea);
                          textarea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textarea);
                          toast.success(t('toast.linkCopied'));
                        } catch {
                          toast.error(t('toast.linkCopyFailed'));
                        }
                      });
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.edit')}
                    testId="shortcut-context-edit"
                    onSelect={() => {
                      onEditShortcut(contextMenu.shortcutIndex, contextMenu.shortcut);
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.multiSelect', { defaultValue: '多选' })}
                    testId="shortcut-context-multi-select"
                    onSelect={() => {
                      openShortcutMultiSelect(contextMenu.shortcutIndex);
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.delete')}
                    testId="shortcut-context-delete"
                    onSelect={() => {
                      onDeleteShortcut(contextMenu.shortcutIndex, contextMenu.shortcut);
                      setContextMenu(null);
                    }}
                    variant="destructive"
                  />
                </>
                )
              )
            ) : contextMenu.kind === 'folder-shortcut' ? (
              <>
                <ContextMenuItem
                  label={t('context.open')}
                  testId="folder-shortcut-context-open"
                  onSelect={() => {
                    onShortcutOpen(contextMenu.shortcut);
                    setContextMenu(null);
                  }}
                />
                <ContextMenuItem
                  label={t('context.copyLink')}
                  testId="folder-shortcut-context-copy-link"
                  onSelect={() => {
                    const raw = contextMenu.shortcut.url || '';
                    let hostname = extractDomainFromUrl(raw);
                    if (!hostname) {
                      try {
                        const normalized = raw.includes('://') ? raw : `https://${raw}`;
                        hostname = new URL(normalized).hostname;
                      } catch {
                        hostname = '';
                      }
                    }
                    if (!hostname) {
                      toast.error(t('toast.linkCopyFailed'));
                      setContextMenu(null);
                      return;
                    }
                    navigator.clipboard.writeText(hostname).then(() => {
                      toast.success(t('toast.linkCopied'));
                    }).catch(() => {
                      try {
                        const textarea = document.createElement('textarea');
                        textarea.value = hostname;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                        toast.success(t('toast.linkCopied'));
                      } catch {
                        toast.error(t('toast.linkCopyFailed'));
                      }
                    });
                    setContextMenu(null);
                  }}
                />
                <ContextMenuItem
                  label={t('context.edit')}
                  testId="folder-shortcut-context-edit"
                  onSelect={() => {
                    onEditFolderShortcut(contextMenu.folderId, contextMenu.shortcut);
                    setContextMenu(null);
                  }}
                />
                <ContextMenuItem
                  label={t('context.delete')}
                  testId="folder-shortcut-context-delete"
                  onSelect={() => {
                    onDeleteFolderShortcut(contextMenu.folderId, contextMenu.shortcut);
                    setContextMenu(null);
                  }}
                  variant="destructive"
                />
              </>
            ) : (
              shortcutMultiSelectMode ? (
                <>
                  <ContextMenuItem
                    label={t('context.deleteSelected', { defaultValue: '删除已选' })}
                    testId="grid-context-delete-selected"
                    onSelect={requestBulkDeleteShortcuts}
                    variant="destructive"
                    disabled={selectedShortcutCount <= 0}
                  />
                  <ContextMenuItem
                    label={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
                    testId="grid-context-cancel-multi-select"
                    onSelect={() => {
                      clearShortcutMultiSelect();
                      setContextMenu(null);
                    }}
                  />
                </>
              ) : (
                <>
                  <ContextMenuItem
                    label={t('context.addShortcut')}
                    testId="grid-context-add-shortcut"
                    onSelect={() => {
                      onCreateShortcut(shortcuts.length);
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.multiSelect', { defaultValue: '多选' })}
                    testId="grid-context-multi-select"
                    onSelect={() => {
                      openShortcutMultiSelect();
                      setContextMenu(null);
                    }}
                  />
                </>
              )
            )}
          </div>
        </div>
      )}

      {shortcutMultiSelectMode && (
        <div className="fixed bottom-6 left-1/2 z-[17025] -translate-x-1/2 rounded-full border border-border bg-popover/95 px-3 py-2 shadow-xl backdrop-blur-xl" data-testid="shortcut-multi-select-toolbar">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground min-w-[88px]">
              {t('context.selectedCount', { count: selectedShortcutCount, defaultValue: '已选 {{count}} 项' })}
            </span>
            <div ref={multiSelectMoveRef} className="relative">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-xl"
                data-testid="shortcut-multi-select-move"
                title={t('context.moveToScenario', { defaultValue: '移动到情景模式' })}
                aria-label={t('context.moveToScenario', { defaultValue: '移动到情景模式' })}
                aria-expanded={multiSelectMoveOpen}
                onClick={() => setMultiSelectMoveOpen((prev) => !prev)}
              >
                <RiDashboardFill className="size-4" />
              </Button>
              {multiSelectMoveOpen ? (
                <div className="absolute bottom-[calc(100%+10px)] left-1/2 z-[15050] w-[280px] -translate-x-1/2 rounded-2xl border border-border bg-popover/95 p-2 text-foreground shadow-2xl backdrop-blur-xl">
                  <div className="px-2 pb-1 pt-1 text-xs text-muted-foreground">
                    {t('context.moveToScenario', { defaultValue: '移动到情景模式' })}
                  </div>
                  <div className="max-h-[260px] space-y-1 overflow-y-auto">
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
                        onClick={() => handleMoveSelectedShortcutsToScenario(mode.id)}
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
                  </div>
                </div>
              ) : null}
            </div>
            <div ref={multiSelectFolderRef} className="relative">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-xl"
                data-testid="shortcut-multi-select-folder"
                title={t('context.moveToFolder', { defaultValue: '移入文件夹' })}
                aria-label={t('context.moveToFolder', { defaultValue: '移入文件夹' })}
                aria-expanded={multiSelectFolderOpen}
                disabled={selectedLinkCount <= 0 || selectedFolderCount > 0}
                onClick={() => setMultiSelectFolderOpen((prev) => !prev)}
              >
                <RiFolderTransferLine className="size-4" />
              </Button>
              {multiSelectFolderOpen ? (
                <div className="absolute bottom-[calc(100%+10px)] left-1/2 z-[15050] w-[280px] -translate-x-1/2 rounded-2xl border border-border bg-popover/95 p-2 text-foreground shadow-2xl backdrop-blur-xl">
                  <div className="px-2 pb-1 pt-1 text-xs text-muted-foreground">
                    {t('context.moveToFolder', { defaultValue: '移入文件夹' })}
                  </div>
                  <div className="max-h-[260px] space-y-1 overflow-y-auto">
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
                        onClick={() => handleMoveSelectedShortcutsToFolder(folder.id)}
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
                  </div>
                </div>
              ) : null}
            </div>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-xl"
              data-testid="shortcut-multi-select-create-folder"
              onClick={handleCreateFolder}
              disabled={selectedLinkCount < 2 || selectedFolderCount > 0}
              title={t('context.createFolder', { defaultValue: '创建文件夹' })}
              aria-label={t('context.createFolder', { defaultValue: '创建文件夹' })}
            >
              <RiAddLine className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-xl"
              data-testid="shortcut-multi-select-pin-top"
              onClick={() => handlePinSelectedShortcuts('top')}
              disabled={selectedShortcutCount <= 0}
              title={t('context.pinTop', { defaultValue: '置顶已选' })}
              aria-label={t('context.pinTop', { defaultValue: '置顶已选' })}
            >
              <RiArrowUpLine className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-xl"
              data-testid="shortcut-multi-select-pin-bottom"
              onClick={() => handlePinSelectedShortcuts('bottom')}
              disabled={selectedShortcutCount <= 0}
              title={t('context.pinBottom', { defaultValue: '置底已选' })}
              aria-label={t('context.pinBottom', { defaultValue: '置底已选' })}
            >
              <RiArrowDownLine className="size-4" />
            </Button>
            <Button
              size="icon"
              className="h-8 w-8 rounded-xl"
              variant="secondary"
              data-testid="shortcut-multi-select-delete"
              onClick={requestBulkDeleteShortcuts}
              disabled={selectedShortcutCount <= 0}
              title={t('context.deleteSelected', { defaultValue: '删除已选' })}
              aria-label={t('context.deleteSelected', { defaultValue: '删除已选' })}
            >
              <RiDeleteBinLine className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-xl"
              data-testid="shortcut-multi-select-cancel"
              onClick={clearShortcutMultiSelect}
              title={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
              aria-label={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
            >
              <RiCloseLine className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={bulkShortcutDeleteOpen}
        onOpenChange={setBulkShortcutDeleteOpen}
        title={t('shortcutDelete.bulkTitle', { count: selectedShortcutCount, defaultValue: '批量删除快捷方式' })}
        description={t('shortcutDelete.bulkDescription', {
          count: selectedShortcutCount,
          defaultValue: '确定要删除已选的 {{count}} 个快捷方式吗？',
        })}
        confirmText={t('shortcutDelete.confirm')}
        cancelText={t('shortcutDelete.cancel')}
        onConfirm={handleConfirmBulkDeleteShortcuts}
        confirmButtonClassName="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
      />
    </>
  );
});
