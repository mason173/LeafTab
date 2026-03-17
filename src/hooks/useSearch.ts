import { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { SearchEngine } from '../types';
import { isUrl } from '../utils';
import {
  buildSearchMatchCandidates,
  getSearchMatchPriorityFromCandidates,
  getNextSearchEngine,
  normalizeSearchQuery,
  parseSearchEnginePrefix,
} from '../utils/searchHelpers';
import { buildSiteSearchQuery, parseSiteSearchShortcut } from '@/utils/siteSearch';
import {
  buildQueryUsageKey,
  getSuggestionUsageBoost,
  readSuggestionUsageMap,
  recordSuggestionUsage,
} from '@/utils/suggestionPersonalization';

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

const SEARCH_ENGINE_URL_TEMPLATES: Record<Exclude<SearchEngine, 'system'>, string> = {
  google: 'https://www.google.com/search?q=%s',
  bing: 'https://www.bing.com/search?q=%s',
  duckduckgo: 'https://duckduckgo.com/?q=%s',
  baidu: 'https://www.baidu.com/s?wd=%s',
};

const COMMAND_AUTOCOMPLETE_MAP: Record<string, string> = {
  '/b': '/bookmarks ',
};

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
  const [historySelectedIndex, setHistorySelectedIndex] = useState(-1);
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const deferredSearchValue = useDeferredValue(searchValue);
  const historyUsageMap = useMemo(
    () => (personalizationEnabled ? readSuggestionUsageMap() : {}),
    [personalizationEnabled, historyUsageVersion],
  );

  useEffect(() => {
    try {
      localStorage.setItem(SEARCH_ENGINE_KEY, searchEngine);
    } catch {}
  }, [searchEngine]);

  useEffect(() => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
  }, [searchHistory]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const nativeEvent = e.nativeEvent as InputEvent | undefined;
    const inputType = nativeEvent?.inputType || '';
    const inputData = nativeEvent?.data ?? '';
    let nextValue = rawValue;

    // 对齐 Omni 的 checkShortHand 逻辑：
    // 1) 输入 /b 自动补全为 /bookmarks␠
    // 2) Backspace 到 /bookmarks 时，清空为 ''
    const loweredRawValue = rawValue.toLowerCase();
    if (inputType === 'deleteContentBackward') {
      if (loweredRawValue === '/bookmarks') {
        nextValue = '';
      }
    } else if (COMMAND_AUTOCOMPLETE_MAP[loweredRawValue]) {
      nextValue = COMMAND_AUTOCOMPLETE_MAP[loweredRawValue];
    }

    // 防止在输入普通字符时意外留下尾随空格（用户手动输入空格除外）
    if (
      inputType === 'insertText' &&
      inputData !== ' ' &&
      nextValue.toLowerCase().startsWith('/bookmarks ') &&
      /\s+$/.test(nextValue)
    ) {
      nextValue = nextValue.replace(/\s+$/, '');
    }

    setSearchValue(nextValue);
    setHistorySelectedIndex(-1);
    // 不在输入时自动展开历史，仅在点击/聚焦输入框时展开
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
    const normalizedRawQuery = rawQuery.trim();
    const { query: prefixedQuery, overrideEngine } = prefixEnabled
      ? parseSearchEnginePrefix(normalizedRawQuery)
      : { query: normalizedRawQuery, overrideEngine: null };
    const { query, siteDomain, siteSearchUrl, historyQuery } = siteDirectEnabled
      ? parseSiteSearchShortcut(prefixedQuery)
      : {
        query: prefixedQuery.trim(),
        siteDomain: null,
        siteSearchUrl: null,
        historyQuery: prefixedQuery.trim(),
      };
    if (!query) return;

    const queryForSearch = siteSearchUrl || (siteDomain ? buildSiteSearchQuery(siteDomain, query) : query);
    const historyEntryValue = siteDomain ? historyQuery : query;
    addSearchHistoryEntry(historyEntryValue);
    if (personalizationEnabled) {
      recordSuggestionUsage(buildQueryUsageKey(historyEntryValue));
      setHistoryUsageVersion((prev) => prev + 1);
    }
    const effectiveEngine = prefixEnabled ? (overrideEngine ?? searchEngine) : searchEngine;

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
    setHistoryOpen(false);
    setHistorySelectedIndex(-1);
  }, [historySelectedIndex, filteredHistoryItems, openSearchWithQuery, searchValue]);

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
    handleSearchChange,
    filteredHistoryItems,
    handleSearch,
    handleEngineClick,
    handleEngineSelect,
    cycleSearchEngine,
    openSearchWithQuery,
  };
}
