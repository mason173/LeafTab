import type { SearchSuggestionItem } from '@/types';
import {
  buildSearchMatchCandidates,
  getSearchMatchPriorityFromCandidates,
} from '@/utils/searchHelpers';
import type {
  MixedSearchCandidate,
  MixedSearchResult,
  MixedSearchSourceBundle,
  MixedSearchSourceId,
} from '@/utils/mixedSearchContracts';
import type { MixedSearchIntent, MixedSearchQueryModel } from '@/utils/mixedSearchQueryModel';

type FusionPhase = {
  sources: MixedSearchSourceId[];
  rounds: number | 'all';
};

type RankedItem = {
  item: SearchSuggestionItem;
  score: number;
  index: number;
};

function looksLikeUrlTarget(rawValue: string): boolean {
  const value = rawValue.trim();
  if (!value) return false;
  return /^(https?:\/\/|www\.)/i.test(value) || /^[a-z0-9-]+\.[a-z]{2,}(\/|$)/i.test(value);
}

function normalizeUrlTarget(rawValue: string): string {
  return rawValue
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '');
}

function getSuggestionDedupKey(item: SearchSuggestionItem): string {
  const rawValue = item.value || '';
  if (
    item.type === 'shortcut'
    || item.type === 'bookmark'
    || item.type === 'tab'
    || looksLikeUrlTarget(rawValue)
  ) {
    return `target|${normalizeUrlTarget(rawValue)}`;
  }
  if (item.type === 'history' || item.type === 'remote') {
    return `query|${rawValue.trim().toLowerCase()}`;
  }
  return `${item.type}|${rawValue.trim().toLowerCase()}`;
}

function matchesSuggestionQuery(item: SearchSuggestionItem, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const labelPriority = getSearchMatchPriorityFromCandidates(
    buildSearchMatchCandidates(item.label || ''),
    normalizedQuery,
    { fuzzy: true },
  );
  if (labelPriority > 0) return true;
  const valuePriority = getSearchMatchPriorityFromCandidates(
    buildSearchMatchCandidates(item.value || ''),
    normalizedQuery,
    { fuzzy: true },
  );
  return valuePriority > 0;
}

function getSourceIntentWeight(sourceId: MixedSearchSourceId, queryModel: MixedSearchQueryModel): number {
  const { intent } = queryModel;

  if (intent === 'navigate') {
    switch (sourceId) {
      case 'tabs':
        return 420;
      case 'recently-closed':
        return 340;
      case 'shortcuts':
        return 390;
      case 'bookmarks':
        return 360;
      case 'builtin-sites':
        return 320;
      case 'local-history':
        return 170;
      case 'browser-history':
        return 130;
      case 'remote':
        return 25;
      case 'settings':
        return 50;
      case 'commands':
        return 40;
      default:
        return 0;
    }
  }

  if (intent === 'command') {
    switch (sourceId) {
      case 'commands':
        return 420;
      case 'settings':
        return 360;
      case 'shortcuts':
        return 180;
      case 'tabs':
        return 140;
      case 'bookmarks':
        return 120;
      default:
        return 0;
    }
  }

  if (intent === 'empty') {
    switch (sourceId) {
      case 'recently-closed':
        return 320;
      case 'browser-history':
        return 280;
      case 'shortcuts':
        return 240;
      case 'local-history':
        return 200;
      default:
        return 0;
    }
  }

  switch (sourceId) {
    case 'shortcuts':
      return 320;
    case 'builtin-sites':
      return 300;
    case 'tabs':
      return 280;
    case 'bookmarks':
      return 260;
    case 'settings':
      return 220;
    case 'local-history':
      return 170;
    case 'browser-history':
      return 110;
    case 'remote':
      return 20;
    case 'commands':
      return 60;
    default:
      return 0;
  }
}

function resolveCompactQuery(rawValue: string): string {
  return rawValue.trim().toLowerCase().replace(/\s+/g, '');
}

function scoreSuggestionItem(
  sourceId: MixedSearchSourceId,
  item: SearchSuggestionItem,
  queryModel: MixedSearchQueryModel,
): number {
  const rankingQuery = queryModel.rankingQuery || queryModel.normalizedQuery;
  const labelPriority = getSearchMatchPriorityFromCandidates(
    buildSearchMatchCandidates(item.label || ''),
    rankingQuery,
    { fuzzy: true },
  );
  const valuePriority = getSearchMatchPriorityFromCandidates(
    buildSearchMatchCandidates(item.value || ''),
    rankingQuery,
    { fuzzy: true },
  );
  const detailPriority = getSearchMatchPriorityFromCandidates(
    buildSearchMatchCandidates(item.detail || ''),
    rankingQuery,
    { fuzzy: true },
  );
  const normalizedLabel = (item.label || '').trim().toLowerCase();
  const normalizedValue = (item.value || '').trim().toLowerCase();
  const normalizedDetail = (item.detail || '').trim().toLowerCase();
  const compactQuery = queryModel.compactRankingQuery || resolveCompactQuery(rankingQuery);
  const compactLabel = resolveCompactQuery(normalizedLabel);
  const compactValue = resolveCompactQuery(normalizedValue);
  const compactDetail = resolveCompactQuery(normalizedDetail);
  const normalizedTarget = normalizeUrlTarget(item.value || '');
  const normalizedDomain = normalizedTarget.split('/')[0] || normalizedTarget;

  let score = getSourceIntentWeight(sourceId, queryModel);
  score += labelPriority * 120 + valuePriority * 96 + detailPriority * 36;

  if (normalizedLabel === rankingQuery) score += 180;
  else if (normalizedLabel.startsWith(rankingQuery)) score += 110;
  else if (normalizedLabel.includes(rankingQuery)) score += 44;
  else if (compactQuery && compactLabel === compactQuery) score += 132;
  else if (compactQuery && compactLabel.startsWith(compactQuery)) score += 88;
  else if (compactQuery && compactLabel.includes(compactQuery)) score += 32;

  if (normalizedValue === rankingQuery) score += 100;
  else if (normalizedValue.startsWith(rankingQuery)) score += 54;
  else if (normalizedValue.includes(rankingQuery)) score += 24;
  else if (compactQuery && compactValue === compactQuery) score += 80;
  else if (compactQuery && compactValue.startsWith(compactQuery)) score += 42;
  else if (compactQuery && compactValue.includes(compactQuery)) score += 16;

  if (normalizedDetail === rankingQuery) score += 32;
  else if (compactQuery && compactDetail === compactQuery) score += 24;
  else if (compactQuery && compactDetail.includes(compactQuery)) score += 12;

  if (compactQuery && normalizedDomain.includes(compactQuery)) {
    score += 150;
  }

  if (queryModel.wantsOfficialTarget) {
    if (compactQuery && normalizedDomain.includes(compactQuery)) {
      score += 180;
    }
    if (normalizedLabel.includes('官网') || normalizedLabel.includes('official')) {
      score += 120;
    }
    if (normalizedValue.includes('official')) {
      score += 60;
    }
    if (sourceId === 'remote') {
      score -= 120;
    }
  }

  if (queryModel.intent === 'navigate' && sourceId === 'remote') {
    score -= 100;
  }

  if (item.type === 'remote') {
    score -= 16;
  }

  if (item.type === 'history' && item.historySource === 'local' && queryModel.intent === 'navigate') {
    score -= 36;
  }

  return score;
}

function rankSourceItems(
  sourceId: MixedSearchSourceId,
  items: readonly SearchSuggestionItem[],
  queryModel: MixedSearchQueryModel,
): SearchSuggestionItem[] {
  return items
    .map<RankedItem>((item, index) => ({
      item,
      index,
      score: scoreSuggestionItem(sourceId, item, queryModel),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}

function filterSourceItems(
  bundle: MixedSearchSourceBundle | undefined,
  queryModel: MixedSearchQueryModel,
): readonly SearchSuggestionItem[] {
  if (!bundle) return [];

  if (queryModel.isEmpty) {
    return rankSourceItems(bundle.sourceId, bundle.items, queryModel);
  }

  if (bundle.sourceId === 'remote') {
    return rankSourceItems(bundle.sourceId, bundle.items, queryModel);
  }

  const rankingQuery = queryModel.rankingQuery || queryModel.normalizedQuery;
  return rankSourceItems(
    bundle.sourceId,
    bundle.items.filter((item) => matchesSuggestionQuery(item, rankingQuery)),
    queryModel,
  );
}

function createCandidate(
  sourceId: MixedSearchSourceId,
  item: SearchSuggestionItem,
  sourceRank: number,
  queryModel: MixedSearchQueryModel,
): MixedSearchCandidate {
  const reasons = [`source:${sourceId}`, `intent:${queryModel.intent}`];
  return {
    sourceId,
    item,
    sourceRank,
    reasons,
  };
}

function takeNextCandidate(args: {
  sourceId: MixedSearchSourceId;
  queues: Map<MixedSearchSourceId, SearchSuggestionItem[]>;
  seenKeys: Set<string>;
  queryModel: MixedSearchQueryModel;
}): MixedSearchResult | null {
  const {
    sourceId,
    queues,
    seenKeys,
    queryModel,
  } = args;
  const queue = queues.get(sourceId);
  if (!queue || queue.length === 0) return null;

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) return null;
    const dedupKey = getSuggestionDedupKey(item);
    if (seenKeys.has(dedupKey)) continue;
    seenKeys.add(dedupKey);
    const sourceRank = Math.max(0, queues.get(sourceId)?.length ?? 0);
    const candidate = createCandidate(sourceId, item, sourceRank, queryModel);
    return {
      candidate,
      globalRank: -1,
      reasons: candidate.reasons,
    };
  }

  return null;
}

function appendPhaseCandidates(args: {
  target: MixedSearchResult[];
  seenKeys: Set<string>;
  queues: Map<MixedSearchSourceId, SearchSuggestionItem[]>;
  phase: FusionPhase;
  queryModel: MixedSearchQueryModel;
  limit: number;
}) {
  const {
    target,
    seenKeys,
    queues,
    phase,
    queryModel,
    limit,
  } = args;
  const maxRounds = phase.rounds === 'all' ? Number.POSITIVE_INFINITY : phase.rounds;
  let rounds = 0;

  while (rounds < maxRounds && target.length < limit) {
    let addedInRound = false;

    for (const sourceId of phase.sources) {
      if (target.length >= limit) break;

      const nextResult = takeNextCandidate({
        sourceId,
        queues,
        seenKeys,
        queryModel,
      });
      if (!nextResult) continue;

      target.push({
        ...nextResult,
        globalRank: target.length,
      });
      addedInRound = true;
    }

    if (!addedInRound) {
      break;
    }

    rounds += 1;
  }
}

function resolveFusionPhases(
  intent: MixedSearchIntent,
  queues?: Map<MixedSearchSourceId, SearchSuggestionItem[]>,
): FusionPhase[] {
  switch (intent) {
    case 'empty': {
      const topShortcutCandidate = queues?.get('shortcuts')?.[0];
      if (topShortcutCandidate?.type === 'shortcut' && topShortcutCandidate.recentlyAdded) {
        return [
          { sources: ['shortcuts', 'recently-closed', 'browser-history', 'local-history'], rounds: 1 },
          { sources: ['shortcuts', 'recently-closed', 'browser-history', 'local-history'], rounds: 'all' },
        ];
      }
      return [
        { sources: ['recently-closed', 'browser-history', 'shortcuts', 'local-history'], rounds: 1 },
        { sources: ['recently-closed', 'browser-history', 'shortcuts', 'local-history'], rounds: 'all' },
      ];
    }
    case 'scoped-tabs':
      return [
        { sources: ['tabs'], rounds: 'all' },
      ];
    case 'scoped-bookmarks':
      return [
        { sources: ['bookmarks'], rounds: 'all' },
      ];
    case 'scoped-history':
      return [
        { sources: ['browser-history'], rounds: 'all' },
      ];
    case 'command':
      return [
        { sources: ['commands', 'settings'], rounds: 2 },
        { sources: ['shortcuts', 'tabs', 'bookmarks'], rounds: 1 },
        { sources: ['commands', 'settings', 'shortcuts', 'tabs', 'bookmarks'], rounds: 'all' },
      ];
    case 'navigate':
      return [
        { sources: ['tabs', 'shortcuts', 'bookmarks'], rounds: 1 },
        { sources: ['builtin-sites'], rounds: 1 },
        { sources: ['tabs', 'shortcuts', 'bookmarks', 'builtin-sites'], rounds: 'all' },
        { sources: ['local-history', 'browser-history'], rounds: 'all' },
        { sources: ['remote'], rounds: 'all' },
      ];
    case 'search':
    default:
      return [
        { sources: ['shortcuts', 'builtin-sites'], rounds: 1 },
        { sources: ['tabs', 'bookmarks', 'settings'], rounds: 1 },
        { sources: ['shortcuts', 'builtin-sites', 'tabs', 'bookmarks', 'settings'], rounds: 'all' },
        { sources: ['local-history', 'browser-history'], rounds: 'all' },
        { sources: ['remote'], rounds: 'all' },
      ];
  }
}

export function buildMixedSearchResults(args: {
  queryModel: MixedSearchQueryModel;
  sourceBundles: MixedSearchSourceBundle[];
  emptyStateLimit: number;
  queryStateLimit: number;
}): MixedSearchResult[] {
  const {
    queryModel,
    sourceBundles,
    emptyStateLimit,
    queryStateLimit,
  } = args;
  const bundleMap = new Map<MixedSearchSourceId, MixedSearchSourceBundle>(
    sourceBundles.map((bundle) => [bundle.sourceId, bundle]),
  );

  const limit = queryModel.isEmpty ? emptyStateLimit : queryStateLimit;
  const results: MixedSearchResult[] = [];
  const seenKeys = new Set<string>();
  const queues = new Map<MixedSearchSourceId, SearchSuggestionItem[]>(
    queryModel.sourcePlan.map((sourceId) => [sourceId, [...filterSourceItems(bundleMap.get(sourceId), queryModel)]]),
  );

  if (queryModel.primarySourceId) {
    appendPhaseCandidates({
      target: results,
      seenKeys,
      queues,
      phase: { sources: [queryModel.primarySourceId], rounds: 'all' },
      queryModel,
      limit,
    });
    return results;
  }

  for (const phase of resolveFusionPhases(queryModel.intent, queues)) {
    appendPhaseCandidates({
      target: results,
      seenKeys,
      queues,
      phase,
      queryModel,
      limit,
    });
    if (results.length >= limit) break;
  }

  return results;
}
