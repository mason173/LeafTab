import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { CloudShortcutsPayloadV3, ScenarioMode, ScenarioShortcuts } from '../../types';
import { clearLocalNeedsCloudReconcile, LOCAL_NEEDS_CLOUD_RECONCILE_KEY, persistLocalProfileSnapshot, readLocalNeedsCloudReconcileReason } from '@/utils/localProfileStorage';
import { toast } from '@/components/ui/sonner';
import { areSyncPayloadsEqual, toSyncPayloadJson } from '@/sync/core';
import { createCloudSyncAdapter } from './cloudSyncAdapter';
import { CLOUD_SYNC_STORAGE_KEYS, emitCloudSyncStatusChanged } from '@/utils/cloudSyncConfig';

const FIRST_LOGIN_LOCAL_FIRST_KEY = 'leaftab_force_local_sync_after_first_login_user';

type FetchRefs = {
  cloudShortcutsVersionRef: MutableRefObject<number | null>;
  pendingCloudVersionRef: MutableRefObject<number | null>;
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
  persistPendingConflict: (localPayload: CloudShortcutsPayloadV3, cloudPayload: CloudShortcutsPayloadV3, cloudVersion: number | null) => void;
  clearPendingConflict: () => void;
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
  persistPendingConflict,
  clearPendingConflict,
  refs,
  setters,
}: FetchDeps): Promise<'success' | 'conflict' | 'error' | 'noop'> => {
  if (!user) return 'noop';
  const shouldPromptOnThisLogin = Boolean(promptOnDiff);

  const {
    cloudShortcutsVersionRef,
    pendingCloudVersionRef,
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
          if (!shouldPromptOnThisLogin) {
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
    if (!token) return 'noop';
    const adapter = createCloudSyncAdapter({
      API_URL,
      token,
      normalizeCloudShortcutsPayload,
    });

    const response = await adapter.pull();

    if (response.status === 200) {
      const meta = response.meta || {};
      if (meta.createdAt) localStorage.setItem('user_created_at', meta.createdAt);
      if (meta.updatedAt) {
        try {
          localStorage.setItem('cloud_shortcuts_updated_at', String(meta.updatedAt));
        } catch {}
      }
      if (meta.role) {
        setUserRole(meta.role);
        localStorage.setItem('role', meta.role);
      }

      const persistedLocalPayload = loadLocalProfileSnapshotSafe();
      const computedLocalPayload = persistedLocalPayload ? buildCloudShortcutsPayload({
        nextScenarioModes: persistedLocalPayload.scenarioModes,
        nextSelectedScenarioId: persistedLocalPayload.selectedScenarioId,
        nextScenarioShortcuts: persistedLocalPayload.scenarioShortcuts,
      }) : null;
      const localPayload = pendingPayloadFromCache || computedLocalPayload;
      const cloudPayload = response.payload;
      cloudShortcutsVersionRef.current = response.version;

      const localJson = localPayload ? toSyncPayloadJson(localPayload) : '';
      const cloudJson = cloudPayload ? toSyncPayloadJson(cloudPayload) : '';
      if (pendingPayloadFromCache && !promptOnDiff) {
        clearLocalNeedsCloudReconcile();
        setCloudSyncInitialized(true);
        return 'success';
      }

      const forceLocalFirstOnFirstLogin = promptOnDiff
        && localPayload
        && !cloudPayload
        && localStorage.getItem(FIRST_LOGIN_LOCAL_FIRST_KEY) === user;
      if (forceLocalFirstOnFirstLogin && localPayload) {
        setScenarioModes(localPayload.scenarioModes);
        setSelectedScenarioId(localPayload.selectedScenarioId);
        setScenarioShortcuts(localPayload.scenarioShortcuts);
        persistLocalProfileSnapshot(localPayload);
        clearLocalNeedsCloudReconcile();
        localStorage.setItem('leaf_tab_shortcuts_cache', localJson);
        lastSavedShortcutsJson.current = '__force_upload__';
        setCloudSyncInitialized(true);
        clearPendingConflict();
        localStorage.removeItem(FIRST_LOGIN_LOCAL_FIRST_KEY);
        try {
          const expectedVersion = Number.isFinite(response.version as number) ? Number(response.version) : undefined;
          const pushResult = await adapter.push(localPayload, {
            expectedVersion,
            mode: 'prefer_local',
          });
          if (pushResult.ok) {
            if (Number.isFinite(pushResult.version as number)) {
              cloudShortcutsVersionRef.current = Number(pushResult.version);
            }
            lastSavedShortcutsJson.current = localJson;
            localStorage.removeItem('leaf_tab_sync_pending');
            localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.lastSyncAt, new Date().toISOString());
            emitCloudSyncStatusChanged();
          } else {
            localStorage.setItem('leaf_tab_sync_pending', 'true');
          }
        } catch {
          localStorage.setItem('leaf_tab_sync_pending', 'true');
        }
        return 'success';
      }

      const shouldPromptConflict = shouldPromptOnThisLogin;
      if (shouldPromptConflict && localPayload && cloudPayload && !areSyncPayloadsEqual(localPayload, cloudPayload)) {
        setPendingLocalPayload(localPayload);
        setPendingCloudPayload(cloudPayload);
        pendingCloudVersionRef.current = response.version;
        persistPendingConflict(localPayload, cloudPayload, response.version);
        setConflictModalOpen(true);
        setCloudSyncInitialized(true);
        return 'conflict';
      }

      // Outside explicit login conflict flow, always keep local state first.
      if (!shouldPromptOnThisLogin && localPayload && cloudPayload && !areSyncPayloadsEqual(localPayload, cloudPayload)) {
        setScenarioModes(localPayload.scenarioModes);
        setSelectedScenarioId(localPayload.selectedScenarioId);
        setScenarioShortcuts(localPayload.scenarioShortcuts);
        persistLocalProfileSnapshot(localPayload);
        clearLocalNeedsCloudReconcile();
        localStorage.setItem('leaf_tab_sync_pending', 'true');
        localStorage.setItem('leaf_tab_shortcuts_cache', localJson);
        setCloudSyncInitialized(true);
        lastSavedShortcutsJson.current = '__force_upload__';
        clearPendingConflict();
        return 'success';
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
        clearPendingConflict();
        return 'success';
      }

      if (cloudPayload) {
        lastSavedShortcutsJson.current = cloudJson;
        setScenarioModes(cloudPayload.scenarioModes);
        setSelectedScenarioId(cloudPayload.selectedScenarioId);
        setScenarioShortcuts(cloudPayload.scenarioShortcuts);
        persistLocalProfileSnapshot(cloudPayload);
        clearLocalNeedsCloudReconcile();
        localStorage.setItem('leaf_tab_shortcuts_cache', cloudJson);
        if (!silent) toast.success(t('toast.cloudSynced'));
        setCloudSyncInitialized(true);
        clearPendingConflict();
        return 'success';
      }
    } else if (response.status === 401 || response.status === 403) {
      handleLogout(t('toast.sessionExpired'));
      return 'error';
    } else if (response.status === 429) {
      if (!silent) notifyRateLimited();
      setCloudSyncInitialized(true);
      return 'error';
    }
      setCloudSyncInitialized(true);
      clearPendingConflict();
      return 'noop';
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
          lastSavedShortcutsJson.current = toSyncPayloadJson(payload);
          clearPendingConflict();
          return 'success';
        }
      }
    } catch {}
    if (!silent) toast.error(t('toast.cloudSyncFailed'));
    return 'error';
  }
};
