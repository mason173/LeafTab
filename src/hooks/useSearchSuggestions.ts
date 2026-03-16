import { useDeferredValue, useMemo } from 'react';
import type { ScenarioShortcuts, SearchSuggestionItem } from '@/types';
import type { SearchHistoryEntry } from '@/hooks/useSearch';
import { getCalculatorPreview } from '@/utils/calculator';
import {
  buildSearchMatchCandidates,
  getShortcutSuggestionScoreFromCandidates,
  normalizeSearchQuery,
  parseSearchEnginePrefix,
} from '@/utils/searchHelpers';
import { getBuiltinSiteShortcutSuggestions } from '@/utils/siteSearch';
import {
  buildShortcutUsageKey,
  getSuggestionUsageBoost,
  type SuggestionUsageMap,
} from '@/utils/suggestionPersonalization';

type UseSearchSuggestionsOptions = {
  searchValue: string;
  filteredHistoryItems: SearchHistoryEntry[];
  scenarioShortcuts: ScenarioShortcuts;
  searchPrefixEnabled: boolean;
  searchSiteShortcutEnabled: boolean;
  searchCalculatorEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
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
  searchPrefixEnabled,
  searchSiteShortcutEnabled,
  searchCalculatorEnabled,
  suggestionUsageMap,
}: UseSearchSuggestionsOptions) {
  const deferredSearchValue = useDeferredValue(searchValue);

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

  const calculatorSuggestionItem = useMemo(() => {
    if (!searchCalculatorEnabled) return null;
    const preview = getCalculatorPreview(deferredSearchValue);
    if (!preview) return null;
    return {
      type: 'calculator',
      label: preview.expression,
      value: String(preview.result),
      formattedValue: preview.resultText,
    } as SearchSuggestionItem;
  }, [deferredSearchValue, searchCalculatorEnabled]);

  return useMemo(() => {
    if (!searchValue.trim()) {
      return filteredHistoryItems.map((historyItem) => ({
        type: 'history',
        label: historyItem.query,
        value: historyItem.query,
        timestamp: historyItem.timestamp,
      } as SearchSuggestionItem));
    }

    const { overrideEngine } = searchPrefixEnabled
      ? parseSearchEnginePrefix(searchValue)
      : { overrideEngine: null };
    const seen = new Set<string>();
    const merged: SearchSuggestionItem[] = [];

    if (overrideEngine) {
      const prefixItem: SearchSuggestionItem = {
        type: 'engine-prefix',
        label: '',
        value: searchValue,
        engine: overrideEngine,
      };
      seen.add(buildSuggestionKey(prefixItem));
      merged.push(prefixItem);
    }

    if (calculatorSuggestionItem) {
      const key = buildSuggestionKey(calculatorSuggestionItem);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(calculatorSuggestionItem);
      }
    }

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

    for (const historyItem of filteredHistoryItems) {
      const item: SearchSuggestionItem = {
        type: 'history',
        label: historyItem.query,
        value: historyItem.query,
        timestamp: historyItem.timestamp,
      };
      const key = buildSuggestionKey(item);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    return merged.slice(0, 15);
  }, [
    builtinSiteSuggestionItems,
    calculatorSuggestionItem,
    filteredHistoryItems,
    searchPrefixEnabled,
    searchValue,
    shortcutSuggestionItems,
  ]);
}
