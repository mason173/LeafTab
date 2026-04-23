import type { RefObject } from 'react';

export type SearchActivationFocusOptions = {
  select?: boolean;
  openHistory?: 'keep' | 'first' | 'none';
};

export type SearchActivationHandle = {
  id: string;
  inputRef: RefObject<HTMLInputElement | null>;
  anyKeyCaptureEnabled: boolean;
  focusInput: (options?: SearchActivationFocusOptions) => void;
  appendText: (text: string) => void;
  armFocusedPrintableCapture?: () => void;
  consumeFocusedPrintableCapture?: () => boolean;
};

export function focusSearchInputElement(
  input: HTMLInputElement,
  options?: SearchActivationFocusOptions,
) {
  try {
    input.focus({ preventScroll: true });
  } catch {
    input.focus();
  }

  if (options?.select) {
    input.select();
    return;
  }

  const cursor = input.value.length;
  try {
    input.setSelectionRange(cursor, cursor);
  } catch {}
}
