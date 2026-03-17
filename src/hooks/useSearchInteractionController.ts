import { useCallback, useEffect, useState } from 'react';
import type React from 'react';
import type { SearchSuggestionItem } from '@/types';

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
  historySelectedIndex: number;
  setHistorySelectedIndex: (next: number | ((prev: number) => number)) => void;
  mergedSuggestionItems: SearchSuggestionItem[];
  openSuggestionItem: (item: SearchSuggestionItem) => void;
  tabSwitchSearchEngine: boolean;
  enableSearchEngineSwitcher: boolean;
  cycleSearchEngine: (direction: 1 | -1) => void;
  dropdownOpen: boolean;
  setDropdownOpen: (next: boolean) => void;
  searchAnyKeyCaptureEnabled: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  setSearchValue: (next: string | ((prev: string) => string)) => void;
  tabsPanelActive: boolean;
  protectedTabId?: number | null;
  onProtectedTabCloseAttempt: () => void;
  closeSelectedTabSuggestion: (item: SearchSuggestionItem) => void;
  closeOtherTabsSuggestions: (item: SearchSuggestionItem) => void;
};

type UseSearchInteractionControllerResult = {
  suggestionModifierHeld: boolean;
  handleSuggestionKeyDown: (e: React.KeyboardEvent) => void;
};

export function useSearchInteractionController({
  historyOpen,
  openHistoryPanel,
  closeHistoryPanel,
  historySelectedIndex,
  setHistorySelectedIndex,
  mergedSuggestionItems,
  openSuggestionItem,
  tabSwitchSearchEngine,
  enableSearchEngineSwitcher,
  cycleSearchEngine,
  dropdownOpen,
  setDropdownOpen,
  searchAnyKeyCaptureEnabled,
  searchInputRef,
  setSearchValue,
  tabsPanelActive,
  protectedTabId,
  onProtectedTabCloseAttempt,
  closeSelectedTabSuggestion,
  closeOtherTabsSuggestions,
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
    const hasNumberHotkeyModifier = (e.metaKey || e.ctrlKey) && !e.altKey;
    if (historyOpen && hasNumberHotkeyModifier) {
      const hotkeyIndex = resolveNumberHotkeyIndex(e.key);
      if (hotkeyIndex !== null && hotkeyIndex < MAX_NUMBER_HOTKEY_SLOTS) {
        e.preventDefault();
        e.stopPropagation();
        const suggestion = mergedSuggestionItems[hotkeyIndex];
        if (suggestion) {
          openSuggestionItem(suggestion);
        }
        return;
      }
    }

    const selectedSuggestion = historySelectedIndex !== -1
      ? mergedSuggestionItems[historySelectedIndex]
      : null;
    const activeTabSuggestion = selectedSuggestion?.type === 'tab'
      ? selectedSuggestion
      : (tabsPanelActive
        ? (mergedSuggestionItems.find((item) => item.type === 'tab' && item.tabId !== protectedTabId) ?? null)
        : null);
    const deleteKeyPressed = e.key === 'Backspace' || e.key === 'Delete';
    if (
      tabsPanelActive &&
      historyOpen &&
      deleteKeyPressed &&
      activeTabSuggestion
    ) {
      e.preventDefault();
      e.stopPropagation();
      if (!e.shiftKey && activeTabSuggestion.tabId === protectedTabId) {
        onProtectedTabCloseAttempt();
        return;
      }
      if (e.shiftKey) {
        closeOtherTabsSuggestions(activeTabSuggestion);
      } else {
        closeSelectedTabSuggestion(activeTabSuggestion);
      }
      return;
    }

    if (e.key === 'Escape' && historyOpen) {
      e.preventDefault();
      closeHistoryPanel('escape');
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
      if (!historyOpen) {
        openHistoryPanel({
          select: 'first',
          itemCount: mergedSuggestionItems.length,
        });
      } else if (mergedSuggestionItems.length > 0) {
        setHistorySelectedIndex((prev) => (prev + 1) % mergedSuggestionItems.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyOpen && mergedSuggestionItems.length > 0) {
        setHistorySelectedIndex((prev) => (
          prev === -1
            ? mergedSuggestionItems.length - 1
            : (prev - 1 + mergedSuggestionItems.length) % mergedSuggestionItems.length
        ));
      }
      return;
    }
    if (e.key === 'Enter') {
      if (historySelectedIndex !== -1 && mergedSuggestionItems[historySelectedIndex]) {
        e.preventDefault();
        openSuggestionItem(mergedSuggestionItems[historySelectedIndex]);
      }
    }
  }, [
    cycleSearchEngine,
    dropdownOpen,
    enableSearchEngineSwitcher,
    historyOpen,
    historySelectedIndex,
    mergedSuggestionItems,
    openSuggestionItem,
    openHistoryPanel,
    setDropdownOpen,
    closeHistoryPanel,
    closeOtherTabsSuggestions,
    closeSelectedTabSuggestion,
    onProtectedTabCloseAttempt,
    protectedTabId,
    setHistorySelectedIndex,
    tabsPanelActive,
    tabSwitchSearchEngine,
  ]);

  useEffect(() => {
    const handleGlobalSearchHotkey = (event: KeyboardEvent) => {
      const isHotkey = (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'k';
      const isPasteHotkey = (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'v';
      const isPrintableKey = !event.metaKey && !event.ctrlKey && !event.altKey && !event.isComposing && event.key.length === 1;
      if (!isHotkey && !isPasteHotkey && !isPrintableKey) return;
      if (isPrintableKey && !searchAnyKeyCaptureEnabled) return;

      const input = searchInputRef.current;
      if (!input) return;
      const target = event.target as HTMLElement | null;
      if (target && target !== input) {
        const tag = target.tagName.toLowerCase();
        const isEditable = target.isContentEditable || tag === 'textarea' || tag === 'select' || (tag === 'input' && target.getAttribute('type') !== 'button');
        if (isEditable) return;
      }
      const hasOpenModal = Boolean(
        document.querySelector('[data-slot="dialog-content"], [data-slot="alert-dialog-content"], [data-slot="sheet-content"]')
      );
      if (hasOpenModal && target !== input) return;

      if (isPasteHotkey) {
        if (target === input) return;
        input.focus();
        openHistoryPanel({ select: 'none' });
        return;
      }

      if (isHotkey) {
        event.preventDefault();
        input.focus();
        input.select();
        openHistoryPanel({
          select: 'first',
          itemCount: mergedSuggestionItems.length,
        });
        return;
      }

      if (target === input) return;
      event.preventDefault();
      input.focus();
      setSearchValue((prev) => `${prev}${event.key}`);
      openHistoryPanel({ select: 'none' });
      requestAnimationFrame(() => {
        const current = searchInputRef.current;
        if (!current) return;
        const len = current.value.length;
        current.setSelectionRange(len, len);
      });
    };

    window.addEventListener('keydown', handleGlobalSearchHotkey);
    return () => window.removeEventListener('keydown', handleGlobalSearchHotkey);
  }, [
    mergedSuggestionItems.length,
    openHistoryPanel,
    searchAnyKeyCaptureEnabled,
    searchInputRef,
    setSearchValue,
  ]);

  return {
    suggestionModifierHeld,
    handleSuggestionKeyDown,
  };
}
