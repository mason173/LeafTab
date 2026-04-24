import { describe, expect, it } from 'vitest';
import {
  buildSettingsSearchEntries,
  buildSettingsSuggestionItems,
} from '@/components/search/searchSlashCommands';

const t = ((key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key) as never;

function buildEntries() {
  return buildSettingsSearchEntries({
    t,
    searchEngineLabel: 'Google',
    themeModeLabel: '深色',
    shortcutIconAppearanceLabel: '彩色',
    wallpaperModeLabel: '天气',
    syncProviderLabel: '云同步',
    searchTabSwitchEngine: true,
    searchPrefixEnabled: true,
    searchSiteDirectEnabled: true,
    searchSiteShortcutEnabled: true,
    searchAnyKeyCaptureEnabled: true,
    searchCalculatorEnabled: true,
    searchRotatingPlaceholderEnabled: false,
    currentWallpaperMode: 'weather',
    shortcutIconCornerRadiusLabel: '36%',
    shortcutIconScaleLabel: '112%',
    shortcutShowTitleEnabled: true,
    shortcutGridColumnsLabel: '5 列',
    visualEffectsLevelLabel: '高',
    preventDuplicateNewTab: true,
    showTime: true,
    languageLabel: '简体中文',
  });
}

describe('buildSettingsSuggestionItems', () => {
  it('surfaces icon size settings for direct queries', () => {
    const items = buildSettingsSuggestionItems({
      entries: buildEntries(),
      queryKey: '图标大小',
    });

    expect(items[0]?.label).toBe('图标大小');
  });

  it('surfaces icon corner radius settings for direct queries', () => {
    const items = buildSettingsSuggestionItems({
      entries: buildEntries(),
      queryKey: '图标圆角',
    });

    expect(items[0]?.label).toBe('图标圆角');
  });

  it('surfaces wallpaper mode sub-items for targeted wallpaper queries', () => {
    const entries = buildEntries();

    const weatherItems = buildSettingsSuggestionItems({
      entries,
      queryKey: '天气壁纸',
    });
    const bingItems = buildSettingsSuggestionItems({
      entries,
      queryKey: '必应壁纸',
    });

    expect(weatherItems[0]?.label).toBe('天气壁纸');
    expect(bingItems[0]?.label).toBe('必应壁纸');
  });

  it('keeps empty-state settings focused on top-level entries', () => {
    const items = buildSettingsSuggestionItems({
      entries: buildEntries(),
      queryKey: '',
    });

    expect(items.some((item) => item.label === 'LeafTab 设置')).toBe(true);
    expect(items.some((item) => item.label === '搜索设置')).toBe(true);
    expect(items.some((item) => item.label === '图标大小')).toBe(false);
  });
});
