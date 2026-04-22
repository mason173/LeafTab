import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RiArrowRightSLine,
  RiCornerDownLeftLine,
  RiHistoryFill,
  RiLinkM,
  RiSearchLine,
} from '@/icons/ri-compat';
import { ScrollArea } from '@/components/ui/scroll-area';
import ShortcutIcon from '@/components/ShortcutIcon';
import { extractDomainFromUrl, isUrl } from '@/utils';
import { parseSiteSearchShortcut } from '@/utils/siteSearch';
import {
  getEngineIcon,
  SEARCH_ENGINE_BRAND_NAMES,
} from '@/components/search/searchEngineSwitcher.shared';
import type { SearchSuggestionsPanelProps } from '@/components/search/SearchSuggestionsPanel.shared';
import type { SearchAction } from '@/utils/searchActions';

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
  lightweight = false,
  placement = 'bottom',
}: SearchSuggestionsPanelProps) {
  const { t, i18n } = useTranslation();
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
    () => items.some(({ item }) => item.type === 'history' && item.historySource !== 'browser'),
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
  const derivedSuggestionRows = useMemo(() => items.map((action, index) => {
    const { item } = action;
    const shortcutDomain = item.type === 'shortcut' || item.type === 'bookmark' || item.type === 'tab'
      ? extractDomainFromUrl(item.value)
      : '';
    const isCurrentTab = item.type === 'tab' && item.tabId === currentBrowserTabId;
    const remoteProviderLabel = item.type === 'remote'
      ? t('search.remoteSuggestionSource', { defaultValue: '搜索建议' })
      : '';
    return {
      action,
      item,
      index,
      isCurrentTab,
      shortcutDomain,
      showShortcutDomain: !isCurrentTab && Boolean(shortcutDomain) && shortcutDomain !== item.label,
      secondaryLabel: isCurrentTab
        ? t('search.currentTabLabel', { defaultValue: '当前标签页' })
        : remoteProviderLabel,
      siteDirectDomain: item.type === 'history' ? (historySiteDirectDomainMap.get(item.value) || '') : '',
    };
  }), [currentBrowserTabId, historySiteDirectDomainMap, items, t]);

  const visualRowCount = items.length;
  const maxVisibleRows = 8;
  const canScroll = visualRowCount > maxVisibleRows;
  const visibleCount = Math.min(visualRowCount, maxVisibleRows);
  const listHeight = visibleCount > 0 ? visibleCount * 32 + Math.max(0, visibleCount - 1) * 4 : 0;

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
    if (!lightweight) {
      setShouldRenderPanel(isOpen);
      return;
    }

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
    }, 170);
  }, [isOpen, lightweight]);

  if (!lightweight && !isOpen) return null;
  if (lightweight && !shouldRenderPanel) return null;

  const rowClass = (index: number) => `w-full max-w-full min-w-0 text-left px-1 h-[32px] flex items-center text-[14px] rounded-[10px] transition-[background-color,color] overflow-hidden ${theme.dropdownRowClassName} ${index === selectedIndex ? theme.dropdownRowSelectedClassName : ''}`;
  const secondaryTextClass = theme.dropdownSecondaryTextClassName;
  const lightweightPanelStyle = lightweight ? ({
    opacity: isOpen ? 1 : 0,
    transform: isOpen
      ? 'translate3d(0, 0, 0)'
      : `translate3d(0, ${placement === 'top' ? '-8px' : '8px'}, 0)`,
    transition: 'opacity 170ms cubic-bezier(0.22, 1, 0.36, 1), transform 170ms cubic-bezier(0.22, 1, 0.36, 1)',
    pointerEvents: isOpen ? 'auto' : 'none',
    visibility: isOpen ? 'visible' : 'hidden',
    contain: 'layout paint style',
    contentVisibility: isOpen ? 'auto' : 'hidden',
    willChange: 'opacity, transform',
  } as CSSProperties) : undefined;
  const lightweightListStyle = lightweight ? ({
    contain: 'layout paint style',
    contentVisibility: isOpen ? 'auto' : 'hidden',
  } as CSSProperties) : undefined;
  const enterKeyLabel = t('search.enterKey', { defaultValue: 'Enter' });
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

  const renderSuggestionRow = ({
    action,
    item,
    index,
    shortcutDomain,
    secondaryLabel,
    showShortcutDomain,
    siteDirectDomain,
  }: {
    action: SearchAction;
    item: SearchAction['item'];
    index: number;
    shortcutDomain: string;
    secondaryLabel: string;
    showShortcutDomain: boolean;
    siteDirectDomain: string;
  }) => {
    const isSelected = index === selectedIndex;
    const numberHintBadge = (
      <span
        aria-hidden={!showNumberHints}
        className={`inline-flex shrink-0 overflow-hidden transition-[max-width,margin] duration-300 ease-out ${
          showNumberHints ? 'max-w-8 mr-1' : 'max-w-0 mr-0'
        }`}
      >
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground transition-[opacity,transform] duration-300 ease-out origin-left ${
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
          onMouseMove={() => {
            if (index === selectedIndex) return;
            onHighlight?.(index);
          }}
          onClick={() => onSelect(action)}
        >
          <span className="relative mr-2 flex shrink-0 items-center justify-center" style={{ width: 24, height: 24 }}>
            <img alt="" className="pointer-events-none size-[18px] shrink-0 object-contain" src={getEngineIcon(item.engine)} />
          </span>
          {numberHintBadge}
          <span className="min-w-0 flex-1 truncate">{hintText}</span>
          {isSelected ? enterHint : <RiArrowRightSLine className={`ml-2 size-4 shrink-0 ${secondaryTextClass}`} />}
        </button>
      );
    }

    const historyTimeText = item.type === 'history' ? formatRelativeTime(item.timestamp) : '';
    return (
      <button
        key={action.id}
        type="button"
        data-selected={index === selectedIndex}
        className={rowClass(index)}
        onMouseMove={() => {
          if (index === selectedIndex) return;
          onHighlight?.(index);
        }}
        onClick={() => onSelect(action)}
      >
        <span className="relative mr-2 flex shrink-0 items-center justify-center" style={{ width: 24, height: 24 }}>
          {item.type === 'shortcut' || item.type === 'bookmark' || item.type === 'tab' ? (
            <ShortcutIcon
              icon={item.icon || ''}
              url={item.value}
              shortcutId={item.type === 'shortcut' ? item.shortcutId : undefined}
              size={24}
              exact
            />
          ) : item.type === 'remote' ? (
            <RiSearchLine className={`size-3.5 ${secondaryTextClass}`} />
          ) : item.type === 'history' && siteDirectDomain ? (
            <RiArrowRightSLine className={`size-3.5 ${secondaryTextClass}`} />
          ) : (
            isUrl(item.value)
              ? <RiLinkM className={`size-3.5 ${secondaryTextClass}`} />
              : <RiHistoryFill className={`size-3.5 ${secondaryTextClass}`} />
          )}
        </span>
        {numberHintBadge}
        <span className="flex min-w-0 max-w-full flex-1 items-center gap-2 overflow-hidden">
          <span className="block min-w-0 max-w-full flex-1 truncate">{item.label}</span>
          {secondaryLabel && !isSelected ? (
            <span className={`shrink-0 truncate ${secondaryTextClass}`}>{secondaryLabel}</span>
          ) : null}
          {showShortcutDomain && !isSelected ? (
            <span className={`max-w-[35%] shrink-0 truncate ${secondaryTextClass}`}>{shortcutDomain}</span>
          ) : null}
        </span>
        {isSelected
          ? enterHint
          : historyTimeText
            ? <span className={`ml-2 mr-1 shrink-0 text-[12px] ${secondaryTextClass}`}>{historyTimeText}</span>
            : null}
      </button>
    );
  };

  return (
    <div
      className={`absolute left-0 right-0 z-[1200] rounded-[20px] border p-[8px] ${theme.dropdownSurfaceClassName} ${lightweight ? 'backdrop-blur-none shadow-none' : ''} ${placement === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'}`}
      style={lightweightPanelStyle}
      aria-hidden={!isOpen}
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
          <div className="flex w-full flex-col gap-1 overflow-hidden pr-2" style={lightweightListStyle}>
            {derivedSuggestionRows.map(renderSuggestionRow)}
          </div>
        </ScrollArea>
      )}

      {items.length > 0 ? (
        <div className={`mt-2 flex items-center justify-between gap-4 border-t px-2 pt-2 text-[12px] ${theme.dropdownFooterClassName}`}>
          <div className="flex items-center gap-4">
            <span>↑↓ {t('search.actionSelect', { defaultValue: '选择' })}</span>
            <span>↵ {t('search.actionOpen', { defaultValue: '打开' })}</span>
            <span>Esc {t('search.actionClose', { defaultValue: '关闭' })}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
