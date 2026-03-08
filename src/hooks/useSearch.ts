import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SearchEngine } from '../types';
import { isUrl } from '../utils';

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_SEARCH_HISTORY = 15;

export function useSearch(searchInputRef: React.RefObject<HTMLInputElement>, openInNewTab: boolean) {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const normalized = parsed
        .filter((v): v is string => typeof v === 'string')
        .map((v) => v.trim())
        .filter(Boolean);
      return Array.from(new Set(normalized)).slice(0, MAX_SEARCH_HISTORY);
    } catch {
      return [];
    }
  });
  const [historySelectedIndex, setHistorySelectedIndex] = useState(-1);
  const skipNextHistoryOpen = useRef(false);

  const [searchEngine, setSearchEngine] = useState<SearchEngine>('google'); // Default to Google for compliance mode

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // useEffect(() => {
  //   localStorage.setItem('search_engine', searchEngine);
  // }, [searchEngine]);

  useEffect(() => {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(searchHistory));
  }, [searchHistory]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    setHistorySelectedIndex(-1);
    // 不在输入时自动展开历史，仅在点击/聚焦输入框时展开
  };

  const filteredHistoryItems = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q) return searchHistory;
    return searchHistory.filter((item) => item.toLowerCase().includes(q));
  }, [searchValue, searchHistory]);

  const addSearchHistoryEntry = useCallback((rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;
    setSearchHistory((prev) => {
      const next = [query, ...prev.filter((v) => v !== query)].slice(0, MAX_SEARCH_HISTORY);
      return next;
    });
  }, []);

  const openSearchWithQuery = useCallback((rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) return;
    addSearchHistoryEntry(query);

    if (isUrl(query)) {
      let targetUrl = query;
      if (!/^https?:\/\//i.test(query)) {
        targetUrl = `https://${query}`;
      }
      window.open(targetUrl, openInNewTab ? '_blank' : '_self');
    } else {
      // Chrome Search API Compliance: Use chrome.search.query
      // This respects the user's default browser search engine settings
      if (typeof chrome !== 'undefined' && chrome.search && chrome.search.query) {
        chrome.search.query({
          text: query,
          disposition: openInNewTab ? 'NEW_TAB' : 'CURRENT_TAB'
        });
      } else {
        // Fallback for development or if API is not available (defaults to Google)
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        window.open(searchUrl, openInNewTab ? '_blank' : '_self');
      }
    }
  }, [addSearchHistoryEntry, openInNewTab]); // Removed searchEngine dependency

  const handleSearch = useCallback(() => {
    if (historySelectedIndex !== -1 && filteredHistoryItems[historySelectedIndex]) {
      openSearchWithQuery(filteredHistoryItems[historySelectedIndex]);
    } else {
      openSearchWithQuery(searchValue);
    }
    setHistoryOpen(false);
    setHistorySelectedIndex(-1);
  }, [historySelectedIndex, filteredHistoryItems, openSearchWithQuery, searchValue]);

  const handleEngineClick = () => {
    // Disable dropdown for compliance
    // setDropdownOpen(!dropdownOpen);
  };

  const handleEngineSelect = (engine: SearchEngine) => {
    // Disable engine selection for compliance
    // setSearchEngine(engine);
    // setDropdownOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!historyOpen) {
        setHistoryOpen(true);
        if (filteredHistoryItems.length > 0) {
          setHistorySelectedIndex(0);
        }
      } else {
        if (filteredHistoryItems.length > 0) {
          setHistorySelectedIndex((prev) => (prev + 1) % filteredHistoryItems.length);
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyOpen && filteredHistoryItems.length > 0) {
        setHistorySelectedIndex((prev) => (prev - 1 + filteredHistoryItems.length) % filteredHistoryItems.length);
      }
    }
  };

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
    skipNextHistoryOpen,
    handleSearchChange,
    filteredHistoryItems,
    handleSearch,
    handleEngineClick,
    handleEngineSelect,
    handleSearchKeyDown,
    openSearchWithQuery,
  };
}
