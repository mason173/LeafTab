import type { SearchSuggestionItem, Shortcut } from '@/types';
import {
  normalizeSearchQuery,
} from '@/utils/searchHelpers';
import { getBuiltinSiteShortcutSuggestions } from '@/utils/siteSearch';
import {
  buildShortcutUsageKey,
  getSuggestionUsageBoost,
  type SuggestionUsageMap,
} from '@/utils/suggestionPersonalization';
import {
  getRecentShortcutAdditionBoost,
  type RecentShortcutAdditionsMap,
} from '@/utils/recentShortcutAdditions';
import {
  buildShortcutSearchMatchIndex,
  getShortcutSearchScoreFromMatchIndex,
  mergeShortcutSearchMatchIndexes,
  prepareShortcutSearchMatchIndexes,
  type ShortcutSearchMatchIndex,
} from '@/utils/shortcutSearch';
import { flattenShortcutLinks } from '@/utils/shortcutFolders';

type SearchHistoryLikeEntry = {
  query: string;
  timestamp: number;
};

export type IndexedShortcutSuggestion = {
  id: string;
  label: string;
  url: string;
  icon: string;
  order: number;
  usageKey: string;
  recentAddedAt?: number;
  matchIndex: ShortcutSearchMatchIndex;
};

type RankedSuggestion = {
  item: SearchSuggestionItem;
  score: number;
  order: number;
};

export type SearchSuggestionSourceItems = {
  localHistorySuggestionItems: SearchSuggestionItem[];
  builtinSiteSuggestionItems: SearchSuggestionItem[];
  shortcutSuggestionItems: SearchSuggestionItem[];
};

const EMPTY_QUERY_SHORTCUT_LIMIT = 6;
const QUERY_SHORTCUT_LIMIT = 10;
const EMPTY_QUERY_LOCAL_HISTORY_LIMIT = 3;

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

export function buildShortcutSearchIndex(
  shortcuts: readonly Shortcut[],
  recentShortcutAdditionsMap: RecentShortcutAdditionsMap = {},
): IndexedShortcutSuggestion[] {
  const dedupedByUrl = new Map<string, IndexedShortcutSuggestion>();
  let order = 0;

  flattenShortcutLinks(shortcuts).forEach((shortcut) => {
    const url = shortcut.url.trim();
    if (!url) return;

    const matchIndex = buildShortcutSearchMatchIndex(shortcut);
    const existing = dedupedByUrl.get(url);
    if (existing) {
      existing.matchIndex = mergeShortcutSearchMatchIndexes(existing.matchIndex, matchIndex);
      if ((!existing.label || existing.label === existing.url) && shortcut.title) {
        existing.label = shortcut.title;
      }
      if (!existing.icon && shortcut.icon) {
        existing.icon = shortcut.icon;
      }
      return;
    }

    dedupedByUrl.set(url, {
      id: shortcut.id,
      label: shortcut.title || url,
      url,
      icon: shortcut.icon || '',
      order,
      usageKey: buildShortcutUsageKey(url),
      recentAddedAt: recentShortcutAdditionsMap[buildShortcutUsageKey(url)],
      matchIndex,
    });
    order += 1;
  });

  return Array.from(dedupedByUrl.values());
}

export async function prepareShortcutSearchIndex(
  shortcuts: readonly Shortcut[],
  recentShortcutAdditionsMap: RecentShortcutAdditionsMap = {},
): Promise<IndexedShortcutSuggestion[]> {
  await prepareShortcutSearchMatchIndexes(shortcuts);
  return buildShortcutSearchIndex(shortcuts, recentShortcutAdditionsMap);
}

export function buildShortcutSuggestionItems(args: {
  searchValue: string;
  shortcutSearchIndex: IndexedShortcutSuggestion[];
  suggestionUsageMap: SuggestionUsageMap;
}): SearchSuggestionItem[] {
  const { searchValue, shortcutSearchIndex, suggestionUsageMap } = args;
  const normalizedQuery = normalizeSearchQuery(searchValue);
  if (!normalizedQuery) {
    const topSuggestions: RankedSuggestion[] = [];
    for (const shortcut of shortcutSearchIndex) {
      const recentAdditionBoost = getRecentShortcutAdditionBoost(shortcut.recentAddedAt);
      insertRankedSuggestion(topSuggestions, {
        item: {
          type: 'shortcut',
          shortcutId: shortcut.id,
          label: shortcut.label,
          value: shortcut.url,
          icon: shortcut.icon,
          recentlyAdded: recentAdditionBoost > 0,
        },
        score: getSuggestionUsageBoost(suggestionUsageMap, shortcut.usageKey)
          + recentAdditionBoost
          + Math.max(0, 24 - shortcut.order),
        order: shortcut.order,
      }, EMPTY_QUERY_SHORTCUT_LIMIT);
    }
    return topSuggestions.map((entry) => entry.item);
  }

  const topMatches: RankedSuggestion[] = [];
  for (const shortcut of shortcutSearchIndex) {
    const score = getShortcutSearchScoreFromMatchIndex(shortcut.matchIndex, normalizedQuery);
    if (score === 0) continue;

    insertRankedSuggestion(topMatches, {
      item: {
        type: 'shortcut',
        shortcutId: shortcut.id,
        label: shortcut.label,
        value: shortcut.url,
        icon: shortcut.icon,
        recentlyAdded: false,
      },
      score: score * 100 + getSuggestionUsageBoost(suggestionUsageMap, shortcut.usageKey),
      order: shortcut.order,
    }, QUERY_SHORTCUT_LIMIT);
  }

  return topMatches.map((entry) => entry.item);
}

export function buildBuiltinSiteSuggestionItems(args: {
  searchValue: string;
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
}): SearchSuggestionItem[] {
  const { searchValue, searchSiteShortcutEnabled, suggestionUsageMap } = args;
  if (!searchSiteShortcutEnabled) return [];
  const sites = getBuiltinSiteShortcutSuggestions(searchValue, 8);
  if (sites.length === 0) return [];

  return sites
    .map((site, index) => ({
      item: {
        type: 'shortcut' as const,
        shortcutId: undefined,
        label: site.label,
        value: site.url,
        icon: '',
      },
      score: (sites.length - index) * 100 + getSuggestionUsageBoost(suggestionUsageMap, buildShortcutUsageKey(site.url)),
      order: index,
    }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ item }) => item);
}

export function buildLocalHistorySuggestionItems(
  filteredHistoryItems: readonly SearchHistoryLikeEntry[],
  searchValue = '',
): SearchSuggestionItem[] {
  const normalizedQuery = normalizeSearchQuery(searchValue);
  const sourceItems = normalizedQuery
    ? filteredHistoryItems
    : filteredHistoryItems.slice(0, EMPTY_QUERY_LOCAL_HISTORY_LIMIT);

  return sourceItems.map((historyItem) => ({
    type: 'history',
    label: historyItem.query,
    value: historyItem.query,
    timestamp: historyItem.timestamp,
    historySource: 'local',
  }));
}

export function buildSearchSuggestionSourceItems(args: {
  searchValue: string;
  filteredHistoryItems: readonly SearchHistoryLikeEntry[];
  shortcutSearchIndex: IndexedShortcutSuggestion[];
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
}): SearchSuggestionSourceItems {
  const {
    searchValue,
    filteredHistoryItems,
    shortcutSearchIndex,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
  } = args;

  return {
    localHistorySuggestionItems: buildLocalHistorySuggestionItems(filteredHistoryItems, searchValue),
    builtinSiteSuggestionItems: buildBuiltinSiteSuggestionItems({
      searchValue,
      searchSiteShortcutEnabled,
      suggestionUsageMap,
    }),
    shortcutSuggestionItems: buildShortcutSuggestionItems({
      searchValue,
      shortcutSearchIndex,
      suggestionUsageMap,
    }),
  };
}
