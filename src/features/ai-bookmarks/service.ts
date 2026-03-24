import type { SearchSuggestionItem } from '@/types';
import {
  AI_BOOKMARK_DEFAULT_MODEL_ID,
  AI_BOOKMARK_INDEX_BATCH_SIZE,
  AI_BOOKMARK_INDEX_SCHEMA_VERSION,
  AI_BOOKMARK_MIN_QUERY_LENGTH,
  AI_BOOKMARK_QUERY_CACHE_LIMIT,
  AI_BOOKMARK_QUERY_CACHE_TTL_MS,
  AI_BOOKMARK_SEARCH_CANDIDATE_LIMIT_MULTIPLIER,
  AI_BOOKMARK_SEARCH_MIN_CANDIDATES,
} from '@/features/ai-bookmarks/constants';
import { loadBookmarkSemanticDocuments } from '@/features/ai-bookmarks/bookmarks';
import { embedTextsWithBookmarkModel } from '@/features/ai-bookmarks/sandboxClient';
import {
  enrichBookmarkDocumentsWithPageMetadata,
  shouldAttemptPageMetadataRefresh,
} from '@/features/ai-bookmarks/pageMetadata';
import {
  readBookmarkSemanticIndexEntries,
  readBookmarkSemanticIndexMeta,
  replaceBookmarkSemanticIndex,
  searchBookmarkSemanticIndex,
} from '@/features/ai-bookmarks/storage';
import {
  buildBookmarkContentHash,
  buildBookmarkSearchText,
  buildBookmarkSourceSignature,
  extractDomain,
  hasCjkText,
} from '@/features/ai-bookmarks/text';
import type {
  BookmarkSemanticDocument,
  BookmarkSemanticIndexEntry,
  BookmarkSemanticIndexMeta,
  BookmarkSemanticSearchCandidate,
  BookmarkSemanticSearchResult,
  BookmarkSemanticSearchStatus,
} from '@/features/ai-bookmarks/types';
import { yieldToMainThread } from '@/utils/mainThreadScheduler';
import {
  buildSearchMatchCandidates,
  getSearchMatchPriorityFromCandidates,
  normalizeSearchQuery,
} from '@/utils/searchHelpers';

type BookmarkApi = typeof chrome.bookmarks;

type QueryCacheValue = {
  cachedAt: number;
  items: SearchSuggestionItem[];
};

type ScoredSuggestionItem = SearchSuggestionItem & {
  score: number;
  source: 'semantic' | 'keyword';
  rank: number;
};

const queryCache = new Map<string, QueryCacheValue>();
const statusListeners = new Set<(status: BookmarkSemanticSearchStatus) => void>();
let syncPromise: Promise<BookmarkSemanticIndexEntry[]> | null = null;
let metadataRefreshPromise: Promise<void> | null = null;
let metadataRefreshSourceSignature = '';
let attachedListeners = false;
const AI_BOOKMARK_WARM_COOLDOWN_KEY = 'leaftab_ai_bookmark_warm_cooldown_at';
const AI_BOOKMARK_WARM_COOLDOWN_MS = 10 * 60 * 1000;
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

function readWarmCooldownAt(): number {
  try {
    const raw = localStorage.getItem(AI_BOOKMARK_WARM_COOLDOWN_KEY) || '';
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeWarmCooldownAt(value: number) {
  try {
    localStorage.setItem(AI_BOOKMARK_WARM_COOLDOWN_KEY, String(value));
  } catch {}
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

function buildFallbackSuggestionScore(args: {
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

function mergeSuggestions(args: {
  query: string;
  limit: number;
  semanticResults: BookmarkSemanticSearchResult[];
  fallbackItems: SearchSuggestionItem[];
}): SearchSuggestionItem[] {
  const normalizedQuery = normalizeSearchQuery(args.query);
  const preferSemantic = hasCjkText(args.query);
  const mergedByUrl = new Map<string, ScoredSuggestionItem>();

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

  args.semanticResults.forEach((result, index) => {
    upsert(toScoredSuggestionItem(
      toSearchSuggestionItem(result),
      result.score + (preferSemantic ? 0.02 : 0),
      'semantic',
      index,
    ));
  });

  args.fallbackItems.forEach((item, index) => {
    upsert(toScoredSuggestionItem(
      item,
      buildFallbackSuggestionScore({
        item,
        normalizedQuery,
        rank: index,
      }) + (preferSemantic ? 0 : 0.02),
      'keyword',
      index,
    ));
  });

  return Array.from(mergedByUrl.values())
    .sort((left, right) => (
      right.score - left.score
      || (right.source === 'semantic' ? 1 : 0) - (left.source === 'semantic' ? 1 : 0)
      || left.rank - right.rank
    ))
    .slice(0, args.limit)
    .map(({ score: _score, source: _source, rank: _rank, ...item }) => item);
}

function buildSemanticHybridScore(args: {
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
      pageMetadataState: existingEntry.pageMetadataState || 'pending',
      pageMetadataFetchedAt: Number(existingEntry.pageMetadataFetchedAt || 0),
      pageMetadataRetryAt: Number(existingEntry.pageMetadataRetryAt || 0),
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

function hasRefreshablePageMetadata(documents: BookmarkSemanticDocument[]): boolean {
  return documents.some((document) => shouldAttemptPageMetadataRefresh(document));
}

function areEntriesEquivalent(
  left: readonly BookmarkSemanticIndexEntry[],
  right: readonly BookmarkSemanticIndexEntry[],
): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index].contentHash !== right[index].contentHash) return false;
    if (left[index].pageMetadataState !== right[index].pageMetadataState) return false;
    if (left[index].pageMetadataFetchedAt !== right[index].pageMetadataFetchedAt) return false;
    if (left[index].pageMetadataRetryAt !== right[index].pageMetadataRetryAt) return false;
  }
  return true;
}

async function refreshPageMetadataInBackground(args: {
  sourceSignature: string;
  entries: BookmarkSemanticIndexEntry[];
}) {
  if (!hasRefreshablePageMetadata(args.entries)) return;
  if (metadataRefreshPromise && metadataRefreshSourceSignature === args.sourceSignature) return;

  metadataRefreshSourceSignature = args.sourceSignature;
  metadataRefreshPromise = (async () => {
    const enrichedDocuments = await enrichBookmarkDocumentsWithPageMetadata(args.entries);
    const nextEntries = await buildIndexEntries({
      documents: enrichedDocuments,
      existingEntries: args.entries,
    });

    if (areEntriesEquivalent(args.entries, nextEntries)) return;

    const latestMeta = await readBookmarkSemanticIndexMeta();
    if (!latestMeta || latestMeta.sourceSignature !== args.sourceSignature) return;

    await replaceBookmarkSemanticIndex({
      entries: nextEntries,
      meta: latestMeta,
    });
  })().catch((error) => {
    console.warn('[ai-bookmarks] background page metadata refresh failed', error);
  }).finally(() => {
    metadataRefreshPromise = null;
    metadataRefreshSourceSignature = '';
  });
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
      out[index] = {
        ...document,
        indexedAt: existingEntry.indexedAt,
        embedding: existingEntry.embedding,
        embeddingModel: existingEntry.embeddingModel,
      };
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
    const existingMeta = await readBookmarkSemanticIndexMeta();
    const existingEntries = await readBookmarkSemanticIndexEntries();

    if (
      existingMeta
      && existingMeta.schemaVersion === AI_BOOKMARK_INDEX_SCHEMA_VERSION
      && existingMeta.embeddingModel === AI_BOOKMARK_DEFAULT_MODEL_ID
      && existingEntries.length > 0
    ) {
      setStatus({
        modelState: 'ready',
        indexState: 'ready',
        available: true,
        indexedCount: existingEntries.length,
        builtAt: existingMeta.builtAt,
        lastError: null,
      });
    } else {
      setStatus({
        indexState: 'syncing',
        lastError: null,
      });
    }

    const rawDocuments = await loadBookmarkSemanticDocuments(bookmarksApi);
    const contentHashes = rawDocuments.map((document) => document.contentHash);
    const sourceSignature = buildBookmarkSourceSignature(contentHashes);
    const hydratedDocuments = hydrateDocumentsFromExistingEntries({
      documents: rawDocuments,
      existingEntries,
    });

    if (
      existingMeta
      && existingMeta.schemaVersion === AI_BOOKMARK_INDEX_SCHEMA_VERSION
      && existingMeta.embeddingModel === AI_BOOKMARK_DEFAULT_MODEL_ID
      && existingMeta.sourceSignature === sourceSignature
      && existingEntries.length === rawDocuments.length
    ) {
      setStatus({
        modelState: existingEntries.length > 0 ? 'ready' : status.modelState,
        indexState: 'ready',
        available: existingEntries.length > 0,
        indexedCount: existingEntries.length,
        builtAt: existingMeta.builtAt,
      });
      void refreshPageMetadataInBackground({
        sourceSignature,
        entries: existingEntries,
      });
      return existingEntries;
    }

    setStatus({
      indexState: 'syncing',
      modelState: 'loading',
      lastError: null,
    });

    const entries = await buildIndexEntries({
      documents: hydratedDocuments,
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
    void refreshPageMetadataInBackground({
      sourceSignature,
      entries,
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
  const normalizedQuery = normalizeSearchQuery(args.query);
  if (!normalizedQuery) return [];
  const preferSemantic = hasCjkText(args.query);

  const [queryEmbedding] = await embedTextsWithBookmarkModel({
    modelId: AI_BOOKMARK_DEFAULT_MODEL_ID,
    texts: [args.query],
    isQuery: true,
  });
  if (!queryEmbedding || queryEmbedding.length <= 0) return [];

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
    .filter((entry) => Number.isFinite(entry.score) && entry.score > 0.12)
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
) : Promise<void> {
  const now = Date.now();
  const lastWarmAt = readWarmCooldownAt();
  if (lastWarmAt > 0 && now - lastWarmAt < AI_BOOKMARK_WARM_COOLDOWN_MS) {
    return;
  }
  writeWarmCooldownAt(now);
  try {
    await syncSemanticBookmarkIndex(bookmarksApi);
  } catch {
    // Search falls back to keyword matching when semantic indexing is unavailable.
  }
}
