import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/ui/sonner';
import { CloudShortcutsPayloadV3, ScenarioMode, ScenarioShortcuts } from '../types';
import { defaultScenarioModes } from '@/scenario/scenario';
import { getAlignedJitteredNextAt, resolveInitialAlignedJitteredTargetAt } from '@/sync/schedule';
import { useSyncState } from '@/sync/useSyncState';
import { mergeWebdavPayload, unwrapLeafTabBackupData } from '@/utils/backupData';
import { CLOUD_SYNC_STORAGE_KEYS, emitCloudSyncStatusChanged, readCloudSyncConfigFromStorage } from '@/utils/cloudSyncConfig';
import { clearLocalNeedsCloudReconcile, persistLocalProfileSnapshot, readLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { syncPayloadToCloudWithDeps } from './cloudSync/syncPayloadToCloud';
import { fetchShortcutsWithDeps } from './cloudSync/fetchShortcuts';

const RATE_LIMIT_TOAST_COOLDOWN_MS = 30 * 1000;

type BuildPayloadArgs = {
  nextScenarioModes?: ScenarioMode[];
  nextSelectedScenarioId?: string;
  nextScenarioShortcuts?: ScenarioShortcuts;
};

type UseCloudSyncParams = {
  user: string | null;
  API_URL: string;
  handleLogout: (input?: string | { message?: string; clearLocal?: boolean }) => void;
  isDragging: boolean;
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  scenarioShortcuts: ScenarioShortcuts;
  setScenarioModes: Dispatch<SetStateAction<ScenarioMode[]>>;
  setSelectedScenarioId: Dispatch<SetStateAction<string>>;
  setScenarioShortcuts: Dispatch<SetStateAction<ScenarioShortcuts>>;
  setUserRole: Dispatch<SetStateAction<string | null>>;
  normalizeScenarioModesList: (raw: unknown) => ScenarioMode[];
  normalizeScenarioShortcuts: (raw: unknown) => ScenarioShortcuts;
  localDirtyRef: MutableRefObject<boolean>;
};

export function useCloudSync({
  user,
  API_URL,
  handleLogout,
  isDragging,
  scenarioModes,
  selectedScenarioId,
  scenarioShortcuts,
  setScenarioModes,
  setSelectedScenarioId,
  setScenarioShortcuts,
  setUserRole,
  normalizeScenarioModesList,
  normalizeScenarioShortcuts,
  localDirtyRef,
}: UseCloudSyncParams) {
  const { t } = useTranslation();
  const {
    syncState,
    markSyncStart,
    markSyncSuccess,
    markSyncConflict,
    markSyncError,
    markSyncIdle,
  } = useSyncState();

  const [cloudSyncInitialized, setCloudSyncInitialized] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [pendingLocalPayload, setPendingLocalPayload] = useState<CloudShortcutsPayloadV3 | null>(null);
  const [pendingCloudPayload, setPendingCloudPayload] = useState<CloudShortcutsPayloadV3 | null>(null);

  const lastSavedShortcutsJson = useRef<string>('');
  const cloudShortcutsVersionRef = useRef<number | null>(null);
  const pendingCloudVersionRef = useRef<number | null>(null);
  const syncInFlightRef = useRef<Promise<boolean> | null>(null);
  const syncInFlightPayloadJsonRef = useRef<string>('');
  const cloudPullDelayTimerRef = useRef<number | null>(null);
  const fetchShortcutsRef = useRef<(options?: { silent?: boolean; promptOnDiff?: boolean }) => Promise<'success' | 'conflict' | 'error' | 'noop'>>(async () => 'noop');
  const loadLocalProfileSnapshotSafeRef = useRef<() => CloudShortcutsPayloadV3 | null>(() => null);
  const activeCloudSyncUserRef = useRef<string | null>(null);
  const conflictModalOpenRef = useRef(false);
  const isDraggingRef = useRef(isDragging);
  const lastRateLimitToastAtRef = useRef(0);
  const userLifecycleInitializedRef = useRef(false);
  const previousUserRef = useRef<string | null>(null);
  const syncPayloadToCloudRef = useRef<(payload: CloudShortcutsPayloadV3, options?: { conflictStrategy?: 'modal' | 'prefer_local' }) => Promise<boolean>>(async () => false);
  const [cloudSyncConfigVersion, setCloudSyncConfigVersion] = useState(0);

  const notifyRateLimited = useCallback(() => {
    const now = Date.now();
    if (now - lastRateLimitToastAtRef.current < RATE_LIMIT_TOAST_COOLDOWN_MS) return;
    lastRateLimitToastAtRef.current = now;
    toast(t('toast.cloudSyncRateLimited'));
  }, [t]);

  const buildCloudShortcutsPayload = useCallback(({
    nextScenarioModes,
    nextSelectedScenarioId,
    nextScenarioShortcuts,
  }: BuildPayloadArgs = {}): CloudShortcutsPayloadV3 => {
    const modes = nextScenarioModes ?? scenarioModes;
    const selectedId = nextSelectedScenarioId ?? selectedScenarioId;
    const shortcutsValue = nextScenarioShortcuts ?? scenarioShortcuts;
    const finalSelectedId = modes.some((m) => m.id === selectedId) ? selectedId : modes[0]?.id ?? defaultScenarioModes[0].id;
    return {
      version: 3,
      scenarioModes: modes,
      selectedScenarioId: finalSelectedId,
      scenarioShortcuts: shortcutsValue,
    };
  }, [scenarioModes, scenarioShortcuts, selectedScenarioId]);

  const normalizeCloudShortcutsPayload = useCallback((raw: unknown) => {
    const isEnvelope = !!(
      raw &&
      typeof raw === 'object' &&
      !Array.isArray(raw) &&
      (raw as Record<string, unknown>).type === 'leaftab_backup'
    );
    const candidate = unwrapLeafTabBackupData(raw);
    if (!candidate) return null;
    const normalizedCandidate = (isEnvelope ? { version: 3, ...candidate } : candidate) as Record<string, unknown>;
    if (normalizedCandidate.version !== 3) return null;
    const modes = normalizeScenarioModesList(normalizedCandidate.scenarioModes);
    const shortcutsValue = normalizeScenarioShortcuts(normalizedCandidate.scenarioShortcuts);
    const selectedIdCandidate = typeof normalizedCandidate.selectedScenarioId === 'string'
      ? normalizedCandidate.selectedScenarioId
      : modes[0]?.id ?? defaultScenarioModes[0].id;
    const finalSelectedId = modes.some((m) => m.id === selectedIdCandidate) ? selectedIdCandidate : modes[0]?.id ?? defaultScenarioModes[0].id;
    return {
      version: 3,
      scenarioModes: modes,
      selectedScenarioId: finalSelectedId,
      scenarioShortcuts: shortcutsValue,
    } satisfies CloudShortcutsPayloadV3;
  }, [normalizeScenarioModesList, normalizeScenarioShortcuts]);

  const loadLocalProfileSnapshotSafe = useCallback(() => {
    const snapshot = readLocalProfileSnapshot();
    if (!snapshot) return null;
    return {
      scenarioModes: normalizeScenarioModesList(snapshot.scenarioModes),
      selectedScenarioId: snapshot.selectedScenarioId,
      scenarioShortcuts: normalizeScenarioShortcuts(snapshot.scenarioShortcuts),
    } satisfies CloudShortcutsPayloadV3;
  }, [normalizeScenarioModesList, normalizeScenarioShortcuts]);

  const getNextScheduledCloudSyncAt = useCallback((intervalMinutes: number, nowMs = Date.now()) => {
    return getAlignedJitteredNextAt(intervalMinutes, { nowMs });
  }, []);
  const setCloudNextSyncAt = useCallback((nextMs: number) => {
    localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.nextSyncAt, new Date(nextMs).toISOString());
    emitCloudSyncStatusChanged();
  }, []);
  const clearCloudNextSyncAt = useCallback(() => {
    localStorage.removeItem(CLOUD_SYNC_STORAGE_KEYS.nextSyncAt);
    emitCloudSyncStatusChanged();
  }, []);

  useEffect(() => {
    const onConfigChanged = () => setCloudSyncConfigVersion((v) => v + 1);
    window.addEventListener('cloud-sync-config-changed', onConfigChanged);
    return () => window.removeEventListener('cloud-sync-config-changed', onConfigChanged);
  }, []);

  useEffect(() => {
    conflictModalOpenRef.current = conflictModalOpen;
  }, [conflictModalOpen]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  const syncPayloadToCloud = useCallback(async (
    payload: CloudShortcutsPayloadV3,
    options?: { conflictStrategy?: 'modal' | 'prefer_local' }
  ) => {
    return syncPayloadToCloudWithDeps({
      user,
      API_URL,
      payload,
      options,
      handleLogout,
      t,
      normalizeCloudShortcutsPayload,
      notifyRateLimited,
      refs: {
        lastSavedShortcutsJson,
        cloudShortcutsVersionRef,
        pendingCloudVersionRef,
        syncInFlightRef,
        syncInFlightPayloadJsonRef,
      },
      stateSetters: {
        setPendingLocalPayload,
        setPendingCloudPayload,
        setConflictModalOpen,
      },
    });
  }, [API_URL, handleLogout, normalizeCloudShortcutsPayload, notifyRateLimited, t, user]);

  useEffect(() => {
    syncPayloadToCloudRef.current = syncPayloadToCloud;
  }, [syncPayloadToCloud]);

  const fetchShortcuts = useCallback(async (options?: { silent?: boolean; promptOnDiff?: boolean }) => {
    markSyncStart();
    const result = await fetchShortcutsWithDeps({
      user,
      API_URL,
      handleLogout,
      t,
      silent: options?.silent ?? false,
      promptOnDiff: options?.promptOnDiff ?? false,
      buildCloudShortcutsPayload,
      normalizeCloudShortcutsPayload,
      loadLocalProfileSnapshotSafe,
      notifyRateLimited,
      refs: {
        cloudShortcutsVersionRef,
        pendingCloudVersionRef,
        lastSavedShortcutsJson,
      },
      setters: {
        setScenarioModes,
        setSelectedScenarioId,
        setScenarioShortcuts,
        setUserRole,
        setCloudSyncInitialized,
        setPendingLocalPayload,
        setPendingCloudPayload,
        setConflictModalOpen,
      },
    });
    if (result === 'success') {
      markSyncSuccess();
      return result;
    }
    if (result === 'conflict') {
      markSyncConflict();
      return result;
    }
    if (result === 'error') {
      markSyncError('cloud_sync_failed');
      return result;
    }
    markSyncIdle();
    return result;
  }, [API_URL, buildCloudShortcutsPayload, handleLogout, loadLocalProfileSnapshotSafe, markSyncConflict, markSyncError, markSyncIdle, markSyncStart, markSyncSuccess, normalizeCloudShortcutsPayload, notifyRateLimited, setScenarioModes, setScenarioShortcuts, setSelectedScenarioId, setUserRole, t, user]);

  useEffect(() => {
    fetchShortcutsRef.current = fetchShortcuts;
  }, [fetchShortcuts]);

  useEffect(() => {
    loadLocalProfileSnapshotSafeRef.current = loadLocalProfileSnapshotSafe;
  }, [loadLocalProfileSnapshotSafe]);

  useEffect(() => {
    const clearCloudPullTimers = () => {
      if (cloudPullDelayTimerRef.current) {
        window.clearTimeout(cloudPullDelayTimerRef.current);
        cloudPullDelayTimerRef.current = null;
      }
    };

    const wasInitialized = userLifecycleInitializedRef.current;
    const prevUser = previousUserRef.current;
    userLifecycleInitializedRef.current = true;
    previousUserRef.current = user;
    const isExplicitLogin = wasInitialized && !prevUser && !!user;

    if (!user) {
      activeCloudSyncUserRef.current = null;
      clearCloudPullTimers();
      clearCloudNextSyncAt();
      return;
    }

    const sameActiveUser = activeCloudSyncUserRef.current === user;
    if (!sameActiveUser) {
      activeCloudSyncUserRef.current = user;
      clearCloudPullTimers();
      // Keep UI on local state first; only show conflict prompt after explicit login action.
      void fetchShortcutsRef.current({ silent: false, promptOnDiff: isExplicitLogin });
    } else {
      clearCloudPullTimers();
    }
    const runtimeConfig = readCloudSyncConfigFromStorage();
    if (!runtimeConfig.enabled) {
      clearCloudNextSyncAt();
      return;
    }

    let disposed = false;
    const scheduleNext = (targetMs: number) => {
      if (disposed) return;
      if (cloudPullDelayTimerRef.current) {
        window.clearTimeout(cloudPullDelayTimerRef.current);
      }
      const nextMs = Math.max(Date.now() + 200, targetMs);
      setCloudNextSyncAt(nextMs);
      const delay = Math.min(nextMs - Date.now(), 2_147_483_647);
      cloudPullDelayTimerRef.current = window.setTimeout(async () => {
        if (disposed) return;
        const latestConfig = readCloudSyncConfigFromStorage();
        if (!latestConfig.enabled) {
          clearCloudPullTimers();
          clearCloudNextSyncAt();
          return;
        }
        if (!conflictModalOpenRef.current) {
          if (localStorage.getItem('leaf_tab_sync_pending') === 'true' && navigator.onLine && !isDraggingRef.current) {
            const snapshot = loadLocalProfileSnapshotSafeRef.current();
            if (snapshot) {
              markSyncStart();
              const synced = await syncPayloadToCloudRef.current(snapshot, { conflictStrategy: 'prefer_local' });
              if (synced) {
                markSyncSuccess();
                if (latestConfig.autoSyncToastEnabled) {
                  toast.success(t('toast.cloudAutoSyncSuccess'));
                }
              } else if (conflictModalOpenRef.current) {
                markSyncConflict();
              } else {
                markSyncError('cloud_auto_sync_failed');
              }
            }
          }
        }
        if (disposed) return;
        scheduleNext(getNextScheduledCloudSyncAt(latestConfig.intervalMinutes, Date.now()));
      }, delay);
    };

    const initialTarget = resolveInitialAlignedJitteredTargetAt({
      intervalMinutes: runtimeConfig.intervalMinutes,
      persistedNextAtIso: localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.nextSyncAt),
    });
    scheduleNext(initialTarget);

    return () => {
      disposed = true;
      clearCloudPullTimers();
    };
  }, [clearCloudNextSyncAt, cloudSyncConfigVersion, getNextScheduledCloudSyncAt, markSyncConflict, markSyncError, markSyncStart, markSyncSuccess, setCloudNextSyncAt, t, user]);

  const triggerCloudSyncNow = useCallback(async () => {
    if (!user) return false;
    if (!navigator.onLine) {
      markSyncError('offline');
      return false;
    }
    const snapshot = loadLocalProfileSnapshotSafeRef.current();
    if (!snapshot) return false;
    markSyncStart();
    const synced = await syncPayloadToCloudRef.current(snapshot, { conflictStrategy: 'prefer_local' });
    if (synced) {
      markSyncSuccess();
      return true;
    }
    markSyncError('cloud_manual_sync_failed');
    return false;
  }, [markSyncError, markSyncStart, markSyncSuccess, user]);

  const resolveWithCloud = useCallback(() => {
    if (!pendingCloudPayload) {
      setConflictModalOpen(false);
      return;
    }
    const cloudJson = JSON.stringify(pendingCloudPayload);
    lastSavedShortcutsJson.current = cloudJson;
    cloudShortcutsVersionRef.current = pendingCloudVersionRef.current;
    setScenarioModes(pendingCloudPayload.scenarioModes);
    setSelectedScenarioId(pendingCloudPayload.selectedScenarioId);
    setScenarioShortcuts(pendingCloudPayload.scenarioShortcuts);
    persistLocalProfileSnapshot(pendingCloudPayload);
    clearLocalNeedsCloudReconcile();
    localStorage.removeItem('leaf_tab_sync_pending');
    localStorage.setItem('leaf_tab_shortcuts_cache', cloudJson);
    localDirtyRef.current = false;
    setCloudSyncInitialized(true);
    setConflictModalOpen(false);
    setPendingLocalPayload(null);
    setPendingCloudPayload(null);
    pendingCloudVersionRef.current = null;
    markSyncSuccess();
    toast.success(t('toast.syncCloudApplied'));
  }, [localDirtyRef, markSyncSuccess, pendingCloudPayload, setScenarioModes, setScenarioShortcuts, setSelectedScenarioId, t]);

  const resolveWithLocal = useCallback(() => {
    if (!pendingLocalPayload) {
      setConflictModalOpen(false);
      return;
    }
    lastSavedShortcutsJson.current = '__force_upload__';
    cloudShortcutsVersionRef.current = pendingCloudVersionRef.current;
    setScenarioModes(pendingLocalPayload.scenarioModes);
    setSelectedScenarioId(pendingLocalPayload.selectedScenarioId);
    setScenarioShortcuts(pendingLocalPayload.scenarioShortcuts);
    persistLocalProfileSnapshot(pendingLocalPayload);
    clearLocalNeedsCloudReconcile();
    localStorage.setItem('leaf_tab_sync_pending', 'true');
    localStorage.setItem('leaf_tab_shortcuts_cache', JSON.stringify(pendingLocalPayload));
    localDirtyRef.current = false;
    setCloudSyncInitialized(true);
    setConflictModalOpen(false);
    setPendingLocalPayload(null);
    setPendingCloudPayload(null);
    pendingCloudVersionRef.current = null;
    markSyncSuccess();
    void syncPayloadToCloud(pendingLocalPayload, { conflictStrategy: 'prefer_local' });
    toast.success(t('toast.syncLocalApplied'));
  }, [localDirtyRef, markSyncSuccess, pendingLocalPayload, setScenarioModes, setScenarioShortcuts, setSelectedScenarioId, syncPayloadToCloud, t]);

  const resolveWithMerge = useCallback(() => {
    if (!pendingLocalPayload || !pendingCloudPayload) {
      setConflictModalOpen(false);
      return;
    }
    const mergedPayload = mergeWebdavPayload(
      pendingLocalPayload as any,
      pendingCloudPayload as any,
    ) as CloudShortcutsPayloadV3;
    const json = JSON.stringify(mergedPayload);
    lastSavedShortcutsJson.current = '__force_upload__';
    cloudShortcutsVersionRef.current = pendingCloudVersionRef.current;
    setScenarioModes(mergedPayload.scenarioModes);
    setSelectedScenarioId(mergedPayload.selectedScenarioId);
    setScenarioShortcuts(mergedPayload.scenarioShortcuts);
    persistLocalProfileSnapshot(mergedPayload);
    clearLocalNeedsCloudReconcile();
    localStorage.setItem('leaf_tab_sync_pending', 'true');
    localStorage.setItem('leaf_tab_shortcuts_cache', json);
    localDirtyRef.current = false;
    setCloudSyncInitialized(true);
    setConflictModalOpen(false);
    setPendingLocalPayload(null);
    setPendingCloudPayload(null);
    pendingCloudVersionRef.current = null;
    markSyncSuccess();
    void syncPayloadToCloud(mergedPayload, { conflictStrategy: 'prefer_local' });
    toast.success(t('toast.syncMergeApplied'));
  }, [localDirtyRef, markSyncSuccess, pendingCloudPayload, pendingLocalPayload, setScenarioModes, setScenarioShortcuts, setSelectedScenarioId, syncPayloadToCloud, t]);

  const applyUndoPayload = useCallback(async (payload: CloudShortcutsPayloadV3) => {
    const json = JSON.stringify(payload);
    lastSavedShortcutsJson.current = '__force_upload__';
    setScenarioModes(payload.scenarioModes);
    setSelectedScenarioId(payload.selectedScenarioId);
    setScenarioShortcuts(payload.scenarioShortcuts);
    persistLocalProfileSnapshot(payload);
    clearLocalNeedsCloudReconcile();
    localStorage.setItem('leaf_tab_sync_pending', 'true');
    localStorage.setItem('leaf_tab_shortcuts_cache', json);
    localDirtyRef.current = false;
    setCloudSyncInitialized(true);
    setConflictModalOpen(false);
    setPendingLocalPayload(null);
    setPendingCloudPayload(null);
    pendingCloudVersionRef.current = null;
    markSyncStart();
    const synced = await syncPayloadToCloud(payload, { conflictStrategy: 'prefer_local' });
    if (synced) {
      markSyncSuccess();
      return true;
    }
    markSyncError('cloud_manual_sync_failed');
    return false;
  }, [localDirtyRef, markSyncError, markSyncStart, markSyncSuccess, setScenarioModes, setScenarioShortcuts, setSelectedScenarioId, syncPayloadToCloud]);

  return {
    cloudSyncInitialized,
    setCloudSyncInitialized,
    conflictModalOpen,
    setConflictModalOpen,
    pendingLocalPayload,
    setPendingLocalPayload,
    pendingCloudPayload,
    setPendingCloudPayload,
    lastSavedShortcutsJson,
    syncState,
    resolveWithCloud,
    resolveWithLocal,
    resolveWithMerge,
    applyUndoPayload,
    triggerCloudSyncNow,
  };
}
