import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { SearchBar } from '@/components/SearchBar';
import { SEARCH_ENGINE_BRAND_NAMES } from '@/components/search/searchEngineSwitcher.shared';
import {
  buildSlashCommandActions,
  buildSlashCommandEntries,
  buildSettingsSearchEntries,
  buildSettingsSuggestionItems,
  buildSlashCommandSuggestionItems,
  parseSlashCommandActionId,
  type SlashCommandDialogTarget,
  type SlashCommandActionId,
} from '@/components/search/searchSlashCommands';
import { toast } from '@/components/ui/sonner';
import { ENABLE_SEARCH_ENGINE_SWITCHER } from '@/config/featureFlags';
import { useCurrentBrowserTabId } from '@/hooks/useCurrentBrowserTabId';
import { useRotatingText } from '@/hooks/useRotatingText';
import { useSearchBlockingLayerState } from '@/hooks/useSearchBlockingLayerState';
import { useSearch } from '@/hooks/useSearch';
import { useSearchInteractionController } from '@/hooks/useSearchInteractionController';
import { useSearchPermissionsState } from '@/hooks/useSearchPermissionsState';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import type { SearchAction, SearchSecondaryAction } from '@/utils/searchActions';
import type { VisualEffectsLevel } from '@/hooks/useVisualEffectsPolicy';
import { getShortcutChildren, isShortcutFolder } from '@/utils/shortcutFolders';
import {
  readSuggestionUsageMap,
  recordSuggestionUsage,
} from '@/utils/suggestionPersonalization';
import {
  readSearchPersonalizationProfile,
  recordSearchPersonalizationEvent,
} from '@/utils/searchPersonalization';
import { consumeRecentShortcutAddition } from '@/utils/recentShortcutAdditions';
import {
  matchSearchCommandAliasInput,
  parseSearchCommand,
  resolveSearchCommandAutocomplete,
  type SearchSuggestionPermission,
} from '@/utils/searchCommands';
import { createSearchSessionModel, shouldAutoOpenSearchSuggestions } from '@/utils/searchSessionModel';
import { createMixedSearchQueryModel } from '@/utils/mixedSearchQueryModel';
import { resolveSearchSubmitDecision } from '@/utils/searchSubmit';
import { RenderProfileBoundary } from '@/dev/renderProfiler';
import type { SearchSuggestionsPlacement } from '@/components/search/SearchSuggestionsPanel.shared';
import type { WallpaperMode } from '@/wallpaper/types';
import {
  focusSearchInputElement,
  type SearchActivationHandle,
  type SearchActivationFocusOptions,
} from '@/components/search/searchActivation.shared';
import { invalidateBookmarkSearchCaches } from '@/utils/bookmarkSearch';
import { invalidateTabSearchCaches } from '@/utils/tabSearch';

const POINTER_HIGHLIGHT_KEYBOARD_LOCK_MS = 140;

export type { SlashCommandDialogTarget } from '@/components/search/searchSlashCommands';

export type SearchInteractionState = {
  historyOpen: boolean;
  dropdownOpen: boolean;
  typingBurst: boolean;
};

export interface SearchExperienceProps {
  inputRef: RefObject<HTMLInputElement | null>;
  openInNewTab: boolean;
  shortcuts: Shortcut[];
  tabSwitchSearchEngine: boolean;
  searchPrefixEnabled: boolean;
  searchSiteDirectEnabled: boolean;
  searchSiteShortcutEnabled: boolean;
  searchAnyKeyCaptureEnabled: boolean;
  searchCalculatorEnabled: boolean;
  searchRotatingPlaceholderEnabled: boolean;
  disablePlaceholderAnimation?: boolean;
  lightweightSearchUi?: boolean;
  searchHeight: number;
  searchInputFontSize: number;
  searchHorizontalPadding: number;
  searchActionSize: number;
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  subtleDarkTone?: boolean;
  searchSurfaceStyle?: CSSProperties;
  searchSurfaceTone?: 'default' | 'drawer';
  suggestionsPlacement?: SearchSuggestionsPlacement;
  currentWallpaperMode?: WallpaperMode;
  currentColorWallpaperId?: string;
  darkModeAutoDimWallpaperEnabled?: boolean;
  currentShortcutIconAppearance?: ShortcutIconAppearance;
  currentShortcutIconCornerRadius?: number;
  currentShortcutIconScale?: number;
  shortcutShowTitleEnabled?: boolean;
  currentShortcutGridColumns?: number;
  currentVisualEffectsLevel?: VisualEffectsLevel;
  preventDuplicateNewTab?: boolean;
  showTime?: boolean;
  activeSyncProvider?: 'cloud' | 'webdav' | 'none';
  interactionDisabled?: boolean;
  onEditShortcutAction?: (target: { shortcut: Shortcut; index: number; parentFolderId?: string | null }) => void;
  onDeleteShortcutAction?: (target: { shortcut: Shortcut; index: number; parentFolderId?: string | null }) => void;
  onAddShortcutAction?: (target: { title: string; url: string; icon?: string }) => void;
  onSetShowTimeAction?: (nextValue: boolean) => void;
  onSetWallpaperModeAction?: (nextValue: WallpaperMode) => void;
  onSetShortcutIconAppearanceAction?: (nextValue: ShortcutIconAppearance) => void;
  onSetSearchTabSwitchEngineAction?: (nextValue: boolean) => void;
  onSetSearchPrefixEnabledAction?: (nextValue: boolean) => void;
  onSetSearchSiteDirectEnabledAction?: (nextValue: boolean) => void;
  onSetSearchSiteShortcutEnabledAction?: (nextValue: boolean) => void;
  onSetSearchAnyKeyCaptureEnabledAction?: (nextValue: boolean) => void;
  onSetSearchCalculatorEnabledAction?: (nextValue: boolean) => void;
  onSetSearchRotatingPlaceholderEnabledAction?: (nextValue: boolean) => void;
  onSetShortcutShowTitleAction?: (nextValue: boolean) => void;
  onSetPreventDuplicateNewTabAction?: (nextValue: boolean) => void;
  onSetDarkModeAutoDimWallpaperAction?: (nextValue: boolean) => void;
  onInteractionStateChange?: (state: SearchInteractionState) => void;
  onOpenSlashCommandDialog?: (target: SlashCommandDialogTarget) => void;
  onActivationHandleChange?: (handle: SearchActivationHandle | null) => void;
}

type SearchShortcutActionTarget = {
  shortcut: Shortcut;
  index: number;
  parentFolderId?: string | null;
};

function getSecondaryActionSelectionKey(actionId: string, secondaryActionIndex: number) {
  return `${actionId}:${secondaryActionIndex}`;
}

function findShortcutActionTarget(
  shortcuts: readonly Shortcut[],
  shortcutId: string,
): SearchShortcutActionTarget | null {
  for (let index = 0; index < shortcuts.length; index += 1) {
    const shortcut = shortcuts[index];
    if (shortcut.id === shortcutId) {
      return {
        shortcut,
        index,
      };
    }
    if (!isShortcutFolder(shortcut)) continue;
    const childMatch = findShortcutActionTarget(getShortcutChildren(shortcut), shortcutId);
    if (childMatch) {
      return {
        ...childMatch,
        parentFolderId: childMatch.parentFolderId ?? shortcut.id,
      };
    }
  }

  return null;
}

function copyTextToClipboard(copyText: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(copyText);
  }
  const el = document.createElement('textarea');
  el.value = copyText;
  el.setAttribute('readonly', '');
  el.style.position = 'fixed';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(el);
  if (!copied) {
    return Promise.reject(new Error('copy_failed'));
  }
  return Promise.resolve();
}

function resolveSearchLanguageLabel(language: string) {
  if (language.startsWith('zh')) return '简体中文';
  if (language.startsWith('en')) return 'English';
  if (language.startsWith('ja')) return '日本語';
  if (language.startsWith('ko')) return '한국어';
  if (language.startsWith('vi')) return 'Tiếng Việt';
  return language;
}

export const SearchExperience = memo(function SearchExperience({
  inputRef,
  openInNewTab,
  shortcuts,
  tabSwitchSearchEngine,
  searchPrefixEnabled,
  searchSiteDirectEnabled,
  searchSiteShortcutEnabled,
  searchAnyKeyCaptureEnabled,
  searchCalculatorEnabled,
  searchRotatingPlaceholderEnabled,
  disablePlaceholderAnimation = false,
  lightweightSearchUi = false,
  searchHeight,
  searchInputFontSize,
  searchHorizontalPadding,
  searchActionSize,
  blankMode,
  forceWhiteTheme,
  subtleDarkTone,
  searchSurfaceStyle,
  searchSurfaceTone = 'default',
  suggestionsPlacement = 'bottom',
  currentWallpaperMode,
  currentColorWallpaperId,
  darkModeAutoDimWallpaperEnabled,
  currentShortcutIconAppearance,
  currentShortcutIconCornerRadius,
  currentShortcutIconScale,
  shortcutShowTitleEnabled,
  currentShortcutGridColumns,
  currentVisualEffectsLevel,
  preventDuplicateNewTab,
  showTime,
  activeSyncProvider = 'none',
  interactionDisabled = false,
  onEditShortcutAction,
  onDeleteShortcutAction,
  onAddShortcutAction,
  onSetShowTimeAction,
  onSetWallpaperModeAction,
  onSetShortcutIconAppearanceAction,
  onSetSearchTabSwitchEngineAction,
  onSetSearchPrefixEnabledAction,
  onSetSearchSiteDirectEnabledAction,
  onSetSearchSiteShortcutEnabledAction,
  onSetSearchAnyKeyCaptureEnabledAction,
  onSetSearchCalculatorEnabledAction,
  onSetSearchRotatingPlaceholderEnabledAction,
  onSetShortcutShowTitleAction,
  onSetPreventDuplicateNewTabAction,
  onSetDarkModeAutoDimWallpaperAction,
  onInteractionStateChange,
  onOpenSlashCommandDialog,
  onActivationHandleChange,
}: SearchExperienceProps) {
  const { t, i18n } = useTranslation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const searchAreaRef = useRef<HTMLDivElement>(null);
  const pointerHighlightLockUntilRef = useRef(0);
  const [suggestionUsageVersion, setSuggestionUsageVersion] = useState(0);
  const [searchPersonalizationProfile, setSearchPersonalizationProfile] = useState(
    () => readSearchPersonalizationProfile(),
  );
  const [searchSourceRefreshVersion, setSearchSourceRefreshVersion] = useState(0);
  const [actionModeState, setActionModeState] = useState<{ actionId: string; selectedSecondaryActionIndex: number } | null>(null);
  const [pendingConfirmationActionKey, setPendingConfirmationActionKey] = useState<string | null>(null);
  const focusedPrintableCapturePendingRef = useRef(false);
  const currentBrowserTabId = useCurrentBrowserTabId();
  const blockingLayerOpen = useSearchBlockingLayerState();
  const showSearchCommandPermissionDeniedToast = useCallback((permission: SearchSuggestionPermission) => {
    if (permission === 'bookmarks') {
      toast.error(t('search.permissionBookmarksDenied', {
        defaultValue: '未授予书签权限，无法搜索书签。下次使用 /b 时可再次申请。',
      }));
    } else if (permission === 'tabs') {
      toast.error(t('search.permissionTabsDenied', {
        defaultValue: '未授予标签页权限，无法搜索已打开标签页。下次使用 /t 时可再次申请。',
      }));
    } else {
      toast.error(t('search.permissionHistoryDenied', {
        defaultValue: '未授予历史记录权限，无法显示浏览器历史记录。可在下拉框顶部再次申请。',
      }));
    }
  }, [t]);
  const handleSearchPermissionRequestFailed = useCallback(() => {
    toast.error(t('search.permissionRequestFailed', {
      defaultValue: '权限申请失败，请重试。',
    }));
  }, [t]);
  const {
    searchPermissions,
    searchPermissionsReady,
    permissionRequestInFlight,
    permissionWarmup,
    refreshSearchPermissionStatus,
    runAfterSearchPermission,
  } = useSearchPermissionsState({
    onPermissionDenied: showSearchCommandPermissionDeniedToast,
    onRequestFailed: handleSearchPermissionRequestFailed,
  });

  const {
    searchValue,
    setSearchValue,
    setSearchHistory,
    historySelectedIndex,
    setHistorySelectedIndex,
    searchEngine,
    setSearchEngine,
    dropdownOpen,
    setDropdownOpen,
    historyOpen,
    openHistoryPanel,
    closeHistoryPanel,
    syncHistorySelectionByCount,
    handleSearchChange,
    filteredHistoryItems,
    handleSearch,
    handleEngineSelect,
    cycleSearchEngine,
    openSearchWithQuery,
  } = useSearch(openInNewTab, {
    prefixEnabled: searchPrefixEnabled,
    siteDirectEnabled: searchSiteDirectEnabled,
  });

  const [isSearchTypingBurst, setIsSearchTypingBurst] = useState(false);
  const searchTypingBurstTimerRef = useRef<number | null>(null);
  const lastSearchValueRef = useRef(searchValue);

  useEffect(() => {
    if (lastSearchValueRef.current === searchValue) return;
    lastSearchValueRef.current = searchValue;
    setIsSearchTypingBurst(true);
    if (searchTypingBurstTimerRef.current !== null) {
      window.clearTimeout(searchTypingBurstTimerRef.current);
    }
    searchTypingBurstTimerRef.current = window.setTimeout(() => {
      searchTypingBurstTimerRef.current = null;
      setIsSearchTypingBurst(false);
    }, 900);
  }, [searchValue]);

  useEffect(() => {
    return () => {
      if (searchTypingBurstTimerRef.current !== null) {
        window.clearTimeout(searchTypingBurstTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!blockingLayerOpen) return;
    if (!historyOpen) return;
    closeHistoryPanel('manual');
    if (dropdownOpen) {
      setDropdownOpen(false);
    }
  }, [blockingLayerOpen, closeHistoryPanel, dropdownOpen, historyOpen, setDropdownOpen]);

  useEffect(() => {
    onInteractionStateChange?.({
      historyOpen: historyOpen && !blockingLayerOpen,
      dropdownOpen,
      typingBurst: isSearchTypingBurst,
    });
  }, [blockingLayerOpen, dropdownOpen, historyOpen, isSearchTypingBurst, onInteractionStateChange]);

  useEffect(() => () => {
    onInteractionStateChange?.({
      historyOpen: false,
      dropdownOpen: false,
      typingBurst: false,
    });
  }, [onInteractionStateChange]);

  useEffect(() => {
    if (ENABLE_SEARCH_ENGINE_SWITCHER) return;
    if (dropdownOpen) setDropdownOpen(false);
    if (searchEngine !== 'system') setSearchEngine('system');
  }, [dropdownOpen, searchEngine, setDropdownOpen, setSearchEngine]);

  useEffect(() => {
    if (!interactionDisabled) return;
    closeHistoryPanel('manual');
    if (dropdownOpen) {
      setDropdownOpen(false);
    }
    inputRef.current?.blur();
  }, [closeHistoryPanel, dropdownOpen, inputRef, interactionDisabled, setDropdownOpen]);

  const suggestionUsageMap = useMemo(() => readSuggestionUsageMap(), [suggestionUsageVersion]);
  const searchSessionModel = useMemo(() => createSearchSessionModel(searchValue, {
    prefixEnabled: searchPrefixEnabled,
    siteDirectEnabled: searchSiteDirectEnabled,
    calculatorEnabled: searchCalculatorEnabled,
  }), [
    searchCalculatorEnabled,
    searchPrefixEnabled,
    searchSiteDirectEnabled,
    searchValue,
  ]);
  const autoOpenSuggestionsEnabled = shouldAutoOpenSearchSuggestions(searchSessionModel);
  const shortcutSuggestionsActive = useMemo(
    () => searchSessionModel.mode === 'default' && (
      Boolean(searchSessionModel.normalizedQuery) || historyOpen
    ),
    [historyOpen, searchSessionModel.mode, searchSessionModel.normalizedQuery],
  );
  const slashCommandInput = useMemo(
    () => searchValue.trimStart(),
    [searchValue],
  );
  const slashCommandQuery = useMemo(() => {
    if (!slashCommandInput.startsWith('/')) return '';
    return slashCommandInput.slice(1).trim();
  }, [slashCommandInput]);
  const currentSearchEngineLabel = useMemo(() => (
    searchEngine === 'system'
      ? t('search.systemEngine', { defaultValue: '系统默认' })
      : SEARCH_ENGINE_BRAND_NAMES[searchEngine]
  ), [searchEngine, t]);
  const currentWallpaperModeLabel = useMemo(() => {
    if (currentWallpaperMode === 'bing') {
      return t('weather.wallpaper.bing', { defaultValue: 'bing' });
    }
    if (currentWallpaperMode === 'weather') {
      return t('weather.wallpaper.weather', { defaultValue: '天气' });
    }
    if (currentWallpaperMode === 'custom') {
      return t('weather.wallpaper.custom', { defaultValue: '自定义' });
    }
    if (currentWallpaperMode === 'color') {
      const colorLabel = currentColorWallpaperId
        ? t(`weather.wallpaper.colorPresets.${currentColorWallpaperId}`, { defaultValue: currentColorWallpaperId })
        : t('weather.wallpaper.color', { defaultValue: 'Color' });
      return colorLabel;
    }
    return '';
  }, [currentColorWallpaperId, currentWallpaperMode, t]);
  const currentShortcutIconAppearanceLabel = useMemo(() => {
    if (!currentShortcutIconAppearance) return '';
    if (currentShortcutIconAppearance === 'monochrome') {
      return t('settings.shortcutIconSettings.monochrome', { defaultValue: '单色' });
    }
    if (currentShortcutIconAppearance === 'accent') {
      return t('settings.shortcutIconSettings.accent', { defaultValue: '强调色' });
    }
    return t('settings.shortcutIconSettings.colorful', { defaultValue: '彩色' });
  }, [currentShortcutIconAppearance, t]);
  const currentShortcutIconCornerRadiusLabel = useMemo(() => {
    if (!Number.isFinite(currentShortcutIconCornerRadius)) return '';
    return `${Math.round(currentShortcutIconCornerRadius ?? 0)}%`;
  }, [currentShortcutIconCornerRadius]);
  const currentShortcutIconScaleLabel = useMemo(() => {
    if (!Number.isFinite(currentShortcutIconScale)) return '';
    return `${Math.round((currentShortcutIconScale ?? 0) * 100)}%`;
  }, [currentShortcutIconScale]);
  const currentShortcutGridColumnsLabel = useMemo(() => {
    if (!Number.isFinite(currentShortcutGridColumns)) return '';
    return t('search.settings.columnCount', {
      count: currentShortcutGridColumns,
      defaultValue: `${currentShortcutGridColumns} 列`,
    });
  }, [currentShortcutGridColumns, t]);
  const currentThemePreference = theme === 'light' || theme === 'dark' || theme === 'system'
    ? theme
    : 'system';
  const currentResolvedTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
  const currentThemeModeLabel = useMemo(() => {
    if (currentThemePreference === 'system') {
      return t('search.slash.themeCurrentSystem', {
        mode: currentResolvedTheme === 'dark'
          ? t('settings.theme.dark', { defaultValue: '深色' })
          : t('settings.theme.light', { defaultValue: '浅色' }),
        defaultValue: `跟随系统 · ${currentResolvedTheme === 'dark' ? '深色' : '浅色'}`,
      });
    }
    if (currentThemePreference === 'dark') {
      return t('settings.theme.dark', { defaultValue: '深色' });
    }
    return t('settings.theme.light', { defaultValue: '浅色' });
  }, [currentResolvedTheme, currentThemePreference, t]);
  const activeSyncProviderLabel = useMemo(() => {
    if (activeSyncProvider === 'cloud') {
      return t('search.slash.syncProviderCloud', { defaultValue: '云同步' });
    }
    if (activeSyncProvider === 'webdav') {
      return t('search.slash.syncProviderWebdav', { defaultValue: 'WebDAV' });
    }
    return t('search.slash.syncProviderNone', { defaultValue: '未启用' });
  }, [activeSyncProvider, t]);
  const currentVisualEffectsLevelLabel = useMemo(() => {
    if (!currentVisualEffectsLevel) return '';
    if (currentVisualEffectsLevel === 'low') {
      return t('settings.visualEffectsLevel.low', { defaultValue: '低' });
    }
    if (currentVisualEffectsLevel === 'high') {
      return t('settings.visualEffectsLevel.high', { defaultValue: '高' });
    }
    return t('settings.visualEffectsLevel.medium', { defaultValue: '中' });
  }, [currentVisualEffectsLevel, t]);
  const currentLanguageLabel = useMemo(
    () => resolveSearchLanguageLabel(i18n.language),
    [i18n.language],
  );
  const slashCommandEntries = useMemo(() => buildSlashCommandEntries({
    t,
    details: {
      searchEngine: currentSearchEngineLabel,
      themeMode: currentThemeModeLabel,
      shortcutIconAppearance: currentShortcutIconAppearanceLabel,
      wallpaperMode: currentWallpaperModeLabel,
      syncProvider: activeSyncProviderLabel,
    },
  }), [
    activeSyncProviderLabel,
    currentSearchEngineLabel,
    currentShortcutIconAppearanceLabel,
    currentThemeModeLabel,
    currentWallpaperModeLabel,
    t,
  ]);
  const settingsSearchEntries = useMemo(() => buildSettingsSearchEntries({
    t,
    searchEngineLabel: currentSearchEngineLabel,
    themeModeLabel: currentThemeModeLabel,
    currentThemePreference,
    shortcutIconAppearanceLabel: currentShortcutIconAppearanceLabel,
    currentShortcutIconAppearance,
    wallpaperModeLabel: currentWallpaperModeLabel,
    syncProviderLabel: activeSyncProviderLabel,
    searchTabSwitchEngine: tabSwitchSearchEngine,
    searchPrefixEnabled,
    searchSiteDirectEnabled,
    searchSiteShortcutEnabled,
    searchAnyKeyCaptureEnabled,
    searchCalculatorEnabled,
    searchRotatingPlaceholderEnabled,
    currentWallpaperMode,
    shortcutIconCornerRadiusLabel: currentShortcutIconCornerRadiusLabel,
    shortcutIconScaleLabel: currentShortcutIconScaleLabel,
    shortcutShowTitleEnabled,
    shortcutGridColumnsLabel: currentShortcutGridColumnsLabel,
    visualEffectsLevelLabel: currentVisualEffectsLevelLabel,
    preventDuplicateNewTab,
    showTime,
    languageLabel: currentLanguageLabel,
    darkModeAutoDimWallpaperEnabled,
  }), [
    activeSyncProviderLabel,
    currentLanguageLabel,
    currentSearchEngineLabel,
    currentShortcutGridColumnsLabel,
    currentShortcutIconAppearanceLabel,
    currentShortcutIconAppearance,
    currentShortcutIconCornerRadiusLabel,
    currentShortcutIconScaleLabel,
    currentThemePreference,
    currentThemeModeLabel,
    currentVisualEffectsLevelLabel,
    currentWallpaperMode,
    currentWallpaperModeLabel,
    darkModeAutoDimWallpaperEnabled,
    preventDuplicateNewTab,
    searchAnyKeyCaptureEnabled,
    searchCalculatorEnabled,
    searchPrefixEnabled,
    searchRotatingPlaceholderEnabled,
    searchSiteDirectEnabled,
    searchSiteShortcutEnabled,
    shortcutShowTitleEnabled,
    showTime,
    t,
    tabSwitchSearchEngine,
  ]);
  const mixedCommandQueryKey = useMemo(
    () => searchSessionModel.normalizedQuery || slashCommandQuery,
    [searchSessionModel.normalizedQuery, slashCommandQuery],
  );
  const commandSuggestionItems = useMemo(() => buildSlashCommandSuggestionItems({
    entries: slashCommandEntries,
    queryKey: mixedCommandQueryKey,
    category: 'commands',
  }), [mixedCommandQueryKey, slashCommandEntries]);
  const settingSuggestionItems = useMemo(() => buildSettingsSuggestionItems({
    entries: settingsSearchEntries,
    queryKey: mixedCommandQueryKey,
  }), [mixedCommandQueryKey, settingsSearchEntries]);

  const {
    actions: searchActions,
    sourceStatus: suggestionSourceStatus,
  } = useSearchSuggestions({
    searchValue,
    queryModel: searchSessionModel,
    filteredHistoryItems,
    shortcuts,
    commandSuggestionItems,
    settingSuggestionItems,
    shortcutSuggestionsActive,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
    searchPersonalizationProfile,
    historyPermissionGranted: searchPermissions.history,
    bookmarksPermissionGranted: searchPermissions.bookmarks,
    tabsPermissionGranted: searchPermissions.tabs,
    permissionWarmup,
    refreshVersion: searchSourceRefreshVersion,
  });
  const isSlashCommandPanelOpen = historyOpen
    && slashCommandInput.startsWith('/')
    && !searchSessionModel.command.active;
  const searchPersonalizationQueryModel = useMemo(() => createMixedSearchQueryModel({
    searchValue: isSlashCommandPanelOpen ? slashCommandQuery : searchValue,
    displayMode: isSlashCommandPanelOpen ? 'default' : suggestionSourceStatus.suggestionDisplayMode,
  }), [
    isSlashCommandPanelOpen,
    searchValue,
    slashCommandQuery,
    suggestionSourceStatus.suggestionDisplayMode,
  ]);
  const slashCommandActions = useMemo(() => buildSlashCommandActions({
    isOpen: isSlashCommandPanelOpen,
    entries: slashCommandEntries,
    queryKey: slashCommandQuery,
  }), [isSlashCommandPanelOpen, slashCommandEntries, slashCommandQuery]);
  const effectiveSearchActions = isSlashCommandPanelOpen ? slashCommandActions : searchActions;
  const visibleSearchActions = useMemo(
    () => effectiveSearchActions.filter((action) => (
      action.item.type !== 'tab'
      || currentBrowserTabId === null
      || action.item.tabId !== currentBrowserTabId
    )),
    [currentBrowserTabId, effectiveSearchActions],
  );
  const selectedSearchAction = useMemo(
    () => (historySelectedIndex !== -1 ? visibleSearchActions[historySelectedIndex] ?? null : null),
    [historySelectedIndex, visibleSearchActions],
  );
  const selectedSecondaryActions = selectedSearchAction?.secondaryActions ?? [];
  const actionModeActive = Boolean(
    selectedSearchAction
    && actionModeState
    && actionModeState.actionId === selectedSearchAction.id
    && selectedSecondaryActions.length > 0,
  );
  const selectedSecondaryActionIndex = actionModeActive
    ? Math.min(actionModeState?.selectedSecondaryActionIndex ?? 0, Math.max(0, selectedSecondaryActions.length - 1))
    : 0;
  const shortcutActionTargetMap = useMemo(() => {
    const map = new Map<string, SearchShortcutActionTarget>();
    searchActions.forEach((action) => {
      if (action.item.type !== 'shortcut' || !action.item.shortcutId) return;
      const target = findShortcutActionTarget(shortcuts, action.item.shortcutId);
      if (target) {
        map.set(action.item.shortcutId, target);
      }
    });
    return map;
  }, [searchActions, shortcuts]);

  const calculatorPreview = searchSessionModel.calculatorPreview;
  const calculatorInlinePreview = useMemo(() => {
    if (!calculatorPreview) return '';
    return `=${calculatorPreview.resultText}`;
  }, [calculatorPreview]);

  const siteDirectInlinePreview = useMemo(() => {
    if (searchSessionModel.mode !== 'default') return '';
    const { query, siteDomain, siteSearchUrl, siteLabel } = searchSessionModel.siteSearch;
    if (!query || !siteLabel) return '';
    if (!siteSearchUrl && !siteDomain) return '';
    const resolvedSiteLabel = siteLabel === 'YouTube' ? 'Youtube' : siteLabel;
    return t('search.siteDirectInlineHint', {
      site: resolvedSiteLabel,
      defaultValue: `在${resolvedSiteLabel}中搜索`,
    });
  }, [searchSessionModel.mode, searchSessionModel.siteSearch, t]);

  const enginePrefixInlinePreview = useMemo(() => {
    if (searchSessionModel.mode !== 'default') return '';
    const { overrideEngine } = searchSessionModel.enginePrefix;
    if (!overrideEngine) return '';
    const engineLabelMap = {
      google: 'Google',
      bing: 'Bing',
      duckduckgo: 'DuckDuckGo',
      baidu: 'Baidu',
    } as const;
    const engineLabel = engineLabelMap[overrideEngine];
    return t('search.prefixEngineInlineHint', {
      engine: engineLabel,
      defaultValue: `用${engineLabel}搜索`,
    });
  }, [searchSessionModel.enginePrefix, searchSessionModel.mode, t]);

  const searchInlinePreview = siteDirectInlinePreview || enginePrefixInlinePreview || calculatorInlinePreview;

  useEffect(() => {
    if (!historyOpen || !selectedSearchAction || selectedSecondaryActions.length === 0) {
      setActionModeState(null);
      setPendingConfirmationActionKey(null);
      return;
    }
    setActionModeState((prev) => {
      if (!prev || prev.actionId !== selectedSearchAction.id) return null;
      if (prev.selectedSecondaryActionIndex < selectedSecondaryActions.length) return prev;
      return {
        actionId: prev.actionId,
        selectedSecondaryActionIndex: 0,
      };
    });
  }, [historyOpen, selectedSearchAction, selectedSecondaryActions.length]);

  const recordSearchPersonalizationUsage = useCallback((
    action: SearchAction,
    secondaryAction?: SearchSecondaryAction,
  ) => {
    setSearchPersonalizationProfile((prev) => recordSearchPersonalizationEvent({
      profile: prev,
      queryModel: searchPersonalizationQueryModel,
      action,
      secondaryAction,
      visibleActions: visibleSearchActions,
    }));
  }, [searchPersonalizationQueryModel, visibleSearchActions]);

  const executeSlashCommand = useCallback((actionId: SlashCommandActionId) => {
    if (actionId === 'bookmarks') {
      setSearchValue(resolveSearchCommandAutocomplete('/bookmarks') || '/bookmarks ');
      setHistorySelectedIndex(-1);
      openHistoryPanel({ select: 'none' });
      runAfterSearchPermission('bookmarks', () => {});
      return true;
    }

    if (actionId === 'history') {
      setSearchValue(resolveSearchCommandAutocomplete('/historys') || '/historys ');
      setHistorySelectedIndex(-1);
      openHistoryPanel({ select: 'none' });
      runAfterSearchPermission('history', () => {});
      return true;
    }

    if (actionId === 'tabs') {
      setSearchValue(resolveSearchCommandAutocomplete('/tabs') || '/tabs ');
      setHistorySelectedIndex(-1);
      openHistoryPanel({ select: 'none' });
      runAfterSearchPermission('tabs', () => {});
      return true;
    }

    if (actionId === 'theme-mode') {
      const nextTheme = currentThemePreference === 'system'
        ? 'light'
        : currentThemePreference === 'light'
          ? 'dark'
          : 'system';
      setTheme(nextTheme);
      setSearchValue('');
      closeHistoryPanel('selection');
      return true;
    }

    setSearchValue('');
    closeHistoryPanel('selection');

    if (actionId === 'settings-home') {
      onOpenSlashCommandDialog?.('settings-home');
    } else if (actionId === 'search-settings') {
      onOpenSlashCommandDialog?.('search-settings');
    } else if (actionId === 'shortcut-guide') {
      onOpenSlashCommandDialog?.('shortcut-guide');
    } else if (actionId === 'shortcut-icon-settings') {
      onOpenSlashCommandDialog?.('shortcut-icon-settings');
    } else if (actionId === 'wallpaper-settings') {
      onOpenSlashCommandDialog?.('wallpaper-settings');
    } else if (actionId === 'sync-center') {
      onOpenSlashCommandDialog?.('sync-center');
    } else if (actionId === 'about') {
      onOpenSlashCommandDialog?.('about');
    }
    return true;
  }, [
    closeHistoryPanel,
    currentThemePreference,
    onOpenSlashCommandDialog,
    openHistoryPanel,
    runAfterSearchPermission,
    setTheme,
    setHistorySelectedIndex,
    setSearchValue,
  ]);

  const executeSearchAction = useCallback((action: SearchAction) => {
    const { item } = action;
    const slashActionId = parseSlashCommandActionId(item.value);
    if (slashActionId) {
      return executeSlashCommand(slashActionId);
    }

    if (action.kind === 'focus-tab' && item.type === 'tab' && Number.isFinite(item.tabId)) {
      if (currentBrowserTabId !== null && item.tabId === currentBrowserTabId) {
        return false;
      }
      const tabsApi = globalThis.chrome?.tabs;
      if (tabsApi?.update && typeof item.tabId === 'number') {
        tabsApi.update(item.tabId, { active: true }, () => {});
      }
      const windowsApi = globalThis.chrome?.windows;
      if (windowsApi?.update && typeof item.windowId === 'number') {
        windowsApi.update(item.windowId, { focused: true }, () => {});
      }
      closeHistoryPanel('selection');
      return true;
    }

    if (action.kind === 'open-target' && item.type === 'history' && item.historySource === 'session' && item.sessionId) {
      const sessionsApi = globalThis.chrome?.sessions;
      if (sessionsApi?.restore) {
        sessionsApi.restore(item.sessionId, () => {});
        closeHistoryPanel('selection');
        return true;
      }
    }

    if (action.kind === 'open-target' && action.usageKey) {
      recordSuggestionUsage(action.usageKey);
      setSuggestionUsageVersion((prev) => prev + 1);
    }
    if (item.type === 'shortcut' && item.recentlyAdded) {
      consumeRecentShortcutAddition(item.value);
      setSearchSourceRefreshVersion((prev) => prev + 1);
    }

    openSearchWithQuery(item.value);
    closeHistoryPanel('selection');
    return true;
  }, [closeHistoryPanel, currentBrowserTabId, executeSlashCommand, openSearchWithQuery]);

  const activateSearchAction = useCallback((action: SearchAction) => {
    if (action.permission && !searchPermissions[action.permission]) {
      showSearchCommandPermissionDeniedToast(action.permission);
      return;
    }

    if (executeSearchAction(action)) {
      recordSearchPersonalizationUsage(action);
    }
  }, [
    executeSearchAction,
    recordSearchPersonalizationUsage,
    searchPermissions,
    showSearchCommandPermissionDeniedToast,
  ]);

  const exitActionMode = useCallback(() => {
    setActionModeState(null);
    setPendingConfirmationActionKey(null);
  }, []);

  const enterActionMode = useCallback(() => {
    if (!selectedSearchAction || selectedSecondaryActions.length === 0) return;
    setActionModeState({
      actionId: selectedSearchAction.id,
      selectedSecondaryActionIndex: 0,
    });
    setPendingConfirmationActionKey(null);
  }, [selectedSearchAction, selectedSecondaryActions.length]);

  const cycleActionModeSelection = useCallback(() => {
    if (!selectedSearchAction || selectedSecondaryActions.length === 0) return;
    setPendingConfirmationActionKey(null);
    setActionModeState((prev) => ({
      actionId: selectedSearchAction.id,
      selectedSecondaryActionIndex: prev && prev.actionId === selectedSearchAction.id
        ? (prev.selectedSecondaryActionIndex + 1) % selectedSecondaryActions.length
        : 0,
    }));
  }, [selectedSearchAction, selectedSecondaryActions.length]);

  const executeSecondaryAction = useCallback((action: SearchAction, secondaryAction: SearchSecondaryAction) => {
    const { item } = action;
    const secondaryActionIndex = action.secondaryActions.findIndex((candidate) => candidate === secondaryAction);
    const secondaryActionKey = secondaryActionIndex >= 0
      ? getSecondaryActionSelectionKey(action.id, secondaryActionIndex)
      : null;
    if (item.type === 'tab') {
      if (!Number.isFinite(item.tabId)) return;
      if (currentBrowserTabId !== null && item.tabId === currentBrowserTabId) return;

      const tabsApi = globalThis.chrome?.tabs;
      if (!tabsApi) return;

      if (secondaryAction.kind === 'close-tab') {
        invalidateTabSearchCaches();
        tabsApi.remove(item.tabId, () => {
          if (globalThis.chrome?.runtime?.lastError) return;
          invalidateTabSearchCaches();
          setSearchSourceRefreshVersion((prev) => prev + 1);
          recordSearchPersonalizationUsage(action, secondaryAction);
          toast.success(t('search.tabClosedToast', {
            defaultValue: '标签页已关闭',
          }), {
            description: item.label,
          });
        });
        exitActionMode();
        return;
      }

      if (secondaryAction.kind === 'toggle-pin-tab') {
        invalidateTabSearchCaches();
        tabsApi.update(item.tabId, { pinned: !item.pinned }, () => {
          if (globalThis.chrome?.runtime?.lastError) return;
          invalidateTabSearchCaches();
          setSearchSourceRefreshVersion((prev) => prev + 1);
          recordSearchPersonalizationUsage(action, secondaryAction);
        });
        exitActionMode();
        return;
      }
    }

    if (item.type === 'bookmark' && secondaryAction.kind === 'remove-bookmark' && item.bookmarkId) {
      if (!secondaryActionKey) return;
      if (pendingConfirmationActionKey !== secondaryActionKey) {
        setPendingConfirmationActionKey(secondaryActionKey);
        return;
      }
      const bookmarksApi = globalThis.chrome?.bookmarks;
      if (!bookmarksApi?.remove) return;
      invalidateBookmarkSearchCaches();
      bookmarksApi.remove(item.bookmarkId, () => {
        if (globalThis.chrome?.runtime?.lastError) return;
        invalidateBookmarkSearchCaches();
        setSearchSourceRefreshVersion((prev) => prev + 1);
        recordSearchPersonalizationUsage(action, secondaryAction);
        toast.success(t('search.bookmarkRemovedToast', {
          defaultValue: '书签已删除',
        }), {
          description: item.label,
        });
      });
      setPendingConfirmationActionKey(null);
      exitActionMode();
      return;
    }

    if (pendingConfirmationActionKey) {
      setPendingConfirmationActionKey(null);
    }

    if (
      secondaryAction.kind === 'add-shortcut'
      && (item.type === 'tab' || item.type === 'bookmark')
    ) {
      onAddShortcutAction?.({
        title: item.label,
        url: item.value,
        icon: item.icon,
      });
      recordSearchPersonalizationUsage(action, secondaryAction);
      exitActionMode();
      return;
    }

    if (item.type === 'shortcut' && item.shortcutId) {
      const target = shortcutActionTargetMap.get(item.shortcutId);
      if (!target) return;

      if (secondaryAction.kind === 'edit-shortcut') {
        onEditShortcutAction?.(target);
        recordSearchPersonalizationUsage(action, secondaryAction);
        exitActionMode();
        return;
      }

      if (secondaryAction.kind === 'delete-shortcut') {
        onDeleteShortcutAction?.(target);
        recordSearchPersonalizationUsage(action, secondaryAction);
        exitActionMode();
        return;
      }
    }

    if (item.type === 'history' && item.searchActionKey) {
      if (secondaryAction.kind === 'toggle-setting') {
        if (secondaryAction.settingKey === 'search-tab-switch-setting') {
          onSetSearchTabSwitchEngineAction?.(!secondaryAction.active);
        } else if (secondaryAction.settingKey === 'search-prefix-setting') {
          onSetSearchPrefixEnabledAction?.(!secondaryAction.active);
        } else if (secondaryAction.settingKey === 'search-site-direct-setting') {
          onSetSearchSiteDirectEnabledAction?.(!secondaryAction.active);
        } else if (secondaryAction.settingKey === 'search-site-shortcut-setting') {
          onSetSearchSiteShortcutEnabledAction?.(!secondaryAction.active);
        } else if (secondaryAction.settingKey === 'search-any-key-capture-setting') {
          onSetSearchAnyKeyCaptureEnabledAction?.(!secondaryAction.active);
        } else if (secondaryAction.settingKey === 'search-calculator-setting') {
          onSetSearchCalculatorEnabledAction?.(!secondaryAction.active);
        } else if (secondaryAction.settingKey === 'search-rotating-placeholder-setting') {
          onSetSearchRotatingPlaceholderEnabledAction?.(!secondaryAction.active);
        } else if (secondaryAction.settingKey === 'shortcut-icon-show-title-setting') {
          onSetShortcutShowTitleAction?.(!secondaryAction.active);
        } else if (secondaryAction.settingKey === 'prevent-duplicate-new-tab-setting') {
          onSetPreventDuplicateNewTabAction?.(!secondaryAction.active);
        } else if (secondaryAction.settingKey === 'wallpaper-auto-dim-setting') {
          onSetDarkModeAutoDimWallpaperAction?.(!secondaryAction.active);
        }
        recordSearchPersonalizationUsage(action, secondaryAction);
        exitActionMode();
        return;
      }

      if (secondaryAction.kind === 'set-theme-mode') {
        setTheme(secondaryAction.targetMode);
        recordSearchPersonalizationUsage(action, secondaryAction);
        exitActionMode();
        return;
      }

      if (secondaryAction.kind === 'cycle-search-engine') {
        cycleSearchEngine(1);
        recordSearchPersonalizationUsage(action, secondaryAction);
        exitActionMode();
        return;
      }

      if (secondaryAction.kind === 'toggle-show-time') {
        onSetShowTimeAction?.(!secondaryAction.active);
        recordSearchPersonalizationUsage(action, secondaryAction);
        exitActionMode();
        return;
      }

      if (secondaryAction.kind === 'set-wallpaper-mode') {
        onSetWallpaperModeAction?.(secondaryAction.targetMode);
        recordSearchPersonalizationUsage(action, secondaryAction);
        exitActionMode();
        return;
      }

      if (secondaryAction.kind === 'set-shortcut-icon-appearance') {
        onSetShortcutIconAppearanceAction?.(secondaryAction.targetAppearance);
        recordSearchPersonalizationUsage(action, secondaryAction);
        exitActionMode();
        return;
      }
    }

    void copyTextToClipboard(item.value)
      .then(() => {
        recordSearchPersonalizationUsage(action, secondaryAction);
        toast.success(t('search.linkCopied', { defaultValue: '链接已复制到剪贴板' }));
      })
      .catch(() => {
        toast.error(t('search.linkCopyFailed', { defaultValue: '复制链接失败，请重试' }));
      });
    exitActionMode();
  }, [
    currentBrowserTabId,
    currentShortcutIconAppearance,
    currentThemePreference,
    currentWallpaperMode,
    cycleSearchEngine,
    exitActionMode,
    onAddShortcutAction,
    onDeleteShortcutAction,
    onEditShortcutAction,
    onSetShortcutIconAppearanceAction,
    onSetSearchAnyKeyCaptureEnabledAction,
    onSetSearchCalculatorEnabledAction,
    onSetSearchPrefixEnabledAction,
    onSetSearchRotatingPlaceholderEnabledAction,
    onSetSearchSiteDirectEnabledAction,
    onSetSearchSiteShortcutEnabledAction,
    onSetSearchTabSwitchEngineAction,
    onSetShortcutShowTitleAction,
    onSetPreventDuplicateNewTabAction,
    onSetDarkModeAutoDimWallpaperAction,
    onSetShowTimeAction,
    onSetWallpaperModeAction,
    pendingConfirmationActionKey,
    recordSearchPersonalizationUsage,
    setTheme,
    shortcutActionTargetMap,
    t,
  ]);

  const activateSelectedSecondaryAction = useCallback(() => {
    if (!actionModeActive || !selectedSearchAction) return;
    const secondaryAction = selectedSecondaryActions[selectedSecondaryActionIndex];
    if (!secondaryAction) return;
    executeSecondaryAction(selectedSearchAction, secondaryAction);
  }, [
    actionModeActive,
    executeSecondaryAction,
    selectedSearchAction,
    selectedSecondaryActionIndex,
    selectedSecondaryActions,
  ]);

  const handleSearchInputChange = useCallback((nextValue: string, nativeEvent?: Event) => {
    const matchedAlias = matchSearchCommandAliasInput(nextValue);
    const parsedCommand = parseSearchCommand(nextValue);
    const nextSearchSessionModel = createSearchSessionModel(nextValue, {
      prefixEnabled: searchPrefixEnabled,
      calculatorEnabled: false,
      siteDirectEnabled: false,
    });
    const trimmedInput = nextValue.trimStart().toLowerCase();
    const commandId = (
      trimmedInput === '/bookmarks'
      || trimmedInput === '/historys'
      || trimmedInput === '/tabs'
      || matchedAlias !== null
    ) ? (parsedCommand.id ?? matchedAlias) : null;

    if (commandId === 'bookmarks') {
      runAfterSearchPermission('bookmarks', () => {});
    } else if (commandId === 'history') {
      runAfterSearchPermission('history', () => {});
    } else if (commandId === 'tabs') {
      runAfterSearchPermission('tabs', () => {});
    }
    pointerHighlightLockUntilRef.current = 0;
    exitActionMode();
    handleSearchChange(nextValue, nativeEvent);
    if (shouldAutoOpenSearchSuggestions(nextSearchSessionModel)) {
      openHistoryPanel({ select: 'none' });
      return;
    }
    closeHistoryPanel('manual');
  }, [closeHistoryPanel, exitActionMode, handleSearchChange, openHistoryPanel, runAfterSearchPermission, searchPrefixEnabled]);

  const markSuggestionKeyboardNavigation = useCallback(() => {
    pointerHighlightLockUntilRef.current = Date.now() + POINTER_HIGHLIGHT_KEYBOARD_LOCK_MS;
  }, []);

  const handleSearchSubmit = useCallback(() => {
    const selectedAction = historySelectedIndex !== -1
      ? visibleSearchActions[historySelectedIndex] ?? null
      : null;
    const decision = resolveSearchSubmitDecision({
      session: searchSessionModel,
      selectedAction,
    });

    if (decision.kind === 'copy-calculator') {
      if (decision.resultText) {
        void copyTextToClipboard(decision.resultText)
          .then(() => {
            toast.success(t('search.calculatorCopied', { defaultValue: '计算结果已复制到剪贴板' }));
          })
          .catch(() => {
            toast.error(t('search.calculatorCopyFailed', { defaultValue: '复制失败，请手动复制' }));
          });
      }
      setSearchValue('');
      closeHistoryPanel('submit');
      return;
    }

    if (decision.kind === 'activate-action') {
      activateSearchAction(decision.action);
      return;
    }

    if (decision.kind === 'noop') {
      return;
    }

    handleSearch();
  }, [
    activateSearchAction,
    closeHistoryPanel,
    visibleSearchActions,
    handleSearch,
    historySelectedIndex,
    searchSessionModel,
    setSearchValue,
    t,
  ]);

  const focusSearchInput = useCallback((options?: SearchActivationFocusOptions) => {
    if (interactionDisabled) return;
    const input = inputRef.current;
    if (!input) return;
    focusSearchInputElement(input, options);
    if (options?.openHistory) {
      openHistoryPanel({
        select: options.openHistory,
        itemCount: visibleSearchActions.length,
      });
    }
  }, [inputRef, interactionDisabled, openHistoryPanel, visibleSearchActions.length]);

  const appendSearchInputText = useCallback((text: string) => {
    if (interactionDisabled || text.length === 0) return;
    pointerHighlightLockUntilRef.current = 0;
    focusedPrintableCapturePendingRef.current = false;
    focusSearchInput();
    handleSearchInputChange(`${searchValue}${text}`);
  }, [focusSearchInput, handleSearchInputChange, interactionDisabled, searchValue]);

  useEffect(() => {
    const handleNativeInput = (event: Event) => {
      if (event.target !== inputRef.current) return;
      focusedPrintableCapturePendingRef.current = false;
    };
    const handleFocusOut = (event: FocusEvent) => {
      if (event.target !== inputRef.current) return;
      focusedPrintableCapturePendingRef.current = false;
    };

    document.addEventListener('input', handleNativeInput, true);
    document.addEventListener('focusout', handleFocusOut, true);
    return () => {
      document.removeEventListener('input', handleNativeInput, true);
      document.removeEventListener('focusout', handleFocusOut, true);
    };
  }, [inputRef]);

  const activationHandle = useMemo<SearchActivationHandle | null>(() => {
    if (interactionDisabled) return null;
    return {
      id: 'home-search',
      inputRef,
      anyKeyCaptureEnabled: searchAnyKeyCaptureEnabled,
      focusInput: focusSearchInput,
      appendText: appendSearchInputText,
      armFocusedPrintableCapture: () => {
        focusedPrintableCapturePendingRef.current = true;
      },
      consumeFocusedPrintableCapture: () => {
        if (!focusedPrintableCapturePendingRef.current) return false;
        focusedPrintableCapturePendingRef.current = false;
        return true;
      },
    };
  }, [
    appendSearchInputText,
    focusSearchInput,
    inputRef,
    interactionDisabled,
    searchAnyKeyCaptureEnabled,
  ]);

  useEffect(() => {
    onActivationHandleChange?.(activationHandle);
  }, [activationHandle, onActivationHandleChange]);

  useEffect(() => () => {
    onActivationHandleChange?.(null);
  }, [onActivationHandleChange]);

  const {
    suggestionModifierHeld,
    handleSuggestionKeyDown,
  } = useSearchInteractionController({
    historyOpen,
    openHistoryPanel,
    closeHistoryPanel,
    setHistorySelectedIndex,
    searchActions: visibleSearchActions,
    activateSearchAction,
    tabSwitchSearchEngine,
    enableSearchEngineSwitcher: ENABLE_SEARCH_ENGINE_SWITCHER,
    cycleSearchEngine,
    dropdownOpen,
    setDropdownOpen,
    searchInputRef: inputRef,
    onKeyboardNavigate: markSuggestionKeyboardNavigation,
    actionModeActive,
    actionModeActionCount: selectedSecondaryActions.length,
    enterActionMode,
    exitActionMode,
    cycleActionModeSelection,
    activateSelectedSecondaryAction,
  });

  useEffect(() => {
    if (!isSlashCommandPanelOpen || !historyOpen) return;
    if (historySelectedIndex !== -1) return;
    if (slashCommandActions.length <= 0) return;
    setHistorySelectedIndex(0);
  }, [
    historyOpen,
    historySelectedIndex,
    isSlashCommandPanelOpen,
    setHistorySelectedIndex,
    slashCommandActions.length,
  ]);

  useEffect(() => {
    const handleHistoryOutside = (event: MouseEvent) => {
      if (interactionDisabled) return;
      if (!historyOpen) return;
      const target = event.target;
      const targetNode = target as Node | null;
      if (searchAreaRef.current && (!targetNode || !searchAreaRef.current.contains(targetNode))) {
        closeHistoryPanel('outside');
      }
    };
    document.addEventListener('mousedown', handleHistoryOutside);
    return () => document.removeEventListener('mousedown', handleHistoryOutside);
  }, [closeHistoryPanel, historyOpen, interactionDisabled]);

  useEffect(() => {
    if (!historyOpen) return;
    syncHistorySelectionByCount(visibleSearchActions.length);
  }, [historyOpen, syncHistorySelectionByCount, visibleSearchActions.length]);

  const handleSearchHistoryOpen = useCallback(() => {
    if (interactionDisabled) return;
    setDropdownOpen(false);
    pointerHighlightLockUntilRef.current = 0;
    openHistoryPanel({ select: 'none' });
    refreshSearchPermissionStatus();
  }, [interactionDisabled, openHistoryPanel, refreshSearchPermissionStatus, setDropdownOpen]);

  const handleSearchInputFocus = useCallback(() => {
    if (interactionDisabled) return;
    if (searchSessionModel.mode === 'default' && !searchSessionModel.trimmedValue) return;
    if (!autoOpenSuggestionsEnabled) return;
    handleSearchHistoryOpen();
  }, [autoOpenSuggestionsEnabled, handleSearchHistoryOpen, interactionDisabled, searchSessionModel.mode, searchSessionModel.trimmedValue]);

  const handleSearchSuggestionHighlight = useCallback((index: number) => {
    if (Date.now() < pointerHighlightLockUntilRef.current) return;
    if (index !== historySelectedIndex) {
      exitActionMode();
    }
    setHistorySelectedIndex((prev) => (prev === index ? prev : index));
  }, [exitActionMode, historySelectedIndex, setHistorySelectedIndex]);

  const handleSearchHistoryClear = useCallback(() => {
    setSearchHistory([]);
    setHistorySelectedIndex(-1);
    exitActionMode();
  }, [exitActionMode, setSearchHistory, setHistorySelectedIndex]);

  const handleSearchClear = useCallback(() => {
    setSearchValue('');
    closeHistoryPanel('manual');
    exitActionMode();
  }, [closeHistoryPanel, exitActionMode, setSearchValue]);

  const rotatingPlaceholderItems = useMemo(() => {
    const items: string[] = [
      t('search.placeholderDynamic', {
        defaultValue: '可搜标签页、书签、历史、快捷方式，网址也能直接打开',
      }),
      t('search.placeholderHintSettings', {
        defaultValue: '搜“主题模式”“图标大小”“壁纸模式”可直达设置',
      }),
      t('search.placeholderHintActions', {
        defaultValue: '选中结果后按 →，可关闭标签页、复制链接、添加快捷方式',
      }),
    ];
    if ((ENABLE_SEARCH_ENGINE_SWITCHER && tabSwitchSearchEngine) || searchPrefixEnabled) {
      items.push(t('search.placeholderHintTabSwitch', {
        defaultValue: '按 Tab 切换搜索引擎，或输入 !g / ！g 临时切换',
      }));
    }
    if (searchCalculatorEnabled) {
      items.push(t('search.placeholderHintCalculator', {
        defaultValue: '输入 12*8 这种算式，可直接计算',
      }));
    }
    if (searchSiteDirectEnabled) {
      items.push(t('search.placeholderHintSiteDirect', {
        defaultValue: '输入 github react、bilibili 动画，可直接站内搜',
      }));
    }
    return items;
  }, [
    i18n.language,
    searchCalculatorEnabled,
    searchPrefixEnabled,
    searchSiteDirectEnabled,
    t,
    tabSwitchSearchEngine,
  ]);

  const rotatingSearchPlaceholder = useRotatingText(
    rotatingPlaceholderItems,
    3000,
    !searchRotatingPlaceholderEnabled,
  );

  const searchDropdownStatusNotice = useMemo(() => {
    if (isSlashCommandPanelOpen) return undefined;

    const authorizationLabel = t('search.authorizeHistoryPermission', { defaultValue: '去授权' });

    if (searchSessionModel.mode === 'bookmarks') {
      if (permissionRequestInFlight === 'bookmarks') {
        return {
          tone: 'loading' as const,
          message: t('search.bookmarksPermissionPending', {
            defaultValue: '正在等待书签权限确认...',
          }),
        };
      }
      if (permissionWarmup === 'bookmarks' || suggestionSourceStatus.bookmarkLoading) {
        return {
          tone: 'loading' as const,
          message: t('search.bookmarksPreparing', {
            defaultValue: '正在整理书签，请稍候...',
          }),
        };
      }
      if (searchPermissionsReady && !searchPermissions.bookmarks) {
        return {
          tone: 'info' as const,
          message: t('search.bookmarksPermissionBanner', {
            defaultValue: '授权后可搜索浏览器书签',
          }),
          actionLabel: authorizationLabel,
          onAction: () => runAfterSearchPermission('bookmarks', () => {}),
        };
      }
      return undefined;
    }

    if (searchSessionModel.mode === 'tabs') {
      if (permissionRequestInFlight === 'tabs') {
        return {
          tone: 'loading' as const,
          message: t('search.tabsPermissionPending', {
            defaultValue: '正在等待标签页权限确认...',
          }),
        };
      }
      if (permissionWarmup === 'tabs' || suggestionSourceStatus.tabLoading) {
        return {
          tone: 'loading' as const,
          message: t('search.tabsPreparing', {
            defaultValue: '正在整理已打开标签页，请稍候...',
          }),
        };
      }
      if (searchPermissionsReady && !searchPermissions.tabs) {
        return {
          tone: 'info' as const,
          message: t('search.tabsPermissionBanner', {
            defaultValue: '授权后可搜索已打开标签页',
          }),
          actionLabel: authorizationLabel,
          onAction: () => runAfterSearchPermission('tabs', () => {}),
        };
      }
      return undefined;
    }

    if (searchSessionModel.mode === 'history') {
      if (permissionRequestInFlight === 'history') {
        return {
          tone: 'loading' as const,
          message: t('search.historyPermissionPending', {
            defaultValue: '正在等待历史记录权限确认...',
          }),
        };
      }
      if (permissionWarmup === 'history' || suggestionSourceStatus.browserHistoryLoading) {
        return {
          tone: 'loading' as const,
          message: t('search.historyPreparing', {
            defaultValue: '正在加载浏览器历史记录...',
          }),
        };
      }
      if (searchPermissionsReady && !searchPermissions.history) {
        return {
          tone: 'info' as const,
          message: t('search.historyPermissionBanner', {
            defaultValue: '授权后可显示浏览器历史记录',
          }),
          actionLabel: authorizationLabel,
          onAction: () => runAfterSearchPermission('history', () => {}),
        };
      }
      return undefined;
    }

    if (permissionRequestInFlight === 'history') {
      return {
        tone: 'loading' as const,
        message: t('search.historyPermissionPending', {
          defaultValue: '正在等待历史记录权限确认...',
        }),
      };
    }
    if (permissionWarmup === 'history' || suggestionSourceStatus.browserHistoryLoading) {
      return {
        tone: 'loading' as const,
        message: t('search.historyPreparing', {
          defaultValue: '正在加载浏览器历史记录...',
        }),
      };
    }
    if (
      searchPermissionsReady
      && !searchPermissions.history
      && searchSessionModel.mode === 'default'
      && visibleSearchActions.length === 0
    ) {
      return {
        tone: 'info' as const,
        message: t('search.historyPermissionBanner', {
          defaultValue: '授权后可显示浏览器历史记录',
        }),
        actionLabel: authorizationLabel,
        onAction: () => runAfterSearchPermission('history', () => {}),
      };
    }
    return undefined;
  }, [
    permissionRequestInFlight,
    permissionWarmup,
    runAfterSearchPermission,
    searchPermissions,
    searchPermissionsReady,
    searchSessionModel.mode,
    visibleSearchActions.length,
    isSlashCommandPanelOpen,
    suggestionSourceStatus.bookmarkLoading,
    suggestionSourceStatus.browserHistoryLoading,
    suggestionSourceStatus.tabLoading,
    t,
  ]);

  const searchDropdownEmptyStateLabel = useMemo(() => {
    if (isSlashCommandPanelOpen) {
      return t('search.slash.empty', { defaultValue: '没有匹配的命令' });
    }
    if (searchSessionModel.mode === 'bookmarks') {
      return t('search.noBookmarks', { defaultValue: '没有找到匹配的书签' });
    }
    if (searchSessionModel.mode === 'tabs') {
      return t('search.noTabs', { defaultValue: '没有找到匹配的标签页' });
    }
    if (searchSessionModel.mode === 'history') {
      return t('search.noHistory', { defaultValue: '没有找到匹配的历史记录' });
    }
    return t('search.noHistory');
  }, [isSlashCommandPanelOpen, searchSessionModel.mode, t]);

  return (
    <RenderProfileBoundary id="SearchExperience">
      <SearchBar
        value={searchValue}
        onValueChange={handleSearchInputChange}
        onSubmit={handleSearchSubmit}
        searchEngine={searchEngine}
        dropdownOpen={dropdownOpen}
        onEngineOpenChange={setDropdownOpen}
        onEngineSelect={handleEngineSelect}
        searchActions={visibleSearchActions}
        historyOpen={historyOpen}
        onHistoryOpen={handleSearchHistoryOpen}
        onInputFocus={handleSearchInputFocus}
        onSuggestionSelect={activateSearchAction}
        onSuggestionHighlight={handleSearchSuggestionHighlight}
        onHistoryClear={handleSearchHistoryClear}
        onClear={handleSearchClear}
        historyRef={searchAreaRef}
        placeholder={rotatingSearchPlaceholder || t('search.placeholderDynamic')}
        calculatorInlinePreview={searchInlinePreview}
        onKeyDown={handleSuggestionKeyDown}
        historySelectedIndex={historySelectedIndex}
        inputRef={inputRef}
        blankMode={blankMode}
        forceWhiteTheme={forceWhiteTheme}
        subtleDarkTone={subtleDarkTone}
        searchSurfaceStyle={searchSurfaceStyle}
        searchSurfaceTone={searchSurfaceTone}
        disablePlaceholderAnimation={disablePlaceholderAnimation}
        lightweightSearchUi={lightweightSearchUi}
        searchHeight={searchHeight}
        searchInputFontSize={searchInputFontSize}
        searchHorizontalPadding={searchHorizontalPadding}
        searchActionSize={searchActionSize}
        interactionDisabled={interactionDisabled}
        showEngineSwitcher={ENABLE_SEARCH_ENGINE_SWITCHER}
        statusNotice={searchDropdownStatusNotice}
        emptyStateLabel={searchDropdownEmptyStateLabel}
        showSuggestionNumberHints={historyOpen && suggestionModifierHeld}
        currentBrowserTabId={currentBrowserTabId}
        allowSelectedSuggestionEnter={historyOpen && historySelectedIndex !== -1}
        suggestionsPlacement={suggestionsPlacement}
        actionModeActive={actionModeActive}
        selectedSecondaryActionIndex={selectedSecondaryActionIndex}
        pendingConfirmationActionKey={pendingConfirmationActionKey}
        onSecondaryActionSelect={(action, secondaryAction, index) => {
          const nextActionModeState = {
            actionId: action.id,
            selectedSecondaryActionIndex: index,
          };
          if (secondaryAction.kind === 'remove-bookmark') {
            const secondaryActionKey = getSecondaryActionSelectionKey(action.id, index);
            const isSameSecondaryActionSelected = actionModeState?.actionId === action.id
              && actionModeState.selectedSecondaryActionIndex === index;
            setActionModeState(nextActionModeState);
            if (!isSameSecondaryActionSelected || pendingConfirmationActionKey !== secondaryActionKey) {
              setPendingConfirmationActionKey(secondaryActionKey);
              return;
            }
          }
          setActionModeState({
            actionId: action.id,
            selectedSecondaryActionIndex: index,
          });
          executeSecondaryAction(action, secondaryAction);
        }}
      />
    </RenderProfileBoundary>
  );
});
