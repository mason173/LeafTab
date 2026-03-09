import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { CloudShortcutsPayloadV3, ScenarioMode, ScenarioShortcuts } from '../../types';
import { clearLocalNeedsCloudReconcile, LOCAL_NEEDS_CLOUD_RECONCILE_KEY, persistLocalProfileSnapshot, readLocalNeedsCloudReconcileReason } from '@/utils/localProfileStorage';
import { toast } from '@/components/ui/sonner';

type FetchRefs = {
  cloudShortcutsVersionRef: MutableRefObject<number | null>;
  pendingCloudVersionRef: MutableRefObject<number | null>;
  conflictPreferenceRef: MutableRefObject<'prefer_local' | ''>;
  lastSavedShortcutsJson: MutableRefObject<string>;
};

type FetchSetters = {
  setScenarioModes: Dispatch<SetStateAction<ScenarioMode[]>>;
  setSelectedScenarioId: Dispatch<SetStateAction<string>>;
  setScenarioShortcuts: Dispatch<SetStateAction<ScenarioShortcuts>>;
  setUserRole: Dispatch<SetStateAction<string | null>>;
  setCloudSyncInitialized: Dispatch<SetStateAction<boolean>>;
  setPendingLocalPayload: Dispatch<SetStateAction<CloudShortcutsPayloadV3 | null>>;
  setPendingCloudPayload: Dispatch<SetStateAction<CloudShortcutsPayloadV3 | null>>;
  setConflictModalOpen: Dispatch<SetStateAction<boolean>>;
};

type BuildPayloadArgs = {
  nextScenarioModes?: ScenarioMode[];
  nextSelectedScenarioId?: string;
  nextScenarioShortcuts?: ScenarioShortcuts;
};

type FetchDeps = {
  user: string | null;
  API_URL: string;
  handleLogout: (input?: string | { message?: string; clearLocal?: boolean }) => void;
  t: (key: string) => string;
  silent?: boolean;
  promptOnDiff?: boolean;
  buildCloudShortcutsPayload: (args?: BuildPayloadArgs) => CloudShortcutsPayloadV3;
  normalizeCloudShortcutsPayload: (raw: unknown) => CloudShortcutsPayloadV3 | null;
  loadLocalProfileSnapshotSafe: () => CloudShortcutsPayloadV3 | null;
  notifyRateLimited: () => void;
  refs: FetchRefs;
  setters: FetchSetters;
};

export const fetchShortcutsWithDeps = async ({
  user,
  API_URL,
  handleLogout,
  t,
  silent = false,
  promptOnDiff = false,
  buildCloudShortcutsPayload,
  normalizeCloudShortcutsPayload,
  loadLocalProfileSnapshotSafe,
  notifyRateLimited,
  refs,
  setters,
}: FetchDeps): Promise<void> => {
  if (!user) return;

  const {
    cloudShortcutsVersionRef,
    pendingCloudVersionRef,
    conflictPreferenceRef,
    lastSavedShortcutsJson,
  } = refs;
  const {
    setScenarioModes,
    setSelectedScenarioId,
    setScenarioShortcuts,
    setUserRole,
    setCloudSyncInitialized,
    setPendingLocalPayload,
    setPendingCloudPayload,
    setConflictModalOpen,
  } = setters;

  const isSyncPending = localStorage.getItem('leaf_tab_sync_pending') === 'true';
  const reconcileReason = readLocalNeedsCloudReconcileReason();
  const needsCloudReconcile = reconcileReason !== null;
  if (!needsCloudReconcile && localStorage.getItem(LOCAL_NEEDS_CLOUD_RECONCILE_KEY) === 'true') {
    clearLocalNeedsCloudReconcile();
  }
  let pendingPayloadFromCache: CloudShortcutsPayloadV3 | null = null;
  if (isSyncPending) {
    try {
      const cached = localStorage.getItem('leaf_tab_shortcuts_cache');
      if (cached) {
        const payload = normalizeCloudShortcutsPayload(JSON.parse(cached));
        if (payload) {
          setScenarioModes(payload.scenarioModes);
          setSelectedScenarioId(payload.selectedScenarioId);
          setScenarioShortcuts(payload.scenarioShortcuts);
          if (!promptOnDiff) {
            setCloudSyncInitialized(true);
          }
          pendingPayloadFromCache = payload;
          lastSavedShortcutsJson.current = '__force_upload__';
        }
      }
    } catch {}
  }

  try {
    if (!navigator.onLine) throw new Error('Offline detected');
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`${API_URL}/user/shortcuts`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.createdAt) localStorage.setItem('user_created_at', data.createdAt);
      if (data.updatedAt) {
        try {
          localStorage.setItem('cloud_shortcuts_updated_at', String(data.updatedAt));
        } catch {}
      }
      if (data.role) {
        setUserRole(data.role);
        localStorage.setItem('role', data.role);
      }

      const persistedLocalPayload = loadLocalProfileSnapshotSafe();
      const computedLocalPayload = persistedLocalPayload ? buildCloudShortcutsPayload({
        nextScenarioModes: persistedLocalPayload.scenarioModes,
        nextSelectedScenarioId: persistedLocalPayload.selectedScenarioId,
        nextScenarioShortcuts: persistedLocalPayload.scenarioShortcuts,
      }) : null;
      const localPayload = pendingPayloadFromCache || computedLocalPayload;
      let cloudPayload: CloudShortcutsPayloadV3 | null = null;
      const cloudVersion = Number(data?.version);
      cloudShortcutsVersionRef.current = Number.isFinite(cloudVersion) ? cloudVersion : null;

      if (data.shortcuts) {
        try {
          cloudPayload = normalizeCloudShortcutsPayload(JSON.parse(data.shortcuts));
        } catch {
          cloudPayload = null;
        }
      }

      const localJson = localPayload ? JSON.stringify(localPayload) : '';
      const cloudJson = cloudPayload ? JSON.stringify(cloudPayload) : '';
      if (pendingPayloadFromCache && !promptOnDiff) {
        clearLocalNeedsCloudReconcile();
        conflictPreferenceRef.current = '';
        setCloudSyncInitialized(true);
        return;
      }

      const shouldPromptConflict = promptOnDiff;
      if (shouldPromptConflict && localPayload && cloudPayload && localJson !== cloudJson) {
        setPendingLocalPayload(localPayload);
        setPendingCloudPayload(cloudPayload);
        pendingCloudVersionRef.current = cloudShortcutsVersionRef.current;
        setConflictModalOpen(true);
        return;
      }

      // Outside explicit login conflict flow, always keep local state first.
      if (!promptOnDiff && localPayload && cloudPayload && localJson !== cloudJson) {
        setScenarioModes(localPayload.scenarioModes);
        setSelectedScenarioId(localPayload.selectedScenarioId);
        setScenarioShortcuts(localPayload.scenarioShortcuts);
        persistLocalProfileSnapshot(localPayload);
        clearLocalNeedsCloudReconcile();
        localStorage.setItem('leaf_tab_sync_pending', 'true');
        localStorage.setItem('leaf_tab_shortcuts_cache', localJson);
        conflictPreferenceRef.current = '';
        setCloudSyncInitialized(true);
        lastSavedShortcutsJson.current = '__force_upload__';
        return;
      }

      if (needsCloudReconcile && localPayload && !cloudPayload) {
        setScenarioShortcuts(localPayload.scenarioShortcuts);
        setScenarioModes(localPayload.scenarioModes);
        setSelectedScenarioId(localPayload.selectedScenarioId);
        setCloudSyncInitialized(true);
        clearLocalNeedsCloudReconcile();
        try { localStorage.setItem('local_shortcuts_updated_at', new Date().toISOString()); } catch {}
        const localRole = localStorage.getItem('role');
        if (localRole) {
          setUserRole(localRole);
          fetch(`${API_URL}/user/role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ role: localRole }),
          }).catch(console.error);
        }
        setTimeout(() => {
          lastSavedShortcutsJson.current = '';
        }, 100);
        return;
      }

      if (cloudPayload) {
        lastSavedShortcutsJson.current = cloudJson;
        setScenarioModes(cloudPayload.scenarioModes);
        setSelectedScenarioId(cloudPayload.selectedScenarioId);
        setScenarioShortcuts(cloudPayload.scenarioShortcuts);
        persistLocalProfileSnapshot(cloudPayload);
        clearLocalNeedsCloudReconcile();
        localStorage.setItem('leaf_tab_shortcuts_cache', cloudJson);
        try { localStorage.setItem('cloud_shortcuts_fetched_at', new Date().toISOString()); } catch {}
        if (!silent) toast.success(t('toast.cloudSynced'));
      }
    } else if (response.status === 401 || response.status === 403) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        handleLogout(t('toast.sessionExpired'));
        return;
      }
    } else if (response.status === 429) {
      if (!silent) notifyRateLimited();
      setCloudSyncInitialized(true);
      return;
    }
    setCloudSyncInitialized(true);
  } catch (error) {
    console.error('Failed to fetch shortcuts:', error);
    try {
      const cached = localStorage.getItem('leaf_tab_shortcuts_cache');
      if (cached) {
        const payload = normalizeCloudShortcutsPayload(JSON.parse(cached));
        if (payload) {
          setScenarioModes(payload.scenarioModes);
          setSelectedScenarioId(payload.selectedScenarioId);
          setScenarioShortcuts(payload.scenarioShortcuts);
          if (navigator.onLine) {
            if (!silent) notifyRateLimited();
          } else {
            if (!silent) toast.success(t('toast.loadedFromCache'));
          }
          setCloudSyncInitialized(true);
          lastSavedShortcutsJson.current = JSON.stringify(payload);
          try { localStorage.setItem('cloud_shortcuts_fetched_at', new Date().toISOString()); } catch {}
          return;
        }
      }
    } catch {}
    if (!silent) toast.error(t('toast.cloudSyncFailed'));
  }
};
