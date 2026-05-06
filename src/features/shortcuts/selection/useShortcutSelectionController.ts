import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import type { ContextMenuState, ScenarioMode, Shortcut } from '@/types';
import { extractDomainFromUrl } from '@/utils';
import { isShortcutFolder, isShortcutLink } from '@/utils/shortcutFolders';

type ShortcutSelectionControllerParams = {
  contextMenu: ContextMenuState | null;
  setContextMenu: (value: ContextMenuState | null) => void;
  shortcuts: Shortcut[];
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  onCreateFolder: (selectedIndexes: number[]) => void;
  onDeleteSelectedShortcuts: (selectedIndexes: number[]) => void;
  onMoveSelectedShortcutsToScenario: (selectedIndexes: number[], targetScenarioId: string) => void;
  onMoveSelectedShortcutsToFolder: (selectedIndexes: number[], targetFolderId: string) => void;
  onPinSelectedShortcuts: (selectedIndexes: number[], position: 'top' | 'bottom') => number[] | void;
};

function copyShortcutHostname(raw: string, onSuccess: () => void, onError: () => void) {
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
    onError();
    return;
  }

  navigator.clipboard.writeText(hostname).then(() => {
    onSuccess();
  }).catch(() => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = hostname;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      onSuccess();
    } catch {
      onError();
    }
  });
}

export function useShortcutSelectionController({
  contextMenu,
  setContextMenu,
  shortcuts,
  scenarioModes,
  selectedScenarioId,
  onCreateFolder,
  onDeleteSelectedShortcuts,
  onMoveSelectedShortcutsToScenario,
  onMoveSelectedShortcutsToFolder,
  onPinSelectedShortcuts,
}: ShortcutSelectionControllerParams) {
  const { t } = useTranslation();
  const [shortcutMultiSelectMode, setShortcutMultiSelectMode] = useState(false);
  const [selectedShortcutIndexesState, setSelectedShortcutIndexesState] = useState<number[]>([]);
  const [bulkShortcutDeleteOpen, setBulkShortcutDeleteOpen] = useState(false);
  const [multiSelectMoveOpen, setMultiSelectMoveOpen] = useState(false);
  const [multiSelectFolderOpen, setMultiSelectFolderOpen] = useState(false);
  const [contextScenarioMoveOpen, setContextScenarioMoveOpen] = useState(false);
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
  const sortedSelectedShortcutIndexes = useMemo(
    () => [...selectedShortcutIndexesState].sort((a, b) => a - b),
    [selectedShortcutIndexesState],
  );
  const pinTopDisabled = useMemo(() => {
    if (sortedSelectedShortcutIndexes.length === 0) return true;
    return sortedSelectedShortcutIndexes.every((index, position) => index === position);
  }, [sortedSelectedShortcutIndexes]);
  const pinBottomDisabled = useMemo(() => {
    if (sortedSelectedShortcutIndexes.length === 0) return true;
    const startIndex = shortcuts.length - sortedSelectedShortcutIndexes.length;
    return sortedSelectedShortcutIndexes.every((index, position) => index === startIndex + position);
  }, [shortcuts.length, sortedSelectedShortcutIndexes]);
  const selectAllDisabled = shortcuts.length === 0 || selectedShortcutIndexesState.length === shortcuts.length;

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

  const selectAllShortcuts = useCallback(() => {
    if (shortcuts.length === 0) return;
    setSelectedShortcutIndexesState(shortcuts.map((_, index) => index));
    setContextMenu(null);
  }, [setContextMenu, shortcuts]);

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
    if (position === 'top' && pinTopDisabled) return;
    if (position === 'bottom' && pinBottomDisabled) return;
    const nextSelectedShortcutIndexes = onPinSelectedShortcuts(selectedShortcutIndexesState, position);
    if (Array.isArray(nextSelectedShortcutIndexes)) {
      setSelectedShortcutIndexesState(nextSelectedShortcutIndexes);
    }
    setContextMenu(null);
  }, [onPinSelectedShortcuts, pinBottomDisabled, pinTopDisabled, selectedShortcutIndexesState, setContextMenu]);

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

  const handleMoveSingleShortcutToScenario = useCallback((shortcutIndex: number, targetScenarioId: string) => {
    if (!targetScenarioId || targetScenarioId === selectedScenarioId) return;
    if (!Number.isInteger(shortcutIndex) || shortcutIndex < 0 || shortcutIndex >= shortcuts.length) return;
    onMoveSelectedShortcutsToScenario([shortcutIndex], targetScenarioId);
    setContextScenarioMoveOpen(false);
    setContextMenu(null);
  }, [onMoveSelectedShortcutsToScenario, selectedScenarioId, setContextMenu, shortcuts.length]);

  const handleCopyShortcutLink = useCallback((shortcut: Shortcut) => {
    copyShortcutHostname(
      shortcut.url || '',
      () => {
        toast.success(t('toast.linkCopied'));
      },
      () => {
        toast.error(t('toast.linkCopyFailed'));
      },
    );
    setContextMenu(null);
  }, [setContextMenu, t]);

  useEffect(() => {
    setSelectedShortcutIndexesState((prev) => prev.filter((index) => index >= 0 && index < shortcuts.length));
  }, [shortcuts.length]);

  useEffect(() => {
    clearShortcutMultiSelect();
  }, [clearShortcutMultiSelect, selectedScenarioId]);

  useEffect(() => {
    setContextScenarioMoveOpen(false);
  }, [contextMenu]);

  return {
    t,
    shortcutMultiSelectMode,
    selectedShortcutIndexes,
    selectedShortcutCount,
    moveTargetScenarioModes,
    moveTargetFolders,
    selectedLinkCount,
    selectedFolderCount,
    pinTopDisabled,
    pinBottomDisabled,
    selectAllDisabled,
    bulkShortcutDeleteOpen,
    setBulkShortcutDeleteOpen,
    multiSelectMoveOpen,
    setMultiSelectMoveOpen,
    multiSelectFolderOpen,
    setMultiSelectFolderOpen,
    contextScenarioMoveOpen,
    setContextScenarioMoveOpen,
    multiSelectMoveRef,
    multiSelectFolderRef,
    clearShortcutMultiSelect,
    openShortcutMultiSelect,
    toggleShortcutMultiSelect,
    selectAllShortcuts,
    requestBulkDeleteShortcuts,
    handleConfirmBulkDeleteShortcuts,
    handlePinSelectedShortcuts,
    handleMoveSelectedShortcutsToScenario,
    handleCreateFolder,
    handleMoveSelectedShortcutsToFolder,
    handleMoveSingleShortcutToScenario,
    handleCopyShortcutLink,
  };
}
