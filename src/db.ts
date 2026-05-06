
const DB_NAME = 'LeafTabDB';
const STORE_NAME = 'wallpapers';
const DB_VERSION = 1;
const CUSTOM_WALLPAPER_KEY = 'customWallpaper';
const CUSTOM_WALLPAPER_GALLERY_KEY = 'customWallpaperGallery';
const BING_WALLPAPER_BLOB_KEY = 'bingWallpaperBlob';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const saveWallpaper = async (wallpaper: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(wallpaper, CUSTOM_WALLPAPER_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getWallpaper = async (): Promise<string | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(CUSTOM_WALLPAPER_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
};

export const deleteWallpaper = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(CUSTOM_WALLPAPER_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const saveWallpaperGallery = async (wallpapers: string[]): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(wallpapers, CUSTOM_WALLPAPER_GALLERY_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getWallpaperGallery = async (): Promise<string[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(CUSTOM_WALLPAPER_GALLERY_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const value = request.result;
      if (!Array.isArray(value)) {
        resolve([]);
        return;
      }
      resolve(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0));
    };
  });
};

export const saveBingWallpaperBlob = async (blob: Blob): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, BING_WALLPAPER_BLOB_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

export const getBingWallpaperBlob = async (): Promise<Blob | null> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(BING_WALLPAPER_BLOB_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const value = request.result;
      if (value instanceof Blob) {
        resolve(value);
        return;
      }
      resolve(null);
    };
  });
};

export const deleteBingWallpaperBlob = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(BING_WALLPAPER_BLOB_KEY);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};
