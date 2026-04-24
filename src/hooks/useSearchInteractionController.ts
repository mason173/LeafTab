import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import type { SearchAction } from '@/utils/searchActions';

const MAX_NUMBER_HOTKEY_SLOTS = 10;

function resolveNumberHotkeyIndex(key: string): number | null {
  if (key >= '1' && key <= '9') {
    return Number(key) - 1;
  }
  if (key === '0') return 9;
  return null;
}

type UseSearchInteractionControllerArgs = {
  historyOpen: boolean;
  openHistoryPanel: (options?: { select?: 'keep' | 'first' | 'none'; itemCount?: number }) => void;
  closeHistoryPanel: (reason?: 'manual' | 'escape' | 'outside' | 'submit' | 'selection' | 'hotkey') => void;
  setHistorySelectedIndex: (next: number | ((prev: number) => number)) => void;
  searchActions: SearchAction[];
  activateSearchAction: (action: SearchAction) => void;
  tabSwitchSearchEngine: boolean;
  enableSearchEngineSwitcher: boolean;
  cycleSearchEngine: (direction: 1 | -1) => void;
  dropdownOpen: boolean;
  setDropdownOpen: (next: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onKeyboardNavigate?: () => void;
  actionModeActive?: boolean;
  actionModeActionCount?: number;
  enterActionMode?: () => void;
  exitActionMode?: () => void;
  cycleActionModeSelection?: () => void;
  activateSelectedSecondaryAction?: () => void;
};

type UseSearchInteractionControllerResult = {
  suggestionModifierHeld: boolean;
  handleSuggestionKeyDown: (e: React.KeyboardEvent) => void;
};

export function useSearchInteractionController({
  historyOpen,
  openHistoryPanel,
  closeHistoryPanel,
  setHistorySelectedIndex,
  searchActions,
  activateSearchAction,
  tabSwitchSearchEngine,
  enableSearchEngineSwitcher,
  cycleSearchEngine,
  dropdownOpen,
  setDropdownOpen,
  searchInputRef,
  onKeyboardNavigate,
  actionModeActive = false,
  actionModeActionCount = 0,
  enterActionMode,
  exitActionMode,
  cycleActionModeSelection,
  activateSelectedSecondaryAction,
}: UseSearchInteractionControllerArgs): UseSearchInteractionControllerResult {
  const [suggestionModifierHeld, setSuggestionModifierHeld] = useState(false);

  useEffect(() => {
    if (!historyOpen) {
      setSuggestionModifierHeld(false);
      return;
    }
    const syncModifierState = (event?: KeyboardEvent) => {
      if (!event) {
        setSuggestionModifierHeld(false);
        return;
      }
      setSuggestionModifierHeld(Boolean(event.metaKey || event.ctrlKey));
    };

    const handleKeyDown = (event: KeyboardEvent) => syncModifierState(event);
    const handleKeyUp = (event: KeyboardEvent) => syncModifierState(event);
    const handleWindowBlur = () => setSuggestionModifierHeld(false);

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [historyOpen]);

  const handleSuggestionKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (actionModeActive && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      exitActionMode?.();
    }

    if (actionModeActive && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      activateSelectedSecondaryAction?.();
      return;
    }

    if (historyOpen && e.key === 'ArrowRight' && actionModeActionCount > 0) {
      e.preventDefault();
      e.stopPropagation();
      onKeyboardNavigate?.();
      if (!actionModeActive) {
        enterActionMode?.();
      } else {
        cycleActionModeSelection?.();
      }
      return;
    }

    if (historyOpen && actionModeActive && e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      exitActionMode?.();
      return;
    }

    const hasNumberHotkeyModifier = (e.metaKey || e.ctrlKey) && !e.altKey;
    if (historyOpen && hasNumberHotkeyModifier) {
      const hotkeyIndex = resolveNumberHotkeyIndex(e.key);
      if (hotkeyIndex !== null && hotkeyIndex < MAX_NUMBER_HOTKEY_SLOTS) {
        e.preventDefault();
        e.stopPropagation();
        const action = searchActions[hotkeyIndex];
        if (action) {
          activateSearchAction(action);
        }
        return;
      }
    }

    if (e.key === 'Escape' && historyOpen) {
      e.preventDefault();
      e.stopPropagation();
      if (actionModeActive) {
        exitActionMode?.();
        return;
      }
      closeHistoryPanel('escape');
      searchInputRef.current?.focus();
      return;
    }

    if (e.key === 'Tab' && enableSearchEngineSwitcher && tabSwitchSearchEngine) {
      e.preventDefault();
      cycleSearchEngine(e.shiftKey ? -1 : 1);
      if (dropdownOpen) setDropdownOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onKeyboardNavigate?.();
      if (!historyOpen) {
        openHistoryPanel({
          select: 'first',
          itemCount: searchActions.length,
        });
      } else if (searchActions.length > 0) {
        setHistorySelectedIndex((prev) => (prev + 1) % searchActions.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onKeyboardNavigate?.();
      if (historyOpen && searchActions.length > 0) {
        setHistorySelectedIndex((prev) => (
          prev === -1
            ? searchActions.length - 1
            : (prev - 1 + searchActions.length) % searchActions.length
        ));
      }
      return;
    }
  }, [
    activateSearchAction,
    cycleSearchEngine,
    dropdownOpen,
    enableSearchEngineSwitcher,
    historyOpen,
    searchActions,
    openHistoryPanel,
    setDropdownOpen,
    closeHistoryPanel,
    onKeyboardNavigate,
    setHistorySelectedIndex,
    tabSwitchSearchEngine,
    actionModeActionCount,
    actionModeActive,
    activateSelectedSecondaryAction,
    cycleActionModeSelection,
    enterActionMode,
    exitActionMode,
  ]);

  return {
    suggestionModifierHeld,
    handleSuggestionKeyDown,
  };
}
