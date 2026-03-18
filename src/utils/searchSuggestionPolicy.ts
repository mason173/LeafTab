import type { SearchCommandId } from '@/utils/searchCommands';

export type SearchSuggestionDisplayMode = 'default' | 'bookmarks' | 'tabs';

export function resolveSearchSuggestionDisplayMode(
  commandId: SearchCommandId | null,
): SearchSuggestionDisplayMode {
  if (commandId === 'bookmarks') return 'bookmarks';
  if (commandId === 'tabs') return 'tabs';
  return 'default';
}
