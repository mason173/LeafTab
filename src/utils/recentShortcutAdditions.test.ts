import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeRecentShortcutAddition,
  recordRecentShortcutAddition,
  readRecentShortcutAdditionsMap,
} from '@/utils/recentShortcutAdditions';
import { flushQueuedLocalStorageWrites } from '@/utils/storageWriteQueue';
import { buildShortcutUsageKey } from '@/utils/suggestionPersonalization';

describe('recentShortcutAdditions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes the recent-addition boost once a shortcut has been opened', () => {
    const url = 'https://opened-once.example.com';
    const usageKey = buildShortcutUsageKey(url);

    recordRecentShortcutAddition(url, 1_000);
    expect(readRecentShortcutAdditionsMap(1_000)[usageKey]).toBe(1_000);

    consumeRecentShortcutAddition(url, 2_000);
    flushQueuedLocalStorageWrites();

    expect(readRecentShortcutAdditionsMap(2_000)[usageKey]).toBeUndefined();
  });
});
