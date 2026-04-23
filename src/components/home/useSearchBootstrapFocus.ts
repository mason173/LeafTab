import { useEffect, useRef } from 'react';
import type { SearchActivationHandle } from '@/components/search/searchActivation.shared';

const SEARCH_BOOTSTRAP_RETRY_DELAY_MS = 60;
const SEARCH_BOOTSTRAP_MAX_ATTEMPTS = 20;
const SEARCH_BOOTSTRAP_MAX_DURATION_MS = 1800;

function isEditableTarget(target: Element | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return target.isContentEditable
    || tag === 'textarea'
    || tag === 'select'
    || (tag === 'input' && target.getAttribute('type') !== 'button');
}

export function useSearchBootstrapFocus(
  target: SearchActivationHandle | null,
  enabled = true,
) {
  const completedTargetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !target) {
      completedTargetIdRef.current = null;
      return;
    }

    if (completedTargetIdRef.current === target.id) {
      return;
    }

    let disposed = false;
    let attempts = 0;
    let retryTimer: number | null = null;
    const startedAt = Date.now();

    const clearRetry = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const stop = (completed = false) => {
      clearRetry();
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (completed) {
        completedTargetIdRef.current = target.id;
      }
    };

    const scheduleRetry = (delay = SEARCH_BOOTSTRAP_RETRY_DELAY_MS) => {
      if (disposed || retryTimer !== null) return;
      if (attempts >= SEARCH_BOOTSTRAP_MAX_ATTEMPTS) {
        stop();
        return;
      }
      if (Date.now() - startedAt > SEARCH_BOOTSTRAP_MAX_DURATION_MS) {
        stop();
        return;
      }

      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        tryFocus();
      }, delay);
    };

    const tryFocus = () => {
      if (disposed) return;
      const input = target.inputRef.current;
      if (!input) {
        scheduleRetry();
        return;
      }

      if (document.activeElement === input) {
        stop(true);
        return;
      }

      const activeElement = document.activeElement;
      if (
        activeElement
        && activeElement !== document.body
        && activeElement !== document.documentElement
        && activeElement !== input
        && isEditableTarget(activeElement)
      ) {
        stop();
        return;
      }

      attempts += 1;
      target.armFocusedPrintableCapture?.();
      target.focusInput();

      if (document.activeElement === input) {
        stop(true);
        return;
      }

      scheduleRetry();
    };

    const handleWindowFocus = () => scheduleRetry(0);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleRetry(0);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    scheduleRetry(0);

    return () => {
      disposed = true;
      stop();
    };
  }, [enabled, target]);
}
