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

  it('returns frequent shortcuts for empty-query recommendations', async () => {
    const shortcuts = [
      createShortcut({
        id: 'github',
        title: 'GitHub',
        url: 'https://github.com',
      }),
      createShortcut({
        id: 'notion',
        title: 'Notion',
        url: 'https://notion.so',
      }),
      createShortcut({
        id: 'figma',
        title: 'Figma',
        url: 'https://figma.com',
      }),
    ];
    const shortcutSearchIndex = await prepareShortcutSearchIndex(shortcuts);

    expect(
      buildShortcutSuggestionItems({
        searchValue: '',
        shortcutSearchIndex,
        suggestionUsageMap: {
          'shortcut:notion.so': {
            count: 12,
            lastUsedAt: Date.now(),
            hourCounts: Array.from({ length: 24 }, () => 0),
          },
          'shortcut:github.com': {
            count: 4,
            lastUsedAt: Date.now() - 1_000,
            hourCounts: Array.from({ length: 24 }, () => 0),
          },
        },
      }).map((item) => item.label),
    ).toEqual(['Notion', 'GitHub', 'Figma']);
  });

  it('prioritizes freshly added shortcuts in empty-query recommendations', async () => {
    const now = Date.now();
    const shortcuts = [
      createShortcut({
        id: 'github',
        title: 'GitHub',
        url: 'https://github.com',
      }),
      createShortcut({
        id: 'notion',
        title: 'Notion',
        url: 'https://notion.so',
      }),
      createShortcut({
        id: 'figma',
        title: 'Figma',
        url: 'https://figma.com',
      }),
    ];
    const shortcutSearchIndex = await prepareShortcutSearchIndex(shortcuts, {
      'shortcut:github.com': now,
    });

    expect(
      buildShortcutSuggestionItems({
        searchValue: '',
        shortcutSearchIndex,
        suggestionUsageMap: {
          'shortcut:notion.so': {
            count: 12,
            lastUsedAt: now,
            hourCounts: Array.from({ length: 24 }, () => 0),
          },
        },
      }).map((item) => item.label),
    ).toEqual(['GitHub', 'Notion', 'Figma']);
  });
});
