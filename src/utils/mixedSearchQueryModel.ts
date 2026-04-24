import { normalizeSearchQuery } from '@/utils/searchHelpers';
import { parseSearchCommandById } from '@/utils/searchCommands';
import type { SearchSuggestionDisplayMode } from '@/utils/searchSuggestionPolicy';
import type { MixedSearchSourceId } from '@/utils/mixedSearchContracts';

export type MixedSearchIntent =
  | 'empty'
  | 'navigate'
  | 'command'
  | 'scoped-tabs'
  | 'scoped-bookmarks'
  | 'scoped-history'
  | 'search';

export type MixedSearchQueryModel = {
  searchValue: string;
  activeSearchValue: string;
  normalizedQuery: string;
  rankingQuery: string;
  displayMode: SearchSuggestionDisplayMode;
  isEmpty: boolean;
  intent: MixedSearchIntent;
  wantsOfficialTarget: boolean;
  primarySourceId: MixedSearchSourceId | null;
  sourcePlan: MixedSearchSourceId[];
};

const OFFICIAL_INTENT_KEYWORDS = [
  '官网',
  '官方',
  'official',
  'homepage',
  'home page',
  'website',
  'site',
  '主页',
  '首页',
];

function stripOfficialIntentKeywords(normalizedQuery: string): string {
  if (!normalizedQuery) return '';

  let next = normalizedQuery;
  for (const keyword of OFFICIAL_INTENT_KEYWORDS) {
    next = next.split(keyword).join(' ');
  }

  return next.replace(/\s+/g, ' ').trim();
}

function looksLikeNavigateQuery(normalizedQuery: string): boolean {
  if (!normalizedQuery) return false;
  if (/^[a-z0-9-]+\.[a-z]{2,}(\/|$)/i.test(normalizedQuery)) return true;

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 1 && normalizedQuery.length <= 24) return true;
  return tokens.length === 2 && normalizedQuery.length <= 18;
}

function resolveMixedSearchIntent(
  displayMode: SearchSuggestionDisplayMode,
  normalizedQuery: string,
): MixedSearchIntent {
  const commandKeywords = [
    'setting',
    'settings',
    'search setting',
    'theme',
    'wallpaper',
    'icon',
    'shortcut',
    'sync',
    'about',
    '设置',
    '搜索设置',
    '主题',
    '壁纸',
    '图标',
    '快捷键',
    '同步',
    '关于',
  ];

  if (displayMode === 'tabs') return 'scoped-tabs';
  if (displayMode === 'bookmarks') return 'scoped-bookmarks';
  if (displayMode === 'history') return 'scoped-history';
  if (!normalizedQuery) return 'empty';
  if (normalizedQuery.startsWith('/')) return 'command';
  if (commandKeywords.some((keyword) => normalizedQuery.includes(keyword))) return 'command';
  if (looksLikeNavigateQuery(normalizedQuery)) return 'navigate';
  return 'search';
}

function resolveSourcePlan(intent: MixedSearchIntent): MixedSearchSourceId[] {
  switch (intent) {
    case 'empty':
      return ['tabs', 'local-history', 'bookmarks', 'browser-history', 'settings'];
    case 'scoped-tabs':
      return ['tabs'];
    case 'scoped-bookmarks':
      return ['bookmarks'];
    case 'scoped-history':
      return ['browser-history'];
    case 'command':
      return ['commands', 'settings', 'shortcuts', 'tabs', 'bookmarks'];
    case 'navigate':
      return ['tabs', 'shortcuts', 'bookmarks', 'builtin-sites', 'local-history', 'remote', 'browser-history'];
    case 'search':
    default:
      return ['shortcuts', 'builtin-sites', 'tabs', 'bookmarks', 'settings', 'local-history', 'remote', 'browser-history'];
  }
}

function resolvePrimarySourceId(intent: MixedSearchIntent): MixedSearchSourceId | null {
  if (intent === 'scoped-tabs') return 'tabs';
  if (intent === 'scoped-bookmarks') return 'bookmarks';
  if (intent === 'scoped-history') return 'browser-history';
  return null;
}

export function createMixedSearchQueryModel(args: {
  searchValue: string;
  displayMode: SearchSuggestionDisplayMode;
}): MixedSearchQueryModel {
  const { searchValue, displayMode } = args;
  const activeSearchValue = (() => {
    if (displayMode === 'tabs') return parseSearchCommandById(searchValue, 'tabs').query;
    if (displayMode === 'bookmarks') return parseSearchCommandById(searchValue, 'bookmarks').query;
    if (displayMode === 'history') return parseSearchCommandById(searchValue, 'history').query;
    return searchValue;
  })();
  const normalizedQuery = normalizeSearchQuery(activeSearchValue);
  const rankingQuery = stripOfficialIntentKeywords(normalizedQuery) || normalizedQuery;
  const intent = resolveMixedSearchIntent(displayMode, normalizedQuery);

  return {
    searchValue,
    activeSearchValue,
    normalizedQuery,
    rankingQuery,
    displayMode,
    isEmpty: normalizedQuery.length === 0,
    intent,
    wantsOfficialTarget: rankingQuery !== normalizedQuery,
    primarySourceId: resolvePrimarySourceId(intent),
    sourcePlan: resolveSourcePlan(intent),
  };
}
