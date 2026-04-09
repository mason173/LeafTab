import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchExperience } from '@/components/search/SearchExperience';

const mockOpenHistoryPanel = vi.fn();
const mockCloseHistoryPanel = vi.fn();
const mockHandleSearchChange = vi.fn();

let mockUseSearchResult: ReturnType<typeof buildUseSearchResult>;

function buildUseSearchResult() {
  return {
    searchValue: 'leaf',
    setSearchValue: vi.fn(),
    searchHistory: [],
    setSearchHistory: vi.fn(),
    historySelectedIndex: -1,
    setHistorySelectedIndex: vi.fn(),
    searchEngine: 'system' as const,
    setSearchEngine: vi.fn(),
    dropdownOpen: false,
    setDropdownOpen: vi.fn(),
    historyOpen: true,
    openHistoryPanel: mockOpenHistoryPanel,
    closeHistoryPanel: mockCloseHistoryPanel,
    syncHistorySelectionByCount: vi.fn(),
    handleSearchChange: mockHandleSearchChange,
    filteredHistoryItems: [],
    handleSearch: vi.fn(),
    handleEngineSelect: vi.fn(),
    cycleSearchEngine: vi.fn(),
    openSearchWithQuery: vi.fn(),
  };
}

vi.mock('@/components/SearchBar', () => ({
  SearchBar: ({
    historyRef,
    inputRef,
    onInputFocus,
    onValueChange,
    value,
  }: {
    historyRef: React.RefObject<HTMLDivElement | null>;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onInputFocus?: () => void;
    onValueChange: (nextValue: string, nativeEvent?: Event) => void;
    value: string;
  }) => (
    <div ref={historyRef}>
      <input
        data-testid="search-input"
        ref={inputRef}
        value={value}
        onFocus={onInputFocus}
        onChange={(event) => onValueChange(event.target.value, event.nativeEvent)}
      />
    </div>
  ),
}));

vi.mock('@/hooks/useSearch', () => ({
  useSearch: () => mockUseSearchResult,
}));

vi.mock('@/hooks/useSearchSuggestions', () => ({
  useSearchSuggestions: () => ({
    actions: [],
    sourceStatus: {
      bookmarkLoading: false,
      browserHistoryLoading: false,
      tabLoading: false,
    },
  }),
}));

vi.mock('@/hooks/useRotatingText', () => ({
  useRotatingText: () => '',
}));

vi.mock('@/hooks/useSearchInteractionController', () => ({
  useSearchInteractionController: () => ({
    suggestionModifierHeld: false,
    handleSuggestionKeyDown: vi.fn(),
  }),
}));

describe('SearchExperience outside dismiss behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockOpenHistoryPanel.mockReset();
    mockCloseHistoryPanel.mockReset();
    mockHandleSearchChange.mockReset();
    mockUseSearchResult = buildUseSearchResult();
  });

  it('keeps the input focused after outside dismiss without reopening the panel immediately', () => {
    const inputRef = { current: null as HTMLInputElement | null };

    render(
      <SearchExperience
        inputRef={inputRef}
        openInNewTab={false}
        shortcuts={[]}
        tabSwitchSearchEngine={false}
        searchPrefixEnabled
        searchSiteDirectEnabled
        searchSiteShortcutEnabled
        searchAnyKeyCaptureEnabled={false}
        searchCalculatorEnabled={false}
        searchRotatingPlaceholderEnabled={false}
        searchHeight={52}
        searchInputFontSize={18}
        searchHorizontalPadding={24}
        searchActionSize={42}
      />,
    );

    const input = screen.getByTestId('search-input');

    act(() => {
      vi.runOnlyPendingTimers();
    });

    mockOpenHistoryPanel.mockClear();
    input.focus();
    fireEvent.blur(input);
    fireEvent.mouseDown(document.body);

    expect(mockCloseHistoryPanel).toHaveBeenCalledWith('outside');

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(input).toHaveFocus();
    expect(mockOpenHistoryPanel).not.toHaveBeenCalled();
  });

  it('reopens the panel when the query changes after an outside dismiss', () => {
    const inputRef = { current: null as HTMLInputElement | null };

    render(
      <SearchExperience
        inputRef={inputRef}
        openInNewTab={false}
        shortcuts={[]}
        tabSwitchSearchEngine={false}
        searchPrefixEnabled
        searchSiteDirectEnabled
        searchSiteShortcutEnabled
        searchAnyKeyCaptureEnabled={false}
        searchCalculatorEnabled={false}
        searchRotatingPlaceholderEnabled={false}
        searchHeight={52}
        searchInputFontSize={18}
        searchHorizontalPadding={24}
        searchActionSize={42}
      />,
    );

    const input = screen.getByTestId('search-input');

    act(() => {
      vi.runOnlyPendingTimers();
    });

    mockOpenHistoryPanel.mockClear();
    fireEvent.blur(input);
    fireEvent.mouseDown(document.body);

    act(() => {
      vi.runOnlyPendingTimers();
    });

    mockOpenHistoryPanel.mockClear();
    fireEvent.change(input, { target: { value: 'leafx' } });

    expect(mockHandleSearchChange).toHaveBeenCalled();
    expect(mockOpenHistoryPanel).toHaveBeenCalledWith({ select: 'none' });
  });
});
