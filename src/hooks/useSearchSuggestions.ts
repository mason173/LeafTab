import { useMemo } from 'react';
import type { ScenarioShortcuts, SearchSuggestionItem } from '@/types';
import type { SearchHistoryEntry } from '@/hooks/useSearch';
import { buildSearchSuggestionItems } from '@/utils/searchSuggestionEngine';
import type { SuggestionUsageMap } from '@/utils/suggestionPersonalization';
import { useSearchSuggestionSources } from '@/hooks/useSearchSuggestionSources';
import type { SearchQueryModel } from '@/utils/searchQueryModel';

type UseSearchSuggestionsOptions = {
  searchValue: string;
  queryModel: SearchQueryModel;
  filteredHistoryItems: SearchHistoryEntry[];
  scenarioShortcuts: ScenarioShortcuts;
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
  historyPermissionGranted: boolean;
};

export function useSearchSuggestions({
  searchValue,
  queryModel,
  filteredHistoryItems,
  scenarioShortcuts,
  searchSiteShortcutEnabled,
  suggestionUsageMap,
  historyPermissionGranted,
}: UseSearchSuggestionsOptions): SearchSuggestionItem[] {
  const {
    suggestionDisplayMode,
    localHistorySuggestionItems,
    builtinSiteSuggestionItems,
    shortcutSuggestionItems,
    bookmarkSuggestionItems,
    tabSuggestionItems,
    browserHistorySuggestionItems,
  } = useSearchSuggestionSources({
    searchValue,
    queryModel,
    filteredHistoryItems,
    scenarioShortcuts,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
    historyPermissionGranted,
  });

  return useMemo(() => buildSearchSuggestionItems({
    mode: suggestionDisplayMode,
    searchValue,
    bookmarkSuggestionItems,
    tabSuggestionItems,
    localHistorySuggestionItems,
    browserHistorySuggestionItems,
    builtinSiteSuggestionItems,
    shortcutSuggestionItems,
    emptyStateLimit: 30,
    queryStateLimit: 15,
  }), [
    bookmarkSuggestionItems,
    browserHistorySuggestionItems,
    builtinSiteSuggestionItems,
    localHistorySuggestionItems,
    searchValue,
    shortcutSuggestionItems,
    suggestionDisplayMode,
    tabSuggestionItems,
  ]);
}
