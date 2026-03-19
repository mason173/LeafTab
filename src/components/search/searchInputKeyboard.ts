import type React from 'react';

export function isSearchImeComposingEvent(e: React.KeyboardEvent): boolean {
  const isModifierDigitHotkey = (e.metaKey || e.ctrlKey) && /^[0-9]$/.test(e.key);
  if (isModifierDigitHotkey) return false;

  const navigationKeys = new Set([
    'Escape',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Backspace',
    'Delete',
    'Home',
    'End',
    'PageUp',
    'PageDown',
  ]);
  if (navigationKeys.has(e.key)) return false;

  const native = e.nativeEvent as KeyboardEvent;
  return Boolean(native.isComposing || e.key === 'Process');
}

export function shouldBlockSearchSubmitForIme(
  e: React.KeyboardEvent,
  options?: {
    allowSelectedSuggestionEnter?: boolean;
  },
): boolean {
  if (options?.allowSelectedSuggestionEnter && e.key === 'Enter') {
    return false;
  }
  return isSearchImeComposingEvent(e);
}
