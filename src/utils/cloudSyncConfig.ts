export const CLOUD_SYNC_STORAGE_KEYS = {
  enabled: 'cloud_sync_enabled',
  syncBookmarksEnabled: 'cloud_sync_bookmarks_enabled',
  autoSyncToastEnabled: 'cloud_auto_sync_toast_enabled',
  intervalMinutes: 'cloud_sync_interval_minutes',
  lastSyncAt: 'cloud_last_sync_at',
  nextSyncAt: 'cloud_next_sync_at',
} as const;

export const CLOUD_SYNC_DEFAULT_INTERVAL_MINUTES = 10;

export type CloudSyncConfig = {
  enabled: boolean;
  syncBookmarksEnabled: boolean;
  autoSyncToastEnabled: boolean;
  intervalMinutes: number;
};

export const normalizeCloudSyncIntervalMinutes = (value: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return CLOUD_SYNC_DEFAULT_INTERVAL_MINUTES;
  return Math.min(60, Math.max(1, Math.round(n)));
};

export const readCloudSyncConfigFromStorage = (): CloudSyncConfig => {
  const enabled = (localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.enabled) ?? 'true') === 'true';
  const syncBookmarksEnabled = (localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.syncBookmarksEnabled) ?? 'false') === 'true';
  const autoSyncToastEnabled = (localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.autoSyncToastEnabled) ?? 'true') === 'true';
  const intervalRaw = Number(localStorage.getItem(CLOUD_SYNC_STORAGE_KEYS.intervalMinutes) || String(CLOUD_SYNC_DEFAULT_INTERVAL_MINUTES));
  const intervalMinutes = normalizeCloudSyncIntervalMinutes(intervalRaw);
  return {
    enabled,
    syncBookmarksEnabled,
    autoSyncToastEnabled,
    intervalMinutes,
  };
};

export const writeCloudSyncConfigToStorage = (config: CloudSyncConfig) => {
  localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.enabled, String(Boolean(config.enabled)));
  localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.syncBookmarksEnabled, String(Boolean(config.syncBookmarksEnabled)));
  localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.autoSyncToastEnabled, String(Boolean(config.autoSyncToastEnabled)));
  localStorage.setItem(CLOUD_SYNC_STORAGE_KEYS.intervalMinutes, String(normalizeCloudSyncIntervalMinutes(config.intervalMinutes)));
  localStorage.removeItem('cloud_sync_conflict_policy');
  localStorage.removeItem('cloud_sync_nickname');
};

export const applyCloudDangerousBookmarkChoiceToStorage = () => {
  const current = readCloudSyncConfigFromStorage();
  writeCloudSyncConfigToStorage({
    ...current,
    enabled: true,
    syncBookmarksEnabled: false,
  });
};

export const emitCloudSyncConfigChanged = () => {
  window.dispatchEvent(new Event('cloud-sync-config-changed'));
};

export const emitCloudSyncStatusChanged = () => {
  window.dispatchEvent(new Event('cloud-sync-status-changed'));
};
