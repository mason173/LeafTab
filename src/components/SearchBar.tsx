import { memo, useCallback, type CSSProperties, type KeyboardEvent, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import { useFrostedSurfaceTheme } from '@/components/frosted/useFrostedSurfaceTheme';
import { useStableElementState } from '@/hooks/useStableElementState';
import { SearchField, type SearchFieldValueChangeHandler } from '@/components/search/SearchField';
import type { SearchBarTheme } from '@/components/search/searchBarTheme';
import { SearchSuggestionsPanel } from '@/components/search/SearchSuggestionsPanel';
import type { SearchSuggestionsPlacement } from '@/components/search/SearchSuggestionsPanel.shared';
import { shouldBlockSearchSubmitForIme } from '@/components/search/searchInputKeyboard';
import type { SearchAction, SearchSecondaryAction } from '@/utils/searchActions';
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
  historyRef: MutableRefObject<HTMLDivElement | null>;
  placeholder?: string;
  calculatorInlinePreview?: string;
  onKeyDown?: (e: KeyboardEvent) => void;
  disablePlaceholderAnimation?: boolean;
  lightweightSearchUi?: boolean;
  historySelectedIndex?: number;
  inputRef: RefObject<HTMLInputElement | null>;
  blankMode?: boolean;
  forceWhiteTheme?: boolean;
  searchHeight?: number;
  searchInputFontSize?: number;
  searchHorizontalPadding?: number;
  searchActionSize?: number;
  searchSurfaceStyle?: CSSProperties;
  searchSurfaceTone?: 'default' | 'drawer';
  subtleDarkTone?: boolean;
  showEngineSwitcher?: boolean;
  leadingAccessory?: ReactNode;
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
  interactionDisabled?: boolean;
  actionModeActive?: boolean;
  selectedSecondaryActionIndex?: number;
  pendingConfirmationActionKey?: string | null;
  onSecondaryActionSelect?: (action: SearchAction, secondaryAction: SearchSecondaryAction, index: number) => void;
}

type SearchInputShellProps = {
  value: string;
  onValueChange: SearchFieldValueChangeHandler;
  inputRef: RefObject<HTMLInputElement | null>;
  onInputFocus?: () => void;
  onHistoryOpen: () => void;
  onClear: () => void;
  placeholder?: string;
  calculatorInlinePreview?: string;
  disablePlaceholderAnimation?: boolean;
  lightweightSearchUi?: boolean;
  theme: SearchBarTheme;
  searchHeight: number;
  searchInputFontSize: number;
  searchHorizontalPadding: number;
  searchActionSize: number;
  searchSurfaceStyle?: CSSProperties;
  searchSurfaceTone: 'default' | 'drawer';
  searchEngine: SearchEngine;
  onEngineSelect: (engine: SearchEngine) => void;
  dropdownOpen: boolean;
  onEngineOpenChange: (open: boolean) => void;
  showEngineSwitcher: boolean;
  leadingAccessory?: ReactNode;
  panelExpanded: boolean;
  interactionDisabled: boolean;
};

const SearchInputShell = memo(function SearchInputShell({
  value,
  onValueChange,
  inputRef,
  onInputFocus,
  onHistoryOpen,
  onClear,
  placeholder,
  calculatorInlinePreview,
  disablePlaceholderAnimation = false,
  lightweightSearchUi = false,
  theme,
  searchHeight,
  searchInputFontSize,
  searchHorizontalPadding,
  searchActionSize,
  searchSurfaceStyle,
  searchSurfaceTone,
  searchEngine,
  onEngineSelect,
  dropdownOpen,
  onEngineOpenChange,
  showEngineSwitcher,
  leadingAccessory,
  panelExpanded,
  interactionDisabled,
}: SearchInputShellProps) {
  return (
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
      interactionDisabled={interactionDisabled}
      searchEngine={searchEngine}
      onEngineSelect={onEngineSelect}
      dropdownOpen={dropdownOpen}
      onEngineOpenChange={onEngineOpenChange}
      showEngineSwitcher={showEngineSwitcher}
      leadingAccessory={leadingAccessory}
      panelExpanded={panelExpanded}
    />
  );
});

type SearchSuggestionsSurfaceProps = {
  searchActions: SearchAction[];
  historyOpen: boolean;
  onSuggestionSelect: (value: SearchAction) => void;
  onSuggestionHighlight?: (index: number) => void;
  onHistoryClear: () => void;
  historySelectedIndex?: number;
  theme: SearchBarTheme;
  statusNotice?: {
    tone?: 'info' | 'loading';
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  showSuggestionNumberHints: boolean;
  currentBrowserTabId: number | null;
  emptyStateLabel?: string;
  lightweightSearchUi: boolean;
  suggestionsPlacement: SearchSuggestionsPlacement;
  searchSurfaceTone: 'default' | 'drawer';
  actionModeActive: boolean;
  selectedSecondaryActionIndex: number;
  pendingConfirmationActionKey: string | null;
  onSecondaryActionSelect?: (action: SearchAction, secondaryAction: SearchSecondaryAction, index: number) => void;
};

const SearchSuggestionsSurface = memo(function SearchSuggestionsSurface({
  searchActions,
  historyOpen,
  onSuggestionSelect,
  onSuggestionHighlight,
  onHistoryClear,
  historySelectedIndex,
  theme,
  statusNotice,
  showSuggestionNumberHints,
  currentBrowserTabId,
  emptyStateLabel,
  lightweightSearchUi,
  suggestionsPlacement,
  searchSurfaceTone,
  actionModeActive,
  selectedSecondaryActionIndex,
  pendingConfirmationActionKey,
  onSecondaryActionSelect,
}: SearchSuggestionsSurfaceProps) {
  return (
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
      actionModeActive={actionModeActive}
      selectedSecondaryActionIndex={selectedSecondaryActionIndex}
      pendingConfirmationActionKey={pendingConfirmationActionKey}
      onSecondaryActionSelect={onSecondaryActionSelect}
    />
  );
});

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
  leadingAccessory,
  statusNotice,
  emptyStateLabel,
  showSuggestionNumberHints = false,
  currentBrowserTabId = null,
  allowSelectedSuggestionEnter = false,
  suggestionsPlacement = 'bottom',
  interactionDisabled = false,
  actionModeActive = false,
  selectedSecondaryActionIndex = 0,
  pendingConfirmationActionKey = null,
  onSecondaryActionSelect,
}: SearchBarProps) {
  const [surfaceNode, attachHistoryRef] = useStableElementState<HTMLDivElement>({ ref: historyRef });
  const { theme } = useFrostedSurfaceTheme({
    surfaceNode,
    surfaceTone: searchSurfaceTone,
    blankMode,
    forceWhiteTheme,
    subtleDarkTone,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (shouldBlockSearchSubmitForIme(e, { allowSelectedSuggestionEnter })) return;
    if (e.defaultPrevented) return;

    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  }, [allowSelectedSuggestionEnter, onKeyDown, onSubmit]);

  return (
    <div
      className="relative content-stretch flex w-full items-start"
      data-search-ui="true"
      onKeyDown={handleKeyDown}
      aria-disabled={interactionDisabled}
    >
      <div className="relative flex-1 min-w-0">
        <div className="relative" ref={attachHistoryRef}>
          <SearchInputShell
            value={value}
            onValueChange={onValueChange}
            inputRef={inputRef}
            onInputFocus={onInputFocus}
            onHistoryOpen={onHistoryOpen}
            onClear={onClear}
            placeholder={placeholder}
            calculatorInlinePreview={calculatorInlinePreview}
            disablePlaceholderAnimation={disablePlaceholderAnimation}
            lightweightSearchUi={lightweightSearchUi}
            theme={theme}
            searchHeight={searchHeight}
            searchInputFontSize={searchInputFontSize}
            searchHorizontalPadding={searchHorizontalPadding}
            searchActionSize={searchActionSize}
            searchSurfaceStyle={searchSurfaceStyle}
            searchSurfaceTone={searchSurfaceTone}
            searchEngine={searchEngine}
            onEngineSelect={onEngineSelect}
            dropdownOpen={dropdownOpen}
            onEngineOpenChange={onEngineOpenChange}
            showEngineSwitcher={showEngineSwitcher}
            leadingAccessory={leadingAccessory}
            panelExpanded={historyOpen || dropdownOpen}
            interactionDisabled={interactionDisabled}
          />
          <SearchSuggestionsSurface
            searchActions={searchActions}
            historyOpen={historyOpen}
            onSuggestionSelect={onSuggestionSelect}
            onSuggestionHighlight={onSuggestionHighlight}
            onHistoryClear={onHistoryClear}
            historySelectedIndex={historySelectedIndex}
            theme={theme}
            statusNotice={statusNotice}
            showSuggestionNumberHints={showSuggestionNumberHints}
            currentBrowserTabId={currentBrowserTabId}
            emptyStateLabel={emptyStateLabel}
            lightweightSearchUi={lightweightSearchUi}
            suggestionsPlacement={suggestionsPlacement}
            searchSurfaceTone={searchSurfaceTone}
            actionModeActive={actionModeActive}
            selectedSecondaryActionIndex={selectedSecondaryActionIndex}
            pendingConfirmationActionKey={pendingConfirmationActionKey}
            onSecondaryActionSelect={onSecondaryActionSelect}
          />
        </div>
      </div>
    </div>
  );
}
