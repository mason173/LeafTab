import { useCallback, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import type React from 'react';
import { SearchField, type SearchFieldValueChangeHandler } from '@/components/search/SearchField';
import { SearchSuggestionsPanel } from '@/components/search/SearchSuggestionsPanel';
import type { SearchSuggestionsPlacement } from '@/components/search/SearchSuggestionsPanel.shared';
import { shouldBlockSearchSubmitForIme } from '@/components/search/searchInputKeyboard';
import { resolveSearchBarTheme } from '@/components/search/searchBarTheme';
import { useWallpaperBackdropSnapshot } from '@/components/wallpaper/WallpaperBackdropContext';
import { useWallpaperRegionLuminance } from '@/components/search/useWallpaperRegionLuminance';
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
  onInputFocus?: () => void;
  onSuggestionSelect: (value: SearchAction) => void;
  onSuggestionHighlight?: (index: number) => void;
  onHistoryClear: () => void;
  onClear: () => void;
  historyRef: React.MutableRefObject<HTMLDivElement | null>;
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
  searchSurfaceTone?: 'default' | 'drawer';
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
  suggestionsPlacement?: SearchSuggestionsPlacement;
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
  onInputFocus,
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
  searchSurfaceTone = 'default',
  subtleDarkTone,
  showEngineSwitcher = true,
  statusNotice,
  emptyStateLabel,
  showSuggestionNumberHints = false,
  currentBrowserTabId = null,
  allowSelectedSuggestionEnter = false,
  suggestionsPlacement = 'bottom',
}: SearchBarProps) {
  const { resolvedTheme } = useTheme();
  const wallpaperBackdrop = useWallpaperBackdropSnapshot();
  const [surfaceNode, setSurfaceNode] = useState<HTMLDivElement | null>(null);
  const regionLuminance = useWallpaperRegionLuminance(surfaceNode, searchSurfaceTone !== 'drawer');
  const attachHistoryRef = useCallback((node: HTMLDivElement | null) => {
    setSurfaceNode(node);
    historyRef.current = node;
  }, [historyRef]);
  const backgroundLuminanceStats = useMemo(() => {
    if (searchSurfaceTone === 'drawer') {
      return {
        average: 0,
        p15: 0,
        p85: 0,
      };
    }

    if (!regionLuminance) {
      return null;
    }

    const maskOpacity = Math.max(0, Math.min(1, (wallpaperBackdrop?.effectiveWallpaperMaskOpacity ?? 0) / 100));

    const maskMultiplier = 1 - maskOpacity;
    return {
      average: regionLuminance.average * maskMultiplier,
      p15: regionLuminance.p15 * maskMultiplier,
      p85: regionLuminance.p85 * maskMultiplier,
    };
  }, [
    regionLuminance,
    searchSurfaceTone,
    wallpaperBackdrop?.effectiveWallpaperMaskOpacity,
  ]);
  const backgroundLuminance = backgroundLuminanceStats?.average ?? null;
  const backgroundLuminanceRange = useMemo(() => (
    backgroundLuminanceStats
      ? {
          darkest: backgroundLuminanceStats.p15,
          brightest: backgroundLuminanceStats.p85,
        }
      : null
  ), [backgroundLuminanceStats]);
  const theme = useMemo(() => resolveSearchBarTheme({
    blankMode,
    forceWhiteTheme,
    subtleDarkTone,
    resolvedTheme,
    backgroundLuminance,
    backgroundLuminanceRange,
  }), [backgroundLuminance, backgroundLuminanceRange, blankMode, forceWhiteTheme, resolvedTheme, subtleDarkTone]);

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
        <div className="relative" ref={attachHistoryRef}>
          <SearchField
            value={value}
            onValueChange={onValueChange}
            inputRef={inputRef}
            onFocusContainer={() => inputRef.current?.focus()}
            onInputFocus={onInputFocus}
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
            surfaceTone={searchSurfaceTone}
            searchEngine={searchEngine}
            onEngineSelect={onEngineSelect}
            dropdownOpen={dropdownOpen}
            onEngineOpenChange={onEngineOpenChange}
            showEngineSwitcher={showEngineSwitcher}
            panelExpanded={historyOpen || dropdownOpen}
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
            placement={suggestionsPlacement}
            surfaceTone={searchSurfaceTone}
          />
        </div>
      </div>
    </div>
  );
}
