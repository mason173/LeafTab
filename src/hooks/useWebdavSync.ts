import { useCallback } from "react";
import { parseLeafTabBackup } from "../utils/backupData";
import type { SyncConflictPolicy } from "@/sync/core";
import { WebdavHttpError } from "@/utils/webdavError";

export type WebdavConfig = {
  url: string;
  username: string;
  password: string;
  filePath: string;
  syncOptions?: {
    enabled?: boolean;
    syncBySchedule: boolean;
    syncIntervalMinutes: number;
    syncConflictPolicy: SyncConflictPolicy;
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

type WebdavRequestInit = {
  method: "GET" | "PUT";
  headers: Record<string, string>;
  body?: string;
};

type WebdavRequestResult = {
  status: number;
  ok: boolean;
  text: string;
};

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

  const isMissingBackgroundProxyError = useCallback((errorMessage: string) => {
    return /Receiving end does not exist|Could not establish connection|The message port closed/i.test(errorMessage);
  }, []);

  const requestWebdavViaExtension = useCallback(async (
    target: string,
    init: WebdavRequestInit,
  ): Promise<WebdavRequestResult | null> => {
    const runtime = (globalThis as any)?.chrome?.runtime;
    if (!runtime?.id || typeof runtime.sendMessage !== "function") {
      return null;
    }
    try {
      const result = await new Promise<any>((resolve, reject) => {
        runtime.sendMessage(
          {
            type: "LEAFTAB_WEBDAV_PROXY",
            payload: {
              url: target,
              method: init.method,
              headers: init.headers,
              body: init.body,
            },
          },
          (response: any) => {
            const lastError = runtime.lastError;
            if (lastError) {
              reject(new Error(lastError.message || "WebDAV extension proxy unavailable"));
              return;
            }
            resolve(response);
          },
        );
      });
      if (!result?.success) {
        throw new Error(result?.error || "WebDAV proxy request failed");
      }
      return {
        status: Number(result?.status || 0),
        ok: Boolean(result?.ok),
        text: typeof result?.bodyText === "string" ? result.bodyText : "",
      };
    } catch (error) {
      const message = String((error as Error)?.message || error || "");
      if (isMissingBackgroundProxyError(message)) return null;
      throw error;
    }
  }, [isMissingBackgroundProxyError]);

  const resolveWebdavOriginPattern = useCallback((target: string) => {
    try {
      const parsed = new URL(target);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
      return `${parsed.origin}/*`;
    } catch {
      return null;
    }
  }, []);

  const ensureWebdavOriginPermission = useCallback(async (config: WebdavConfig) => {
    const runtime = (globalThis as any)?.chrome?.runtime;
    const permissionsApi = (globalThis as any)?.chrome?.permissions;
    if (!runtime?.id || !permissionsApi?.contains || !permissionsApi?.request) return;
    const declaredPermissions = runtime.getManifest?.()?.permissions || [];
    if (!Array.isArray(declaredPermissions) || !declaredPermissions.includes("permissions")) return;

    const target = resolveWebdavTarget(config);
    const originPattern = resolveWebdavOriginPattern(target);
    if (!originPattern) return;

    const hasPermission = await new Promise<boolean>((resolve, reject) => {
      permissionsApi.contains({ origins: [originPattern] }, (granted: boolean) => {
        const lastError = runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message || "WebDAV permission check failed"));
          return;
        }
        resolve(Boolean(granted));
      });
    });

    if (hasPermission) return;

    const granted = await new Promise<boolean>((resolve, reject) => {
      permissionsApi.request({ origins: [originPattern] }, (allowed: boolean) => {
        const lastError = runtime.lastError;
        if (lastError) {
          reject(new Error(lastError.message || "WebDAV permission request failed"));
          return;
        }
        resolve(Boolean(allowed));
      });
    });

    if (!granted) {
      throw new Error("WebDAV origin permission denied");
    }
  }, [resolveWebdavOriginPattern, resolveWebdavTarget]);

  const requestWebdav = useCallback(async (
    config: WebdavConfig,
    init: WebdavRequestInit,
  ): Promise<WebdavRequestResult> => {
    await ensureWebdavOriginPermission(config);
    const target = resolveWebdavTarget(config);
    const proxied = await requestWebdavViaExtension(target, init);
    if (proxied) return proxied;
    const response = await fetch(target, {
      method: init.method,
      headers: init.headers,
      body: init.body,
    });
    const text = await response.text();
    return {
      status: response.status,
      ok: response.ok,
      text,
    };
  }, [ensureWebdavOriginPermission, requestWebdavViaExtension, resolveWebdavTarget]);

  const putWebdavPayload = useCallback(async (config: WebdavConfig, payload: any) => {
    const auth = getWebdavAuthHeader(config);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (auth) headers.Authorization = auth;
    const response = await requestWebdav(config, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload, null, 2),
    });
    if (!response.ok) {
      throw new WebdavHttpError("upload", response.status);
    }
  }, [getWebdavAuthHeader, requestWebdav]);

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
    const auth = getWebdavAuthHeader(config);
    const headers: Record<string, string> = {};
    if (auth) headers.Authorization = auth;
    const response = await requestWebdav(config, {
      method: "GET",
      headers,
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new WebdavHttpError("download", response.status);
    }
    return parseWebdavPayload(response.text);
  }, [getWebdavAuthHeader, parseWebdavPayload, requestWebdav]);

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
