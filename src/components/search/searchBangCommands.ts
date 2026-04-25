import type { TFunction } from 'i18next';
import {
  buildSearchMatchCandidates,
  getSearchMatchPriorityFromCandidates,
  normalizeSearchQuery,
} from '@/utils/searchHelpers';
import type { SearchAction } from '@/utils/searchActions';
import type { SearchEngine } from '@/types';

type BangCommandEngine = Exclude<SearchEngine, 'system'>;

const BANG_COMMAND_ACTION_VALUE_PREFIX = 'leaftab://bang-command/';

type BangCommandEntry = {
  id: BangCommandEngine;
  label: string;
  detail: string;
  keywords: string[];
};

const BANG_COMMAND_ENTRIES: readonly Omit<BangCommandEntry, 'label' | 'detail'>[] = [
  {
    id: 'google',
    keywords: ['!g', '!google', 'google', '谷歌'],
  },
  {
    id: 'bing',
    keywords: ['!b', '!bing', 'bing'],
  },
  {
    id: 'duckduckgo',
    keywords: ['!d', '!ddg', 'duckduckgo', 'duck', 'ddg'],
  },
  {
    id: 'baidu',
    keywords: ['!bd', '!baidu', 'baidu', '百度'],
  },
] as const;

const BANG_COMMAND_LABEL_MAP: Record<BangCommandEngine, string> = {
  google: 'Google',
  bing: 'Bing',
  duckduckgo: 'DuckDuckGo',
  baidu: 'Baidu',
};

export function buildBangCommandActionValue(engine: BangCommandEngine) {
  return `${BANG_COMMAND_ACTION_VALUE_PREFIX}${engine}`;
}

export function parseBangCommandActionId(value: string): BangCommandEngine | null {
  if (!value.startsWith(BANG_COMMAND_ACTION_VALUE_PREFIX)) return null;
  const engine = value.slice(BANG_COMMAND_ACTION_VALUE_PREFIX.length);
  return BANG_COMMAND_ENTRIES.some((entry) => entry.id === engine)
    ? engine as BangCommandEngine
    : null;
}

export function buildBangCommandEntries(args: {
  t: TFunction;
}): BangCommandEntry[] {
  const { t } = args;

  return BANG_COMMAND_ENTRIES.map((entry) => ({
    id: entry.id,
    label: t(`search.bang.engines.${entry.id}`, {
      defaultValue: `!${BANG_COMMAND_LABEL_MAP[entry.id]}`,
    }),
    detail: t('search.bang.detail', { defaultValue: 'Use this engine for the current query only' }),
    keywords: entry.keywords,
  }));
}

function filterBangCommandEntries(entries: BangCommandEntry[], queryKey: string): BangCommandEntry[] {
  if (!queryKey.trim()) return entries;
  const normalizedQuery = normalizeSearchQuery(queryKey);
  if (!normalizedQuery) return entries;

  return entries.filter((entry) => (
    Math.max(
      getSearchMatchPriorityFromCandidates(buildSearchMatchCandidates(entry.label), normalizedQuery),
      getSearchMatchPriorityFromCandidates(buildSearchMatchCandidates(entry.detail), normalizedQuery),
      ...entry.keywords.map((keyword) => getSearchMatchPriorityFromCandidates(buildSearchMatchCandidates(keyword), normalizedQuery)),
    ) > 0
  ));
}

export function buildBangCommandActions(args: {
  isOpen: boolean;
  entries: BangCommandEntry[];
  queryKey: string;
}): SearchAction[] {
  const { isOpen, entries, queryKey } = args;
  if (!isOpen) return [];

  return filterBangCommandEntries(entries, queryKey).map((entry, index) => ({
    id: `bang-command:${entry.id}:${index}`,
    kind: 'open-target',
    permission: null,
    usageKey: null,
    secondaryActions: [],
    displayIcon: 'ai-provider',
    sourceId: 'commands',
    baseRank: index,
    reasons: ['bang-panel'],
    item: {
      type: 'history',
      label: entry.label,
      detail: entry.detail,
      value: buildBangCommandActionValue(entry.id),
      timestamp: 0,
      historySource: 'browser',
    },
  }));
}
