import { useMemo } from 'react';
import type { ScenarioShortcuts, SearchSuggestionItem } from '@/types';
import type { SearchHistoryEntry } from '@/hooks/useSearch';
import { buildSearchSuggestionItems } from '@/utils/searchSuggestionEngine';
import type { SuggestionUsageMap } from '@/utils/suggestionPersonalization';
import {
  useSearchSuggestionSources,
  type SearchSuggestionSourceStatus,
} from '@/hooks/useSearchSuggestionSources';
import type { SearchQueryModel } from '@/utils/searchQueryModel';
import type { SearchCommandPermission } from '@/utils/searchCommands';

type UseSearchSuggestionsOptions = {
  searchValue: string;
  queryModel: SearchQueryModel;
  filteredHistoryItems: SearchHistoryEntry[];
  scenarioShortcuts: ScenarioShortcuts;
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
  historyPermissionGranted: boolean;
  bookmarksPermissionGranted: boolean;
  tabsPermissionGranted: boolean;
  permissionWarmup: SearchCommandPermission | null;
};

export type SearchSuggestionsResult = {
  items: SearchSuggestionItem[];
  sourceStatus: SearchSuggestionSourceStatus;
};

export function useSearchSuggestions({
  searchValue,
  queryModel,
  filteredHistoryItems,
  scenarioShortcuts,
  searchSiteShortcutEnabled,
  suggestionUsageMap,
  historyPermissionGranted,
  bookmarksPermissionGranted,
  tabsPermissionGranted,
  permissionWarmup,
}: UseSearchSuggestionsOptions): SearchSuggestionsResult {
  const {
    suggestionDisplayMode,
    localHistorySuggestionItems,
    builtinSiteSuggestionItems,
    shortcutSuggestionItems,
    bookmarkSuggestionItems,
    tabSuggestionItems,
    browserHistorySuggestionItems,
    sourceStatus,
  } = useSearchSuggestionSources({
    searchValue,
    queryModel,
    filteredHistoryItems,
    scenarioShortcuts,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
    historyPermissionGranted,
    bookmarksPermissionGranted,
    tabsPermissionGranted,
    permissionWarmup,
  });

  const items = useMemo(() => buildSearchSuggestionItems({
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

  return useMemo(() => ({
    items,
    sourceStatus,
  }), [items, sourceStatus]);
}
