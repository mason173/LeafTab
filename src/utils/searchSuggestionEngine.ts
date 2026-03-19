import type { SearchSuggestionItem } from '@/types';
import { buildSearchActions, type SearchAction } from '@/utils/searchActions';
import type { SearchSuggestionDisplayMode } from '@/utils/searchSuggestionPolicy';
import {
  buildSearchMatchCandidates,
  getSearchMatchPriorityFromCandidates,
} from '@/utils/searchHelpers';

type BuildSearchSuggestionActionsArgs = {
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

function looksLikeUrlTarget(rawValue: string): boolean {
  const value = rawValue.trim();
  if (!value) return false;
  return /^(https?:\/\/|www\.)/i.test(value) || /^[a-z0-9-]+\.[a-z]{2,}(\/|$)/i.test(value);
}

function normalizeUrlTarget(rawValue: string): string {
  return rawValue
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '');
}

function getSuggestionDedupKey(item: SearchSuggestionItem): string {
  const rawValue = item.value || '';
  if (
    item.type === 'shortcut'
    || item.type === 'bookmark'
    || item.type === 'tab'
    || looksLikeUrlTarget(rawValue)
  ) {
    return `target|${normalizeUrlTarget(rawValue)}`;
  }
  return `${item.type}|${rawValue.trim().toLowerCase()}`;
}

function appendUniqueSuggestions(args: {
  target: SearchSuggestionItem[];
  seenKeys: Set<string>;
  items: readonly SearchSuggestionItem[];
  limit: number;
}) {
  const { target, seenKeys, items, limit } = args;
  for (const item of items) {
    if (target.length >= limit) return;
    const dedupKey = getSuggestionDedupKey(item);
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);
    target.push(item);
  }
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

function filterMatchedSuggestions(
  items: readonly SearchSuggestionItem[],
  normalizedQuery: string,
): SearchSuggestionItem[] {
  if (!normalizedQuery) return [...items];
  return items.filter((item) => matchesSuggestionQuery(item, normalizedQuery));
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

  if (!normalizedQuery) {
    const items: SearchSuggestionItem[] = [];
    const seenKeys = new Set<string>();
    appendUniqueSuggestions({
      target: items,
      seenKeys,
      items: localHistorySuggestionItems,
      limit: emptyStateLimit,
    });
    appendUniqueSuggestions({
      target: items,
      seenKeys,
      items: browserHistorySuggestionItems,
      limit: emptyStateLimit,
    });
    return items;
  }

  const items: SearchSuggestionItem[] = [];
  const seenKeys = new Set<string>();

  appendUniqueSuggestions({
    target: items,
    seenKeys,
    items: filterMatchedSuggestions(shortcutSuggestionItems, normalizedQuery),
    limit: queryStateLimit,
  });
  appendUniqueSuggestions({
    target: items,
    seenKeys,
    items: filterMatchedSuggestions(localHistorySuggestionItems, normalizedQuery),
    limit: queryStateLimit,
  });
  appendUniqueSuggestions({
    target: items,
    seenKeys,
    items: filterMatchedSuggestions(browserHistorySuggestionItems, normalizedQuery),
    limit: queryStateLimit,
  });
  appendUniqueSuggestions({
    target: items,
    seenKeys,
    items: filterMatchedSuggestions(builtinSiteSuggestionItems, normalizedQuery),
    limit: queryStateLimit,
  });

  return items;
}

export function buildSearchSuggestionActions({
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
}: BuildSearchSuggestionActionsArgs): SearchAction[] {
  const items = (() => {
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
  })();

  return buildSearchActions(items);
}
