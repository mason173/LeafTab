import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ScenarioShortcuts, SearchSuggestionItem } from '@/types';
import type { SearchHistoryEntry } from '@/hooks/useSearch';
import {
  buildSearchMatchCandidates,
  getShortcutSuggestionScoreFromCandidates,
  normalizeSearchQuery,
  parseBookmarkSearchCommand,
} from '@/utils/searchHelpers';
import { getBuiltinSiteShortcutSuggestions } from '@/utils/siteSearch';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import {
  buildShortcutUsageKey,
  getSuggestionUsageBoost,
  type SuggestionUsageMap,
} from '@/utils/suggestionPersonalization';

type UseSearchSuggestionsOptions = {
  searchValue: string;
  filteredHistoryItems: SearchHistoryEntry[];
  scenarioShortcuts: ScenarioShortcuts;
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
  historyPermissionGranted: boolean;
};

type IndexedShortcutSuggestion = {
  label: string;
  url: string;
  icon: string;
  order: number;
  usageKey: string;
  titleCandidates: string[];
  urlCandidates: string[];
};

type RankedSuggestion = {
  item: SearchSuggestionItem;
  score: number;
  order: number;
};

function buildSuggestionKey(item: SearchSuggestionItem): string {
  if (item.type === 'shortcut') return `shortcut|${item.value}`;
  if (item.type === 'bookmark') return `bookmark|${item.value}`;
  if (item.type === 'history') return `history|${item.value}`;
  if (item.type === 'engine-prefix') return `engine-prefix|${item.engine || ''}|${item.value}`;
  return `${item.type}|${item.value}`;
}

function insertRankedSuggestion(
  list: RankedSuggestion[],
  next: RankedSuggestion,
  limit: number,
) {
  let insertAt = list.length;
  for (let index = 0; index < list.length; index += 1) {
    const current = list[index];
    if (next.score > current.score || (next.score === current.score && next.order < current.order)) {
      insertAt = index;
      break;
    }
  }
  list.splice(insertAt, 0, next);
  if (list.length > limit) {
    list.pop();
  }
}

export function useSearchSuggestions({
  searchValue,
  filteredHistoryItems,
  scenarioShortcuts,
  searchSiteShortcutEnabled,
  suggestionUsageMap,
  historyPermissionGranted,
}: UseSearchSuggestionsOptions) {
  const deferredSearchValue = useDeferredValue(searchValue);
  const [bookmarkSuggestionItems, setBookmarkSuggestionItems] = useState<SearchSuggestionItem[]>([]);
  const [browserHistorySuggestionItems, setBrowserHistorySuggestionItems] = useState<SearchSuggestionItem[]>([]);
  const bookmarkCommand = useMemo(
    () => parseBookmarkSearchCommand(deferredSearchValue),
    [deferredSearchValue],
  );
  const normalizedDeferredQuery = useMemo(
    () => normalizeSearchQuery(deferredSearchValue),
    [deferredSearchValue],
  );
  const shouldFetchBrowserHistory = useMemo(() => {
    if (!historyPermissionGranted) return false;
    if (!deferredSearchValue.trimStart()) return true;
    if (!normalizedDeferredQuery) return false;
    return !deferredSearchValue.trimStart().startsWith('/');
  }, [deferredSearchValue, historyPermissionGranted, normalizedDeferredQuery]);

  const shortcutSearchIndex = useMemo(() => {
    const dedupedByUrl = new Map<string, IndexedShortcutSuggestion>();
    let order = 0;

    Object.values(scenarioShortcuts).forEach((list) => {
      (list || []).forEach((shortcut) => {
        const url = shortcut.url.trim();
        if (!url || dedupedByUrl.has(url)) return;

        dedupedByUrl.set(url, {
          label: shortcut.title || url,
          url,
          icon: shortcut.icon || '',
          order,
          usageKey: buildShortcutUsageKey(url),
          titleCandidates: buildSearchMatchCandidates(shortcut.title || ''),
          urlCandidates: buildSearchMatchCandidates(url),
        });
        order += 1;
      });
    });

    return Array.from(dedupedByUrl.values());
  }, [scenarioShortcuts]);

  const shortcutSuggestionItems = useMemo(() => {
    const normalizedQuery = normalizeSearchQuery(deferredSearchValue);
    if (!normalizedQuery) return [] as SearchSuggestionItem[];

    const topMatches: RankedSuggestion[] = [];
    for (const shortcut of shortcutSearchIndex) {
      const score = getShortcutSuggestionScoreFromCandidates({
        titleCandidates: shortcut.titleCandidates,
        urlCandidates: shortcut.urlCandidates,
        normalizedQuery,
      });
      if (score === 0) continue;

      insertRankedSuggestion(topMatches, {
        item: {
          type: 'shortcut',
          label: shortcut.label,
          value: shortcut.url,
          icon: shortcut.icon,
        },
        score: score * 100 + getSuggestionUsageBoost(suggestionUsageMap, shortcut.usageKey),
        order: shortcut.order,
      }, 10);
    }

    return topMatches.map((entry) => entry.item);
  }, [deferredSearchValue, shortcutSearchIndex, suggestionUsageMap]);

  const builtinSiteSuggestionItems = useMemo(() => {
    if (!searchSiteShortcutEnabled) return [] as SearchSuggestionItem[];
    const sites = getBuiltinSiteShortcutSuggestions(deferredSearchValue, 8);
    if (sites.length === 0) return [] as SearchSuggestionItem[];

    return sites
      .map((site, index) => ({
        item: {
          type: 'shortcut',
          label: site.label,
          value: site.url,
          icon: '',
        } as SearchSuggestionItem,
        score: (sites.length - index) * 100 + getSuggestionUsageBoost(suggestionUsageMap, buildShortcutUsageKey(site.url)),
        order: index,
      }))
      .sort((a, b) => b.score - a.score || a.order - b.order)
      .map(({ item }) => item);
  }, [deferredSearchValue, searchSiteShortcutEnabled, suggestionUsageMap]);

  useEffect(() => {
    if (!bookmarkCommand.active) {
      setBookmarkSuggestionItems([]);
      return;
    }

    const bookmarksApi = globalThis.chrome?.bookmarks;
    if (!bookmarksApi) {
      setBookmarkSuggestionItems([]);
      return;
    }

    let canceled = false;
    const toItems = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
      if (canceled) return;

      const deduped = new Map<string, SearchSuggestionItem>();
      nodes.forEach((node) => {
        const url = (node.url || '').trim();
        if (!url || deduped.has(url)) return;
        deduped.set(url, {
          type: 'bookmark',
          label: (node.title || url).trim() || url,
          value: url,
          icon: '',
        });
      });
      setBookmarkSuggestionItems(Array.from(deduped.values()).slice(0, 30));
    };

    void (async () => {
      const granted = await ensureExtensionPermission('bookmarks', { requestIfNeeded: false }).catch(() => false);
      if (!granted) {
        if (!canceled) setBookmarkSuggestionItems([]);
        return;
      }

      const normalizedQuery = bookmarkCommand.query.trim();
      if (!normalizedQuery) {
        bookmarksApi.getRecent(30, (nodes) => {
          if (globalThis.chrome?.runtime?.lastError) {
            setBookmarkSuggestionItems([]);
            return;
          }
          toItems(nodes || []);
        });
      } else {
        bookmarksApi.search({ query: normalizedQuery }, (nodes) => {
          if (globalThis.chrome?.runtime?.lastError) {
            setBookmarkSuggestionItems([]);
            return;
          }
          toItems(nodes || []);
        });
      }
    })();

    return () => {
      canceled = true;
    };
  }, [bookmarkCommand.active, bookmarkCommand.query]);

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
    const toItems = (nodes: chrome.history.HistoryItem[]) => {
      if (canceled) return;

      const deduped = new Map<string, SearchSuggestionItem>();
      nodes.forEach((node) => {
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
      setBrowserHistorySuggestionItems(Array.from(deduped.values()).slice(0, 30));
    };

    void (async () => {
      const granted = await ensureExtensionPermission('history', { requestIfNeeded: false }).catch(() => false);
      if (!granted) {
        if (!canceled) setBrowserHistorySuggestionItems([]);
        return;
      }

      const normalizedQuery = deferredSearchValue.trim();
      historyApi.search({
        text: normalizedQuery,
        maxResults: 30,
        startTime: 0,
      }, (nodes) => {
        if (globalThis.chrome?.runtime?.lastError) {
          setBrowserHistorySuggestionItems([]);
          return;
        }
        toItems(nodes || []);
      });
    })();

    return () => {
      canceled = true;
    };
  }, [deferredSearchValue, shouldFetchBrowserHistory]);

  return useMemo(() => {
    if (bookmarkCommand.active) {
      return bookmarkSuggestionItems;
    }

    const localHistorySuggestionItems = filteredHistoryItems.map((historyItem) => ({
      type: 'history',
      label: historyItem.query,
      value: historyItem.query,
      timestamp: historyItem.timestamp,
      historySource: 'local',
    } as SearchSuggestionItem));

    if (!searchValue.trim()) {
      const seen = new Set<string>();
      const mergedEmptyStateItems: SearchSuggestionItem[] = [];

      for (const suggestionItem of localHistorySuggestionItems) {
        const key = buildSuggestionKey(suggestionItem);
        if (!seen.has(key)) {
          seen.add(key);
          mergedEmptyStateItems.push(suggestionItem);
        }
      }

      for (const suggestionItem of browserHistorySuggestionItems) {
        const key = buildSuggestionKey(suggestionItem);
        if (!seen.has(key)) {
          seen.add(key);
          mergedEmptyStateItems.push(suggestionItem);
        }
      }

      return mergedEmptyStateItems.slice(0, 30);
    }

    const seen = new Set<string>();
    const merged: SearchSuggestionItem[] = [];

    for (const suggestionItem of builtinSiteSuggestionItems) {
      const key = buildSuggestionKey(suggestionItem);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(suggestionItem);
      }
    }

    for (const suggestionItem of shortcutSuggestionItems) {
      const key = buildSuggestionKey(suggestionItem);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(suggestionItem);
      }
    }

    for (const suggestionItem of browserHistorySuggestionItems) {
      const key = buildSuggestionKey(suggestionItem);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(suggestionItem);
      }
    }

    for (const item of localHistorySuggestionItems) {
      const key = buildSuggestionKey(item);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    return merged.slice(0, 15);
  }, [
    builtinSiteSuggestionItems,
    bookmarkCommand.active,
    bookmarkSuggestionItems,
    browserHistorySuggestionItems,
    filteredHistoryItems,
    searchValue,
    shortcutSuggestionItems,
  ]);
}
