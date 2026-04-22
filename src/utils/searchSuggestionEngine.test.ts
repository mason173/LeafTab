import { describe, expect, it } from 'vitest';
import { buildSearchSuggestionActions } from '@/utils/searchSuggestionEngine';

describe('searchSuggestionEngine', () => {
  it('keeps local-first ordering and inserts remote suggestions before browser history', () => {
    const actions = buildSearchSuggestionActions({
      mode: 'default',
      searchValue: 'open',
      bookmarkSuggestionItems: [],
      tabSuggestionItems: [],
      localHistorySuggestionItems: [
        {
          type: 'history',
          label: 'openai',
          value: 'openai',
          timestamp: 1,
          historySource: 'local',
        },
      ],
      remoteSuggestionItems: [
        {
          type: 'remote',
          label: 'openai官网',
          value: 'openai官网',
          provider: '360',
        },
      ],
      browserHistorySuggestionItems: [
        {
          type: 'history',
          label: 'OpenAI Platform',
          value: 'https://platform.openai.com/',
          timestamp: 2,
          historySource: 'browser',
        },
      ],
      builtinSiteSuggestionItems: [
        {
          type: 'shortcut',
          label: 'Open Source China',
          value: 'https://www.oschina.net/',
          icon: '',
        },
      ],
      shortcutSuggestionItems: [
        {
          type: 'shortcut',
          label: 'OpenAI',
          value: 'https://openai.com/',
          icon: '',
        },
      ],
    });

    expect(actions.map((action) => action.item.label)).toEqual([
      'OpenAI',
      'Open Source China',
      'openai',
      'openai官网',
      'OpenAI Platform',
    ]);
  });

  it('dedupes remote query suggestions when local history already contains the same query', () => {
    const actions = buildSearchSuggestionActions({
      mode: 'default',
      searchValue: 'open',
      bookmarkSuggestionItems: [],
      tabSuggestionItems: [],
      localHistorySuggestionItems: [
        {
          type: 'history',
          label: 'openai',
          value: 'openai',
          timestamp: 1,
          historySource: 'local',
        },
      ],
      remoteSuggestionItems: [
        {
          type: 'remote',
          label: 'openai',
          value: 'openai',
          provider: '360',
        },
        {
          type: 'remote',
          label: 'openai官网',
          value: 'openai官网',
          provider: '360',
        },
      ],
      browserHistorySuggestionItems: [],
      builtinSiteSuggestionItems: [],
      shortcutSuggestionItems: [],
    });

    expect(actions.map((action) => action.item.label)).toEqual([
      'openai',
      'openai官网',
    ]);
  });
});
