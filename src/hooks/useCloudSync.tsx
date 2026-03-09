import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '../components/ui/sonner';
import { CloudShortcutsPayloadV3, ScenarioMode, ScenarioShortcuts } from '../types';
import { defaultScenarioModes } from '@/scenario/scenario';
import { clearLocalNeedsCloudReconcile, persistLocalProfileSnapshot, readLocalProfileSnapshot } from '@/utils/localProfileStorage';
import { syncPayloadToCloudWithDeps } from './cloudSync/syncPayloadToCloud';
import { fetchShortcutsWithDeps } from './cloudSync/fetchShortcuts';

const RATE_LIMIT_TOAST_COOLDOWN_MS = 30 * 1000;
const CLOUD_PULL_INTERVAL_MS = 5 * 60 * 1000;
const CLOUD_SYNC_JITTER_MAX_MS = 30 * 1000;

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

  const [cloudSyncInitialized, setCloudSyncInitialized] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [pendingLocalPayload, setPendingLocalPayload] = useState<CloudShortcutsPayloadV3 | null>(null);
  const [pendingCloudPayload, setPendingCloudPayload] = useState<CloudShortcutsPayloadV3 | null>(null);

  const lastSavedShortcutsJson = useRef<string>('');
  const cloudShortcutsVersionRef = useRef<number | null>(null);
  const pendingCloudVersionRef = useRef<number | null>(null);
  const conflictPreferenceRef = useRef<'prefer_local' | ''>('');
  const syncInFlightRef = useRef<Promise<boolean> | null>(null);
  const syncInFlightPayloadJsonRef = useRef<string>('');
  const cloudPullDelayTimerRef = useRef<number | null>(null);
  const fetchShortcutsRef = useRef<(options?: { silent?: boolean; promptOnDiff?: boolean }) => Promise<void>>(async () => {});
  const loadLocalProfileSnapshotSafeRef = useRef<() => CloudShortcutsPayloadV3 | null>(() => null);
  const activeCloudSyncUserRef = useRef<string | null>(null);
  const conflictModalOpenRef = useRef(false);
  const isDraggingRef = useRef(isDragging);
  const lastRateLimitToastAtRef = useRef(0);
  const userLifecycleInitializedRef = useRef(false);
  const previousUserRef = useRef<string | null>(null);
  const syncPayloadToCloudRef = useRef<(payload: CloudShortcutsPayloadV3, options?: { conflictStrategy?: 'modal' | 'prefer_local' }) => Promise<boolean>>(async () => false);

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
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const obj = raw as Record<string, unknown>;
    const candidate = (obj.type === 'leaftab_backup' && obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data))
      ? ({ version: 3, ...(obj.data as any) } as Record<string, unknown>)
      : obj;
    if (candidate.version !== 3) return null;
    const modes = normalizeScenarioModesList(candidate.scenarioModes);
    const shortcutsValue = normalizeScenarioShortcuts(candidate.scenarioShortcuts);
    const selectedIdCandidate = typeof candidate.selectedScenarioId === 'string' ? candidate.selectedScenarioId : modes[0]?.id ?? defaultScenarioModes[0].id;
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

  const getAlignedNextCloudPullAt = useCallback((nowMs = Date.now()) => {
    const slot = Math.floor(nowMs / CLOUD_PULL_INTERVAL_MS);
    return (slot + 1) * CLOUD_PULL_INTERVAL_MS;
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
        conflictPreferenceRef,
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
    await fetchShortcutsWithDeps({
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
        conflictPreferenceRef,
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
  }, [API_URL, buildCloudShortcutsPayload, handleLogout, loadLocalProfileSnapshotSafe, normalizeCloudShortcutsPayload, notifyRateLimited, setScenarioModes, setScenarioShortcuts, setSelectedScenarioId, setUserRole, t, user]);

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
      return;
    }

    if (activeCloudSyncUserRef.current === user) {
      return;
    }
    activeCloudSyncUserRef.current = user;
    clearCloudPullTimers();

    // Keep UI on local state first; only show conflict prompt after explicit login action.
    void fetchShortcutsRef.current({ silent: false, promptOnDiff: isExplicitLogin });

    let disposed = false;
    const getJitterMs = () => Math.floor(Math.random() * (CLOUD_SYNC_JITTER_MAX_MS + 1));
    const scheduleNext = (targetMs: number) => {
      if (disposed) return;
      if (cloudPullDelayTimerRef.current) {
        window.clearTimeout(cloudPullDelayTimerRef.current);
      }
      const nextMs = Math.max(Date.now() + 200, targetMs);
      const delay = Math.min(nextMs - Date.now(), 2_147_483_647);
      cloudPullDelayTimerRef.current = window.setTimeout(async () => {
        if (disposed) return;
        if (!conflictModalOpenRef.current) {
          if (localStorage.getItem('leaf_tab_sync_pending') === 'true' && navigator.onLine && !isDraggingRef.current) {
            const snapshot = loadLocalProfileSnapshotSafeRef.current();
            if (snapshot) {
              const synced = await syncPayloadToCloudRef.current(snapshot, { conflictStrategy: 'prefer_local' });
              if (synced) {
                toast.success(t('toast.cloudAutoSyncSuccess'));
              }
            }
          }
        }
        if (disposed) return;
        const nextAligned = getAlignedNextCloudPullAt(Date.now());
        scheduleNext(nextAligned + getJitterMs());
      }, delay);
    };

    const alignedNext = getAlignedNextCloudPullAt(Date.now());
    scheduleNext(alignedNext + getJitterMs());

    return () => {
      disposed = true;
      clearCloudPullTimers();
    };
  }, [getAlignedNextCloudPullAt, t, user]);

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
    conflictPreferenceRef.current = '';
    setCloudSyncInitialized(true);
    setConflictModalOpen(false);
    setPendingLocalPayload(null);
    setPendingCloudPayload(null);
    pendingCloudVersionRef.current = null;
    toast.success(t('toast.syncCloudApplied'));
  }, [localDirtyRef, pendingCloudPayload, setScenarioModes, setScenarioShortcuts, setSelectedScenarioId, t]);

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
    conflictPreferenceRef.current = 'prefer_local';
    setCloudSyncInitialized(true);
    setConflictModalOpen(false);
    setPendingLocalPayload(null);
    setPendingCloudPayload(null);
    pendingCloudVersionRef.current = null;
    void syncPayloadToCloud(pendingLocalPayload, { conflictStrategy: 'prefer_local' });
    toast.success(t('toast.syncLocalApplied'));
  }, [localDirtyRef, pendingLocalPayload, setScenarioModes, setScenarioShortcuts, setSelectedScenarioId, syncPayloadToCloud, t]);

  const applyUndoPayload = useCallback((payload: CloudShortcutsPayloadV3) => {
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
    conflictPreferenceRef.current = 'prefer_local';
    setCloudSyncInitialized(true);
    setConflictModalOpen(false);
    setPendingLocalPayload(null);
    setPendingCloudPayload(null);
    pendingCloudVersionRef.current = null;
    void syncPayloadToCloud(payload, { conflictStrategy: 'prefer_local' });
  }, [localDirtyRef, setScenarioModes, setScenarioShortcuts, setSelectedScenarioId, syncPayloadToCloud]);

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
    resolveWithCloud,
    resolveWithLocal,
    applyUndoPayload,
  };
}
