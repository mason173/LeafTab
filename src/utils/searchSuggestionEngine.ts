import type { SearchSuggestionItem } from '@/types';
import {
  buildSearchActionsFromResults,
  type SearchAction,
} from '@/utils/searchActions';
import { type MixedSearchSourceBundle } from '@/utils/mixedSearchContracts';
import { buildMixedSearchResults } from '@/utils/mixedSearchFusion';
import { createMixedSearchQueryModel } from '@/utils/mixedSearchQueryModel';
import type { SearchSuggestionDisplayMode } from '@/utils/searchSuggestionPolicy';

type BuildSearchSuggestionActionsArgs = {
  mode: SearchSuggestionDisplayMode;
  searchValue: string;
  bookmarkSuggestionItems: SearchSuggestionItem[];
  tabSuggestionItems: SearchSuggestionItem[];
  localHistorySuggestionItems: SearchSuggestionItem[];
  commandSuggestionItems: SearchSuggestionItem[];
  settingSuggestionItems: SearchSuggestionItem[];
  recentClosedSuggestionItems?: SearchSuggestionItem[];
  remoteSuggestionItems: SearchSuggestionItem[];
  browserHistorySuggestionItems: SearchSuggestionItem[];
  builtinSiteSuggestionItems: SearchSuggestionItem[];
  shortcutSuggestionItems: SearchSuggestionItem[];
  emptyStateLimit?: number;
  queryStateLimit?: number;
};

export function buildSearchSuggestionActions({
  mode,
  searchValue,
  bookmarkSuggestionItems,
  tabSuggestionItems,
  localHistorySuggestionItems,
  commandSuggestionItems,
  settingSuggestionItems,
  recentClosedSuggestionItems = [],
  remoteSuggestionItems,
  browserHistorySuggestionItems,
  builtinSiteSuggestionItems,
  shortcutSuggestionItems,
  emptyStateLimit = 30,
  queryStateLimit = 15,
}: BuildSearchSuggestionActionsArgs): SearchAction[] {
  const queryModel = createMixedSearchQueryModel({
    searchValue,
    displayMode: mode,
  });
  const sourceBundles: MixedSearchSourceBundle[] = [
    { sourceId: 'tabs', items: tabSuggestionItems },
    { sourceId: 'recently-closed', items: recentClosedSuggestionItems },
    { sourceId: 'bookmarks', items: bookmarkSuggestionItems },
    { sourceId: 'browser-history', items: browserHistorySuggestionItems },
    { sourceId: 'local-history', items: localHistorySuggestionItems },
    { sourceId: 'shortcuts', items: shortcutSuggestionItems },
    { sourceId: 'builtin-sites', items: builtinSiteSuggestionItems },
    { sourceId: 'commands', items: commandSuggestionItems },
    { sourceId: 'settings', items: settingSuggestionItems },
    { sourceId: 'remote', items: remoteSuggestionItems },
  ];
  const results = buildMixedSearchResults({
    queryModel,
    sourceBundles,
    emptyStateLimit,
    queryStateLimit,
  });

  return buildSearchActionsFromResults(results);
}
