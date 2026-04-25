import {
  queueCachedLocalStorageSetItem,
  readCachedLocalStorageItem,
} from '@/utils/cachedLocalStorage';
import { extractDomainFromUrl, isUrl } from '@/utils';
import type { MixedSearchQueryModel } from '@/utils/mixedSearchQueryModel';
import type { MixedSearchSourceId } from '@/utils/mixedSearchContracts';
import type { SearchAction, SearchSecondaryAction } from '@/utils/searchActions';
import { normalizeSearchQuery } from '@/utils/searchHelpers';
import { parseSlashCommandActionId } from '@/components/search/searchSlashCommands';

export type SearchPersonalizationEntry = {
  count: number;
  lastUsedAt: number;
};

export type SearchPersonalizationProfile = {
  targetAffinity: Record<string, SearchPersonalizationEntry>;
  querySourceAffinity: Record<string, SearchPersonalizationEntry>;
  queryTargetAffinity: Record<string, SearchPersonalizationEntry>;
  domainSourceAffinity: Record<string, SearchPersonalizationEntry>;
  actionAffinity: Record<string, SearchPersonalizationEntry>;
  targetAvoidance: Record<string, SearchPersonalizationEntry>;
  queryTargetAvoidance: Record<string, SearchPersonalizationEntry>;
};

type SearchPersonalizationReason =
  | 'target-affinity'
  | 'query-source-affinity'
  | 'query-target-affinity'
  | 'domain-source-affinity'
  | 'action-affinity'
  | 'target-avoidance'
  | 'query-target-avoidance';

type SearchActionPersonalizationScore = {
  boost: number;
  reasons: SearchPersonalizationReason[];
};

const SEARCH_PERSONALIZATION_KEY = 'leaftab_search_personalization_v1';
const MAX_TARGET_AFFINITY_ENTRIES = 800;
const MAX_QUERY_SOURCE_AFFINITY_ENTRIES = 600;
const MAX_QUERY_TARGET_AFFINITY_ENTRIES = 900;
const MAX_DOMAIN_SOURCE_AFFINITY_ENTRIES = 500;
const MAX_ACTION_AFFINITY_ENTRIES = 120;
const MAX_TARGET_AVOIDANCE_ENTRIES = 500;
const MAX_QUERY_TARGET_AVOIDANCE_ENTRIES = 700;
const MAX_PERSONALIZATION_BOOST = 28;
const MAX_PERSONALIZATION_PENALTY = 18;
const MAX_PERSONALIZED_RERANK_ACTIONS = 15;
const MAX_WEAK_NEGATIVE_SAMPLES = 3;
const BASE_RANK_WEIGHT = 8;
const ACTION_AFFINITY_HALF_LIFE_DAYS = 21;
const TARGET_AFFINITY_HALF_LIFE_DAYS = 14;
const QUERY_AFFINITY_HALF_LIFE_DAYS = 10;
const DOMAIN_AFFINITY_HALF_LIFE_DAYS = 18;
const TARGET_AVOIDANCE_HALF_LIFE_DAYS = 7;
const QUERY_TARGET_AVOIDANCE_HALF_LIFE_DAYS = 6;

const EMPTY_SEARCH_PERSONALIZATION_PROFILE: SearchPersonalizationProfile = {
  targetAffinity: {},
  querySourceAffinity: {},
  queryTargetAffinity: {},
  domainSourceAffinity: {},
  actionAffinity: {},
  targetAvoidance: {},
  queryTargetAvoidance: {},
};

let cachedSearchPersonalizationRaw: string | null = null;
let cachedSearchPersonalizationParsed: SearchPersonalizationProfile | null = null;

export function createEmptySearchPersonalizationProfile(): SearchPersonalizationProfile {
  return cloneSearchPersonalizationProfile(EMPTY_SEARCH_PERSONALIZATION_PROFILE);
}

export function resetSearchPersonalizationCacheForTests() {
  cachedSearchPersonalizationRaw = null;
  cachedSearchPersonalizationParsed = null;
}

function cloneSearchPersonalizationProfile(
  profile: SearchPersonalizationProfile,
): SearchPersonalizationProfile {
  return {
    targetAffinity: { ...profile.targetAffinity },
    querySourceAffinity: { ...profile.querySourceAffinity },
    queryTargetAffinity: { ...profile.queryTargetAffinity },
    domainSourceAffinity: { ...profile.domainSourceAffinity },
    actionAffinity: { ...profile.actionAffinity },
    targetAvoidance: { ...profile.targetAvoidance },
    queryTargetAvoidance: { ...profile.queryTargetAvoidance },
  };
}

function normalizeSearchPersonalizationEntry(raw: unknown): SearchPersonalizationEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const count = Number(value.count);
  const lastUsedAt = Number(value.lastUsedAt);
  if (!Number.isFinite(count) || count <= 0) return null;
  if (!Number.isFinite(lastUsedAt) || lastUsedAt <= 0) return null;
  return {
    count: Math.floor(count),
    lastUsedAt,
  };
}

function normalizeSearchPersonalizationMap(
  raw: unknown,
): Record<string, SearchPersonalizationEntry> {
  if (!raw || typeof raw !== 'object') return {};
  const next: Record<string, SearchPersonalizationEntry> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const normalizedEntry = normalizeSearchPersonalizationEntry(value);
    if (!normalizedEntry) continue;
    next[key] = normalizedEntry;
  }
  return next;
}

function normalizeSearchPersonalizationProfile(raw: unknown): SearchPersonalizationProfile {
  if (!raw || typeof raw !== 'object') return EMPTY_SEARCH_PERSONALIZATION_PROFILE;
  const profile = raw as Record<string, unknown>;
  return {
    targetAffinity: normalizeSearchPersonalizationMap(profile.targetAffinity),
    querySourceAffinity: normalizeSearchPersonalizationMap(profile.querySourceAffinity),
    queryTargetAffinity: normalizeSearchPersonalizationMap(profile.queryTargetAffinity),
    domainSourceAffinity: normalizeSearchPersonalizationMap(profile.domainSourceAffinity),
    actionAffinity: normalizeSearchPersonalizationMap(profile.actionAffinity),
    targetAvoidance: normalizeSearchPersonalizationMap(profile.targetAvoidance),
    queryTargetAvoidance: normalizeSearchPersonalizationMap(profile.queryTargetAvoidance),
  };
}

function writeSearchPersonalizationProfile(profile: SearchPersonalizationProfile) {
  try {
    const serialized = JSON.stringify(profile);
    queueCachedLocalStorageSetItem(SEARCH_PERSONALIZATION_KEY, serialized);
    cachedSearchPersonalizationRaw = serialized;
    cachedSearchPersonalizationParsed = profile;
  } catch {}
}

function trimAffinityMap(
  map: Record<string, SearchPersonalizationEntry>,
  maxEntries: number,
): Record<string, SearchPersonalizationEntry> {
  const entries = Object.entries(map);
  if (entries.length <= maxEntries) return map;
  entries.sort((a, b) => b[1].lastUsedAt - a[1].lastUsedAt);
  return Object.fromEntries(entries.slice(0, maxEntries));
}

function trimSearchPersonalizationProfile(
  profile: SearchPersonalizationProfile,
): SearchPersonalizationProfile {
  return {
    targetAffinity: trimAffinityMap(profile.targetAffinity, MAX_TARGET_AFFINITY_ENTRIES),
    querySourceAffinity: trimAffinityMap(profile.querySourceAffinity, MAX_QUERY_SOURCE_AFFINITY_ENTRIES),
    queryTargetAffinity: trimAffinityMap(profile.queryTargetAffinity, MAX_QUERY_TARGET_AFFINITY_ENTRIES),
    domainSourceAffinity: trimAffinityMap(profile.domainSourceAffinity, MAX_DOMAIN_SOURCE_AFFINITY_ENTRIES),
    actionAffinity: trimAffinityMap(profile.actionAffinity, MAX_ACTION_AFFINITY_ENTRIES),
    targetAvoidance: trimAffinityMap(profile.targetAvoidance, MAX_TARGET_AVOIDANCE_ENTRIES),
    queryTargetAvoidance: trimAffinityMap(profile.queryTargetAvoidance, MAX_QUERY_TARGET_AVOIDANCE_ENTRIES),
  };
}

function recordAffinity(
  map: Record<string, SearchPersonalizationEntry>,
  key: string,
  usedAt: number,
) {
  if (!key) return;
  const prev = map[key];
  map[key] = {
    count: (prev?.count || 0) + 1,
    lastUsedAt: usedAt,
  };
}

function buildQuerySourceAffinityKey(queryKey: string, sourceId: MixedSearchSourceId): string {
  return queryKey ? `${queryKey}|${sourceId}` : '';
}

function buildQueryTargetAffinityKey(queryKey: string, targetKey: string): string {
  return queryKey && targetKey ? `${queryKey}|${targetKey}` : '';
}

function buildDomainSourceAffinityKey(domainKey: string, sourceId: MixedSearchSourceId): string {
  return domainKey ? `${domainKey}|${sourceId}` : '';
}

function normalizeUrlTarget(rawValue: string): string {
  return rawValue
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '');
}

function resolvePersonalizationQueryKey(queryModel: MixedSearchQueryModel): string {
  const candidate = queryModel.compactRankingQuery
    || queryModel.rankingQuery
    || queryModel.compactQuery
    || queryModel.normalizedQuery;
  return normalizeSearchQuery(candidate);
}

function inferActionSourceId(action: SearchAction): MixedSearchSourceId {
  if (action.sourceId) return action.sourceId;
  const { item } = action;
  if (item.type === 'tab') return 'tabs';
  if (item.type === 'bookmark') return 'bookmarks';
  if (item.type === 'shortcut') return 'shortcuts';
  if (item.type === 'remote') return 'remote';
  if (item.type === 'history') {
    if (item.searchActionKey) return 'settings';
    if (parseSlashCommandActionId(item.value)) return 'commands';
    if (item.historySource === 'session') return 'recently-closed';
    return item.historySource === 'local' ? 'local-history' : 'browser-history';
  }
  return 'builtin-sites';
}

function inferActionTargetKey(action: SearchAction): string {
  const { item } = action;
  if (item.type === 'tab') {
    const normalizedUrl = normalizeUrlTarget(item.value);
    return normalizedUrl ? `tab:${normalizedUrl}` : action.id;
  }
  if (item.type === 'bookmark') {
    if (item.bookmarkId) return `bookmark:${item.bookmarkId}`;
    const normalizedUrl = normalizeUrlTarget(item.value);
    return normalizedUrl ? `bookmark-url:${normalizedUrl}` : action.id;
  }
  if (item.type === 'shortcut') {
    if (item.shortcutId) return `shortcut:${item.shortcutId}`;
    const normalizedUrl = normalizeUrlTarget(item.value);
    return normalizedUrl ? `shortcut-url:${normalizedUrl}` : action.id;
  }
  if (item.type === 'history') {
    if (item.searchActionKey) return `settings:${item.searchActionKey}`;
    const slashActionId = parseSlashCommandActionId(item.value);
    if (slashActionId) return `command:${slashActionId}`;
    if (item.historySource === 'local') {
      return `local-history:${normalizeSearchQuery(item.value)}`;
    }
    if (item.historySource === 'session') {
      return `recently-closed:${normalizeUrlTarget(item.value)}`;
    }
    if (isUrl(item.value)) {
      return `browser-history-url:${normalizeUrlTarget(item.value)}`;
    }
    return `browser-history:${normalizeSearchQuery(item.value)}`;
  }
  if (item.type === 'remote') {
    return `remote:${normalizeSearchQuery(item.value)}`;
  }
  if (item.type === 'engine-prefix') {
    return `engine-prefix:${item.engine}:${normalizeSearchQuery(item.value)}`;
  }
  return action.id;
}

function inferActionDomainKey(action: SearchAction): string {
  const domain = extractDomainFromUrl(action.item.value || '');
  return domain.trim().toLowerCase().replace(/^www\./, '');
}

function resolveAffinityScore(args: {
  entry: SearchPersonalizationEntry | undefined;
  now: number;
  halfLifeDays: number;
  frequencyWeight: number;
  recencyWeight: number;
  cap: number;
}): number {
  const {
    entry,
    now,
    halfLifeDays,
    frequencyWeight,
    recencyWeight,
    cap,
  } = args;
  if (!entry) return 0;

  const ageDays = Math.max(0, (now - entry.lastUsedAt) / 86_400_000);
  const frequencyScore = Math.log2(entry.count + 1) * frequencyWeight;
  const recencyScore = Math.exp(-ageDays / halfLifeDays) * recencyWeight;
  return Math.min(cap, frequencyScore + recencyScore);
}

function hasSearchPersonalizationData(profile: SearchPersonalizationProfile): boolean {
  return (
    Object.keys(profile.targetAffinity).length > 0
    || Object.keys(profile.querySourceAffinity).length > 0
    || Object.keys(profile.queryTargetAffinity).length > 0
    || Object.keys(profile.domainSourceAffinity).length > 0
    || Object.keys(profile.actionAffinity).length > 0
    || Object.keys(profile.targetAvoidance).length > 0
    || Object.keys(profile.queryTargetAvoidance).length > 0
  );
}

function scoreSearchActionPersonalization(args: {
  action: SearchAction;
  queryModel: MixedSearchQueryModel;
  profile: SearchPersonalizationProfile;
  now: number;
}): SearchActionPersonalizationScore {
  const { action, queryModel, profile, now } = args;
  const sourceId = inferActionSourceId(action);
  const queryKey = resolvePersonalizationQueryKey(queryModel);
  const targetKey = inferActionTargetKey(action);
  const domainKey = inferActionDomainKey(action);

  let boost = 0;
  const reasons: SearchPersonalizationReason[] = [];

  const targetAffinityBoost = resolveAffinityScore({
    entry: profile.targetAffinity[targetKey],
    now,
    halfLifeDays: TARGET_AFFINITY_HALF_LIFE_DAYS,
    frequencyWeight: 4.8,
    recencyWeight: 6.4,
    cap: 12,
  });
  if (targetAffinityBoost > 0) {
    boost += targetAffinityBoost;
    reasons.push('target-affinity');
  }

  if (queryKey) {
    const querySourceBoost = resolveAffinityScore({
      entry: profile.querySourceAffinity[buildQuerySourceAffinityKey(queryKey, sourceId)],
      now,
      halfLifeDays: QUERY_AFFINITY_HALF_LIFE_DAYS,
      frequencyWeight: 3.8,
      recencyWeight: 5.2,
      cap: 10,
    });
    if (querySourceBoost > 0) {
      boost += querySourceBoost;
      reasons.push('query-source-affinity');
    }

    const queryTargetBoost = resolveAffinityScore({
      entry: profile.queryTargetAffinity[buildQueryTargetAffinityKey(queryKey, targetKey)],
      now,
      halfLifeDays: QUERY_AFFINITY_HALF_LIFE_DAYS,
      frequencyWeight: 5.4,
      recencyWeight: 7.4,
      cap: 14,
    });
    if (queryTargetBoost > 0) {
      boost += queryTargetBoost;
      reasons.push('query-target-affinity');
    }
  }

  if (domainKey) {
    const domainSourceBoost = resolveAffinityScore({
      entry: profile.domainSourceAffinity[buildDomainSourceAffinityKey(domainKey, sourceId)],
      now,
      halfLifeDays: DOMAIN_AFFINITY_HALF_LIFE_DAYS,
      frequencyWeight: 3.2,
      recencyWeight: 4.6,
      cap: 8,
    });
    if (domainSourceBoost > 0) {
      boost += domainSourceBoost;
      reasons.push('domain-source-affinity');
    }
  }

  const actionAffinityKeys = [
    `${sourceId}:${action.kind}`,
    ...action.secondaryActions.map((secondaryAction) => `${sourceId}:${secondaryAction.kind}`),
  ];
  const actionAffinityBoost = Math.max(
    0,
    ...actionAffinityKeys.map((key) => resolveAffinityScore({
      entry: profile.actionAffinity[key],
      now,
      halfLifeDays: ACTION_AFFINITY_HALF_LIFE_DAYS,
      frequencyWeight: 2.8,
      recencyWeight: 3.2,
      cap: 6,
    })),
  );
  if (actionAffinityBoost > 0) {
    boost += actionAffinityBoost;
    reasons.push('action-affinity');
  }

  const targetAvoidancePenalty = resolveAffinityScore({
    entry: profile.targetAvoidance[targetKey],
    now,
    halfLifeDays: TARGET_AVOIDANCE_HALF_LIFE_DAYS,
    frequencyWeight: 3.2,
    recencyWeight: 4.4,
    cap: 8,
  });
  if (targetAvoidancePenalty > 0) {
    boost -= targetAvoidancePenalty;
    reasons.push('target-avoidance');
  }

  if (queryKey) {
    const queryTargetAvoidancePenalty = resolveAffinityScore({
      entry: profile.queryTargetAvoidance[buildQueryTargetAffinityKey(queryKey, targetKey)],
      now,
      halfLifeDays: QUERY_TARGET_AVOIDANCE_HALF_LIFE_DAYS,
      frequencyWeight: 4.2,
      recencyWeight: 5.8,
      cap: 10,
    });
    if (queryTargetAvoidancePenalty > 0) {
      boost -= queryTargetAvoidancePenalty;
      reasons.push('query-target-avoidance');
    }
  }

  return {
    boost: Math.max(-MAX_PERSONALIZATION_PENALTY, Math.min(MAX_PERSONALIZATION_BOOST, boost)),
    reasons,
  };
}

export function readSearchPersonalizationProfile(): SearchPersonalizationProfile {
  try {
    const raw = readCachedLocalStorageItem(SEARCH_PERSONALIZATION_KEY);
    if (!raw) return EMPTY_SEARCH_PERSONALIZATION_PROFILE;
    if (cachedSearchPersonalizationRaw === raw && cachedSearchPersonalizationParsed) {
      return cachedSearchPersonalizationParsed;
    }
    const normalized = normalizeSearchPersonalizationProfile(JSON.parse(raw) as unknown);
    cachedSearchPersonalizationRaw = raw;
    cachedSearchPersonalizationParsed = normalized;
    return normalized;
  } catch {
    return EMPTY_SEARCH_PERSONALIZATION_PROFILE;
  }
}

export function recordSearchPersonalizationEvent(args: {
  profile?: SearchPersonalizationProfile;
  queryModel: MixedSearchQueryModel;
  action: SearchAction;
  secondaryAction?: SearchSecondaryAction;
  visibleActions?: readonly SearchAction[];
  usedAt?: number;
}): SearchPersonalizationProfile {
  const {
    profile = readSearchPersonalizationProfile(),
    queryModel,
    action,
    secondaryAction,
    visibleActions,
    usedAt = Date.now(),
  } = args;
  const next = cloneSearchPersonalizationProfile(profile);
  const queryKey = resolvePersonalizationQueryKey(queryModel);
  const sourceId = inferActionSourceId(action);
  const targetKey = inferActionTargetKey(action);
  const domainKey = inferActionDomainKey(action);

  recordAffinity(next.targetAffinity, targetKey, usedAt);
  if (queryKey) {
    recordAffinity(next.querySourceAffinity, buildQuerySourceAffinityKey(queryKey, sourceId), usedAt);
    recordAffinity(next.queryTargetAffinity, buildQueryTargetAffinityKey(queryKey, targetKey), usedAt);
  }
  if (domainKey) {
    recordAffinity(next.domainSourceAffinity, buildDomainSourceAffinityKey(domainKey, sourceId), usedAt);
  }

  const actionAffinityKey = secondaryAction
    ? `${sourceId}:${secondaryAction.kind}`
    : `${sourceId}:${action.kind}`;
  recordAffinity(next.actionAffinity, actionAffinityKey, usedAt);

  const selectedIndex = visibleActions?.findIndex((candidate) => candidate.id === action.id) ?? -1;
  if (selectedIndex > 0) {
    const skippedActions = visibleActions?.slice(
      Math.max(0, selectedIndex - MAX_WEAK_NEGATIVE_SAMPLES),
      selectedIndex,
    ) ?? [];
    const recordedTargetKeys = new Set<string>();
    skippedActions.forEach((skippedAction) => {
      const skippedTargetKey = inferActionTargetKey(skippedAction);
      if (!skippedTargetKey || skippedTargetKey === targetKey || recordedTargetKeys.has(skippedTargetKey)) {
        return;
      }
      recordedTargetKeys.add(skippedTargetKey);
      recordAffinity(next.targetAvoidance, skippedTargetKey, usedAt);
      if (queryKey) {
        recordAffinity(
          next.queryTargetAvoidance,
          buildQueryTargetAffinityKey(queryKey, skippedTargetKey),
          usedAt,
        );
      }
    });
  }

  const trimmed = trimSearchPersonalizationProfile(next);
  writeSearchPersonalizationProfile(trimmed);
  return trimmed;
}

export function rerankPersonalizedSearchActions(args: {
  actions: readonly SearchAction[];
  queryModel: MixedSearchQueryModel;
  profile: SearchPersonalizationProfile;
  now?: number;
}): SearchAction[] {
  const { actions, queryModel, profile, now = Date.now() } = args;
  if (actions.length <= 1 || !hasSearchPersonalizationData(profile)) {
    return [...actions];
  }

  const rerankWindow = actions.slice(0, MAX_PERSONALIZED_RERANK_ACTIONS).map((action, index) => {
    const effectiveBaseRank = action.baseRank ?? index;
    const personalizationScore = scoreSearchActionPersonalization({
      action,
      queryModel,
      profile,
      now,
    });
    return {
      action,
      index,
      effectiveBaseRank,
      personalizedSortScore:
        (MAX_PERSONALIZED_RERANK_ACTIONS - Math.min(MAX_PERSONALIZED_RERANK_ACTIONS, effectiveBaseRank)) * BASE_RANK_WEIGHT
        + personalizationScore.boost,
      personalizationReasons: personalizationScore.reasons,
    };
  });

  const rerankedWindow = rerankWindow
    .sort((a, b) => (
      b.personalizedSortScore - a.personalizedSortScore
      || a.effectiveBaseRank - b.effectiveBaseRank
      || a.index - b.index
    ))
    .map(({ action, personalizationReasons }) => {
      if (personalizationReasons.length <= 0) return action;
      return {
        ...action,
        reasons: [
          ...new Set([
            ...(action.reasons || []),
            ...personalizationReasons.map((reason) => `personalization:${reason}`),
          ]),
        ],
      };
    });

  return [
    ...rerankedWindow,
    ...actions.slice(MAX_PERSONALIZED_RERANK_ACTIONS),
  ];
}
