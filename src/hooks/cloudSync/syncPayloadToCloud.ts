import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { CloudShortcutsPayloadV3 } from '../../types';
import { buildBackupDataV4 } from '@/utils/backupData';
import { clearLocalNeedsCloudReconcile, persistLocalProfileSnapshot } from '@/utils/localProfileStorage';

type SyncOptions = { conflictStrategy?: 'modal' | 'prefer_local' };

type SyncRefs = {
  lastSavedShortcutsJson: MutableRefObject<string>;
  cloudShortcutsVersionRef: MutableRefObject<number | null>;
  pendingCloudVersionRef: MutableRefObject<number | null>;
  conflictPreferenceRef: MutableRefObject<'prefer_local' | ''>;
  syncInFlightRef: MutableRefObject<Promise<boolean> | null>;
  syncInFlightPayloadJsonRef: MutableRefObject<string>;
};

type SyncStateSetters = {
  setPendingLocalPayload: Dispatch<SetStateAction<CloudShortcutsPayloadV3 | null>>;
  setPendingCloudPayload: Dispatch<SetStateAction<CloudShortcutsPayloadV3 | null>>;
  setConflictModalOpen: Dispatch<SetStateAction<boolean>>;
};

type SyncDeps = {
  user: string | null;
  API_URL: string;
  payload: CloudShortcutsPayloadV3;
  options?: SyncOptions;
  handleLogout: (input?: string | { message?: string; clearLocal?: boolean }) => void;
  t: (key: string) => string;
  normalizeCloudShortcutsPayload: (raw: unknown) => CloudShortcutsPayloadV3 | null;
  notifyRateLimited: () => void;
  refs: SyncRefs;
  stateSetters: SyncStateSetters;
};

export const syncPayloadToCloudWithDeps = async ({
  user,
  API_URL,
  payload,
  options,
  handleLogout,
  t,
  normalizeCloudShortcutsPayload,
  notifyRateLimited,
  refs,
  stateSetters,
}: SyncDeps): Promise<boolean> => {
  const payloadJson = JSON.stringify(payload);
  const {
    lastSavedShortcutsJson,
    cloudShortcutsVersionRef,
    pendingCloudVersionRef,
    conflictPreferenceRef,
    syncInFlightRef,
    syncInFlightPayloadJsonRef,
  } = refs;
  const {
    setPendingLocalPayload,
    setPendingCloudPayload,
    setConflictModalOpen,
  } = stateSetters;

  if (syncInFlightRef.current) {
    if (syncInFlightPayloadJsonRef.current === payloadJson) {
      return syncInFlightRef.current;
    }
    await syncInFlightRef.current;
    if (lastSavedShortcutsJson.current === payloadJson) return true;
  }

  const runSync = async () => {
    if (!user) return false;
    if (!navigator.onLine) {
      localStorage.setItem('leaf_tab_sync_pending', 'true');
      return false;
    }

    const token = localStorage.getItem('token');
    if (!token) return false;

    const uploadWithVersion = async (expectedVersion: number) => {
      const envelope = buildBackupDataV4({
        scenarioModes: payload.scenarioModes,
        selectedScenarioId: payload.selectedScenarioId,
        scenarioShortcuts: payload.scenarioShortcuts,
      });
      const syncMode = options?.conflictStrategy === 'prefer_local' ? 'prefer_local' : 'strict';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'If-Match': `W/"${expectedVersion}"`,
      };
      return fetch(`${API_URL}/user/shortcuts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ shortcuts: envelope, syncMode }),
      });
    };

    const loadLatestCloudState = async () => {
      const latest = await fetch(`${API_URL}/user/shortcuts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!latest.ok) {
        return { latestPayload: null as CloudShortcutsPayloadV3 | null, latestVersion: null as number | null };
      }
      const latestJson = await latest.json();
      const latestVersion = Number(latestJson?.version);
      cloudShortcutsVersionRef.current = Number.isFinite(latestVersion) ? latestVersion : null;
      let latestPayload: CloudShortcutsPayloadV3 | null = null;
      if (latestJson?.shortcuts) {
        try {
          latestPayload = normalizeCloudShortcutsPayload(JSON.parse(latestJson.shortcuts));
        } catch {
          latestPayload = null;
        }
      }
      return { latestPayload, latestVersion: cloudShortcutsVersionRef.current };
    };

    const markPayloadAsSynced = () => {
      lastSavedShortcutsJson.current = payloadJson;
      localStorage.removeItem('leaf_tab_sync_pending');
      clearLocalNeedsCloudReconcile();
      localStorage.setItem('leaf_tab_shortcuts_cache', payloadJson);
      persistLocalProfileSnapshot(payload);
      conflictPreferenceRef.current = '';
      return true;
    };

    const finishSuccess = async (response: Response) => {
      try {
        const respJson = await response.json();
        const nextVersion = Number(respJson?.version);
        if (Number.isFinite(nextVersion)) cloudShortcutsVersionRef.current = nextVersion;
      } catch {}
      return markPayloadAsSynced();
    };

    const currentVersion = cloudShortcutsVersionRef.current;
    if (!Number.isFinite(currentVersion as any)) {
      localStorage.setItem('leaf_tab_sync_pending', 'true');
      return false;
    }

    let response = await uploadWithVersion(Number(currentVersion));
    if (response.ok) return finishSuccess(response);

    if (response.status === 409) {
      if (options?.conflictStrategy === 'prefer_local') {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const { latestPayload, latestVersion } = await loadLatestCloudState();
            if (latestPayload && JSON.stringify(latestPayload) === payloadJson) {
              return markPayloadAsSynced();
            }
            if (!Number.isFinite(latestVersion as any)) break;
            response = await uploadWithVersion(Number(latestVersion));
            if (response.ok) return finishSuccess(response);
            if (response.status !== 409) break;
          } catch {
            break;
          }
        }
        clearLocalNeedsCloudReconcile();
        localStorage.setItem('leaf_tab_sync_pending', 'true');
        return false;
      }

      try {
        const { latestPayload } = await loadLatestCloudState();
        if (latestPayload) {
          if (JSON.stringify(latestPayload) === payloadJson) {
            return markPayloadAsSynced();
          }
          setPendingLocalPayload(payload);
          setPendingCloudPayload(latestPayload);
          pendingCloudVersionRef.current = cloudShortcutsVersionRef.current;
          setConflictModalOpen(true);
          return false;
        }
      } catch {}

      localStorage.setItem('leaf_tab_sync_pending', 'true');
      return false;
    }

    if (response.status === 401 || response.status === 403) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        handleLogout(t('toast.sessionExpired'));
      } else {
        localStorage.setItem('leaf_tab_sync_pending', 'true');
      }
      return false;
    }

    if (response.status === 429) {
      clearLocalNeedsCloudReconcile();
      localStorage.setItem('leaf_tab_sync_pending', 'true');
      localStorage.setItem('leaf_tab_shortcuts_cache', payloadJson);
      persistLocalProfileSnapshot(payload);
      notifyRateLimited();
      return false;
    }

    if (options?.conflictStrategy === 'prefer_local') {
      clearLocalNeedsCloudReconcile();
    }
    localStorage.setItem('leaf_tab_sync_pending', 'true');
    return false;
  };

  syncInFlightPayloadJsonRef.current = payloadJson;
  const promise = runSync().finally(() => {
    if (syncInFlightRef.current === promise) {
      syncInFlightRef.current = null;
      syncInFlightPayloadJsonRef.current = '';
    }
  });
  syncInFlightRef.current = promise;
  return promise;
};
