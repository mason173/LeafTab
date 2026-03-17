import type { SearchSuggestionItem } from '@/types';
import {
  buildSearchMatchCandidates,
  getShortcutSuggestionScoreFromCandidates,
  normalizeSearchQuery,
} from '@/utils/searchHelpers';

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
  };
}

function dedupeBookmarkSuggestionItems(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
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

function flattenBookmarkTree(
  nodes: chrome.bookmarks.BookmarkTreeNode[] | undefined,
  out: chrome.bookmarks.BookmarkTreeNode[] = [],
): chrome.bookmarks.BookmarkTreeNode[] {
  if (!nodes || nodes.length === 0) return out;
  for (const node of nodes) {
    if (node.url) out.push(node);
    if (node.children && node.children.length > 0) {
      flattenBookmarkTree(node.children, out);
    }
  }
  return out;
}

function normalizeBookmarkQueryCacheKey(rawQuery: string): string {
  return normalizeSearchQuery(rawQuery);
}

function invalidateBookmarkSearchCaches() {
  bookmarkIndexCache = null;
  bookmarkIndexPromise = null;
  bookmarkQueryCache.clear();
}

function ensureBookmarkCacheListeners(bookmarksApi: BookmarkApi) {
  if (bookmarkListenersAttached) return;

  const invalidate = () => {
    invalidateBookmarkSearchCaches();
  };

  bookmarksApi.onCreated?.addListener?.(invalidate);
  bookmarksApi.onRemoved?.addListener?.(invalidate);
  bookmarksApi.onChanged?.addListener?.(invalidate);
  bookmarksApi.onMoved?.addListener?.(invalidate);
  bookmarksApi.onChildrenReordered?.addListener?.(invalidate);
  bookmarksApi.onImportBegan?.addListener?.(invalidate);
  bookmarksApi.onImportEnded?.addListener?.(invalidate);
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

async function getBookmarkIndex(bookmarksApi: BookmarkApi): Promise<BookmarkIndexEntry[]> {
  ensureBookmarkCacheListeners(bookmarksApi);
  const now = Date.now();
  if (bookmarkIndexCache && now - bookmarkIndexCache.builtAt < BOOKMARK_INDEX_CACHE_TTL_MS) {
    return bookmarkIndexCache.entries;
  }
  if (bookmarkIndexPromise) return bookmarkIndexPromise;

  bookmarkIndexPromise = (async () => {
    const tree = await getBookmarkTree(bookmarksApi);
    const flatNodes = flattenBookmarkTree(tree);
    const dedupedByUrl = new Map<string, BookmarkIndexEntry>();

    let order = 0;
    for (const node of flatNodes) {
      const url = (node.url || '').trim();
      if (!url || dedupedByUrl.has(url)) continue;
      const label = (node.title || url).trim() || url;
      dedupedByUrl.set(url, {
        label,
        url,
        order,
        dateAdded: Number(node.dateAdded || 0),
        titleCandidates: buildSearchMatchCandidates(label),
        urlCandidates: buildSearchMatchCandidates(url),
      });
      order += 1;
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
): Promise<SearchSuggestionItem[]> {
  const query = rawQuery.trim();
  const safeLimit = Math.max(1, limit);
  ensureBookmarkCacheListeners(bookmarksApi);

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
  const ranked = bookmarkIndex
    .filter((entry) => !seenUrls.has(entry.url))
    .map((entry) => ({
      entry,
      score: getShortcutSuggestionScoreFromCandidates({
        titleCandidates: entry.titleCandidates,
        urlCandidates: entry.urlCandidates,
        normalizedQuery,
      }),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => (
      b.score - a.score
      || b.entry.dateAdded - a.entry.dateAdded
      || a.entry.order - b.entry.order
    ));

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
