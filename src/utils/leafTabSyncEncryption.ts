export const LEAFTAB_SYNC_ENCRYPTION_CONFIG_VERSION = 1 as const;
export const LEAFTAB_SYNC_ENCRYPTION_STORAGE_PREFIX = 'leaftab_sync_e2ee_v1:';

export interface LeafTabSyncEncryptionMetadata {
  version: typeof LEAFTAB_SYNC_ENCRYPTION_CONFIG_VERSION;
  algorithm: 'AES-GCM';
  keyDerivation: {
    algorithm: 'PBKDF2';
    hash: 'SHA-256';
    iterations: number;
    salt: string;
  };
  verifier: string;
}

export interface LeafTabSyncLocalEncryptionConfig {
  version: typeof LEAFTAB_SYNC_ENCRYPTION_CONFIG_VERSION;
  scopeKey: string;
  metadata: LeafTabSyncEncryptionMetadata;
  cachedKey: string;
  createdAt: string;
  updatedAt: string;
}

const normalizeScopeSegment = (value: string) => {
  return (value || '')
    .trim()
    .replace(/[^a-zA-Z0-9:_|.-]+/g, '_')
    .slice(0, 240);
};

const getStorageKey = (scopeKey: string) => {
  return `${LEAFTAB_SYNC_ENCRYPTION_STORAGE_PREFIX}${normalizeScopeSegment(scopeKey)}`;
};

export const createLeafTabCloudEncryptionScopeKey = (username: string | null | undefined) => {
  const normalized = (username || '').trim();
  return normalized ? `cloud:${normalized}` : '';
};

export const createLeafTabWebdavEncryptionScopeKey = (
  url: string | null | undefined,
  rootPath: string | null | undefined,
) => {
  const normalizedUrl = (url || '').trim().replace(/\/+$/, '');
  if (!normalizedUrl) return '';
  const normalizedRootPath = (rootPath || 'leaftab/v1').trim().replace(/^\/+/, '').replace(/\/+$/, '') || 'leaftab/v1';
  return `webdav:${normalizedUrl}|${normalizedRootPath}`;
};

export const readLeafTabSyncEncryptionConfig = (scopeKey: string): LeafTabSyncLocalEncryptionConfig | null => {
  if (!scopeKey) return null;
  try {
    const raw = localStorage.getItem(getStorageKey(scopeKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeafTabSyncLocalEncryptionConfig | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== LEAFTAB_SYNC_ENCRYPTION_CONFIG_VERSION) return null;
    if (!parsed.scopeKey || !parsed.metadata || !parsed.cachedKey) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const hasLeafTabSyncEncryptionConfig = (scopeKey: string) => {
  const config = readLeafTabSyncEncryptionConfig(scopeKey);
  return Boolean(config?.cachedKey && config?.metadata);
};

export const writeLeafTabSyncEncryptionConfig = (
  scopeKey: string,
  metadata: LeafTabSyncEncryptionMetadata,
  cachedKey: string,
) => {
  if (!scopeKey) throw new Error('Missing sync encryption scope key');
  const now = new Date().toISOString();
  const previous = readLeafTabSyncEncryptionConfig(scopeKey);
  const next: LeafTabSyncLocalEncryptionConfig = {
    version: LEAFTAB_SYNC_ENCRYPTION_CONFIG_VERSION,
    scopeKey,
    metadata,
    cachedKey,
    createdAt: previous?.createdAt || now,
    updatedAt: now,
  };
  localStorage.setItem(getStorageKey(scopeKey), JSON.stringify(next));
};

export const clearLeafTabSyncEncryptionConfig = (scopeKey: string) => {
  if (!scopeKey) return;
  try {
    localStorage.removeItem(getStorageKey(scopeKey));
  } catch {}
};

export const emitLeafTabSyncEncryptionChanged = () => {
  window.dispatchEvent(new Event('leaftab-sync-encryption-changed'));
};
