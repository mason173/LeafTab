import { beforeEach, describe, expect, it } from 'vitest';
import {
  primeCachedLocalStorageItem,
  queueCachedLocalStorageRemoveItem,
  queueCachedLocalStorageSetItem,
  readCachedLocalStorageItem,
  refreshCachedLocalStorageItem,
} from '@/utils/cachedLocalStorage';
import { flushQueuedLocalStorageWrites } from '@/utils/storageWriteQueue';

describe('cachedLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hydrates from localStorage and refreshes stale cache entries', () => {
    localStorage.setItem('theme', 'light');
    expect(readCachedLocalStorageItem('theme')).toBe('light');

    localStorage.setItem('theme', 'dark');
    expect(readCachedLocalStorageItem('theme')).toBe('light');
    expect(refreshCachedLocalStorageItem('theme')).toBe('dark');
  });

  it('lets callers prime cached values before storage writes land', () => {
    expect(primeCachedLocalStorageItem('accent', 'green')).toBe('green');
    expect(readCachedLocalStorageItem('accent')).toBe('green');
    expect(localStorage.getItem('accent')).toBeNull();
  });

  it('queues writes and removals while keeping reads immediately consistent', () => {
    queueCachedLocalStorageSetItem('language', 'zh');
    expect(readCachedLocalStorageItem('language')).toBe('zh');
    expect(localStorage.getItem('language')).toBeNull();

    flushQueuedLocalStorageWrites();
    expect(localStorage.getItem('language')).toBe('zh');

    queueCachedLocalStorageRemoveItem('language');
    expect(readCachedLocalStorageItem('language')).toBeNull();
    flushQueuedLocalStorageWrites();
    expect(localStorage.getItem('language')).toBeNull();
  });
});
