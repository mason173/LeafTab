import { useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import { SearchEngine } from '../types';
import { isUrl } from '../utils';
import {
  buildSearchMatchCandidates,
  getSearchMatchPriorityFromCandidates,
  getNextSearchEngine,
  normalizeSearchQuery,
} from '../utils/searchHelpers';
import {
  getDefaultSearchEngineForPlatform,
  normalizeSearchEngineForPlatform,
} from '@/platform/search';
import {
  isSearchCommandShellValue,
  resolveSearchCommandAutocomplete,
} from '@/utils/searchCommands';
import {
  buildQueryUsageKey,
  getSuggestionUsageBoost,
  readSuggestionUsageMap,
  recordSuggestionUsage,
} from '@/utils/suggestionPersonalization';
import {
  MAX_SEARCH_HISTORY,
  readSearchHistoryFromStorage,
  SEARCH_HISTORY_KEY,
  type SearchHistoryEntry,
} from '@/utils/searchHistory';
import { createSearchSessionModel } from '@/utils/searchSessionModel';
import { SYNCABLE_PREFERENCES_APPLIED_EVENT } from '@/utils/syncablePreferences';
import {
  primeCachedLocalStorageItem,
  queueCachedLocalStorageSetItem,
  readCachedLocalStorageItem,
} from '@/utils/cachedLocalStorage';

const SEARCH_ENGINE_KEY = 'search_engine';
const DEFAULT_SEARCH_ENGINE: SearchEngine = getDefaultSearchEngineForPlatform();
export type { SearchHistoryEntry } from '@/utils/searchHistory';

type IndexedSearchHistoryEntry = SearchHistoryEntry & {
  usageKey: string;
  matchCandidates: string[];
};

type SearchFeatureOptions = {
  prefixEnabled?: boolean;
  siteDirectEnabled?: boolean;
  personalizationEnabled?: boolean;
  fuzzyMatchEnabled?: boolean;
};

export type SearchPanelCloseReason =
  | 'manual'
  | 'escape'
  | 'outside'
  | 'submit'
  | 'selection'
  | 'hotkey';

type SearchPanelState = {
  open: boolean;
  selectedIndex: number;
  lastCloseReason: SearchPanelCloseReason | null;
};

type SearchPanelAction =
  | { type: 'open'; select?: 'keep' | 'first' | 'none'; itemCount?: number }
  | { type: 'close'; reason?: SearchPanelCloseReason }
  | { type: 'set-selected'; value: number | ((prev: number) => number) }
  | { type: 'sync-item-count'; itemCount: number };

const SEARCH_ENGINE_URL_TEMPLATES: Record<Exclude<SearchEngine, 'system'>, string> = {
  google: 'https://www.google.com/search?q=%s',
  bing: 'https://www.bing.com/search?q=%s',
  duckduckgo: 'https://duckduckgo.com/?q=%s',
  baidu: 'https://www.baidu.com/s?wd=%s',
};

const SEARCH_PANEL_INITIAL_STATE: SearchPanelState = {
  open: false,
  selectedIndex: -1,
  lastCloseReason: null,
};

function readStoredSearchEngine(rawValue: string | null | undefined): SearchEngine {
  const saved = (rawValue || '').trim();
  if (
    saved === 'system'
    || saved === 'google'
    || saved === 'bing'
    || saved === 'duckduckgo'
    || saved === 'baidu'
  ) {
    return normalizeSearchEngineForPlatform(saved);
  }
  return DEFAULT_SEARCH_ENGINE;
}

function normalizeSuggestionIndex(index: number): number {
  if (!Number.isFinite(index)) return -1;
  return Math.trunc(index);
}

function reduceSearchPanelState(
  state: SearchPanelState,
  action: SearchPanelAction,
): SearchPanelState {
  if (action.type === 'open') {
    const selectMode = action.select ?? 'keep';
    const itemCount = Number(action.itemCount ?? 0);
    if (selectMode === 'none') {
      return {
        open: true,
        selectedIndex: -1,
        lastCloseReason: state.lastCloseReason,
      };
    }
    if (selectMode === 'first') {
      return {
        open: true,
        selectedIndex: itemCount > 0 ? 0 : -1,
        lastCloseReason: state.lastCloseReason,
      };
    }
    return {
      open: true,
      selectedIndex: state.selectedIndex,
      lastCloseReason: state.lastCloseReason,
    };
  }

  if (action.type === 'close') {
    return {
      open: false,
      selectedIndex: -1,
      lastCloseReason: action.reason ?? 'manual',
    };
  }

  if (action.type === 'set-selected') {
    const resolved = typeof action.value === 'function'
      ? action.value(state.selectedIndex)
      : action.value;
    return {
      open: state.open,
      selectedIndex: normalizeSuggestionIndex(resolved),
      lastCloseReason: state.lastCloseReason,
    };
  }

  const itemCount = Number(action.itemCount);
  if (itemCount <= 0) {
    if (state.selectedIndex === -1) return state;
    return {
      open: state.open,
      selectedIndex: -1,
      lastCloseReason: state.lastCloseReason,
    };
  }
  if (state.selectedIndex >= itemCount) {
    return {
      open: state.open,
      selectedIndex: -1,
      lastCloseReason: state.lastCloseReason,
    };
  }
  return state;
}

export function useSearch(
  openInNewTab: boolean,
  options?: SearchFeatureOptions,
) {
  const prefixEnabled = options?.prefixEnabled ?? true;
  const siteDirectEnabled = options?.siteDirectEnabled ?? true;
  const personalizationEnabled = options?.personalizationEnabled ?? true;
  const fuzzyMatchEnabled = options?.fuzzyMatchEnabled ?? true;
  const [searchValue, setSearchValue] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>(() => readSearchHistoryFromStorage());
  const [searchPanelState, dispatchSearchPanel] = useReducer(
    reduceSearchPanelState,
    SEARCH_PANEL_INITIAL_STATE,
  );
  const historySelectedIndex = searchPanelState.selectedIndex;
  const [historyUsageVersion, setHistoryUsageVersion] = useState(0);

  const [searchEngine, setSearchEngine] = useState<SearchEngine>(() => {
    try {
      return readStoredSearchEngine(readCachedLocalStorageItem(SEARCH_ENGINE_KEY));
    } catch {}
    return DEFAULT_SEARCH_ENGINE;
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const historyOpen = searchPanelState.open;
  const historyUsageMap = useMemo(
    () => (personalizationEnabled ? readSuggestionUsageMap() : {}),
    [personalizationEnabled, historyUsageVersion],
  );

  useEffect(() => {
    try {
      queueCachedLocalStorageSetItem(SEARCH_ENGINE_KEY, searchEngine);
    } catch {}
  }, [searchEngine]);

  useEffect(() => {
    const normalizedEngine = normalizeSearchEngineForPlatform(searchEngine);
    if (normalizedEngine !== searchEngine) {
      setSearchEngine(normalizedEngine);
    }
  }, [searchEngine]);

  useEffect(() => {
    const syncSearchEngine = (event?: Event) => {
      try {
        const customEvent = event as CustomEvent<{ preferences?: { searchEngine?: SearchEngine } }> | undefined;
        const eventSearchEngine = customEvent?.detail?.preferences?.searchEngine;
        const next = readStoredSearchEngine(typeof eventSearchEngine === 'string'
          ? eventSearchEngine
          : readCachedLocalStorageItem(SEARCH_ENGINE_KEY));
        primeCachedLocalStorageItem(SEARCH_ENGINE_KEY, next);
        setSearchEngine((prev) => prev === next ? prev : next);
      } catch {}
    };
    window.addEventListener(SYNCABLE_PREFERENCES_APPLIED_EVENT, syncSearchEngine);
    return () => window.removeEventListener(SYNCABLE_PREFERENCES_APPLIED_EVENT, syncSearchEngine);
  }, []);

  useEffect(() => {
    queueCachedLocalStorageSetItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
  }, [searchHistory]);

  const openHistoryPanel = useCallback((options?: { select?: 'keep' | 'first' | 'none'; itemCount?: number }) => {
    dispatchSearchPanel({
      type: 'open',
      select: options?.select,
      itemCount: options?.itemCount,
    });
  }, []);

  const closeHistoryPanel = useCallback((reason: SearchPanelCloseReason = 'manual') => {
    dispatchSearchPanel({
      type: 'close',
      reason,
    });
  }, []);

  const setHistorySelectedIndex = useCallback((next: number | ((prev: number) => number)) => {
    dispatchSearchPanel({
      type: 'set-selected',
      value: next,
    });
  }, []);

  const setHistoryOpen = useCallback((next: boolean) => {
    if (next) {
      openHistoryPanel({ select: 'keep' });
      return;
    }
    closeHistoryPanel('manual');
  }, [closeHistoryPanel, openHistoryPanel]);

  const syncHistorySelectionByCount = useCallback((itemCount: number) => {
    dispatchSearchPanel({
      type: 'sync-item-count',
      itemCount,
    });
  }, []);

  const handleSearchChange = (rawValue: string, nativeEvent?: Event) => {
    const inputNativeEvent = nativeEvent as InputEvent | undefined;
    const inputType = inputNativeEvent?.inputType || '';
    let nextValue = rawValue;

    // 对齐命令补全交互：
    // 1) 输入 /b 自动补全为 /bookmarks ，输入 /t 自动补全为 /tabs
    // 2) 命令壳（token + 可选尾随空格）在退格时按整段处理
    if (inputType === 'deleteContentBackward') {
      if (isSearchCommandShellValue(searchValue)) {
        nextValue = '';
      }
    } else {
      const autocompletedCommandToken = resolveSearchCommandAutocomplete(rawValue);
      if (autocompletedCommandToken) {
        nextValue = autocompletedCommandToken;
      }
    }

    setSearchValue(nextValue);
    setHistorySelectedIndex(-1);
    // 下拉展开时机由上层控制（App.handleSearchInputChange）。
  };

  const indexedSearchHistory = useMemo<IndexedSearchHistoryEntry[]>(
    () => searchHistory.map((item) => ({
      ...item,
      usageKey: buildQueryUsageKey(item.query),
      matchCandidates: buildSearchMatchCandidates(item.query),
    })),
    [searchHistory],
  );

  const filteredHistoryItems = useMemo(() => {
    const normalizedQuery = normalizeSearchQuery(searchValue);
    const now = Date.now();
    if (!normalizedQuery) {
      return indexedSearchHistory
        .slice()
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((item) => ({
          query: item.query,
          timestamp: item.timestamp,
        }));
    }

    const ranked = indexedSearchHistory
      .map((item) => {
        const matchPriority = getSearchMatchPriorityFromCandidates(item.matchCandidates, normalizedQuery, { fuzzy: fuzzyMatchEnabled });
        if (matchPriority === 0) return null;

        const usageBoost = personalizationEnabled
          ? getSuggestionUsageBoost(historyUsageMap, item.usageKey, now)
          : 0;
        const hoursSince = Math.max(0, (now - item.timestamp) / 3_600_000);
        const freshnessBoost = Math.max(0, 12 - hoursSince * 0.5);
        const score = matchPriority * 100 + usageBoost + freshnessBoost;
        return { item, score };
      })
      .filter((entry): entry is { item: IndexedSearchHistoryEntry; score: number } => Boolean(entry));

    ranked.sort((a, b) => b.score - a.score || b.item.timestamp - a.item.timestamp);
    return ranked.map(({ item }) => ({
      query: item.query,
      timestamp: item.timestamp,
    }));
  }, [fuzzyMatchEnabled, historyUsageMap, indexedSearchHistory, personalizationEnabled, searchValue]);

  const addSearchHistoryEntry = useCallback((rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;
    const now = Date.now();
    setSearchHistory((prev) => {
      const next = [
        { query, timestamp: now },
        ...prev.filter((v) => v.query !== query),
      ].slice(0, MAX_SEARCH_HISTORY);
      return next;
    });
  }, []);

  const openSearchWithQuery = useCallback((rawQuery: string) => {
    const queryModel = createSearchSessionModel(rawQuery, {
      prefixEnabled,
      siteDirectEnabled,
      calculatorEnabled: false,
      defaultEngine: normalizeSearchEngineForPlatform(searchEngine),
    });
    const { query, queryForSearch, historyEntryValue } = queryModel.submission;
    const effectiveEngine = normalizeSearchEngineForPlatform(
      queryModel.submission.effectiveEngine || searchEngine || DEFAULT_SEARCH_ENGINE,
    );
    if (!query) return;

    addSearchHistoryEntry(historyEntryValue);
    if (personalizationEnabled) {
      recordSuggestionUsage(buildQueryUsageKey(historyEntryValue));
      setHistoryUsageVersion((prev) => prev + 1);
    }

    if (isUrl(queryForSearch)) {
      let targetUrl = queryForSearch;
      if (!/^https?:\/\//i.test(queryForSearch)) {
        targetUrl = `https://${queryForSearch}`;
      }
      window.open(targetUrl, openInNewTab ? '_blank' : '_self');
    } else {
      if (effectiveEngine === 'system' && typeof chrome !== 'undefined' && chrome.search?.query) {
        chrome.search.query({
          text: queryForSearch,
          disposition: openInNewTab ? 'NEW_TAB' : 'CURRENT_TAB',
        });
        return;
      }

      const template = effectiveEngine === 'system'
        ? SEARCH_ENGINE_URL_TEMPLATES.bing
        : SEARCH_ENGINE_URL_TEMPLATES[effectiveEngine];
      const searchUrl = template.replace('%s', encodeURIComponent(queryForSearch));
      if (openInNewTab) {
        window.open(searchUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = searchUrl;
      }
    }
  }, [addSearchHistoryEntry, openInNewTab, personalizationEnabled, prefixEnabled, searchEngine, siteDirectEnabled]);

  const handleSearch = useCallback(() => {
    if (historySelectedIndex !== -1 && filteredHistoryItems[historySelectedIndex]) {
      openSearchWithQuery(filteredHistoryItems[historySelectedIndex].query);
    } else {
      openSearchWithQuery(searchValue);
    }
    closeHistoryPanel('submit');
  }, [closeHistoryPanel, historySelectedIndex, filteredHistoryItems, openSearchWithQuery, searchValue]);

  const handleEngineSelect = (engine: SearchEngine) => {
    setSearchEngine(engine);
    setDropdownOpen(false);
  };

  const cycleSearchEngine = useCallback((direction: 1 | -1 = 1) => {
    setSearchEngine((prev) => getNextSearchEngine(prev, direction));
  }, []);

  return {
    searchValue,
    setSearchValue,
    searchHistory,
    setSearchHistory,
    historySelectedIndex,
    setHistorySelectedIndex,
    searchEngine,
    setSearchEngine,
    dropdownOpen,
    setDropdownOpen,
    historyOpen,
    setHistoryOpen,
    openHistoryPanel,
    closeHistoryPanel,
    syncHistorySelectionByCount,
    handleSearchChange,
    filteredHistoryItems,
    handleSearch,
    handleEngineSelect,
    cycleSearchEngine,
    openSearchWithQuery,
  };
}
