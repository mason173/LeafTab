import type { SyncConflictPolicy } from '@/sync/core';

export const CLOUD_SYNC_STORAGE_KEYS = {
  enabled: 'cloud_sync_enabled',
  autoSyncToastEnabled: 'cloud_auto_sync_toast_enabled',
  intervalMinutes: 'cloud_sync_interval_minutes',
  conflictPolicy: 'cloud_sync_conflict_policy',
  nickname: 'cloud_sync_nickname',
  lastSyncAt: 'cloud_last_sync_at',
  nextSyncAt: 'cloud_next_sync_at',
} as const;

export const CLOUD_SYNC_DEFAULT_INTERVAL_MINUTES = 5;
export const CLOUD_SYNC_DEFAULT_CONFLICT_POLICY: SyncConflictPolicy = 'merge';

export type CloudSyncConfig = {
  enabled: boolean;
  autoSyncToastEnabled: boolean;
  intervalMinutes: number;
  conflictPolicy: SyncConflictPolicy;
  nickname: string;
};

export const normalizeCloudSyncIntervalMinutes = (value: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return CLOUD_SYNC_DEFAULT_INTERVAL_MINUTES;
  return Math.min(60, Math.max(1, Math.round(n)));
};

const parseConflictPolicy = (raw: string | null): SyncConflictPolicy => {
  if (raw === 'prefer_local' || raw === 'prefer_remote' || raw === 'merge') return raw;
  return CLOUD_SYNC_DEFAULT_CONFLICT_POLICY;
};

export const readCloudSyncConfigFromStorage = (): CloudSyncConfig => {
  const enabled = (localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.enabled) ?? 'true') === 'true';
  const autoSyncToastEnabled = (localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.autoSyncToastEnabled) ?? 'true') === 'true';
  const intervalRaw = Number(localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.intervalMinutes) || String(CLOUD_SYNC_DEFAULT_INTERVAL_MINUTES));
  const intervalMinutes = normalizeCloudSyncIntervalMinutes(intervalRaw);
  const conflictPolicy = parseConflictPolicy(localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.conflictPolicy));
  const nickname = (localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.nickname) || '').trim();
  return {
    enabled,
    autoSyncToastEnabled,
    intervalMinutes,
    conflictPolicy,
    nickname,
  };
};

export const writeCloudSyncConfigToStorage = (config: CloudSyncConfig) => {
  localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.enabled, String(Boolean(config.enabled)));
  localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.autoSyncToastEnabled, String(Boolean(config.autoSyncToastEnabled)));
  localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.intervalMinutes, String(normalizeCloudSyncIntervalMinutes(config.intervalMinutes)));
  localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.conflictPolicy, config.conflictPolicy);
  localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.nickname, (config.nickname || '').trim());
};

export const emitCloudSyncConfigChanged = () => {
  window.dispatchEvent(new Event('cloud-sync-config-changed'));
};

export const emitCloudSyncStatusChanged = () => {
  window.dispatchEvent(new Event('cloud-sync-status-changed'));
};
