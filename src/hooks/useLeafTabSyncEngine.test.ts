import { describe, expect, it } from 'vitest';
import type { LeafTabSyncAnalysis } from '@/sync/leaftab';
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
});
