import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApplyImportedDataOptions, WebdavConfig } from './useWebdavSync';
import type { WebdavPayload } from '@/utils/backupData';

type UseWebdavAutoSyncParams = {
  conflictModalOpen: boolean;
  isDragging: boolean;
  settingsOpen: boolean;
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
  settingsOpen,
  buildLocalPayload,
  applyImportedData,
  uploadToWebdav,
  uploadDataToWebdav,
  fetchWebdavData,
  mergePayload,
}: UseWebdavAutoSyncParams) {
  const webdavScheduleTimerRef = useRef<number | null>(null);
  const webdavAutoSyncInFlightRef = useRef(false);
  const webdavLastPayloadRef = useRef<string>('');
  const [configVersion, setConfigVersion] = useState(0);
  const emitSyncStatusChanged = useCallback(() => {
    window.dispatchEvent(new CustomEvent('webdav-sync-status-changed'));
  }, []);
  const markLastSync = useCallback(() => {
    localStorage.setItem('webdav_last_sync_at', new Date().toISOString());
    localStorage.removeItem('webdav_last_error_at');
    localStorage.removeItem('webdav_last_error_message');
    emitSyncStatusChanged();
  }, [emitSyncStatusChanged]);

  const buildWebdavConfigFromStorage = useCallback((): WebdavConfig | null => {
    const enabled = (localStorage.getItem('webdav_sync_enabled') ?? 'false') === 'true';
    if (!enabled) return null;
    const url = (localStorage.getItem('webdav_url') || '').trim();
    if (!url) return null;
    const username = (localStorage.getItem('webdav_username') || '').trim();
    const password = localStorage.getItem('webdav_password') || '';
    const filePath = (localStorage.getItem('webdav_file_path') || 'leaftab_sync.leaftab').trim();
    const syncIntervalMinutes = Number(localStorage.getItem('webdav_sync_interval_minutes') || '15');
    const syncConflictPolicy = (localStorage.getItem('webdav_sync_conflict_policy') as "merge" | "prefer_remote" | "prefer_local") || 'merge';
    return {
      url,
      username,
      password,
      filePath,
      syncOptions: {
        enabled,
        syncOnChange: false,
        syncBySchedule: true,
        syncIntervalMinutes,
        syncConflictPolicy,
        includeNestedConfigs: true,
      },
    };
  }, []);

  const resolveWebdavConflict = useCallback(async (config: WebdavConfig) => {
    if (webdavAutoSyncInFlightRef.current) return;
    webdavAutoSyncInFlightRef.current = true;
    localStorage.setItem('webdav_last_attempt_at', new Date().toISOString());
    emitSyncStatusChanged();
    try {
      const remotePayload = await fetchWebdavData(config);
      const localPayload = buildLocalPayload();
      const localJson = JSON.stringify(localPayload);
      if (!remotePayload) {
        await uploadToWebdav(config);
        webdavLastPayloadRef.current = localJson;
        markLastSync();
        return;
      }
      const remoteJson = JSON.stringify(remotePayload);
      if (remoteJson === localJson) {
        webdavLastPayloadRef.current = localJson;
        markLastSync();
        return;
      }
      const policy = config.syncOptions?.syncConflictPolicy || "merge";
      if (policy === "prefer_remote") {
        applyImportedData(remotePayload, {
          closeSettings: false,
          successKey: 'settings.backup.webdav.syncSuccess',
        });
        webdavLastPayloadRef.current = remoteJson;
        markLastSync();
        return;
      }
      if (policy === "merge") {
        const merged = mergePayload(localPayload, remotePayload);
        const mergedJson = JSON.stringify(merged);
        applyImportedData(merged, {
          closeSettings: false,
          successKey: 'settings.backup.webdav.syncSuccess',
        });
        await uploadDataToWebdav(config, merged);
        webdavLastPayloadRef.current = mergedJson;
        markLastSync();
        return;
      }
      await uploadToWebdav(config);
      webdavLastPayloadRef.current = localJson;
      markLastSync();
    } catch (error: any) {
      localStorage.setItem('webdav_last_error_at', new Date().toISOString());
      localStorage.setItem('webdav_last_error_message', String(error?.message || 'unknown'));
      emitSyncStatusChanged();
    } finally {
      webdavAutoSyncInFlightRef.current = false;
    }
  }, [applyImportedData, buildLocalPayload, emitSyncStatusChanged, fetchWebdavData, markLastSync, mergePayload, uploadDataToWebdav, uploadToWebdav]);

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
    const config = buildWebdavConfigFromStorage();
    if (!config?.syncOptions?.syncBySchedule) {
      if (webdavScheduleTimerRef.current) window.clearInterval(webdavScheduleTimerRef.current);
      webdavScheduleTimerRef.current = null;
      return;
    }
    const intervalMinutes = Number(config.syncOptions.syncIntervalMinutes || 15);
    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    if (webdavScheduleTimerRef.current) window.clearInterval(webdavScheduleTimerRef.current);
    const tick = () => {
      resolveWebdavConflict(config);
    };
    webdavScheduleTimerRef.current = window.setInterval(tick, intervalMs);
    return () => {
      if (webdavScheduleTimerRef.current) window.clearInterval(webdavScheduleTimerRef.current);
    };
  }, [buildWebdavConfigFromStorage, configVersion, resolveWebdavConflict, settingsOpen]);

  return {
    resolveWebdavConflict,
  };
}
