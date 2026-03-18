import type { ScenarioShortcuts, SearchSuggestionItem } from '@/types';
import {
  buildSearchMatchCandidates,
  getShortcutSuggestionScoreFromCandidates,
  normalizeSearchQuery,
} from '@/utils/searchHelpers';
import { getBuiltinSiteShortcutSuggestions } from '@/utils/siteSearch';
import {
  buildShortcutUsageKey,
  getSuggestionUsageBoost,
  type SuggestionUsageMap,
} from '@/utils/suggestionPersonalization';

type SearchHistoryLikeEntry = {
  query: string;
  timestamp: number;
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

export type SearchSuggestionSourceItems = {
  localHistorySuggestionItems: SearchSuggestionItem[];
  builtinSiteSuggestionItems: SearchSuggestionItem[];
  shortcutSuggestionItems: SearchSuggestionItem[];
};

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
  scenarioShortcuts: ScenarioShortcuts,
): IndexedShortcutSuggestion[] {
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
}

export function buildShortcutSuggestionItems(args: {
  deferredSearchValue: string;
  shortcutSearchIndex: IndexedShortcutSuggestion[];
  suggestionUsageMap: SuggestionUsageMap;
}): SearchSuggestionItem[] {
  const { deferredSearchValue, shortcutSearchIndex, suggestionUsageMap } = args;
  const normalizedQuery = normalizeSearchQuery(deferredSearchValue);
  if (!normalizedQuery) return [];

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
}

export function buildBuiltinSiteSuggestionItems(args: {
  deferredSearchValue: string;
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
}): SearchSuggestionItem[] {
  const { deferredSearchValue, searchSiteShortcutEnabled, suggestionUsageMap } = args;
  if (!searchSiteShortcutEnabled) return [];
  const sites = getBuiltinSiteShortcutSuggestions(deferredSearchValue, 8);
  if (sites.length === 0) return [];

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
}

export function buildLocalHistorySuggestionItems(
  filteredHistoryItems: readonly SearchHistoryLikeEntry[],
): SearchSuggestionItem[] {
  return filteredHistoryItems.map((historyItem) => ({
    type: 'history',
    label: historyItem.query,
    value: historyItem.query,
    timestamp: historyItem.timestamp,
    historySource: 'local',
  } as SearchSuggestionItem));
}

export function buildSearchSuggestionSourceItems(args: {
  deferredSearchValue: string;
  filteredHistoryItems: readonly SearchHistoryLikeEntry[];
  shortcutSearchIndex?: IndexedShortcutSuggestion[];
  scenarioShortcuts?: ScenarioShortcuts;
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
}): SearchSuggestionSourceItems {
  const {
    deferredSearchValue,
    filteredHistoryItems,
    shortcutSearchIndex,
    scenarioShortcuts,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
  } = args;
  const resolvedShortcutSearchIndex = shortcutSearchIndex ?? buildShortcutSearchIndex(scenarioShortcuts || {});

  return {
    localHistorySuggestionItems: buildLocalHistorySuggestionItems(filteredHistoryItems),
    builtinSiteSuggestionItems: buildBuiltinSiteSuggestionItems({
      deferredSearchValue,
      searchSiteShortcutEnabled,
      suggestionUsageMap,
    }),
    shortcutSuggestionItems: buildShortcutSuggestionItems({
      deferredSearchValue,
      shortcutSearchIndex: resolvedShortcutSearchIndex,
      suggestionUsageMap,
    }),
  };
}
