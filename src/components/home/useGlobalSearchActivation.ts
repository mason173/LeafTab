import { useEffect } from 'react';
import type { SearchActivationHandle } from '@/components/search/searchActivation.shared';

const SEARCH_ACTIVATION_BLOCKING_SELECTOR = [
  '[data-slot="dialog-content"]',
  '[data-slot="alert-dialog-content"]',
  '[data-slot="sheet-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="select-content"]',
  '[data-slot="dropdown-menu-content"]',
].join(', ');

function resolveEventTargetElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
}

function isEditableElement(target: EventTarget | null): boolean {
  const element = resolveEventTargetElement(target);
  if (!element) return false;

  if (element instanceof HTMLElement && element.isContentEditable) {
    return true;
  }

  return Boolean(
    element.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
    ),
  );
}

function hasOpenBlockingLayer() {
  return Boolean(document.querySelector(SEARCH_ACTIVATION_BLOCKING_SELECTOR));
}

function isPrintableActivationKey(event: KeyboardEvent) {
  if (event.defaultPrevented || event.repeat || event.isComposing) return false;
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  return event.key.length === 1;
}

function isSearchInputFocused(target: SearchActivationHandle) {
  return Boolean(target.inputRef.current && document.activeElement === target.inputRef.current);
}

export function useGlobalSearchActivation(target: SearchActivationHandle | null) {
  useEffect(() => {
    if (!target) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.visibilityState === 'hidden') return;
      const targetElement = resolveEventTargetElement(event.target);
      const searchInputFocused = isSearchInputFocused(target);
      const isFocusHotkey = (event.metaKey || event.ctrlKey)
        && !event.shiftKey
        && !event.altKey
        && event.key.toLowerCase() === 'k';

      if (isFocusHotkey) {
        if (isEditableElement(targetElement) && !searchInputFocused) return;
        if (hasOpenBlockingLayer()) return;
        event.preventDefault();
        target.focusInput({ select: true, openHistory: 'first' });
        return;
      }

      if (searchInputFocused) {
        if (!target.anyKeyCaptureEnabled) return;
        if (!isPrintableActivationKey(event)) return;
        if (!target.consumeFocusedPrintableCapture?.()) return;
        if (targetElement === target.inputRef.current) {
          return;
        }
        event.preventDefault();
        target.appendText(event.key);
        return;
      }
      if (isEditableElement(targetElement)) return;
      if (hasOpenBlockingLayer()) return;

      if (!target.anyKeyCaptureEnabled) return;
      if (!isPrintableActivationKey(event)) return;

      event.preventDefault();
      target.appendText(event.key);
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (document.visibilityState === 'hidden') return;
      if (isSearchInputFocused(target)) return;
      if (isEditableElement(event.target)) return;
      if (hasOpenBlockingLayer()) return;

      const pastedText = event.clipboardData?.getData('text');
      if (!pastedText) return;

      event.preventDefault();
      target.appendText(pastedText);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('paste', handlePaste, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('paste', handlePaste, true);
    };
  }, [target]);
}
