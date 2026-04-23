import { useEffect, type RefObject } from 'react';

const NEWTAB_BOOTSTRAP_FOCUS_PARAM = 'nt';
const NEWTAB_BOOTSTRAP_FOCUS_VALUE = '1';

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

export function useNewtabBootstrapFocus(_pageFocusRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!hasBootstrapFocusParam()) return;
    cleanupBootstrapFocusParam();
  }, []);
}
