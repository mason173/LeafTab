import type {
  BookmarkSemanticIndexEntry,
  BookmarkSemanticIndexMeta,
  BookmarkSemanticSearchCandidate,
} from '@/features/ai-bookmarks/types';
import { requestBookmarkStorageWithSandbox } from '@/features/ai-bookmarks/sandboxClient';
import { isExtensionRuntime } from '@/platform/runtime';
import {
  clearPersistedBookmarkSemanticIndex,
  readPersistedBookmarkSemanticIndexEntries,
  readPersistedBookmarkSemanticIndexMeta,
  replacePersistedBookmarkSemanticIndex,
} from '@/features/ai-bookmarks/storagePersistence';

async function getStorageBackend() {
  return import('@/features/ai-bookmarks/storageBackend');
}

let sandboxHydrationPromise: Promise<void> | null = null;
let sandboxHydratedSourceSignature = '';

async function ensureSandboxIndexReady(): Promise<void> {
  if (!isExtensionRuntime()) return;
  if (sandboxHydrationPromise) return sandboxHydrationPromise;

  sandboxHydrationPromise = (async () => {
    const meta = await readPersistedBookmarkSemanticIndexMeta();
    if (!meta) {
      const response = await requestBookmarkStorageWithSandbox({
        operation: 'clear-index',
      });
      if (!response.ok) {
        throw new Error(response.error || 'ai_bookmark_storage_clear_failed');
      }
      sandboxHydratedSourceSignature = '';
      return;
    }

    if (sandboxHydratedSourceSignature === meta.sourceSignature) return;

    const entries = await readPersistedBookmarkSemanticIndexEntries();
    const response = await requestBookmarkStorageWithSandbox({
      operation: 'replace-index',
      entries,
      meta,
    });
    if (!response.ok) {
      throw new Error(response.error || 'ai_bookmark_storage_replace_failed');
    }
    sandboxHydratedSourceSignature = meta.sourceSignature;
  })().finally(() => {
    sandboxHydrationPromise = null;
  });

  return sandboxHydrationPromise;
}

export async function readBookmarkSemanticIndexEntries(): Promise<BookmarkSemanticIndexEntry[]> {
  if (!isExtensionRuntime()) {
    return (await getStorageBackend()).readBookmarkSemanticIndexEntries();
  }
  return readPersistedBookmarkSemanticIndexEntries();
}

export async function readBookmarkSemanticIndexMeta(): Promise<BookmarkSemanticIndexMeta | null> {
  if (!isExtensionRuntime()) {
    return (await getStorageBackend()).readBookmarkSemanticIndexMeta();
  }
  return readPersistedBookmarkSemanticIndexMeta();
}

export async function searchBookmarkSemanticIndex(args: {
  embeddingModel: BookmarkSemanticIndexEntry['embeddingModel'];
  queryEmbedding: readonly number[];
  limit: number;
}): Promise<BookmarkSemanticSearchCandidate[]> {
  if (!isExtensionRuntime()) {
    return (await getStorageBackend()).searchBookmarkSemanticIndex(args);
  }

  await ensureSandboxIndexReady();
  const response = await requestBookmarkStorageWithSandbox({
    operation: 'search-index',
    embeddingModel: args.embeddingModel,
    queryEmbedding: [...args.queryEmbedding],
    limit: args.limit,
  });
  if (response.ok && response.operation === 'search-index') {
    return response.entries;
  }
  throw new Error(response.error || 'ai_bookmark_storage_search_failed');
}

export async function replaceBookmarkSemanticIndex(args: {
  entries: BookmarkSemanticIndexEntry[];
  meta: BookmarkSemanticIndexMeta;
}): Promise<void> {
  if (!isExtensionRuntime()) {
    await (await getStorageBackend()).replaceBookmarkSemanticIndex(args);
    return;
  }

  await replacePersistedBookmarkSemanticIndex(args);
  const response = await requestBookmarkStorageWithSandbox({
    operation: 'replace-index',
    entries: args.entries,
    meta: args.meta,
  });
  if (!response.ok) {
    throw new Error(response.error || 'ai_bookmark_storage_replace_failed');
  }
  sandboxHydratedSourceSignature = args.meta.sourceSignature;
}

export async function clearBookmarkSemanticIndex(): Promise<void> {
  if (!isExtensionRuntime()) {
    await (await getStorageBackend()).clearBookmarkSemanticIndex();
    return;
  }

  await clearPersistedBookmarkSemanticIndex();
  const response = await requestBookmarkStorageWithSandbox({
    operation: 'clear-index',
  });
  if (!response.ok) {
    throw new Error(response.error || 'ai_bookmark_storage_clear_failed');
  }
  sandboxHydratedSourceSignature = '';
}
