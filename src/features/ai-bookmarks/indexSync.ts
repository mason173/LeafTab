import {
  AI_BOOKMARK_DEFAULT_MODEL_ID,
  AI_BOOKMARK_INDEX_BATCH_SIZE,
  AI_BOOKMARK_INDEX_SCHEMA_VERSION,
} from '@/features/ai-bookmarks/constants';
import { loadBookmarkSemanticDocuments } from '@/features/ai-bookmarks/bookmarks';
import { subscribeBookmarkCorpusInvalidation } from '@/features/ai-bookmarks/corpus';
import { inspectBookmarkModelPersistence } from '@/features/ai-bookmarks/model';
import { enrichBookmarkDocumentsWithPageMetadata, shouldAttemptPageMetadataRefresh } from '@/features/ai-bookmarks/pageMetadata';
import { embedTextsWithBookmarkModel, preloadBookmarkModel } from '@/features/ai-bookmarks/sandboxClient';
import {
  readBookmarkSemanticIndexEntries,
  readBookmarkSemanticIndexMeta,
  replaceBookmarkSemanticIndex,
} from '@/features/ai-bookmarks/storage';
import {
  getSemanticBookmarkSearchStatus,
  resetSemanticBookmarkSearchStatus,
  setSemanticBookmarkSearchStatus,
} from '@/features/ai-bookmarks/statusStore';
import {
  buildBookmarkContentHash,
  buildBookmarkSearchText,
  buildBookmarkSourceSignature,
} from '@/features/ai-bookmarks/text';
import type {
  BookmarkSemanticDocument,
  BookmarkSemanticIndexEntry,
  BookmarkSemanticIndexMeta,
  BookmarkSemanticSearchStatus,
} from '@/features/ai-bookmarks/types';
import { yieldToMainThread } from '@/utils/mainThreadScheduler';

type BookmarkApi = typeof chrome.bookmarks;

let syncPromise: Promise<BookmarkSemanticIndexEntry[]> | null = null;
let metadataRefreshPromise: Promise<void> | null = null;
let metadataRefreshSourceSignature = '';
let attachedListeners = false;
const AI_BOOKMARK_WARM_COOLDOWN_KEY = 'leaftab_ai_bookmark_warm_cooldown_at';
const AI_BOOKMARK_WARM_COOLDOWN_MS = 10 * 60 * 1000;

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

export function invalidateSemanticBookmarkIndex() {
  syncPromise = null;
  resetSemanticBookmarkSearchStatus({
    activity: 'idle',
    modelState: 'idle',
    indexState: 'idle',
    available: false,
    progress: null,
    progressLabel: null,
  });
}

function isMissingLocalModelAssetsError(message: string): boolean {
  return message.includes('local_model_assets_missing:');
}

function ensureBookmarkListeners(bookmarksApi: BookmarkApi) {
  if (attachedListeners) return;
  subscribeBookmarkCorpusInvalidation(bookmarksApi, invalidateSemanticBookmarkIndex);
  attachedListeners = true;
}

export function shouldReuseExistingSemanticIndex(args: {
  existingMeta: BookmarkSemanticIndexMeta | null;
  existingEntries: readonly BookmarkSemanticIndexEntry[];
  sourceSignature: string;
  bookmarkCount: number;
}): boolean {
  const { existingMeta, existingEntries, sourceSignature, bookmarkCount } = args;
  return Boolean(
    existingMeta
    && existingMeta.schemaVersion === AI_BOOKMARK_INDEX_SCHEMA_VERSION
    && existingMeta.embeddingModel === AI_BOOKMARK_DEFAULT_MODEL_ID
    && existingMeta.sourceSignature === sourceSignature
    && existingEntries.length === bookmarkCount
    && existingEntries.length > 0
  );
}

function createBookmarkReadProgressHandler(modelState: BookmarkSemanticSearchStatus['modelState']) {
  return ({ processed }: { processed: number }) => {
    const progress = Math.min(58, 44 + Math.round(Math.log10(processed + 1) * 10));
    setSemanticBookmarkSearchStatus({
      activity: 'reading-bookmarks',
      modelState,
      indexState: 'syncing',
      progress,
      progressLabel: '正在读取浏览器书签...',
    });
  };
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
  onProgress?: (progress: number, label?: string) => void;
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
    args.onProgress?.(
      42 + Math.round((start / Math.max(pendingEntries.length, 1)) * 46),
      '正在生成书签语义向量...',
    );
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
    const completed = Math.min(start + batch.length, pendingEntries.length);
    args.onProgress?.(
      42 + Math.round((completed / Math.max(pendingEntries.length, 1)) * 46),
      '正在生成书签语义向量...',
    );
    await yieldToMainThread();
  }

  return out;
}

export async function syncSemanticBookmarkIndex(
  bookmarksApi: BookmarkApi,
): Promise<BookmarkSemanticIndexEntry[]> {
  ensureBookmarkListeners(bookmarksApi);

  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    const existingMeta = await readBookmarkSemanticIndexMeta();
    const existingEntries = await readBookmarkSemanticIndexEntries();
    const shouldValidateExistingIndex = Boolean(
      existingMeta
      && existingMeta.schemaVersion === AI_BOOKMARK_INDEX_SCHEMA_VERSION
      && existingMeta.embeddingModel === AI_BOOKMARK_DEFAULT_MODEL_ID
      && existingEntries.length > 0,
    );
    let rawDocuments: BookmarkSemanticDocument[] | null = null;
    let sourceSignature = '';

    if (shouldValidateExistingIndex) {
      rawDocuments = await loadBookmarkSemanticDocuments(bookmarksApi, {
        onProgress: createBookmarkReadProgressHandler('idle'),
      });
      sourceSignature = buildBookmarkSourceSignature(
        rawDocuments.map((document) => document.contentHash),
      );

      if (shouldReuseExistingSemanticIndex({
        existingMeta,
        existingEntries,
        sourceSignature,
        bookmarkCount: rawDocuments.length,
      })) {
        setSemanticBookmarkSearchStatus({
          activity: 'ready',
          modelState: 'ready',
          indexState: 'ready',
          available: true,
          indexedCount: existingEntries.length,
          builtAt: existingMeta?.builtAt ?? null,
          lastError: null,
          progress: null,
          progressLabel: null,
        });
        void refreshPageMetadataInBackground({
          sourceSignature,
          entries: existingEntries,
        });
        return existingEntries;
      }
    }

    const modelPersistence = await inspectBookmarkModelPersistence(AI_BOOKMARK_DEFAULT_MODEL_ID);
    const modelLoadingActivity = modelPersistence.persistedLocally ? 'loading-model' : 'downloading-model';
    const initialModelLabel = modelPersistence.persistedLocally
      ? '正在加载本地 AI 模型...'
      : '首次使用将联网下载 AI 模型...';

    setSemanticBookmarkSearchStatus({
      activity: modelLoadingActivity,
      modelState: 'loading',
      indexState: 'idle',
      lastError: null,
      progress: 4,
      progressLabel: initialModelLabel,
    });

    await preloadBookmarkModel({
      modelId: AI_BOOKMARK_DEFAULT_MODEL_ID,
      onProgress: ({ progress, label }) => {
        setSemanticBookmarkSearchStatus({
          activity: modelLoadingActivity,
          modelState: 'loading',
          indexState: 'idle',
          lastError: null,
          progress: Math.min(42, 4 + Math.round(progress * 0.38)),
          progressLabel: label || initialModelLabel,
        });
      },
    });

    setSemanticBookmarkSearchStatus({
      activity: 'reading-bookmarks',
      modelState: 'ready',
      indexState: 'syncing',
      lastError: null,
      progress: 44,
      progressLabel: '正在读取浏览器书签...',
    });

    if (!rawDocuments) {
      rawDocuments = await loadBookmarkSemanticDocuments(bookmarksApi, {
        onProgress: createBookmarkReadProgressHandler('ready'),
      });
      sourceSignature = buildBookmarkSourceSignature(
        rawDocuments.map((document) => document.contentHash),
      );
    }

    const hydratedDocuments = hydrateDocumentsFromExistingEntries({
      documents: rawDocuments,
      existingEntries,
    });

    if (shouldReuseExistingSemanticIndex({
      existingMeta,
      existingEntries,
      sourceSignature,
      bookmarkCount: rawDocuments.length,
    })) {
      const currentStatus = getSemanticBookmarkSearchStatus();
      if (
        currentStatus.activity !== 'ready'
        || currentStatus.indexState !== 'ready'
        || currentStatus.indexedCount !== existingEntries.length
        || currentStatus.builtAt !== existingMeta?.builtAt
        || !currentStatus.available
      ) {
        setSemanticBookmarkSearchStatus({
          activity: 'ready',
          modelState: 'ready',
          indexState: 'ready',
          available: true,
          indexedCount: existingEntries.length,
          builtAt: existingMeta?.builtAt ?? null,
          lastError: null,
          progress: null,
          progressLabel: null,
        });
      }
      return existingEntries;
    }

    setSemanticBookmarkSearchStatus({
      activity: 'building-index',
      indexState: 'syncing',
      modelState: 'ready',
      lastError: null,
      progress: 62,
      progressLabel: '模型已就绪，正在准备 AI 书签索引数据...',
    });

    const entries = await buildIndexEntries({
      documents: hydratedDocuments,
      existingEntries,
      onProgress: (progress, label) => {
        const normalizedProgress = Math.max(42, Math.min(88, progress));
        setSemanticBookmarkSearchStatus({
          activity: 'building-index',
          modelState: 'ready',
          indexState: 'syncing',
          progress: Math.min(94, 62 + Math.round(((normalizedProgress - 42) / 46) * 30)),
          progressLabel: label || '正在建立 AI 书签语义索引...',
        });
      },
    });
    const timestamp = Date.now();
    setSemanticBookmarkSearchStatus({
      activity: 'saving-index',
      modelState: 'ready',
      indexState: 'syncing',
      progress: 96,
      progressLabel: '正在保存 AI 书签索引...',
    });
    const meta: BookmarkSemanticIndexMeta = {
      id: 'meta',
      schemaVersion: AI_BOOKMARK_INDEX_SCHEMA_VERSION,
      embeddingModel: AI_BOOKMARK_DEFAULT_MODEL_ID,
      sourceSignature,
      bookmarkCount: entries.length,
      builtAt: timestamp,
    };
    await replaceBookmarkSemanticIndex({ entries, meta });

    setSemanticBookmarkSearchStatus({
      activity: 'ready',
      modelState: 'ready',
      indexState: 'ready',
      available: entries.length > 0,
      indexedCount: entries.length,
      builtAt: timestamp,
      lastError: null,
      progress: null,
      progressLabel: null,
    });
    void refreshPageMetadataInBackground({
      sourceSignature,
      entries,
    });
    return entries;
  })().catch((error) => {
    const message = String((error as Error)?.message || error || 'semantic_bookmark_index_failed');
    const currentStatus = getSemanticBookmarkSearchStatus();
    const failedDuringModelLoad = (
      currentStatus.activity === 'downloading-model'
      || currentStatus.activity === 'loading-model'
      || currentStatus.modelState === 'loading'
    );
    console.error('[ai-bookmarks] semantic index failed', error);
    setSemanticBookmarkSearchStatus({
      activity: 'error',
      modelState: isMissingLocalModelAssetsError(message) ? 'idle' : 'error',
      indexState: isMissingLocalModelAssetsError(message) ? 'idle' : 'error',
      available: false,
      lastError: message,
      progress: currentStatus.progress,
      progressLabel: failedDuringModelLoad ? 'AI 模型下载失败' : 'AI 书签语义索引建立失败',
    });
    throw error;
  }).finally(() => {
    syncPromise = null;
  });

  return syncPromise;
}

export async function warmSemanticBookmarkIndex(
  bookmarksApi: BookmarkApi,
): Promise<void> {
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
