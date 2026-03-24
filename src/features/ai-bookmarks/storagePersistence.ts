import {
  AI_BOOKMARK_INDEX_DB_NAME,
  AI_BOOKMARK_INDEX_DB_VERSION,
  AI_BOOKMARK_INDEX_ENTRIES_STORE,
  AI_BOOKMARK_INDEX_META_STORE,
} from '@/features/ai-bookmarks/constants';
import type { BookmarkSemanticIndexEntry, BookmarkSemanticIndexMeta } from '@/features/ai-bookmarks/types';

type BookmarkIndexDb = IDBDatabase;

function openBookmarkIndexDb(): Promise<BookmarkIndexDb> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(AI_BOOKMARK_INDEX_DB_NAME, AI_BOOKMARK_INDEX_DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AI_BOOKMARK_INDEX_ENTRIES_STORE)) {
        db.createObjectStore(AI_BOOKMARK_INDEX_ENTRIES_STORE, { keyPath: 'bookmarkId' });
      }
      if (!db.objectStoreNames.contains(AI_BOOKMARK_INDEX_META_STORE)) {
        db.createObjectStore(AI_BOOKMARK_INDEX_META_STORE, { keyPath: 'id' });
      }
    };
  });
}

function readAllFromStore<T>(db: BookmarkIndexDb, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result || []) as T[]);
  });
}

function readValueFromStore<T>(db: BookmarkIndexDb, storeName: string, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
  });
}

function normalizeBookmarkSemanticIndexEntry(
  entry: BookmarkSemanticIndexEntry,
): BookmarkSemanticIndexEntry {
  return {
    ...entry,
    pageMetadataState: entry.pageMetadataState || 'pending',
    pageMetadataFetchedAt: Number(entry.pageMetadataFetchedAt || 0),
    pageMetadataRetryAt: Number(entry.pageMetadataRetryAt || 0),
  };
}

export async function readPersistedBookmarkSemanticIndexEntries(): Promise<BookmarkSemanticIndexEntry[]> {
  const db = await openBookmarkIndexDb();
  const entries = await readAllFromStore<BookmarkSemanticIndexEntry>(db, AI_BOOKMARK_INDEX_ENTRIES_STORE);
  return entries.map(normalizeBookmarkSemanticIndexEntry);
}

export async function readPersistedBookmarkSemanticIndexMeta(): Promise<BookmarkSemanticIndexMeta | null> {
  const db = await openBookmarkIndexDb();
  return readValueFromStore<BookmarkSemanticIndexMeta>(db, AI_BOOKMARK_INDEX_META_STORE, 'meta');
}

export async function replacePersistedBookmarkSemanticIndex(args: {
  entries: BookmarkSemanticIndexEntry[];
  meta: BookmarkSemanticIndexMeta;
}): Promise<void> {
  const db = await openBookmarkIndexDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      [AI_BOOKMARK_INDEX_ENTRIES_STORE, AI_BOOKMARK_INDEX_META_STORE],
      'readwrite',
    );
    const entriesStore = transaction.objectStore(AI_BOOKMARK_INDEX_ENTRIES_STORE);
    const metaStore = transaction.objectStore(AI_BOOKMARK_INDEX_META_STORE);

    entriesStore.clear();
    metaStore.clear();
    for (const entry of args.entries) {
      entriesStore.put(normalizeBookmarkSemanticIndexEntry(entry));
    }
    metaStore.put(args.meta);

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}

export async function clearPersistedBookmarkSemanticIndex(): Promise<void> {
  const db = await openBookmarkIndexDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(
      [AI_BOOKMARK_INDEX_ENTRIES_STORE, AI_BOOKMARK_INDEX_META_STORE],
      'readwrite',
    );
    transaction.objectStore(AI_BOOKMARK_INDEX_ENTRIES_STORE).clear();
    transaction.objectStore(AI_BOOKMARK_INDEX_META_STORE).clear();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}
