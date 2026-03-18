import type { SearchSuggestionItem } from '@/types';
import type { SearchSuggestionDisplayMode } from '@/utils/searchSuggestionPolicy';
import {
  buildSearchMatchCandidates,
  getSearchMatchPriorityFromCandidates,
} from '@/utils/searchHelpers';

type BuildSearchSuggestionItemsArgs = {
  mode: SearchSuggestionDisplayMode;
  searchValue: string;
  bookmarkSuggestionItems: SearchSuggestionItem[];
  tabSuggestionItems: SearchSuggestionItem[];
  localHistorySuggestionItems: SearchSuggestionItem[];
  browserHistorySuggestionItems: SearchSuggestionItem[];
  builtinSiteSuggestionItems: SearchSuggestionItem[];
  shortcutSuggestionItems: SearchSuggestionItem[];
  emptyStateLimit?: number;
  queryStateLimit?: number;
};

function normalizeSuggestionQuery(rawValue: string): string {
  return rawValue.trim().toLowerCase();
}

function getSuggestionKey(item: SearchSuggestionItem): string {
  if (item.type === 'shortcut') return `shortcut|${item.value}`;
  if (item.type === 'bookmark') return `bookmark|${item.value}`;
  if (item.type === 'tab') return `tab|${item.tabId ?? item.value}`;
  if (item.type === 'history') return `history|${item.value}`;
  if (item.type === 'engine-prefix') return `engine-prefix|${item.engine || ''}|${item.value}`;
  return `${item.type}|${item.value}`;
}

function mergeUniqueSuggestions(...groups: Array<readonly SearchSuggestionItem[]>): SearchSuggestionItem[] {
  const seen = new Set<string>();
  const merged: SearchSuggestionItem[] = [];
  for (const group of groups) {
    for (const item of group) {
      const key = getSuggestionKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

function matchesSuggestionQuery(item: SearchSuggestionItem, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const labelPriority = getSearchMatchPriorityFromCandidates(
    buildSearchMatchCandidates(item.label || ''),
    normalizedQuery,
    { fuzzy: true },
  );
  if (labelPriority > 0) return true;
  const valuePriority = getSearchMatchPriorityFromCandidates(
    buildSearchMatchCandidates(item.value || ''),
    normalizedQuery,
    { fuzzy: true },
  );
  return valuePriority > 0;
}

function buildMergedHistoryGroup(
  localHistorySuggestionItems: SearchSuggestionItem[],
  browserHistorySuggestionItems: SearchSuggestionItem[],
): SearchSuggestionItem[] {
  const mergedHistoryItems = mergeUniqueSuggestions(
    localHistorySuggestionItems,
    browserHistorySuggestionItems,
  );

  return mergedHistoryItems.sort((a, b) => {
    const aTimestamp = a.type === 'history' ? Number(a.timestamp || 0) : 0;
    const bTimestamp = b.type === 'history' ? Number(b.timestamp || 0) : 0;
    return bTimestamp - aTimestamp;
  });
}

function buildDefaultModeSuggestions(args: {
  searchValue: string;
  localHistorySuggestionItems: SearchSuggestionItem[];
  browserHistorySuggestionItems: SearchSuggestionItem[];
  builtinSiteSuggestionItems: SearchSuggestionItem[];
  shortcutSuggestionItems: SearchSuggestionItem[];
  emptyStateLimit: number;
  queryStateLimit: number;
}): SearchSuggestionItem[] {
  const {
    searchValue,
    localHistorySuggestionItems,
    browserHistorySuggestionItems,
    builtinSiteSuggestionItems,
    shortcutSuggestionItems,
    emptyStateLimit,
    queryStateLimit,
  } = args;

  const normalizedQuery = normalizeSuggestionQuery(searchValue);
  const mergedHistoryItems = buildMergedHistoryGroup(
    localHistorySuggestionItems,
    browserHistorySuggestionItems,
  );

  if (!normalizedQuery) {
    return mergedHistoryItems.slice(0, emptyStateLimit);
  }

  const shortcutGroup = shortcutSuggestionItems.filter((item) => matchesSuggestionQuery(item, normalizedQuery));
  const siteGroup = builtinSiteSuggestionItems.filter((item) => matchesSuggestionQuery(item, normalizedQuery));
  const historyGroup = mergedHistoryItems.filter((item) => matchesSuggestionQuery(item, normalizedQuery));

  return mergeUniqueSuggestions(
    shortcutGroup,
    siteGroup,
    historyGroup,
  ).slice(0, queryStateLimit);
}

export function buildSearchSuggestionItems({
  mode,
  searchValue,
  bookmarkSuggestionItems,
  tabSuggestionItems,
  localHistorySuggestionItems,
  browserHistorySuggestionItems,
  builtinSiteSuggestionItems,
  shortcutSuggestionItems,
  emptyStateLimit = 30,
  queryStateLimit = 15,
}: BuildSearchSuggestionItemsArgs): SearchSuggestionItem[] {
  if (mode === 'tabs') {
    return tabSuggestionItems;
  }

  if (mode === 'bookmarks') {
    return bookmarkSuggestionItems;
  }

  return buildDefaultModeSuggestions({
    searchValue,
    localHistorySuggestionItems,
    browserHistorySuggestionItems,
    builtinSiteSuggestionItems,
    shortcutSuggestionItems,
    emptyStateLimit,
    queryStateLimit,
  });
}
