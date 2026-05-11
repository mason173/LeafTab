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
const WEBDAV_AUTO_SYNC_CONFIG_MESSAGE_TYPE = 'LEAFTAB_WEBDAV_AUTO_SYNC_CONFIG';
const WEBDAV_AUTO_SYNC_TRIGGER_MESSAGE_TYPE = 'LEAFTAB_WEBDAV_AUTO_SYNC_TRIGGER';

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

function sendWebdavAutoSyncConfigToBackground(payload: {
  enabled: boolean;
  nextSyncAt?: string | null;
  intervalMinutes?: number;
}) {
  try {
    const runtime = (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome?.runtime;
    if (!runtime?.id || typeof runtime.sendMessage !== 'function') return;
    runtime.sendMessage({
      type: WEBDAV_AUTO_SYNC_CONFIG_MESSAGE_TYPE,
      payload,
    }, () => {
      void runtime.lastError;
    });
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

  const clearScheduledSync = useCallback((options?: { publishStatus?: boolean }) => {
    clearLeaseRenewTimer();
    releaseAutoSyncLease(ownerIdRef.current);
    localStorage.removeItem(WEBDAV_STORAGE_KEYS.nextSyncAt);
    if (options?.publishStatus !== false) {
      emitStatusChanged();
    }
    sendWebdavAutoSyncConfigToBackground({
      enabled: false,
      nextSyncAt: null,
    });
  }, [clearLeaseRenewTimer, emitStatusChanged]);

  const publishNextSync = useCallback((targetMs: number, options?: { publishStatus?: boolean }) => {
    const nextMs = Math.max(Date.now() + 200, targetMs);
    const nextSyncAt = new Date(nextMs).toISOString();
    if (options?.publishStatus !== false) {
      localStorage.setItem(WEBDAV_STORAGE_KEYS.nextSyncAt, nextSyncAt);
      emitStatusChanged();
    }
    sendWebdavAutoSyncConfigToBackground({
      enabled: true,
      nextSyncAt,
      intervalMinutes: getIntervalMinutes(),
    });
    return nextMs;
  }, [emitStatusChanged, getIntervalMinutes]);

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

  const handleAutoSyncTrigger = useCallback(async () => {
    const latestConfig = readWebdavConfigFromStorage();
    if (!latestConfig?.syncOptions?.syncBySchedule) {
      clearScheduledSync();
      return {
        handled: true,
        enabled: false,
        nextSyncAt: null,
      };
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
      const nextMs = publishNextSync(retryAfterBusyAt, { publishStatus: false });
      return {
        handled: false,
        retryAfterMs: AUTO_SYNC_BUSY_RETRY_DELAY_MS,
        nextSyncAt: new Date(nextMs).toISOString(),
      };
    }

    if (!tryAcquireAutoSyncLease(ownerIdRef.current, now)) {
      const nextMs = publishNextSync(retryAfterBusyAt, { publishStatus: false });
      return {
        handled: false,
        retryAfterMs: AUTO_SYNC_BUSY_RETRY_DELAY_MS,
        nextSyncAt: new Date(nextMs).toISOString(),
      };
    }

    inFlightRef.current = true;
    startLeaseRenewal();
    try {
      const ok = await latestOnSyncRef.current();
      if (!readWebdavConfigFromStorage()?.syncOptions?.syncBySchedule) {
        clearScheduledSync();
        return {
          handled: true,
          enabled: false,
          nextSyncAt: null,
        };
      }
      if (ok) {
        failureCountRef.current = 0;
        if (readWebdavStorageStateFromStorage().autoSyncToastEnabled) {
          toast.success(latestTRef.current('settings.backup.webdav.syncSuccess'));
        }
        const nextMs = publishNextSync(getAlignedJitteredNextAt(getIntervalMinutes()));
        return {
          handled: true,
          ok: true,
          nextSyncAt: new Date(nextMs).toISOString(),
        };
      }
    } finally {
      inFlightRef.current = false;
      clearLeaseRenewTimer();
      releaseAutoSyncLease(ownerIdRef.current);
    }

    if (!readWebdavConfigFromStorage()?.syncOptions?.syncBySchedule) {
      clearScheduledSync();
      return {
        handled: true,
        enabled: false,
        nextSyncAt: null,
      };
    }
    failureCountRef.current += 1;
    const nextMs = publishNextSync(retryAfterFailureAt);
    return {
      handled: true,
      ok: false,
      nextSyncAt: new Date(nextMs).toISOString(),
    };
  }, [
    clearLeaseRenewTimer,
    clearScheduledSync,
    getIntervalMinutes,
    publishNextSync,
    startLeaseRenewal,
  ]);

  useEffect(() => {
    const runtime = (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome?.runtime;
    if (!runtime?.onMessage?.addListener || !runtime.onMessage.removeListener) return;

    const handleRuntimeMessage = (
      message: { type?: string } | null | undefined,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void,
    ) => {
      if (message?.type !== WEBDAV_AUTO_SYNC_TRIGGER_MESSAGE_TYPE) return false;
      void handleAutoSyncTrigger()
        .then((response) => {
          sendResponse(response);
        })
        .catch((error) => {
          sendResponse({
            handled: false,
            error: String((error as Error)?.message || error),
            retryAfterMs: AUTO_SYNC_FAILURE_RETRY_BASE_DELAY_MS,
          });
        });
      return true;
    };

    runtime.onMessage.addListener(handleRuntimeMessage);
    return () => {
      runtime.onMessage.removeListener(handleRuntimeMessage);
    };
  }, [handleAutoSyncTrigger]);

  useEffect(() => {
    const config = readWebdavConfigFromStorage();
    if (!config?.syncOptions?.syncBySchedule) {
      clearScheduledSync();
      return;
    }

    const persistedNextAtIso = localStorage.getItem(WEBDAV_STORAGE_KEYS.nextSyncAt);
    const persistedNextAtMs = persistedNextAtIso ? new Date(persistedNextAtIso).getTime() : Number.NaN;
    const initialTarget = resolveInitialAlignedJitteredTargetAt({
      intervalMinutes: getIntervalMinutes(),
      persistedNextAtIso: Number.isFinite(persistedNextAtMs) && persistedNextAtMs > Date.now()
        ? persistedNextAtIso
        : null,
    });

    publishNextSync(initialTarget);

    return () => {
      clearLeaseRenewTimer();
      releaseAutoSyncLease(ownerIdRef.current);
    };
  }, [clearLeaseRenewTimer, clearScheduledSync, configVersion, getIntervalMinutes, publishNextSync]);
}
