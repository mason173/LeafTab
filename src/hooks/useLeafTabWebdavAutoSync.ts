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

const AUTO_SYNC_BUSY_RETRY_DELAY_MS = 30 * 1000;
const AUTO_SYNC_FAILURE_RETRY_BASE_DELAY_MS = 60 * 1000;
const AUTO_SYNC_FAILURE_RETRY_MAX_DELAY_MS = 10 * 60 * 1000;
const AUTO_SYNC_LEASE_KEY = 'webdav_auto_sync_lease_v1';
const AUTO_SYNC_LEASE_TTL_MS = 3 * 60 * 1000;
const AUTO_SYNC_LEASE_RENEW_MS = 30 * 1000;

type AutoSyncLease = {
  ownerId: string;
  expiresAt: number;
};

function createAutoSyncOwnerId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `webdav_auto_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readAutoSyncLease(): AutoSyncLease | null {
  try {
    const raw = localStorage.getItem(AUTO_SYNC_LEASE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AutoSyncLease>;
    if (!parsed.ownerId || typeof parsed.expiresAt !== 'number') return null;
    return {
      ownerId: parsed.ownerId,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function writeAutoSyncLease(ownerId: string, nowMs = Date.now()) {
  try {
    localStorage.setItem(AUTO_SYNC_LEASE_KEY, JSON.stringify({
      ownerId,
      expiresAt: nowMs + AUTO_SYNC_LEASE_TTL_MS,
    } satisfies AutoSyncLease));
    const confirmed = readAutoSyncLease();
    return confirmed?.ownerId === ownerId;
  } catch {
    return true;
  }
}

function tryAcquireAutoSyncLease(ownerId: string, nowMs = Date.now()) {
  const current = readAutoSyncLease();
  if (current && current.ownerId !== ownerId && current.expiresAt > nowMs) {
    return false;
  }
  return writeAutoSyncLease(ownerId, nowMs);
}

function releaseAutoSyncLease(ownerId: string) {
  try {
    const current = readAutoSyncLease();
    if (current?.ownerId === ownerId) {
      localStorage.removeItem(AUTO_SYNC_LEASE_KEY);
    }
  } catch {}
}

function getFailureRetryDelay(failureCount: number) {
  const normalizedFailureCount = Math.max(1, Math.min(8, Math.floor(failureCount)));
  return Math.min(
    AUTO_SYNC_FAILURE_RETRY_MAX_DELAY_MS,
    AUTO_SYNC_FAILURE_RETRY_BASE_DELAY_MS * (2 ** (normalizedFailureCount - 1)),
  );
}

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
  const leaseRenewTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);
  const ownerIdRef = useRef(createAutoSyncOwnerId());
  const failureCountRef = useRef(0);
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
    window.dispatchEvent(new CustomEvent('webdav-sync-status-changed'));
  }, []);

  const clearLeaseRenewTimer = useCallback(() => {
    if (leaseRenewTimerRef.current !== null) {
      window.clearInterval(leaseRenewTimerRef.current);
      leaseRenewTimerRef.current = null;
    }
  }, []);

  const startLeaseRenewal = useCallback(() => {
    clearLeaseRenewTimer();
    leaseRenewTimerRef.current = window.setInterval(() => {
      writeAutoSyncLease(ownerIdRef.current);
    }, AUTO_SYNC_LEASE_RENEW_MS);
  }, [clearLeaseRenewTimer]);

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
    window.addEventListener('online', handleConfigChanged);
    document.addEventListener('visibilitychange', handleConfigChanged);
    return () => {
      window.removeEventListener('webdav-config-changed', handleConfigChanged);
      window.removeEventListener('online', handleConfigChanged);
      document.removeEventListener('visibilitychange', handleConfigChanged);
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

    if (typeof document !== 'undefined' && document.hidden) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      clearLeaseRenewTimer();
      releaseAutoSyncLease(ownerIdRef.current);
      return () => {
        disposed = true;
      };
    }

    const scheduleNext = (targetMs: number, options?: { publishStatus?: boolean }) => {
      if (disposed) return;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      const nextMs = Math.max(Date.now() + 200, targetMs);
      if (options?.publishStatus !== false) {
        localStorage.setItem(WEBDAV_STORAGE_KEYS.nextSyncAt, new Date(nextMs).toISOString());
        emitStatusChanged();
      }
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

        const latestFlags = latestFlagsRef.current;
        const now = Date.now();
        const retryAfterBusyAt = now + AUTO_SYNC_BUSY_RETRY_DELAY_MS;
        const retryAfterFailureAt = now + getFailureRetryDelay(failureCountRef.current + 1);
        if (
          inFlightRef.current
          || latestFlags.syncing
          || latestFlags.conflictModalOpen
          || latestFlags.isDragging
          || document.hidden
          || !navigator.onLine
        ) {
          scheduleNext(retryAfterBusyAt, { publishStatus: false });
          return;
        }

        if (!tryAcquireAutoSyncLease(ownerIdRef.current, now)) {
          scheduleNext(retryAfterBusyAt, { publishStatus: false });
          return;
        }

        inFlightRef.current = true;
        startLeaseRenewal();
        try {
          const ok = await latestOnSyncRef.current();
          if (disposed) return;
          if (ok) {
            failureCountRef.current = 0;
            if (readWebdavStorageStateFromStorage().autoSyncToastEnabled) {
              toast.success(latestTRef.current('settings.backup.webdav.syncSuccess'));
            }
            scheduleNext(getAlignedJitteredNextAt(getIntervalMinutes()));
            return;
          }
        } finally {
          inFlightRef.current = false;
          clearLeaseRenewTimer();
          releaseAutoSyncLease(ownerIdRef.current);
        }

        if (disposed) return;
        failureCountRef.current += 1;
        scheduleNext(retryAfterFailureAt);
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
      clearLeaseRenewTimer();
      releaseAutoSyncLease(ownerIdRef.current);
    };
  }, [clearLeaseRenewTimer, configVersion, emitStatusChanged, getIntervalMinutes, startLeaseRenewal]);
}
