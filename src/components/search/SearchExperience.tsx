import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type RefObject,
} from 'react';
import { useTranslation } from 'react-i18next';
import { SearchBar } from '@/components/SearchBar';
import { toast } from '@/components/ui/sonner';
import { ENABLE_SEARCH_ENGINE_SWITCHER } from '@/config/featureFlags';
import { useRotatingText } from '@/hooks/useRotatingText';
import { useSearch } from '@/hooks/useSearch';
import { useSearchInteractionController } from '@/hooks/useSearchInteractionController';
import { useSearchSuggestions } from '@/hooks/useSearchSuggestions';
import type { ScenarioShortcuts, SearchSuggestionItem } from '@/types';
import {
  buildShortcutUsageKey,
  readSuggestionUsageMap,
  recordSuggestionUsage,
} from '@/utils/suggestionPersonalization';
import { matchSearchCommandAliasInput, type SearchCommandPermission } from '@/utils/searchCommands';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';
import { createSearchQueryModel } from '@/utils/searchQueryModel';
import { scheduleAfterInteractivePaint } from '@/utils/mainThreadScheduler';

const POINTER_HIGHLIGHT_KEYBOARD_LOCK_MS = 140;
const SEARCH_PERMISSION_KEYS: SearchCommandPermission[] = ['bookmarks', 'history', 'tabs'];

export type SearchInteractionState = {
  historyOpen: boolean;
  dropdownOpen: boolean;
  typingBurst: boolean;
};

export interface SearchExperienceProps {
  inputRef: RefObject<HTMLInputElement | null>;
  openInNewTab: boolean;
  scenarioShortcuts: ScenarioShortcuts;
  tabSwitchSearchEngine: boolean;
  searchPrefixEnabled: boolean;
  searchSiteDirectEnabled: boolean;
  searchSiteShortcutEnabled: boolean;
  searchAnyKeyCaptureEnabled: boolean;
  searchCalculatorEnabled: boolean;
  disablePlaceholderAnimation: boolean;
  searchHeight: number;
  searchInputFontSize: number;
  searchHorizontalPadding: number;
  searchActionSize: number;
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  subtleDarkTone?: boolean;
  searchSurfaceStyle?: CSSProperties;
  onInteractionStateChange?: (state: SearchInteractionState) => void;
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
  scenarioShortcuts,
  tabSwitchSearchEngine,
  searchPrefixEnabled,
  searchSiteDirectEnabled,
  searchSiteShortcutEnabled,
  searchAnyKeyCaptureEnabled,
  searchCalculatorEnabled,
  disablePlaceholderAnimation,
  searchHeight,
  searchInputFontSize,
  searchHorizontalPadding,
  searchActionSize,
  blankMode,
  forceWhiteTheme,
  subtleDarkTone,
  searchSurfaceStyle,
  onInteractionStateChange,
}: SearchExperienceProps) {
  const { t, i18n } = useTranslation();
  const searchAreaRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const pointerHighlightLockUntilRef = useRef(0);
  const [currentBrowserTabId, setCurrentBrowserTabId] = useState<number | null>(null);
  const [suggestionUsageVersion, setSuggestionUsageVersion] = useState(0);
  const [searchPermissions, setSearchPermissions] = useState<Record<SearchCommandPermission, boolean>>(() => ({
    bookmarks: typeof chrome === 'undefined' || !chrome.runtime?.id,
    history: typeof chrome === 'undefined' || !chrome.runtime?.id,
    tabs: typeof chrome === 'undefined' || !chrome.runtime?.id,
  }));
  const [searchPermissionsReady, setSearchPermissionsReady] = useState<boolean>(() => (
    typeof chrome === 'undefined' || !chrome.runtime?.id
  ));
  const [permissionRequestInFlight, setPermissionRequestInFlight] = useState<SearchCommandPermission | null>(null);
  const [permissionWarmup, setPermissionWarmup] = useState<SearchCommandPermission | null>(null);

  const {
    searchValue,
    setSearchValue,
    searchHistory,
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
    handleEngineClick,
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
    onInteractionStateChange?.({
      historyOpen,
      dropdownOpen,
      typingBurst: isSearchTypingBurst,
    });
  }, [dropdownOpen, historyOpen, isSearchTypingBurst, onInteractionStateChange]);

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

  const suggestionUsageMap = useMemo(() => readSuggestionUsageMap(), [suggestionUsageVersion]);
  const searchQueryModel = useMemo(() => createSearchQueryModel(searchValue, {
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
    items: mergedSuggestionItems,
    sourceStatus: suggestionSourceStatus,
  } = useSearchSuggestions({
    searchValue,
    queryModel: searchQueryModel,
    filteredHistoryItems,
    scenarioShortcuts,
    searchSiteShortcutEnabled,
    suggestionUsageMap,
    historyPermissionGranted: searchPermissions.history,
    bookmarksPermissionGranted: searchPermissions.bookmarks,
    tabsPermissionGranted: searchPermissions.tabs,
    permissionWarmup,
  });

  const calculatorPreview = searchQueryModel.calculatorPreview;
  const calculatorInlinePreview = useMemo(() => {
    if (!calculatorPreview) return '';
    return `=${calculatorPreview.resultText}`;
  }, [calculatorPreview]);

  const siteDirectInlinePreview = useMemo(() => {
    if (searchQueryModel.command.active) return '';
    const { query, siteDomain, siteSearchUrl, siteLabel } = searchQueryModel.siteSearch;
    if (!query || !siteLabel) return '';
    if (!siteSearchUrl && !siteDomain) return '';
    const resolvedSiteLabel = siteLabel === 'YouTube' ? 'Youtube' : siteLabel;
    return t('search.siteDirectInlineHint', {
      site: resolvedSiteLabel,
      defaultValue: `在${resolvedSiteLabel}中搜索`,
    });
  }, [searchQueryModel.command.active, searchQueryModel.siteSearch, t]);

  const enginePrefixInlinePreview = useMemo(() => {
    if (searchQueryModel.command.active) return '';
    const { query, overrideEngine } = searchQueryModel.enginePrefix;
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
  }, [searchQueryModel.command.active, searchQueryModel.enginePrefix, t]);

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

  const setSearchPermissionGranted = useCallback((permission: SearchCommandPermission, granted: boolean) => {
    setSearchPermissions((prev) => {
      if (prev[permission] === granted) return prev;
      return {
        ...prev,
        [permission]: granted,
      };
    });
    setSearchPermissionsReady(true);
  }, []);

  const openSuggestionItem = useCallback((item: SearchSuggestionItem) => {
    if (item.type === 'tab' && Number.isFinite(item.tabId)) {
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

    if (item.type === 'shortcut') {
      const usageKey = buildShortcutUsageKey(item.value);
      if (usageKey) {
        recordSuggestionUsage(usageKey);
        setSuggestionUsageVersion((prev) => prev + 1);
      }
    }

    openSearchWithQuery(item.value);
    closeHistoryPanel('selection');
  }, [closeHistoryPanel, openSearchWithQuery]);

  const activateSuggestionItem = useCallback((item: SearchSuggestionItem) => {
    if (item.type === 'tab') {
      if (!searchPermissions.tabs) {
        showSearchCommandPermissionDeniedToast('tabs');
        return;
      }
      openSuggestionItem(item);
      return;
    }

    if (item.type === 'bookmark') {
      if (!searchPermissions.bookmarks) {
        showSearchCommandPermissionDeniedToast('bookmarks');
        return;
      }
      openSuggestionItem(item);
      return;
    }

    openSuggestionItem(item);
  }, [openSuggestionItem, searchPermissions.bookmarks, searchPermissions.tabs, showSearchCommandPermissionDeniedToast]);

  const refreshSearchPermissionStatus = useCallback((permissions: SearchCommandPermission[] = SEARCH_PERMISSION_KEYS) => {
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

  const handleSearchInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    const matchedAlias = matchSearchCommandAliasInput(nextValue);
    if (matchedAlias === 'bookmarks') {
      runAfterSearchCommandPermission('bookmarks', () => {});
    } else if (matchedAlias === 'tabs') {
      runAfterSearchCommandPermission('tabs', () => {});
    }
    pointerHighlightLockUntilRef.current = 0;
    handleSearchChange(event);
    if (nextValue.length > 0) {
      openHistoryPanel({ select: 'none' });
      return;
    }
    closeHistoryPanel('manual');
  }, [closeHistoryPanel, handleSearchChange, openHistoryPanel, runAfterSearchCommandPermission]);

  const markSuggestionKeyboardNavigation = useCallback(() => {
    pointerHighlightLockUntilRef.current = Date.now() + POINTER_HIGHLIGHT_KEYBOARD_LOCK_MS;
  }, []);

  const notifyCurrentTabProtected = useCallback(() => {
    toast.error(t('search.tabCloseCurrentBlocked', {
      defaultValue: '当前标签页不能在这里关闭',
    }));
  }, [t]);

  const closeSelectedTabSuggestion = useCallback((item: SearchSuggestionItem) => {
    if (item.type !== 'tab' || !Number.isFinite(item.tabId)) return;
    if (item.tabId === currentBrowserTabId) {
      notifyCurrentTabProtected();
      return;
    }
    const tabsApi = globalThis.chrome?.tabs;
    if (!tabsApi?.remove) return;

    tabsApi.remove(item.tabId, () => {
      if (globalThis.chrome?.runtime?.lastError) {
        toast.error(t('search.tabCloseFailed', { defaultValue: '关闭标签页失败，请重试' }));
        return;
      }
      toast.success(t('search.tabClosed', { defaultValue: '已关闭标签页' }));
    });
  }, [currentBrowserTabId, notifyCurrentTabProtected, t]);

  const closeOtherTabsSuggestions = useCallback((item: SearchSuggestionItem) => {
    if (item.type !== 'tab' || !Number.isFinite(item.tabId)) return;
    const tabsApi = globalThis.chrome?.tabs;
    if (!tabsApi?.query || !tabsApi.remove) return;

    tabsApi.query({}, (tabs) => {
      if (globalThis.chrome?.runtime?.lastError) {
        toast.error(t('search.tabCloseFailed', { defaultValue: '关闭标签页失败，请重试' }));
        return;
      }

      const otherTabIds = (tabs || [])
        .map((tab) => tab.id)
        .filter((tabId): tabId is number => (
          Number.isFinite(tabId) &&
          tabId !== item.tabId &&
          tabId !== currentBrowserTabId
        ));
      if (otherTabIds.length === 0) return;

      tabsApi.remove(otherTabIds, () => {
        if (globalThis.chrome?.runtime?.lastError) {
          toast.error(t('search.tabCloseFailed', { defaultValue: '关闭标签页失败，请重试' }));
          return;
        }
        toast.success(t('search.tabsClosed', {
          count: otherTabIds.length,
          defaultValue: '已关闭 {{count}} 个标签页',
        }));
      });
    });
  }, [currentBrowserTabId, t]);

  const handleSearchSubmit = useCallback(() => {
    if (calculatorPreview) {
      const resultText = String(calculatorPreview.resultText ?? '').trim();
      if (resultText) {
        void copyTextToClipboard(resultText)
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

    if (searchQueryModel.command.id === 'tabs') {
      const selectedItem = historySelectedIndex !== -1 ? mergedSuggestionItems[historySelectedIndex] : null;
      if (!selectedItem || selectedItem.type !== 'tab') return;
      activateSuggestionItem(selectedItem);
      return;
    }

    if (searchQueryModel.command.id === 'bookmarks') {
      const selectedItem = historySelectedIndex !== -1 ? mergedSuggestionItems[historySelectedIndex] : null;
      if (!selectedItem || selectedItem.type !== 'bookmark') return;
      activateSuggestionItem(selectedItem);
      return;
    }

    handleSearch();
  }, [
    activateSuggestionItem,
    calculatorPreview,
    handleSearch,
    historySelectedIndex,
    mergedSuggestionItems,
    searchQueryModel.command.id,
    closeHistoryPanel,
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
    historySelectedIndex,
    setHistorySelectedIndex,
    mergedSuggestionItems,
    activateSuggestionItem,
    tabSwitchSearchEngine,
    enableSearchEngineSwitcher: ENABLE_SEARCH_ENGINE_SWITCHER,
    cycleSearchEngine,
    dropdownOpen,
    setDropdownOpen,
    searchAnyKeyCaptureEnabled,
    searchInputRef: inputRef,
    setSearchValue,
    onKeyboardNavigate: markSuggestionKeyboardNavigation,
    tabsPanelActive: searchQueryModel.command.id === 'tabs',
    protectedTabId: currentBrowserTabId,
    onProtectedTabCloseAttempt: notifyCurrentTabProtected,
    closeSelectedTabSuggestion,
    closeOtherTabsSuggestions,
  });

  useEffect(() => {
    const handleHistoryOutside = (event: MouseEvent) => {
      if (!historyOpen) return;
      const target = event.target as Node;
      if (searchAreaRef.current && !searchAreaRef.current.contains(target)) {
        closeHistoryPanel('outside');
      }
    };
    document.addEventListener('mousedown', handleHistoryOutside);
    return () => document.removeEventListener('mousedown', handleHistoryOutside);
  }, [closeHistoryPanel, historyOpen]);

  useEffect(() => {
    const handleEngineOutside = (event: PointerEvent) => {
      if (!dropdownOpen) return;
      const root = searchDropdownRef.current;
      if (!root) {
        setDropdownOpen(false);
        return;
      }
      const target = event.target as Node | null;
      const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
      const clickedInside = (target ? root.contains(target) : false) || path.includes(root);
      if (!clickedInside) setDropdownOpen(false);
    };

    window.addEventListener('pointerdown', handleEngineOutside, true);
    return () => window.removeEventListener('pointerdown', handleEngineOutside, true);
  }, [dropdownOpen, setDropdownOpen]);

  useEffect(() => {
    if (!historyOpen) return;
    syncHistorySelectionByCount(mergedSuggestionItems.length);
  }, [historyOpen, mergedSuggestionItems.length, syncHistorySelectionByCount]);

  const handleSearchHistoryOpen = useCallback(() => {
    setDropdownOpen(false);
    pointerHighlightLockUntilRef.current = 0;
    openHistoryPanel({ select: 'none' });
    refreshSearchPermissionStatus();
  }, [openHistoryPanel, refreshSearchPermissionStatus, setDropdownOpen]);

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

  const rotatingSearchPlaceholder = useRotatingText(rotatingPlaceholderItems, 3000);

  const searchDropdownStatusNotice = useMemo(() => {
    const authorizationLabel = t('search.authorizeHistoryPermission', { defaultValue: '去授权' });

    if (searchQueryModel.command.id === 'bookmarks') {
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

    if (searchQueryModel.command.id === 'tabs') {
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
    if (searchPermissionsReady && !searchPermissions.history && !searchQueryModel.command.active) {
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
    searchQueryModel.command.active,
    searchQueryModel.command.id,
    suggestionSourceStatus.bookmarkLoading,
    suggestionSourceStatus.browserHistoryLoading,
    suggestionSourceStatus.tabLoading,
    t,
  ]);

  const searchDropdownEmptyStateLabel = useMemo(() => {
    if (searchQueryModel.command.id === 'bookmarks') {
      return t('search.noBookmarks', { defaultValue: '没有找到匹配的书签' });
    }
    if (searchQueryModel.command.id === 'tabs') {
      return t('search.noTabs', { defaultValue: '没有找到匹配的标签页' });
    }
    return t('search.noHistory');
  }, [searchQueryModel.command.id, t]);

  return (
    <SearchBar
      value={searchValue}
      onChange={handleSearchInputChange}
      onSubmit={handleSearchSubmit}
      searchEngine={searchEngine}
      onEngineClick={handleEngineClick}
      dropdownOpen={dropdownOpen}
      onEngineSelect={handleEngineSelect}
      dropdownRef={searchDropdownRef}
      suggestionItems={mergedSuggestionItems}
      historyOpen={historyOpen}
      onHistoryOpen={handleSearchHistoryOpen}
      onSuggestionSelect={activateSuggestionItem}
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
      disablePlaceholderAnimation={disablePlaceholderAnimation}
      searchHeight={searchHeight}
      searchInputFontSize={searchInputFontSize}
      searchHorizontalPadding={searchHorizontalPadding}
      searchActionSize={searchActionSize}
      showEngineSwitcher={ENABLE_SEARCH_ENGINE_SWITCHER}
      statusNotice={searchDropdownStatusNotice}
      emptyStateLabel={searchDropdownEmptyStateLabel}
      showSuggestionNumberHints={historyOpen && suggestionModifierHeld}
      tabsPanelActive={searchQueryModel.command.id === 'tabs'}
      currentBrowserTabId={currentBrowserTabId}
    />
  );
});
