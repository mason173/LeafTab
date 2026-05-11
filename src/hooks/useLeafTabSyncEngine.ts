import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLeafTabSyncRuntime } from '@/lazy/sync';
import { useSyncState } from '@/sync/useSyncState';
import { getLeafTabSyncBaselineSnapshot } from '@/sync/leaftab/baseline';
import { recordSyncDiagnosticEvent } from '@/utils/syncDiagnostics';
import {
  type LeafTabSyncAnalysis,
  type LeafTabSyncEngineAnalyzeOptions,
  type LeafTabSyncEngineProgress,
  type LeafTabSyncEngineResult,
  type LeafTabSyncInitialChoice,
  type LeafTabSyncRemoteStore,
  type LeafTabSyncSnapshot,
} from '@/sync/leaftab';

export interface LeafTabSyncEngineWebdavConfig {
  url: string;
  username?: string;
  password?: string;
  rootPath?: string;
  requestPermission?: boolean;
}

export interface UseLeafTabSyncEngineOptions {
  enabled?: boolean;
  suspended?: boolean;
  deviceId?: string;
  webdav: LeafTabSyncEngineWebdavConfig | null;
  remoteStore?: LeafTabSyncRemoteStore | null;
  buildLocalSnapshot: () => Promise<LeafTabSyncSnapshot>;
  applyLocalSnapshot: (snapshot: LeafTabSyncSnapshot) => Promise<void>;
  createEmptySnapshot: () => LeafTabSyncSnapshot;
  isLocalDirty?: () => boolean;
  markLocalClean?: () => void;
  baselineStorageKey?: string;
}

type LeafTabSyncAnalysisCachePayload = {
  version: 1;
  analysis: LeafTabSyncAnalysis;
  savedAt: string;
};

export const LEAFTAB_SYNC_ANALYSIS_CACHE_MAX_AGE_MS = 60 * 1000;

const getOrCreateLeafTabSyncDeviceId = (storageKey = 'leaftab_sync_v1_device_id') => {
  const createDeviceId = () => {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch {}
    return `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return existing;
    const created = createDeviceId();
    localStorage.setItem(storageKey, created);
    return created;
  } catch {
    return createDeviceId();
  }
};

const createBaselineStorageKey = (prefix: string, rootPath?: string) => {
  const suffix = (rootPath || 'leaftab/v1').replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `${prefix}:${suffix}`;
};

export const createLeafTabSyncAnalysisStorageKey = (baselineStorageKey: string) => {
  return `${baselineStorageKey}:analysis_cache_v1`;
};

export const readCachedLeafTabSyncAnalysisPayload = (
  storageKey: string,
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): LeafTabSyncAnalysisCachePayload | null => {
  try {
    const raw = storage?.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LeafTabSyncAnalysisCachePayload>;
    if (
      parsed?.version !== 1
      || !parsed.analysis
      || typeof parsed.analysis !== 'object'
      || typeof parsed.savedAt !== 'string'
      || !parsed.savedAt
    ) {
      return null;
    }
    return parsed as LeafTabSyncAnalysisCachePayload;
  } catch {
    return null;
  }
};

export const readCachedLeafTabSyncAnalysis = (
  storageKey: string,
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): LeafTabSyncAnalysis | null => {
  return readCachedLeafTabSyncAnalysisPayload(storageKey, storage)?.analysis || null;
};

export const isLeafTabSyncAnalysisCacheFresh = (
  payload: LeafTabSyncAnalysisCachePayload | null,
  maxAgeMs = LEAFTAB_SYNC_ANALYSIS_CACHE_MAX_AGE_MS,
  nowMs = Date.now(),
) => {
  if (!payload) return false;
  const savedAtMs = new Date(payload.savedAt).getTime();
  if (!Number.isFinite(savedAtMs)) return false;
  return nowMs - savedAtMs <= Math.max(0, maxAgeMs);
};

export const writeCachedLeafTabSyncAnalysis = (
  storageKey: string,
  analysis: LeafTabSyncAnalysis,
  storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage,
) => {
  try {
    storage?.setItem(storageKey, JSON.stringify({
      version: 1,
      analysis,
      savedAt: new Date().toISOString(),
    } satisfies LeafTabSyncAnalysisCachePayload));
  } catch {}
};

const isRetryableLeafTabSyncConflictError = (error: unknown) => {
  if (
    !error
    || typeof error !== 'object'
    || typeof (error as { status?: unknown }).status !== 'number'
    || (error as { status: number }).status !== 409
    || (
      (error as { name?: unknown }).name !== 'LeafTabSyncCloudRemoteStoreError'
      && typeof (error as { operation?: unknown }).operation !== 'string'
    )
  ) {
    return false;
  }

  return !/lock is held by another device/i.test(String((error as { message?: unknown }).message || ''));
};

export function useLeafTabSyncEngine(options: UseLeafTabSyncEngineOptions) {
  const enabled = options.enabled !== false;
  const suspended = options.suspended === true;
  const needsRuntime = enabled && !suspended && Boolean(options.remoteStore || options.webdav?.url);
  const runtime = useLeafTabSyncRuntime(needsRuntime);
  const deviceId = useMemo(
    () => options.deviceId || getOrCreateLeafTabSyncDeviceId(),
    [options.deviceId],
  );

  const baselineStorageKey = useMemo(
    () => options.baselineStorageKey || createBaselineStorageKey('leaftab_sync_v1_baseline', options.webdav?.rootPath),
    [options.baselineStorageKey, options.webdav?.rootPath],
  );
  const analysisStorageKey = useMemo(
    () => createLeafTabSyncAnalysisStorageKey(baselineStorageKey),
    [baselineStorageKey],
  );

  const baselineStore = useMemo(() => {
    if (!runtime) return null;
    return new runtime.LeafTabSyncLocalStorageBaselineStore(baselineStorageKey);
  }, [baselineStorageKey, runtime]);

  const webdavStore = useMemo(() => {
    if (!runtime || !options.webdav?.url) return null;
    return new runtime.LeafTabSyncWebdavStore({
      url: options.webdav.url,
      username: options.webdav.username,
      password: options.webdav.password,
      rootPath: options.webdav.rootPath,
      requestPermission: options.webdav.requestPermission,
    });
  }, [
    options.webdav?.password,
    options.webdav?.requestPermission,
    options.webdav?.rootPath,
    options.webdav?.url,
    options.webdav?.username,
    runtime,
  ]);

  const remoteStore = useMemo(
    () => options.remoteStore || webdavStore,
    [options.remoteStore, webdavStore],
  );

  const engine = useMemo(() => {
    if (!runtime || !baselineStore || !remoteStore) return null;
    return new runtime.LeafTabSyncEngine({
      deviceId,
      remoteStore,
      baselineStore,
      buildLocalSnapshot: options.buildLocalSnapshot,
      applyLocalSnapshot: options.applyLocalSnapshot,
      createEmptySnapshot: options.createEmptySnapshot,
      isLocalDirty: options.isLocalDirty,
      rootPath: options.webdav?.rootPath,
    });
  }, [
    baselineStore,
    deviceId,
    options.applyLocalSnapshot,
    options.buildLocalSnapshot,
    options.createEmptySnapshot,
    options.isLocalDirty,
    remoteStore,
    options.webdav?.rootPath,
    runtime,
  ]);

  const {
    syncState,
    markSyncConflict,
    markSyncError,
    markSyncIdle,
    markSyncStart,
    markSyncSuccess,
  } = useSyncState();

  const [analysis, setAnalysis] = useState<LeafTabSyncAnalysis | null>(() => (
    enabled && !suspended ? readCachedLeafTabSyncAnalysisPayload(analysisStorageKey)?.analysis || null : null
  ));
  const [lastResult, setLastResult] = useState<LeafTabSyncEngineResult | null>(null);
  const [isReady, setIsReady] = useState(() => (
    !needsRuntime || suspended || Boolean(readCachedLeafTabSyncAnalysisPayload(analysisStorageKey))
  ));
  const syncInFlightRef = useRef<Promise<LeafTabSyncEngineResult | null> | null>(null);
  const analysisInFlightRef = useRef<Promise<LeafTabSyncAnalysis | null> | null>(null);
  const analysisStaleRef = useRef(true);

  const refreshAnalysis = useCallback(async (
    options?: LeafTabSyncEngineAnalyzeOptions & {
      force?: boolean;
      maxAgeMs?: number;
    },
  ) => {
    if (!enabled || suspended || !engine) {
      setAnalysis(null);
      setIsReady(!enabled || suspended);
      return null;
    }

    const force = options?.force ?? true;
    if (!force) {
      const cachedPayload = readCachedLeafTabSyncAnalysisPayload(analysisStorageKey);
      if (cachedPayload && !analysisStaleRef.current && isLeafTabSyncAnalysisCacheFresh(cachedPayload, options?.maxAgeMs)) {
        setAnalysis(cachedPayload.analysis);
        setIsReady(true);
        return cachedPayload.analysis;
      }
    }

    if (analysisInFlightRef.current) {
      return analysisInFlightRef.current;
    }

    const analysisPromise = (async () => {
      try {
        const next = await engine.analyze(options);
        setAnalysis(next);
        writeCachedLeafTabSyncAnalysis(analysisStorageKey, next);
        analysisStaleRef.current = false;
        setIsReady(true);
        return next;
      } catch (error) {
        if (runtime && error instanceof runtime.LeafTabSyncEncryptionRequiredError) {
          setIsReady(true);
          return null;
        }
        setIsReady(true);
        throw error;
      }
    })().finally(() => {
      if (analysisInFlightRef.current === analysisPromise) {
        analysisInFlightRef.current = null;
      }
    });

    analysisInFlightRef.current = analysisPromise;
    return analysisPromise;
  }, [analysisStorageKey, enabled, engine, runtime, suspended]);

  const runSync = useCallback(async (
    choice: LeafTabSyncInitialChoice | 'auto' = 'auto',
    progressOptions?: {
      onProgress?: (progress: LeafTabSyncEngineProgress) => void;
      allowDestructiveBookmarkChanges?: boolean;
      skipPostSyncAnalysis?: boolean;
    },
  ) => {
    if (!enabled || !engine) {
      return null;
    }

    if (syncInFlightRef.current) {
      return syncInFlightRef.current;
    }

    const executeSync = async (
      allowConflictRetry = true,
    ): Promise<LeafTabSyncEngineResult | null> => {
      markSyncStart();
      try {
        if (
          choice === 'auto'
          && options.isLocalDirty?.() === false
          && baselineStore
          && remoteStore?.readHead
        ) {
          const baseline = await baselineStore.load();
          const baselineSnapshot = getLeafTabSyncBaselineSnapshot(baseline);
          if (baseline?.commitId && baselineSnapshot) {
            const remoteHead = await remoteStore.readHead();
            if (remoteHead?.commitId === baseline.commitId) {
              const result = {
                kind: 'noop',
                remoteCommitId: baseline.commitId,
                snapshot: baselineSnapshot,
                summaryText: '本地与远端均无新增变更',
              } satisfies LeafTabSyncEngineResult;
              setLastResult(result);
              markSyncSuccess();
              options.markLocalClean?.();
              if (!progressOptions?.skipPostSyncAnalysis) {
                await refreshAnalysis({ shallow: true });
              }
              return result;
            }
          }
        }

        recordSyncDiagnosticEvent({
          provider: 'sync',
          action: 'runSync.engine.start',
          detail: {
            choice,
            skipPostSyncAnalysis: progressOptions?.skipPostSyncAnalysis === true,
          },
        });
        const result = await engine.sync(
          choice,
          {
            onProgress: progressOptions?.onProgress,
            allowDestructiveBookmarkChanges: progressOptions?.allowDestructiveBookmarkChanges,
          },
        );

        setLastResult(result);
        recordSyncDiagnosticEvent({
          provider: 'sync',
          action: 'runSync.engine.result',
          detail: {
            choice,
            kind: result.kind,
            remoteCommitId: result.remoteCommitId,
          },
        });
        if (result.kind === 'conflict') {
          markSyncConflict();
        } else {
          markSyncSuccess();
          options.markLocalClean?.();
        }
        if (!progressOptions?.skipPostSyncAnalysis) {
          await refreshAnalysis({ shallow: true });
        }
        return result;
      } catch (error) {
        if (allowConflictRetry && isRetryableLeafTabSyncConflictError(error)) {
          return executeSync(false);
        }

        markSyncError(String((error as Error)?.message || error || 'Sync failed'));
        throw error;
      }
    };

    const syncPromise = executeSync().finally(() => {
      if (syncInFlightRef.current === syncPromise) {
        syncInFlightRef.current = null;
      }
    });
    syncInFlightRef.current = syncPromise;
    return syncPromise;
  }, [
    baselineStore,
    enabled,
    engine,
    markSyncConflict,
    markSyncError,
    markSyncStart,
    markSyncSuccess,
    options.applyLocalSnapshot,
    options.buildLocalSnapshot,
    options.isLocalDirty,
    options.markLocalClean,
    refreshAnalysis,
    remoteStore,
    syncInFlightRef,
  ]);

  const resetBaseline = useCallback(async () => {
    if (!baselineStore) return;
    await baselineStore.clear();
    setLastResult(null);
    markSyncIdle();
    await refreshAnalysis();
  }, [baselineStore, markSyncIdle, refreshAnalysis]);

  const invalidateAnalysis = useCallback(() => {
    analysisStaleRef.current = true;
  }, []);

  const clearSyncError = useCallback(() => {
    markSyncIdle();
  }, [markSyncIdle]);

  useEffect(() => {
    if (!enabled || suspended) {
      setAnalysis(null);
      setIsReady(true);
      return;
    }
    if (!runtime) {
      setIsReady(false);
      return;
    }
    if (!engine) {
      setAnalysis(null);
      setIsReady(true);
      return;
    }
    const cachedPayload = readCachedLeafTabSyncAnalysisPayload(analysisStorageKey);
    setAnalysis(cachedPayload?.analysis || null);
    setIsReady(Boolean(cachedPayload));
  }, [analysisStorageKey, enabled, engine, runtime, suspended]);

  useEffect(() => {
    if (!enabled || suspended || !engine) return;
    analysisStaleRef.current = true;
  }, [enabled, engine, options.buildLocalSnapshot, remoteStore, suspended]);

  return {
    deviceId,
    syncState,
    analysis,
    lastResult,
    isReady,
    invalidateAnalysis,
    refreshAnalysis,
    runSync,
    resetBaseline,
    clearSyncError,
    hasConfig: Boolean(options.remoteStore || options.webdav?.url),
  };
}
