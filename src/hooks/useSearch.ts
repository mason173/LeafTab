import { useState, useEffect, useCallback, useMemo, useDeferredValue, useReducer } from 'react';
import { SearchEngine } from '../types';
import { isUrl } from '../utils';
import {
  buildSearchMatchCandidates,
  getSearchMatchPriorityFromCandidates,
  getNextSearchEngine,
  normalizeSearchQuery,
} from '../utils/searchHelpers';
import {
  isSearchCommandTokenValue,
  resolveSearchCommandAutocomplete,
} from '@/utils/searchCommands';
import {
  buildQueryUsageKey,
  getSuggestionUsageBoost,
  readSuggestionUsageMap,
  recordSuggestionUsage,
} from '@/utils/suggestionPersonalization';
import { createSearchQueryModel } from '@/utils/searchQueryModel';
import { queueLocalStorageSetItem } from '@/utils/storageWriteQueue';

const SEARCH_HISTORY_KEY = 'search_history';
const SEARCH_ENGINE_KEY = 'search_engine';
const MAX_SEARCH_HISTORY = 15;
const DEFAULT_SEARCH_ENGINE: SearchEngine = 'system';
export type SearchHistoryEntry = {
  query: string;
  timestamp: number;
};

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

const normalizeSearchHistory = (parsed: unknown): SearchHistoryEntry[] => {
  if (!Array.isArray(parsed)) return [];
  const now = Date.now();
  const normalized: SearchHistoryEntry[] = [];
  const seen = new Set<string>();

  parsed.forEach((entry, index) => {
    if (typeof entry === 'string') {
      const query = entry.trim();
      if (!query || seen.has(query)) return;
      seen.add(query);
      normalized.push({
        query,
        timestamp: now - index * 60_000,
      });
      return;
    }

    if (!entry || typeof entry !== 'object') return;
    const rawQuery = (entry as { query?: unknown }).query;
    const rawTimestamp = (entry as { timestamp?: unknown }).timestamp;
    const query = typeof rawQuery === 'string' ? rawQuery.trim() : '';
    if (!query || seen.has(query)) return;
    seen.add(query);
    const parsedTimestamp = Number(rawTimestamp);
    normalized.push({
      query,
      timestamp: Number.isFinite(parsedTimestamp) && parsedTimestamp > 0
        ? parsedTimestamp
        : now - index * 60_000,
    });
  });

  return normalized.slice(0, MAX_SEARCH_HISTORY);
};

export function useSearch(
  openInNewTab: boolean,
  options?: SearchFeatureOptions,
) {
  const prefixEnabled = options?.prefixEnabled ?? true;
  const siteDirectEnabled = options?.siteDirectEnabled ?? true;
  const personalizationEnabled = options?.personalizationEnabled ?? true;
  const fuzzyMatchEnabled = options?.fuzzyMatchEnabled ?? true;
  const [searchValue, setSearchValue] = useState('');
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>(() => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return normalizeSearchHistory(parsed);
    } catch {
      return [];
    }
  });
  const [searchPanelState, dispatchSearchPanel] = useReducer(
    reduceSearchPanelState,
    SEARCH_PANEL_INITIAL_STATE,
  );
  const historySelectedIndex = searchPanelState.selectedIndex;
  const [historyUsageVersion, setHistoryUsageVersion] = useState(0);

  const [searchEngine, setSearchEngine] = useState<SearchEngine>(() => {
    try {
      const saved = (localStorage.getItem(SEARCH_ENGINE_KEY) || '').trim();
      if (saved === 'system' || saved === 'google' || saved === 'bing' || saved === 'duckduckgo' || saved === 'baidu') {
        return saved;
      }
    } catch {}
    return DEFAULT_SEARCH_ENGINE;
  });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const historyOpen = searchPanelState.open;
  const deferredSearchValue = useDeferredValue(searchValue);
  const historyUsageMap = useMemo(
    () => (personalizationEnabled ? readSuggestionUsageMap() : {}),
    [personalizationEnabled, historyUsageVersion],
  );

  useEffect(() => {
    try {
      queueLocalStorageSetItem(SEARCH_ENGINE_KEY, searchEngine);
    } catch {}
  }, [searchEngine]);

  useEffect(() => {
    queueLocalStorageSetItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const nativeEvent = e.nativeEvent as InputEvent | undefined;
    const inputType = nativeEvent?.inputType || '';
    let nextValue = rawValue;

    // 对齐命令补全交互：
    // 1) 输入 /b 自动补全为 /bookmarks，输入 /t 自动补全为 /tabs（不自动补空格）
    // 2) 当只剩命令 token 时，再按一次退格可整段清空
    const loweredRawValue = rawValue.toLowerCase();
    if (inputType === 'deleteContentBackward') {
      if (isSearchCommandTokenValue(searchValue)) {
        nextValue = '';
      }
    } else {
      const autocompletedCommandToken = resolveSearchCommandAutocomplete(loweredRawValue);
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
    const normalizedQuery = normalizeSearchQuery(deferredSearchValue);
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
  }, [deferredSearchValue, fuzzyMatchEnabled, historyUsageMap, indexedSearchHistory, personalizationEnabled]);

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
    const queryModel = createSearchQueryModel(rawQuery, {
      prefixEnabled,
      siteDirectEnabled,
      calculatorEnabled: false,
      defaultEngine: searchEngine,
    });
    const { query, queryForSearch, historyEntryValue, effectiveEngine } = queryModel.submission;
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

  const handleEngineClick = () => {
    setDropdownOpen(!dropdownOpen);
  };

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
    handleEngineClick,
    handleEngineSelect,
    cycleSearchEngine,
    openSearchWithQuery,
  };
}
