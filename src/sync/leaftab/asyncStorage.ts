const DB_NAME = 'leaftab-sync-cache';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

let dbPromise: Promise<IDBDatabase | null> | null = null;

const cloneValue = <T>(value: T): T => {
  try {
    return structuredClone(value);
  } catch {
    return JSON.parse(JSON.stringify(value)) as T;
  }
};

const getIndexedDb = () => {
  try {
    return globalThis.indexedDB || null;
  } catch {
    return null;
  }
};

const openDatabase = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    const indexedDb = getIndexedDb();
    if (!indexedDb) {
      resolve(null);
      return;
    }

    const request = indexedDb.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onerror = () => {
      resolve(null);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
  });

  return dbPromise;
};

export const readLeafTabSyncCacheEntry = async <T>(key: string): Promise<T | null> => {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onerror = () => {
      resolve(null);
    };
    request.onsuccess = () => {
      const value = request.result;
      resolve(value == null ? null : cloneValue(value as T));
    };
  });
};

export const writeLeafTabSyncCacheEntry = async (key: string, value: unknown): Promise<boolean> => {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(cloneValue(value), key);
    request.onerror = () => {
      resolve(false);
    };
    request.onsuccess = () => {
      resolve(true);
    };
  });
};

export const removeLeafTabSyncCacheEntry = async (key: string): Promise<boolean> => {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onerror = () => {
      resolve(false);
    };
    request.onsuccess = () => {
      resolve(true);
    };
  });
};
