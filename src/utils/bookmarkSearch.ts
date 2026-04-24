import type { SearchSuggestionItem } from '@/types';
import {
  buildSearchMatchCandidates,
  getShortcutSuggestionScoreFromCandidates,
  normalizeSearchQuery,
} from '@/utils/searchHelpers';
import { throwIfAborted } from '@/utils/abort';
import { yieldToMainThread } from '@/utils/mainThreadScheduler';

type BookmarkApi = typeof chrome.bookmarks;

type BookmarkIndexEntry = {
  id: string;
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
const BOOKMARK_QUERY_CACHE_KEY_LIMIT = 120;
const BOOKMARK_INDEX_YIELD_INTERVAL = 250;
const BOOKMARK_RANK_YIELD_INTERVAL = 400;

let bookmarkIndexCache: { builtAt: number; entries: BookmarkIndexEntry[] } | null = null;
let bookmarkIndexPromise: Promise<BookmarkIndexEntry[]> | null = null;
let bookmarkListenersAttached = false;
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
    bookmarkId: node.id,
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

async function flattenBookmarkTree(
  nodes: readonly chrome.bookmarks.BookmarkTreeNode[] | undefined,
  signal?: AbortSignal,
): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  if (!nodes || nodes.length === 0) return [];

  const out: chrome.bookmarks.BookmarkTreeNode[] = [];
  const stack = [...nodes].reverse();
  let processedCount = 0;

  while (stack.length > 0) {
    throwIfAborted(signal);
    const node = stack.pop();
    if (!node) continue;

    if (node.url) out.push(node);
    if (node.children?.length) {
      for (let index = node.children.length - 1; index >= 0; index -= 1) {
        stack.push(node.children[index]);
      }
    }

    processedCount += 1;
    if (processedCount % BOOKMARK_INDEX_YIELD_INTERVAL === 0) {
      await yieldToMainThread();
    }
  }

  return out;
}

function normalizeBookmarkQueryCacheKey(rawQuery: string): string {
  return normalizeSearchQuery(rawQuery);
}

export function invalidateBookmarkSearchCaches() {
  bookmarkIndexCache = null;
  bookmarkIndexPromise = null;
  bookmarkQueryCache.clear();
}

function ensureBookmarkCacheListeners(bookmarksApi: BookmarkApi) {
  if (bookmarkListenersAttached) return;

  bookmarksApi.onCreated?.addListener?.(invalidateBookmarkSearchCaches);
  bookmarksApi.onRemoved?.addListener?.(invalidateBookmarkSearchCaches);
  bookmarksApi.onChanged?.addListener?.(invalidateBookmarkSearchCaches);
  bookmarksApi.onMoved?.addListener?.(invalidateBookmarkSearchCaches);
  bookmarksApi.onChildrenReordered?.addListener?.(invalidateBookmarkSearchCaches);
  bookmarksApi.onImportBegan?.addListener?.(invalidateBookmarkSearchCaches);
  bookmarksApi.onImportEnded?.addListener?.(invalidateBookmarkSearchCaches);
  bookmarkListenersAttached = true;
}

function readBookmarkQueryCache(rawQuery: string, limit: number): SearchSuggestionItem[] | null {
  const key = normalizeBookmarkQueryCacheKey(rawQuery);
  const cached = bookmarkQueryCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > BOOKMARK_QUERY_CACHE_TTL_MS) {
    bookmarkQueryCache.delete(key);
    return null;
  }
  // Touch key to keep frequently used queries hot and evict stale keys first.
  bookmarkQueryCache.delete(key);
  bookmarkQueryCache.set(key, cached);
  return cached.items.slice(0, Math.max(1, limit));
}

function writeBookmarkQueryCache(rawQuery: string, items: SearchSuggestionItem[]) {
  const key = normalizeBookmarkQueryCacheKey(rawQuery);
  if (bookmarkQueryCache.has(key)) {
    bookmarkQueryCache.delete(key);
  }
  bookmarkQueryCache.set(key, {
    cachedAt: Date.now(),
    items: items.slice(0, BOOKMARK_QUERY_CACHE_LIMIT),
  });
  while (bookmarkQueryCache.size > BOOKMARK_QUERY_CACHE_KEY_LIMIT) {
    const oldestKey = bookmarkQueryCache.keys().next().value;
    if (typeof oldestKey !== 'string') break;
    bookmarkQueryCache.delete(oldestKey);
  }
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

function getBookmarkTree(
  bookmarksApi: BookmarkApi,
): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  return new Promise((resolve) => {
    bookmarksApi.getTree((nodes) => {
      if (hasBookmarkRuntimeError()) {
        resolve([]);
        return;
      }
      resolve(nodes || []);
    });
  });
}

async function getBookmarkIndex(
  bookmarksApi: BookmarkApi,
  signal?: AbortSignal,
): Promise<BookmarkIndexEntry[]> {
  ensureBookmarkCacheListeners(bookmarksApi);
  const now = Date.now();
  if (bookmarkIndexCache && now - bookmarkIndexCache.builtAt < BOOKMARK_INDEX_CACHE_TTL_MS) {
    return bookmarkIndexCache.entries;
  }
  if (bookmarkIndexPromise) return bookmarkIndexPromise;

  bookmarkIndexPromise = (async () => {
    const tree = await getBookmarkTree(bookmarksApi);
    throwIfAborted(signal);
    const flatNodes = await flattenBookmarkTree(tree, signal);
    const dedupedByUrl = new Map<string, BookmarkIndexEntry>();

    let order = 0;
    for (const node of flatNodes) {
      throwIfAborted(signal);
      const url = (node.url || '').trim();
      if (!url || dedupedByUrl.has(url)) continue;
      const label = (node.title || url).trim() || url;
      dedupedByUrl.set(url, {
        id: node.id,
        label,
        url,
        order,
        dateAdded: Number(node.dateAdded || 0),
        titleCandidates: buildSearchMatchCandidates(label),
        urlCandidates: buildSearchMatchCandidates(url),
      });
      order += 1;

      if (order % BOOKMARK_INDEX_YIELD_INTERVAL === 0) {
        await yieldToMainThread();
      }
    }

    const entries = Array.from(dedupedByUrl.values());
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

export async function getBookmarkSuggestionsFromApi(
  bookmarksApi: BookmarkApi,
  rawQuery: string,
  limit = 30,
  options?: {
    signal?: AbortSignal;
  },
): Promise<SearchSuggestionItem[]> {
  const query = rawQuery.trim();
  const safeLimit = Math.max(1, limit);
  ensureBookmarkCacheListeners(bookmarksApi);
  throwIfAborted(options?.signal);

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
  throwIfAborted(options?.signal);
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

  const bookmarkIndex = await getBookmarkIndex(bookmarksApi, options?.signal);
  const remainingLimit = Math.max(0, desiredCacheLimit - directItems.length);
  const ranked: RankedBookmarkCandidate[] = [];
  let processedCount = 0;

  for (const entry of bookmarkIndex) {
    throwIfAborted(options?.signal);
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
      bookmarkId: candidate.entry.id,
    });
  }

  writeBookmarkQueryCache(query, merged);
  return merged.slice(0, safeLimit);
}
