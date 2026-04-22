import type { SearchCommandId } from '@/utils/searchCommands';

export type SearchSuggestionDisplayMode = 'default' | 'bookmarks' | 'history' | 'tabs';

export function resolveSearchSuggestionDisplayMode(
  commandId: SearchCommandId | null,
): SearchSuggestionDisplayMode {
  if (commandId === 'bookmarks') return 'bookmarks';
  if (commandId === 'history') return 'history';
  if (commandId === 'tabs') return 'tabs';
  return 'default';
}
