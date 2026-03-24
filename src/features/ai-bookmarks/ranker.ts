import type { SearchSuggestionItem } from '@/types';
import {
  AI_BOOKMARK_FALLBACK_SUPPLEMENT_LIMIT,
  AI_BOOKMARK_FALLBACK_SUPPLEMENT_MIN_SCORE,
  AI_BOOKMARK_FALLBACK_SUPPLEMENT_MIN_SCORE_CJK,
  AI_BOOKMARK_SEMANTIC_RESULT_MIN_SCORE,
  AI_BOOKMARK_SEMANTIC_RESULT_MIN_SCORE_CJK,
} from '@/features/ai-bookmarks/constants';
import { extractDomain, hasCjkText } from '@/features/ai-bookmarks/text';
import type {
  BookmarkSemanticIndexEntry,
  BookmarkSemanticSearchCandidate,
  BookmarkSemanticSearchResult,
} from '@/features/ai-bookmarks/types';
import {
  buildSearchMatchCandidates,
  getSearchMatchPriorityFromCandidates,
  normalizeSearchQuery,
} from '@/utils/searchHelpers';

type ScoredSuggestionItem = SearchSuggestionItem & {
  score: number;
  source: 'semantic' | 'keyword';
  rank: number;
};

function getWeightedMatchScore(
  priority: 0 | 1 | 2,
  weights: { prefix: number; contains: number },
): number {
  if (priority === 2) return weights.prefix;
  if (priority === 1) return weights.contains;
  return 0;
}

function hasExactCandidateMatch(
  candidates: readonly string[],
  normalizedQuery: string,
): boolean {
  return candidates.some((candidate) => candidate === normalizedQuery);
}

function buildLexicalBookmarkScore(args: {
  title: string;
  url: string;
  domain?: string;
  folderPath?: string;
  pageTitle?: string;
  normalizedQuery: string;
}): number {
  const titleCandidates = buildSearchMatchCandidates(args.title);
  const domainCandidates = buildSearchMatchCandidates(args.domain || '');
  const urlCandidates = buildSearchMatchCandidates(args.url);
  const folderCandidates = buildSearchMatchCandidates(args.folderPath || '');
  const pageTitleCandidates = buildSearchMatchCandidates(args.pageTitle || '');

  const titlePriority = getSearchMatchPriorityFromCandidates(
    titleCandidates,
    args.normalizedQuery,
  );
  const domainPriority = getSearchMatchPriorityFromCandidates(
    domainCandidates,
    args.normalizedQuery,
    { fuzzy: false },
  );
  const urlPriority = getSearchMatchPriorityFromCandidates(
    urlCandidates,
    args.normalizedQuery,
    { fuzzy: false },
  );
  const folderPriority = getSearchMatchPriorityFromCandidates(
    folderCandidates,
    args.normalizedQuery,
    { fuzzy: false },
  );
  const pageTitlePriority = getSearchMatchPriorityFromCandidates(
    pageTitleCandidates,
    args.normalizedQuery,
  );

  let score = 0;
  score += getWeightedMatchScore(titlePriority, { prefix: 0.34, contains: 0.18 });
  score += getWeightedMatchScore(domainPriority, { prefix: 0.2, contains: 0.12 });
  score += getWeightedMatchScore(urlPriority, { prefix: 0.14, contains: 0.08 });
  score += getWeightedMatchScore(folderPriority, { prefix: 0.1, contains: 0.06 });
  score += getWeightedMatchScore(pageTitlePriority, { prefix: 0.16, contains: 0.09 });

  if (hasExactCandidateMatch(titleCandidates, args.normalizedQuery)) score += 0.16;
  if (hasExactCandidateMatch(domainCandidates, args.normalizedQuery)) score += 0.12;
  if (hasExactCandidateMatch(urlCandidates, args.normalizedQuery)) score += 0.1;

  return Math.min(1, score);
}

function toSearchSuggestionItem(entry: BookmarkSemanticSearchResult): SearchSuggestionItem {
  return {
    type: 'bookmark',
    label: entry.label,
    value: entry.url,
    icon: '',
  };
}

function toScoredSuggestionItem(
  item: SearchSuggestionItem,
  score: number,
  source: 'semantic' | 'keyword',
  rank: number,
): ScoredSuggestionItem {
  return {
    ...item,
    score,
    source,
    rank,
  };
}

export function buildFallbackSuggestionScore(args: {
  item: SearchSuggestionItem;
  normalizedQuery: string;
  rank: number;
}): number {
  const lexicalScore = buildLexicalBookmarkScore({
    title: args.item.label,
    url: args.item.value,
    domain: extractDomain(args.item.value),
    normalizedQuery: args.normalizedQuery,
  });
  const rankBonus = Math.max(0, 0.18 - args.rank * 0.015);
  return lexicalScore * 0.92 + rankBonus;
}

export function mergeSuggestions(args: {
  query: string;
  limit: number;
  semanticResults: BookmarkSemanticSearchResult[];
  fallbackItems: SearchSuggestionItem[];
}): SearchSuggestionItem[] {
  const normalizedQuery = normalizeSearchQuery(args.query);
  const preferSemantic = hasCjkText(args.query);
  const mergedByUrl = new Map<string, ScoredSuggestionItem>();
  const semanticMinimumScore = preferSemantic
    ? AI_BOOKMARK_SEMANTIC_RESULT_MIN_SCORE_CJK
    : AI_BOOKMARK_SEMANTIC_RESULT_MIN_SCORE;
  const fallbackMinimumScore = preferSemantic
    ? AI_BOOKMARK_FALLBACK_SUPPLEMENT_MIN_SCORE_CJK
    : AI_BOOKMARK_FALLBACK_SUPPLEMENT_MIN_SCORE;

  const upsert = (item: ScoredSuggestionItem) => {
    const value = item.value.trim();
    if (!value) return;
    const existing = mergedByUrl.get(value);
    if (!existing) {
      mergedByUrl.set(value, item);
      return;
    }
    if (
      item.score > existing.score
      || (
        item.score === existing.score
        && item.source === 'semantic'
        && existing.source !== 'semantic'
      )
      || (
        item.score === existing.score
        && item.source === existing.source
        && item.rank < existing.rank
      )
    ) {
      mergedByUrl.set(value, item);
    }
  };

  const semanticItems = args.semanticResults
    .map((result, index) => toScoredSuggestionItem(
      toSearchSuggestionItem(result),
      result.score + (preferSemantic ? 0.02 : 0),
      'semantic',
      index,
    ))
    .filter((item) => Number.isFinite(item.score) && item.score >= semanticMinimumScore)
    .sort((left, right) => right.score - left.score || left.rank - right.rank);

  const fallbackItems = args.fallbackItems
    .map((item, index) => toScoredSuggestionItem(
      item,
      buildFallbackSuggestionScore({
        item,
        normalizedQuery,
        rank: index,
      }) + (preferSemantic ? 0 : 0.02),
      'keyword',
      index,
    ))
    .sort((left, right) => right.score - left.score || left.rank - right.rank);

  semanticItems.forEach(upsert);

  if (semanticItems.length > 0) {
    fallbackItems
      .filter((item) => item.score >= fallbackMinimumScore)
      .slice(0, AI_BOOKMARK_FALLBACK_SUPPLEMENT_LIMIT)
      .forEach(upsert);
  } else {
    fallbackItems.forEach(upsert);
  }

  return Array.from(mergedByUrl.values())
    .sort((left, right) => (
      right.score - left.score
      || (right.source === 'semantic' ? 1 : 0) - (left.source === 'semantic' ? 1 : 0)
      || left.rank - right.rank
    ))
    .slice(0, args.limit)
    .map(({ score: _score, source: _source, rank: _rank, ...item }) => item);
}

export function buildSemanticHybridScore(args: {
  entry: Pick<
    BookmarkSemanticIndexEntry | BookmarkSemanticSearchCandidate,
    'title' | 'url' | 'domain' | 'folderPath' | 'pageTitle'
  >;
  normalizedQuery: string;
  preferSemantic: boolean;
  semanticScore: number;
}): number {
  const semanticScore = args.semanticScore;
  const lexicalScore = buildLexicalBookmarkScore({
    title: args.entry.title,
    url: args.entry.url,
    domain: args.entry.domain,
    folderPath: args.entry.folderPath,
    pageTitle: args.entry.pageTitle,
    normalizedQuery: args.normalizedQuery,
  });

  if (semanticScore < 0.12 && lexicalScore <= 0) return 0;

  const semanticWeight = args.preferSemantic ? 0.72 : 0.62;
  const lexicalWeight = args.preferSemantic ? 0.28 : 0.38;
  let finalScore = semanticScore * semanticWeight + lexicalScore * lexicalWeight;

  if (semanticScore >= 0.45 && lexicalScore >= 0.18) finalScore += 0.06;
  if (semanticScore < 0.18 && lexicalScore < 0.16) finalScore = 0;

  return finalScore;
}
