import type { TFunction } from 'i18next';
import type { SearchSuggestionItem } from '@/types';
import type { WallpaperMode } from '@/wallpaper/types';
import {
  buildSearchMatchCandidates,
  compactSearchQuery,
  getSearchMatchPriorityFromCandidates,
  normalizeSearchQuery,
} from '@/utils/searchHelpers';
import type { SearchAction, SearchActionDisplayIcon } from '@/utils/searchActions';

const SLASH_COMMAND_ACTION_VALUE_PREFIX = 'leaftab://slash-action/';

export type SlashCommandDialogTarget =
  | 'settings-home'
  | 'search-settings'
  | 'shortcut-guide'
  | 'shortcut-icon-settings'
  | 'wallpaper-settings'
  | 'sync-center'
  | 'about';

export type SlashCommandActionId =
  | 'bookmarks'
  | 'history'
  | 'tabs'
  | 'settings-home'
  | 'search-settings'
  | 'theme-mode'
  | 'shortcut-guide'
  | 'shortcut-icon-settings'
  | 'wallpaper-settings'
  | 'sync-center'
  | 'about';

export type SlashCommandEntry = {
  id: SlashCommandActionId;
  icon: SearchActionDisplayIcon;
  label: string;
  detail?: string;
  keywords: string[];
  showInSlashPanel?: boolean;
};

type SlashCommandConfig = {
  id: SlashCommandActionId;
  icon: SearchActionDisplayIcon;
  getLabel: (t: TFunction) => string;
  getKeywords: () => string[];
  detailKey?: 'searchEngine' | 'themeMode' | 'shortcutIconAppearance' | 'wallpaperMode' | 'syncProvider';
  showInSlashPanel?: boolean;
};

type SlashCommandDetailKey = NonNullable<SlashCommandConfig['detailKey']>;

const SLASH_COMMAND_CONFIG: readonly SlashCommandConfig[] = [
  {
    id: 'bookmarks',
    icon: 'bookmarks',
    getLabel: (t) => t('search.slash.bookmarks', {
      defaultValue: '/bookmarks · 搜索浏览器书签',
    }),
    getKeywords: () => ['/bookmarks', '/b', 'bookmarks', '书签'],
  },
  {
    id: 'history',
    icon: 'history',
    getLabel: (t) => t('search.slash.history', {
      defaultValue: '/historys · 搜索浏览器历史记录',
    }),
    getKeywords: () => ['/historys', '/h', 'history', 'historys', '历史', '历史记录'],
  },
  {
    id: 'tabs',
    icon: 'tabs',
    getLabel: (t) => t('search.slash.tabs', {
      defaultValue: '/tabs · 搜索已打开标签页',
    }),
    getKeywords: () => ['/tabs', '/t', 'tabs', '标签页', '已打开标签页'],
  },
  {
    id: 'settings-home',
    icon: 'search-settings',
    getLabel: (t) => t('search.slash.settingsHome', {
      defaultValue: 'LeafTab 设置',
    }),
    getKeywords: () => ['设置', '通用设置', '偏好设置', 'settings', 'preferences'],
    showInSlashPanel: false,
  },
  {
    id: 'search-settings',
    icon: 'search-settings',
    getLabel: (t) => t('search.slash.searchSettings', {
      defaultValue: '搜索设置',
    }),
    getKeywords: () => ['设置', '搜索设置', 'search'],
    detailKey: 'searchEngine',
  },
  {
    id: 'theme-mode',
    icon: 'theme-mode',
    getLabel: (t) => t('search.slash.themeMode', {
      defaultValue: '主题模式',
    }),
    getKeywords: () => ['/theme', 'theme', '主题', '模式', '深色', '浅色', '跟随系统'],
    detailKey: 'themeMode',
  },
  {
    id: 'shortcut-guide',
    icon: 'shortcut-guide',
    getLabel: (t) => t('search.slash.shortcutGuide', {
      defaultValue: '快捷键指南',
    }),
    getKeywords: () => ['设置', '快捷键', '快捷键指南', 'guide'],
  },
  {
    id: 'shortcut-icon-settings',
    icon: 'shortcut-icon-settings',
    getLabel: (t) => t('search.slash.shortcutIconSettings', {
      defaultValue: '图标设置',
    }),
    getKeywords: () => ['设置', '图标', 'icon'],
    detailKey: 'shortcutIconAppearance',
  },
  {
    id: 'wallpaper-settings',
    icon: 'wallpaper-settings',
    getLabel: (t) => t('search.slash.wallpaperSettings', {
      defaultValue: '壁纸设置',
    }),
    getKeywords: () => ['设置', '壁纸', 'wallpaper'],
    detailKey: 'wallpaperMode',
  },
  {
    id: 'sync-center',
    icon: 'sync-center',
    getLabel: (t) => t('search.slash.syncCenter', {
      defaultValue: '同步中心',
    }),
    getKeywords: () => ['设置', '同步', 'sync'],
    detailKey: 'syncProvider',
  },
  {
    id: 'about',
    icon: 'about',
    getLabel: (t) => t('search.slash.about', {
      defaultValue: '关于 LeafTab',
    }),
    getKeywords: () => ['设置', '关于', 'about'],
  },
] as const;

const SLASH_COMMAND_SETTINGS_IDS = new Set<SlashCommandActionId>([
  'settings-home',
  'search-settings',
  'theme-mode',
  'shortcut-guide',
  'shortcut-icon-settings',
  'wallpaper-settings',
  'sync-center',
  'about',
]);

const SLASH_COMMAND_ICON_MAP = new Map<SlashCommandActionId, SearchActionDisplayIcon>(
  SLASH_COMMAND_CONFIG.map((command) => [command.id, command.icon]),
);

export function buildSlashCommandActionValue(actionId: SlashCommandActionId) {
  return `${SLASH_COMMAND_ACTION_VALUE_PREFIX}${actionId}`;
}

export function parseSlashCommandActionId(value: string): SlashCommandActionId | null {
  if (!value.startsWith(SLASH_COMMAND_ACTION_VALUE_PREFIX)) return null;
  const id = value.slice(SLASH_COMMAND_ACTION_VALUE_PREFIX.length);
  return SLASH_COMMAND_CONFIG.some((command) => command.id === id)
    ? id as SlashCommandActionId
    : null;
}

export function getSlashCommandDisplayIcon(actionId: SlashCommandActionId): SearchActionDisplayIcon {
  return SLASH_COMMAND_ICON_MAP.get(actionId) ?? 'search-settings';
}

export function buildSlashCommandEntries(args: {
  t: TFunction;
  details: Partial<Record<SlashCommandDetailKey, string>>;
}): SlashCommandEntry[] {
  const { t, details } = args;

  return SLASH_COMMAND_CONFIG.map((command) => ({
    id: command.id,
    icon: command.icon,
    label: command.getLabel(t),
    detail: command.detailKey ? details[command.detailKey] : undefined,
    keywords: command.getKeywords(),
    showInSlashPanel: command.showInSlashPanel,
  }));
}

function filterSlashCommandEntries(entries: SlashCommandEntry[], queryKey: string): SlashCommandEntry[] {
  if (!queryKey) return entries;

  return entries.filter((entry) => {
    if (getEntryMatchPriority([entry.label], queryKey) > 0) return true;
    if (entry.detail && getEntryMatchPriority([entry.detail], queryKey) > 0) return true;
    return getEntryMatchPriority(entry.keywords, queryKey) > 0;
  });
}

export function buildSlashCommandSuggestionItems(args: {
  entries: SlashCommandEntry[];
  queryKey: string;
  category: 'commands' | 'settings';
}): SearchSuggestionItem[] {
  const { entries, queryKey, category } = args;
  const filteredEntries = filterSlashCommandEntries(entries, queryKey)
    .filter((entry) => (
      category === 'settings'
        ? SLASH_COMMAND_SETTINGS_IDS.has(entry.id)
        : !SLASH_COMMAND_SETTINGS_IDS.has(entry.id)
    ));

  return filteredEntries.map((entry) => ({
    type: 'history',
    label: entry.label,
    detail: entry.detail,
    value: buildSlashCommandActionValue(entry.id),
    timestamp: 0,
    historySource: 'browser',
  }));
}

export function buildSlashCommandActions(args: {
  isOpen: boolean;
  entries: SlashCommandEntry[];
  queryKey: string;
}): SearchAction[] {
  const { isOpen, entries, queryKey } = args;
  if (!isOpen) return [];

  const filteredEntries = filterSlashCommandEntries(entries, queryKey)
    .filter((entry) => entry.showInSlashPanel !== false);

  return filteredEntries.map((entry, index) => ({
    id: `slash:${entry.id}:${index}`,
    kind: 'open-target',
    permission: null,
    usageKey: null,
    secondaryActions: [],
    displayIcon: entry.icon,
    sourceId: 'commands',
    baseRank: index,
    reasons: ['slash-command-panel'],
    item: {
      type: 'history',
      label: entry.label,
      detail: entry.detail,
      value: buildSlashCommandActionValue(entry.id),
      timestamp: 0,
      historySource: 'browser',
    },
  }));
}

export type SettingsSearchEntry = {
  id: string;
  actionId: SlashCommandActionId;
  label: string;
  detail?: string;
  keywords: string[];
  emptyVisible?: boolean;
  actionState?: string;
};

function resolveBooleanSettingDetail(t: TFunction, enabled: boolean) {
  return enabled
    ? t('common.enabled', { defaultValue: '已启用' })
    : t('common.disabled', { defaultValue: '已关闭' });
}

function resolveBooleanSettingState(enabled: boolean) {
  return enabled ? 'enabled' : 'disabled';
}

function resolveWallpaperSettingDetail(
  t: TFunction,
  currentWallpaperMode: WallpaperMode | undefined,
  targetMode: WallpaperMode,
  fallback: string,
) {
  if (currentWallpaperMode === targetMode) {
    return t('search.settings.currentSelected', {
      defaultValue: '当前使用中',
    });
  }
  return fallback;
}

function getEntryMatchPriority(values: readonly string[], queryKey: string) {
  let priority: 0 | 1 | 2 = 0;
  for (const value of values) {
    const nextPriority = getSearchMatchPriorityFromCandidates(
      buildSearchMatchCandidates(value),
      queryKey,
      { fuzzy: true },
    );
    if (nextPriority > priority) {
      priority = nextPriority;
      if (priority === 2) return priority;
    }
  }
  return priority;
}

function scoreSettingsSearchEntry(entry: SettingsSearchEntry, queryKey: string) {
  if (!queryKey) {
    return entry.emptyVisible ? 1 : 0;
  }

  const normalizedLabel = normalizeSearchQuery(entry.label);
  const normalizedDetail = normalizeSearchQuery(entry.detail ?? '');
  const compactQueryKey = compactSearchQuery(queryKey);
  const compactLabel = compactSearchQuery(entry.label);
  const compactDetail = compactSearchQuery(entry.detail ?? '');
  const normalizedKeywords = entry.keywords
    .map((keyword) => normalizeSearchQuery(keyword))
    .filter(Boolean);
  const compactKeywords = entry.keywords
    .map((keyword) => compactSearchQuery(keyword))
    .filter(Boolean);
  const labelPriority = getEntryMatchPriority([entry.label], queryKey);
  const detailPriority = entry.detail ? getEntryMatchPriority([entry.detail], queryKey) : 0;
  const keywordPriority = getEntryMatchPriority(entry.keywords, queryKey);

  let score = labelPriority * 100 + keywordPriority * 80 + detailPriority * 32;
  if (normalizedLabel === queryKey) score += 48;
  if (normalizedKeywords.includes(queryKey)) score += 44;
  if (normalizedLabel.startsWith(queryKey)) score += 18;
  if (normalizedKeywords.some((keyword) => keyword.startsWith(queryKey))) score += 16;
  if (normalizedLabel.includes(queryKey)) score += 10;
  if (normalizedDetail && normalizedDetail.includes(queryKey)) score += 8;
  if (compactQueryKey && compactLabel === compactQueryKey) score += 40;
  if (compactQueryKey && compactKeywords.includes(compactQueryKey)) score += 36;
  if (compactQueryKey && compactLabel.startsWith(compactQueryKey)) score += 14;
  if (compactQueryKey && compactKeywords.some((keyword) => keyword.startsWith(compactQueryKey))) score += 12;
  if (compactQueryKey && compactDetail && compactDetail.includes(compactQueryKey)) score += 6;
  score += Math.max(0, 6 - Math.abs(normalizedLabel.length - queryKey.length));

  return score;
}

export function buildSettingsSearchEntries(args: {
  t: TFunction;
  searchEngineLabel: string;
  themeModeLabel: string;
  currentThemePreference?: 'system' | 'light' | 'dark';
  shortcutIconAppearanceLabel: string;
  currentShortcutIconAppearance?: 'colorful' | 'monochrome' | 'accent';
  wallpaperModeLabel: string;
  syncProviderLabel: string;
  searchTabSwitchEngine: boolean;
  searchPrefixEnabled: boolean;
  searchSiteDirectEnabled: boolean;
  searchSiteShortcutEnabled: boolean;
  searchAnyKeyCaptureEnabled: boolean;
  searchCalculatorEnabled: boolean;
  searchRotatingPlaceholderEnabled: boolean;
  currentWallpaperMode?: WallpaperMode;
  shortcutIconCornerRadiusLabel?: string;
  shortcutIconScaleLabel?: string;
  shortcutShowTitleEnabled?: boolean;
  shortcutGridColumnsLabel?: string;
  visualEffectsLevelLabel?: string;
  preventDuplicateNewTab?: boolean;
  showTime?: boolean;
  languageLabel?: string;
  darkModeAutoDimWallpaperEnabled?: boolean;
}): SettingsSearchEntry[] {
  const {
    t,
    searchEngineLabel,
    themeModeLabel,
    currentThemePreference,
    shortcutIconAppearanceLabel,
    currentShortcutIconAppearance,
    wallpaperModeLabel,
    syncProviderLabel,
    searchTabSwitchEngine,
    searchPrefixEnabled,
    searchSiteDirectEnabled,
    searchSiteShortcutEnabled,
    searchAnyKeyCaptureEnabled,
    searchCalculatorEnabled,
    searchRotatingPlaceholderEnabled,
    currentWallpaperMode,
    shortcutIconCornerRadiusLabel,
    shortcutIconScaleLabel,
    shortcutShowTitleEnabled,
    shortcutGridColumnsLabel,
    visualEffectsLevelLabel,
    preventDuplicateNewTab,
    showTime,
    languageLabel,
    darkModeAutoDimWallpaperEnabled,
  } = args;

  return [
    {
      id: 'settings-home-entry',
      actionId: 'settings-home',
      label: t('search.slash.settingsHome', { defaultValue: 'LeafTab 设置' }),
      keywords: ['设置', '设置中心', 'LeafTab 设置', '通用设置', 'preferences', 'settings'],
      emptyVisible: true,
    },
    {
      id: 'search-settings-entry',
      actionId: 'search-settings',
      label: t('search.slash.searchSettings', { defaultValue: '搜索设置' }),
      detail: searchEngineLabel,
      keywords: ['搜索', '搜索设置', 'search', 'search settings', '搜索引擎'],
      emptyVisible: true,
    },
    {
      id: 'theme-mode-entry',
      actionId: 'theme-mode',
      label: t('search.slash.themeMode', { defaultValue: '主题模式' }),
      detail: themeModeLabel,
      keywords: ['/theme', 'theme', '主题', '主题模式', '深色模式', '浅色模式', 'dark mode', 'light mode'],
      emptyVisible: true,
      actionState: currentThemePreference,
    },
    {
      id: 'shortcut-icon-settings-entry',
      actionId: 'shortcut-icon-settings',
      label: t('search.slash.shortcutIconSettings', { defaultValue: '图标设置' }),
      detail: shortcutIconAppearanceLabel,
      keywords: ['图标', '图标设置', '快捷方式图标', 'icon', 'icon settings'],
      emptyVisible: true,
      actionState: currentShortcutIconAppearance,
    },
    {
      id: 'wallpaper-settings-entry',
      actionId: 'wallpaper-settings',
      label: t('search.slash.wallpaperSettings', { defaultValue: '壁纸设置' }),
      detail: wallpaperModeLabel,
      keywords: ['壁纸', '壁纸设置', 'wallpaper', 'background'],
      emptyVisible: true,
      actionState: currentWallpaperMode,
    },
    {
      id: 'sync-center-entry',
      actionId: 'sync-center',
      label: t('search.slash.syncCenter', { defaultValue: '同步中心' }),
      detail: syncProviderLabel,
      keywords: ['同步', '同步中心', 'sync', 'cloud', 'webdav'],
      emptyVisible: true,
    },
    {
      id: 'shortcut-guide-entry',
      actionId: 'shortcut-guide',
      label: t('search.slash.shortcutGuide', { defaultValue: '快捷键指南' }),
      keywords: ['快捷键', '快捷键指南', 'guide', 'shortcut guide'],
      emptyVisible: true,
    },
    {
      id: 'about-entry',
      actionId: 'about',
      label: t('search.slash.about', { defaultValue: '关于 LeafTab' }),
      keywords: ['关于', 'about', 'LeafTab'],
      emptyVisible: true,
    },
    {
      id: 'language-setting',
      actionId: 'settings-home',
      label: t('settings.language.label', { defaultValue: '语言' }),
      detail: languageLabel,
      keywords: ['语言', '语言设置', 'language', 'locale', '中文', '英文', '日文', '韩文', '越南语'],
    },
    {
      id: 'visual-effects-setting',
      actionId: 'settings-home',
      label: t('settings.visualEffectsLevel.label', { defaultValue: '视觉效果等级' }),
      detail: visualEffectsLevelLabel,
      keywords: ['视觉效果', '动效', '动画', '模糊', '特效', 'performance', 'effects', 'motion'],
    },
    {
      id: 'prevent-duplicate-new-tab-setting',
      actionId: 'settings-home',
      label: t('settings.preventDuplicateNewTab.label', { defaultValue: '避免重复打开 LeafTab' }),
      detail: resolveBooleanSettingDetail(t, Boolean(preventDuplicateNewTab)),
      keywords: ['避免重复打开', '重复新标签页', '新标签页', 'duplicate new tab', 'prevent duplicate'],
      actionState: resolveBooleanSettingState(Boolean(preventDuplicateNewTab)),
    },
    {
      id: 'show-time-setting',
      actionId: 'settings-home',
      label: t('settings.showTime.label', { defaultValue: '显示时间' }),
      detail: resolveBooleanSettingDetail(t, Boolean(showTime)),
      keywords: ['显示时间', '时钟', '时间', 'clock', 'show time'],
      actionState: showTime ? 'enabled' : 'disabled',
    },
    {
      id: 'search-tab-switch-setting',
      actionId: 'search-settings',
      label: t('settings.searchSettings.items.tabSwitch.label', { defaultValue: '切换到已打开标签页' }),
      detail: resolveBooleanSettingDetail(t, searchTabSwitchEngine),
      keywords: ['标签页搜索', '切换标签页', '切换到已打开标签页', 'tab switch', 'search tabs'],
      actionState: resolveBooleanSettingState(searchTabSwitchEngine),
    },
    {
      id: 'search-prefix-setting',
      actionId: 'search-settings',
      label: t('settings.searchSettings.items.prefix.label', { defaultValue: '搜索前缀' }),
      detail: resolveBooleanSettingDetail(t, searchPrefixEnabled),
      keywords: ['搜索前缀', '前缀搜索', 'prefix', 'engine prefix'],
      actionState: resolveBooleanSettingState(searchPrefixEnabled),
    },
    {
      id: 'search-site-direct-setting',
      actionId: 'search-settings',
      label: t('settings.searchSettings.items.siteDirect.label', { defaultValue: '站内搜索' }),
      detail: resolveBooleanSettingDetail(t, searchSiteDirectEnabled),
      keywords: ['站内搜索', 'site search', 'site direct', '网站搜索'],
      actionState: resolveBooleanSettingState(searchSiteDirectEnabled),
    },
    {
      id: 'search-site-shortcut-setting',
      actionId: 'search-settings',
      label: t('settings.searchSettings.items.siteShortcut.label', { defaultValue: '站点快捷搜索' }),
      detail: resolveBooleanSettingDetail(t, searchSiteShortcutEnabled),
      keywords: ['站点快捷搜索', '网站快捷搜索', 'site shortcut', '快捷搜索'],
      actionState: resolveBooleanSettingState(searchSiteShortcutEnabled),
    },
    {
      id: 'search-any-key-capture-setting',
      actionId: 'search-settings',
      label: t('settings.searchSettings.items.anyKeyCapture.label', { defaultValue: '任意键唤起搜索' }),
      detail: resolveBooleanSettingDetail(t, searchAnyKeyCaptureEnabled),
      keywords: ['任意键唤起搜索', '键盘唤起搜索', '直接输入搜索', 'any key capture', 'type to search'],
      actionState: resolveBooleanSettingState(searchAnyKeyCaptureEnabled),
    },
    {
      id: 'search-calculator-setting',
      actionId: 'search-settings',
      label: t('settings.searchSettings.items.calculator.label', { defaultValue: '计算器' }),
      detail: resolveBooleanSettingDetail(t, searchCalculatorEnabled),
      keywords: ['计算器', 'calculator', '算式', '公式计算'],
      actionState: resolveBooleanSettingState(searchCalculatorEnabled),
    },
    {
      id: 'search-rotating-placeholder-setting',
      actionId: 'search-settings',
      label: t('settings.searchSettings.items.rotatingPlaceholder.label', { defaultValue: '轮播占位提示' }),
      detail: resolveBooleanSettingDetail(t, searchRotatingPlaceholderEnabled),
      keywords: ['占位提示', '轮播提示', 'placeholder', 'rotating placeholder', '搜索提示文案'],
      actionState: resolveBooleanSettingState(searchRotatingPlaceholderEnabled),
    },
    {
      id: 'shortcut-icon-appearance-setting',
      actionId: 'shortcut-icon-settings',
      label: t('search.settings.shortcutIconAppearance', { defaultValue: '图标颜色模式' }),
      detail: shortcutIconAppearanceLabel,
      keywords: ['图标颜色', '图标颜色模式', '单色', '彩色', '强调色', 'icon appearance', 'icon color mode'],
      actionState: currentShortcutIconAppearance,
    },
    {
      id: 'shortcut-icon-corner-radius-setting',
      actionId: 'shortcut-icon-settings',
      label: t('settings.shortcutIconSettings.cornerRadius', { defaultValue: '图标圆角' }),
      detail: shortcutIconCornerRadiusLabel,
      keywords: ['图标圆角', '圆角', 'corner radius', 'icon radius'],
    },
    {
      id: 'shortcut-icon-size-setting',
      actionId: 'shortcut-icon-settings',
      label: t('settings.shortcutIconSettings.size', { defaultValue: '图标大小' }),
      detail: shortcutIconScaleLabel,
      keywords: ['图标大小', '图标尺寸', 'icon size', 'icon scale', '缩放'],
    },
    {
      id: 'shortcut-icon-show-title-setting',
      actionId: 'shortcut-icon-settings',
      label: t('settings.shortcutsStyle.showName', { defaultValue: '显示名称' }),
      detail: resolveBooleanSettingDetail(t, Boolean(shortcutShowTitleEnabled)),
      keywords: ['显示名称', '显示标题', '图标名称', 'show name', 'show title'],
      actionState: resolveBooleanSettingState(Boolean(shortcutShowTitleEnabled)),
    },
    {
      id: 'shortcut-grid-columns-setting',
      actionId: 'shortcut-icon-settings',
      label: t('search.settings.shortcutGridColumns', { defaultValue: '图标列数' }),
      detail: shortcutGridColumnsLabel,
      keywords: ['图标列数', '每行图标数量', '网格列数', 'columns', 'grid columns'],
    },
    {
      id: 'wallpaper-bing-setting',
      actionId: 'wallpaper-settings',
      label: t('search.settings.wallpaperBing', { defaultValue: '必应壁纸' }),
      detail: resolveWallpaperSettingDetail(t, currentWallpaperMode, 'bing', wallpaperModeLabel),
      keywords: ['必应壁纸', 'bing 壁纸', 'bing wallpaper', '每日壁纸'],
      actionState: currentWallpaperMode,
    },
    {
      id: 'wallpaper-weather-setting',
      actionId: 'wallpaper-settings',
      label: t('search.settings.wallpaperWeather', { defaultValue: '天气壁纸' }),
      detail: resolveWallpaperSettingDetail(t, currentWallpaperMode, 'weather', wallpaperModeLabel),
      keywords: ['天气壁纸', 'weather wallpaper', '动态天气背景', '天气背景'],
      actionState: currentWallpaperMode,
    },
    {
      id: 'wallpaper-color-setting',
      actionId: 'wallpaper-settings',
      label: t('search.settings.wallpaperColor', { defaultValue: '纯色壁纸' }),
      detail: resolveWallpaperSettingDetail(t, currentWallpaperMode, 'color', wallpaperModeLabel),
      keywords: ['纯色壁纸', '颜色壁纸', 'color wallpaper', '纯色背景'],
      actionState: currentWallpaperMode,
    },
    {
      id: 'wallpaper-custom-setting',
      actionId: 'wallpaper-settings',
      label: t('search.settings.wallpaperCustom', { defaultValue: '自定义壁纸' }),
      detail: resolveWallpaperSettingDetail(t, currentWallpaperMode, 'custom', wallpaperModeLabel),
      keywords: ['自定义壁纸', '上传壁纸', 'custom wallpaper', 'upload wallpaper'],
      actionState: currentWallpaperMode,
    },
    {
      id: 'wallpaper-auto-dim-setting',
      actionId: 'wallpaper-settings',
      label: t('weather.wallpaper.autoDimInDarkMode', { defaultValue: '深色模式自动调暗壁纸' }),
      detail: resolveBooleanSettingDetail(t, Boolean(darkModeAutoDimWallpaperEnabled)),
      keywords: ['深色模式自动调暗壁纸', '调暗壁纸', 'auto dim wallpaper', 'dark mode wallpaper'],
      actionState: resolveBooleanSettingState(Boolean(darkModeAutoDimWallpaperEnabled)),
    },
  ];
}

export function buildSettingsSuggestionItems(args: {
  entries: SettingsSearchEntry[];
  queryKey: string;
}): SearchSuggestionItem[] {
  const { entries, queryKey } = args;
  const toSuggestionItem = (entry: SettingsSearchEntry): SearchSuggestionItem => ({
    type: 'history',
    label: entry.label,
    detail: entry.detail,
    value: buildSlashCommandActionValue(entry.actionId),
    timestamp: 0,
    historySource: 'browser',
    searchActionKey: entry.id,
    searchActionState: entry.actionState,
  });

  if (!queryKey) {
    return entries
      .filter((entry) => entry.emptyVisible)
      .map(toSuggestionItem);
  }

  return entries
    .map((entry, index) => ({
      entry,
      index,
      score: scoreSettingsSearchEntry(entry, queryKey),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ entry }) => toSuggestionItem(entry));
}
