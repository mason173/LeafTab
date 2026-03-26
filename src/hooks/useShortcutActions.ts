import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { toast } from '../components/ui/sonner';
import type { ContextMenuState, ScenarioMode, ScenarioShortcuts, Shortcut, ShortcutDraft } from '../types';
import { defaultScenarioModes, makeScenarioId } from '@/scenario/scenario';
import { getShortcutUrlIdentity, hasShortcutUrlConflict } from '@/utils/shortcutIdentity';

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
  updateScenarioShortcuts: (updater: (prev: Shortcut[]) => Shortcut[]) => void;
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
  updateScenarioShortcuts,
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
  const createShortcutId = () => {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch {}
    return `sht_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

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

  const handleGridContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    const menuWidth = 160;
    const menuHeight = 52;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    setContextMenu({ x, y, kind: 'grid' });
  }, [setContextMenu]);

  const handleShortcutReorder = useCallback((nextShortcuts: Shortcut[]) => {
    updateScenarioShortcuts(() => nextShortcuts);
  }, [updateScenarioShortcuts]);

  const handleSaveShortcutEdit = useCallback((draft: ShortcutDraft) => {
    const nextTitle = draft.title.trim();
    const nextUrl = draft.url.trim();
    if (!nextTitle || !nextUrl) {
      toast.error(translate('shortcutModal.errors.fillAll'), { description: translate('shortcutModal.errors.fillAllDesc') });
      return;
    }

    let duplicateFound = false;
    let saved = false;

    if (shortcutModalMode === 'add') {
      if (currentInsertIndex === null) return;
      updateScenarioShortcuts((current) => {
        if (hasShortcutUrlConflict(current, nextUrl)) {
          duplicateFound = true;
          return current;
        }
        const newShortcut: Shortcut = {
          id: createShortcutId(),
          title: nextTitle,
          url: nextUrl,
          icon: draft.icon || '',
          useOfficialIcon: draft.useOfficialIcon !== false,
          autoUseOfficialIcon: draft.autoUseOfficialIcon !== false,
          officialIconAvailableAtSave: draft.officialIconAvailableAtSave === true,
          iconRendering: draft.iconRendering,
          iconColor: draft.iconColor || '',
        };
        const insertIndex = Math.min(Math.max(currentInsertIndex, 0), current.length);
        saved = true;
        return [...current.slice(0, insertIndex), newShortcut, ...current.slice(insertIndex)];
      });
    } else {
      if (!selectedShortcut) return;
      updateScenarioShortcuts((current) => {
        if (hasShortcutUrlConflict(current, nextUrl, selectedShortcut.index)) {
          duplicateFound = true;
          return current;
        }
        let newIcon = draft.icon || selectedShortcut.shortcut.icon;
        const prevIdentity = getShortcutUrlIdentity(selectedShortcut.shortcut.url || '');
        const nextIdentity = getShortcutUrlIdentity(nextUrl);
        const urlChanged = nextIdentity ? prevIdentity !== nextIdentity : nextUrl !== (selectedShortcut.shortcut.url || '').trim();
        if (urlChanged && newIcon.includes('api.iowen.cn')) newIcon = '';
        saved = true;
        return current.map((item, index) => (
          index === selectedShortcut.index
            ? {
                ...item,
                title: nextTitle,
                url: nextUrl,
                icon: newIcon,
                useOfficialIcon: draft.useOfficialIcon !== false,
                autoUseOfficialIcon: draft.autoUseOfficialIcon !== false,
                officialIconAvailableAtSave: draft.officialIconAvailableAtSave === true,
                iconRendering: draft.iconRendering,
                iconColor: draft.iconColor || '',
              }
            : item
        ));
      });
    }

    if (duplicateFound) {
      toast.error(translate('shortcutModal.errors.duplicateUrl'));
      return;
    }

    if (!saved) return;

    reportDomain(nextUrl);
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

  const handleConfirmDeleteShortcuts = useCallback((indices: number[]) => {
    if (!Array.isArray(indices) || indices.length === 0) return;
    const validIndices = new Set(
      indices.filter((index) => Number.isInteger(index) && index >= 0),
    );
    if (validIndices.size === 0) return;
    updateScenarioShortcuts((current) => current.filter((_, index) => !validIndices.has(index)));
  }, [updateScenarioShortcuts]);

  return {
    handleCreateScenarioMode,
    handleOpenEditScenarioMode,
    handleUpdateScenarioMode,
    handleDeleteScenarioMode,
    handleShortcutOpen,
    handleShortcutContextMenu,
    handleGridContextMenu,
    handleShortcutReorder,
    handleSaveShortcutEdit,
    handleConfirmDeleteShortcut,
    handleConfirmDeleteShortcuts,
  };
}
