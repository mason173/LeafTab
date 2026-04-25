import type { SearchSuggestionItem } from '@/types';
import type { SearchCommandPermission } from '@/utils/searchCommands';
import type { MixedSearchResult, MixedSearchSourceId } from '@/utils/mixedSearchContracts';
import {
  getSlashCommandDisplayIcon,
  parseSlashCommandActionId,
} from '@/components/search/searchSlashCommands';
import { buildShortcutUsageKey } from '@/utils/suggestionPersonalization';

export type SearchSecondaryAction =
  | {
      id: 'add-shortcut';
      kind: 'add-shortcut';
      active?: false;
    }
  | {
      id: 'close-tab';
      kind: 'close-tab';
      active?: false;
    }
  | {
      id: 'toggle-pin-tab';
      kind: 'toggle-pin-tab';
      active: boolean;
    }
  | {
      id: 'copy-link';
      kind: 'copy-link';
      active?: false;
    }
  | {
      id: 'remove-bookmark';
      kind: 'remove-bookmark';
      active?: false;
    }
  | {
      id: 'edit-shortcut';
      kind: 'edit-shortcut';
      active?: false;
    }
  | {
      id: 'delete-shortcut';
      kind: 'delete-shortcut';
      active?: false;
    }
  | {
      id: 'set-theme-mode';
      kind: 'set-theme-mode';
      targetMode: 'system' | 'light' | 'dark';
      active: boolean;
    }
  | {
      id: 'cycle-search-engine';
      kind: 'cycle-search-engine';
      active?: false;
    }
  | {
      id: 'toggle-show-time';
      kind: 'toggle-show-time';
      active: boolean;
    }
  | {
      id: 'set-wallpaper-mode';
      kind: 'set-wallpaper-mode';
      targetMode: 'bing' | 'weather' | 'color' | 'custom';
      active: boolean;
    }
  | {
      id: 'set-shortcut-icon-appearance';
      kind: 'set-shortcut-icon-appearance';
      targetAppearance: 'colorful' | 'monochrome' | 'accent';
      active: boolean;
    };

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
    secondaryActions: SearchSecondaryAction[];
    displayIcon?: SearchActionDisplayIcon;
    sourceId?: MixedSearchSourceId;
    baseRank?: number;
    reasons?: readonly string[];
  }
  | {
    id: string;
    kind: 'open-target';
    item: SearchSuggestionItem;
    permission: SearchCommandPermission | null;
    usageKey: string | null;
    secondaryActions: SearchSecondaryAction[];
    displayIcon?: SearchActionDisplayIcon;
    sourceId?: MixedSearchSourceId;
    baseRank?: number;
    reasons?: readonly string[];
  };

function buildTabSecondaryActions(item: Extract<SearchSuggestionItem, { type: 'tab' }>): SearchSecondaryAction[] {
  return [
    { id: 'add-shortcut', kind: 'add-shortcut' },
    { id: 'close-tab', kind: 'close-tab' },
    { id: 'toggle-pin-tab', kind: 'toggle-pin-tab', active: Boolean(item.pinned) },
    { id: 'copy-link', kind: 'copy-link' },
  ];
}

function buildBookmarkSecondaryActions(item: Extract<SearchSuggestionItem, { type: 'bookmark' }>): SearchSecondaryAction[] {
  return [
    { id: 'add-shortcut', kind: 'add-shortcut' },
    ...(item.bookmarkId ? [{ id: 'remove-bookmark', kind: 'remove-bookmark' } as const] : []),
    { id: 'copy-link', kind: 'copy-link' },
  ];
}

function buildShortcutSecondaryActions(item: Extract<SearchSuggestionItem, { type: 'shortcut' }>): SearchSecondaryAction[] {
  if (!item.shortcutId) {
    return [];
  }

  return [
    { id: 'edit-shortcut', kind: 'edit-shortcut' },
    { id: 'delete-shortcut', kind: 'delete-shortcut' },
    { id: 'copy-link', kind: 'copy-link' },
  ];
}

function buildSettingsSecondaryActions(item: Extract<SearchSuggestionItem, { type: 'history' }>): SearchSecondaryAction[] {
  const actionKey = item.searchActionKey;
  if (!actionKey) return [];

  if (actionKey === 'theme-mode-entry') {
    const currentThemeMode = item.searchActionState;
    return [
      {
        id: 'set-theme-mode',
        kind: 'set-theme-mode',
        targetMode: 'system',
        active: currentThemeMode === 'system',
      },
      {
        id: 'set-theme-mode',
        kind: 'set-theme-mode',
        targetMode: 'light',
        active: currentThemeMode === 'light',
      },
      {
        id: 'set-theme-mode',
        kind: 'set-theme-mode',
        targetMode: 'dark',
        active: currentThemeMode === 'dark',
      },
    ];
  }

  if (actionKey === 'search-settings-entry') {
    return [{ id: 'cycle-search-engine', kind: 'cycle-search-engine' }];
  }

  if (actionKey === 'show-time-setting') {
    return [{
      id: 'toggle-show-time',
      kind: 'toggle-show-time',
      active: item.searchActionState === 'enabled',
    }];
  }

  if (
    actionKey === 'wallpaper-settings-entry'
    || actionKey === 'wallpaper-bing-setting'
    || actionKey === 'wallpaper-weather-setting'
    || actionKey === 'wallpaper-color-setting'
    || actionKey === 'wallpaper-custom-setting'
  ) {
    const currentWallpaperMode = item.searchActionState;
    return [
      {
        id: 'set-wallpaper-mode',
        kind: 'set-wallpaper-mode',
        targetMode: 'bing',
        active: currentWallpaperMode === 'bing',
      },
      {
        id: 'set-wallpaper-mode',
        kind: 'set-wallpaper-mode',
        targetMode: 'weather',
        active: currentWallpaperMode === 'weather',
      },
      {
        id: 'set-wallpaper-mode',
        kind: 'set-wallpaper-mode',
        targetMode: 'color',
        active: currentWallpaperMode === 'color',
      },
      {
        id: 'set-wallpaper-mode',
        kind: 'set-wallpaper-mode',
        targetMode: 'custom',
        active: currentWallpaperMode === 'custom',
      },
    ];
  }

  if (actionKey === 'shortcut-icon-settings-entry' || actionKey === 'shortcut-icon-appearance-setting') {
    const currentAppearance = item.searchActionState;
    return [
      {
        id: 'set-shortcut-icon-appearance',
        kind: 'set-shortcut-icon-appearance',
        targetAppearance: 'colorful',
        active: currentAppearance === 'colorful',
      },
      {
        id: 'set-shortcut-icon-appearance',
        kind: 'set-shortcut-icon-appearance',
        targetAppearance: 'monochrome',
        active: currentAppearance === 'monochrome',
      },
      {
        id: 'set-shortcut-icon-appearance',
        kind: 'set-shortcut-icon-appearance',
        targetAppearance: 'accent',
        active: currentAppearance === 'accent',
      },
    ];
  }

  return [];
}

function buildSearchActionId(item: SearchSuggestionItem, index: number): string {
  if (item.type === 'tab') {
    return `tab:${String(item.tabId ?? 'unknown')}:${String(item.windowId ?? 'unknown')}`;
  }
  if (item.type === 'bookmark' && item.bookmarkId) {
    return `bookmark:${item.bookmarkId}`;
  }
  if (item.type === 'shortcut' && item.shortcutId) {
    return `shortcut:${item.shortcutId}`;
  }
  if (item.type === 'history' && item.searchActionKey) {
    return `history-action:${item.searchActionKey}`;
  }
  if (item.type === 'engine-prefix') {
    return `engine-prefix:${String(item.engine ?? 'system')}:${item.value}`;
  }
  return `${item.type}:${item.value}:${index}`;
}

export function createSearchAction(
  item: SearchSuggestionItem,
  index: number,
  metadata?: {
    sourceId?: MixedSearchSourceId;
    baseRank?: number;
    reasons?: readonly string[];
  },
): SearchAction {
  if (item.type === 'tab') {
    return {
      id: buildSearchActionId(item, index),
      kind: 'focus-tab',
      item,
      permission: 'tabs',
      secondaryActions: buildTabSecondaryActions(item),
      sourceId: metadata?.sourceId,
      baseRank: metadata?.baseRank,
      reasons: metadata?.reasons,
    };
  }

  if (item.type === 'bookmark') {
    return {
      id: buildSearchActionId(item, index),
      kind: 'open-target',
      item,
      permission: 'bookmarks',
      usageKey: null,
      secondaryActions: buildBookmarkSecondaryActions(item),
      sourceId: metadata?.sourceId,
      baseRank: metadata?.baseRank,
      reasons: metadata?.reasons,
    };
  }

  if (item.type === 'shortcut') {
    return {
      id: buildSearchActionId(item, index),
      kind: 'open-target',
      item,
      permission: null,
      usageKey: buildShortcutUsageKey(item.value),
      secondaryActions: buildShortcutSecondaryActions(item),
      sourceId: metadata?.sourceId,
      baseRank: metadata?.baseRank,
      reasons: metadata?.reasons,
    };
  }

  const slashActionId = parseSlashCommandActionId(item.value);
  const historySecondaryActions = item.type === 'history'
    ? buildSettingsSecondaryActions(item)
    : [];

  return {
    id: buildSearchActionId(item, index),
    kind: 'open-target',
    item,
    permission: null,
    usageKey: null,
    secondaryActions: historySecondaryActions,
    displayIcon: slashActionId ? getSlashCommandDisplayIcon(slashActionId) : undefined,
    sourceId: metadata?.sourceId,
    baseRank: metadata?.baseRank,
    reasons: metadata?.reasons,
  };
}

export function buildSearchActions(items: readonly SearchSuggestionItem[]): SearchAction[] {
  return items.map((item, index) => createSearchAction(item, index));
}

export function buildSearchActionsFromResults(results: readonly MixedSearchResult[]): SearchAction[] {
  return results.map((result, index) => createSearchAction(result.candidate.item, index, {
    sourceId: result.candidate.sourceId,
    baseRank: result.globalRank,
    reasons: result.reasons,
  }));
}
