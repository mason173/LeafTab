import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RiArrowRightLine, RiHistoryFill, RiLinkM } from '@remixicon/react';
import { isUrl } from '../utils';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { SearchEngine } from '../types';
import ShortcutIcon from './ShortcutIcon';
import {
  SearchEngineSwitcherDropdown,
  SearchEngineSwitcherTrigger,
} from './search/SearchEngineSwitcher';

import svgPaths from "../imports/svg-ccxie0sl7t";

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
  const showLinkIcon = isUrl(value);

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
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder || t('search.placeholder')}
        className={`border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto px-0 py-[1px] font-['PingFang_SC:Regular',sans-serif] not-italic w-full rounded-none ${
          subtleDarkTone
            ? 'bg-transparent dark:bg-transparent text-black/85 placeholder:text-black/30'
            : (forceWhiteTheme
            ? 'bg-transparent dark:bg-transparent text-black/85 placeholder:text-black/40'
            : (blankMode
              ? 'bg-transparent dark:bg-transparent text-white/80 placeholder:text-white/40'
              : 'bg-transparent dark:bg-transparent text-foreground placeholder:text-muted-foreground'))
        }`}
        style={{ fontSize: inputFontSize, lineHeight: `${Math.round(inputFontSize * 1.35)}px` }}
      />
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute inset-[16.65%]" data-name="Group">
      <div className="absolute inset-[-4.69%]">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17.5067 17.5067">
          <g id="Group">
            <circle cx="7.81194" cy="7.81194" id="Oval" r="7.06194" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            <path d={svgPaths.p32bacc00} id="Path" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function InterfaceEssentialSearchLoupe() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="Interface, Essential/search-loupe">
      <Group1 />
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
  onSearch,
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
  onSearch: () => void;
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
  const isInputUrl = isUrl(value);
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
      <div 
        className={`flex items-center justify-center relative rounded-[999px] shrink-0 transition-colors cursor-pointer ${
          subtleDarkTone
            ? 'text-black/30 hover:text-black/45 hover:bg-black/8'
            : (forceWhiteTheme
            ? 'text-black/45 hover:text-white hover:bg-black/80'
            : (blankMode
              ? 'text-white/40 hover:text-white/80 hover:bg-white/10'
              : 'text-muted-foreground hover:text-primary-foreground hover:bg-primary'))
        }`}
        style={{ width: searchActionSize, height: searchActionSize }}
        onClick={(e) => {
          e.stopPropagation();
          onSearch();
        }}
      >
        {isInputUrl ? (
          <RiArrowRightLine className="size-5" />
        ) : (
          <InterfaceEssentialSearchLoupe />
        )}
      </div>
    </div>
  );
}

type SuggestionItem = { type: 'history' | 'shortcut'; label: string; value: string; icon?: string };

function SearchHistoryDropdown({ items, isOpen, onSelect, onClear, selectedIndex = -1, blankMode, forceWhiteTheme }: { items: SuggestionItem[]; isOpen: boolean; onSelect: (value: SuggestionItem) => void; onClear: () => void; selectedIndex?: number; blankMode?: boolean; forceWhiteTheme?: boolean }) {
  const { t } = useTranslation();
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const hideScrollbarTimerRef = useRef<number | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const canScroll = items.length > 6;
  const visibleCount = Math.min(items.length, 6);
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

  return (
    <div className={`absolute left-0 right-0 p-[8px] rounded-[20px] top-[calc(100%+8px)] z-[500] border ${
      forceWhiteTheme
        ? 'bg-white text-black/85 border-black/10 shadow-lg'
        : (blankMode
          ? 'bg-background/15 backdrop-blur-xl border-white/10 text-white/80'
          : 'bg-popover text-popover-foreground border-border')
    }`}>
      <div className="flex items-center justify-between px-2 py-1">
        <div className={`text-[12px] ${
          forceWhiteTheme ? 'text-black/45' : (blankMode ? 'text-white/60' : 'text-muted-foreground')
        }`}>{t('search.historyTitle')}</div>
        {items.length > 0 && (
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
        )}
      </div>
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
            {items.map((item, index) => (
              <button
                key={`${item.label}-${item.value}-${index}`}
                type="button"
                data-selected={index === selectedIndex}
                className={`w-full text-left px-3 h-[32px] flex items-center text-[14px] rounded-[10px] transition-[background-color,color] overflow-hidden ${
                  forceWhiteTheme
                    ? `text-black/85 hover:bg-black/5 hover:text-black focus:bg-black/5 focus:text-black ${index === selectedIndex ? 'bg-black/8 text-black' : ''}`
                    : (blankMode
                      ? `text-white/80 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white ${index === selectedIndex ? 'bg-white/10 text-white' : ''}`
                      : `text-foreground hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground ${index === selectedIndex ? 'bg-accent text-foreground' : ''}`)
                }`}
                onClick={() => onSelect(item)}
              >
                <span className="truncate flex-1 w-0">{item.label}</span>
                {item.type === 'shortcut' ? (
                  <div className="relative shrink-0 ml-2" style={{ width: 24, height: 24 }}>
                    <ShortcutIcon icon={item.icon || ''} url={item.value} size={24} exact />
                  </div>
                ) : (
                  isUrl(item.value) 
                    ? <RiLinkM className={`size-3.5 ml-2 shrink-0 ${
                      forceWhiteTheme ? 'text-black/45' : (blankMode ? 'text-white/60' : 'text-muted-foreground')
                    }`} />
                    : <RiHistoryFill className={`size-3.5 ml-2 shrink-0 ${
                      forceWhiteTheme ? 'text-black/45' : (blankMode ? 'text-white/60' : 'text-muted-foreground')
                    }`} />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
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
  suggestionItems: SuggestionItem[];
  historyOpen: boolean;
  onHistoryOpen: () => void;
  onSuggestionSelect: (value: SuggestionItem) => void;
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
  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
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
            onSearch={onSubmit} 
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
