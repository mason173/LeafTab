import { describe, expect, it } from 'vitest';
import { buildSearchSuggestionActions } from '@/utils/searchSuggestionEngine';

describe('buildSearchSuggestionActions', () => {
  it('prioritizes matching shortcuts ahead of history in default search mode', () => {
    const actions = buildSearchSuggestionActions({
      mode: 'default',
      searchValue: 'leaf',
      bookmarkSuggestionItems: [],
      tabSuggestionItems: [],
      localHistorySuggestionItems: [
        {
          type: 'history',
          label: 'leaf history',
          value: 'leaf history',
          timestamp: Date.now() - 1_000,
          historySource: 'local',
        },
      ],
      browserHistorySuggestionItems: [
        {
          type: 'history',
          label: 'leaf browser history',
          value: 'leaf browser history',
          timestamp: Date.now() - 2_000,
          historySource: 'browser',
        },
      ],
      builtinSiteSuggestionItems: [],
      shortcutSuggestionItems: [
        {
          type: 'shortcut',
          label: 'Leaf shortcut',
          value: 'https://leaf.example',
          icon: '',
        },
      ],
    });

    expect(actions.map((action) => action.item.type)).toEqual(['shortcut', 'history', 'history']);
    expect(actions[0]?.item.label).toBe('Leaf shortcut');
  });
});
