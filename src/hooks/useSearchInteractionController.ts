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
  historySelectedIndex: number;
  setHistorySelectedIndex: (next: number | ((prev: number) => number)) => void;
  searchActions: SearchAction[];
  activateSearchAction: (action: SearchAction) => void;
  tabSwitchSearchEngine: boolean;
  enableSearchEngineSwitcher: boolean;
  cycleSearchEngine: (direction: 1 | -1) => void;
  dropdownOpen: boolean;
  setDropdownOpen: (next: boolean) => void;
  searchAnyKeyCaptureEnabled: boolean;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  setSearchValue: (next: string | ((prev: string) => string)) => void;
  onKeyboardNavigate?: () => void;
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
  searchActions,
  activateSearchAction,
  tabSwitchSearchEngine,
  enableSearchEngineSwitcher,
  cycleSearchEngine,
  dropdownOpen,
  setDropdownOpen,
  searchAnyKeyCaptureEnabled,
  searchInputRef,
  setSearchValue,
  onKeyboardNavigate,
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
        onKeyboardNavigate?.();
        openHistoryPanel({
          select: 'first',
          itemCount: searchActions.length,
        });
        return;
      }

      if (target === input) return;
      // Focus first and let the browser/IME handle the current key naturally.
      // Manually appending event.key breaks IME pinyin composition (e.g. "ren" loses the first letter).
      input.focus();
      openHistoryPanel({ select: 'none' });
    };

    window.addEventListener('keydown', handleGlobalSearchHotkey);
    return () => window.removeEventListener('keydown', handleGlobalSearchHotkey);
  }, [
    searchActions.length,
    openHistoryPanel,
    onKeyboardNavigate,
    searchAnyKeyCaptureEnabled,
    searchInputRef,
    setSearchValue,
  ]);

  return {
    suggestionModifierHeld,
    handleSuggestionKeyDown,
  };
}
