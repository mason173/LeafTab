import { describe, expect, it } from 'vitest';
import type { Shortcut } from '@/types';
import {
  buildShortcutSuggestionItems,
  prepareShortcutSearchIndex,
} from '@/utils/searchSuggestionSources';

function createShortcut(overrides: Partial<Shortcut> = {}): Shortcut {
  return {
    id: overrides.id || 'shortcut-1',
    title: overrides.title || '',
    url: overrides.url || '',
    icon: overrides.icon || '',
    kind: overrides.kind,
    children: overrides.children,
    folderDisplayMode: overrides.folderDisplayMode,
    useOfficialIcon: overrides.useOfficialIcon,
    autoUseOfficialIcon: overrides.autoUseOfficialIcon,
    officialIconAvailableAtSave: overrides.officialIconAvailableAtSave,
    officialIconColorOverride: overrides.officialIconColorOverride,
    iconRendering: overrides.iconRendering,
    iconColor: overrides.iconColor,
  };
}

describe('searchSuggestionSources shortcut search', () => {
  it('matches flattened folder children by pinyin initials and full pinyin', async () => {
    const shortcuts = [
      createShortcut({
        id: 'folder-1',
        title: '常用合集',
        kind: 'folder',
        children: [
          createShortcut({
            id: 'child-wxds',
            title: '微信读书',
            url: 'https://weread.qq.com',
          }),
          createShortcut({
            id: 'child-zh',
            title: '知乎',
            url: 'https://zhihu.com',
          }),
        ],
      }),
    ];
    const shortcutSearchIndex = await prepareShortcutSearchIndex(shortcuts);

    expect(
      buildShortcutSuggestionItems({
        searchValue: 'wxds',
        shortcutSearchIndex,
        suggestionUsageMap: {},
      }).map((item) => item.label),
    ).toEqual(['微信读书']);

    expect(
      buildShortcutSuggestionItems({
        searchValue: 'weixindushu',
        shortcutSearchIndex,
        suggestionUsageMap: {},
      }).map((item) => item.label),
    ).toEqual(['微信读书']);

    expect(
      buildShortcutSuggestionItems({
        searchValue: 'zhihu',
        shortcutSearchIndex,
        suggestionUsageMap: {},
      }).map((item) => item.label),
    ).toEqual(['知乎']);
  });
});
