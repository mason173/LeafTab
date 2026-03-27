import { describe, expect, it } from 'vitest';
import type { LeafTabSyncAnalysis } from '@/sync/leaftab';
import { isDestructiveBookmarkChange } from '@/sync/leaftab';
import {
  isLeafTabSyncAnalysisCacheFresh,
  createLeafTabSyncAnalysisStorageKey,
  readCachedLeafTabSyncAnalysis,
  readCachedLeafTabSyncAnalysisPayload,
  writeCachedLeafTabSyncAnalysis,
} from '@/hooks/useLeafTabSyncEngine';

const createMemoryStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
};

const createAnalysis = (): LeafTabSyncAnalysis => ({
  hasBaseline: true,
  localSummary: {
    scenarios: 2,
    shortcuts: 10,
    bookmarkFolders: 3,
    bookmarkItems: 8,
    tombstones: 0,
  },
  remoteSummary: {
    scenarios: 2,
    shortcuts: 10,
    bookmarkFolders: 3,
    bookmarkItems: 8,
    tombstones: 0,
  },
  requiresInitialChoice: false,
  suggestedInitialChoice: null,
  remoteCommitId: 'commit-1',
});

const createBookmarkSnapshot = (count: number) => ({
  meta: {
    version: 2 as const,
    deviceId: 'device',
    generatedAt: '2026-03-27T10:00:00.000Z',
  },
  preferences: null,
  scenarios: {},
  shortcuts: {},
  bookmarkFolders: {},
  bookmarkItems: Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `bookmark_${index}`,
      {
        id: `bookmark_${index}`,
        type: 'bookmark-item' as const,
        parentId: null,
        title: `Bookmark ${index}`,
        url: `https://example.com/${index}`,
        createdAt: '2026-03-27T10:00:00.000Z',
        updatedAt: '2026-03-27T10:00:00.000Z',
        updatedBy: 'device',
        revision: 1,
      },
    ]),
  ),
  scenarioOrder: {
    type: 'scenario-order' as const,
    ids: [],
    updatedAt: '2026-03-27T10:00:00.000Z',
    updatedBy: 'device',
    revision: 1,
  },
  shortcutOrders: {},
  bookmarkOrders: {
    __root__: {
      type: 'bookmark-order' as const,
      parentId: null,
      ids: [],
      updatedAt: '2026-03-27T10:00:00.000Z',
      updatedBy: 'device',
      revision: 1,
    },
  },
  tombstones: {},
});

describe('leaf tab sync analysis cache', () => {
  it('persists and restores analysis summaries', () => {
    const storage = createMemoryStorage();
    const key = createLeafTabSyncAnalysisStorageKey('leaf:baseline:key');
    const analysis = createAnalysis();

    writeCachedLeafTabSyncAnalysis(key, analysis, storage);

    expect(readCachedLeafTabSyncAnalysis(key, storage)).toEqual(analysis);
    expect(readCachedLeafTabSyncAnalysisPayload(key, storage)?.analysis).toEqual(analysis);
  });

  it('ignores invalid cache payloads', () => {
    const storage = createMemoryStorage();
    const key = createLeafTabSyncAnalysisStorageKey('leaf:baseline:key');

    storage.setItem(key, JSON.stringify({
      version: 999,
      analysis: createAnalysis(),
      savedAt: new Date().toISOString(),
    }));
    expect(readCachedLeafTabSyncAnalysis(key, storage)).toBeNull();

    storage.setItem(key, '{not-json');
    expect(readCachedLeafTabSyncAnalysis(key, storage)).toBeNull();
  });

  it('treats cached analysis as fresh only within the configured max age', () => {
    const analysis = createAnalysis();

    expect(isLeafTabSyncAnalysisCacheFresh({
      version: 1,
      analysis,
      savedAt: '2026-03-24T10:00:30.000Z',
    }, 60_000, new Date('2026-03-24T10:01:00.000Z').getTime())).toBe(true);

    expect(isLeafTabSyncAnalysisCacheFresh({
      version: 1,
      analysis,
      savedAt: '2026-03-24T09:58:59.000Z',
    }, 60_000, new Date('2026-03-24T10:01:00.000Z').getTime())).toBe(false);
  });

  it('flags destructive bookmark reductions so sync can stop before overwriting data', () => {
    expect(isDestructiveBookmarkChange({
      from: createBookmarkSnapshot(200),
      to: createBookmarkSnapshot(1),
    })).toBe(true);

    expect(isDestructiveBookmarkChange({
      from: createBookmarkSnapshot(30),
      to: createBookmarkSnapshot(24),
    })).toBe(false);
  });
});
