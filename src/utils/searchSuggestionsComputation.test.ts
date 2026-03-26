import { describe, expect, it } from 'vitest';
import { computeSearchSuggestionActions } from '@/utils/searchSuggestionsComputation';

describe('computeSearchSuggestionActions', () => {
  it('builds default-mode suggestions with shortcut priority before history', () => {
    const actions = computeSearchSuggestionActions({
      suggestionDisplayMode: 'default',
      searchValue: 'leaf',
      filteredHistoryItems: [
        {
          query: 'leaf history',
          timestamp: Date.now() - 1_000,
        },
      ],
      shortcuts: [
        {
          id: 'shortcut-1',
          title: 'Leaf shortcut',
          url: 'https://leaf.example',
          icon: '',
        },
      ],
      searchSiteShortcutEnabled: false,
      suggestionUsageMap: {},
      bookmarkSuggestionItems: [],
      tabSuggestionItems: [],
      browserHistorySuggestionItems: [
        {
          type: 'history',
          label: 'leaf browser history',
          value: 'https://leaf-browser.example',
          timestamp: Date.now() - 2_000,
          historySource: 'browser',
        },
      ],
    });

    expect(actions.map((action) => action.item.type)).toEqual(['shortcut', 'history', 'history']);
    expect(actions[0]?.item.label).toBe('Leaf shortcut');
  });
});
