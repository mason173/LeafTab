import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ApplyImportedDataOptions, WebdavConfig } from './useWebdavSync';
import type { WebdavPayload } from '@/utils/backupData';
import { readWebdavConfigFromStorage, WEBDAV_STORAGE_KEYS } from '@/utils/webdavConfig';
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
  const webdavScheduleTimerRef = useRef<number | null>(null);
  const webdavAutoSyncInFlightRef = useRef(false);
  const webdavLastPayloadRef = useRef<string>('');
  const [configVersion, setConfigVersion] = useState(0);
  const getIntervalMinutes = useCallback((config: WebdavConfig) => {
    const raw = Number(config.syncOptions?.syncIntervalMinutes || 15);
    return Math.max(1, Number.isFinite(raw) ? raw : 15);
  }, []);
  const getAlignedNextSyncAt = useCallback((intervalMinutes: number, nowMs = Date.now()) => {
    const intervalMs = intervalMinutes * 60 * 1000;
    const slot = Math.floor(nowMs / intervalMs);
    return (slot + 1) * intervalMs;
  }, []);
  const formatDisplayTime = useCallback((ts: number) => {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
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
      const nextAligned = getAlignedNextSyncAt(getIntervalMinutes(config));
      localStorage.setItem(WEBDAV_STORAGE_KEYS.nextSyncAt, new Date(nextAligned).toISOString());
    } else {
      localStorage.removeItem(WEBDAV_STORAGE_KEYS.nextSyncAt);
    }
    setConfigVersion((prev) => prev + 1);
  }, [getAlignedNextSyncAt, getIntervalMinutes]);

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
        refreshNextSyncAtAfterSuccess(config);
        markLastSync();
        return;
      }
      const remoteJson = JSON.stringify(remotePayload);
      if (remoteJson === localJson) {
        webdavLastPayloadRef.current = localJson;
        refreshNextSyncAtAfterSuccess(config);
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
        refreshNextSyncAtAfterSuccess(config);
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
        refreshNextSyncAtAfterSuccess(config);
        markLastSync();
        return;
      }
      await uploadToWebdav(config);
      webdavLastPayloadRef.current = localJson;
      refreshNextSyncAtAfterSuccess(config);
      markLastSync();
    } catch (error: any) {
      localStorage.setItem('webdav_last_error_at', new Date().toISOString());
      localStorage.setItem('webdav_last_error_message', String(error?.message || 'unknown'));
      emitSyncStatusChanged();
    } finally {
      webdavAutoSyncInFlightRef.current = false;
    }
  }, [applyImportedData, buildLocalPayload, emitSyncStatusChanged, fetchWebdavData, markLastSync, mergePayload, refreshNextSyncAtAfterSuccess, uploadDataToWebdav, uploadToWebdav]);

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
        const nextAligned = getAlignedNextSyncAt(getIntervalMinutes(latestConfig));
        if (!webdavAutoSyncInFlightRef.current && !conflictModalOpen && !isDragging) {
          toast(t('settings.backup.webdav.nextSyncAtLabel', {
            time: formatDisplayTime(nextAligned),
          }));
          await resolveWebdavConflict(latestConfig);
        }
        if (disposed) return;
        scheduleNext(nextAligned);
      }, delay);
    };

    const intervalMinutes = getIntervalMinutes(config);
    const alignedNext = getAlignedNextSyncAt(intervalMinutes);
    const persistedNextRaw = localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt);
    const persistedNextAt = persistedNextRaw ? new Date(persistedNextRaw).getTime() : Number.NaN;
    const intervalMs = intervalMinutes * 60 * 1000;
    const initialTarget = Number.isFinite(persistedNextAt)
      ? persistedNextAt <= Date.now()
        ? Date.now() + 500
        : persistedNextAt - Date.now() > intervalMs
          ? alignedNext
          : persistedNextAt
      : alignedNext;

    scheduleNext(initialTarget);

    return () => {
      disposed = true;
      if (webdavScheduleTimerRef.current) window.clearTimeout(webdavScheduleTimerRef.current);
      webdavScheduleTimerRef.current = null;
    };
  }, [configVersion, resolveWebdavConflict, conflictModalOpen, emitSyncStatusChanged, formatDisplayTime, getAlignedNextSyncAt, getIntervalMinutes, isDragging, t]);

  return {
    resolveWebdavConflict,
  };
}
