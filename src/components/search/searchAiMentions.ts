import type { TFunction } from 'i18next';
import {
  buildSearchMatchCandidates,
  getSearchMatchPriorityFromCandidates,
  normalizeSearchQuery,
} from '@/utils/searchHelpers';
import type { SearchAction } from '@/utils/searchActions';
import {
  AI_PROVIDER_DEFINITIONS,
  getAiProviderById,
  type AiProviderId,
} from '@/utils/aiProviders';
import { BUILTIN_SITE_SHORTCUTS, getBuiltinSiteShortcutById } from '@/utils/siteSearch';
import {
  isSearchAtPanelTargetPinned,
  sortSearchAtPanelIds,
} from '@/components/search/searchAtPanelPreferences';

const AI_PROVIDER_ACTION_VALUE_PREFIX = 'leaftab://ai-provider/';
const SITE_SHORTCUT_ACTION_VALUE_PREFIX = 'leaftab://site-shortcut/';

export type AiMentionEntry = {
  kind: 'ai-provider' | 'site-shortcut';
  id: string;
  label: string;
  detail: string;
  keywords: string[];
  pinned: boolean;
};

const PRIORITY_SITE_SHORTCUT_IDS: readonly string[] = [
  'github',
  'bilibili',
  'zhihu',
  'xiaohongshu',
  'youtube',
  'google',
  'x',
  'reddit',
  'juejin',
  'mdn',
] as const;

export function buildAiProviderActionValue(providerId: AiProviderId) {
  return `${AI_PROVIDER_ACTION_VALUE_PREFIX}${providerId}`;
}

export function parseAiProviderActionId(value: string): AiProviderId | null {
  if (!value.startsWith(AI_PROVIDER_ACTION_VALUE_PREFIX)) return null;
  const providerId = value.slice(AI_PROVIDER_ACTION_VALUE_PREFIX.length) as AiProviderId;
  return getAiProviderById(providerId)?.id ?? null;
}

export function buildSiteShortcutActionValue(siteId: string) {
  return `${SITE_SHORTCUT_ACTION_VALUE_PREFIX}${siteId}`;
}

export function parseSiteShortcutActionId(value: string): string | null {
  if (!value.startsWith(SITE_SHORTCUT_ACTION_VALUE_PREFIX)) return null;
  const siteId = value.slice(SITE_SHORTCUT_ACTION_VALUE_PREFIX.length);
  return getBuiltinSiteShortcutById(siteId)?.id ?? null;
}

export function buildAiMentionEntries(args: {
  t: TFunction;
  includeSites?: boolean;
}): AiMentionEntry[] {
  const { t, includeSites = true } = args;

  const aiEntries: AiMentionEntry[] = sortSearchAtPanelIds(
    'ai-provider',
    AI_PROVIDER_DEFINITIONS.map((provider) => provider.id),
  ).flatMap((providerId) => {
    const provider = getAiProviderById(providerId as AiProviderId);
    if (!provider) return [];

    return [{
      kind: 'ai-provider' as const,
      id: provider.id,
      label: t(`search.atPanel.aiProviders.${provider.id}`, {
        defaultValue: `@${provider.label}`,
      }),
      detail: provider.detail,
      keywords: provider.keywords,
      pinned: isSearchAtPanelTargetPinned('ai-provider', provider.id),
    }];
  });

  if (!includeSites) {
    return aiEntries;
  }

  const sitePriorityMap = new Map(PRIORITY_SITE_SHORTCUT_IDS.map((id, index) => [id, index]));
  const siteOrderMap = new Map(BUILTIN_SITE_SHORTCUTS.map((site, index) => [site.id, index]));
  const prioritizedSites = [...BUILTIN_SITE_SHORTCUTS].sort((left, right) => {
    const leftPriority = sitePriorityMap.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority = sitePriorityMap.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }
    return (siteOrderMap.get(left.id) ?? Number.MAX_SAFE_INTEGER)
      - (siteOrderMap.get(right.id) ?? Number.MAX_SAFE_INTEGER);
  });

  const sitesById = new Map(prioritizedSites.map((site) => [site.id, site]));

  return aiEntries.concat(sortSearchAtPanelIds(
    'site-shortcut',
    prioritizedSites.map((site) => site.id),
  ).flatMap((siteId): AiMentionEntry[] => {
    const site = sitesById.get(siteId);
    if (!site) return [];

    return [{
      kind: 'site-shortcut',
      id: site.id,
      label: t(`search.atPanel.sites.${site.id}`, {
        defaultValue: `@${site.label}`,
      }),
      detail: site.domain,
      keywords: [
        site.label,
        site.domain,
        ...site.aliases,
        ...(site.keywords || []),
      ],
      pinned: isSearchAtPanelTargetPinned('site-shortcut', site.id),
    }];
  }));
}

function getEntryMatchPriority(entry: AiMentionEntry, queryKey: string, extraLabel: string) {
  if (!queryKey) return 1;

  const normalizedQuery = normalizeSearchQuery(queryKey);
  if (!normalizedQuery) return 1;

  return Math.max(
    getSearchMatchPriorityFromCandidates(buildSearchMatchCandidates(entry.label), normalizedQuery),
    getSearchMatchPriorityFromCandidates(buildSearchMatchCandidates(entry.detail), normalizedQuery),
    ...entry.keywords.map((keyword) => getSearchMatchPriorityFromCandidates(buildSearchMatchCandidates(keyword), normalizedQuery)),
    getSearchMatchPriorityFromCandidates(buildSearchMatchCandidates(extraLabel), normalizedQuery),
  );
}

function filterAiMentionEntries(entries: AiMentionEntry[], queryKey: string): AiMentionEntry[] {
  if (!queryKey.trim()) return entries;

  return entries.filter((entry) => {
    if (entry.kind === 'ai-provider') {
      const provider = getAiProviderById(entry.id as AiProviderId);
      if (!provider) return false;
      return getEntryMatchPriority(entry, queryKey, provider.label) > 0;
    }

    const site = getBuiltinSiteShortcutById(entry.id);
    if (!site) return false;
    return getEntryMatchPriority(entry, queryKey, site.label) > 0;
  });
}

export function buildAiMentionActions(args: {
  isOpen: boolean;
  entries: AiMentionEntry[];
  queryKey: string;
}): SearchAction[] {
  const { isOpen, entries, queryKey } = args;
  if (!isOpen) return [];

  const filteredEntries = filterAiMentionEntries(entries, queryKey);

  return filteredEntries.map((entry, index) => ({
    id: `${entry.kind}:${entry.id}:${index}`,
    kind: 'open-target',
    permission: null,
    usageKey: null,
    secondaryActions: [{
      id: 'pin-at-target',
      kind: 'pin-at-target',
      active: entry.pinned,
    }],
    displayIcon: entry.kind === 'ai-provider' ? 'ai-provider' : 'site-target',
    sourceId: 'commands',
    baseRank: index,
    reasons: ['at-panel'],
    item: {
      type: 'history',
      label: entry.label,
      detail: entry.detail,
      value: entry.kind === 'ai-provider'
        ? buildAiProviderActionValue(entry.id as AiProviderId)
        : buildSiteShortcutActionValue(entry.id),
      timestamp: 0,
      historySource: 'browser',
    },
  }));
}
