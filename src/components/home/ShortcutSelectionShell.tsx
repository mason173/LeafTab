import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiFolderTransferLine,
} from '@/icons/ri-compat';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from '@/components/ui/sonner';
import type { ContextMenuState, ScenarioMode, Shortcut } from '@/types';
import { extractDomainFromUrl } from '@/utils';

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
  onDeleteShortcut: (shortcutIndex: number, shortcut: Shortcut) => void;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onDeleteSelectedShortcuts: (selectedIndexes: number[]) => void;
  onPinSelectedShortcuts: (selectedIndexes: number[], position: 'top' | 'bottom') => void;
  onMoveSelectedShortcutsToScenario: (selectedIndexes: number[], targetScenarioId: string) => void;
  children: (props: ShortcutSelectionRenderProps) => ReactNode;
};

function ContextMenuItem({
  label,
  onSelect,
  variant = 'default',
  disabled = false,
  iconRight,
}: {
  label: string;
  onSelect: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  iconRight?: React.ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
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
  onDeleteShortcut,
  onShortcutOpen,
  onDeleteSelectedShortcuts,
  onPinSelectedShortcuts,
  onMoveSelectedShortcutsToScenario,
  children,
}: ShortcutSelectionShellProps) {
  const { t } = useTranslation();
  const [shortcutMultiSelectMode, setShortcutMultiSelectMode] = useState(false);
  const [selectedShortcutIndexesState, setSelectedShortcutIndexesState] = useState<number[]>([]);
  const [bulkShortcutDeleteOpen, setBulkShortcutDeleteOpen] = useState(false);
  const [multiSelectMoveOpen, setMultiSelectMoveOpen] = useState(false);
  const multiSelectMoveRef = useRef<HTMLDivElement>(null);

  const selectedShortcutIndexes = useMemo(
    () => new Set(selectedShortcutIndexesState),
    [selectedShortcutIndexesState],
  );
  const selectedShortcutCount = selectedShortcutIndexesState.length;
  const moveTargetScenarioModes = useMemo(
    () => scenarioModes.filter((mode) => mode.id !== selectedScenarioId),
    [scenarioModes, selectedScenarioId],
  );

  const clearShortcutMultiSelect = useCallback(() => {
    setShortcutMultiSelectMode(false);
    setSelectedShortcutIndexesState([]);
    setBulkShortcutDeleteOpen(false);
    setMultiSelectMoveOpen(false);
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
        <div ref={contextMenuRef} className="fixed z-[15020]" style={{ top: contextMenu.y, left: contextMenu.x }}>
          <div className="bg-popover rounded-[20px] border border-border shadow-lg w-[160px] p-[6px]">
            {contextMenu.kind === 'shortcut' ? (
              shortcutMultiSelectMode ? (
                <>
                  <ContextMenuItem
                    label={selectedShortcutIndexes.has(contextMenu.shortcutIndex)
                      ? t('context.unselect', { defaultValue: '取消选择' })
                      : t('context.select', { defaultValue: '选择' })}
                    onSelect={() => {
                      toggleShortcutMultiSelect(contextMenu.shortcutIndex);
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.deleteSelected', { defaultValue: '删除已选' })}
                    onSelect={requestBulkDeleteShortcuts}
                    variant="destructive"
                    disabled={selectedShortcutCount <= 0}
                  />
                  <ContextMenuItem
                    label={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
                    onSelect={() => {
                      clearShortcutMultiSelect();
                      setContextMenu(null);
                    }}
                  />
                </>
              ) : (
                <>
                  <ContextMenuItem
                    label={t('context.newShortcut')}
                    onSelect={() => {
                      onCreateShortcut(Math.min(contextMenu.shortcutIndex + 1, shortcuts.length));
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.open')}
                    onSelect={() => {
                      onShortcutOpen(contextMenu.shortcut);
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.copyLink')}
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
                    onSelect={() => {
                      onEditShortcut(contextMenu.shortcutIndex, contextMenu.shortcut);
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.multiSelect', { defaultValue: '多选' })}
                    onSelect={() => {
                      openShortcutMultiSelect(contextMenu.shortcutIndex);
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.delete')}
                    onSelect={() => {
                      onDeleteShortcut(contextMenu.shortcutIndex, contextMenu.shortcut);
                      setContextMenu(null);
                    }}
                    variant="destructive"
                  />
                </>
              )
            ) : (
              shortcutMultiSelectMode ? (
                <>
                  <ContextMenuItem
                    label={t('context.deleteSelected', { defaultValue: '删除已选' })}
                    onSelect={requestBulkDeleteShortcuts}
                    variant="destructive"
                    disabled={selectedShortcutCount <= 0}
                  />
                  <ContextMenuItem
                    label={t('context.cancelMultiSelect', { defaultValue: '退出多选' })}
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
                    onSelect={() => {
                      onCreateShortcut(shortcuts.length);
                      setContextMenu(null);
                    }}
                  />
                  <ContextMenuItem
                    label={t('context.multiSelect', { defaultValue: '多选' })}
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
        <div className="fixed bottom-6 left-1/2 z-[15025] -translate-x-1/2 rounded-full border border-border bg-popover/95 px-3 py-2 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground min-w-[88px]">
              {t('context.selectedCount', { count: selectedShortcutCount, defaultValue: '已选 {{count}} 项' })}
            </span>
            <div ref={multiSelectMoveRef} className="relative">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-xl"
                title={t('context.moveToScenario', { defaultValue: '移动到情景模式' })}
                aria-label={t('context.moveToScenario', { defaultValue: '移动到情景模式' })}
                aria-expanded={multiSelectMoveOpen}
                onClick={() => setMultiSelectMoveOpen((prev) => !prev)}
              >
                <RiFolderTransferLine className="size-4" />
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
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-xl"
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
