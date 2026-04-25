import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RiAddLine,
  RiArrowRightSLine,
  RiBookOpenFill,
  RiCheckboxCircleFill,
  RiCloseLine,
  RiCloudFill,
  RiComputerFill,
  RiCornerDownLeftLine,
  RiDashboardFill,
  RiDeleteBinLine,
  RiEyeFill,
  RiEyeOffFill,
  RiFileCopyLine,
  RiHistoryFill,
  RiImageFill,
  RiInformationFill,
  RiLinkM,
  RiMoonFill,
  RiPaletteFill,
  RiPencilFill,
  RiPushpinLine,
  RiQuestionLine,
  RiRefreshFill,
  RiSearchLine,
  RiSettings4Fill,
  RiSunFill,
  RiUnpinLine,
} from '@/icons/ri-compat';
import { ScrollArea } from '@/components/ui/scroll-area';
import { extractDomainFromUrl, isUrl } from '@/utils';
import { parseSiteSearchShortcut } from '@/utils/siteSearch';
import { useStableElementState } from '@/hooks/useStableElementState';
import {
  SEARCH_ENGINE_BRAND_NAMES,
} from '@/components/search/searchEngineSwitcher.shared';
import { MaterialSurfaceFrame } from '@/components/frosted/MaterialSurfaceFrame';
import type { SearchSuggestionsPanelProps } from '@/components/search/SearchSuggestionsPanel.shared';
import type { SearchAction, SearchSecondaryAction } from '@/utils/searchActions';

type SuggestionGroupMeta = {
  key: string;
  label: string;
};

type SuggestionVisualRow =
  | {
    kind: 'header';
    key: string;
    label: string;
  }
  | ({
    kind: 'item';
    groupKey: string;
  } & ReturnType<typeof buildSuggestionRowViewModel>);

const FIREFOX_PANEL_TRANSITION_MS = 170;
const SUGGESTION_ITEM_ROW_HEIGHT_PX = 32;
const SUGGESTION_HEADER_ROW_HEIGHT_PX = 16;
const SUGGESTION_ROW_GAP_PX = 2;
const MAX_VISIBLE_VISUAL_ROWS = 11;

function resolveSearchActionDisplayIcon(action: SearchAction, secondaryTextClass: string) {
  if (!action.displayIcon) return null;
  if (action.displayIcon === 'bookmarks') return <RiBookOpenFill className={`size-3.5 ${secondaryTextClass}`} />;
  if (action.displayIcon === 'history') return <RiHistoryFill className={`size-3.5 ${secondaryTextClass}`} />;
  if (action.displayIcon === 'tabs') return <RiDashboardFill className={`size-3.5 ${secondaryTextClass}`} />;
  if (action.displayIcon === 'search-settings') return <RiSearchLine className={`size-3.5 ${secondaryTextClass}`} />;
  if (action.displayIcon === 'theme-mode') return <RiPaletteFill className={`size-3.5 ${secondaryTextClass}`} />;
  if (action.displayIcon === 'shortcut-guide') return <RiQuestionLine className={`size-3.5 ${secondaryTextClass}`} />;
  if (action.displayIcon === 'shortcut-icon-settings') return <RiPaletteFill className={`size-3.5 ${secondaryTextClass}`} />;
  if (action.displayIcon === 'wallpaper-settings') return <RiImageFill className={`size-3.5 ${secondaryTextClass}`} />;
  if (action.displayIcon === 'sync-center') return <RiCloudFill className={`size-3.5 ${secondaryTextClass}`} />;
  if (action.displayIcon === 'about') return <RiInformationFill className={`size-3.5 ${secondaryTextClass}`} />;
  return <RiSettings4Fill className={`size-3.5 ${secondaryTextClass}`} />;
}

function resolveSearchActionPersonalizationTitle(
  action: SearchAction,
  t: ReturnType<typeof useTranslation>['t'],
): string {
  const reasons = action.reasons || [];
  const labels: string[] = [];

  if (reasons.includes('personalization:query-target-affinity')) {
    labels.push(t('search.personalization.queryTargetAffinity', {
      defaultValue: '你经常用这个关键词打开它',
    }));
  } else if (reasons.includes('personalization:target-affinity')) {
    labels.push(t('search.personalization.targetAffinity', {
      defaultValue: '你最近常打开这个结果',
    }));
  }

  if (reasons.includes('personalization:query-source-affinity')) {
    labels.push(t('search.personalization.querySourceAffinity', {
      defaultValue: '你常从这个来源选择结果',
    }));
  }

  if (reasons.includes('personalization:domain-source-affinity')) {
    labels.push(t('search.personalization.domainSourceAffinity', {
      defaultValue: '你常从同类站点里选结果',
    }));
  }

  if (reasons.includes('personalization:action-affinity')) {
    labels.push(t('search.personalization.actionAffinity', {
      defaultValue: '你常对这类结果执行类似动作',
    }));
  }

  if (reasons.includes('personalization:query-target-avoidance')) {
    labels.push(t('search.personalization.queryTargetAvoidance', {
      defaultValue: '这个关键词下你最近更少选择它',
    }));
  } else if (reasons.includes('personalization:target-avoidance')) {
    labels.push(t('search.personalization.targetAvoidance', {
      defaultValue: '你最近更少选择这个结果',
    }));
  }

  return labels.length > 0
    ? t('search.personalization.title', {
        summary: labels.join(' · '),
        defaultValue: `排序依据：${labels.join(' · ')}`,
      })
    : '';
}

function buildSuggestionRowViewModel(args: {
  action: SearchAction;
  index: number;
  currentBrowserTabId: number | null;
  t: SearchSuggestionsPanelProps['currentBrowserTabId'] extends never ? never : ReturnType<typeof useTranslation>['t'];
  historySiteDirectDomainMap: Map<string, string>;
}) {
  const {
    action,
    index,
    currentBrowserTabId,
    t,
    historySiteDirectDomainMap,
  } = args;
  const { item } = action;
  const shortcutDomain = item.type === 'shortcut' || item.type === 'bookmark' || item.type === 'tab'
    ? extractDomainFromUrl(item.value)
    : '';
  const isCurrentTab = item.type === 'tab' && item.tabId === currentBrowserTabId;
  const remoteProviderLabel = item.type === 'remote'
    ? t('search.remoteSuggestionSource', { defaultValue: '搜尋建議' })
    : '';
  const recentClosedLabel = item.type === 'history' && item.historySource === 'session'
    ? t('search.recentlyClosedSource', { defaultValue: '最近關閉' })
    : '';

  return {
    action,
    item,
    index,
    isCurrentTab,
    shortcutDomain,
    detailLabel: item.detail?.trim() || '',
    showShortcutDomain: !isCurrentTab && Boolean(shortcutDomain) && shortcutDomain !== item.label,
    secondaryLabel: isCurrentTab
      ? t('search.currentTabLabel', { defaultValue: '当前标签页' })
      : recentClosedLabel || remoteProviderLabel,
    siteDirectDomain: item.type === 'history' ? (historySiteDirectDomainMap.get(item.value) || '') : '',
  };
}

function resolveSuggestionGroupMeta(args: {
  action: SearchAction;
  currentBrowserTabId: number | null;
  t: ReturnType<typeof useTranslation>['t'];
}): SuggestionGroupMeta {
  const { action, currentBrowserTabId, t } = args;
  const { item } = action;

  if (action.displayIcon === 'search-settings') {
    return {
      key: 'settings',
      label: t('search.group.settings', { defaultValue: '设置' }),
    };
  }

  if (
    action.displayIcon === 'theme-mode'
    || action.displayIcon === 'shortcut-guide'
    || action.displayIcon === 'shortcut-icon-settings'
    || action.displayIcon === 'wallpaper-settings'
    || action.displayIcon === 'sync-center'
    || action.displayIcon === 'about'
  ) {
    return {
      key: 'settings',
      label: t('search.group.settings', { defaultValue: '设置' }),
    };
  }

  if (item.type === 'tab') {
    const isCurrentTab = item.tabId === currentBrowserTabId;
    return isCurrentTab
      ? {
          key: 'current-tab',
          label: t('search.currentTabLabel', { defaultValue: '当前标签页' }),
        }
      : {
          key: 'tabs',
          label: t('search.group.tabs', { defaultValue: '标签页' }),
        };
  }

  if (item.type === 'shortcut') {
    return {
      key: 'shortcuts',
      label: t('search.group.shortcuts', { defaultValue: '快捷方式' }),
    };
  }

  if (item.type === 'bookmark') {
    return {
      key: 'bookmarks',
      label: t('search.group.bookmarks', { defaultValue: '书签' }),
    };
  }

  if (item.type === 'remote' || item.type === 'engine-prefix') {
    return {
      key: 'remote',
      label: t('search.remoteSuggestionSource', { defaultValue: '搜尋建議' }),
    };
  }

  if (item.type === 'history') {
    if (item.historySource === 'session') {
      return {
        key: 'recently-closed',
        label: t('search.group.recentlyClosed', { defaultValue: '最近关闭' }),
      };
    }
    return item.historySource === 'local'
      ? {
          key: 'local-history',
          label: t('search.group.continueSearch', { defaultValue: '继续搜索' }),
        }
      : {
          key: 'browser-history',
          label: t('search.group.recentVisits', { defaultValue: '最近访问' }),
        };
  }

  return {
    key: item.type,
    label: t('search.group.results', { defaultValue: '结果' }),
  };
}

export function SearchSuggestionsPanel({
  items,
  isOpen,
  onSelect,
  onClear,
  onHighlight,
  selectedIndex = -1,
  theme,
  statusNotice,
  showNumberHints = false,
  currentBrowserTabId = null,
  emptyStateLabel,
  placement = 'bottom',
  surfaceTone = 'default',
  actionModeActive = false,
  selectedSecondaryActionIndex = 0,
  pendingConfirmationActionKey = null,
  onSecondaryActionSelect,
}: SearchSuggestionsPanelProps) {
  const { t, i18n } = useTranslation();
  const [surfaceNode, handleSurfaceNodeRef] = useStableElementState<HTMLDivElement>();
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const [shouldRenderPanel, setShouldRenderPanel] = useState(isOpen);
  const hideScrollbarTimerRef = useRef<number | null>(null);
  const closePanelTimerRef = useRef<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const relativeTimeFormatter = useMemo(
    () => new Intl.RelativeTimeFormat(i18n.language || undefined, { numeric: 'auto' }),
    [i18n.language],
  );
  const hasLocalHistoryRows = useMemo(
    () => items.some(({ item }) => item.type === 'history' && item.historySource === 'local'),
    [items],
  );
  const historySiteDirectDomainMap = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(({ item }) => {
      if (item.type !== 'history') return;
      const { siteDomain } = parseSiteSearchShortcut(item.value);
      map.set(item.value, siteDomain || '');
    });
    return map;
  }, [items]);
  const derivedSuggestionRows = useMemo(() => items.map((action, index) => buildSuggestionRowViewModel({
    action,
    index,
    currentBrowserTabId,
    t,
    historySiteDirectDomainMap,
  })), [currentBrowserTabId, historySiteDirectDomainMap, items, t]);
  const suggestionGroupCount = useMemo(() => {
    const groupKeys = new Set(
      items.map((action) => resolveSuggestionGroupMeta({
        action,
        currentBrowserTabId,
        t,
      }).key),
    );
    return groupKeys.size;
  }, [currentBrowserTabId, items, t]);
  const visualRows = useMemo<SuggestionVisualRow[]>(() => {
    if (derivedSuggestionRows.length === 0) return [];

    const shouldShowHeaders = suggestionGroupCount > 1;
    const rows: SuggestionVisualRow[] = [];
    let previousGroupKey: string | null = null;

    derivedSuggestionRows.forEach((row) => {
      const group = resolveSuggestionGroupMeta({
        action: row.action,
        currentBrowserTabId,
        t,
      });

      if (shouldShowHeaders && group.key !== previousGroupKey) {
        rows.push({
          kind: 'header',
          key: `group:${group.key}:${row.action.id}`,
          label: group.label,
        });
      }

      rows.push({
        kind: 'item',
        groupKey: group.key,
        ...row,
      });
      previousGroupKey = group.key;
    });

    return rows;
  }, [currentBrowserTabId, derivedSuggestionRows, suggestionGroupCount, t]);

  const visualRowCount = visualRows.length;
  const canScroll = visualRowCount > MAX_VISIBLE_VISUAL_ROWS;
  const visibleRows = visualRows.slice(0, MAX_VISIBLE_VISUAL_ROWS);
  const listHeight = visibleRows.length > 0
    ? visibleRows.reduce((total, row) => (
      total + (row.kind === 'header' ? SUGGESTION_HEADER_ROW_HEIGHT_PX : SUGGESTION_ITEM_ROW_HEIGHT_PX)
    ), 0) + Math.max(0, visibleRows.length - 1) * SUGGESTION_ROW_GAP_PX
    : 0;

  useEffect(() => {
    if (isOpen && selectedIndex !== -1 && scrollAreaRef.current) {
      const selectedElement = scrollAreaRef.current.querySelector('[data-selected="true"]');
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isOpen]);

  useEffect(() => {
    return () => {
      if (hideScrollbarTimerRef.current !== null) {
        window.clearTimeout(hideScrollbarTimerRef.current);
      }
      if (closePanelTimerRef.current !== null) {
        window.clearTimeout(closePanelTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (closePanelTimerRef.current !== null) {
      window.clearTimeout(closePanelTimerRef.current);
      closePanelTimerRef.current = null;
    }

    if (isOpen) {
      setShouldRenderPanel(true);
      return;
    }

    closePanelTimerRef.current = window.setTimeout(() => {
      setShouldRenderPanel(false);
      closePanelTimerRef.current = null;
    }, FIREFOX_PANEL_TRANSITION_MS);
  }, [isOpen]);

  if (!shouldRenderPanel) return null;

  const rowClass = (index: number) => `w-full max-w-full min-w-0 text-left px-1 h-[32px] flex items-center text-[14px] rounded-[10px] transition-[background-color,color] overflow-visible ${theme.dropdownRowClassName} ${index === selectedIndex ? theme.dropdownRowSelectedClassName : ''}`;
  const secondaryTextClass = theme.dropdownSecondaryTextClassName;
  const firefoxPanelStyle = {
    opacity: isOpen ? 1 : 0,
    transform: isOpen
      ? 'translate3d(0, 0, 0)'
      : `translate3d(0, ${placement === 'top' ? '-8px' : '8px'}, 0)`,
    transition: `opacity ${FIREFOX_PANEL_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${FIREFOX_PANEL_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
    pointerEvents: isOpen ? 'auto' : 'none',
    visibility: isOpen ? 'visible' : 'hidden',
    contain: 'layout paint style',
    contentVisibility: isOpen ? 'auto' : 'hidden',
    willChange: 'opacity, transform',
  } as CSSProperties;
  const firefoxListStyle = {
    contain: 'layout paint style',
    contentVisibility: isOpen ? 'auto' : 'hidden',
  } as CSSProperties;
  const enterKeyLabel = t('search.enterKey', { defaultValue: 'Enter' });
  const selectedActionHasSecondaryActions = selectedIndex !== -1
    && ((items[selectedIndex]?.secondaryActions.length ?? 0) > 0);
  const enterHint = (
    <span className="ml-2 inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-current opacity-70">
      <RiCornerDownLeftLine className="size-3.5 shrink-0" />
      <span>{enterKeyLabel}</span>
    </span>
  );
  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp || !Number.isFinite(timestamp) || timestamp <= 0) return '';
    const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
    const absSeconds = Math.abs(diffSeconds);
    if (absSeconds < 60) return t('search.justNow', { defaultValue: '刚刚' });
    if (absSeconds < 3600) return relativeTimeFormatter.format(Math.round(diffSeconds / 60), 'minute');
    if (absSeconds < 86_400) return relativeTimeFormatter.format(Math.round(diffSeconds / 3600), 'hour');
    if (absSeconds < 2_592_000) return relativeTimeFormatter.format(Math.round(diffSeconds / 86_400), 'day');
    return relativeTimeFormatter.format(Math.round(diffSeconds / 2_592_000), 'month');
  };
  const showScrollbar = () => {
    if (!canScroll) return;
    setScrollbarVisible(true);
    if (hideScrollbarTimerRef.current !== null) {
      window.clearTimeout(hideScrollbarTimerRef.current);
    }
    hideScrollbarTimerRef.current = window.setTimeout(() => {
      setScrollbarVisible(false);
    }, 700);
  };
  const getSecondaryActionKey = (actionId: string, secondaryActionIndex: number) => `${actionId}:${secondaryActionIndex}`;

  const renderSuggestionRow = ({
    action,
    item,
    index,
    shortcutDomain,
    detailLabel,
    secondaryLabel,
    showShortcutDomain,
    siteDirectDomain,
  }: {
    action: SearchAction;
    item: SearchAction['item'];
    index: number;
    shortcutDomain: string;
    detailLabel: string;
    secondaryLabel: string;
    showShortcutDomain: boolean;
    siteDirectDomain: string;
  }) => {
    const isSelected = index === selectedIndex;
    const customActionIcon = resolveSearchActionDisplayIcon(action, secondaryTextClass);
    const personalizationTitle = resolveSearchActionPersonalizationTitle(action, t);
    const secondaryActions = action.secondaryActions;
    const showSecondaryActions = isSelected && secondaryActions.length > 0;
    const numberHintBadge = (
      <span
        aria-hidden={!showNumberHints}
        className={`inline-flex shrink-0 overflow-hidden transition-[max-width,margin] duration-300 ease-out ${
          showNumberHints ? 'max-w-8 mr-1' : 'max-w-0 mr-0'
        }`}
      >
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-current/12 px-1.5 text-[11px] font-medium text-current transition-[opacity,transform] duration-300 ease-out origin-left ${
            showNumberHints ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
          }`}
        >
          {String(index + 1)}
        </span>
      </span>
    );

    if (item.type === 'engine-prefix' && item.engine && item.engine !== 'system') {
      const engineName = SEARCH_ENGINE_BRAND_NAMES[item.engine];
      const hintText = t('search.useEngineSearch', {
        engine: engineName,
        defaultValue: '使用{{engine}} 搜索',
      });
      return (
        <button
          key={action.id}
          type="button"
          data-selected={index === selectedIndex}
          className={rowClass(index)}
          title={personalizationTitle || undefined}
          onMouseMove={() => {
            if (index === selectedIndex) return;
            onHighlight?.(index);
          }}
          onClick={() => onSelect(action)}
        >
          <span className="relative mr-2 flex shrink-0 items-center justify-center" style={{ width: 24, height: 24 }}>
            <RiSearchLine className={`size-3.5 ${secondaryTextClass}`} />
          </span>
          {numberHintBadge}
          <span className="min-w-0 flex-1 truncate">{hintText}</span>
          {isSelected ? enterHint : <RiArrowRightSLine className={`ml-2 size-4 shrink-0 ${secondaryTextClass}`} />}
        </button>
      );
    }

    const historyTimeText = item.type === 'history' ? formatRelativeTime(item.timestamp) : '';
    const resolveSecondaryActionLabel = (secondaryAction: SearchSecondaryAction) => {
      if (secondaryAction.kind === 'add-shortcut') {
        return t('search.secondaryAction.addShortcut', { defaultValue: '添加为快捷方式' });
      }
      if (secondaryAction.kind === 'close-tab') {
        return t('search.secondaryAction.closeTab', { defaultValue: '关闭标签页' });
      }
      if (secondaryAction.kind === 'remove-bookmark') {
        return t('search.secondaryAction.removeBookmark', { defaultValue: '删除书签' });
      }
      if (secondaryAction.kind === 'edit-shortcut') {
        return t('search.secondaryAction.editShortcut', { defaultValue: '编辑快捷方式' });
      }
      if (secondaryAction.kind === 'delete-shortcut') {
        return t('search.secondaryAction.deleteShortcut', { defaultValue: '删除快捷方式' });
      }
      if (secondaryAction.kind === 'set-theme-mode') {
        if (secondaryAction.targetMode === 'system') {
          return t('search.secondaryAction.themeSystem', { defaultValue: '跟随系统主题' });
        }
        if (secondaryAction.targetMode === 'light') {
          return t('search.secondaryAction.themeLight', { defaultValue: '切换到浅色模式' });
        }
        return t('search.secondaryAction.themeDark', { defaultValue: '切换到深色模式' });
      }
      if (secondaryAction.kind === 'cycle-search-engine') {
        return t('search.secondaryAction.cycleSearchEngine', { defaultValue: '切换搜索引擎' });
      }
      if (secondaryAction.kind === 'toggle-show-time') {
        return secondaryAction.active
          ? t('search.secondaryAction.hideTime', { defaultValue: '隐藏时间' })
          : t('search.secondaryAction.showTime', { defaultValue: '显示时间' });
      }
      if (secondaryAction.kind === 'set-wallpaper-mode') {
        if (secondaryAction.targetMode === 'bing') {
          return t('search.secondaryAction.wallpaperBing', { defaultValue: '切换到必应壁纸' });
        }
        if (secondaryAction.targetMode === 'weather') {
          return t('search.secondaryAction.wallpaperWeather', { defaultValue: '切换到天气壁纸' });
        }
        if (secondaryAction.targetMode === 'color') {
          return t('search.secondaryAction.wallpaperColor', { defaultValue: '切换到纯色壁纸' });
        }
        return t('search.secondaryAction.wallpaperCustom', { defaultValue: '切换到自定义壁纸' });
      }
      if (secondaryAction.kind === 'set-shortcut-icon-appearance') {
        if (secondaryAction.targetAppearance === 'colorful') {
          return t('search.secondaryAction.shortcutIconColorful', { defaultValue: '切换到彩色图标' });
        }
        if (secondaryAction.targetAppearance === 'monochrome') {
          return t('search.secondaryAction.shortcutIconMonochrome', { defaultValue: '切换到单色图标' });
        }
        return t('search.secondaryAction.shortcutIconAccent', { defaultValue: '切换到强调色图标' });
      }
      if (secondaryAction.kind === 'toggle-pin-tab') {
        return secondaryAction.active
          ? t('search.secondaryAction.unpinTab', { defaultValue: '取消固定' })
          : t('search.secondaryAction.pinTab', { defaultValue: '固定标签页' });
      }
      return t('search.secondaryAction.copyLink', { defaultValue: '复制链接' });
    };
    const resolveSecondaryActionTooltip = (secondaryAction: SearchSecondaryAction, isPendingConfirmation: boolean) => {
      if (secondaryAction.kind === 'remove-bookmark' && isPendingConfirmation) {
        return t('search.secondaryAction.confirmRemoveBookmark', { defaultValue: '再次确认删除书签' });
      }
      return resolveSecondaryActionLabel(secondaryAction);
    };
    const renderSecondaryActionIcon = (secondaryAction: SearchSecondaryAction) => {
      if (secondaryAction.kind === 'add-shortcut') {
        return <RiAddLine className="size-3.5" />;
      }
      if (secondaryAction.kind === 'close-tab') {
        return <RiCloseLine className="size-3.5" />;
      }
      if (secondaryAction.kind === 'remove-bookmark') {
        return <RiDeleteBinLine className="size-3.5" />;
      }
      if (secondaryAction.kind === 'edit-shortcut') {
        return <RiPencilFill className="size-3.5" />;
      }
      if (secondaryAction.kind === 'delete-shortcut') {
        return <RiDeleteBinLine className="size-3.5" />;
      }
      if (secondaryAction.kind === 'set-theme-mode') {
        if (secondaryAction.targetMode === 'system') {
          return <RiComputerFill className="size-3.5" />;
        }
        return secondaryAction.targetMode === 'light'
          ? <RiSunFill className="size-3.5" />
          : <RiMoonFill className="size-3.5" />;
      }
      if (secondaryAction.kind === 'cycle-search-engine') {
        return <RiRefreshFill className="size-3.5" />;
      }
      if (secondaryAction.kind === 'set-wallpaper-mode') {
        if (secondaryAction.targetMode === 'weather') {
          return <RiCloudFill className="size-3.5" />;
        }
        if (secondaryAction.targetMode === 'color') {
          return <RiPaletteFill className="size-3.5" />;
        }
        if (secondaryAction.targetMode === 'custom') {
          return <RiAddLine className="size-3.5" />;
        }
        return <RiImageFill className="size-3.5" />;
      }
      if (secondaryAction.kind === 'set-shortcut-icon-appearance') {
        if (secondaryAction.targetAppearance === 'colorful') {
          return <RiPaletteFill className="size-3.5" />;
        }
        if (secondaryAction.targetAppearance === 'monochrome') {
          return <RiCheckboxCircleFill className="size-3.5" />;
        }
        return <RiSunFill className="size-3.5" />;
      }
      if (secondaryAction.kind === 'toggle-show-time') {
        return secondaryAction.active
          ? <RiEyeOffFill className="size-3.5" />
          : <RiEyeFill className="size-3.5" />;
      }
      if (secondaryAction.kind === 'toggle-pin-tab') {
        return secondaryAction.active
          ? <RiUnpinLine className="size-3.5" />
          : <RiPushpinLine className="size-3.5" />;
      }
      return <RiFileCopyLine className="size-3.5" />;
    };
    return (
      <button
        key={action.id}
        type="button"
        data-selected={index === selectedIndex}
        className={rowClass(index)}
        title={personalizationTitle || undefined}
        onMouseMove={() => {
          if (index === selectedIndex) return;
          onHighlight?.(index);
        }}
        onClick={() => onSelect(action)}
      >
        <span className="relative mr-2 flex shrink-0 items-center justify-center" style={{ width: 24, height: 24 }}>
          {customActionIcon ? customActionIcon : item.type === 'shortcut' || item.type === 'bookmark' || item.type === 'tab' ? (
            <RiLinkM className={`size-3.5 ${secondaryTextClass}`} />
          ) : item.type === 'remote' ? (
            <RiSearchLine className={`size-3.5 ${secondaryTextClass}`} />
          ) : item.type === 'history' && siteDirectDomain ? (
            <RiSearchLine className={`size-3.5 ${secondaryTextClass}`} />
          ) : (
            isUrl(item.value)
              ? <RiLinkM className={`size-3.5 ${secondaryTextClass}`} />
              : <RiHistoryFill className={`size-3.5 ${secondaryTextClass}`} />
          )}
        </span>
        {numberHintBadge}
        <span className="flex min-w-0 max-w-full flex-1 items-center gap-2 overflow-hidden">
          <span className="block min-w-0 max-w-full flex-1 truncate">{item.label}</span>
          {item.type === 'shortcut' && item.recentlyAdded && !isSelected ? (
            <span className={`shrink-0 rounded-full border border-current/8 bg-current/[0.05] px-1.5 py-0.5 text-[10px] font-medium ${secondaryTextClass} opacity-80`}>
              {t('search.recentlyAddedShortcutBadge', { defaultValue: '新添加' })}
            </span>
          ) : null}
          {detailLabel && !isSelected ? (
            <span className={`shrink-0 truncate ${secondaryTextClass}`}>{detailLabel}</span>
          ) : null}
          {secondaryLabel && !isSelected ? (
            <span className={`shrink-0 truncate ${secondaryTextClass}`}>{secondaryLabel}</span>
          ) : null}
          {showShortcutDomain && !isSelected ? (
            <span className={`max-w-[35%] shrink-0 truncate ${secondaryTextClass}`}>{shortcutDomain}</span>
          ) : null}
        </span>
        {showSecondaryActions ? (
          <span className="ml-2 flex shrink-0 items-center gap-1">
            {secondaryActions.map((secondaryAction, secondaryActionIndex) => {
              const actionKey = getSecondaryActionKey(action.id, secondaryActionIndex);
              const isActionSelected = actionModeActive && secondaryActionIndex === selectedSecondaryActionIndex;
              const isPendingConfirmation = secondaryAction.kind === 'remove-bookmark'
                && pendingConfirmationActionKey === actionKey;
              const isActionActive = secondaryAction.active === true;
              const actionLabel = resolveSecondaryActionTooltip(secondaryAction, isPendingConfirmation);
              return (
                <span
                  key={`${action.id}:${secondaryAction.id}`}
                  data-selected-action={isActionSelected ? 'true' : undefined}
                  role="button"
                  tabIndex={-1}
                  aria-label={actionLabel}
                  title={actionLabel}
                  className={`relative inline-flex size-6 items-center justify-center rounded-full transition-colors ${
                    isPendingConfirmation
                      ? 'bg-red-500/14 text-red-500 hover:bg-red-500/18'
                      : isActionSelected
                      ? 'bg-current/16 text-current'
                      : isActionActive
                        ? 'bg-current/10 text-current'
                        : `text-current/70 hover:bg-current/10 hover:text-current ${secondaryTextClass}`
                  }`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSecondaryActionSelect?.(action, secondaryAction, secondaryActionIndex);
                  }}
                >
                  {(isActionSelected || isPendingConfirmation) ? (
                    <span className="pointer-events-none absolute left-1/2 top-[calc(100%+6px)] z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-2 py-1 text-[10px] font-medium text-white shadow-sm">
                      {actionLabel}
                    </span>
                  ) : null}
                  {renderSecondaryActionIcon(secondaryAction)}
                </span>
              );
            })}
          </span>
        ) : isSelected
          ? enterHint
          : historyTimeText
            ? <span className={`ml-2 mr-1 shrink-0 text-[12px] ${secondaryTextClass}`}>{historyTimeText}</span>
            : null}
      </button>
    );
  };
  const renderVisualRow = (row: SuggestionVisualRow) => {
    if (row.kind === 'header') {
      return (
        <div
          key={row.key}
          className="flex h-[16px] items-center gap-1.5 px-2"
          aria-hidden="true"
        >
          <span className={`shrink-0 text-[11px] font-medium uppercase tracking-[0.05em] ${secondaryTextClass} opacity-55`}>
            {row.label}
          </span>
          <div className={`h-px min-w-0 flex-1 bg-current/6 ${secondaryTextClass}`} />
        </div>
      );
    }

    return renderSuggestionRow(row);
  };

  return (
    <div
      ref={handleSurfaceNodeRef}
      className={`absolute left-0 right-0 z-[60] isolate rounded-[20px] p-[8px] ${theme.dropdownSurfaceClassName} ${placement === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'}`}
      style={firefoxPanelStyle}
      aria-hidden={!isOpen}
    >
      <MaterialSurfaceFrame
        surfaceNode={surfaceNode}
        preset="search-panel"
        tone={surfaceTone}
        radiusClassName="rounded-[20px]"
        showBorder={false}
      >
        {statusNotice ? (
          <div
            className={`mb-2 flex items-center justify-between gap-2 rounded-[12px] px-2 py-1.5 ${
              statusNotice.tone === 'loading'
                ? theme.dropdownStatusLoadingContainerClassName
                : theme.dropdownStatusInfoContainerClassName
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {statusNotice.tone === 'loading' ? (
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 animate-pulse rounded-full ${theme.dropdownStatusDotClassName}`}
                />
              ) : null}
              <span className={`text-[12px] ${theme.dropdownStatusTextClassName}`}>
                {statusNotice.message}
              </span>
            </div>
            {statusNotice.actionLabel && statusNotice.onAction ? (
              <button
                type="button"
                className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] transition-colors ${theme.dropdownStatusButtonClassName}`}
                onClick={(event) => {
                  event.stopPropagation();
                  statusNotice.onAction?.();
                }}
              >
                {statusNotice.actionLabel}
              </button>
            ) : null}
          </div>
        ) : null}
        {hasLocalHistoryRows ? (
          <div className="mb-2 flex items-center justify-end px-2">
            <button
              type="button"
              className={`text-[12px] transition-colors ${theme.dropdownClearButtonClassName}`}
              onClick={onClear}
            >
              {t('search.clearHistory')}
            </button>
          </div>
        ) : null}
        {items.length === 0 ? (
          <div className={`flex justify-center px-3 py-2 text-[12px] ${theme.dropdownEmptyStateClassName}`}>{emptyStateLabel || t('search.noHistory')}</div>
        ) : (
          <ScrollArea
            ref={scrollAreaRef}
            data-allow-drawer-locked-scroll="true"
            className="mt-1 w-full"
            style={{ height: listHeight }}
            onWheelCapture={showScrollbar}
            onTouchMoveCapture={showScrollbar}
            scrollBarClassName={`transition-opacity duration-200 ${scrollbarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <div
              className="flex w-full flex-col overflow-visible pr-2"
              style={{
                ...firefoxListStyle,
                rowGap: `${SUGGESTION_ROW_GAP_PX}px`,
              }}
            >
              {visualRows.map(renderVisualRow)}
            </div>
          </ScrollArea>
        )}

        {items.length > 0 ? (
          <div className={`mt-2 flex items-center justify-between gap-4 border-t px-2 pt-2 text-[12px] ${theme.dropdownFooterClassName}`}>
            <div className="flex items-center gap-4">
              {actionModeActive ? (
                <>
                  <span>↵ {t('search.footer.executeAction', { defaultValue: '执行动作' })}</span>
                  <span>→ {t('search.footer.nextAction', { defaultValue: '下一个动作' })}</span>
                  <span>← {t('search.footer.backToResult', { defaultValue: '返回结果' })}</span>
                  <span>Esc {t('search.footer.exitActionMode', { defaultValue: '退出动作模式' })}</span>
                </>
              ) : (
                <>
                  <span>↑↓ {t('search.actionSelect', { defaultValue: '选择' })}</span>
                  <span>↵ {t('search.actionOpen', { defaultValue: '打开' })}</span>
                  {selectedActionHasSecondaryActions ? (
                    <span>→ {t('search.footer.enterActionMode', { defaultValue: '动作' })}</span>
                  ) : null}
                  <span>Esc {t('search.actionClose', { defaultValue: '关闭' })}</span>
                </>
              )}
            </div>
          </div>
        ) : null}
      </MaterialSurfaceFrame>
    </div>
  );
}
