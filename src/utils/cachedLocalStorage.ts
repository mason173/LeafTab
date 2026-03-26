import {
  queueLocalStorageRemoveItem,
  queueLocalStorageSetItem,
} from '@/utils/storageWriteQueue';

const cachedValues = new Map<string, string | null>();
const hydratedKeys = new Set<string>();

function rememberCachedValue(key: string, value: string | null) {
  hydratedKeys.add(key);
  cachedValues.set(key, value);
  return value;
}

export function readCachedLocalStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  if (hydratedKeys.has(key)) {
    return cachedValues.get(key) ?? null;
  }

  try {
    return rememberCachedValue(key, localStorage.getItem(key));
  } catch {
    return rememberCachedValue(key, null);
  }
}

export function primeCachedLocalStorageItem(key: string, value: string | null) {
  if (typeof window === 'undefined') return value;
  return rememberCachedValue(key, value);
}

export function refreshCachedLocalStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;

  try {
    return rememberCachedValue(key, localStorage.getItem(key));
  } catch {
    return rememberCachedValue(key, null);
  }
}

export function queueCachedLocalStorageSetItem(key: string, value: string) {
  if (typeof window === 'undefined') return;
  rememberCachedValue(key, value);
  queueLocalStorageSetItem(key, value);
}

export function queueCachedLocalStorageRemoveItem(key: string) {
  if (typeof window === 'undefined') return;
  rememberCachedValue(key, null);
  queueLocalStorageRemoveItem(key);
}
