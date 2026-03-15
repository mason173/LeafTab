import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RiArrowRightSLine, RiCalculatorLine, RiHistoryFill, RiLinkM } from '@remixicon/react';
import { extractDomainFromUrl, isUrl } from '../utils';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { SearchEngine } from '../types';
import type { SearchSuggestionItem } from '../types';
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
  onKeyDown,
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
  onKeyDown?: (e: React.KeyboardEvent) => void;
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  subtleDarkTone?: boolean;
  inputFontSize?: number;
}) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const imeComposingRef = useRef(false);
  const showLinkIcon = isUrl(value);
  const placeholderText = placeholder || t('search.placeholder');
  const placeholderTextClass = subtleDarkTone
    ? 'text-black/30'
    : (forceWhiteTheme
      ? 'text-black/40'
      : (blankMode ? 'text-white/40' : 'text-muted-foreground'));
  const inputLineHeight = Math.round(inputFontSize * 1.35);
  const placeholderFontSize = Math.max(14, Math.round(inputFontSize * 0.88));
  const placeholderLineHeight = Math.round(placeholderFontSize * 1.35);
  const customCaretHeight = Math.max(16, Math.round(inputLineHeight * 0.95));
  const customCaretWidth = 2;
  const isImeComposingEvent = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as KeyboardEvent & { keyCode?: number; which?: number };
    return Boolean(
      imeComposingRef.current ||
      native.isComposing ||
      e.key === 'Process' ||
      native.keyCode === 229 ||
      native.which === 229,
    );
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
      <Input 
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
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
        }}
        placeholder=""
        className={`border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto pl-2 pr-0 py-0 caret-primary focus:placeholder:text-transparent font-['PingFang_SC:Regular',sans-serif] font-normal placeholder:font-normal not-italic w-full rounded-none ${value.length === 0 ? 'focus:caret-transparent' : ''} ${
          subtleDarkTone
            ? 'bg-transparent dark:bg-transparent text-black/85 placeholder:text-black/30'
            : (forceWhiteTheme
            ? 'bg-transparent dark:bg-transparent text-black/85 placeholder:text-black/40'
            : (blankMode
              ? 'bg-transparent dark:bg-transparent text-white/80 placeholder:text-white/40'
              : 'bg-transparent dark:bg-transparent text-foreground placeholder:text-muted-foreground'))
        }`}
        style={{ fontSize: inputFontSize, lineHeight: `${inputLineHeight}px` }}
      />
      {!isFocused && value.length === 0 ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute left-2 right-0 top-1/2 -translate-y-1/2 overflow-hidden text-ellipsis whitespace-nowrap ${placeholderTextClass}`}
          style={{ fontSize: placeholderFontSize, lineHeight: `${placeholderLineHeight}px` }}
        >
          <TextScramble
            key={placeholderText}
            as="span"
            className="block truncate"
            duration={0.52}
            speed={0.02}
          >
            {placeholderText}
          </TextScramble>
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
  onKeyDown,
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
  onKeyDown?: (e: React.KeyboardEvent) => void;
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
        onKeyDown={onKeyDown}
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

function SearchHistoryDropdown({ items, isOpen, onSelect, onClear, onHighlight, selectedIndex = -1, blankMode, forceWhiteTheme }: { items: SearchSuggestionItem[]; isOpen: boolean; onSelect: (value: SearchSuggestionItem) => void; onClear: () => void; onHighlight?: (index: number) => void; selectedIndex?: number; blankMode?: boolean; forceWhiteTheme?: boolean }) {
  const { t, i18n } = useTranslation();
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const hideScrollbarTimerRef = useRef<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const relativeTimeFormatter = useMemo(
    () => new Intl.RelativeTimeFormat(i18n.language || undefined, { numeric: 'auto' }),
    [i18n.language],
  );

  const shortcutRows: Array<{ item: SearchSuggestionItem; index: number }> = [];
  const historyRows: Array<{ item: SearchSuggestionItem; index: number }> = [];
  const prefixRows: Array<{ item: SearchSuggestionItem; index: number }> = [];
  const calculatorRows: Array<{ item: SearchSuggestionItem; index: number }> = [];
  items.forEach((item, index) => {
    if (item.type === 'engine-prefix') {
      prefixRows.push({ item, index });
      return;
    }
    if (item.type === 'calculator') {
      calculatorRows.push({ item, index });
      return;
    }
    if (item.type === 'shortcut') {
      shortcutRows.push({ item, index });
      return;
    }
    historyRows.push({ item, index });
  });

  const sectionCount = Number(shortcutRows.length > 0) + Number(historyRows.length > 0);
  const visualRowCount = items.length + sectionCount;
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

  const sectionTitleClass = `text-[12px] ${
    forceWhiteTheme ? 'text-black/45' : (blankMode ? 'text-white/60' : 'text-muted-foreground')
  }`;
  const rowClass = (index: number) => `w-full text-left px-1 h-[32px] flex items-center text-[14px] rounded-[10px] transition-[background-color,color] overflow-hidden ${
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
  const renderSuggestionRow = ({ item, index }: { item: SearchSuggestionItem; index: number }) => {
    if (item.type === 'calculator') {
      return (
        <button
          key={`${item.type}-${item.label}-${index}`}
          type="button"
          data-selected={index === selectedIndex}
          className={rowClass(index)}
          onMouseEnter={() => onHighlight?.(index)}
          onClick={() => onSelect(item)}
        >
          <span className="relative shrink-0 mr-2 flex items-center justify-center" style={{ width: 24, height: 24 }}>
            <RiCalculatorLine className={`size-3.5 ${secondaryTextClass}`} />
          </span>
          <span className="truncate flex-1 min-w-0">
            <span className="truncate">{item.label}</span>
            <span className={`ml-2 ${secondaryTextClass}`}>= {item.formattedValue || item.value}</span>
          </span>
        </button>
      );
    }

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
          <span className="truncate flex-1 min-w-0">{hintText}</span>
          <RiArrowRightSLine className={`ml-2 size-4 shrink-0 ${secondaryTextClass}`} />
        </button>
      );
    }

    const shortcutDomain = item.type === 'shortcut' ? extractDomainFromUrl(item.value) : '';
    const showShortcutDomain = Boolean(shortcutDomain) && shortcutDomain !== item.label;
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
          {item.type === 'shortcut' ? (
            <ShortcutIcon icon={item.icon || ''} url={item.value} size={24} exact />
          ) : (
            isUrl(item.value)
              ? <RiLinkM className={`size-3.5 ${secondaryTextClass}`} />
              : <RiHistoryFill className={`size-3.5 ${secondaryTextClass}`} />
          )}
        </span>
        <span className="truncate flex-1 min-w-0">
          {item.label}
          {showShortcutDomain ? <span className={`ml-2 ${secondaryTextClass}`}>{shortcutDomain}</span> : null}
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
      {items.length === 0 ? (
        <div className={`flex justify-center px-3 py-2 text-[12px] ${
          forceWhiteTheme ? 'text-black/45' : (blankMode ? 'text-white/60' : 'text-muted-foreground')
        }`}>{t('search.noHistory')}</div>
      ) : (
        <ScrollArea
          ref={scrollAreaRef}
          className="mt-1"
          style={{ height: listHeight }}
          onWheelCapture={showScrollbar}
          onTouchMoveCapture={showScrollbar}
          scrollBarClassName={`transition-opacity duration-200 ${scrollbarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <div className="flex flex-col gap-1 pr-2 w-full overflow-hidden">
            {prefixRows.length > 0 ? prefixRows.map(renderSuggestionRow) : null}
            {calculatorRows.length > 0 ? calculatorRows.map(renderSuggestionRow) : null}

            {shortcutRows.length > 0 ? (
              <>
                <div className={`px-2 py-1 ${sectionTitleClass}`}>{t('search.shortcutsTitle', { defaultValue: '快捷方式' })}</div>
                {shortcutRows.map(renderSuggestionRow)}
              </>
            ) : null}

            {historyRows.length > 0 ? (
              <>
                <div className="flex items-center justify-between px-2 py-1">
                  <div className={sectionTitleClass}>{t('search.historyTitle')}</div>
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
                {historyRows.map(renderSuggestionRow)}
              </>
            ) : null}
          </div>
        </ScrollArea>
      )}

      {items.length > 0 ? (
        <div className={`mt-2 border-t px-2 pt-2 text-[12px] flex items-center gap-4 ${
          forceWhiteTheme
            ? 'border-black/10 text-black/45'
            : (blankMode ? 'border-white/10 text-white/60' : 'border-border text-muted-foreground')
        }`}>
          <span>↑↓ {t('search.actionSelect', { defaultValue: '选择' })}</span>
          <span>↵ {t('search.actionOpen', { defaultValue: '打开' })}</span>
          <span>Esc {t('search.actionClose', { defaultValue: '关闭' })}</span>
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
  onKeyDown?: (e: React.KeyboardEvent) => void;
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
  onKeyDown, 
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
}: SearchBarProps) {
  const isImeComposingEvent = (e: React.KeyboardEvent) => {
    const native = e.nativeEvent as KeyboardEvent & { keyCode?: number; which?: number };
    return Boolean(
      native.isComposing ||
      e.key === 'Process' ||
      native.keyCode === 229 ||
      native.which === 229,
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
            onKeyDown={onKeyDown} 
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
          />
        </div>
        {showEngineSwitcher ? (
          <SearchEngineSwitcherDropdown currentEngine={searchEngine} onSelect={onEngineSelect} isOpen={dropdownOpen} />
        ) : null}
      </div>
    </div>
  );
}
