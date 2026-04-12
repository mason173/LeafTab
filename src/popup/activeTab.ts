import { getExtensionRuntime, getTabsApi } from '@/platform/runtime';

export type ActiveTabPrefill = {
  title: string;
  url: string;
  icon: string;
};

const SAVEABLE_PROTOCOLS = new Set(['http:', 'https:']);

function readTabUrl(tab: Pick<chrome.tabs.Tab, 'url' | 'pendingUrl'>) {
  const rawUrl = typeof tab.pendingUrl === 'string' && tab.pendingUrl.trim()
    ? tab.pendingUrl
    : typeof tab.url === 'string'
      ? tab.url
      : '';
  return rawUrl.trim();
}

function buildFallbackTitle(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./i, '');
  } catch {
    return '';
  }
}

export function isSaveableShortcutUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return SAVEABLE_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

export function buildShortcutPrefillFromTab(tab: Pick<chrome.tabs.Tab, 'url' | 'pendingUrl' | 'title' | 'favIconUrl'>): ActiveTabPrefill {
  const url = readTabUrl(tab);
  const title = (typeof tab.title === 'string' ? tab.title : '').trim() || buildFallbackTitle(url);
  return {
    title,
    url,
    icon: typeof tab.favIconUrl === 'string' ? tab.favIconUrl.trim() : '',
  };
}

export async function queryCurrentTabPrefill(): Promise<ActiveTabPrefill> {
  const tabsApi = getTabsApi();
  const runtime = getExtensionRuntime();
  if (!tabsApi?.query) {
    return {
      title: '',
      url: '',
      icon: '',
    };
  }

  return new Promise((resolve) => {
    tabsApi.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (runtime?.lastError || !Array.isArray(tabs) || tabs.length === 0) {
        resolve({
          title: '',
          url: '',
          icon: '',
        });
        return;
      }

      resolve(buildShortcutPrefillFromTab(tabs[0]));
    });
  });
}
