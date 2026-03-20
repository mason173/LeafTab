type ChromeApi = typeof chrome;

type ManifestLike = {
  browser_specific_settings?: {
    gecko?: unknown;
  };
  applications?: {
    gecko?: unknown;
  };
};

export type ExtensionBrowserTarget = 'chromium' | 'firefox' | 'web';

export function getChromeApi(): ChromeApi | undefined {
  return (globalThis as { chrome?: ChromeApi }).chrome;
}

export function getExtensionRuntime(): ChromeApi['runtime'] | undefined {
  return getChromeApi()?.runtime;
}

export function getExtensionManifest(): ManifestLike | undefined {
  return getExtensionRuntime()?.getManifest?.() as ManifestLike | undefined;
}

export function isExtensionRuntime(): boolean {
  return Boolean(getExtensionRuntime()?.id);
}

export function getExtensionBrowserTarget(): ExtensionBrowserTarget {
  const manifest = getExtensionManifest();
  if (manifest?.browser_specific_settings?.gecko || manifest?.applications?.gecko) {
    return 'firefox';
  }

  try {
    const runtimeUrl = getExtensionRuntime()?.getURL?.('');
    if (typeof runtimeUrl === 'string' && runtimeUrl.startsWith('moz-extension://')) {
      return 'firefox';
    }
    if (typeof runtimeUrl === 'string' && runtimeUrl.startsWith('chrome-extension://')) {
      return 'chromium';
    }
  } catch {}

  if (typeof navigator !== 'undefined' && /firefox\//i.test(navigator.userAgent || '')) {
    return 'firefox';
  }

  if (isExtensionRuntime()) return 'chromium';
  return 'web';
}

export function isFirefoxExtension(): boolean {
  return getExtensionBrowserTarget() === 'firefox';
}

export function getPermissionsApi(): ChromeApi['permissions'] | undefined {
  return getChromeApi()?.permissions;
}

export function getTabsApi(): ChromeApi['tabs'] | undefined {
  return getChromeApi()?.tabs;
}

export function getWindowsApi(): ChromeApi['windows'] | undefined {
  return getChromeApi()?.windows;
}

export function getSearchApi(): ChromeApi['search'] | undefined {
  return getChromeApi()?.search;
}

export function getBookmarksApi(): ChromeApi['bookmarks'] | undefined {
  return getChromeApi()?.bookmarks;
}

export function getHistoryApi(): ChromeApi['history'] | undefined {
  return getChromeApi()?.history;
}
