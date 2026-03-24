import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchSuggestionItem, Shortcut } from '@/types';
import type { SearchHistoryEntry } from '@/hooks/useSearch';
import { AI_BOOKMARK_SUGGESTION_LIMIT } from '@/features/ai-bookmarks/constants';
import {
  getBookmarksApi,
  getExtensionRuntime,
  getHistoryApi,
  getTabsApi,
} from '@/platform/runtime';
import { normalizeSearchQuery } from '@/utils/searchHelpers';
import { getBookmarkSuggestionsFromApi, getCachedBookmarkSuggestions } from '@/utils/bookmarkSearch';
import { getCachedTabSuggestions, getTabSuggestionsFromApi } from '@/utils/tabSearch';
import { resolveSearchSuggestionDisplayMode } from '@/utils/searchSuggestionPolicy';
import type { SuggestionUsageMap } from '@/utils/suggestionPersonalization';
import type { SearchSessionModel } from '@/utils/searchSessionModel';
import {
  buildSearchSuggestionSourceItems,
  buildShortcutSearchIndex,
} from '@/utils/searchSuggestionSources';
import type { SearchCommandPermission } from '@/utils/searchCommands';
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility';

type UseSearchSuggestionSourcesOptions = {
  searchValue: string;
  queryModel: SearchSessionModel;
  filteredHistoryItems: SearchHistoryEntry[];
  shortcuts: Shortcut[];
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
  historyPermissionGranted: boolean;
  bookmarksPermissionGranted: boolean;
  tabsPermissionGranted: boolean;
  permissionWarmup: SearchCommandPermission | null;
};

type SuggestionCacheEntry = {
  cachedAt: number;
  items: SearchSuggestionItem[];
};

const SEARCH_ASYNC_DEBOUNCE_MS = 120;
const BOOKMARK_ASYNC_DEBOUNCE_MS = 220;
const SEARCH_ASYNC_LOADING_DELAY_MS = 180;
const BROWSER_HISTORY_CACHE_TTL_MS = 15_000;
const BROWSER_HISTORY_EMPTY_QUERY_LIMIT = 20;
const BROWSER_HISTORY_QUERY_LIMIT = 30;

function normalizeSuggestionCacheKey(rawValue: string): string {
  return rawValue.trim().toLowerCase();
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    if (delayMs <= 0) {
      setDebouncedValue(value);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

function useAsyncSearchSuggestionSource(args: {
  enabled: boolean;
  query: string;
  debounceMs?: number;
  loadingDelayMs?: number;
  getCachedItems?: (query: string) => SearchSuggestionItem[] | null;
  load: (query: string) => Promise<SearchSuggestionItem[]>;
}) {
  const {
    enabled,
    query,
    debounceMs = SEARCH_ASYNC_DEBOUNCE_MS,
    loadingDelayMs = SEARCH_ASYNC_LOADING_DELAY_MS,
    getCachedItems,
    load,
  } = args;
  const [items, setItems] = useState<SearchSuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebouncedValue(
    query,
    enabled && query ? debounceMs : 0,
  );

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      return;
    }

    let canceled = false;
    let loadingDelayTimer: number | null = null;
    const cachedItems = getCachedItems?.(debouncedQuery);
    if (cachedItems) {
      setItems(cachedItems);
      setLoading(false);
      return;
    }

    if (loadingDelayMs <= 0) {
      setLoading(true);
    } else {
      loadingDelayTimer = window.setTimeout(() => {
        if (!canceled) {
          setLoading(true);
        }
      }, loadingDelayMs);
    }

    void load(debouncedQuery)
      .then((nextItems) => {
        if (!canceled) {
          if (loadingDelayTimer !== null) {
            window.clearTimeout(loadingDelayTimer);
          }
          setItems(nextItems);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!canceled) {
          if (loadingDelayTimer !== null) {
            window.clearTimeout(loadingDelayTimer);
          }
          setItems([]);
          setLoading(false);
        }
      });

    return () => {
      canceled = true;
      if (loadingDelayTimer !== null) {
        window.clearTimeout(loadingDelayTimer);
      }
    };
  }, [debouncedQuery, enabled, getCachedItems, load, loadingDelayMs]);

  return { items, loading };
}

export type SearchSuggestionSourceStatus = {
  suggestionDisplayMode: ReturnType<typeof resolveSearchSuggestionDisplayMode>;
  bookmarkLoading: boolean;
  tabLoading: boolean;
  browserHistoryLoading: boolean;
};

export function useSearchSuggestionSources({
  searchValue,
  queryModel,
  filteredHistoryItems,
  shortcuts,
  searchSiteShortcutEnabled,
  suggestionUsageMap,
  historyPermissionGranted,
  bookmarksPermissionGranted,
  tabsPermissionGranted,
  permissionWarmup,
}: UseSearchSuggestionSourcesOptions) {
  const isDocumentVisible = useDocumentVisibility();
  const extensionRuntime = getExtensionRuntime();
  const browserHistoryCacheRef = useRef(new Map<string, SuggestionCacheEntry>());
  const [browserHistoryCacheVersion, setBrowserHistoryCacheVersion] = useState(0);
  const suggestionDisplayMode = useMemo(
    () => resolveSearchSuggestionDisplayMode(queryModel.command.id),
    [queryModel.command.id],
  );
  const commandQuery = queryModel.commandQuery;
  const normalizedSearchQuery = useMemo(
    () => normalizeSearchQuery(searchValue),
    [searchValue],
  );
  const trimmedSearchValue = searchValue.trim();
  const debouncedBrowserHistoryQuery = useDebouncedValue(
    trimmedSearchValue,
    trimmedSearchValue ? SEARCH_ASYNC_DEBOUNCE_MS : 0,
  );
  const browserHistoryMaxResults = debouncedBrowserHistoryQuery ? BROWSER_HISTORY_QUERY_LIMIT : BROWSER_HISTORY_EMPTY_QUERY_LIMIT;
  const shouldFetchBrowserHistory = useMemo(() => {
    if (!isDocumentVisible) return false;
    if (!historyPermissionGranted) return false;
    if (permissionWarmup === 'history') return false;
    if (queryModel.mode !== 'default') return false;
    if (!trimmedSearchValue) return true;
    if (!normalizedSearchQuery) return false;
    return true;
  }, [
    historyPermissionGranted,
    isDocumentVisible,
    normalizedSearchQuery,
    permissionWarmup,
    queryModel.mode,
    trimmedSearchValue,
  ]);

  const shortcutSearchIndex = useMemo(
    () => buildShortcutSearchIndex(shortcuts),
    [shortcuts],
  );

  const syncSourceItems = useMemo(() => buildSearchSuggestionSourceItems({
    searchValue,
    filteredHistoryItems,
    shortcutSearchIndex,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
  }), [
    filteredHistoryItems,
    searchValue,
    searchSiteShortcutEnabled,
    shortcutSearchIndex,
    suggestionUsageMap,
  ]);

  const {
    items: bookmarkSuggestionItems,
    loading: bookmarkLoading,
  } = useAsyncSearchSuggestionSource({
    enabled: isDocumentVisible && suggestionDisplayMode === 'bookmarks' && bookmarksPermissionGranted && permissionWarmup !== 'bookmarks',
    query: commandQuery,
    debounceMs: BOOKMARK_ASYNC_DEBOUNCE_MS,
    loadingDelayMs: SEARCH_ASYNC_LOADING_DELAY_MS,
    getCachedItems: (query) => getCachedBookmarkSuggestions(query, AI_BOOKMARK_SUGGESTION_LIMIT),
    load: async (query) => {
      const bookmarksApi = getBookmarksApi();
      if (!bookmarksApi) return [];
      return getBookmarkSuggestionsFromApi(bookmarksApi, query, AI_BOOKMARK_SUGGESTION_LIMIT);
    },
  });

  const {
    items: tabSuggestionItems,
    loading: tabLoading,
  } = useAsyncSearchSuggestionSource({
    enabled: isDocumentVisible && suggestionDisplayMode === 'tabs' && tabsPermissionGranted && permissionWarmup !== 'tabs',
    query: commandQuery,
    getCachedItems: (query) => getCachedTabSuggestions(query, 50),
    load: async (query) => {
      const tabsApi = getTabsApi();
      if (!tabsApi) return [];
      return getTabSuggestionsFromApi(tabsApi, query, 50);
    },
  });

  const [browserHistorySuggestionItems, setBrowserHistorySuggestionItems] = useState<SearchSuggestionItem[]>([]);
  const [browserHistoryLoading, setBrowserHistoryLoading] = useState(false);
  useEffect(() => {
    const historyApi = getHistoryApi();
    if (!historyApi?.onVisited || !historyApi.onVisitRemoved) return;

    const invalidate = () => {
      browserHistoryCacheRef.current.clear();
      setBrowserHistoryCacheVersion((prev) => prev + 1);
    };

    historyApi.onVisited.addListener(invalidate);
    historyApi.onVisitRemoved.addListener(invalidate);
    return () => {
      historyApi.onVisited.removeListener(invalidate);
      historyApi.onVisitRemoved.removeListener(invalidate);
    };
  }, []);

  useEffect(() => {
    if (!shouldFetchBrowserHistory) {
      setBrowserHistorySuggestionItems([]);
      setBrowserHistoryLoading(false);
      return;
    }

    const historyApi = getHistoryApi();
    if (!historyApi) {
      setBrowserHistorySuggestionItems([]);
      setBrowserHistoryLoading(false);
      return;
    }

    let canceled = false;
    const cacheKey = normalizeSuggestionCacheKey(debouncedBrowserHistoryQuery);
    const cachedEntry = browserHistoryCacheRef.current.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.cachedAt <= BROWSER_HISTORY_CACHE_TTL_MS) {
      setBrowserHistorySuggestionItems(cachedEntry.items);
      setBrowserHistoryLoading(false);
      return;
    }

    setBrowserHistoryLoading(true);
    void (async () => {
      historyApi.search({
        text: debouncedBrowserHistoryQuery,
        maxResults: browserHistoryMaxResults,
        startTime: 0,
      }, (nodes) => {
        if (canceled) return;
        if (extensionRuntime?.lastError) {
          setBrowserHistorySuggestionItems([]);
          setBrowserHistoryLoading(false);
          return;
        }

        const deduped = new Map<string, SearchSuggestionItem>();
        (nodes || []).forEach((node) => {
          const url = (node.url || '').trim();
          if (!url || deduped.has(url)) return;
          deduped.set(url, {
            type: 'history',
            label: (node.title || url).trim() || url,
            value: url,
            historySource: 'browser',
            timestamp: Number(node.lastVisitTime || Date.now()),
          });
        });

        const nextItems = Array.from(deduped.values()).slice(0, browserHistoryMaxResults);
        browserHistoryCacheRef.current.set(cacheKey, {
          cachedAt: Date.now(),
          items: nextItems,
        });
        setBrowserHistorySuggestionItems(nextItems);
        setBrowserHistoryLoading(false);
      });
    })();

    return () => {
      canceled = true;
    };
  }, [browserHistoryCacheVersion, browserHistoryMaxResults, debouncedBrowserHistoryQuery, extensionRuntime, shouldFetchBrowserHistory]);

  return {
    queryModel,
    suggestionDisplayMode,
    localHistorySuggestionItems: syncSourceItems.localHistorySuggestionItems,
    builtinSiteSuggestionItems: syncSourceItems.builtinSiteSuggestionItems,
    shortcutSuggestionItems: syncSourceItems.shortcutSuggestionItems,
    bookmarkSuggestionItems,
    tabSuggestionItems,
    browserHistorySuggestionItems,
    sourceStatus: {
      suggestionDisplayMode,
      bookmarkLoading,
      tabLoading,
      browserHistoryLoading,
    },
  };
}
