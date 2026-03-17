import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import type { ScenarioShortcuts, SearchSuggestionItem } from '@/types';
import type { SearchHistoryEntry } from '@/hooks/useSearch';
import { normalizeSearchQuery } from '@/utils/searchHelpers';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import { getBookmarkSuggestionsFromApi, getCachedBookmarkSuggestions } from '@/utils/bookmarkSearch';
import { getCachedTabSuggestions, getTabSuggestionsFromApi } from '@/utils/tabSearch';
import { resolveSearchSuggestionDisplayMode } from '@/utils/searchSuggestionPolicy';
import type { SuggestionUsageMap } from '@/utils/suggestionPersonalization';
import type { SearchQueryModel } from '@/utils/searchQueryModel';
import { buildSearchSuggestionSourceItems } from '@/utils/searchSuggestionSources';

type UseSearchSuggestionSourcesOptions = {
  searchValue: string;
  queryModel: SearchQueryModel;
  filteredHistoryItems: SearchHistoryEntry[];
  scenarioShortcuts: ScenarioShortcuts;
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
  historyPermissionGranted: boolean;
};

type SuggestionCacheEntry = {
  cachedAt: number;
  items: SearchSuggestionItem[];
};

const SEARCH_ASYNC_DEBOUNCE_MS = 120;
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
  getCachedItems?: (query: string) => SearchSuggestionItem[] | null;
  load: (query: string) => Promise<SearchSuggestionItem[]>;
}) {
  const { enabled, query, debounceMs = SEARCH_ASYNC_DEBOUNCE_MS, getCachedItems, load } = args;
  const [items, setItems] = useState<SearchSuggestionItem[]>([]);
  const debouncedQuery = useDebouncedValue(
    query,
    enabled && query ? debounceMs : 0,
  );

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      return;
    }

    let canceled = false;
    const cachedItems = getCachedItems?.(debouncedQuery);
    if (cachedItems) {
      setItems(cachedItems);
      return;
    }

    void load(debouncedQuery)
      .then((nextItems) => {
        if (!canceled) setItems(nextItems);
      })
      .catch(() => {
        if (!canceled) setItems([]);
      });

    return () => {
      canceled = true;
    };
  }, [debouncedQuery, enabled, getCachedItems, load]);

  return items;
}

export function useSearchSuggestionSources({
  searchValue,
  queryModel,
  filteredHistoryItems,
  scenarioShortcuts,
  searchSiteShortcutEnabled,
  suggestionUsageMap,
  historyPermissionGranted,
}: UseSearchSuggestionSourcesOptions) {
  const deferredSearchValue = useDeferredValue(searchValue);
  const browserHistoryCacheRef = useRef(new Map<string, SuggestionCacheEntry>());
  const [browserHistoryCacheVersion, setBrowserHistoryCacheVersion] = useState(0);
  const suggestionDisplayMode = useMemo(
    () => resolveSearchSuggestionDisplayMode(queryModel.command.id),
    [queryModel.command.id],
  );
  const commandQuery = queryModel.commandQuery;
  const normalizedDeferredQuery = useMemo(
    () => normalizeSearchQuery(deferredSearchValue),
    [deferredSearchValue],
  );
  const trimmedDeferredSearchValue = deferredSearchValue.trim();
  const debouncedBrowserHistoryQuery = useDebouncedValue(
    trimmedDeferredSearchValue,
    trimmedDeferredSearchValue ? SEARCH_ASYNC_DEBOUNCE_MS : 0,
  );
  const browserHistoryMaxResults = debouncedBrowserHistoryQuery ? BROWSER_HISTORY_QUERY_LIMIT : BROWSER_HISTORY_EMPTY_QUERY_LIMIT;
  const shouldFetchBrowserHistory = useMemo(() => {
    if (!historyPermissionGranted) return false;
    if (!deferredSearchValue.trimStart()) return true;
    if (!normalizedDeferredQuery) return false;
    return !deferredSearchValue.trimStart().startsWith('/');
  }, [deferredSearchValue, historyPermissionGranted, normalizedDeferredQuery]);

  const syncSourceItems = useMemo(() => buildSearchSuggestionSourceItems({
    deferredSearchValue,
    filteredHistoryItems,
    scenarioShortcuts,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
  }), [
    deferredSearchValue,
    filteredHistoryItems,
    scenarioShortcuts,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
  ]);

  const bookmarkSuggestionItems = useAsyncSearchSuggestionSource({
    enabled: suggestionDisplayMode === 'bookmarks',
    query: commandQuery,
    getCachedItems: (query) => getCachedBookmarkSuggestions(query, 30),
    load: async (query) => {
      const bookmarksApi = globalThis.chrome?.bookmarks;
      if (!bookmarksApi) return [];
      const granted = await ensureExtensionPermission('bookmarks', { requestIfNeeded: false }).catch(() => false);
      if (!granted) return [];
      return getBookmarkSuggestionsFromApi(bookmarksApi, query, 30);
    },
  });

  const tabSuggestionItems = useAsyncSearchSuggestionSource({
    enabled: suggestionDisplayMode === 'tabs',
    query: commandQuery,
    getCachedItems: (query) => getCachedTabSuggestions(query, 50),
    load: async (query) => {
      const tabsApi = globalThis.chrome?.tabs;
      if (!tabsApi) return [];
      const granted = await ensureExtensionPermission('tabs', { requestIfNeeded: false }).catch(() => false);
      if (!granted) return [];
      return getTabSuggestionsFromApi(tabsApi, query, 50);
    },
  });

  const [browserHistorySuggestionItems, setBrowserHistorySuggestionItems] = useState<SearchSuggestionItem[]>([]);
  useEffect(() => {
    const historyApi = globalThis.chrome?.history;
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
      return;
    }

    const historyApi = globalThis.chrome?.history;
    if (!historyApi) {
      setBrowserHistorySuggestionItems([]);
      return;
    }

    let canceled = false;
    const cacheKey = normalizeSuggestionCacheKey(debouncedBrowserHistoryQuery);
    const cachedEntry = browserHistoryCacheRef.current.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.cachedAt <= BROWSER_HISTORY_CACHE_TTL_MS) {
      setBrowserHistorySuggestionItems(cachedEntry.items);
      return;
    }

    void (async () => {
      const granted = await ensureExtensionPermission('history', { requestIfNeeded: false }).catch(() => false);
      if (!granted) {
        if (!canceled) setBrowserHistorySuggestionItems([]);
        return;
      }

      historyApi.search({
        text: debouncedBrowserHistoryQuery,
        maxResults: browserHistoryMaxResults,
        startTime: 0,
      }, (nodes) => {
        if (canceled) return;
        if (globalThis.chrome?.runtime?.lastError) {
          setBrowserHistorySuggestionItems([]);
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
            icon: '',
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
      });
    })();

    return () => {
      canceled = true;
    };
  }, [browserHistoryCacheVersion, browserHistoryMaxResults, debouncedBrowserHistoryQuery, shouldFetchBrowserHistory]);

  return {
    queryModel,
    suggestionDisplayMode,
    localHistorySuggestionItems: syncSourceItems.localHistorySuggestionItems,
    builtinSiteSuggestionItems: syncSourceItems.builtinSiteSuggestionItems,
    shortcutSuggestionItems: syncSourceItems.shortcutSuggestionItems,
    bookmarkSuggestionItems,
    tabSuggestionItems,
    browserHistorySuggestionItems,
  };
}
