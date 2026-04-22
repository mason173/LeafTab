import type { SearchSuggestionItem } from '@/types';
import type { SearchCommandPermission } from '@/utils/searchCommands';
import { buildShortcutUsageKey } from '@/utils/suggestionPersonalization';

export type SearchActionDisplayIcon =
  | 'bookmarks'
  | 'history'
  | 'tabs'
  | 'search-settings'
  | 'theme-mode'
  | 'shortcut-guide'
  | 'shortcut-icon-settings'
  | 'wallpaper-settings'
  | 'sync-center'
  | 'about';

export type SearchAction =
  | {
    id: string;
    kind: 'focus-tab';
    item: SearchSuggestionItem;
    permission: 'tabs';
    displayIcon?: SearchActionDisplayIcon;
  }
  | {
    id: string;
    kind: 'open-target';
    item: SearchSuggestionItem;
    permission: SearchCommandPermission | null;
    usageKey: string | null;
    displayIcon?: SearchActionDisplayIcon;
  };

function buildSearchActionId(item: SearchSuggestionItem, index: number): string {
  if (item.type === 'tab') {
    return `tab:${String(item.tabId ?? 'unknown')}:${String(item.windowId ?? 'unknown')}`;
  }
  if (item.type === 'engine-prefix') {
    return `engine-prefix:${String(item.engine ?? 'system')}:${item.value}`;
  }
  return `${item.type}:${item.value}:${index}`;
}

export function createSearchAction(item: SearchSuggestionItem, index: number): SearchAction {
  if (item.type === 'tab') {
    return {
      id: buildSearchActionId(item, index),
      kind: 'focus-tab',
      item,
      permission: 'tabs',
    };
  }

  return {
    id: buildSearchActionId(item, index),
    kind: 'open-target',
    item,
    permission: item.type === 'bookmark' ? 'bookmarks' : null,
    usageKey: item.type === 'shortcut' ? buildShortcutUsageKey(item.value) : null,
  };
}

export function buildSearchActions(items: readonly SearchSuggestionItem[]): SearchAction[] {
  return items.map((item, index) => createSearchAction(item, index));
}
