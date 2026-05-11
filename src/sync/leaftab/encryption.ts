import {
  createLeafTabSyncCommitFile,
  createLeafTabSyncHeadFile,
  getLeafTabSyncCommitPath,
  getLeafTabSyncHeadPath,
  LEAFTAB_SYNC_DEFAULT_ROOT,
  type LeafTabSyncCommitFile,
  type LeafTabSyncHeadFile,
  type LeafTabSyncManifestFile,
  type LeafTabSyncSnapshot,
} from './schema';
import {
  collectLeafTabSyncChangedPayloadPaths,
  createLeafTabSyncSerializedSnapshot,
} from './fileMap';
import {
  materializeLeafTabSyncSnapshotFromPayloadMap,
} from './snapshotCodec';
import type {
  LeafTabSyncRemoteState,
  LeafTabSyncRemoteStore,
  LeafTabSyncWriteStateParams,
  LeafTabSyncWriteStateResult,
} from './remoteStore';
import { LeafTabSyncCloudRemoteStoreError } from './cloudRemoteStore';
import { LeafTabSyncWebdavStore } from './webdavStore';
import { yieldToMainThread } from '@/utils/mainThreadScheduler';
import {
  readLeafTabSyncCacheEntry,
  removeLeafTabSyncCacheEntry,
  writeLeafTabSyncCacheEntry,
} from './asyncStorage';
import {
  readLeafTabSyncEncryptionConfig,
  type LeafTabSyncEncryptionMetadata,
} from '@/utils/leafTabSyncEncryption';

const ENCRYPTION_VERIFIER_LABEL = 'LeafTab Sync E2EE Verifier v1';
const ENCRYPTED_REMOTE_CACHE_PREFIX = 'leaftab_sync_encrypted_remote_cache_v2:';
const FILE_READ_BATCH_SIZE = 4;
const FILE_WRITE_BATCH_SIZE = 3;

export interface LeafTabSyncEncryptedSummary {
  scenarios: number;
  shortcuts: number;
  bookmarkFolders: number;
  bookmarkItems: number;
  tombstones: number;
}

export interface LeafTabSyncEncryptedFileEnvelope {
  kind: 'leaftab-sync-e2ee-file';
  version: 1;
  iv: string;
  ciphertext: string;
}

export interface LeafTabSyncEncryptionState {
  head: LeafTabSyncHeadFile | null;
  commit: LeafTabSyncCommitFile | null;
  metadata: LeafTabSyncEncryptionMetadata | null;
  mode: 'empty' | 'encrypted-sharded';
}

export interface LeafTabSyncEncryptedTransportWriteParams {
  head: LeafTabSyncHeadFile;
  commit: LeafTabSyncCommitFile;
  files: Record<string, string>;
}

export interface LeafTabSyncEncryptedRemoteTransport {
  acquireLock(deviceId: string, ttlMs?: number): Promise<unknown>;
  releaseLock(): Promise<void>;
  readHead?(): Promise<LeafTabSyncHeadFile | null>;
  readEncryptionState(): Promise<LeafTabSyncEncryptionState>;
  readEncryptedFiles(paths: string[]): Promise<Record<string, string | null>>;
  writeEncryptedFiles(params: LeafTabSyncEncryptedTransportWriteParams): Promise<LeafTabSyncWriteStateResult>;
}

type EncryptedRemoteCacheEntry = {
  commitId: string;
  head: LeafTabSyncHeadFile;
  commit: LeafTabSyncCommitFile;
  snapshot: LeafTabSyncSnapshot;
  savedAt: string;
};

export class LeafTabSyncEncryptionRequiredError extends Error {
  readonly scopeKey: string;
  readonly scopeLabel: string;
  readonly mode: 'setup' | 'unlock';
  readonly metadata: LeafTabSyncEncryptionMetadata | null;

  constructor(params: {
    scopeKey: string;
    scopeLabel: string;
    mode: 'setup' | 'unlock';
    metadata?: LeafTabSyncEncryptionMetadata | null;
  }) {
    super(params.mode === 'setup' ? '需要先设置同步口令' : '需要输入同步口令以解锁同步数据');
    this.name = 'LeafTabSyncEncryptionRequiredError';
    this.scopeKey = params.scopeKey;
    this.scopeLabel = params.scopeLabel;
    this.mode = params.mode;
    this.metadata = params.metadata || null;
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const getCrypto = () => {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error('当前浏览器不支持同步加密');
  }
  return cryptoApi;
};

const encodeBase64 = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
};

const decodeBase64 = (value: string) => {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    out[index] = binary.charCodeAt(index);
  }
  return out;
};

export const serializeLeafTabSyncKeyBytes = (keyBytes: Uint8Array) => encodeBase64(keyBytes);
export const parseLeafTabSyncKeyBytes = (value: string) => decodeBase64(value);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const isEncryptedFileEnvelope = (value: unknown): value is LeafTabSyncEncryptedFileEnvelope => {
  return (
    isRecord(value)
    && value.kind === 'leaftab-sync-e2ee-file'
    && value.version === 1
    && typeof value.iv === 'string'
    && typeof value.ciphertext === 'string'
  );
};

const randomBytes = (length: number) => {
  const out = new Uint8Array(length);
  getCrypto().getRandomValues(out);
  return out;
};

const concatBytes = (left: Uint8Array, right: Uint8Array) => {
  const merged = new Uint8Array(left.length + right.length);
  merged.set(left, 0);
  merged.set(right, left.length);
  return merged;
};

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  if (bytes.buffer instanceof ArrayBuffer && bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) {
    return bytes.buffer;
  }
  return bytes.slice().buffer;
};

const createVerifierBytes = async (keyBytes: Uint8Array) => {
  const verifierBytes = concatBytes(encoder.encode(ENCRYPTION_VERIFIER_LABEL), keyBytes);
  const digest = await getCrypto().subtle.digest(
    'SHA-256',
    toArrayBuffer(verifierBytes),
  );
  return new Uint8Array(digest);
};

const importAesKey = async (keyBytes: Uint8Array) => {
  return getCrypto().subtle.importKey(
    'raw',
    toArrayBuffer(keyBytes),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  );
};

const createCacheStorageKey = (scopeKey: string) => {
  const suffix = String(scopeKey || '').replace(/[^a-zA-Z0-9:_|.-]+/g, '_').slice(0, 240);
  return `${ENCRYPTED_REMOTE_CACHE_PREFIX}${suffix}`;
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
    if (index + batchSize < items.length) {
      await yieldToMainThread();
    }
  }
  return results;
};

const parseJsonText = <T>(value: string | null | undefined): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const serializeJsonStable = (value: unknown) => JSON.stringify(value, null, 2);

const normalizeEncryptedFileTransportState = (
  value: unknown,
): LeafTabSyncEncryptedFileEnvelope | null => {
  return isEncryptedFileEnvelope(value) ? value : null;
};

const normalizeRootPath = (rootPath = LEAFTAB_SYNC_DEFAULT_ROOT) => {
  return rootPath.replace(/^\/+/, '').replace(/\/+$/, '') || LEAFTAB_SYNC_DEFAULT_ROOT;
};

export const createLeafTabSyncEncryptionMetadata = async (passphrase: string): Promise<{
  metadata: LeafTabSyncEncryptionMetadata;
  keyBytes: Uint8Array;
}> => {
  const metadata: LeafTabSyncEncryptionMetadata = {
    version: 1,
    algorithm: 'AES-GCM',
    keyDerivation: {
      algorithm: 'PBKDF2',
      hash: 'SHA-256',
      iterations: 250_000,
      salt: encodeBase64(randomBytes(16)),
    },
    verifier: '',
  };
  const keyBytes = await deriveLeafTabSyncKey(passphrase, metadata);
  metadata.verifier = encodeBase64(await createVerifierBytes(keyBytes));
  return {
    metadata,
    keyBytes,
  };
};

export const deriveLeafTabSyncKey = async (
  passphrase: string,
  metadata: LeafTabSyncEncryptionMetadata,
) => {
  const baseKey = await getCrypto().subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await getCrypto().subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: metadata.keyDerivation.hash,
      iterations: metadata.keyDerivation.iterations,
      salt: decodeBase64(metadata.keyDerivation.salt),
    },
    baseKey,
    256,
  );
  return new Uint8Array(bits);
};

export const verifyLeafTabSyncKey = async (
  keyBytes: Uint8Array,
  metadata: LeafTabSyncEncryptionMetadata,
) => {
  const verifier = encodeBase64(await createVerifierBytes(keyBytes));
  return verifier === metadata.verifier;
};

const encryptLeafTabSyncPayload = async (
  payload: unknown,
  keyBytes: Uint8Array,
): Promise<LeafTabSyncEncryptedFileEnvelope> => {
  const iv = randomBytes(12);
  const key = await importAesKey(keyBytes);
  const plaintext = encoder.encode(JSON.stringify(payload));
  const ciphertext = await getCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    plaintext,
  );
  return {
    kind: 'leaftab-sync-e2ee-file',
    version: 1,
    iv: encodeBase64(iv),
    ciphertext: encodeBase64(new Uint8Array(ciphertext)),
  };
};

const decryptLeafTabSyncPayload = async <T>(
  envelope: LeafTabSyncEncryptedFileEnvelope,
  keyBytes: Uint8Array,
): Promise<T> => {
  const key = await importAesKey(keyBytes);
  const plaintext = await getCrypto().subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: decodeBase64(envelope.iv),
    },
    key,
    decodeBase64(envelope.ciphertext),
  );
  return JSON.parse(decoder.decode(plaintext)) as T;
};

export class LeafTabSyncCloudEncryptedTransport implements LeafTabSyncEncryptedRemoteTransport {
  private readonly apiUrl: string;
  private readonly token: string;

  constructor(config: { apiUrl: string; token: string }) {
    this.apiUrl = config.apiUrl.replace(/\/+$/, '');
    this.token = config.token;
  }

  private async request<T>(path: string, init?: RequestInit, allowNotFound = false): Promise<T | null> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      cache: 'no-store',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
        ...(init?.headers || {}),
      },
    });

    if (allowNotFound && response.status === 404) {
      return null;
    }

    if (!response.ok) {
      let message = '';
      try {
        const data = await response.clone().json();
        message = typeof data?.error === 'string' ? data.error : '';
      } catch {}
      throw new LeafTabSyncCloudRemoteStoreError(
        `${init?.method || 'GET'} ${path}`,
        response.status,
        message || undefined,
      );
    }

    if (response.status === 204) return null;
    return response.json() as Promise<T>;
  }

  async acquireLock(deviceId: string, ttlMs = 2 * 60 * 1000) {
    return this.request('/user/leaftab-sync/lock', {
      method: 'POST',
      body: JSON.stringify({ deviceId, ttlMs }),
    });
  }

  async releaseLock() {
    await this.request('/user/leaftab-sync/lock', { method: 'DELETE' }, true);
  }

  async readEncryptionState(): Promise<LeafTabSyncEncryptionState> {
    const response = await this.request<{
      head?: LeafTabSyncHeadFile | null;
      commit?: LeafTabSyncCommitFile | null;
    }>('/user/leaftab-sync/state', { method: 'GET' }, true);

    const commit = response?.commit || null;
    const metadata = commit?.encryption?.metadata || null;

    return {
      head: response?.head || null,
      commit,
      metadata,
      mode: commit?.encryption?.mode === 'encrypted-sharded-v1' ? 'encrypted-sharded' : 'empty',
    };
  }

  async readEncryptedFiles(paths: string[]) {
    if (!paths.length) return {};
    const response = await this.request<{ files?: Record<string, string | null> }>(
      '/user/leaftab-sync/files/read',
      {
        method: 'POST',
        body: JSON.stringify({ paths }),
      },
      true,
    );
    return response?.files || {};
  }

  async writeEncryptedFiles(params: LeafTabSyncEncryptedTransportWriteParams): Promise<LeafTabSyncWriteStateResult> {
    const response = await this.request<LeafTabSyncWriteStateResult>('/user/leaftab-sync/files/write', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: params.commit.deviceId,
        parentCommitId: params.commit.parentCommitId ?? null,
        createdAt: params.commit.createdAt,
        head: params.head,
        commit: params.commit,
        files: params.files,
      }),
    });
    if (!response?.head || !response?.commit) {
      throw new Error('云同步加密写入返回无效');
    }
    return response;
  }
}

export class LeafTabSyncWebdavEncryptedTransport implements LeafTabSyncEncryptedRemoteTransport {
  private readonly webdavStore: LeafTabSyncWebdavStore;
  private readonly rootPath: string;

  constructor(config: { webdavStore: LeafTabSyncWebdavStore; rootPath: string }) {
    this.webdavStore = config.webdavStore;
    this.rootPath = normalizeRootPath(config.rootPath);
  }

  async acquireLock(deviceId: string, ttlMs = 2 * 60 * 1000) {
    return this.webdavStore.acquireLock(deviceId, ttlMs);
  }

  async releaseLock() {
    await this.webdavStore.releaseLock();
  }

  async readHead() {
    return this.webdavStore.readJsonFile<LeafTabSyncHeadFile>(getLeafTabSyncHeadPath(this.rootPath));
  }

  async readEncryptionState(): Promise<LeafTabSyncEncryptionState> {
    const head = await this.readHead();
    if (!head?.commitId) {
      return {
        head: null,
        commit: null,
        metadata: null,
        mode: 'empty',
      };
    }

    const commit = await this.webdavStore.readJsonFile<LeafTabSyncCommitFile>(
      getLeafTabSyncCommitPath(head.commitId, this.rootPath),
    );
    if (!commit) {
      return {
        head,
        commit: null,
        metadata: null,
        mode: 'empty',
      };
    }

    return {
      head,
      commit,
      metadata: commit.encryption?.mode === 'encrypted-sharded-v1' ? commit.encryption.metadata : null,
      mode: commit.encryption?.mode === 'encrypted-sharded-v1' ? 'encrypted-sharded' : 'empty',
    };
  }

  async readEncryptedFiles(paths: string[]) {
    const entries = await runInBatches(paths, FILE_READ_BATCH_SIZE, async (path) => (
      [path, await this.webdavStore.readTextFile(path)] as const
    ));
    return Object.fromEntries(entries);
  }

  async writeEncryptedFiles(params: LeafTabSyncEncryptedTransportWriteParams): Promise<LeafTabSyncWriteStateResult> {
    const writes = Object.entries(params.files);
    await runInBatches(writes, FILE_WRITE_BATCH_SIZE, async ([path, body]) => {
      await this.webdavStore.writeTextFile(path, body);
      return null;
    });

    await this.webdavStore.writeJsonFile(
      getLeafTabSyncCommitPath(params.commit.id, this.rootPath),
      params.commit,
    );
    await this.webdavStore.writeJsonFile(getLeafTabSyncHeadPath(this.rootPath), params.head);
    return {
      head: params.head,
      commit: params.commit,
    };
  }
}

export class LeafTabSyncEncryptedRemoteStore implements LeafTabSyncRemoteStore {
  private readonly transport: LeafTabSyncEncryptedRemoteTransport;
  private readonly scopeKey: string;
  private readonly scopeLabel: string;
  private readonly cacheStorageKey: string;
  private readonly rootPath: string;
  private static readonly memoryRemoteCache = new Map<string, EncryptedRemoteCacheEntry>();

  constructor(config: {
    transport: LeafTabSyncEncryptedRemoteTransport;
    scopeKey: string;
    scopeLabel: string;
    rootPath?: string;
  }) {
    this.transport = config.transport;
    this.scopeKey = config.scopeKey;
    this.scopeLabel = config.scopeLabel;
    this.cacheStorageKey = createCacheStorageKey(config.scopeKey);
    this.rootPath = normalizeRootPath(config.rootPath);
  }

  async acquireLock(deviceId: string, ttlMs?: number) {
    return this.transport.acquireLock(deviceId, ttlMs);
  }

  async releaseLock() {
    await this.transport.releaseLock();
  }

  private async readRemoteCache(commitId: string) {
    const inMemory = LeafTabSyncEncryptedRemoteStore.memoryRemoteCache.get(this.cacheStorageKey);
    if (inMemory?.commitId === commitId) {
      return inMemory;
    }

    const cached = await readLeafTabSyncCacheEntry<EncryptedRemoteCacheEntry>(this.cacheStorageKey);
    if (cached?.commitId === commitId && cached.snapshot && cached.commit && cached.head) {
      LeafTabSyncEncryptedRemoteStore.memoryRemoteCache.set(this.cacheStorageKey, cached);
      return cached;
    }

    try {
      const raw = globalThis.localStorage?.getItem(this.cacheStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as EncryptedRemoteCacheEntry | null;
      if (!parsed || parsed.commitId !== commitId || !parsed.snapshot || !parsed.commit || !parsed.head) {
        return null;
      }
      LeafTabSyncEncryptedRemoteStore.memoryRemoteCache.set(this.cacheStorageKey, parsed);
      void writeLeafTabSyncCacheEntry(this.cacheStorageKey, parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  private async writeRemoteCache(entry: EncryptedRemoteCacheEntry) {
    LeafTabSyncEncryptedRemoteStore.memoryRemoteCache.set(this.cacheStorageKey, entry);
    if (await writeLeafTabSyncCacheEntry(this.cacheStorageKey, entry)) {
      try {
        globalThis.localStorage?.removeItem(this.cacheStorageKey);
      } catch {}
      return;
    }
    try {
      globalThis.localStorage?.setItem(this.cacheStorageKey, JSON.stringify(entry));
    } catch {}
  }

  private async clearRemoteCache() {
    LeafTabSyncEncryptedRemoteStore.memoryRemoteCache.delete(this.cacheStorageKey);
    await removeLeafTabSyncCacheEntry(this.cacheStorageKey);
    try {
      globalThis.localStorage?.removeItem(this.cacheStorageKey);
    } catch {}
  }

  async readHead() {
    return this.transport.readHead?.() || null;
  }

  private async resolveKeyBytes(metadata: LeafTabSyncEncryptionMetadata | null, mode: 'setup' | 'unlock') {
    const localConfig = readLeafTabSyncEncryptionConfig(this.scopeKey);
    if (!localConfig?.cachedKey || !localConfig.metadata) {
      throw new LeafTabSyncEncryptionRequiredError({
        scopeKey: this.scopeKey,
        scopeLabel: this.scopeLabel,
        mode,
        metadata,
      });
    }
    const effectiveMetadata = metadata || localConfig.metadata;
    const keyBytes = parseLeafTabSyncKeyBytes(localConfig.cachedKey);
    const valid = await verifyLeafTabSyncKey(keyBytes, effectiveMetadata);
    if (!valid) {
      throw new LeafTabSyncEncryptionRequiredError({
        scopeKey: this.scopeKey,
        scopeLabel: this.scopeLabel,
        mode: 'unlock',
        metadata: effectiveMetadata,
      });
    }
    return {
      keyBytes,
      metadata: effectiveMetadata,
    };
  }

  async readState(): Promise<LeafTabSyncRemoteState> {
    if (this.transport.readHead) {
      const head = await this.transport.readHead();
      if (!head?.commitId) {
        await this.clearRemoteCache();
        return {
          head,
          commit: null,
          snapshot: null,
        };
      }

      const cached = await this.readRemoteCache(head.commitId);
      if (cached) {
        return {
          head,
          commit: cached.commit,
          snapshot: cached.snapshot,
        };
      }
    }

    const state = await this.transport.readEncryptionState();
    if (!state.head?.commitId || !state.commit) {
      await this.clearRemoteCache();
      return {
        head: state.head,
        commit: state.commit,
        snapshot: null,
      };
    }

    const cached = await this.readRemoteCache(state.head.commitId);
    if (cached) {
      return {
        head: cached.head,
        commit: cached.commit,
        snapshot: cached.snapshot,
      };
    }

    if (!state.metadata || state.commit.encryption?.mode !== 'encrypted-sharded-v1') {
      return {
        head: state.head,
        commit: state.commit,
        snapshot: null,
      };
    }

    const { keyBytes } = await this.resolveKeyBytes(state.metadata, 'unlock');
    const encryptedFiles = await this.transport.readEncryptedFiles([state.commit.manifestPath]);
    const manifestEnvelope = normalizeEncryptedFileTransportState(
      parseJsonText<unknown>(encryptedFiles[state.commit.manifestPath] || null),
    );
    if (!manifestEnvelope) {
      await this.clearRemoteCache();
      return {
        head: state.head,
        commit: state.commit,
        snapshot: null,
      };
    }

    const manifest = await decryptLeafTabSyncPayload<LeafTabSyncManifestFile>(manifestEnvelope, keyBytes);
    const packPaths = manifest.packs.map((pack) => pack.path);
    const packBodies = await this.transport.readEncryptedFiles(packPaths);
    const payloadMap: Record<string, unknown> = {
      [state.commit.manifestPath]: manifest,
    };

    await runInBatches(packPaths, FILE_READ_BATCH_SIZE, async (path) => {
      const envelope = normalizeEncryptedFileTransportState(parseJsonText<unknown>(packBodies[path] || null));
      if (!envelope) return null;
      payloadMap[path] = await decryptLeafTabSyncPayload<unknown>(envelope, keyBytes);
      return null;
    });

    const snapshot = materializeLeafTabSyncSnapshotFromPayloadMap(payloadMap, state.commit);
    if (!snapshot) {
      await this.clearRemoteCache();
      return {
        head: state.head,
        commit: state.commit,
        snapshot: null,
      };
    }

    await this.writeRemoteCache({
      commitId: state.head.commitId,
      head: state.head,
      commit: state.commit,
      snapshot,
      savedAt: new Date().toISOString(),
    });

    return {
      head: state.head,
      commit: state.commit,
      snapshot,
    };
  }

  async writeState(params: LeafTabSyncWriteStateParams): Promise<LeafTabSyncWriteStateResult> {
    const { keyBytes, metadata } = await this.resolveKeyBytes(null, 'setup');
    const commit = createLeafTabSyncCommitFile({
      deviceId: params.deviceId,
      createdAt: params.createdAt,
      parentCommitId: params.parentCommitId ?? null,
      snapshot: params.snapshot,
      rootPath: this.rootPath,
    });
    commit.encryption = {
      mode: 'encrypted-sharded-v1',
      metadata,
    };
    const head = createLeafTabSyncHeadFile(commit.id, commit.createdAt);

    const changedPaths = collectLeafTabSyncChangedPayloadPaths(
      params.previousSnapshot,
      params.snapshot,
      { rootPath: this.rootPath },
    );
    const serialized = createLeafTabSyncSerializedSnapshot(params.snapshot, {
      rootPath: this.rootPath,
      commit,
      head,
      includePaths: changedPaths,
    });

    const encryptedEntries = await runInBatches(
      Object.entries(serialized.payloads),
      FILE_WRITE_BATCH_SIZE,
      async ([path, payload]) => {
        const envelope = await encryptLeafTabSyncPayload(payload, keyBytes);
        return [path, serializeJsonStable(envelope)] as const;
      },
    );

    const result = await this.transport.writeEncryptedFiles({
      head,
      commit,
      files: Object.fromEntries(encryptedEntries),
    });

    await this.writeRemoteCache({
      commitId: result.head.commitId,
      head: result.head,
      commit: result.commit,
      snapshot: params.snapshot,
      savedAt: new Date().toISOString(),
    });

    return result;
  }
}
