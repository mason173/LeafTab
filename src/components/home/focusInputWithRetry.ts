import type { RefObject } from 'react';

const SEARCH_INPUT_FOCUS_RETRY_MS = 60;
const SEARCH_INPUT_FOCUS_MAX_ATTEMPTS = 20;

type FocusInputWithRetryOptions = {
  forceStealFocus?: boolean;
};

export function focusInputWithRetry(
  inputRef: RefObject<HTMLInputElement | null>,
  options?: FocusInputWithRetryOptions,
) {
  const { forceStealFocus = false } = options || {};
  let attempts = 0;
  let retryTimer: number | null = null;
  let rafId: number | null = null;

  const scheduleRetry = () => {
    if (attempts >= SEARCH_INPUT_FOCUS_MAX_ATTEMPTS) return;
    if (retryTimer !== null) return;
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      tryFocusInput();
    }, SEARCH_INPUT_FOCUS_RETRY_MS);
  };

  const tryFocusInput = () => {
    attempts += 1;
    const input = inputRef.current;
    if (!input) {
      scheduleRetry();
      return;
    }

    const activeElement = document.activeElement as HTMLElement | null;
    const activeTag = activeElement?.tagName?.toLowerCase() || '';
    const activeIsEditable = Boolean(
      activeElement
      && (
        activeElement.isContentEditable
        || activeTag === 'input'
        || activeTag === 'textarea'
        || activeTag === 'select'
      ),
    );

    if (!forceStealFocus && activeElement && activeElement !== input && activeIsEditable) {
      return;
    }

    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }

    const cursor = input.value.length;
    try {
      input.setSelectionRange(cursor, cursor);
    } catch {}

    if (document.activeElement !== input) {
      scheduleRetry();
    }
  };

  rafId = window.requestAnimationFrame(() => {
    tryFocusInput();
  });

  return () => {
    if (rafId !== null) window.cancelAnimationFrame(rafId);
    if (retryTimer !== null) window.clearTimeout(retryTimer);
  };
}
