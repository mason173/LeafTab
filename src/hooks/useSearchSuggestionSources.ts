import { useEffect, useMemo, useRef, useState } from 'react';
import type { SearchSuggestionItem } from '@/types';
import { getRemoteSearchSuggestionsFromExtension, getCachedRemoteSearchSuggestions } from '@/utils/remoteSearchSuggestions';
import { normalizeSearchQuery } from '@/utils/searchHelpers';
import { getBookmarkSuggestionsFromApi, getCachedBookmarkSuggestions } from '@/utils/bookmarkSearch';
import { getCachedTabSuggestions, getTabSuggestionsFromApi } from '@/utils/tabSearch';
import { resolveSearchSuggestionDisplayMode } from '@/utils/searchSuggestionPolicy';
import type { SearchSessionModel } from '@/utils/searchSessionModel';
import type { SearchSuggestionPermission } from '@/utils/searchCommands';
import { useDocumentVisibility } from '@/hooks/useDocumentVisibility';

type UseSearchSuggestionSourcesOptions = {
  searchValue: string;
  queryModel: SearchSessionModel;
  historyPermissionGranted: boolean;
  bookmarksPermissionGranted: boolean;
  tabsPermissionGranted: boolean;
  permissionWarmup: SearchSuggestionPermission | null;
};

type SuggestionCacheEntry = {
  cachedAt: number;
  items: SearchSuggestionItem[];
};

const SEARCH_ASYNC_DEBOUNCE_MS = 120;
const BROWSER_HISTORY_CACHE_TTL_MS = 15_000;
const BROWSER_HISTORY_EMPTY_QUERY_LIMIT = 20;
const BROWSER_HISTORY_QUERY_LIMIT = 30;
const BOOKMARK_SUGGESTION_LIMIT = 30;
const BROWSER_HISTORY_CACHE_KEY_LIMIT = 120;

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
  load: (query: string, signal?: AbortSignal) => Promise<SearchSuggestionItem[]>;
}) {
  const { enabled, query, debounceMs = SEARCH_ASYNC_DEBOUNCE_MS, getCachedItems, load } = args;
  const [items, setItems] = useState<SearchSuggestionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const getCachedItemsRef = useRef(getCachedItems);
  const loadRef = useRef(load);
  const debouncedQuery = useDebouncedValue(
    query,
    enabled && query ? debounceMs : 0,
  );

  useEffect(() => {
    getCachedItemsRef.current = getCachedItems;
  }, [getCachedItems]);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    if (!enabled) {
      setItems([]);
      setLoading(false);
      return;
    }

    let canceled = false;
    const abortController = new AbortController();
    const cachedItems = getCachedItemsRef.current?.(debouncedQuery);
    if (cachedItems) {
      setItems(cachedItems);
      setLoading(false);
      return;
    }

    setLoading(true);
    void loadRef.current(debouncedQuery, abortController.signal)
      .then((nextItems) => {
        if (!canceled) {
          setItems(nextItems);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!canceled) {
          if (error instanceof Error && error.name === 'AbortError') {
            setLoading(false);
            return;
          }
          setItems([]);
          setLoading(false);
        }
      });

    return () => {
      canceled = true;
      abortController.abort();
    };
  }, [debouncedQuery, enabled]);

  return { items, loading };
}

function upsertSuggestionCacheEntry(
  cache: Map<string, SuggestionCacheEntry>,
  key: string,
  entry: SuggestionCacheEntry,
  maxSize: number,
) {
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, entry);
  while (cache.size > maxSize) {
    const oldestKey = cache.keys().next().value;
    if (typeof oldestKey !== 'string') break;
    cache.delete(oldestKey);
  }
}

export type SearchSuggestionSourceStatus = {
  suggestionDisplayMode: ReturnType<typeof resolveSearchSuggestionDisplayMode>;
  bookmarkLoading: boolean;
  tabLoading: boolean;
  browserHistoryLoading: boolean;
  remoteSuggestionLoading: boolean;
};

export function useSearchSuggestionSources({
  searchValue,
  queryModel,
  historyPermissionGranted,
  bookmarksPermissionGranted,
  tabsPermissionGranted,
  permissionWarmup,
}: UseSearchSuggestionSourcesOptions) {
  const isDocumentVisible = useDocumentVisibility();
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
  const browserHistoryQuery = useMemo(
    () => (queryModel.mode === 'history' ? commandQuery.trim() : searchValue.trim()),
    [commandQuery, queryModel.mode, searchValue],
  );
  const normalizedBrowserHistoryQuery = useMemo(
    () => normalizeSearchQuery(browserHistoryQuery),
    [browserHistoryQuery],
  );
  const debouncedBrowserHistoryQuery = useDebouncedValue(
    browserHistoryQuery,
    browserHistoryQuery ? SEARCH_ASYNC_DEBOUNCE_MS : 0,
  );
  const browserHistoryMaxResults = debouncedBrowserHistoryQuery ? BROWSER_HISTORY_QUERY_LIMIT : BROWSER_HISTORY_EMPTY_QUERY_LIMIT;
  const shouldFetchBrowserHistory = useMemo(() => {
    if (!isDocumentVisible) return false;
    if (!historyPermissionGranted) return false;
    if (permissionWarmup === 'history') return false;
    if (queryModel.mode !== 'default' && queryModel.mode !== 'history') return false;
    if (!browserHistoryQuery) return true;
    if (!normalizedBrowserHistoryQuery) return false;
    return true;
  }, [
    browserHistoryQuery,
    historyPermissionGranted,
    isDocumentVisible,
    normalizedBrowserHistoryQuery,
    permissionWarmup,
    queryModel.mode,
  ]);

  const {
    items: bookmarkSuggestionItems,
    loading: bookmarkLoading,
  } = useAsyncSearchSuggestionSource({
    enabled: isDocumentVisible && suggestionDisplayMode === 'bookmarks' && bookmarksPermissionGranted && permissionWarmup !== 'bookmarks',
    query: commandQuery,
    getCachedItems: (query) => getCachedBookmarkSuggestions(query, BOOKMARK_SUGGESTION_LIMIT),
    load: async (query, signal) => {
      const bookmarksApi = globalThis.chrome?.bookmarks;
      if (!bookmarksApi) return [];
      return getBookmarkSuggestionsFromApi(bookmarksApi, query, BOOKMARK_SUGGESTION_LIMIT, { signal });
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
      const tabsApi = globalThis.chrome?.tabs;
      if (!tabsApi) return [];
      return getTabSuggestionsFromApi(tabsApi, query, 50);
    },
  });

  const {
    items: remoteSuggestionItems,
    loading: remoteSuggestionLoading,
  } = useAsyncSearchSuggestionSource({
    enabled: isDocumentVisible
      && suggestionDisplayMode === 'default'
      && Boolean(normalizedSearchQuery),
    query: searchValue,
    getCachedItems: (query) => getCachedRemoteSearchSuggestions('360', query),
    load: async (query) => getRemoteSearchSuggestionsFromExtension({
      provider: '360',
      query,
      limit: 10,
    }),
  });

  const [browserHistorySuggestionItems, setBrowserHistorySuggestionItems] = useState<SearchSuggestionItem[]>([]);
  const [browserHistoryLoading, setBrowserHistoryLoading] = useState(false);
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
      setBrowserHistoryLoading(false);
      return;
    }

    const historyApi = globalThis.chrome?.history;
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
        if (globalThis.chrome?.runtime?.lastError) {
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
        upsertSuggestionCacheEntry(browserHistoryCacheRef.current, cacheKey, {
          cachedAt: Date.now(),
          items: nextItems,
        }, BROWSER_HISTORY_CACHE_KEY_LIMIT);
        setBrowserHistorySuggestionItems(nextItems);
        setBrowserHistoryLoading(false);
      });
    })();

    return () => {
      canceled = true;
    };
  }, [browserHistoryCacheVersion, browserHistoryMaxResults, debouncedBrowserHistoryQuery, shouldFetchBrowserHistory]);

  return {
    suggestionDisplayMode,
    bookmarkSuggestionItems,
    tabSuggestionItems,
    browserHistorySuggestionItems,
    remoteSuggestionItems,
    sourceStatus: {
      suggestionDisplayMode,
      bookmarkLoading,
      tabLoading,
      browserHistoryLoading,
      remoteSuggestionLoading,
    },
  };
}
