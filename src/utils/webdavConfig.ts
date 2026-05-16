import type { WebdavConfig } from "@/types/webdav";
import type { SyncConflictPolicy } from "@/sync/core";

export type WebdavConflictPolicy = SyncConflictPolicy;

export const WEBDAV_STORAGE_KEYS = {
  profileName: "webdav_profile_name",
  url: "webdav_url",
  username: "webdav_username",
  password: "webdav_password",
  filePath: "webdav_file_path",
  syncEnabled: "webdav_sync_enabled",
  syncBookmarksEnabled: "webdav_sync_bookmarks_enabled",
  syncBySchedule: "webdav_sync_by_schedule",
  autoSyncToastEnabled: "webdav_auto_sync_toast_enabled",
  syncIntervalMinutes: "webdav_sync_interval_minutes",
  syncConflictPolicy: "webdav_sync_conflict_policy",
  nextSyncAt: "webdav_next_sync_at",
} as const;

export const WEBDAV_DEFAULT_FILE_PATH = "leaftab_sync.leaftab";
export const WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES = 10;
export const WEBDAV_DEFAULT_CONFLICT_POLICY: WebdavConflictPolicy = "merge";
export const WEBDAV_DEFAULT_SYNC_BOOKMARKS_ENABLED = false;
export const WEBDAV_DEFAULT_SYNC_BY_SCHEDULE = false;

const parseConflictPolicy = (raw: string): WebdavConflictPolicy => {
  if (raw === "prefer_remote" || raw === "prefer_local" || raw === "merge") return raw;
  return WEBDAV_DEFAULT_CONFLICT_POLICY;
};

export const isWebdavSyncEnabledFromStorage = () => {
  return (localStorage.getItem(WEBDAV_STORAGE_KEYS.syncEnabled) ?? "false") === "true";
};

export const hasWebdavUrlConfiguredFromStorage = () => {
  return Boolean((localStorage.getItem(WEBDAV_STORAGE_KEYS.url) || "").trim());
};

export type WebdavStorageState = {
  profileName: string;
  url: string;
  username: string;
  password: string;
  filePath: string;
  syncEnabled: boolean;
  syncBookmarksEnabled: boolean;
  syncBySchedule: boolean;
  autoSyncToastEnabled: boolean;
  syncIntervalMinutes: number;
  syncConflictPolicy: WebdavConflictPolicy;
};

export const readWebdavStorageStateFromStorage = (defaultProfileName = ""): WebdavStorageState => {
  const profileName = (localStorage.getItem(WEBDAV_STORAGE_KEYS.profileName) || defaultProfileName || "").trim();
  const url = (localStorage.getItem(WEBDAV_STORAGE_KEYS.url) || "").trim();
  const username = (localStorage.getItem(WEBDAV_STORAGE_KEYS.username) || "").trim();
  const password = localStorage.getItem(WEBDAV_STORAGE_KEYS.password) || "";
  const filePath = (localStorage.getItem(WEBDAV_STORAGE_KEYS.filePath) || WEBDAV_DEFAULT_FILE_PATH).trim();
  const syncEnabled = isWebdavSyncEnabledFromStorage();
  const syncBookmarksEnabled = (
    localStorage.getItem(WEBDAV_STORAGE_KEYS.syncBookmarksEnabled)
    ?? String(WEBDAV_DEFAULT_SYNC_BOOKMARKS_ENABLED)
  ) === "true";
  const syncBySchedule = (
    localStorage.getItem(WEBDAV_STORAGE_KEYS.syncBySchedule)
    ?? String(WEBDAV_DEFAULT_SYNC_BY_SCHEDULE)
  ) === "true";
  const autoSyncToastEnabled = (localStorage.getItem(WEBDAV_STORAGE_KEYS.autoSyncToastEnabled) ?? "true") === "true";
  const syncIntervalRaw = Number(localStorage.getItem(WEBDAV_STORAGE_KEYS.syncIntervalMinutes) || String(WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES));
  const syncIntervalMinutes = Number.isFinite(syncIntervalRaw) ? syncIntervalRaw : WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES;
  const syncConflictPolicy = parseConflictPolicy(localStorage.getItem(WEBDAV_STORAGE_KEYS.syncConflictPolicy) || WEBDAV_DEFAULT_CONFLICT_POLICY);

  return {
    profileName,
    url,
    username,
    password,
    filePath: filePath || WEBDAV_DEFAULT_FILE_PATH,
    syncEnabled,
    syncBookmarksEnabled,
    syncBySchedule,
    autoSyncToastEnabled,
    syncIntervalMinutes,
    syncConflictPolicy,
  };
};

export const writeWebdavStorageStateToStorage = (state: WebdavStorageState, defaultProfileName = "") => {
  const profileName = state.profileName.trim() || defaultProfileName;
  localStorage.setItem(WEBDAV_STORAGE_KEYS.profileName, profileName);
  localStorage.setItem(WEBDAV_STORAGE_KEYS.url, state.url.trim());
  localStorage.setItem(WEBDAV_STORAGE_KEYS.username, state.username.trim());
  localStorage.setItem(WEBDAV_STORAGE_KEYS.password, state.password || "");
  localStorage.setItem(WEBDAV_STORAGE_KEYS.filePath, (state.filePath || WEBDAV_DEFAULT_FILE_PATH).trim() || WEBDAV_DEFAULT_FILE_PATH);
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncEnabled, String(state.syncEnabled));
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncBookmarksEnabled, String(Boolean(state.syncBookmarksEnabled)));
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncBySchedule, String(Boolean(state.syncBySchedule)));
  localStorage.setItem(WEBDAV_STORAGE_KEYS.autoSyncToastEnabled, String(Boolean(state.autoSyncToastEnabled)));
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncIntervalMinutes, String(state.syncIntervalMinutes));
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncConflictPolicy, state.syncConflictPolicy);
};

export const applyWebdavDangerousBookmarkChoiceToStorage = (defaultProfileName = "") => {
  const current = readWebdavStorageStateFromStorage(defaultProfileName);
  writeWebdavStorageStateToStorage({
    ...current,
    syncEnabled: true,
    syncBookmarksEnabled: false,
  }, defaultProfileName);
};

export const enableWebdavBookmarkSyncInStorage = (defaultProfileName = "") => {
  const current = readWebdavStorageStateFromStorage(defaultProfileName);
  writeWebdavStorageStateToStorage({
    ...current,
    syncEnabled: true,
    syncBookmarksEnabled: true,
  }, defaultProfileName);
};

export const readWebdavConfigFromStorage = (options?: { allowDisabled?: boolean }): WebdavConfig | null => {
  const state = readWebdavStorageStateFromStorage();
  const enabled = state.syncEnabled;
  if (!enabled && !options?.allowDisabled) return null;

  const url = state.url;
  if (!url) return null;

  const username = state.username;
  const password = state.password;
  const filePath = state.filePath;
  const syncBySchedule = state.syncBySchedule;
  const syncIntervalMinutes = state.syncIntervalMinutes;
  const syncConflictPolicy = state.syncConflictPolicy;

  return {
    url,
    username,
    password,
    filePath,
    syncOptions: {
      enabled: enabled || Boolean(options?.allowDisabled),
      syncBySchedule,
      syncIntervalMinutes,
      syncConflictPolicy,
    },
  };
};
