import type { WebdavConfig } from "@/hooks/useWebdavSync";

export type WebdavConflictPolicy = "merge" | "prefer_remote" | "prefer_local";

export const WEBDAV_STORAGE_KEYS = {
  profileName: "webdav_profile_name",
  url: "webdav_url",
  username: "webdav_username",
  password: "webdav_password",
  filePath: "webdav_file_path",
  syncEnabled: "webdav_sync_enabled",
  syncBySchedule: "webdav_sync_by_schedule",
  syncIntervalMinutes: "webdav_sync_interval_minutes",
  syncConflictPolicy: "webdav_sync_conflict_policy",
  syncIncludeNestedConfigs: "webdav_sync_include_nested_configs",
  nextSyncAt: "webdav_next_sync_at",
} as const;

export const WEBDAV_DEFAULT_FILE_PATH = "leaftab_sync.leaftab";
export const WEBDAV_DEFAULT_SYNC_INTERVAL_MINUTES = 15;
export const WEBDAV_DEFAULT_CONFLICT_POLICY: WebdavConflictPolicy = "merge";

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
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncBySchedule, "true");
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncIntervalMinutes, String(state.syncIntervalMinutes));
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncConflictPolicy, state.syncConflictPolicy);
  localStorage.setItem(WEBDAV_STORAGE_KEYS.syncIncludeNestedConfigs, "true");
};

export const readWebdavConfigFromStorage = (): WebdavConfig | null => {
  const state = readWebdavStorageStateFromStorage();
  const enabled = state.syncEnabled;
  if (!enabled) return null;

  const url = state.url;
  if (!url) return null;

  const username = state.username;
  const password = state.password;
  const filePath = state.filePath;
  const syncIntervalMinutes = state.syncIntervalMinutes;
  const syncConflictPolicy = state.syncConflictPolicy;

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
};
