import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { toast } from '../components/ui/sonner';
import type { ContextMenuState, ScenarioMode, ScenarioShortcuts, Shortcut } from '../types';
import { defaultScenarioModes, makeScenarioId } from '@/scenario/scenario';

type SelectedShortcut = { index: number; shortcut: Shortcut } | null;
type TranslateFn = (key: string, options?: any) => string;

type UseShortcutActionsParams = {
  user: string | null;
  openInNewTab: boolean;
  translate: TranslateFn;
  reportDomain: (url: string) => void;
  shortcutModalMode: 'add' | 'edit';
  currentInsertIndex: number | null;
  currentEditScenarioId: string;
  selectedShortcut: SelectedShortcut;
  shortcutsPageCapacity: number;
  updateScenarioShortcuts: (updater: (prev: Shortcut[]) => Shortcut[]) => void;
  getMaxPageIndex: (length: number) => number;
  findInsertIndex: (startPageIndex: number) => { targetIndex: number; targetPage: number };
  localDirtyRef: MutableRefObject<boolean>;
  setScenarioModes: Dispatch<SetStateAction<ScenarioMode[]>>;
  setScenarioShortcuts: Dispatch<SetStateAction<ScenarioShortcuts>>;
  setSelectedScenarioId: Dispatch<SetStateAction<string>>;
  setScenarioEditOpen: Dispatch<SetStateAction<boolean>>;
  setCurrentEditScenarioId: Dispatch<SetStateAction<string>>;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  setShortcutEditOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedShortcut: Dispatch<SetStateAction<SelectedShortcut>>;
  setCurrentInsertIndex: Dispatch<SetStateAction<number | null>>;
  setShortcutDeleteOpen: Dispatch<SetStateAction<boolean>>;
};

export function useShortcutActions({
  user,
  openInNewTab,
  translate,
  reportDomain,
  shortcutModalMode,
  currentInsertIndex,
  currentEditScenarioId,
  selectedShortcut,
  shortcutsPageCapacity,
  updateScenarioShortcuts,
  getMaxPageIndex,
  findInsertIndex,
  localDirtyRef,
  setScenarioModes,
  setScenarioShortcuts,
  setSelectedScenarioId,
  setScenarioEditOpen,
  setCurrentEditScenarioId,
  setContextMenu,
  setShortcutEditOpen,
  setSelectedShortcut,
  setCurrentInsertIndex,
  setShortcutDeleteOpen,
}: UseShortcutActionsParams) {
  const handleCreateScenarioMode = useCallback((mode: Omit<ScenarioMode, 'id'>) => {
    const newMode: ScenarioMode = { id: makeScenarioId(), ...mode };
    setScenarioModes((prev) => [...prev, newMode]);
    setScenarioShortcuts((prev) => ({ ...prev, [newMode.id]: [] }));
    if (!user) localDirtyRef.current = true;
    setSelectedScenarioId(newMode.id);
    toast.success(translate('scenario.toast.created'));
  }, [localDirtyRef, setScenarioModes, setScenarioShortcuts, setSelectedScenarioId, translate, user]);

  const handleOpenEditScenarioMode = useCallback((id: string) => {
    setCurrentEditScenarioId(id);
    setScenarioEditOpen(true);
  }, [setCurrentEditScenarioId, setScenarioEditOpen]);

  const handleUpdateScenarioMode = useCallback((mode: Omit<ScenarioMode, 'id'>) => {
    const id = currentEditScenarioId;
    if (!id) return;
    setScenarioModes((prev) => prev.map((m) => (m.id === id ? { ...m, ...mode } : m)));
    toast.success(translate('scenario.toast.updated'));
  }, [currentEditScenarioId, setScenarioModes, translate]);

  const handleDeleteScenarioMode = useCallback((id: string) => {
    if (id === 'default') return;
    setScenarioModes((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((m) => m.id !== id);
      const fallbackId = next[0]?.id ?? defaultScenarioModes[0].id;
      setSelectedScenarioId((curr) => (curr === id ? fallbackId : curr));
      return next;
    });
    setScenarioShortcuts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (!user) localDirtyRef.current = true;
    toast.success(translate('scenario.toast.deleted'));
  }, [localDirtyRef, setScenarioModes, setScenarioShortcuts, setSelectedScenarioId, translate, user]);

  const handleShortcutOpen = useCallback((shortcut: Shortcut) => {
    let url = shortcut.url.trim();
    if (/^javascript:/i.test(url)) return;
    if (!url.includes('://')) url = `https://${url}`;
    reportDomain(url);
    if (openInNewTab) window.open(url, '_blank');
    else window.location.href = url;
  }, [openInNewTab, reportDomain]);

  const handleShortcutContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>, shortcutIndex: number, shortcut: Shortcut) => {
    event.preventDefault();
    event.stopPropagation();
    const menuWidth = 160;
    const menuHeight = 260;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    setContextMenu({ x, y, kind: 'shortcut', shortcutIndex, shortcut });
  }, [setContextMenu]);

  const handlePageContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const menuWidth = 160;
    const menuHeight = 52;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    setContextMenu({ x, y, kind: 'page' });
  }, [setContextMenu]);

  const handlePageReorder = useCallback((pageIndex: number, nextShortcuts: Shortcut[]) => {
    updateScenarioShortcuts((current) => {
      const start = pageIndex * shortcutsPageCapacity;
      const end = Math.min(start + shortcutsPageCapacity, current.length);
      return [...current.slice(0, start), ...nextShortcuts, ...current.slice(end)];
    });
  }, [shortcutsPageCapacity, updateScenarioShortcuts]);

  const moveShortcutToPage = useCallback((sourceIndex: number, targetPageInput: number, options?: { strict?: boolean; sourceShortcutId?: string }) => {
    updateScenarioShortcuts((current) => {
      const resolvedSourceIndex = (() => {
        const sourceId = options?.sourceShortcutId?.trim();
        if (sourceId) {
          const byId = current.findIndex((item) => item.id === sourceId);
          if (byId >= 0) return byId;
        }
        return sourceIndex;
      })();
      if (resolvedSourceIndex < 0 || resolvedSourceIndex >= current.length) return current;
      const maxPage = getMaxPageIndex(current.length);
      const targetPage = Math.max(0, targetPageInput);
      if (options?.strict && targetPage > maxPage) return current;
      const moving = current[resolvedSourceIndex];
      const rest = current.filter((_, index) => index !== resolvedSourceIndex);
      const insertIndex = Math.min(rest.length, targetPage * shortcutsPageCapacity);
      return [...rest.slice(0, insertIndex), moving, ...rest.slice(insertIndex)];
    });
  }, [getMaxPageIndex, shortcutsPageCapacity, updateScenarioShortcuts]);

  const handleSaveShortcutEdit = useCallback((title: string, url: string) => {
    if (!title || !url) {
      toast.error(translate('shortcutModal.errors.fillAll'), { description: translate('shortcutModal.errors.fillAllDesc') });
      return;
    }

    reportDomain(url);

    if (shortcutModalMode === 'add') {
      if (currentInsertIndex === null) return;
      const newShortcut: Shortcut = { id: Date.now().toString(), title, url, icon: '' };
      updateScenarioShortcuts((current) => {
        const insertIndex = Math.min(Math.max(currentInsertIndex, 0), current.length);
        return [...current.slice(0, insertIndex), newShortcut, ...current.slice(insertIndex)];
      });
    } else {
      if (!selectedShortcut) return;
      let newIcon = selectedShortcut.shortcut.icon;
      if (url !== selectedShortcut.shortcut.url && newIcon.includes('api.iowen.cn')) newIcon = '';
      updateScenarioShortcuts((current) => current.map((item, index) => (
        index === selectedShortcut.index ? { ...item, title, url, icon: newIcon } : item
      )));
    }
    setShortcutEditOpen(false);
    setSelectedShortcut(null);
    setCurrentInsertIndex(null);
  }, [currentInsertIndex, reportDomain, selectedShortcut, setCurrentInsertIndex, setSelectedShortcut, setShortcutEditOpen, shortcutModalMode, translate, updateScenarioShortcuts]);

  const handleConfirmDeleteShortcut = useCallback(() => {
    if (!selectedShortcut) return;
    updateScenarioShortcuts((current) => current.filter((_, index) => index !== selectedShortcut.index));
    setShortcutDeleteOpen(false);
    setSelectedShortcut(null);
  }, [selectedShortcut, setSelectedShortcut, setShortcutDeleteOpen, updateScenarioShortcuts]);

  const findOrCreateAvailableIndex = useCallback((startPageIndex: number) => {
    const result = findInsertIndex(startPageIndex);
    return result;
  }, [findInsertIndex]);

  const handleDeletePage = useCallback((pageIndex: number) => {
    updateScenarioShortcuts((current) => {
      const start = pageIndex * shortcutsPageCapacity;
      const end = Math.min(start + shortcutsPageCapacity, current.length);
      return [...current.slice(0, start), ...current.slice(end)];
    });
  }, [shortcutsPageCapacity, updateScenarioShortcuts]);

  return {
    handleCreateScenarioMode,
    handleOpenEditScenarioMode,
    handleUpdateScenarioMode,
    handleDeleteScenarioMode,
    handleShortcutOpen,
    handleShortcutContextMenu,
    handlePageContextMenu,
    handlePageReorder,
    moveShortcutToPage,
    handleSaveShortcutEdit,
    handleConfirmDeleteShortcut,
    findOrCreateAvailableIndex,
    handleDeletePage,
  };
}
