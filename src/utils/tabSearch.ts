import type { SearchSuggestionItem } from '@/types';
import {
  buildSearchMatchCandidates,
  getShortcutSuggestionScoreFromCandidates,
  normalizeSearchQuery,
} from '@/utils/searchHelpers';
import { yieldToMainThread } from '@/utils/mainThreadScheduler';

type TabsApi = typeof chrome.tabs;

type IndexedTab = {
  id: number;
  windowId?: number;
  tabIndex: number;
  label: string;
  value: string;
  icon: string;
  order: number;
  titleCandidates: string[];
  urlCandidates: string[];
};

const TAB_QUERY_CACHE_TTL_MS = 10_000;
const TAB_QUERY_CACHE_LIMIT = 50;
const TAB_QUERY_CACHE_KEY_LIMIT = 120;
const TAB_SEARCH_YIELD_INTERVAL = 250;
let tabIndexCache: IndexedTab[] | null = null;
let tabIndexPromise: Promise<IndexedTab[]> | null = null;
let tabListenersAttached = false;
const tabQueryCache = new Map<string, {
  cachedAt: number;
  items: SearchSuggestionItem[];
}>();

function queryAllTabs(tabsApi: TabsApi): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve) => {
    tabsApi.query({}, (tabs) => {
      if (globalThis.chrome?.runtime?.lastError) {
        resolve([]);
        return;
      }
      resolve(tabs || []);
    });
  });
}

function getAllWindowsWithTabs(): Promise<chrome.windows.Window[]> {
  const windowsApi = globalThis.chrome?.windows;
  if (!windowsApi?.getAll) return Promise.resolve([]);
  return new Promise((resolve) => {
    windowsApi.getAll({ populate: true, windowTypes: ['normal'] }, (windows) => {
      if (globalThis.chrome?.runtime?.lastError) {
        resolve([]);
        return;
      }
      resolve(windows || []);
    });
  });
}

function buildOrderedTabsFromWindows(windows: chrome.windows.Window[]): chrome.tabs.Tab[] {
  const ordered: chrome.tabs.Tab[] = [];
  windows.forEach((win) => {
    const tabs = (win.tabs || []).slice().sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    ordered.push(...tabs);
  });
  return ordered;
}

function indexTabs(tabs: chrome.tabs.Tab[]): IndexedTab[] {
  const indexed: IndexedTab[] = [];
  tabs.forEach((tab, order) => {
    if (!Number.isFinite(tab.id)) return;
    const tabId = Number(tab.id);
    const tabUrl = (tab.url || '').trim();
    const tabTitle = (tab.title || '').trim();
    const label = tabTitle || tabUrl || `Tab ${tabId}`;
    const value = tabUrl || label;
    indexed.push({
      id: tabId,
      windowId: Number.isFinite(tab.windowId) ? Number(tab.windowId) : undefined,
      tabIndex: Number.isFinite(tab.index) ? Number(tab.index) : order,
      label,
      value,
      icon: (tab.favIconUrl || '').trim(),
      order,
      titleCandidates: buildSearchMatchCandidates(tabTitle),
      urlCandidates: buildSearchMatchCandidates(tabUrl),
    });
  });
  return indexed;
}

function toSuggestion(tab: IndexedTab): SearchSuggestionItem {
  return {
    type: 'tab',
    label: tab.label,
    value: tab.value,
    tabId: tab.id,
    windowId: tab.windowId,
    icon: tab.icon,
  };
}

function normalizeTabQueryCacheKey(rawQuery: string): string {
  return normalizeSearchQuery(rawQuery);
}

function invalidateTabSearchCaches() {
  tabIndexCache = null;
  tabIndexPromise = null;
  tabQueryCache.clear();
}

function ensureTabCacheListeners(tabsApi: TabsApi) {
  if (tabListenersAttached) return;

  const invalidate = () => {
    invalidateTabSearchCaches();
  };

  tabsApi.onCreated?.addListener?.(invalidate);
  tabsApi.onRemoved?.addListener?.(invalidate);
  tabsApi.onUpdated?.addListener?.(invalidate);
  tabsApi.onMoved?.addListener?.(invalidate);
  tabsApi.onAttached?.addListener?.(invalidate);
  tabsApi.onDetached?.addListener?.(invalidate);
  globalThis.chrome?.windows?.onCreated?.addListener?.(invalidate);
  globalThis.chrome?.windows?.onRemoved?.addListener?.(invalidate);
  tabListenersAttached = true;
}

async function getTabIndex(tabsApi: TabsApi): Promise<IndexedTab[]> {
  ensureTabCacheListeners(tabsApi);
  if (tabIndexCache) return tabIndexCache;
  if (tabIndexPromise) return tabIndexPromise;

  tabIndexPromise = (async () => {
    const windows = await getAllWindowsWithTabs();
    const orderedTabsFromWindows = buildOrderedTabsFromWindows(windows);
    const indexedTabs = indexTabs(
      orderedTabsFromWindows.length > 0
        ? orderedTabsFromWindows
        : await queryAllTabs(tabsApi),
    );
    tabIndexCache = indexedTabs;
    return indexedTabs;
  })();

  try {
    return await tabIndexPromise;
  } finally {
    tabIndexPromise = null;
  }
}

function readTabQueryCache(rawQuery: string, limit: number): SearchSuggestionItem[] | null {
  const key = normalizeTabQueryCacheKey(rawQuery);
  const cached = tabQueryCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > TAB_QUERY_CACHE_TTL_MS) {
    tabQueryCache.delete(key);
    return null;
  }
  // Touch key for LRU-like eviction.
  tabQueryCache.delete(key);
  tabQueryCache.set(key, cached);
  return cached.items.slice(0, Math.max(1, limit));
}

function writeTabQueryCache(rawQuery: string, items: SearchSuggestionItem[]) {
  const key = normalizeTabQueryCacheKey(rawQuery);
  if (tabQueryCache.has(key)) {
    tabQueryCache.delete(key);
  }
  tabQueryCache.set(key, {
    cachedAt: Date.now(),
    items: items.slice(0, TAB_QUERY_CACHE_LIMIT),
  });
  while (tabQueryCache.size > TAB_QUERY_CACHE_KEY_LIMIT) {
    const oldestKey = tabQueryCache.keys().next().value;
    if (typeof oldestKey !== 'string') break;
    tabQueryCache.delete(oldestKey);
  }
}

export function getCachedTabSuggestions(
  rawQuery: string,
  limit = 30,
): SearchSuggestionItem[] | null {
  return readTabQueryCache(rawQuery, limit);
}

export async function getTabSuggestionsFromApi(
  tabsApi: TabsApi,
  rawQuery: string,
  limit = 30,
): Promise<SearchSuggestionItem[]> {
  const safeLimit = Math.max(1, limit);
  ensureTabCacheListeners(tabsApi);

  const cachedItems = readTabQueryCache(rawQuery, safeLimit);
  if (cachedItems) return cachedItems;

  const tabs = await getTabIndex(tabsApi);
  if (tabs.length === 0) return [];

  const query = rawQuery.trim();
  if (!query) {
    // Keep browser visual order:
    // tab strip left->right in each window, window blocks top->bottom.
    const topItems = tabs
      .slice(0, Math.max(safeLimit, TAB_QUERY_CACHE_LIMIT))
      .map(toSuggestion);
    writeTabQueryCache(query, topItems);
    return topItems.slice(0, safeLimit);
  }

  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return [];

  const rankedItems: SearchSuggestionItem[] = [];
  const desiredCount = Math.max(safeLimit, TAB_QUERY_CACHE_LIMIT);
  let processedCount = 0;
  for (const tab of tabs) {
    const score = getShortcutSuggestionScoreFromCandidates({
      titleCandidates: tab.titleCandidates,
      urlCandidates: tab.urlCandidates,
      normalizedQuery,
    });
    if (score > 0) {
      rankedItems.push(toSuggestion(tab));
      if (rankedItems.length >= desiredCount) break;
    }

    processedCount += 1;
    if (processedCount % TAB_SEARCH_YIELD_INTERVAL === 0) {
      await yieldToMainThread();
    }
  }

  writeTabQueryCache(query, rankedItems);
  return rankedItems.slice(0, safeLimit);
}
