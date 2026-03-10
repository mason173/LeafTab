import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApplyImportedDataOptions, WebdavConfig } from './useWebdavSync';
import type { WebdavPayload } from '@/utils/backupData';
import { areSyncPayloadsEqual, resolveSyncConflictPayload, toSyncPayloadJson, type SyncConflictPolicy } from '@/sync/core';
import { getAlignedJitteredNextAt, resolveInitialAlignedJitteredTargetAt } from '@/sync/schedule';
import { useSyncState } from '@/sync/useSyncState';
import { readWebdavConfigFromStorage, readWebdavStorageStateFromStorage, WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES, WEBDAV_STORAGE_KEYS } from '@/utils/webdavConfig';
import { createWebdavSyncAdapter } from './webdavSyncAdapter';
import { toast } from '@/components/ui/sonner';

type UseWebdavAutoSyncParams = {
  conflictModalOpen: boolean;
  isDragging: boolean;
  buildLocalPayload: () => WebdavPayload;
  applyImportedData: (data: any, options?: ApplyImportedDataOptions) => void;
  uploadToWebdav: (config: WebdavConfig) => Promise<void>;
  uploadDataToWebdav: (config: WebdavConfig, data: any) => Promise<void>;
  fetchWebdavData: (config: WebdavConfig) => Promise<any>;
  mergePayload: (localPayload: WebdavPayload, remotePayload: WebdavPayload) => WebdavPayload;
};

export function useWebdavAutoSync({
  conflictModalOpen,
  isDragging,
  buildLocalPayload,
  applyImportedData,
  uploadToWebdav,
  uploadDataToWebdav,
  fetchWebdavData,
  mergePayload,
}: UseWebdavAutoSyncParams) {
  const { t } = useTranslation();
  const {
    syncState,
    markSyncStart,
    markSyncSuccess,
    markSyncError,
  } = useSyncState();
  const webdavScheduleTimerRef = useRef<number | null>(null);
  const webdavAutoSyncInFlightRef = useRef(false);
  const webdavLastPayloadRef = useRef<string>('');
  const [configVersion, setConfigVersion] = useState(0);
  const getIntervalMinutes = useCallback((config: WebdavConfig) => {
    const raw = Number(config.syncOptions?.syncIntervalMinutes ?? WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES);
    return Math.max(1, Number.isFinite(raw) ? raw : WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES);
  }, []);
  const getNextScheduledSyncAt = useCallback((intervalMinutes: number, nowMs = Date.now()) => {
    return getAlignedJitteredNextAt(intervalMinutes, { nowMs });
  }, []);
  const emitSyncStatusChanged = useCallback(() => {
    window.dispatchEvent(new CustomEvent('webdav-sync-status-changed'));
  }, []);
  const markLastSync = useCallback(() => {
    localStorage.setItem('webdav_last_sync_at', new Date().toISOString());
    localStorage.removeItem('webdav_last_error_at');
    localStorage.removeItem('webdav_last_error_message');
    emitSyncStatusChanged();
  }, [emitSyncStatusChanged]);
  const refreshNextSyncAtAfterSuccess = useCallback((config: WebdavConfig) => {
    if (config.syncOptions?.syncBySchedule) {
      const nextScheduled = getNextScheduledSyncAt(getIntervalMinutes(config));
      localStorage.setItem(WEBDAV_STORAGE_KEYS.nextSyncAt, new Date(nextScheduled).toISOString());
    } else {
      localStorage.removeItem(WEBDAV_STORAGE_KEYS.nextSyncAt);
    }
    setConfigVersion((prev) => prev + 1);
  }, [getIntervalMinutes, getNextScheduledSyncAt]);

  const resolveWebdavConflictInternal = useCallback(async (config: WebdavConfig) => {
    if (webdavAutoSyncInFlightRef.current) return false;
    webdavAutoSyncInFlightRef.current = true;
    markSyncStart();
    localStorage.setItem('webdav_last_attempt_at', new Date().toISOString());
    emitSyncStatusChanged();
    try {
      const adapter = createWebdavSyncAdapter({
        config,
        fetchWebdavData,
        uploadToWebdav,
        uploadDataToWebdav,
      });
      const pulled = await adapter.pull();
      const remotePayload = pulled.payload;
      const localPayload = buildLocalPayload();
      const localJson = toSyncPayloadJson(localPayload);
      if (!remotePayload) {
        await adapter.push(localPayload, { mode: 'prefer_local' });
        webdavLastPayloadRef.current = localJson;
        refreshNextSyncAtAfterSuccess(config);
        markLastSync();
        markSyncSuccess();
        return true;
      }
      if (areSyncPayloadsEqual(remotePayload, localPayload)) {
        webdavLastPayloadRef.current = localJson;
        refreshNextSyncAtAfterSuccess(config);
        markLastSync();
        markSyncSuccess();
        return true;
      }
      const policy = (config.syncOptions?.syncConflictPolicy || 'merge') as SyncConflictPolicy;
      const resolution = resolveSyncConflictPayload(localPayload, remotePayload, policy, mergePayload);

      if (resolution.source === 'remote') {
        applyImportedData(resolution.resolvedPayload, {
          closeSettings: false,
          successKey: 'settings.backup.webdav.syncSuccess',
        });
        webdavLastPayloadRef.current = toSyncPayloadJson(resolution.resolvedPayload);
        refreshNextSyncAtAfterSuccess(config);
        markLastSync();
        markSyncSuccess();
        return true;
      }

      if (resolution.source === 'merged') {
        applyImportedData(resolution.resolvedPayload, {
          closeSettings: false,
          successKey: 'settings.backup.webdav.syncSuccess',
        });
        await adapter.push(resolution.resolvedPayload, { mode: 'strict' });
        webdavLastPayloadRef.current = toSyncPayloadJson(resolution.resolvedPayload);
        refreshNextSyncAtAfterSuccess(config);
        markLastSync();
        markSyncSuccess();
        return true;
      }

      await adapter.push(resolution.resolvedPayload, { mode: 'prefer_local' });
      webdavLastPayloadRef.current = toSyncPayloadJson(resolution.resolvedPayload);
      refreshNextSyncAtAfterSuccess(config);
      markLastSync();
      markSyncSuccess();
      return true;
    } catch (error: any) {
      localStorage.setItem('webdav_last_error_at', new Date().toISOString());
      localStorage.setItem('webdav_last_error_message', String(error?.message || 'unknown'));
      markSyncError(String(error?.message || 'unknown'));
      emitSyncStatusChanged();
      return false;
    } finally {
      webdavAutoSyncInFlightRef.current = false;
    }
  }, [applyImportedData, buildLocalPayload, emitSyncStatusChanged, fetchWebdavData, markLastSync, markSyncError, markSyncStart, markSyncSuccess, mergePayload, refreshNextSyncAtAfterSuccess, uploadDataToWebdav, uploadToWebdav]);
  const resolveWebdavConflict = useCallback(async (config: WebdavConfig) => {
    void await resolveWebdavConflictInternal(config);
  }, [resolveWebdavConflictInternal]);

  useEffect(() => {
    const handleConfigChanged = () => {
      setConfigVersion((prev) => prev + 1);
    };
    window.addEventListener('webdav-config-changed', handleConfigChanged);
    return () => {
      window.removeEventListener('webdav-config-changed', handleConfigChanged);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    const config = readWebdavConfigFromStorage();
    if (!config?.syncOptions?.syncBySchedule) {
      if (webdavScheduleTimerRef.current) window.clearTimeout(webdavScheduleTimerRef.current);
      webdavScheduleTimerRef.current = null;
      localStorage.removeItem(WEBDAV_STORAGE_KEYS.nextSyncAt);
      emitSyncStatusChanged();
      return;
    }

    const scheduleNext = (targetMs: number) => {
      if (disposed) return;
      if (webdavScheduleTimerRef.current) {
        window.clearTimeout(webdavScheduleTimerRef.current);
      }
      const nextMs = Math.max(Date.now() + 200, targetMs);
      localStorage.setItem(WEBDAV_STORAGE_KEYS.nextSyncAt, new Date(nextMs).toISOString());
      emitSyncStatusChanged();
      const delay = Math.min(nextMs - Date.now(), 2_147_483_647);
      webdavScheduleTimerRef.current = window.setTimeout(async () => {
        if (disposed) return;
        const latestConfig = readWebdavConfigFromStorage();
        if (!latestConfig?.syncOptions?.syncBySchedule) {
          if (webdavScheduleTimerRef.current) window.clearTimeout(webdavScheduleTimerRef.current);
          webdavScheduleTimerRef.current = null;
          localStorage.removeItem(WEBDAV_STORAGE_KEYS.nextSyncAt);
          emitSyncStatusChanged();
          return;
        }
        const nextScheduled = getNextScheduledSyncAt(getIntervalMinutes(latestConfig));
        if (!webdavAutoSyncInFlightRef.current && !conflictModalOpen && !isDragging) {
          const synced = await resolveWebdavConflictInternal(latestConfig);
          if (synced) {
            if (readWebdavStorageStateFromStorage().autoSyncToastEnabled) {
              toast.success(t('settings.backup.webdav.syncSuccess'));
            }
          }
        }
        if (disposed) return;
        scheduleNext(nextScheduled);
      }, delay);
    };

    const intervalMinutes = getIntervalMinutes(config);
    const initialTarget = resolveInitialAlignedJitteredTargetAt({
      intervalMinutes,
      persistedNextAtIso: localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt),
    });

    scheduleNext(initialTarget);

    return () => {
      disposed = true;
      if (webdavScheduleTimerRef.current) window.clearTimeout(webdavScheduleTimerRef.current);
      webdavScheduleTimerRef.current = null;
    };
  }, [configVersion, resolveWebdavConflictInternal, conflictModalOpen, emitSyncStatusChanged, getNextScheduledSyncAt, getIntervalMinutes, isDragging, t]);

  return {
    resolveWebdavConflict,
    syncState,
  };
}
