import { useMemo } from 'react';
import type { Shortcut } from '@/types';
import type { SearchHistoryEntry } from '@/hooks/useSearch';
import type { SearchAction } from '@/utils/searchActions';
import { buildSearchSuggestionActions } from '@/utils/searchSuggestionEngine';
import type { SuggestionUsageMap } from '@/utils/suggestionPersonalization';
import {
  useSearchSuggestionSources,
  type SearchSuggestionSourceStatus,
} from '@/hooks/useSearchSuggestionSources';
import type { SearchSessionModel } from '@/utils/searchSessionModel';
import type { SearchCommandPermission } from '@/utils/searchCommands';

type UseSearchSuggestionsOptions = {
  searchValue: string;
  queryModel: SearchSessionModel;
  filteredHistoryItems: SearchHistoryEntry[];
  shortcuts: Shortcut[];
  searchSiteShortcutEnabled: boolean;
  suggestionUsageMap: SuggestionUsageMap;
  historyPermissionGranted: boolean;
  bookmarksPermissionGranted: boolean;
  tabsPermissionGranted: boolean;
  permissionWarmup: SearchCommandPermission | null;
};

export type SearchSuggestionsResult = {
  actions: SearchAction[];
  sourceStatus: SearchSuggestionSourceStatus;
};

export function useSearchSuggestions({
  searchValue,
  queryModel,
  filteredHistoryItems,
  shortcuts,
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
    shortcuts,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
    historyPermissionGranted,
    bookmarksPermissionGranted,
    tabsPermissionGranted,
    permissionWarmup,
  });

  const actions = useMemo(() => buildSearchSuggestionActions({
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
    actions,
    sourceStatus,
  }), [actions, sourceStatus]);
}
