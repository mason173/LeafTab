import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import { getAlignedJitteredNextAt, resolveInitialAlignedJitteredTargetAt } from '@/sync/schedule';
import {
  readWebdavConfigFromStorage,
  readWebdavStorageStateFromStorage,
  WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES,
  WEBDAV_STORAGE_KEYS,
} from '@/utils/webdavConfig';

type UseLeafTabWebdavAutoSyncParams = {
  conflictModalOpen: boolean;
  isDragging: boolean;
  syncing: boolean;
  onSync: () => Promise<boolean>;
};

export function useLeafTabWebdavAutoSync({
  conflictModalOpen,
  isDragging,
  syncing,
  onSync,
}: UseLeafTabWebdavAutoSyncParams) {
  const { t } = useTranslation();
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const latestFlagsRef = useRef({
    conflictModalOpen,
    isDragging,
    syncing,
  });
  const latestOnSyncRef = useRef(onSync);
  const latestTRef = useRef(t);
  const [configVersion, setConfigVersion] = useState(0);

  useEffect(() => {
    latestFlagsRef.current = {
      conflictModalOpen,
      isDragging,
      syncing,
    };
  }, [conflictModalOpen, isDragging, syncing]);

  useEffect(() => {
    latestOnSyncRef.current = onSync;
  }, [onSync]);

  useEffect(() => {
    latestTRef.current = t;
  }, [t]);

  const emitStatusChanged = useCallback(() => {
    window.dispatchEvent(new Event('webdav-config-changed'));
    window.dispatchEvent(new CustomEvent('webdav-sync-status-changed'));
  }, []);

  const getIntervalMinutes = useCallback(() => {
    const config = readWebdavConfigFromStorage();
    const raw = Number(config?.syncOptions?.syncIntervalMinutes ?? WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES);
    return Math.max(1, Number.isFinite(raw) ? raw : WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES);
  }, []);

  useEffect(() => {
    const handleConfigChanged = () => {
      setConfigVersion((value) => value + 1);
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
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      localStorage.removeItem(WEBDAV_STORAGE_KEYS.nextSyncAt);
      emitStatusChanged();
      return;
    }

    const scheduleNext = (targetMs: number) => {
      if (disposed) return;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      const nextMs = Math.max(Date.now() + 200, targetMs);
      localStorage.setItem(WEBDAV_STORAGE_KEYS.nextSyncAt, new Date(nextMs).toISOString());
      emitStatusChanged();
      const delay = Math.min(nextMs - Date.now(), 2_147_483_647);
      timerRef.current = window.setTimeout(async () => {
        if (disposed) return;
        const latestConfig = readWebdavConfigFromStorage();
        if (!latestConfig?.syncOptions?.syncBySchedule) {
          if (timerRef.current) window.clearTimeout(timerRef.current);
          timerRef.current = null;
          localStorage.removeItem(WEBDAV_STORAGE_KEYS.nextSyncAt);
          emitStatusChanged();
          return;
        }

        const nextScheduled = getAlignedJitteredNextAt(getIntervalMinutes());
        const latestFlags = latestFlagsRef.current;
        if (
          !inFlightRef.current
          && !latestFlags.syncing
          && !latestFlags.conflictModalOpen
          && !latestFlags.isDragging
        ) {
          inFlightRef.current = true;
          try {
            const ok = await latestOnSyncRef.current();
            if (ok && readWebdavStorageStateFromStorage().autoSyncToastEnabled) {
              toast.success(latestTRef.current('settings.backup.webdav.syncSuccess'));
            }
          } finally {
            inFlightRef.current = false;
          }
        }

        if (disposed) return;
        scheduleNext(nextScheduled);
      }, delay);
    };

    const persistedNextAtIso = localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt);
    const persistedNextAtMs = persistedNextAtIso ? new Date(persistedNextAtIso).getTime() : Number.NaN;
    const initialTarget = resolveInitialAlignedJitteredTargetAt({
      intervalMinutes: getIntervalMinutes(),
      persistedNextAtIso: Number.isFinite(persistedNextAtMs) && persistedNextAtMs > Date.now()
        ? persistedNextAtIso
        : null,
    });

    scheduleNext(initialTarget);

    return () => {
      disposed = true;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [configVersion, emitStatusChanged, getIntervalMinutes]);
}
