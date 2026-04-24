import { useEffect, useState } from 'react';

export function useCurrentBrowserTabId() {
  const [currentBrowserTabId, setCurrentBrowserTabId] = useState<number | null>(null);

  useEffect(() => {
    const tabsApi = globalThis.chrome?.tabs;
    const windowsApi = globalThis.chrome?.windows;
    if (!tabsApi?.query) return;

    const syncCurrentBrowserTabId = () => {
      tabsApi.query({ active: true, currentWindow: true }, (tabs) => {
        if (globalThis.chrome?.runtime?.lastError) {
          setCurrentBrowserTabId(null);
          return;
        }
        const activeTabId = tabs?.find((tab) => Number.isFinite(tab.id))?.id;
        setCurrentBrowserTabId(Number.isFinite(activeTabId) ? Number(activeTabId) : null);
      });
    };

    syncCurrentBrowserTabId();
    tabsApi.onActivated?.addListener(syncCurrentBrowserTabId);
    windowsApi?.onFocusChanged?.addListener(syncCurrentBrowserTabId);

    return () => {
      tabsApi.onActivated?.removeListener(syncCurrentBrowserTabId);
      windowsApi?.onFocusChanged?.removeListener(syncCurrentBrowserTabId);
    };
  }, []);

  return currentBrowserTabId;
}
