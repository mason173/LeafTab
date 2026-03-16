import { useEffect, type RefObject } from 'react';

const NEWTAB_BOOTSTRAP_FOCUS_PARAM = 'nt';
const NEWTAB_BOOTSTRAP_FOCUS_VALUE = '1';
const NEWTAB_FOCUS_RETRY_DELAY_MS = 60;
const NEWTAB_FOCUS_MAX_ATTEMPTS = 20;
const NEWTAB_FOCUS_MAX_DURATION_MS = 1800;

const hasBootstrapFocusParam = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(NEWTAB_BOOTSTRAP_FOCUS_PARAM) === NEWTAB_BOOTSTRAP_FOCUS_VALUE;
  } catch {
    return false;
  }
};

const cleanupBootstrapFocusParam = () => {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get(NEWTAB_BOOTSTRAP_FOCUS_PARAM) === NEWTAB_BOOTSTRAP_FOCUS_VALUE) {
      url.searchParams.delete(NEWTAB_BOOTSTRAP_FOCUS_PARAM);
      const cleanedSearch = url.searchParams.toString();
      const cleanedUrl = `${url.pathname}${cleanedSearch ? `?${cleanedSearch}` : ''}${url.hash}`;
      window.history.replaceState(window.history.state, '', cleanedUrl);
    }
  } catch {}
};

const hasOpenModal = () => Boolean(
  document.querySelector('[data-slot="dialog-content"], [data-slot="alert-dialog-content"], [data-slot="sheet-content"]')
);

const isEditableElement = (el: Element | null) => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return el.isContentEditable
    || tag === 'textarea'
    || tag === 'select'
    || (tag === 'input' && el.getAttribute('type') !== 'button');
};

export function useNewtabBootstrapFocus(pageFocusRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!hasBootstrapFocusParam()) return;
    cleanupBootstrapFocusParam();

    let disposed = false;
    let completed = false;
    let attempts = 0;
    let focusTimer: number | null = null;
    const startedAt = Date.now();

    const hasExceededFocusWindow = () => Date.now() - startedAt > NEWTAB_FOCUS_MAX_DURATION_MS;

    const stop = () => {
      if (completed) return;
      completed = true;
      if (focusTimer !== null) {
        window.clearTimeout(focusTimer);
        focusTimer = null;
      }
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };

    const scheduleFocus = (delay = NEWTAB_FOCUS_RETRY_DELAY_MS) => {
      if (disposed || completed || focusTimer !== null) return;
      if (attempts >= NEWTAB_FOCUS_MAX_ATTEMPTS || hasExceededFocusWindow()) {
        stop();
        return;
      }
      focusTimer = window.setTimeout(() => {
        focusTimer = null;
        tryFocusPage();
      }, delay);
    };

    const tryFocusPage = () => {
      if (disposed || completed) return;
      if (attempts >= NEWTAB_FOCUS_MAX_ATTEMPTS || hasExceededFocusWindow()) {
        stop();
        return;
      }
      attempts += 1;
      if (hasOpenModal()) {
        scheduleFocus();
        return;
      }

      const activeElement = document.activeElement;
      if (
        activeElement
        && activeElement !== document.body
        && activeElement !== document.documentElement
        && activeElement !== pageFocusRef.current
        && isEditableElement(activeElement)
      ) {
        stop();
        return;
      }

      const focusTarget = pageFocusRef.current || document.body || document.documentElement;
      if (!focusTarget) {
        scheduleFocus();
        return;
      }

      try {
        focusTarget.focus({ preventScroll: true });
      } catch {
        focusTarget.focus();
      }

      if (document.activeElement === focusTarget || document.activeElement === document.body) {
        stop();
        return;
      }
      scheduleFocus();
    };

    const handleWindowFocus = () => scheduleFocus(0);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') scheduleFocus(0);
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    scheduleFocus(0);

    return () => {
      disposed = true;
      stop();
    };
  }, [pageFocusRef]);
}
