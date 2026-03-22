import type { SearchSuggestionItem } from '@/types';
import {
  AI_BOOKMARK_DEFAULT_MODEL_ID,
  AI_BOOKMARK_INDEX_BATCH_SIZE,
  AI_BOOKMARK_INDEX_SCHEMA_VERSION,
  AI_BOOKMARK_MIN_QUERY_LENGTH,
  AI_BOOKMARK_QUERY_CACHE_LIMIT,
  AI_BOOKMARK_QUERY_CACHE_TTL_MS,
} from '@/features/ai-bookmarks/constants';
import { loadBookmarkSemanticDocuments } from '@/features/ai-bookmarks/bookmarks';
import { embedTextsWithBookmarkModel } from '@/features/ai-bookmarks/sandboxClient';
import { enrichBookmarkDocumentsWithPageMetadata } from '@/features/ai-bookmarks/pageMetadata';
import {
  clearBookmarkSemanticIndex,
  readBookmarkSemanticIndexEntries,
  readBookmarkSemanticIndexMeta,
  replaceBookmarkSemanticIndex,
} from '@/features/ai-bookmarks/storage';
import {
  buildBookmarkContentHash,
  buildBookmarkSearchText,
  buildBookmarkSourceSignature,
  hasCjkText,
} from '@/features/ai-bookmarks/text';
import type {
  BookmarkSemanticDocument,
  BookmarkSemanticIndexEntry,
  BookmarkSemanticIndexMeta,
  BookmarkSemanticSearchResult,
  BookmarkSemanticSearchStatus,
} from '@/features/ai-bookmarks/types';
import { yieldToMainThread } from '@/utils/mainThreadScheduler';

type BookmarkApi = typeof chrome.bookmarks;

type QueryCacheValue = {
  cachedAt: number;
  items: SearchSuggestionItem[];
};

const queryCache = new Map<string, QueryCacheValue>();
const statusListeners = new Set<(status: BookmarkSemanticSearchStatus) => void>();
let syncPromise: Promise<BookmarkSemanticIndexEntry[]> | null = null;
let attachedListeners = false;
let status: BookmarkSemanticSearchStatus = {
  modelState: 'idle',
  indexState: 'idle',
  available: false,
  indexedCount: 0,
  builtAt: null,
  lastError: null,
};

function setStatus(partial: Partial<BookmarkSemanticSearchStatus>) {
  status = {
    ...status,
    ...partial,
  };
  for (const listener of statusListeners) {
    listener(status);
  }
}

function clearQueryCache() {
  queryCache.clear();
}

function invalidateSemanticBookmarkIndex() {
  syncPromise = null;
  clearQueryCache();
  setStatus({
    modelState: 'idle',
    indexState: 'idle',
    available: false,
  });
}

function isMissingLocalModelAssetsError(message: string): boolean {
  return message.includes('local_model_assets_missing:');
}

function ensureBookmarkListeners(bookmarksApi: BookmarkApi) {
  if (attachedListeners) return;

  const invalidate = () => {
    void clearBookmarkSemanticIndex().catch(() => {});
    invalidateSemanticBookmarkIndex();
  };

  bookmarksApi.onCreated?.addListener?.(invalidate);
  bookmarksApi.onRemoved?.addListener?.(invalidate);
  bookmarksApi.onChanged?.addListener?.(invalidate);
  bookmarksApi.onMoved?.addListener?.(invalidate);
  bookmarksApi.onChildrenReordered?.addListener?.(invalidate);
  bookmarksApi.onImportBegan?.addListener?.(invalidate);
  bookmarksApi.onImportEnded?.addListener?.(invalidate);
  attachedListeners = true;
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

function cosineSimilarity(left: readonly number[], right: readonly number[]): number {
  const size = Math.min(left.length, right.length);
  if (size <= 0) return 0;

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < size; index += 1) {
    const leftValue = Number(left[index] || 0);
    const rightValue = Number(right[index] || 0);
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude <= 0 || rightMagnitude <= 0) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function toSearchSuggestionItem(entry: BookmarkSemanticSearchResult): SearchSuggestionItem {
  return {
    type: 'bookmark',
    label: entry.label,
    value: entry.url,
    icon: '',
  };
}

function mergeSuggestions(args: {
  query: string;
  limit: number;
  semanticItems: SearchSuggestionItem[];
  fallbackItems: SearchSuggestionItem[];
}): SearchSuggestionItem[] {
  const preferSemantic = hasCjkText(args.query);
  const primaryItems = preferSemantic ? args.semanticItems : args.fallbackItems;
  const secondaryItems = preferSemantic ? args.fallbackItems : args.semanticItems;
  const seenUrls = new Set<string>();
  const merged: SearchSuggestionItem[] = [];

  for (const item of [...primaryItems, ...secondaryItems]) {
    if (merged.length >= args.limit) break;
    const value = item.value.trim();
    if (!value || seenUrls.has(value)) continue;
    seenUrls.add(value);
    merged.push(item);
  }

  return merged;
}

function hydrateDocumentsFromExistingEntries(args: {
  documents: BookmarkSemanticDocument[];
  existingEntries: BookmarkSemanticIndexEntry[];
}): BookmarkSemanticDocument[] {
  const existingByUrl = new Map(
    args.existingEntries.map((entry) => [entry.url, entry] as const),
  );

  return args.documents.map((document) => {
    const existingEntry = existingByUrl.get(document.url);
    if (!existingEntry) return document;

    const nextDocument: BookmarkSemanticDocument = {
      ...document,
      pageTitle: existingEntry.pageTitle,
      metaDescription: existingEntry.metaDescription,
      bodyPreview: existingEntry.bodyPreview,
      searchText: '',
      contentHash: '',
      indexedAt: existingEntry.indexedAt,
    };
    nextDocument.searchText = buildBookmarkSearchText({
      title: nextDocument.title,
      url: nextDocument.url,
      domain: nextDocument.domain,
      folderPath: nextDocument.folderPath,
      pageTitle: nextDocument.pageTitle,
      metaDescription: nextDocument.metaDescription,
      bodyPreview: nextDocument.bodyPreview,
    });
    nextDocument.contentHash = buildBookmarkContentHash(nextDocument);
    return nextDocument;
  });
}

function hasPendingPageMetadata(documents: BookmarkSemanticDocument[]): boolean {
  return documents.some((document) => !document.pageTitle && !document.metaDescription && !document.bodyPreview);
}

async function buildIndexEntries(args: {
  documents: BookmarkSemanticDocument[];
  existingEntries: BookmarkSemanticIndexEntry[];
}): Promise<BookmarkSemanticIndexEntry[]> {
  const existingByUrl = new Map(
    args.existingEntries.map((entry) => [entry.url, entry] as const),
  );
  const out: BookmarkSemanticIndexEntry[] = new Array(args.documents.length);
  const pendingEntries: Array<{ document: BookmarkSemanticDocument; index: number }> = [];

  for (let index = 0; index < args.documents.length; index += 1) {
    const document = args.documents[index];
    const existingEntry = existingByUrl.get(document.url);
    if (
      existingEntry
      && existingEntry.embeddingModel === AI_BOOKMARK_DEFAULT_MODEL_ID
      && existingEntry.contentHash === document.contentHash
    ) {
      out[index] = existingEntry;
      continue;
    }

    pendingEntries.push({ document, index });
  }

  if (pendingEntries.length <= 0) return out;

  for (let start = 0; start < pendingEntries.length; start += AI_BOOKMARK_INDEX_BATCH_SIZE) {
    const batch = pendingEntries.slice(start, start + AI_BOOKMARK_INDEX_BATCH_SIZE);
    const embeddings = await embedTextsWithBookmarkModel({
      modelId: AI_BOOKMARK_DEFAULT_MODEL_ID,
      texts: batch.map(({ document }) => document.searchText),
    });

    for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
      const current = batch[batchIndex];
      out[current.index] = {
        ...current.document,
        indexedAt: Date.now(),
        embedding: embeddings[batchIndex] || [],
        embeddingModel: AI_BOOKMARK_DEFAULT_MODEL_ID,
      };
    }
    await yieldToMainThread();
  }

  return out;
}

async function syncSemanticBookmarkIndex(
  bookmarksApi: BookmarkApi,
): Promise<BookmarkSemanticIndexEntry[]> {
  ensureBookmarkListeners(bookmarksApi);

  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    setStatus({
      indexState: 'syncing',
      lastError: null,
    });

    const rawDocuments = await loadBookmarkSemanticDocuments(bookmarksApi);
    const contentHashes = rawDocuments.map((document) => document.contentHash);
    const sourceSignature = buildBookmarkSourceSignature(contentHashes);
    const existingMeta = await readBookmarkSemanticIndexMeta();
    const existingEntries = await readBookmarkSemanticIndexEntries();
    const hydratedDocuments = hydrateDocumentsFromExistingEntries({
      documents: rawDocuments,
      existingEntries,
    });
    const pendingPageMetadata = hasPendingPageMetadata(hydratedDocuments);

    if (
      existingMeta
      && existingMeta.schemaVersion === AI_BOOKMARK_INDEX_SCHEMA_VERSION
      && existingMeta.embeddingModel === AI_BOOKMARK_DEFAULT_MODEL_ID
      && existingMeta.sourceSignature === sourceSignature
      && existingEntries.length === rawDocuments.length
      && !pendingPageMetadata
    ) {
      setStatus({
        modelState: existingEntries.length > 0 ? 'ready' : status.modelState,
        indexState: 'ready',
        available: existingEntries.length > 0,
        indexedCount: existingEntries.length,
        builtAt: existingMeta.builtAt,
      });
      return existingEntries;
    }

    setStatus({
      modelState: 'loading',
    });

    const enrichedDocuments = pendingPageMetadata
      ? await enrichBookmarkDocumentsWithPageMetadata(hydratedDocuments)
      : hydratedDocuments;
    const entries = await buildIndexEntries({
      documents: enrichedDocuments,
      existingEntries,
    });
    const timestamp = Date.now();
    const meta: BookmarkSemanticIndexMeta = {
      id: 'meta',
      schemaVersion: AI_BOOKMARK_INDEX_SCHEMA_VERSION,
      embeddingModel: AI_BOOKMARK_DEFAULT_MODEL_ID,
      sourceSignature,
      bookmarkCount: entries.length,
      builtAt: timestamp,
    };
    await replaceBookmarkSemanticIndex({ entries, meta });

    setStatus({
      modelState: 'ready',
      indexState: 'ready',
      available: entries.length > 0,
      indexedCount: entries.length,
      builtAt: timestamp,
      lastError: null,
    });
    return entries;
  })().catch((error) => {
    const message = String((error as Error)?.message || error || 'semantic_bookmark_index_failed');
    console.error('[ai-bookmarks] semantic index failed', error);
    setStatus({
      modelState: isMissingLocalModelAssetsError(message) ? 'idle' : 'error',
      indexState: isMissingLocalModelAssetsError(message) ? 'idle' : 'error',
      available: false,
      lastError: message,
    });
    throw error;
  }).finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

async function searchSemanticEntries(args: {
  entries: BookmarkSemanticIndexEntry[];
  query: string;
  limit: number;
}): Promise<BookmarkSemanticSearchResult[]> {
  if (!args.query.trim() || args.query.trim().length < AI_BOOKMARK_MIN_QUERY_LENGTH) return [];
  if (args.entries.length <= 0) return [];

  const [queryEmbedding] = await embedTextsWithBookmarkModel({
    modelId: AI_BOOKMARK_DEFAULT_MODEL_ID,
    texts: [args.query],
    isQuery: true,
  });
  if (!queryEmbedding || queryEmbedding.length <= 0) return [];

  const ranked = args.entries
    .map((entry) => ({
      bookmarkId: entry.bookmarkId,
      url: entry.url,
      label: entry.title || entry.domain || entry.url,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
    }))
    .filter((entry) => Number.isFinite(entry.score) && entry.score > 0)
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
    const semanticItems = semanticResults.map(toSearchSuggestionItem);
    const merged = mergeSuggestions({
      query: trimmedQuery,
      limit: safeLimit,
      semanticItems,
      fallbackItems: args.fallbackItems,
    });
    writeQueryCache(trimmedQuery, safeLimit, merged);
    return merged;
  } catch {
    return args.fallbackItems.slice(0, safeLimit);
  }
}

export function getSemanticBookmarkSearchStatus(): BookmarkSemanticSearchStatus {
  return status;
}

export function subscribeSemanticBookmarkSearchStatus(
  listener: (status: BookmarkSemanticSearchStatus) => void,
): () => void {
  statusListeners.add(listener);
  listener(status);
  return () => {
    statusListeners.delete(listener);
  };
}

export async function warmSemanticBookmarkIndex(
  bookmarksApi: BookmarkApi,
): Promise<void> {
  try {
    await syncSemanticBookmarkIndex(bookmarksApi);
  } catch {
    // Search falls back to keyword matching when semantic indexing is unavailable.
  }
}
