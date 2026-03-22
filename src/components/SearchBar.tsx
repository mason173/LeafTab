import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import type React from 'react';
import { SearchField, type SearchFieldValueChangeHandler } from '@/components/search/SearchField';
import { SearchSuggestionsPanel } from '@/components/search/SearchSuggestionsPanel';
import { shouldBlockSearchSubmitForIme } from '@/components/search/searchInputKeyboard';
import { resolveSearchBarTheme } from '@/components/search/searchBarTheme';
import type { SearchAction } from '@/utils/searchActions';
import { SearchEngine } from '@/types';

interface SearchBarProps {
  value: string;
  onValueChange: SearchFieldValueChangeHandler;
  onSubmit: () => void;
  searchEngine: SearchEngine;
  dropdownOpen: boolean;
  onEngineOpenChange: (open: boolean) => void;
  onEngineSelect: (engine: SearchEngine) => void;
  searchActions: SearchAction[];
  historyOpen: boolean;
  onHistoryOpen: () => void;
  onSuggestionSelect: (value: SearchAction) => void;
  onSuggestionHighlight?: (index: number) => void;
  onHistoryClear: () => void;
  onClear: () => void;
  historyRef: React.RefObject<HTMLDivElement | null>;
  placeholder?: string;
  calculatorInlinePreview?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  disablePlaceholderAnimation?: boolean;
  lightweightSearchUi?: boolean;
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
  statusNotice?: {
    tone?: 'info' | 'loading';
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  emptyStateLabel?: string;
  showSuggestionNumberHints?: boolean;
  currentBrowserTabId?: number | null;
  allowSelectedSuggestionEnter?: boolean;
}

export function SearchBar({
  value,
  onValueChange,
  onSubmit,
  searchEngine,
  dropdownOpen,
  onEngineOpenChange,
  onEngineSelect,
  searchActions,
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
  lightweightSearchUi = false,
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
  statusNotice,
  emptyStateLabel,
  showSuggestionNumberHints = false,
  currentBrowserTabId = null,
  allowSelectedSuggestionEnter = false,
}: SearchBarProps) {
  const { resolvedTheme } = useTheme();
  const theme = useMemo(() => resolveSearchBarTheme({
    blankMode,
    forceWhiteTheme,
    subtleDarkTone,
    resolvedTheme,
  }), [blankMode, forceWhiteTheme, resolvedTheme, subtleDarkTone]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (shouldBlockSearchSubmitForIme(e, { allowSelectedSuggestionEnter })) return;
    if (e.defaultPrevented) return;

    // Centralize panel shortcuts here so input shell and suggestion panel
    // share one keyboard path instead of duplicating behavior in multiple layers.
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative content-stretch flex w-full items-start" onKeyDown={handleKeyDown}>
      <div className="relative flex-1 min-w-0">
        <div className="relative" ref={historyRef}>
          <SearchField
            value={value}
            onValueChange={onValueChange}
            inputRef={inputRef}
            onFocusContainer={() => inputRef.current?.focus()}
            onOpenHistory={onHistoryOpen}
            onClear={onClear}
            placeholder={placeholder}
            inlinePreview={calculatorInlinePreview}
            disablePlaceholderAnimation={disablePlaceholderAnimation}
            lightweightPlaceholderAnimation={lightweightSearchUi}
            theme={theme}
            height={searchHeight}
            inputFontSize={searchInputFontSize}
            horizontalPadding={searchHorizontalPadding}
            searchActionSize={searchActionSize}
            surfaceStyle={searchSurfaceStyle}
            searchEngine={searchEngine}
            onEngineSelect={onEngineSelect}
            dropdownOpen={dropdownOpen}
            onEngineOpenChange={onEngineOpenChange}
            showEngineSwitcher={showEngineSwitcher}
          />
          <SearchSuggestionsPanel
            items={searchActions}
            isOpen={historyOpen}
            onSelect={onSuggestionSelect}
            onHighlight={onSuggestionHighlight}
            onClear={onHistoryClear}
            selectedIndex={historySelectedIndex}
            theme={theme}
            statusNotice={statusNotice}
            showNumberHints={showSuggestionNumberHints}
            currentBrowserTabId={currentBrowserTabId}
            emptyStateLabel={emptyStateLabel}
            lightweight={lightweightSearchUi}
          />
        </div>
      </div>
    </div>
  );
}
