import type { SearchSuggestionItem } from '@/types';
import type { SearchCommandId } from '@/utils/searchCommands';

export type SearchSuggestionDisplayMode = 'default' | 'bookmarks' | 'tabs';

type BuildSuggestionPanelItemsArgs = {
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

function buildSuggestionKey(item: SearchSuggestionItem): string {
  if (item.type === 'shortcut') return `shortcut|${item.value}`;
  if (item.type === 'bookmark') return `bookmark|${item.value}`;
  if (item.type === 'tab') return `tab|${item.tabId ?? item.value}`;
  if (item.type === 'history') return `history|${item.value}`;
  if (item.type === 'engine-prefix') return `engine-prefix|${item.engine || ''}|${item.value}`;
  return `${item.type}|${item.value}`;
}

function mergeUniqueSuggestionSources(
  ...sources: Array<readonly SearchSuggestionItem[]>
): SearchSuggestionItem[] {
  const seen = new Set<string>();
  const merged: SearchSuggestionItem[] = [];

  for (const source of sources) {
    for (const item of source) {
      const key = buildSuggestionKey(item);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }

  return merged;
}

export function resolveSearchSuggestionDisplayMode(
  commandId: SearchCommandId | null,
): SearchSuggestionDisplayMode {
  if (commandId === 'bookmarks') return 'bookmarks';
  if (commandId === 'tabs') return 'tabs';
  return 'default';
}

export function buildSuggestionPanelItems({
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
}: BuildSuggestionPanelItemsArgs): SearchSuggestionItem[] {
  if (mode === 'tabs') return tabSuggestionItems;
  if (mode === 'bookmarks') return bookmarkSuggestionItems;

  const isEmptySearch = !searchValue.trim();
  if (isEmptySearch) {
    return mergeUniqueSuggestionSources(
      localHistorySuggestionItems,
      browserHistorySuggestionItems,
    ).slice(0, emptyStateLimit);
  }

  return mergeUniqueSuggestionSources(
    builtinSiteSuggestionItems,
    shortcutSuggestionItems,
    browserHistorySuggestionItems,
    localHistorySuggestionItems,
  ).slice(0, queryStateLimit);
}
