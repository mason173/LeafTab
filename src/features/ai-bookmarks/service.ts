import type { SearchSuggestionItem } from '@/types';
import {
  AI_BOOKMARK_DEFAULT_MODEL_ID,
  AI_BOOKMARK_MIN_QUERY_LENGTH,
  AI_BOOKMARK_QUERY_CACHE_LIMIT,
  AI_BOOKMARK_QUERY_CACHE_TTL_MS,
  AI_BOOKMARK_SEARCH_CANDIDATE_LIMIT_MULTIPLIER,
  AI_BOOKMARK_SEARCH_MIN_CANDIDATES,
  AI_BOOKMARK_SEMANTIC_RESULT_MIN_SCORE,
  AI_BOOKMARK_SEMANTIC_RESULT_MIN_SCORE_CJK,
} from '@/features/ai-bookmarks/constants';
import { syncSemanticBookmarkIndex } from '@/features/ai-bookmarks/indexSync';
import {
  buildSemanticHybridScore,
  mergeSuggestions,
} from '@/features/ai-bookmarks/ranker';
import { embedTextsWithBookmarkModel } from '@/features/ai-bookmarks/sandboxClient';
import { searchBookmarkSemanticIndex } from '@/features/ai-bookmarks/storage';
import { hasCjkText } from '@/features/ai-bookmarks/text';
import type {
  BookmarkSemanticIndexEntry,
  BookmarkSemanticSearchResult,
} from '@/features/ai-bookmarks/types';
import { normalizeSearchQuery } from '@/utils/searchHelpers';

type BookmarkApi = typeof chrome.bookmarks;

type QueryCacheValue = {
  cachedAt: number;
  items: SearchSuggestionItem[];
};

const queryCache = new Map<string, QueryCacheValue>();

function clearQueryCache() {
  queryCache.clear();
}

function buildQueryCacheKey(query: string, limit: number): string {
  return `${query.trim().toLowerCase()}::${Math.max(1, limit)}`;
}

function readQueryCache(query: string, limit: number): SearchSuggestionItem[] | null {
  const key = buildQueryCacheKey(query, limit);
  const cached = queryCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > AI_BOOKMARK_QUERY_CACHE_TTL_MS) {
    queryCache.delete(key);
    return null;
  }
  return cached.items.slice(0, limit);
}

function writeQueryCache(query: string, limit: number, items: SearchSuggestionItem[]) {
  const key = buildQueryCacheKey(query, limit);
  queryCache.set(key, {
    cachedAt: Date.now(),
    items: items.slice(0, AI_BOOKMARK_QUERY_CACHE_LIMIT),
  });
}

async function searchSemanticEntries(args: {
  entries: BookmarkSemanticIndexEntry[];
  query: string;
  limit: number;
}): Promise<BookmarkSemanticSearchResult[]> {
  if (!args.query.trim() || args.query.trim().length < AI_BOOKMARK_MIN_QUERY_LENGTH) return [];
  if (args.entries.length <= 0) return [];
  const normalizedQuery = normalizeSearchQuery(args.query);
  if (!normalizedQuery) return [];
  const preferSemantic = hasCjkText(args.query);

  const [queryEmbedding] = await embedTextsWithBookmarkModel({
    modelId: AI_BOOKMARK_DEFAULT_MODEL_ID,
    texts: [args.query],
    isQuery: true,
  });
  if (!queryEmbedding || queryEmbedding.length <= 0) return [];

  const semanticMinimumScore = preferSemantic
    ? AI_BOOKMARK_SEMANTIC_RESULT_MIN_SCORE_CJK
    : AI_BOOKMARK_SEMANTIC_RESULT_MIN_SCORE;

  const candidateLimit = Math.max(
    args.limit * AI_BOOKMARK_SEARCH_CANDIDATE_LIMIT_MULTIPLIER,
    AI_BOOKMARK_SEARCH_MIN_CANDIDATES,
  );
  const candidates = await searchBookmarkSemanticIndex({
    embeddingModel: AI_BOOKMARK_DEFAULT_MODEL_ID,
    queryEmbedding,
    limit: Math.min(candidateLimit, Math.max(args.entries.length, args.limit)),
  });

  const ranked = candidates
    .map((entry) => ({
      bookmarkId: entry.bookmarkId,
      url: entry.url,
      label: entry.title || entry.domain || entry.url,
      score: buildSemanticHybridScore({
        entry,
        normalizedQuery,
        preferSemantic,
        semanticScore: entry.semanticScore,
      }),
    }))
    .filter((entry) => Number.isFinite(entry.score) && entry.score >= semanticMinimumScore)
    .sort((left, right) => right.score - left.score);

  return ranked.slice(0, args.limit);
}

export async function getSemanticBookmarkSuggestions(args: {
  bookmarksApi: BookmarkApi;
  query: string;
  limit: number;
  fallbackItems: SearchSuggestionItem[];
}): Promise<SearchSuggestionItem[]> {
  const safeLimit = Math.max(1, args.limit);
  const trimmedQuery = args.query.trim();
  if (!trimmedQuery) return args.fallbackItems.slice(0, safeLimit);

  const cached = readQueryCache(trimmedQuery, safeLimit);
  if (cached) return cached;

  try {
    const entries = await syncSemanticBookmarkIndex(args.bookmarksApi);
    const semanticResults = await searchSemanticEntries({
      entries,
      query: trimmedQuery,
      limit: safeLimit,
    });
    const merged = mergeSuggestions({
      query: trimmedQuery,
      limit: safeLimit,
      semanticResults,
      fallbackItems: args.fallbackItems,
    });
    writeQueryCache(trimmedQuery, safeLimit, merged);
    return merged;
  } catch {
    return args.fallbackItems.slice(0, safeLimit);
  }
}
