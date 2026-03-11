import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RiArrowRightLine, RiHistoryFill, RiLinkM } from '@remixicon/react';
import { isUrl } from '../utils';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { SearchEngine, SearchEngineConfig } from '../types';
import ShortcutIcon from './ShortcutIcon';

import googleIcon from '../assets/google.svg';
import bingIcon from '../assets/bing.svg';
import baiduIcon from '../assets/baidu.svg';
import sougouIcon from '../assets/sougou.svg';
import search360Icon from '../assets/360search.svg';
import duckduckgoIcon from '../assets/duckduckgo.svg';
import yandexIcon from '../assets/yandex.svg';
import searchIcon from '../assets/searchicon.svg';
import svgPaths from "../imports/svg-ccxie0sl7t";

export const searchEngines: Record<SearchEngine, SearchEngineConfig> = {
  google: {
    name: 'Google',
    url: 'https://www.google.com/search?q=',
  },
  bing: {
    name: 'Bing',
    url: 'https://www.bing.com/search?q=',
  },
  baidu: {
    name: 'Baidu',
    url: 'https://www.baidu.com/s?wd=',
  },
  sougou: {
    name: 'Sogou',
    url: 'https://www.sogou.com/web?query=',
  },
  '360': {
    name: '360',
    url: 'https://www.so.com/s?q=',
  },
  duckduckgo: {
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
  },
  yandex: {
    name: 'Yandex',
    url: 'https://yandex.com/search/?text=',
  },
};

function Search360Icon() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="360">
      <div className="absolute inset-0 flex items-center justify-center">
        <img alt="" className="size-[24px] object-contain pointer-events-none" src={search360Icon} />
      </div>
    </div>
  );
}

function DuckDuckGoIcon() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="duckduckgo">
      <div className="absolute inset-0 flex items-center justify-center">
        <img alt="" className="size-[24px] object-contain pointer-events-none" src={duckduckgoIcon} />
      </div>
    </div>
  );
}

function YandexIcon() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="yandex">
      <div className="absolute inset-0 flex items-center justify-center">
        <img alt="" className="size-[24px] object-contain pointer-events-none" src={yandexIcon} />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="google">
      <div className="absolute inset-0 flex items-center justify-center">
        <img alt="" className="size-[24px] object-contain pointer-events-none" src={googleIcon} />
      </div>
    </div>
  );
}

function BingIcon() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="bing">
      <div className="absolute inset-0 flex items-center justify-center">
        <img alt="" className="size-[24px] object-contain pointer-events-none" src={bingIcon} />
      </div>
    </div>
  );
}

function BaiduIcon() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="baidu">
      <div className="absolute inset-0 flex items-center justify-center">
        <img alt="" className="size-[24px] object-contain pointer-events-none" src={baiduIcon} />
      </div>
    </div>
  );
}

function SougouIcon() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="sougou">
      <div className="absolute inset-0 flex items-center justify-center">
        <img alt="" className="size-[24px] object-contain pointer-events-none" src={sougouIcon} />
      </div>
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents inset-0" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="Group">
          <g id="Path" />
          <path d="M14 8L10 12L14 16" id="Path_2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}

function InterfaceEssentialArrow() {
  return (
    <div className="relative size-[24px]" data-name="Interface, Essential/Arrow">
      <Group />
    </div>
  );
}

function DefaultSearchIcon() {
  return (
    <div className="relative shrink-0 size-[24px]" data-name="search">
      <div className="absolute inset-0 flex items-center justify-center">
        <img alt="" className="size-[24px] object-contain pointer-events-none" src={searchIcon} />
      </div>
    </div>
  );
}

// 搜索引擎选择按钮
function SearchEngineButton({ engine, onClick, minimalistMode }: { engine: SearchEngine; onClick?: () => void; minimalistMode?: boolean }) {
  const getIcon = () => {
    // Default to the generic search icon for compliance
    // The user requested to use the specific searchicon.svg
    return <DefaultSearchIcon />;
    
    /* 
    switch (engine) {
      case 'google':
        return <GoogleIcon />;
      case 'bing':
        return <BingIcon />;
      case 'baidu':
        return <BaiduIcon />;
      case 'sougou':
        return <SougouIcon />;
      case '360':
        return <Search360Icon />;
      case 'duckduckgo':
        return <DuckDuckGoIcon />;
      case 'yandex':
        return <YandexIcon />;
    }
    */
  };

  return (
    <div 
      className={`content-stretch flex gap-[10px] items-center px-[24px] relative rounded-bl-[999px] rounded-tl-[999px] self-stretch shrink-0 h-[52px] w-[72px] cursor-default ${
        minimalistMode 
          ? 'bg-black/20 backdrop-blur-md text-white/56' 
          : 'bg-secondary text-foreground'
      }`} 
      // onClick={onClick} // Disable click
    >
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none rounded-bl-[999px] rounded-tl-[999px] transition-colors" />
      {getIcon()}
      {/* Remove Arrow for compliance */}
      {/* <div className="flex items-center justify-center relative shrink-0 size-[24px]" style={{ "--transform-inner-width": "1185", "--transform-inner-height": "19" } as React.CSSProperties}>
        <div className="-rotate-90 flex-none">
          <InterfaceEssentialArrow />
        </div>
      </div> */}
    </div>
  );
}

function Frame3({ value, onChange, inputRef, onFocus, placeholder, onKeyDown, minimalistMode }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; inputRef: React.RefObject<HTMLInputElement | null>; onFocus: () => void; placeholder?: string; onKeyDown?: (e: React.KeyboardEvent) => void; minimalistMode?: boolean }) {
  const { t } = useTranslation();
  const showLinkIcon = isUrl(value);

  return (
    <div className="content-stretch flex items-center relative flex-1 min-w-0 gap-2">
      {showLinkIcon && (
        <RiLinkM className={`size-4 shrink-0 ${minimalistMode ? 'text-white/40' : 'text-muted-foreground'}`} />
      )}
      <Input 
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        placeholder={placeholder || t('search.placeholder')}
        className={`border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 h-auto px-0 py-0 font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic text-[18px] w-full rounded-none ${
          minimalistMode 
            ? 'bg-transparent dark:bg-transparent text-white/80 placeholder:text-white/40'
            : 'bg-transparent dark:bg-transparent text-foreground placeholder:text-muted-foreground'
        }`}
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

function Frame2({ value, onChange, inputRef, onFocusContainer, onOpenHistory, onClear, onSearch, placeholder, onKeyDown, minimalistMode }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; inputRef: React.RefObject<HTMLInputElement | null>; onFocusContainer: () => void; onOpenHistory: () => void; onClear: () => void; onSearch: () => void; placeholder?: string; onKeyDown?: (e: React.KeyboardEvent) => void; minimalistMode?: boolean }) {
  const { t } = useTranslation();
  const isInputUrl = isUrl(value);
  
  return (
    <div
      className={`content-stretch flex gap-[10px] items-center pl-[24px] pr-[14px] relative rounded-[999px] self-stretch w-full h-[52px] min-w-0 group cursor-text ${
        minimalistMode ? 'bg-black/20 backdrop-blur-md text-white/56' : 'bg-secondary text-foreground'
      }`}
      onClick={() => {
        onFocusContainer();
        onOpenHistory();
      }}
    >
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none rounded-[999px] transition-colors" />
      <Frame3 value={value} onChange={onChange} inputRef={inputRef} onFocus={onOpenHistory} placeholder={placeholder} onKeyDown={onKeyDown} minimalistMode={minimalistMode} />
      {value.length > 0 && (
        <button
          type="button"
          aria-label={t('common.clear')}
          title={t('common.clear')}
          className={`flex items-center justify-center relative rounded-[999px] shrink-0 size-[32px] transition-colors ${
            minimalistMode 
              ? 'text-white/40 hover:text-white/80' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
            inputRef.current?.focus();
            onOpenHistory();
          }}
        >
          <span className="text-[18px] leading-none">×</span>
        </button>
      )}
      <div 
        className={`flex items-center justify-center relative rounded-[999px] shrink-0 size-[42px] transition-colors cursor-pointer ${
          minimalistMode 
            ? 'text-white/40 hover:text-white/80 hover:bg-white/10' 
            : 'text-muted-foreground hover:text-primary-foreground hover:bg-primary'
        }`}
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

// 搜索引擎下拉框
function SearchEngineDropdown({ currentEngine, onSelect, isOpen }: { currentEngine: SearchEngine; onSelect: (engine: SearchEngine) => void; isOpen: boolean }) {
  if (!isOpen) return null;

  const engines: { id: SearchEngine; name: string; icon: string }[] = [
    { id: 'bing', name: 'Bing', icon: bingIcon },
    { id: 'google', name: 'Google', icon: googleIcon },
    { id: 'baidu', name: 'Baidu', icon: baiduIcon },
    { id: 'sougou', name: 'Sogou', icon: sougouIcon },
    { id: '360', name: '360', icon: search360Icon },
    { id: 'duckduckgo', name: 'DuckDuckGo', icon: duckduckgoIcon },
    { id: 'yandex', name: 'Yandex', icon: yandexIcon },
  ];

  return (
    <div className="absolute bg-popover content-stretch flex flex-col items-start left-0 p-[8px] rounded-[16px] top-[calc(100%+8px)] w-[193px] z-50 text-popover-foreground border border-border shadow-lg max-h-[300px] overflow-y-auto" data-name="DropDown">
      {engines.map((engine) => (
        <div 
          key={engine.id}
          className={`relative rounded-[10px] shrink-0 w-full cursor-pointer ${currentEngine === engine.id ? 'bg-accent' : ''} hover:bg-accent transition-colors`}
          onClick={() => onSelect(engine.id)}
        >
          <div className="flex flex-row items-center size-full">
            <div className="content-stretch flex items-center justify-between p-[8px] relative w-full">
              <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
                <div className="relative rounded-[8px] shrink-0 size-[24px]">
                  <div aria-hidden="true" className="absolute border border-border border-solid inset-0 pointer-events-none rounded-[8px]" />
                  <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[16px] top-1/2" data-name={engine.id}>
                    <img alt="" className="absolute inset-0 max-w-none object-contain pointer-events-none size-full" src={engine.icon} />
                  </div>
                </div>
                <p className="font-['PingFang_SC:Medium',sans-serif] leading-none not-italic relative shrink-0 text-foreground text-[14px]">{engine.name}</p>
              </div>
              <div className="relative shrink-0 size-[4px]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 4 4">
                  <circle cx="2" cy="2" fill="currentColor" className="text-primary" id="Ellipse 1" r="2" opacity={currentEngine === engine.id ? 1 : 0} />
                </svg>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

type SuggestionItem = { type: 'history' | 'shortcut'; label: string; value: string; icon?: string };

function SearchHistoryDropdown({ items, isOpen, onSelect, onClear, selectedIndex = -1, minimalistMode }: { items: SuggestionItem[]; isOpen: boolean; onSelect: (value: SuggestionItem) => void; onClear: () => void; selectedIndex?: number; minimalistMode?: boolean }) {
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
    <div className={`absolute left-0 right-0 p-[8px] rounded-[16px] top-[calc(100%+8px)] z-[500] border ${
      minimalistMode 
        ? 'bg-background/15 backdrop-blur-xl border-white/10 text-white/80' 
        : 'bg-popover text-popover-foreground border-border'
    }`}>
      <div className="flex items-center justify-between px-2 py-1">
        <div className={`text-[12px] ${minimalistMode ? 'text-white/60' : 'text-muted-foreground'}`}>{t('search.historyTitle')}</div>
        {items.length > 0 && (
          <button
            type="button"
            className={`text-[12px] transition-colors ${
              minimalistMode 
                ? 'text-white/60 hover:text-white/90' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={onClear}
          >
            {t('search.clearHistory')}
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className={`flex justify-center px-3 py-2 text-[12px] ${minimalistMode ? 'text-white/60' : 'text-muted-foreground'}`}>{t('search.noHistory')}</div>
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
                  minimalistMode
                    ? `text-white/80 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white ${index === selectedIndex ? 'bg-white/10 text-white' : ''}`
                    : `text-foreground hover:bg-accent hover:text-foreground focus:bg-accent focus:text-foreground ${index === selectedIndex ? 'bg-accent text-foreground' : ''}`
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
                    ? <RiLinkM className={`size-3.5 ml-2 shrink-0 ${minimalistMode ? 'text-white/60' : 'text-muted-foreground'}`} />
                    : <RiHistoryFill className={`size-3.5 ml-2 shrink-0 ${minimalistMode ? 'text-white/60' : 'text-muted-foreground'}`} />
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
  minimalistMode?: boolean;
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
  minimalistMode 
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
      {/* <div className="relative" ref={dropdownRef}>
        <SearchEngineButton engine={searchEngine} onClick={undefined} minimalistMode={minimalistMode} />
        <SearchEngineDropdown currentEngine={searchEngine} onSelect={onEngineSelect} isOpen={dropdownOpen} />
      </div> */}
      <div className="relative flex-1 min-w-0" ref={historyRef}>
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
          minimalistMode={minimalistMode} 
        />
        <SearchHistoryDropdown 
          items={suggestionItems} 
          isOpen={historyOpen} 
          onSelect={onSuggestionSelect} 
          onClear={onHistoryClear} 
          selectedIndex={historySelectedIndex} 
          minimalistMode={minimalistMode} 
        />
      </div>
    </div>
  );
}
