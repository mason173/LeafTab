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
import { useTranslation } from 'react-i18next';
import { SearchBar } from '@/components/SearchBar';
import { SEARCH_ENGINE_BRAND_NAMES } from '@/components/search/searchEngineSwitcher.shared';
import { toast } from '@/components/ui/sonner';
import { ENABLE_SEARCH_ENGINE_SWITCHER } from '@/config/featureFlags';
import { useRotatingText } from '@/hooks/useRotatingText';
import { useSearch } from '@/hooks/useSearch';
import { useSearchInteractionController } from '@/hooks/useSearchInteractionController';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import type { SearchAction, SearchActionDisplayIcon } from '@/utils/searchActions';
import { normalizeSearchQuery } from '@/utils/searchHelpers';
import {
  readSuggestionUsageMap,
  recordSuggestionUsage,
} from '@/utils/suggestionPersonalization';
import {
  matchSearchCommandAliasInput,
  parseSearchCommand,
  resolveSearchCommandAutocomplete,
  type SearchSuggestionPermission,
} from '@/utils/searchCommands';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import { createSearchSessionModel } from '@/utils/searchSessionModel';
import { scheduleAfterInteractivePaint } from '@/utils/mainThreadScheduler';
import { resolveSearchSubmitDecision } from '@/utils/searchSubmit';
import { RenderProfileBoundary } from '@/dev/renderProfiler';
import type { SearchSuggestionsPlacement } from '@/components/search/SearchSuggestionsPanel.shared';
import type { WallpaperMode } from '@/wallpaper/types';

const POINTER_HIGHLIGHT_KEYBOARD_LOCK_MS = 140;
const SEARCH_INPUT_FOCUS_LOCK_DELAY_MS = 0;
const SEARCH_PERMISSION_KEYS: SearchSuggestionPermission[] = ['bookmarks', 'history', 'tabs'];
const SLASH_COMMAND_ACTION_VALUE_PREFIX = 'leaftab://slash-action/';
const SEARCH_FOCUS_BLOCKING_SELECTOR = [
  '[data-slot="dialog-content"]',
  '[data-slot="alert-dialog-content"]',
  '[data-slot="sheet-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="dropdown-menu-content"]',
].join(', ');

export type SearchInteractionState = {
  historyOpen: boolean;
  dropdownOpen: boolean;
  typingBurst: boolean;
};

export type SlashCommandDialogTarget =
  | 'search-settings'
  | 'shortcut-guide'
  | 'shortcut-icon-settings'
  | 'wallpaper-settings'
  | 'sync-center'
  | 'about';

type SlashCommandActionId =
  | 'bookmarks'
  | 'search-settings'
  | 'shortcut-guide'
  | 'shortcut-icon-settings'
  | 'wallpaper-settings'
  | 'sync-center'
  | 'about';

type SlashCommandEntry = {
  id: SlashCommandActionId;
  icon: SearchActionDisplayIcon;
  label: string;
  detail?: string;
  keywords: string[];
};

function buildSlashCommandActionValue(actionId: SlashCommandActionId): string {
  return `${SLASH_COMMAND_ACTION_VALUE_PREFIX}${actionId}`;
}

function parseSlashCommandActionId(value: string): SlashCommandActionId | null {
  if (!value.startsWith(SLASH_COMMAND_ACTION_VALUE_PREFIX)) return null;
  const id = value.slice(SLASH_COMMAND_ACTION_VALUE_PREFIX.length);
  if (
    id === 'bookmarks'
    || id === 'search-settings'
    || id === 'shortcut-guide'
    || id === 'shortcut-icon-settings'
    || id === 'wallpaper-settings'
    || id === 'sync-center'
    || id === 'about'
  ) {
    return id;
  }
  return null;
}

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
  currentShortcutIconAppearance?: ShortcutIconAppearance;
  onInteractionStateChange?: (state: SearchInteractionState) => void;
  onOpenSlashCommandDialog?: (target: SlashCommandDialogTarget) => void;
}

function hasOpenBlockingLayer() {
  return Boolean(document.querySelector(SEARCH_FOCUS_BLOCKING_SELECTOR));
}

function isEditableElement(el: Element | null) {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return el.isContentEditable
    || tag === 'textarea'
    || tag === 'select'
    || (tag === 'input' && el.getAttribute('type') !== 'button');
}

function isFocusProtectedElement(el: Element | null) {
  if (!(el instanceof HTMLElement)) return false;
  if (isEditableElement(el)) return true;

  return Boolean(
    el.closest(
      [
        'button',
        'a[href]',
        '[role="button"]',
        '[role="menu"]',
        '[role="menuitem"]',
        '[role="dialog"]',
        '[data-slot="popover-trigger"]',
        '[data-slot="popover-content"]',
        '[data-slot="dropdown-menu-trigger"]',
        '[data-slot="dropdown-menu-content"]',
        '[data-slot="dropdown-menu-item"]',
        '[data-slot="dialog-content"]',
        '[data-slot="alert-dialog-content"]',
        '[data-slot="sheet-content"]',
      ].join(', '),
    ),
  );
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
  currentShortcutIconAppearance,
  onInteractionStateChange,
  onOpenSlashCommandDialog,
}: SearchExperienceProps) {
  const { t, i18n } = useTranslation();
  const searchAreaRef = useRef<HTMLDivElement>(null);
  const pointerHighlightLockUntilRef = useRef(0);
  const lastInputSelectionRef = useRef<{ start: number; end: number } | null>(null);
  const outsideDismissRefocusTimerRef = useRef<number | null>(null);
  const suppressNextInputFocusOpenRef = useRef(false);
  const [currentBrowserTabId, setCurrentBrowserTabId] = useState<number | null>(null);
  const [suggestionUsageVersion, setSuggestionUsageVersion] = useState(0);
  const [searchPermissions, setSearchPermissions] = useState<Record<SearchSuggestionPermission, boolean>>(() => ({
    bookmarks: typeof chrome === 'undefined' || !chrome.runtime?.id,
    history: typeof chrome === 'undefined' || !chrome.runtime?.id,
    tabs: typeof chrome === 'undefined' || !chrome.runtime?.id,
  }));
  const [searchPermissionsReady, setSearchPermissionsReady] = useState<boolean>(() => (
    typeof chrome === 'undefined' || !chrome.runtime?.id
  ));
  const [permissionRequestInFlight, setPermissionRequestInFlight] = useState<SearchSuggestionPermission | null>(null);
  const [permissionWarmup, setPermissionWarmup] = useState<SearchSuggestionPermission | null>(null);
  const [blockingLayerOpen, setBlockingLayerOpen] = useState(() => hasOpenBlockingLayer());

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
      if (outsideDismissRefocusTimerRef.current !== null) {
        window.clearTimeout(outsideDismissRefocusTimerRef.current);
      }
    };
  }, []);

  const captureSearchInputSelection = useCallback(() => {
    const input = inputRef.current;
    if (!input || document.activeElement !== input) return;
    lastInputSelectionRef.current = {
      start: input.selectionStart ?? input.value.length,
      end: input.selectionEnd ?? input.value.length,
    };
  }, [inputRef]);

  const restoreSearchInputSelection = useCallback((input: HTMLInputElement) => {
    const lastSelection = lastInputSelectionRef.current;
    const valueLength = input.value.length;
    const start = Math.max(0, Math.min(lastSelection?.start ?? valueLength, valueLength));
    const end = Math.max(start, Math.min(lastSelection?.end ?? valueLength, valueLength));
    try {
      input.setSelectionRange(start, end);
    } catch {}
  }, []);

  const focusSearchInputWithoutOpeningPanel = useCallback(() => {
    if (dropdownOpen || document.visibilityState === 'hidden' || hasOpenBlockingLayer()) return;
    const input = inputRef.current;
    if (!input) return;
    if (document.activeElement === input) {
      captureSearchInputSelection();
      restoreSearchInputSelection(input);
      return;
    }

    const activeElement = document.activeElement;
    if (
      activeElement
      && activeElement !== document.body
      && activeElement !== document.documentElement
      && activeElement !== input
      && isEditableElement(activeElement)
    ) {
      return;
    }

    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
    restoreSearchInputSelection(input);
  }, [captureSearchInputSelection, dropdownOpen, inputRef, restoreSearchInputSelection]);

  useEffect(() => {
    const syncBlockingLayerState = () => {
      setBlockingLayerOpen(hasOpenBlockingLayer());
    };

    syncBlockingLayerState();
    document.addEventListener('focusin', syncBlockingLayerState, true);
    document.addEventListener('mousedown', syncBlockingLayerState, true);
    window.addEventListener('keydown', syncBlockingLayerState, true);

    return () => {
      document.removeEventListener('focusin', syncBlockingLayerState, true);
      document.removeEventListener('mousedown', syncBlockingLayerState, true);
      window.removeEventListener('keydown', syncBlockingLayerState, true);
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
    let focusTimer: number | null = null;

    const clearScheduledFocus = () => {
      if (focusTimer !== null) {
        window.clearTimeout(focusTimer);
        focusTimer = null;
      }
    };

    const focusSearchInput = () => {
      clearScheduledFocus();
      focusSearchInputWithoutOpeningPanel();
    };

    const scheduleFocusSearchInput = () => {
      clearScheduledFocus();
      if (dropdownOpen) return;
      focusTimer = window.setTimeout(() => {
        focusTimer = null;
        focusSearchInput();
      }, SEARCH_INPUT_FOCUS_LOCK_DELAY_MS);
    };

    const handleDocumentFocusIn = (event: FocusEvent) => {
      const input = inputRef.current;
      if (!input || dropdownOpen || hasOpenBlockingLayer()) return;
      const target = event.target;
      if (target === input) {
        captureSearchInputSelection();
        return;
      }
      if (target instanceof Element && isFocusProtectedElement(target)) {
        return;
      }
      scheduleFocusSearchInput();
    };

    const handleWindowFocus = () => {
      scheduleFocusSearchInput();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleFocusSearchInput();
      }
    };

    const handleSelectionChange = () => {
      captureSearchInputSelection();
    };

    scheduleFocusSearchInput();
    document.addEventListener('focusin', handleDocumentFocusIn, true);
    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearScheduledFocus();
      document.removeEventListener('focusin', handleDocumentFocusIn, true);
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [captureSearchInputSelection, dropdownOpen, focusSearchInputWithoutOpeningPanel, inputRef]);

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

  const {
    actions: searchActions,
    sourceStatus: suggestionSourceStatus,
  } = useSearchSuggestions({
    searchValue,
    queryModel: searchSessionModel,
    filteredHistoryItems,
    shortcuts,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
    historyPermissionGranted: searchPermissions.history,
    bookmarksPermissionGranted: searchPermissions.bookmarks,
    tabsPermissionGranted: searchPermissions.tabs,
    permissionWarmup,
  });

  const slashCommandInput = useMemo(
    () => searchValue.trimStart(),
    [searchValue],
  );
  const slashCommandQuery = useMemo(() => {
    if (!slashCommandInput.startsWith('/')) return '';
    return slashCommandInput.slice(1).trim();
  }, [slashCommandInput]);
  const slashCommandQueryKey = useMemo(
    () => normalizeSearchQuery(slashCommandQuery),
    [slashCommandQuery],
  );
  const isSlashCommandPanelOpen = historyOpen
    && slashCommandInput.startsWith('/')
    && !searchSessionModel.command.active;
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
  const slashCommandEntries = useMemo<SlashCommandEntry[]>(() => [
    {
      id: 'bookmarks',
      icon: 'bookmarks',
      label: t('search.slash.bookmarks', {
        defaultValue: '/bookmarks · 搜索浏览器书签',
      }),
      keywords: ['/bookmarks', '/b', 'bookmarks', '书签'],
    },
    {
      id: 'search-settings',
      icon: 'search-settings',
      label: t('search.slash.searchSettings', {
        defaultValue: '搜索设置',
      }),
      detail: currentSearchEngineLabel,
      keywords: ['设置', '搜索设置', 'search'],
    },
    {
      id: 'shortcut-guide',
      icon: 'shortcut-guide',
      label: t('search.slash.shortcutGuide', {
        defaultValue: '快捷键指南',
      }),
      keywords: ['设置', '快捷键', '快捷键指南', 'guide'],
    },
    {
      id: 'shortcut-icon-settings',
      icon: 'shortcut-icon-settings',
      label: t('search.slash.shortcutIconSettings', {
        defaultValue: '图标设置',
      }),
      detail: currentShortcutIconAppearanceLabel,
      keywords: ['设置', '图标', 'icon'],
    },
    {
      id: 'wallpaper-settings',
      icon: 'wallpaper-settings',
      label: t('search.slash.wallpaperSettings', {
        defaultValue: '壁纸设置',
      }),
      detail: currentWallpaperModeLabel,
      keywords: ['设置', '壁纸', 'wallpaper'],
    },
    {
      id: 'sync-center',
      icon: 'sync-center',
      label: t('search.slash.syncCenter', {
        defaultValue: '同步中心',
      }),
      keywords: ['设置', '同步', 'sync'],
    },
    {
      id: 'about',
      icon: 'about',
      label: t('search.slash.about', {
        defaultValue: '关于 LeafTab',
      }),
      keywords: ['设置', '关于', 'about'],
    },
  ], [t]);
  const slashCommandActions = useMemo<SearchAction[]>(() => {
    if (!isSlashCommandPanelOpen) return [];
    const filteredEntries = slashCommandQueryKey
      ? slashCommandEntries.filter((entry) => {
          if (normalizeSearchQuery(entry.label).includes(slashCommandQueryKey)) return true;
          return entry.keywords.some((keyword) => normalizeSearchQuery(keyword).includes(slashCommandQueryKey));
        })
      : slashCommandEntries;
    return filteredEntries.map((entry, index) => ({
      id: `slash:${entry.id}:${index}`,
      kind: 'open-target',
      permission: null,
      usageKey: null,
      displayIcon: entry.icon,
      item: {
        type: 'history',
        label: entry.label,
        detail: entry.detail,
        value: buildSlashCommandActionValue(entry.id),
        timestamp: 0,
        historySource: 'browser',
      },
    }));
  }, [isSlashCommandPanelOpen, slashCommandEntries, slashCommandQueryKey]);
  const effectiveSearchActions = isSlashCommandPanelOpen ? slashCommandActions : searchActions;

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
    const { query, overrideEngine } = searchSessionModel.enginePrefix;
    if (!overrideEngine || !query) return '';
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

  const showSearchCommandPermissionDeniedToast = useCallback((permission: 'bookmarks' | 'history' | 'tabs') => {
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

  const setSearchPermissionGranted = useCallback((permission: SearchSuggestionPermission, granted: boolean) => {
    setSearchPermissions((prev) => {
      if (prev[permission] === granted) return prev;
      return {
        ...prev,
        [permission]: granted,
      };
    });
    setSearchPermissionsReady(true);
  }, []);

  const executeSlashCommand = useCallback((actionId: SlashCommandActionId) => {
    if (actionId === 'bookmarks') {
      setSearchValue(resolveSearchCommandAutocomplete('/bookmarks') || '/bookmarks ');
      setHistorySelectedIndex(-1);
      openHistoryPanel({ select: 'none' });
      void ensureExtensionPermission('bookmarks', { requestIfNeeded: true })
        .then((granted) => {
          setSearchPermissionGranted('bookmarks', granted);
          if (!granted) {
            showSearchCommandPermissionDeniedToast('bookmarks');
          }
        })
        .catch(() => {
          setSearchPermissionGranted('bookmarks', false);
        });
      return;
    }

    setSearchValue('');
    closeHistoryPanel('selection');

    if (actionId === 'search-settings') {
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
  }, [
    closeHistoryPanel,
    onOpenSlashCommandDialog,
    openHistoryPanel,
    setSearchPermissionGranted,
    setHistorySelectedIndex,
    setSearchValue,
    showSearchCommandPermissionDeniedToast,
  ]);

  const executeSearchAction = useCallback((action: SearchAction) => {
    const { item } = action;
    const slashActionId = parseSlashCommandActionId(item.value);
    if (slashActionId) {
      executeSlashCommand(slashActionId);
      return;
    }

    if (action.kind === 'focus-tab' && item.type === 'tab' && Number.isFinite(item.tabId)) {
      const tabsApi = globalThis.chrome?.tabs;
      if (tabsApi?.update && typeof item.tabId === 'number') {
        tabsApi.update(item.tabId, { active: true }, () => {});
      }
      const windowsApi = globalThis.chrome?.windows;
      if (windowsApi?.update && typeof item.windowId === 'number') {
        windowsApi.update(item.windowId, { focused: true }, () => {});
      }
      closeHistoryPanel('selection');
      return;
    }

    if (action.kind === 'open-target' && action.usageKey) {
      recordSuggestionUsage(action.usageKey);
      setSuggestionUsageVersion((prev) => prev + 1);
    }

    openSearchWithQuery(item.value);
    closeHistoryPanel('selection');
  }, [closeHistoryPanel, executeSlashCommand, openSearchWithQuery]);

  const activateSearchAction = useCallback((action: SearchAction) => {
    if (action.permission && !searchPermissions[action.permission]) {
      showSearchCommandPermissionDeniedToast(action.permission);
      return;
    }

    executeSearchAction(action);
  }, [executeSearchAction, searchPermissions, showSearchCommandPermissionDeniedToast]);

  const refreshSearchPermissionStatus = useCallback((permissions: SearchSuggestionPermission[] = SEARCH_PERMISSION_KEYS) => {
    void Promise.all(
      permissions.map((permission) => ensureExtensionPermission(permission, { requestIfNeeded: false })
        .then((granted) => ({ permission, granted }))
        .catch(() => ({ permission, granted: false }))),
    ).then((results) => {
      setSearchPermissions((prev) => {
        let changed = false;
        const next = { ...prev };
        results.forEach(({ permission, granted }) => {
          if (next[permission] !== granted) {
            next[permission] = granted;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      setSearchPermissionsReady(true);
    });
  }, []);

  useEffect(() => {
    refreshSearchPermissionStatus();
  }, [refreshSearchPermissionStatus]);

  useEffect(() => {
    const permissionsApi = globalThis.chrome?.permissions;
    if (!permissionsApi?.onAdded || !permissionsApi?.onRemoved) return;

    const handlePermissionsChanged = () => {
      refreshSearchPermissionStatus();
    };
    permissionsApi.onAdded.addListener(handlePermissionsChanged);
    permissionsApi.onRemoved.addListener(handlePermissionsChanged);
    return () => {
      permissionsApi.onAdded.removeListener(handlePermissionsChanged);
      permissionsApi.onRemoved.removeListener(handlePermissionsChanged);
    };
  }, [refreshSearchPermissionStatus]);

  useEffect(() => {
    const tabsApi = globalThis.chrome?.tabs;
    const windowsApi = globalThis.chrome?.windows;
    if (!tabsApi?.query) return;

    const syncCurrentBrowserTabId = () => {
      tabsApi.query({ active: true, currentWindow: true }, (tabs) => {
        if (globalThis.chrome?.runtime?.lastError) {
          setCurrentBrowserTabId(null);
          return;
        }
        const activeTabId = tabs?.find((tab) => Number.isFinite(tab.id))?.id;
        setCurrentBrowserTabId(Number.isFinite(activeTabId) ? Number(activeTabId) : null);
      });
    };

    syncCurrentBrowserTabId();
    tabsApi.onActivated?.addListener(syncCurrentBrowserTabId);
    windowsApi?.onFocusChanged?.addListener(syncCurrentBrowserTabId);
    return () => {
      tabsApi.onActivated?.removeListener(syncCurrentBrowserTabId);
      windowsApi?.onFocusChanged?.removeListener(syncCurrentBrowserTabId);
    };
  }, []);

  const runAfterSearchCommandPermission = useCallback((
    permission: 'bookmarks' | 'history' | 'tabs',
    onGranted: () => void,
  ) => {
    if (searchPermissions[permission]) {
      onGranted();
      return;
    }
    if (permissionRequestInFlight === permission) return;

    const chromeApi = (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome;
    const runtime = chromeApi?.runtime;
    const permissionsApi = chromeApi?.permissions;
    if (!runtime?.id || !permissionsApi?.request) {
      setSearchPermissionGranted(permission, true);
      onGranted();
      return;
    }

    setPermissionRequestInFlight(permission);
    permissionsApi.request({ permissions: [permission] }, (allowed: boolean) => {
      setPermissionRequestInFlight((current) => (current === permission ? null : current));
      const lastError = runtime.lastError;
      if (lastError) {
        toast.error(t('search.permissionRequestFailed', {
          defaultValue: '权限申请失败，请重试。',
        }));
        return;
      }
      if (!allowed) {
        setSearchPermissionGranted(permission, false);
        showSearchCommandPermissionDeniedToast(permission);
        return;
      }
      setSearchPermissionGranted(permission, true);
      setPermissionWarmup(permission);
      scheduleAfterInteractivePaint(() => {
        setPermissionWarmup((current) => (current === permission ? null : current));
        onGranted();
      });
    });
  }, [
    permissionRequestInFlight,
    scheduleAfterInteractivePaint,
    searchPermissions,
    setSearchPermissionGranted,
    showSearchCommandPermissionDeniedToast,
    t,
  ]);

  const handleSearchInputChange = useCallback((nextValue: string, nativeEvent?: Event) => {
    const matchedAlias = matchSearchCommandAliasInput(nextValue);
    const parsedCommand = parseSearchCommand(nextValue);
    const trimmedInput = nextValue.trimStart().toLowerCase();
    const commandId = (
      trimmedInput === '/bookmarks'
      || trimmedInput === '/tabs'
      || matchedAlias !== null
    ) ? (parsedCommand.id ?? matchedAlias) : null;

    if (commandId === 'bookmarks') {
      runAfterSearchCommandPermission('bookmarks', () => {});
    } else if (commandId === 'tabs') {
      runAfterSearchCommandPermission('tabs', () => {});
    }
    pointerHighlightLockUntilRef.current = 0;
    handleSearchChange(nextValue, nativeEvent);
    if (nextValue.length > 0) {
      openHistoryPanel({ select: 'none' });
      return;
    }
    closeHistoryPanel('manual');
  }, [closeHistoryPanel, handleSearchChange, openHistoryPanel, runAfterSearchCommandPermission]);

  const markSuggestionKeyboardNavigation = useCallback(() => {
    pointerHighlightLockUntilRef.current = Date.now() + POINTER_HIGHLIGHT_KEYBOARD_LOCK_MS;
  }, []);

  const handleSearchSubmit = useCallback(() => {
    const selectedAction = historySelectedIndex !== -1
      ? effectiveSearchActions[historySelectedIndex] ?? null
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
    effectiveSearchActions,
    handleSearch,
    historySelectedIndex,
    searchSessionModel,
    setSearchValue,
    t,
  ]);

  const {
    suggestionModifierHeld,
    handleSuggestionKeyDown,
  } = useSearchInteractionController({
    historyOpen,
    openHistoryPanel,
    closeHistoryPanel,
    setHistorySelectedIndex,
    searchActions: effectiveSearchActions,
    activateSearchAction,
    tabSwitchSearchEngine,
    enableSearchEngineSwitcher: ENABLE_SEARCH_ENGINE_SWITCHER,
    cycleSearchEngine,
    dropdownOpen,
    setDropdownOpen,
    searchAnyKeyCaptureEnabled,
    searchInputRef: inputRef,
    setSearchValue,
    onKeyboardNavigate: markSuggestionKeyboardNavigation,
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
      if (!historyOpen) return;
      const target = event.target;
      const targetNode = target as Node | null;
      if (searchAreaRef.current && (!targetNode || !searchAreaRef.current.contains(targetNode))) {
        captureSearchInputSelection();
        closeHistoryPanel('outside');
        const shouldRestoreFocus = !(target instanceof Element) || !isFocusProtectedElement(target);
        if (shouldRestoreFocus) {
          suppressNextInputFocusOpenRef.current = true;
          if (outsideDismissRefocusTimerRef.current !== null) {
            window.clearTimeout(outsideDismissRefocusTimerRef.current);
          }
          outsideDismissRefocusTimerRef.current = window.setTimeout(() => {
            outsideDismissRefocusTimerRef.current = null;
            focusSearchInputWithoutOpeningPanel();
            suppressNextInputFocusOpenRef.current = false;
          }, SEARCH_INPUT_FOCUS_LOCK_DELAY_MS);
        }
      }
    };
    document.addEventListener('mousedown', handleHistoryOutside);
    return () => document.removeEventListener('mousedown', handleHistoryOutside);
  }, [captureSearchInputSelection, closeHistoryPanel, focusSearchInputWithoutOpeningPanel, historyOpen]);

  useEffect(() => {
    if (!historyOpen) return;
    syncHistorySelectionByCount(effectiveSearchActions.length);
  }, [historyOpen, effectiveSearchActions.length, syncHistorySelectionByCount]);

  const handleSearchHistoryOpen = useCallback(() => {
    setDropdownOpen(false);
    pointerHighlightLockUntilRef.current = 0;
    openHistoryPanel({ select: 'none' });
    refreshSearchPermissionStatus();
  }, [openHistoryPanel, refreshSearchPermissionStatus, setDropdownOpen]);

  const handleSearchInputFocus = useCallback(() => {
    if (suppressNextInputFocusOpenRef.current) {
      suppressNextInputFocusOpenRef.current = false;
      return;
    }
    if (searchValue.length > 0) {
      handleSearchHistoryOpen();
    }
  }, [handleSearchHistoryOpen, searchValue.length]);

  const handleSearchSuggestionHighlight = useCallback((index: number) => {
    if (Date.now() < pointerHighlightLockUntilRef.current) return;
    setHistorySelectedIndex((prev) => (prev === index ? prev : index));
  }, [setHistorySelectedIndex]);

  const handleSearchHistoryClear = useCallback(() => {
    setSearchHistory([]);
    setHistorySelectedIndex(-1);
  }, [setSearchHistory, setHistorySelectedIndex]);

  const handleSearchClear = useCallback(() => {
    setSearchValue('');
    closeHistoryPanel('manual');
  }, [closeHistoryPanel, setSearchValue]);

  const rotatingPlaceholderItems = useMemo(() => {
    const items: string[] = [t('search.placeholderDynamic')];
    if (ENABLE_SEARCH_ENGINE_SWITCHER && tabSwitchSearchEngine) {
      items.push(t('search.placeholderHintTabSwitch'));
    }
    if (searchCalculatorEnabled) {
      items.push(t('search.placeholderHintCalculator'));
    }
    if (searchSiteDirectEnabled) {
      items.push(t('search.placeholderHintSiteDirect'));
    }
    if (searchPrefixEnabled) {
      items.push(t('search.placeholderHintPrefix'));
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
          onAction: () => runAfterSearchCommandPermission('bookmarks', () => {}),
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
          onAction: () => runAfterSearchCommandPermission('tabs', () => {}),
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
    if (searchPermissionsReady && !searchPermissions.history && searchSessionModel.mode === 'default') {
      return {
        tone: 'info' as const,
        message: t('search.historyPermissionBanner', {
          defaultValue: '授权后可显示浏览器历史记录',
        }),
        actionLabel: authorizationLabel,
        onAction: () => runAfterSearchCommandPermission('history', () => {}),
      };
    }
    return undefined;
  }, [
    permissionRequestInFlight,
    permissionWarmup,
    runAfterSearchCommandPermission,
    searchPermissions,
    searchPermissionsReady,
    searchSessionModel.mode,
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
        searchActions={effectiveSearchActions}
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
        showEngineSwitcher={ENABLE_SEARCH_ENGINE_SWITCHER}
        statusNotice={searchDropdownStatusNotice}
        emptyStateLabel={searchDropdownEmptyStateLabel}
        showSuggestionNumberHints={historyOpen && suggestionModifierHeld}
        currentBrowserTabId={currentBrowserTabId}
        allowSelectedSuggestionEnter={historyOpen && historySelectedIndex !== -1}
        suggestionsPlacement={suggestionsPlacement}
      />
    </RenderProfileBoundary>
  );
});
