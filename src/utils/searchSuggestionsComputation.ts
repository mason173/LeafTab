import type { SearchSuggestionItem } from '@/types';
import type { SearchAction } from '@/utils/searchActions';
import { buildSearchSuggestionActions } from '@/utils/searchSuggestionEngine';
import type { SearchSuggestionDisplayMode } from '@/utils/searchSuggestionPolicy';
import {
  buildSearchSuggestionSourceItems,
  type IndexedShortcutSuggestion,
} from '@/utils/searchSuggestionSources';
import type { SuggestionUsageMap } from '@/utils/suggestionPersonalization';

export const SEARCH_SUGGESTION_EMPTY_STATE_LIMIT = 30;
export const SEARCH_SUGGESTION_QUERY_STATE_LIMIT = 15;

export type SearchSuggestionHistoryEntry = {
  query: string;
  timestamp: number;
};

export type SearchSuggestionsComputationInput = {
  suggestionDisplayMode: SearchSuggestionDisplayMode;
  searchValue: string;
  filteredHistoryItems: SearchSuggestionHistoryEntry[];
  shortcutSearchIndex: IndexedShortcutSuggestion[];
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
  bookmarkSuggestionItems: SearchSuggestionItem[];
  tabSuggestionItems: SearchSuggestionItem[];
  commandSuggestionItems: SearchSuggestionItem[];
  settingSuggestionItems: SearchSuggestionItem[];
  recentClosedSuggestionItems: SearchSuggestionItem[];
  browserHistorySuggestionItems: SearchSuggestionItem[];
  remoteSuggestionItems: SearchSuggestionItem[];
};

export function computeSearchSuggestionActions(
  input: SearchSuggestionsComputationInput,
): SearchAction[] {
  const {
    suggestionDisplayMode,
    searchValue,
    filteredHistoryItems,
    shortcutSearchIndex,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
    bookmarkSuggestionItems,
    tabSuggestionItems,
    commandSuggestionItems,
    settingSuggestionItems,
    recentClosedSuggestionItems,
    browserHistorySuggestionItems,
    remoteSuggestionItems,
  } = input;

  const {
    localHistorySuggestionItems,
    builtinSiteSuggestionItems,
    shortcutSuggestionItems,
  } = buildSearchSuggestionSourceItems({
    searchValue,
    filteredHistoryItems,
    shortcutSearchIndex,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
  });

  return buildSearchSuggestionActions({
    mode: suggestionDisplayMode,
    searchValue,
    bookmarkSuggestionItems,
    tabSuggestionItems,
    commandSuggestionItems,
    settingSuggestionItems,
    recentClosedSuggestionItems,
    localHistorySuggestionItems,
    remoteSuggestionItems,
    browserHistorySuggestionItems,
    builtinSiteSuggestionItems,
    shortcutSuggestionItems,
    emptyStateLimit: SEARCH_SUGGESTION_EMPTY_STATE_LIMIT,
    queryStateLimit: SEARCH_SUGGESTION_QUERY_STATE_LIMIT,
  });
}
