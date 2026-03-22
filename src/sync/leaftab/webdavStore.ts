import { ensureOriginPermission } from '@/utils/extensionPermissions';
import {
  createLeafTabSyncCommitFile,
  createLeafTabSyncHeadFile,
  getLeafTabSyncCommitPath,
  getLeafTabSyncHeadPath,
  getLeafTabSyncLockPath,
  LEAFTAB_SYNC_DEFAULT_ROOT,
  type LeafTabSyncManifestFile,
  type LeafTabSyncCommitFile,
  type LeafTabSyncHeadFile,
  type LeafTabSyncSnapshot,
} from './schema';
import { collectLeafTabSyncChangedPayloadPaths, createLeafTabSyncSerializedSnapshot } from './fileMap';
import { materializeLeafTabSyncSnapshotFromPayloadMap } from './snapshotCodec';
import type {
  LeafTabSyncRemoteStore,
  LeafTabSyncWriteStateParams,
  LeafTabSyncWriteStateResult,
} from './remoteStore';

export interface LeafTabSyncWebdavStoreConfig {
  url: string;
  username?: string;
  password?: string;
  rootPath?: string;
  requestPermission?: boolean;
}

type WebdavMethod = 'GET' | 'PUT' | 'DELETE' | 'MKCOL';

type WebdavRequestResult = {
  status: number;
  ok: boolean;
  text: string;
};

type WebdavLockFile = {
  deviceId: string;
  acquiredAt: string;
  expiresAt: string;
};

type LeafTabSyncRemoteCacheEntry = {
  commitId: string;
  commit: LeafTabSyncCommitFile;
  snapshot: LeafTabSyncSnapshot;
  savedAt: string;
};

export class LeafTabSyncWebdavError extends Error {
  status: number;
  operation: string;
  relativePath: string | null;

  constructor(operation: string, status: number, relativePath?: string | null, message?: string) {
    super(message || `LeafTab sync WebDAV ${operation} failed: ${status}${relativePath ? ` @ ${relativePath}` : ''}`);
    this.name = 'LeafTabSyncWebdavError';
    this.status = status;
    this.operation = operation;
    this.relativePath = relativePath || null;
  }
}

export class LeafTabSyncWebdavLockError extends Error {
  lock: WebdavLockFile;

  constructor(lock: WebdavLockFile) {
    super(`LeafTab 同步当前被设备 ${lock.deviceId} 占用，锁将持续到 ${lock.expiresAt}`);
    this.name = 'LeafTabSyncWebdavLockError';
    this.lock = lock;
  }
}

const normalizeBaseUrl = (url: string) => {
  const trimmed = (url || '').trim().replace(/\/+$/, '');
  if (!trimmed) throw new Error('Invalid WebDAV URL');
  return trimmed;
};

const normalizeRootPath = (rootPath?: string) => {
  return (rootPath || LEAFTAB_SYNC_DEFAULT_ROOT).trim().replace(/^\/+/, '').replace(/\/+$/, '') || LEAFTAB_SYNC_DEFAULT_ROOT;
};

const joinUrl = (baseUrl: string, relativePath: string) => {
  return `${normalizeBaseUrl(baseUrl)}/${relativePath.replace(/^\/+/, '')}`;
};

const encodeBasicAuth = (username?: string, password?: string) => {
  if (!username && !password) return '';
  return `Basic ${btoa(`${username || ''}:${password || ''}`)}`;
};

const isRuntimeProxyUnavailable = (message: string) => {
  return /Receiving end does not exist|Could not establish connection|The message port closed/i.test(message);
};

const parseJsonOrNull = <T>(text: string): T | null => {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

const REMOTE_CACHE_STORAGE_PREFIX = 'leaftab_sync_remote_state_v1:';
const READ_BATCH_CONCURRENCY = 12;
const WRITE_BATCH_CONCURRENCY = 8;

const createRemoteCacheStorageKey = (url: string, rootPath: string) => {
  const suffix = `${normalizeBaseUrl(url)}|${normalizeRootPath(rootPath)}`
    .replace(/[^a-zA-Z0-9_-]+/g, '_');
  return `${REMOTE_CACHE_STORAGE_PREFIX}${suffix}`;
};

const runInBatches = async <T, R>(
  items: T[],
  batchSize: number,
  task: (item: T) => Promise<R>,
) => {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    results.push(...(await Promise.all(batch.map((item) => task(item)))));
  }
  return results;
};

export class LeafTabSyncWebdavStore implements LeafTabSyncRemoteStore {
  private readonly config: Required<LeafTabSyncWebdavStoreConfig>;
  private readonly remoteCacheStorageKey: string;
  private permissionGranted = false;
  private readonly ensuredCollections = new Set<string>();
  private static readonly memoryRemoteCache = new Map<string, LeafTabSyncRemoteCacheEntry>();

  constructor(config: LeafTabSyncWebdavStoreConfig) {
    this.config = {
      url: normalizeBaseUrl(config.url),
      username: config.username || '',
      password: config.password || '',
      rootPath: normalizeRootPath(config.rootPath),
      requestPermission: config.requestPermission !== false,
    };
    this.remoteCacheStorageKey = createRemoteCacheStorageKey(this.config.url, this.config.rootPath);
  }

  private readRemoteCache(commitId: string) {
    const inMemory = LeafTabSyncWebdavStore.memoryRemoteCache.get(this.remoteCacheStorageKey);
    if (inMemory?.commitId === commitId) {
      return inMemory;
    }

    try {
      const raw = globalThis.localStorage?.getItem(this.remoteCacheStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as LeafTabSyncRemoteCacheEntry | null;
      if (!parsed || parsed.commitId !== commitId || !parsed.snapshot || !parsed.commit) {
        return null;
      }
      LeafTabSyncWebdavStore.memoryRemoteCache.set(this.remoteCacheStorageKey, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  private writeRemoteCache(entry: LeafTabSyncRemoteCacheEntry) {
    LeafTabSyncWebdavStore.memoryRemoteCache.set(this.remoteCacheStorageKey, entry);
    try {
      globalThis.localStorage?.setItem(this.remoteCacheStorageKey, JSON.stringify(entry));
    } catch {}
  }

  private clearRemoteCache() {
    LeafTabSyncWebdavStore.memoryRemoteCache.delete(this.remoteCacheStorageKey);
    try {
      globalThis.localStorage?.removeItem(this.remoteCacheStorageKey);
    } catch {}
  }

  private async ensurePermission(_relativePath: string) {
    if (this.permissionGranted) return;
    const granted = await ensureOriginPermission(this.config.url, {
      requestIfNeeded: this.config.requestPermission,
    });
    if (!granted) {
      throw new Error('WebDAV origin permission denied');
    }
    this.permissionGranted = true;
  }

  private getHeaders(extra?: Record<string, string>) {
    const auth = encodeBasicAuth(this.config.username, this.config.password);
    return {
      ...(auth ? { Authorization: auth } : {}),
      ...(extra || {}),
    };
  }

  private async requestViaExtensionProxy(
    method: WebdavMethod,
    relativePath: string,
    headers: Record<string, string>,
    body?: string,
  ): Promise<WebdavRequestResult | null> {
    const runtime = (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome?.runtime;
    if (!runtime?.id || typeof runtime.sendMessage !== 'function') {
      return null;
    }

    try {
      const response = await new Promise<any>((resolve, reject) => {
        runtime.sendMessage(
          {
            type: 'LEAFTAB_WEBDAV_PROXY',
            payload: {
              url: joinUrl(this.config.url, relativePath),
              method,
              headers,
              body,
            },
          },
          (result: any) => {
            const lastError = runtime.lastError;
            if (lastError) {
              reject(new Error(lastError.message || 'WebDAV proxy unavailable'));
              return;
            }
            resolve(result);
          },
        );
      });

      if (!response?.success) {
        throw new Error(response?.error || 'WebDAV proxy request failed');
      }

      return {
        status: Number(response?.status || 0),
        ok: Boolean(response?.ok),
        text: typeof response?.bodyText === 'string' ? response.bodyText : '',
      };
    } catch (error) {
      const message = String((error as Error)?.message || '');
      if (isRuntimeProxyUnavailable(message)) return null;
      throw error;
    }
  }

  private async request(
    method: WebdavMethod,
    relativePath: string,
    options?: { headers?: Record<string, string>; body?: string; skipPermission?: boolean },
  ): Promise<WebdavRequestResult> {
    if (!options?.skipPermission) {
      await this.ensurePermission(relativePath);
    }

    const headers = this.getHeaders(options?.headers);
    const proxied = await this.requestViaExtensionProxy(method, relativePath, headers, options?.body);
    if (proxied) return proxied;

    const response = await fetch(joinUrl(this.config.url, relativePath), {
      method,
      headers,
      body: options?.body,
    });
    const text = await response.text();
    return {
      status: response.status,
      ok: response.ok,
      text,
    };
  }

  private async ensureCollections(relativeFilePath: string) {
    const parts = relativeFilePath.split('/').slice(0, -1);
    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (this.ensuredCollections.has(current)) continue;
      const response = await this.request('MKCOL', current, {
        headers: {},
      });
      if (!(response.status === 201 || response.status === 405 || response.status === 301 || response.status === 200)) {
        throw new LeafTabSyncWebdavError('mkcol', response.status, current);
      }
      this.ensuredCollections.add(current);
    }
  }

  private async getText(relativePath: string): Promise<string | null> {
    const response = await this.request('GET', relativePath, {
      headers: {},
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new LeafTabSyncWebdavError('download', response.status, relativePath);
    }
    return response.text;
  }

  private async getJson<T>(relativePath: string): Promise<T | null> {
    const text = await this.getText(relativePath);
    return text ? parseJsonOrNull<T>(text) : null;
  }

  private async putText(relativePath: string, body: string, contentType = 'application/json') {
    await this.ensureCollections(relativePath);
    const response = await this.request('PUT', relativePath, {
      headers: { 'Content-Type': contentType },
      body,
    });
    if (!response.ok) {
      throw new LeafTabSyncWebdavError('upload', response.status, relativePath);
    }
  }

  private async putJson(relativePath: string, payload: unknown) {
    await this.putText(relativePath, JSON.stringify(payload, null, 2));
  }

  private async deletePath(relativePath: string) {
    const response = await this.request('DELETE', relativePath, { headers: {} });
    if (!(response.ok || response.status === 404)) {
      throw new LeafTabSyncWebdavError('delete', response.status, relativePath);
    }
  }

  async acquireLock(deviceId: string, ttlMs = 2 * 60 * 1000) {
    const lockPath = getLeafTabSyncLockPath(this.config.rootPath);
    const now = new Date();
    const currentLock = await this.getJson<WebdavLockFile>(lockPath);
    if (currentLock && Date.parse(currentLock.expiresAt) > now.getTime() && currentLock.deviceId !== deviceId) {
      throw new LeafTabSyncWebdavLockError(currentLock);
    }

    const nextLock: WebdavLockFile = {
      deviceId,
      acquiredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    };
    await this.putJson(lockPath, nextLock);
    return nextLock;
  }

  async releaseLock() {
    await this.deletePath(getLeafTabSyncLockPath(this.config.rootPath));
  }

  async readJsonFile<T>(relativePath: string): Promise<T | null> {
    const normalizedPath = (relativePath || '').trim().replace(/^\/+/, '');
    if (!normalizedPath) return null;
    return this.getJson<T>(normalizedPath);
  }

  async readTextFile(relativePath: string): Promise<string | null> {
    const normalizedPath = (relativePath || '').trim().replace(/^\/+/, '');
    if (!normalizedPath) return null;
    return this.getText(normalizedPath);
  }

  async writeJsonFile(relativePath: string, payload: unknown) {
    const normalizedPath = (relativePath || '').trim().replace(/^\/+/, '');
    if (!normalizedPath) {
      throw new Error('Invalid WebDAV relative path');
    }
    await this.putJson(normalizedPath, payload);
  }

  async writeTextFile(relativePath: string, body: string, contentType = 'application/json') {
    const normalizedPath = (relativePath || '').trim().replace(/^\/+/, '');
    if (!normalizedPath) {
      throw new Error('Invalid WebDAV relative path');
    }
    await this.putText(normalizedPath, body, contentType);
  }

  async deleteFile(relativePath: string) {
    const normalizedPath = (relativePath || '').trim().replace(/^\/+/, '');
    if (!normalizedPath) return;
    await this.deletePath(normalizedPath);
  }

  async readState(): Promise<{
    head: LeafTabSyncHeadFile | null;
    commit: LeafTabSyncCommitFile | null;
    snapshot: LeafTabSyncSnapshot | null;
  }> {
    const head = await this.getJson<LeafTabSyncHeadFile>(
      getLeafTabSyncHeadPath(this.config.rootPath),
    );
    if (!head?.commitId) {
      this.clearRemoteCache();
      return { head: null, commit: null, snapshot: null };
    }

    const cached = this.readRemoteCache(head.commitId);
    if (cached) {
      return {
        head,
        commit: cached.commit,
        snapshot: cached.snapshot,
      };
    }

    const commit = await this.getJson<LeafTabSyncCommitFile>(
      getLeafTabSyncCommitPath(head.commitId, this.config.rootPath),
    );
    if (!commit) {
      this.clearRemoteCache();
      return { head, commit: null, snapshot: null };
    }

    const manifest = await this.getJson<LeafTabSyncManifestFile>(commit.manifestPath);
    if (!manifest?.packs?.length) {
      this.clearRemoteCache();
      return { head, commit, snapshot: null };
    }

    const packEntries = await runInBatches(
      manifest.packs,
      READ_BATCH_CONCURRENCY,
      async (pack) => [pack, await this.getJson<unknown>(pack.path)] as const,
    );
    const payloadMap = Object.fromEntries([
      [commit.manifestPath, manifest],
      ...packEntries.map(([packRef, value]) => [packRef.path, value]),
    ]);
    const snapshot = materializeLeafTabSyncSnapshotFromPayloadMap(payloadMap, commit);
    if (!snapshot) {
      this.clearRemoteCache();
      return { head, commit, snapshot: null };
    }

    this.writeRemoteCache({
      commitId: commit.id,
      commit,
      snapshot,
      savedAt: new Date().toISOString(),
    });

    return {
      head,
      commit,
      snapshot,
    };
  }

  async writeState(params: LeafTabSyncWriteStateParams): Promise<LeafTabSyncWriteStateResult> {
    const commit = createLeafTabSyncCommitFile({
      deviceId: params.deviceId,
      createdAt: params.createdAt,
      parentCommitId: params.parentCommitId ?? null,
      snapshot: params.snapshot,
      rootPath: this.config.rootPath,
    });

    const changedPaths = collectLeafTabSyncChangedPayloadPaths(
      params.previousSnapshot,
      params.snapshot,
      {
        rootPath: this.config.rootPath,
      },
    );
    const serialized = createLeafTabSyncSerializedSnapshot(params.snapshot, {
      rootPath: this.config.rootPath,
      commit,
      head: createLeafTabSyncHeadFile(commit.id, commit.createdAt),
      includePaths: changedPaths,
    });

    const writes = Object.entries(serialized.payloads)
      .map(([path, payload]) => ({ path, payload }));

    await runInBatches(writes, WRITE_BATCH_CONCURRENCY, async ({ path, payload }) => {
      await this.putJson(path, payload);
      return null;
    });

    await this.putJson(getLeafTabSyncCommitPath(commit.id, this.config.rootPath), commit);
    const head = serialized.head;
    await this.putJson(getLeafTabSyncHeadPath(this.config.rootPath), head);

    this.writeRemoteCache({
      commitId: commit.id,
      commit,
      snapshot: params.snapshot,
      savedAt: new Date().toISOString(),
    });

    return { head, commit };
  }
}
