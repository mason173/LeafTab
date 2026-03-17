import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RiArrowRightSLine, RiHistoryFill, RiLinkM, RiSearchLine } from '@/icons/ri-compat';
import { extractDomainFromUrl, isUrl } from '../utils';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { SearchEngine } from '../types';
import type { SearchSuggestionItem } from '../types';
import { parseSiteSearchShortcut } from '@/utils/siteSearch';
import { getHighlightedSearchCommandToken } from '@/utils/searchCommands';
import ShortcutIcon from './ShortcutIcon';
import { TextScramble } from '@/components/motion-primitives/text-scramble';
import {
  getEngineIcon,
  SEARCH_ENGINE_BRAND_NAMES,
  SearchEngineSwitcherDropdown,
  SearchEngineSwitcherTrigger,
} from './search/SearchEngineSwitcher';

function Frame3({
  value,
  onChange,
  inputRef,
  onFocus,
  placeholder,
  calculatorInlinePreview,
  onKeyDown,
  disablePlaceholderAnimation,
  blankMode,
  forceWhiteTheme,
  subtleDarkTone,
  inputFontSize = 18,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFocus: () => void;
  placeholder?: string;
  calculatorInlinePreview?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  disablePlaceholderAnimation?: boolean;
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  subtleDarkTone?: boolean;
  inputFontSize?: number;
}) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const textMeasureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const imeComposingRef = useRef(false);
  const showLinkIcon = isUrl(value);
  const highlightedCommandPrefix = getHighlightedSearchCommandToken(value);
  const commandPrefixHighlighted = Boolean(highlightedCommandPrefix);
  const commandPrefixText = value.slice(0, Math.min(highlightedCommandPrefix.length, value.length));
  const commandSuffixText = value.slice(highlightedCommandPrefix.length);
  const inputDisplayValue = commandPrefixHighlighted ? commandSuffixText : value;
  const placeholderText = placeholder || t('search.placeholder');
  const placeholderTextClass = subtleDarkTone
    ? 'text-black/30'
    : (forceWhiteTheme
      ? 'text-black/40'
      : (blankMode ? 'text-white/40' : 'text-muted-foreground'));
  const inputLineHeight = Math.round(inputFontSize * 1.35);
  const placeholderFontSize = Math.max(14, Math.round(inputFontSize * 0.88));
  const placeholderLineHeight = Math.round(placeholderFontSize * 1.35);
  const inlinePreviewFontSize = Math.max(10, inputFontSize - 4);
  const inlinePreviewLineHeight = Math.round(inlinePreviewFontSize * 1.35);
  const customCaretHeight = Math.max(16, Math.round(inputLineHeight * 0.95));
  const customCaretWidth = 2;

  const typedTextWidth = useMemo(() => {
    if (!calculatorInlinePreview || value.length === 0) return 0;
    if (typeof document === 'undefined') return Math.ceil(value.length * inputFontSize * 0.56);
    if (!textMeasureCanvasRef.current) {
      textMeasureCanvasRef.current = document.createElement('canvas');
    }
    const context = textMeasureCanvasRef.current.getContext('2d');
    if (!context) return Math.ceil(value.length * inputFontSize * 0.56);
    context.font = `400 ${inputFontSize}px "PingFang SC", sans-serif`;
    return Math.ceil(context.measureText(value).width);
  }, [calculatorInlinePreview, inputFontSize, value]);
  const isImeComposingEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isModifierDigitHotkey = (e.metaKey || e.ctrlKey) && /^[0-9]$/.test(e.key);
    if (isModifierDigitHotkey) return false;
    const navigationKeys = new Set([
      'Escape',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Backspace',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ]);
    if (navigationKeys.has(e.key)) return false;
    const native = e.nativeEvent as KeyboardEvent;
    return Boolean(
      imeComposingRef.current ||
      native.isComposing ||
      e.key === 'Process',
    );
  };
  const emitPatchedChange = (nextValue: string, nativeEvent?: Event) => {
    onChange({
      target: { value: nextValue } as EventTarget & HTMLInputElement,
      currentTarget: { value: nextValue } as EventTarget & HTMLInputElement,
      nativeEvent: (nativeEvent || ({} as Event)) as Event,
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className="content-stretch flex items-center relative flex-1 min-w-0 gap-2">
      {showLinkIcon && (
        <RiLinkM className={`size-4 shrink-0 ${
          subtleDarkTone
            ? 'text-black/20'
            : (forceWhiteTheme ? 'text-black/45' : (blankMode ? 'text-white/40' : 'text-muted-foreground'))
        }`} />
      )}
      {commandPrefixHighlighted ? (
        <span
          className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-2 py-0.5 font-normal text-primary"
          style={{ fontSize: inlinePreviewFontSize, lineHeight: `${inlinePreviewLineHeight}px` }}
        >
          {commandPrefixText}
        </span>
      ) : null}
      <Input 
        ref={inputRef}
        type="text"
        value={inputDisplayValue}
        onChange={(e) => {
          if (!commandPrefixHighlighted) {
            onChange(e);
            return;
          }
          emitPatchedChange(`${highlightedCommandPrefix}${e.target.value}`, e.nativeEvent);
        }}
        onFocus={() => {
          setIsFocused(true);
          onFocus();
        }}
        onBlur={() => setIsFocused(false)}
        onCompositionStart={() => {
          imeComposingRef.current = true;
        }}
        onCompositionEnd={() => {
          imeComposingRef.current = false;
        }}
        onKeyDown={(e) => {
          if (isImeComposingEvent(e)) {
            // IME 组词阶段按回车仅用于上屏，不能触发搜索提交。
            if (e.key === 'Enter') e.stopPropagation();
            return;
          }
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if (commandPrefixHighlighted && inputDisplayValue.length === 0 && e.key === 'Backspace') {
            e.preventDefault();
            emitPatchedChange('', e.nativeEvent);
            return;
          }
        }}
        placeholder=""
        className={`border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto pl-0 pr-0 py-0 caret-primary focus:placeholder:text-transparent font-['PingFang_SC:Regular',sans-serif] font-normal placeholder:font-normal not-italic w-full rounded-none ${value.length === 0 ? 'focus:caret-transparent' : ''} ${
          subtleDarkTone
            ? 'bg-transparent dark:bg-transparent text-black/85 placeholder:text-black/30'
            : (forceWhiteTheme
              ? 'bg-transparent dark:bg-transparent text-black/85 placeholder:text-black/40'
              : (blankMode
                ? 'bg-transparent dark:bg-transparent text-white/80 placeholder:text-white/40'
                : 'bg-transparent dark:bg-transparent text-foreground placeholder:text-muted-foreground'))
        }`}
        style={{
          fontSize: inputFontSize,
          lineHeight: `${inputLineHeight}px`,
        }}
      />
      {value.length > 0 && calculatorInlinePreview ? (
        <span
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 select-none whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 font-normal text-primary"
          style={{
            left: `calc(0.5rem + ${Math.ceil(typedTextWidth)}px + 4px)`,
            fontSize: inlinePreviewFontSize,
            lineHeight: `${inlinePreviewLineHeight}px`,
          }}
        >
          {calculatorInlinePreview}
        </span>
      ) : null}
      {!isFocused && value.length === 0 ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-2 right-0 top-1/2 -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap ${placeholderTextClass}`}
          style={{ fontSize: placeholderFontSize, lineHeight: `${placeholderLineHeight}px` }}
        >
          {disablePlaceholderAnimation ? (
            <span key={placeholderText} className="block truncate">
              {placeholderText}
            </span>
          ) : (
            <TextScramble
              key={placeholderText}
              as="span"
              className="block truncate"
              duration={0.52}
              speed={0.02}
            >
              {placeholderText}
            </TextScramble>
          )}
        </span>
      ) : null}
      {isFocused && value.length === 0 ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-primary animate-[leaftab-caret-blink_1s_steps(1)_infinite]"
          style={{ width: `${customCaretWidth}px`, height: `${customCaretHeight}px` }}
        />
      ) : null}
    </div>
  );
}

function Frame2({
  value,
  onChange,
  inputRef,
  onFocusContainer,
  onOpenHistory,
  onClear,
  placeholder,
  calculatorInlinePreview,
  onKeyDown,
  disablePlaceholderAnimation,
  blankMode,
  forceWhiteTheme,
  subtleDarkTone,
  height = 52,
  inputFontSize = 18,
  horizontalPadding = 24,
  searchActionSize = 42,
  surfaceStyle,
  searchEngine,
  onEngineClick,
  showEngineSwitcher = true,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFocusContainer: () => void;
  onOpenHistory: () => void;
  onClear: () => void;
  placeholder?: string;
  calculatorInlinePreview?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  disablePlaceholderAnimation?: boolean;
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  subtleDarkTone?: boolean;
  height?: number;
  inputFontSize?: number;
  horizontalPadding?: number;
  searchActionSize?: number;
  surfaceStyle?: React.CSSProperties;
  searchEngine: SearchEngine;
  onEngineClick: () => void;
  showEngineSwitcher?: boolean;
}) {
  const { t } = useTranslation();
  const clearButtonSize = Math.max(28, searchActionSize - 10);
  const leftPadding = showEngineSwitcher ? Math.max(10, horizontalPadding - 14) : horizontalPadding;
  const rightPadding = Math.max(12, horizontalPadding - 10);
  const gap = Math.max(8, Math.round(height * 0.2));
  
  return (
    <div
      className={`content-stretch flex items-center relative rounded-[999px] self-stretch w-full min-w-0 group cursor-text ${
        forceWhiteTheme
          ? 'bg-white text-black/85'
          : (blankMode ? 'bg-black/20 backdrop-blur-md text-white/56' : 'bg-secondary text-foreground')
      }`}
      style={{
        height,
        paddingLeft: leftPadding,
        paddingRight: rightPadding,
        gap,
        ...surfaceStyle,
      }}
      onClick={() => {
        onFocusContainer();
        onOpenHistory();
      }}
    >
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none rounded-[999px] transition-colors" />
      {showEngineSwitcher ? (
        <SearchEngineSwitcherTrigger
          engine={searchEngine}
          onClick={() => onEngineClick()}
          blankMode={blankMode}
          forceWhiteTheme={forceWhiteTheme}
          subtleDarkTone={subtleDarkTone}
        />
      ) : null}
      <Frame3
        value={value}
        onChange={onChange}
        inputRef={inputRef}
        onFocus={onOpenHistory}
        placeholder={placeholder}
        calculatorInlinePreview={calculatorInlinePreview}
        onKeyDown={onKeyDown}
        disablePlaceholderAnimation={disablePlaceholderAnimation}
        blankMode={blankMode}
        forceWhiteTheme={forceWhiteTheme}
        subtleDarkTone={subtleDarkTone}
        inputFontSize={inputFontSize}
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label={t('common.clear')}
          title={t('common.clear')}
          className={`flex items-center justify-center relative rounded-[999px] shrink-0 transition-colors ${
            forceWhiteTheme
              ? 'text-black/45 hover:text-black/80'
              : (blankMode
                ? 'text-white/40 hover:text-white/80'
                : 'text-muted-foreground hover:text-foreground')
          }`}
          style={{ width: clearButtonSize, height: clearButtonSize }}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
            inputRef.current?.focus();
            onOpenHistory();
          }}
        >
          <span className="leading-none" style={{ fontSize: Math.max(16, inputFontSize) }}>×</span>
        </button>
      )}
    </div>
  );
}

function SearchHistoryDropdown({
  items,
  isOpen,
  onSelect,
  onClear,
  onHighlight,
  selectedIndex = -1,
  blankMode,
  forceWhiteTheme,
  showHistoryPermissionBanner = false,
  onRequestHistoryPermission,
  showNumberHints = false,
  tabsPanelActive = false,
  currentBrowserTabId = null,
}: {
  items: SearchSuggestionItem[];
  isOpen: boolean;
  onSelect: (value: SearchSuggestionItem) => void;
  onClear: () => void;
  onHighlight?: (index: number) => void;
  selectedIndex?: number;
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  showHistoryPermissionBanner?: boolean;
  onRequestHistoryPermission?: () => void;
  showNumberHints?: boolean;
  tabsPanelActive?: boolean;
  currentBrowserTabId?: number | null;
}) {
  const { t, i18n } = useTranslation();
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const hideScrollbarTimerRef = useRef<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const relativeTimeFormatter = useMemo(
    () => new Intl.RelativeTimeFormat(i18n.language || undefined, { numeric: 'auto' }),
    [i18n.language],
  );
  const hasLocalHistoryRows = useMemo(
    () => items.some((item) => item.type === 'history' && item.historySource !== 'browser'),
    [items],
  );
  const historySiteDirectDomainMap = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      if (item.type !== 'history') return;
      const { siteDomain } = parseSiteSearchShortcut(item.value);
      map.set(item.value, siteDomain || '');
    });
    return map;
  }, [items]);
  const derivedSuggestionRows = useMemo(() => items.map((item, index) => {
    const shortcutDomain = item.type === 'shortcut' || item.type === 'bookmark' || item.type === 'tab'
      ? extractDomainFromUrl(item.value)
      : '';
    const isCurrentTab = item.type === 'tab' && item.tabId === currentBrowserTabId;
    return {
      item,
      index,
      isCurrentTab,
      shortcutDomain,
      showShortcutDomain: !isCurrentTab && Boolean(shortcutDomain) && shortcutDomain !== item.label,
      secondaryLabel: isCurrentTab ? t('search.currentTabLabel', { defaultValue: '当前标签页' }) : '',
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
      const selectedElement = scrollAreaRef.current.querySelector(`[data-selected="true"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, isOpen]);

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

  useEffect(() => {
    return () => {
      if (hideScrollbarTimerRef.current !== null) {
        window.clearTimeout(hideScrollbarTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const rowClass = (index: number) => `w-full max-w-full min-w-0 text-left px-1 h-[32px] flex items-center text-[14px] rounded-[10px] transition-[background-color,color] overflow-hidden ${
    forceWhiteTheme
      ? `text-black/85 hover:bg-black/5 hover:text-black focus:bg-black/5 focus:text-black ${index === selectedIndex ? 'bg-black/8 text-black' : ''}`
      : (blankMode
        ? `text-white/80 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white ${index === selectedIndex ? 'bg-white/10 text-white' : ''}`
        : `text-foreground hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground ${index === selectedIndex ? 'bg-accent text-foreground' : ''}`)
  }`;
  const secondaryTextClass = forceWhiteTheme ? 'text-black/40' : (blankMode ? 'text-white/50' : 'text-muted-foreground');
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
  const renderSuggestionRow = ({
    item,
    index,
    isCurrentTab,
    shortcutDomain,
    secondaryLabel,
    showShortcutDomain,
    siteDirectDomain,
  }: {
    item: SearchSuggestionItem;
    index: number;
    isCurrentTab: boolean;
    shortcutDomain: string;
    secondaryLabel: string;
    showShortcutDomain: boolean;
    siteDirectDomain: string;
  }) => {
    const numberHintBadge = (
      <span
        aria-hidden={!showNumberHints}
        className={`shrink-0 overflow-hidden transition-[width,margin] duration-300 ease-out ${
          showNumberHints ? 'w-7 mr-2' : 'w-0 mr-0'
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
          key={`${item.type}-${item.engine}-${index}`}
          type="button"
          data-selected={index === selectedIndex}
          className={rowClass(index)}
          onMouseEnter={() => onHighlight?.(index)}
          onClick={() => onSelect(item)}
        >
          <span className="relative shrink-0 mr-2 flex items-center justify-center" style={{ width: 24, height: 24 }}>
            <img alt="" className="size-[18px] object-contain pointer-events-none shrink-0" src={getEngineIcon(item.engine)} />
          </span>
          {numberHintBadge}
          <span className="truncate flex-1 min-w-0">{hintText}</span>
          <RiArrowRightSLine className={`ml-2 size-4 shrink-0 ${secondaryTextClass}`} />
        </button>
      );
    }

    const historyTimeText = item.type === 'history' ? formatRelativeTime(item.timestamp) : '';
    return (
      <button
        key={`${item.type}-${item.label}-${item.value}-${index}`}
        type="button"
        data-selected={index === selectedIndex}
        className={rowClass(index)}
        onMouseEnter={() => onHighlight?.(index)}
        onClick={() => onSelect(item)}
      >
        <span className="relative shrink-0 mr-2 flex items-center justify-center" style={{ width: 24, height: 24 }}>
          {item.type === 'shortcut' || item.type === 'bookmark' || item.type === 'tab' ? (
            <ShortcutIcon icon={item.icon || ''} url={item.value} size={24} exact />
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
          {secondaryLabel ? (
            <span className={`shrink-0 truncate ${secondaryTextClass}`}>{secondaryLabel}</span>
          ) : null}
          {showShortcutDomain ? (
            <span className={`max-w-[35%] shrink-0 truncate ${secondaryTextClass}`}>{shortcutDomain}</span>
          ) : null}
        </span>
        {historyTimeText ? <span className={`ml-2 mr-1 shrink-0 text-[12px] ${secondaryTextClass}`}>{historyTimeText}</span> : null}
      </button>
    );
  };

  return (
    <div className={`absolute left-0 right-0 p-[8px] rounded-[20px] top-[calc(100%+8px)] z-[500] border ${
      forceWhiteTheme
        ? 'bg-white text-black/85 border-black/10 shadow-lg'
        : (blankMode
          ? 'bg-background/15 backdrop-blur-xl border-white/10 text-white/80'
          : 'bg-popover text-popover-foreground border-border')
    }`}>
      {showHistoryPermissionBanner ? (
        <div
          className={`mb-2 flex items-center justify-between gap-2 rounded-[12px] px-2 py-1.5 ${
            forceWhiteTheme
              ? 'bg-black/5'
              : (blankMode ? 'bg-white/10' : 'bg-primary/10')
          }`}
        >
          <span
            className={`text-[12px] ${
              forceWhiteTheme ? 'text-black/65' : (blankMode ? 'text-white/80' : 'text-primary')
            }`}
          >
            {t('search.historyPermissionBanner', {
              defaultValue: '授权后可显示浏览器历史记录',
            })}
          </span>
          <button
            type="button"
            className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] transition-colors ${
              forceWhiteTheme
                ? 'bg-black/10 text-black/75 hover:bg-black/15'
                : (blankMode
                  ? 'bg-white/15 text-white hover:bg-white/20'
                  : 'bg-primary/15 text-primary hover:bg-primary/25')
            }`}
            onClick={(event) => {
              event.stopPropagation();
              onRequestHistoryPermission?.();
            }}
          >
            {t('search.authorizeHistoryPermission', { defaultValue: '去授权' })}
          </button>
        </div>
      ) : null}
      {hasLocalHistoryRows ? (
        <div className="mb-2 flex items-center justify-end px-2">
          <button
            type="button"
            className={`text-[12px] transition-colors ${
              forceWhiteTheme
                ? 'text-black/45 hover:text-black/80'
                : (blankMode
                  ? 'text-white/60 hover:text-white/90'
                  : 'text-muted-foreground hover:text-foreground')
            }`}
            onClick={onClear}
          >
            {t('search.clearHistory')}
          </button>
        </div>
      ) : null}
      {items.length === 0 ? (
        <div className={`flex justify-center px-3 py-2 text-[12px] ${
          forceWhiteTheme ? 'text-black/45' : (blankMode ? 'text-white/60' : 'text-muted-foreground')
        }`}>{t('search.noHistory')}</div>
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
          <div className="flex flex-col gap-1 pr-2 w-full overflow-hidden">
            {derivedSuggestionRows.map(renderSuggestionRow)}
          </div>
        </ScrollArea>
      )}

      {items.length > 0 || tabsPanelActive ? (
        <div className={`mt-2 border-t px-2 pt-2 text-[12px] flex items-center justify-between gap-4 ${
          forceWhiteTheme
            ? 'border-black/10 text-black/45'
            : (blankMode ? 'border-white/10 text-white/60' : 'border-border text-muted-foreground')
        }`}>
          <div className="flex items-center gap-4">
            <span>↑↓ {t('search.actionSelect', { defaultValue: '选择' })}</span>
            <span>↵ {t('search.actionOpen', { defaultValue: '打开' })}</span>
            <span>Esc {t('search.actionClose', { defaultValue: '关闭' })}</span>
          </div>
          {tabsPanelActive ? (
            <div className="flex items-center gap-4">
              <span>Del {t('search.actionCloseTab', { defaultValue: '关闭标签页' })}</span>
              <span>Shift+Del {t('search.actionCloseOtherTabs', { defaultValue: '关闭其他标签页' })}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface SearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  searchEngine: SearchEngine;
  onEngineClick: () => void;
  dropdownOpen: boolean;
  onEngineSelect: (engine: SearchEngine) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  suggestionItems: SearchSuggestionItem[];
  historyOpen: boolean;
  onHistoryOpen: () => void;
  onSuggestionSelect: (value: SearchSuggestionItem) => void;
  onSuggestionHighlight?: (index: number) => void;
  onHistoryClear: () => void;
  onClear: () => void;
  historyRef: React.RefObject<HTMLDivElement | null>;
  placeholder?: string;
  calculatorInlinePreview?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  disablePlaceholderAnimation?: boolean;
  historySelectedIndex?: number;
  inputRef: React.RefObject<HTMLInputElement | null>;
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  searchHeight?: number;
  searchInputFontSize?: number;
  searchHorizontalPadding?: number;
  searchActionSize?: number;
  searchSurfaceStyle?: React.CSSProperties;
  subtleDarkTone?: boolean;
  showEngineSwitcher?: boolean;
  showHistoryPermissionBanner?: boolean;
  onRequestHistoryPermission?: () => void;
  showSuggestionNumberHints?: boolean;
  tabsPanelActive?: boolean;
  currentBrowserTabId?: number | null;
}

export function SearchBar({ 
  value, 
  onChange, 
  onSubmit, 
  searchEngine, 
  onEngineClick, 
  dropdownOpen, 
  onEngineSelect, 
  dropdownRef, 
  suggestionItems, 
  historyOpen, 
  onHistoryOpen, 
  onSuggestionSelect, 
  onSuggestionHighlight,
  onHistoryClear, 
  onClear, 
  historyRef, 
  placeholder, 
  calculatorInlinePreview,
  onKeyDown, 
  disablePlaceholderAnimation = false,
  historySelectedIndex, 
  inputRef, 
  blankMode,
  forceWhiteTheme,
  searchHeight = 52,
  searchInputFontSize = 18,
  searchHorizontalPadding = 24,
  searchActionSize = 42,
  searchSurfaceStyle,
  subtleDarkTone,
  showEngineSwitcher = true,
  showHistoryPermissionBanner = false,
  onRequestHistoryPermission,
  showSuggestionNumberHints = false,
  tabsPanelActive = false,
  currentBrowserTabId = null,
}: SearchBarProps) {
  const isImeComposingEvent = (e: React.KeyboardEvent) => {
    const isModifierDigitHotkey = (e.metaKey || e.ctrlKey) && /^[0-9]$/.test(e.key);
    if (isModifierDigitHotkey) return false;
    const navigationKeys = new Set([
      'Escape',
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Backspace',
      'Delete',
      'Home',
      'End',
      'PageUp',
      'PageDown',
    ]);
    if (navigationKeys.has(e.key)) return false;
    const native = e.nativeEvent as KeyboardEvent;
    return Boolean(
      native.isComposing ||
      e.key === 'Process',
    );
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isImeComposingEvent(e)) return;
    if (e.defaultPrevented) return;
    
    if (e.key === 'Enter') {
      onSubmit();
    }
    // Only trigger if not from input, as input already handles it directly
    if ((e.target as HTMLElement).tagName !== 'INPUT') {
      onKeyDown?.(e);
    }
  };

  return (
    <div className="relative content-stretch flex items-start w-full" onKeyDown={handleKeyDown}>
      <div className="relative flex-1 min-w-0" ref={dropdownRef}>
        <div className="relative" ref={historyRef}>
          <Frame2 
            value={value} 
            onChange={onChange} 
            inputRef={inputRef} 
            onFocusContainer={focusInput} 
            onOpenHistory={onHistoryOpen} 
            onClear={onClear} 
            placeholder={placeholder} 
            calculatorInlinePreview={calculatorInlinePreview}
            onKeyDown={onKeyDown} 
            disablePlaceholderAnimation={disablePlaceholderAnimation}
            blankMode={blankMode}
            forceWhiteTheme={forceWhiteTheme}
            subtleDarkTone={subtleDarkTone}
            height={searchHeight}
            inputFontSize={searchInputFontSize}
            horizontalPadding={searchHorizontalPadding}
            searchActionSize={searchActionSize}
            surfaceStyle={searchSurfaceStyle}
            searchEngine={searchEngine}
            onEngineClick={onEngineClick}
            showEngineSwitcher={showEngineSwitcher}
          />
          <SearchHistoryDropdown 
            items={suggestionItems} 
            isOpen={historyOpen} 
            onSelect={onSuggestionSelect} 
            onHighlight={onSuggestionHighlight}
            onClear={onHistoryClear} 
            selectedIndex={historySelectedIndex} 
            blankMode={blankMode}
            forceWhiteTheme={forceWhiteTheme}
            showHistoryPermissionBanner={showHistoryPermissionBanner}
            onRequestHistoryPermission={onRequestHistoryPermission}
            showNumberHints={showSuggestionNumberHints}
            tabsPanelActive={tabsPanelActive}
            currentBrowserTabId={currentBrowserTabId}
          />
        </div>
        {showEngineSwitcher ? (
          <SearchEngineSwitcherDropdown currentEngine={searchEngine} onSelect={onEngineSelect} isOpen={dropdownOpen} />
        ) : null}
      </div>
    </div>
  );
}
