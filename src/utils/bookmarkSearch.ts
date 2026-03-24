import type { SearchSuggestionItem } from '@/types';
import { ENABLE_AI_BOOKMARK_SEARCH } from '@/config/featureFlags';
import { getSemanticBookmarkSuggestions } from '@/features/ai-bookmarks';
import {
  listBookmarkCorpus,
  subscribeBookmarkCorpusInvalidation,
} from '@/features/ai-bookmarks/corpus';
import {
  buildSearchMatchCandidates,
  getShortcutSuggestionScoreFromCandidates,
  normalizeSearchQuery,
} from '@/utils/searchHelpers';
import { yieldToMainThread } from '@/utils/mainThreadScheduler';

type BookmarkApi = typeof chrome.bookmarks;

type BookmarkIndexEntry = {
  label: string;
  url: string;
  order: number;
  dateAdded: number;
  titleCandidates: string[];
  urlCandidates: string[];
};

const BOOKMARK_INDEX_CACHE_TTL_MS = 60_000;
const BOOKMARK_QUERY_CACHE_TTL_MS = 30_000;
const BOOKMARK_QUERY_CACHE_LIMIT = 50;
const BOOKMARK_RANK_YIELD_INTERVAL = 400;
let bookmarkIndexCache: { builtAt: number; entries: BookmarkIndexEntry[] } | null = null;
let bookmarkIndexPromise: Promise<BookmarkIndexEntry[]> | null = null;
let bookmarkInvalidationSubscribed = false;
const bookmarkQueryCache = new Map<string, {
  cachedAt: number;
  items: SearchSuggestionItem[];
}>();

function hasBookmarkRuntimeError(): boolean {
  return Boolean(globalThis.chrome?.runtime?.lastError);
}

function toBookmarkSuggestionItem(node: chrome.bookmarks.BookmarkTreeNode): SearchSuggestionItem | null {
  const url = (node.url || '').trim();
  if (!url) return null;
  const label = (node.title || url).trim() || url;
  return {
    type: 'bookmark',
    label,
    value: url,
    icon: '',
  };
}

function dedupeBookmarkSuggestionItems(
  nodes: readonly chrome.bookmarks.BookmarkTreeNode[],
  limit: number,
  initialSeenUrls?: Set<string>,
): SearchSuggestionItem[] {
  const seenUrls = initialSeenUrls ?? new Set<string>();
  const next: SearchSuggestionItem[] = [];
  for (const node of nodes) {
    const item = toBookmarkSuggestionItem(node);
    if (!item || seenUrls.has(item.value)) continue;
    seenUrls.add(item.value);
    next.push(item);
    if (next.length >= limit) break;
  }
  return next;
}

function normalizeBookmarkQueryCacheKey(rawQuery: string): string {
  return normalizeSearchQuery(rawQuery);
}

function invalidateBookmarkSearchCaches() {
  bookmarkIndexCache = null;
  bookmarkIndexPromise = null;
  bookmarkQueryCache.clear();
}

function ensureBookmarkCacheInvalidation(bookmarksApi: BookmarkApi) {
  if (bookmarkInvalidationSubscribed) return;
  subscribeBookmarkCorpusInvalidation(bookmarksApi, invalidateBookmarkSearchCaches);
  bookmarkInvalidationSubscribed = true;
}

function readBookmarkQueryCache(rawQuery: string, limit: number): SearchSuggestionItem[] | null {
  const key = normalizeBookmarkQueryCacheKey(rawQuery);
  const cached = bookmarkQueryCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > BOOKMARK_QUERY_CACHE_TTL_MS) {
    bookmarkQueryCache.delete(key);
    return null;
  }
  return cached.items.slice(0, Math.max(1, limit));
}

function writeBookmarkQueryCache(rawQuery: string, items: SearchSuggestionItem[]) {
  const key = normalizeBookmarkQueryCacheKey(rawQuery);
  bookmarkQueryCache.set(key, {
    cachedAt: Date.now(),
    items: items.slice(0, BOOKMARK_QUERY_CACHE_LIMIT),
  });
}

function searchBookmarks(
  bookmarksApi: BookmarkApi,
  query: string,
): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  return new Promise((resolve) => {
    bookmarksApi.search({ query }, (nodes) => {
      if (hasBookmarkRuntimeError()) {
        resolve([]);
        return;
      }
      resolve(nodes || []);
    });
  });
}

function getRecentBookmarks(
  bookmarksApi: BookmarkApi,
  maxResults: number,
): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  return new Promise((resolve) => {
    bookmarksApi.getRecent(maxResults, (nodes) => {
      if (hasBookmarkRuntimeError()) {
        resolve([]);
        return;
      }
      resolve(nodes || []);
    });
  });
}

async function getBookmarkIndex(bookmarksApi: BookmarkApi): Promise<BookmarkIndexEntry[]> {
  ensureBookmarkCacheInvalidation(bookmarksApi);
  const now = Date.now();
  if (bookmarkIndexCache && now - bookmarkIndexCache.builtAt < BOOKMARK_INDEX_CACHE_TTL_MS) {
    return bookmarkIndexCache.entries;
  }
  if (bookmarkIndexPromise) return bookmarkIndexPromise;

  bookmarkIndexPromise = (async () => {
    const corpusEntries = await listBookmarkCorpus(bookmarksApi);
    const entries = corpusEntries.map((entry, order) => ({
      label: entry.title,
      url: entry.url,
      order,
      dateAdded: entry.dateAdded,
      titleCandidates: buildSearchMatchCandidates(entry.title),
      urlCandidates: buildSearchMatchCandidates(entry.url),
    }));
    bookmarkIndexCache = {
      builtAt: Date.now(),
      entries,
    };
    return entries;
  })();

  try {
    return await bookmarkIndexPromise;
  } finally {
    bookmarkIndexPromise = null;
  }
}

type RankedBookmarkCandidate = {
  entry: BookmarkIndexEntry;
  score: number;
};

function insertRankedBookmarkCandidate(
  list: RankedBookmarkCandidate[],
  next: RankedBookmarkCandidate,
  limit: number,
) {
  let insertAt = list.length;
  for (let index = 0; index < list.length; index += 1) {
    const current = list[index];
    if (
      next.score > current.score ||
      (next.score === current.score && next.entry.dateAdded > current.entry.dateAdded) ||
      (next.score === current.score && next.entry.dateAdded === current.entry.dateAdded && next.entry.order < current.entry.order)
    ) {
      insertAt = index;
      break;
    }
  }

  list.splice(insertAt, 0, next);
  if (list.length > limit) {
    list.pop();
  }
}

export function getCachedBookmarkSuggestions(
  rawQuery: string,
  limit = 30,
): SearchSuggestionItem[] | null {
  return readBookmarkQueryCache(rawQuery, limit);
}

async function getKeywordBookmarkSuggestionsFromApi(
  bookmarksApi: BookmarkApi,
  rawQuery: string,
  limit = 30,
): Promise<SearchSuggestionItem[]> {
  const query = rawQuery.trim();
  const safeLimit = Math.max(1, limit);
  ensureBookmarkCacheInvalidation(bookmarksApi);

  const cachedItems = readBookmarkQueryCache(query, safeLimit);
  if (cachedItems) return cachedItems;

  const desiredCacheLimit = Math.max(safeLimit, BOOKMARK_QUERY_CACHE_LIMIT);
  if (!query) {
    const recentNodes = await getRecentBookmarks(bookmarksApi, desiredCacheLimit);
    const recentItems = dedupeBookmarkSuggestionItems(recentNodes, desiredCacheLimit);
    writeBookmarkQueryCache(query, recentItems);
    return recentItems.slice(0, safeLimit);
  }

  const directNodes = await searchBookmarks(bookmarksApi, query);
  const seenUrls = new Set<string>();
  const directItems = dedupeBookmarkSuggestionItems(directNodes, desiredCacheLimit, seenUrls);
  if (directItems.length >= desiredCacheLimit) {
    writeBookmarkQueryCache(query, directItems);
    return directItems.slice(0, safeLimit);
  }

  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) {
    writeBookmarkQueryCache(query, directItems);
    return directItems.slice(0, safeLimit);
  }

  const bookmarkIndex = await getBookmarkIndex(bookmarksApi);
  const remainingLimit = Math.max(0, desiredCacheLimit - directItems.length);
  const ranked: RankedBookmarkCandidate[] = [];
  let processedCount = 0;

  for (const entry of bookmarkIndex) {
    if (seenUrls.has(entry.url)) continue;

    const score = getShortcutSuggestionScoreFromCandidates({
      titleCandidates: entry.titleCandidates,
      urlCandidates: entry.urlCandidates,
      normalizedQuery,
    });
    if (score > 0 && remainingLimit > 0) {
      insertRankedBookmarkCandidate(ranked, { entry, score }, remainingLimit);
    }

    processedCount += 1;
    if (processedCount % BOOKMARK_RANK_YIELD_INTERVAL === 0) {
      await yieldToMainThread();
    }
  }

  const merged = directItems.slice();
  for (const candidate of ranked) {
    if (merged.length >= desiredCacheLimit) break;
    seenUrls.add(candidate.entry.url);
    merged.push({
      type: 'bookmark',
      label: candidate.entry.label,
      value: candidate.entry.url,
      icon: '',
    });
  }

  writeBookmarkQueryCache(query, merged);
  return merged.slice(0, safeLimit);
}

export async function getBookmarkSuggestionsFromApi(
  bookmarksApi: BookmarkApi,
  rawQuery: string,
  limit = 30,
): Promise<SearchSuggestionItem[]> {
  const keywordItems = await getKeywordBookmarkSuggestionsFromApi(
    bookmarksApi,
    rawQuery,
    limit,
  );

  const trimmedQuery = rawQuery.trim();
  if (!ENABLE_AI_BOOKMARK_SEARCH || !trimmedQuery) {
    return keywordItems;
  }

  const mergedItems = await getSemanticBookmarkSuggestions({
    bookmarksApi,
    query: trimmedQuery,
    limit,
    fallbackItems: keywordItems,
  });
  writeBookmarkQueryCache(trimmedQuery, mergedItems);
  return mergedItems.slice(0, Math.max(1, limit));
}
