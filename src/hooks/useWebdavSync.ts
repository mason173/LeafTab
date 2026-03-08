import { useCallback } from "react";
import { parseLeafTabBackup } from "../utils/backupData";

export type WebdavConfig = {
  url: string;
  username: string;
  password: string;
  filePath: string;
  syncOptions?: {
    enabled?: boolean;
    syncOnChange: boolean;
    syncBySchedule: boolean;
    syncIntervalMinutes: number;
    syncConflictPolicy: "merge" | "prefer_remote" | "prefer_local";
    includeNestedConfigs: boolean;
  };
};

export type ApplyImportedDataOptions = {
  closeSettings?: boolean;
  successKey?: string;
  silentSuccess?: boolean;
};

interface UseWebdavSyncParams {
  buildBackupData: () => any;
  applyImportedData: (data: any, options?: ApplyImportedDataOptions) => void;
}

export function useWebdavSync({ buildBackupData, applyImportedData }: UseWebdavSyncParams) {
  const resolveWebdavTarget = useCallback((config: WebdavConfig) => {
    const base = (config.url || "").trim().replace(/\/+$/, "");
    const path = (config.filePath || "leaftab_sync.leaftab").trim().replace(/^\/+/, "");
    if (!base) throw new Error("Invalid WebDAV URL");
    return `${base}/${path}`;
  }, []);

  const getWebdavAuthHeader = useCallback((config: WebdavConfig) => {
    const username = (config.username || "").trim();
    const password = config.password || "";
    if (!username && !password) return "";
    return `Basic ${btoa(`${username}:${password}`)}`;
  }, []);

  const putWebdavPayload = useCallback(async (config: WebdavConfig, payload: any) => {
    const target = resolveWebdavTarget(config);
    const auth = getWebdavAuthHeader(config);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (auth) headers.Authorization = auth;
    const response = await fetch(target, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload, null, 2),
    });
    if (!response.ok) {
      throw new Error(`WebDAV upload failed: ${response.status}`);
    }
  }, [resolveWebdavTarget, getWebdavAuthHeader]);

  const uploadToWebdav = useCallback(async (config: WebdavConfig) => {
    const payload = buildBackupData();
    await putWebdavPayload(config, payload);
  }, [buildBackupData, putWebdavPayload]);

  const uploadDataToWebdav = useCallback(async (config: WebdavConfig, data: any) => {
    const payload = buildBackupData();
    const finalPayload = payload?.type === "leaftab_backup"
      ? { ...payload, timestamp: new Date().toISOString(), data }
      : data;
    await putWebdavPayload(config, finalPayload);
  }, [buildBackupData, putWebdavPayload]);

  const parseWebdavPayload = useCallback((text: string) => {
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("Invalid WebDAV backup format");
    }
    const payload = parseLeafTabBackup(parsed);
    if (!payload) throw new Error("Invalid WebDAV backup format");
    return payload;
  }, []);

  const fetchWebdavData = useCallback(async (config: WebdavConfig) => {
    const target = resolveWebdavTarget(config);
    const auth = getWebdavAuthHeader(config);
    const headers: Record<string, string> = {};
    if (auth) headers.Authorization = auth;
    const response = await fetch(target, {
      method: "GET",
      headers,
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`WebDAV download failed: ${response.status}`);
    }
    const text = await response.text();
    return parseWebdavPayload(text);
  }, [resolveWebdavTarget, getWebdavAuthHeader, parseWebdavPayload]);

  const downloadFromWebdav = useCallback(async (config: WebdavConfig) => {
    const data = await fetchWebdavData(config);
    if (!data) return;
    applyImportedData(data, { closeSettings: false, silentSuccess: true });
  }, [applyImportedData, fetchWebdavData]);

  return {
    uploadToWebdav,
    uploadDataToWebdav,
    downloadFromWebdav,
    fetchWebdavData,
  };
}
