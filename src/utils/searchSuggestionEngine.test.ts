import { describe, expect, it } from 'vitest';
import { buildSearchSuggestionActions } from '@/utils/searchSuggestionEngine';

describe('searchSuggestionEngine', () => {
  it('keeps remote suggestions behind concrete history targets for navigate queries', () => {
    const actions = buildSearchSuggestionActions({
      mode: 'default',
      searchValue: 'open',
      bookmarkSuggestionItems: [],
      tabSuggestionItems: [],
      commandSuggestionItems: [],
      settingSuggestionItems: [],
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
      'OpenAI Platform',
      'openai官网',
    ]);
  });

  it('dedupes remote query suggestions when local history already contains the same query', () => {
    const actions = buildSearchSuggestionActions({
      mode: 'default',
      searchValue: 'open',
      bookmarkSuggestionItems: [],
      tabSuggestionItems: [],
      commandSuggestionItems: [],
      settingSuggestionItems: [],
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

  it('mixes tabs and bookmarks into default navigate results before fallback sources', () => {
    const actions = buildSearchSuggestionActions({
      mode: 'default',
      searchValue: 'github',
      bookmarkSuggestionItems: [
        {
          type: 'bookmark',
          label: 'GitHub Repo',
          value: 'https://github.com/example/repo',
          icon: '',
        },
      ],
      tabSuggestionItems: [
        {
          type: 'tab',
          label: 'GitHub Pull Requests',
          value: 'https://github.com/pulls',
          icon: '',
          tabId: 12,
        },
      ],
      commandSuggestionItems: [],
      settingSuggestionItems: [],
      localHistorySuggestionItems: [
        {
          type: 'history',
          label: 'github search',
          value: 'github search',
          timestamp: 1,
          historySource: 'local',
        },
      ],
      remoteSuggestionItems: [
        {
          type: 'remote',
          label: 'github官网',
          value: 'github官网',
          provider: '360',
        },
      ],
      browserHistorySuggestionItems: [
        {
          type: 'history',
          label: 'GitHub Issues',
          value: 'https://github.com/issues',
          timestamp: 2,
          historySource: 'browser',
        },
      ],
      builtinSiteSuggestionItems: [],
      shortcutSuggestionItems: [
        {
          type: 'shortcut',
          label: 'GitHub',
          value: 'https://github.com/',
          icon: '',
        },
      ],
    });

    expect(actions.map((action) => action.item.label)).toEqual([
      'GitHub Pull Requests',
      'GitHub',
      'GitHub Repo',
      'github search',
      'GitHub Issues',
      'github官网',
    ]);
  });

  it('keeps generic search results diverse instead of exhausting one source first', () => {
    const actions = buildSearchSuggestionActions({
      mode: 'default',
      searchValue: 'react server components tutorial',
      bookmarkSuggestionItems: [
        {
          type: 'bookmark',
          label: 'react server components tutorial bookmark',
          value: 'https://react.dev/rfc/server-components',
          icon: '',
        },
      ],
      tabSuggestionItems: [
        {
          type: 'tab',
          label: 'react server components tutorial docs',
          value: 'https://react.dev/learn/server-components',
          icon: '',
          tabId: 21,
        },
      ],
      commandSuggestionItems: [],
      settingSuggestionItems: [],
      localHistorySuggestionItems: [
        {
          type: 'history',
          label: 'react server components tutorial',
          value: 'react server components tutorial',
          timestamp: 1,
          historySource: 'local',
        },
      ],
      remoteSuggestionItems: [
        {
          type: 'remote',
          label: 'react server components 教程',
          value: 'react server components 教程',
          provider: '360',
        },
      ],
      browserHistorySuggestionItems: [
        {
          type: 'history',
          label: 'react server components tutorial article',
          value: 'https://example.com/react-flight',
          timestamp: 2,
          historySource: 'browser',
        },
      ],
      builtinSiteSuggestionItems: [
        {
          type: 'shortcut',
          label: 'react server components tutorial react docs',
          value: 'https://react.dev/',
          icon: '',
        },
      ],
      shortcutSuggestionItems: [
        {
          type: 'shortcut',
          label: 'react server components tutorial react blog',
          value: 'https://react.dev/blog',
          icon: '',
        },
      ],
    });

    expect(actions.map((action) => action.item.label)).toEqual([
      'react server components tutorial react blog',
      'react server components tutorial react docs',
      'react server components tutorial docs',
      'react server components tutorial bookmark',
      'react server components tutorial',
      'react server components tutorial article',
      'react server components 教程',
    ]);
  });

  it('prioritizes official-looking targets ahead of remote suggestions for official intent queries', () => {
    const actions = buildSearchSuggestionActions({
      mode: 'default',
      searchValue: 'github 官网',
      bookmarkSuggestionItems: [
        {
          type: 'bookmark',
          label: 'GitHub',
          value: 'https://github.com/',
          icon: '',
        },
      ],
      tabSuggestionItems: [],
      commandSuggestionItems: [],
      settingSuggestionItems: [],
      localHistorySuggestionItems: [],
      remoteSuggestionItems: [
        {
          type: 'remote',
          label: 'github官网',
          value: 'github官网',
          provider: '360',
        },
      ],
      browserHistorySuggestionItems: [
        {
          type: 'history',
          label: 'GitHub Docs',
          value: 'https://docs.github.com/',
          timestamp: 2,
          historySource: 'browser',
        },
      ],
      builtinSiteSuggestionItems: [],
      shortcutSuggestionItems: [
        {
          type: 'shortcut',
          label: 'GitHub',
          value: 'https://github.com/',
          icon: '',
        },
      ],
    });

    expect(actions.map((action) => action.item.label)).toEqual([
      'GitHub',
      'GitHub Docs',
      'github官网',
    ]);
  });

  it('surfaces settings results in default mixed search for command-like queries', () => {
    const actions = buildSearchSuggestionActions({
      mode: 'default',
      searchValue: '主题',
      bookmarkSuggestionItems: [],
      tabSuggestionItems: [],
      commandSuggestionItems: [],
      settingSuggestionItems: [
        {
          type: 'history',
          label: '主题模式',
          detail: '跟随系统',
          value: 'leaftab://slash-action/theme-mode',
          timestamp: 0,
          historySource: 'browser',
        },
        {
          type: 'history',
          label: '搜索设置',
          detail: 'Google',
          value: 'leaftab://slash-action/search-settings',
          timestamp: 0,
          historySource: 'browser',
        },
      ],
      localHistorySuggestionItems: [],
      remoteSuggestionItems: [
        {
          type: 'remote',
          label: '主题下载',
          value: '主题下载',
          provider: '360',
        },
      ],
      browserHistorySuggestionItems: [],
      builtinSiteSuggestionItems: [],
      shortcutSuggestionItems: [],
    });

    expect(actions.map((action) => action.item.label)).toEqual([
      '主题模式',
    ]);
    expect(actions[0]?.displayIcon).toBe('theme-mode');
  });

  it('shows empty-state tabs and recent bookmarks before lower-priority fallbacks', () => {
    const actions = buildSearchSuggestionActions({
      mode: 'default',
      searchValue: '',
      bookmarkSuggestionItems: [
        {
          type: 'bookmark',
          label: 'Recent Bookmark',
          value: 'https://bookmark.example/',
          icon: '',
        },
      ],
      tabSuggestionItems: [
        {
          type: 'tab',
          label: 'Current Tab',
          value: 'https://tab.example/',
          icon: '',
          tabId: 99,
        },
      ],
      commandSuggestionItems: [],
      settingSuggestionItems: [
        {
          type: 'history',
          label: '主题模式',
          detail: '跟随系统',
          value: 'leaftab://slash-action/theme-mode',
          timestamp: 0,
          historySource: 'browser',
        },
      ],
      localHistorySuggestionItems: [
        {
          type: 'history',
          label: 'recent query',
          value: 'recent query',
          timestamp: 1,
          historySource: 'local',
        },
      ],
      remoteSuggestionItems: [],
      browserHistorySuggestionItems: [
        {
          type: 'history',
          label: 'Recent Page',
          value: 'https://recent.example/',
          timestamp: 2,
          historySource: 'browser',
        },
      ],
      builtinSiteSuggestionItems: [],
      shortcutSuggestionItems: [],
    });

    expect(actions.map((action) => action.item.label)).toEqual([
      'Current Tab',
      'recent query',
      'Recent Bookmark',
      'Recent Page',
      '主题模式',
    ]);
  });

  it('returns browser history only in history mode', () => {
    const actions = buildSearchSuggestionActions({
      mode: 'history',
      searchValue: '/historys open',
      bookmarkSuggestionItems: [
        {
          type: 'bookmark',
          label: 'Bookmark',
          value: 'https://bookmark.example/',
          icon: '',
        },
      ],
      tabSuggestionItems: [
        {
          type: 'tab',
          label: 'Tab',
          value: 'https://tab.example/',
          icon: '',
          tabId: 1,
        },
      ],
      commandSuggestionItems: [],
      settingSuggestionItems: [],
      localHistorySuggestionItems: [
        {
          type: 'history',
          label: 'Local history',
          value: 'local query',
          timestamp: 1,
          historySource: 'local',
        },
      ],
      remoteSuggestionItems: [
        {
          type: 'remote',
          label: 'Remote suggestion',
          value: 'remote query',
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
      builtinSiteSuggestionItems: [],
      shortcutSuggestionItems: [],
    });

    expect(actions.map((action) => action.item.label)).toEqual([
      'OpenAI Platform',
    ]);
  });
});
