const LEAFTAB_SYNC_SCHEMA_VERSION = 2;
const LEAFTAB_SYNC_ENCRYPTION_VERSION = 1;
const LEAFTAB_SYNC_FILE_STORE_VERSION = 1;

const createLeafTabSyncCommitId = (deviceId, createdAt) => {
  const safeTimestamp = String(createdAt || new Date().toISOString()).replace(/[:.]/g, '-');
  const compactDeviceId = String(deviceId || 'device').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `cmt_${safeTimestamp}_${compactDeviceId}`;
};

const parseJsonOrNull = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeEncryptionMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  if (
    metadata.version !== LEAFTAB_SYNC_ENCRYPTION_VERSION
    || metadata.algorithm !== 'AES-GCM'
    || !metadata.keyDerivation
    || typeof metadata.keyDerivation !== 'object'
    || Array.isArray(metadata.keyDerivation)
    || metadata.keyDerivation.algorithm !== 'PBKDF2'
    || metadata.keyDerivation.hash !== 'SHA-256'
    || typeof metadata.keyDerivation.iterations !== 'number'
    || typeof metadata.keyDerivation.salt !== 'string'
    || typeof metadata.verifier !== 'string'
  ) {
    return null;
  }
  return {
    version: LEAFTAB_SYNC_ENCRYPTION_VERSION,
    algorithm: 'AES-GCM',
    keyDerivation: {
      algorithm: 'PBKDF2',
      hash: 'SHA-256',
      iterations: Math.max(1, Math.round(metadata.keyDerivation.iterations)),
      salt: metadata.keyDerivation.salt,
    },
    verifier: metadata.verifier,
  };
};

const normalizeFileStore = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.kind !== 'leaftab-sync-file-store' || value.version !== LEAFTAB_SYNC_FILE_STORE_VERSION) {
    return null;
  }
  const sourceFiles = value.files;
  if (!sourceFiles || typeof sourceFiles !== 'object' || Array.isArray(sourceFiles)) {
    return null;
  }
  const files = Object.fromEntries(
    Object.entries(sourceFiles)
      .filter(([path, content]) => typeof path === 'string' && typeof content === 'string')
      .map(([path, content]) => [path, content]),
  );
  return {
    kind: 'leaftab-sync-file-store',
    version: LEAFTAB_SYNC_FILE_STORE_VERSION,
    files,
  };
};

const normalizeCommit = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (
    typeof value.id !== 'string'
    || typeof value.deviceId !== 'string'
    || typeof value.createdAt !== 'string'
    || typeof value.manifestPath !== 'string'
  ) {
    return null;
  }
  const encryptionMetadata = normalizeEncryptionMetadata(value.encryption && value.encryption.metadata);
  const encryption = value.encryption && value.encryption.mode === 'encrypted-sharded-v1' && encryptionMetadata
    ? {
        mode: 'encrypted-sharded-v1',
        metadata: encryptionMetadata,
      }
    : null;
  const summary = value.summary && typeof value.summary === 'object' && !Array.isArray(value.summary)
    ? value.summary
    : {};
  const normalizeCount = (input) => {
    const count = Number(input);
    if (!Number.isFinite(count) || count < 0) return 0;
    return Math.round(count);
  };
  return {
    id: value.id,
    version: LEAFTAB_SYNC_SCHEMA_VERSION,
    deviceId: value.deviceId,
    createdAt: value.createdAt,
    parentCommitId: typeof value.parentCommitId === 'string' ? value.parentCommitId : null,
    manifestPath: value.manifestPath,
    encryption,
    summary: {
      scenarios: normalizeCount(summary.scenarios),
      shortcuts: normalizeCount(summary.shortcuts),
      bookmarkFolders: normalizeCount(summary.bookmarkFolders),
      bookmarkItems: normalizeCount(summary.bookmarkItems),
      tombstones: normalizeCount(summary.tombstones),
    },
  };
};

const normalizeHead = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (typeof value.commitId !== 'string' || !value.commitId) return null;
  return {
    version: LEAFTAB_SYNC_SCHEMA_VERSION,
    commitId: value.commitId,
    updatedAt: typeof value.updatedAt === 'string' && value.updatedAt ? value.updatedAt : new Date().toISOString(),
  };
};

const stableStringify = (value) => JSON.stringify(value);

const normalizeSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;

  const normalized = {
    meta: snapshot.meta && typeof snapshot.meta === 'object' ? snapshot.meta : {},
    scenarios: snapshot.scenarios && typeof snapshot.scenarios === 'object' && !Array.isArray(snapshot.scenarios) ? snapshot.scenarios : {},
    shortcuts: snapshot.shortcuts && typeof snapshot.shortcuts === 'object' && !Array.isArray(snapshot.shortcuts) ? snapshot.shortcuts : {},
    bookmarkFolders: snapshot.bookmarkFolders && typeof snapshot.bookmarkFolders === 'object' && !Array.isArray(snapshot.bookmarkFolders) ? snapshot.bookmarkFolders : {},
    bookmarkItems: snapshot.bookmarkItems && typeof snapshot.bookmarkItems === 'object' && !Array.isArray(snapshot.bookmarkItems) ? snapshot.bookmarkItems : {},
    scenarioOrder: snapshot.scenarioOrder && typeof snapshot.scenarioOrder === 'object' ? snapshot.scenarioOrder : {
      type: 'scenario-order',
      ids: [],
      updatedAt: new Date(0).toISOString(),
      updatedBy: 'server',
      revision: 1,
    },
    shortcutOrders: snapshot.shortcutOrders && typeof snapshot.shortcutOrders === 'object' && !Array.isArray(snapshot.shortcutOrders) ? snapshot.shortcutOrders : {},
    bookmarkOrders: snapshot.bookmarkOrders && typeof snapshot.bookmarkOrders === 'object' && !Array.isArray(snapshot.bookmarkOrders) ? snapshot.bookmarkOrders : {},
    tombstones: snapshot.tombstones && typeof snapshot.tombstones === 'object' && !Array.isArray(snapshot.tombstones) ? snapshot.tombstones : {},
  };

  const generatedAt = typeof normalized.meta.generatedAt === 'string' && normalized.meta.generatedAt
    ? normalized.meta.generatedAt
    : new Date().toISOString();
  const deviceId = typeof normalized.meta.deviceId === 'string' && normalized.meta.deviceId
    ? normalized.meta.deviceId
    : 'unknown-device';

  normalized.meta = {
    version: LEAFTAB_SYNC_SCHEMA_VERSION,
    deviceId,
    generatedAt,
  };

  return normalized;
};

const summarizeSnapshot = (snapshot) => ({
  scenarios: Object.keys(snapshot?.scenarios || {}).length,
  shortcuts: Object.keys(snapshot?.shortcuts || {}).length,
  bookmarkFolders: Object.keys(snapshot?.bookmarkFolders || {}).length,
  bookmarkItems: Object.keys(snapshot?.bookmarkItems || {}).length,
  tombstones: Object.keys(snapshot?.tombstones || {}).length,
});

const normalizeSummary = (summary) => {
  const source = summary && typeof summary === 'object' && !Array.isArray(summary) ? summary : {};
  const normalizeCount = (value) => {
    const count = Number(value);
    if (!Number.isFinite(count) || count < 0) return 0;
    return Math.round(count);
  };
  return {
    scenarios: normalizeCount(source.scenarios),
    shortcuts: normalizeCount(source.shortcuts),
    bookmarkFolders: normalizeCount(source.bookmarkFolders),
    bookmarkItems: normalizeCount(source.bookmarkItems),
    tombstones: normalizeCount(source.tombstones),
  };
};

const buildCommit = ({ snapshot, summary, deviceId, parentCommitId, createdAt }) => {
  const effectiveCreatedAt = createdAt || new Date().toISOString();
  const resolvedSummary = snapshot
    ? summarizeSnapshot(snapshot)
    : normalizeSummary(summary);
  return {
    id: createLeafTabSyncCommitId(deviceId, effectiveCreatedAt),
    version: LEAFTAB_SYNC_SCHEMA_VERSION,
    deviceId,
    createdAt: effectiveCreatedAt,
    parentCommitId: parentCommitId || null,
    manifestPath: 'cloud://leaftab-sync/state',
    summary: resolvedSummary,
  };
};

const buildHead = (commitId, updatedAt) => ({
  version: LEAFTAB_SYNC_SCHEMA_VERSION,
  commitId,
  updatedAt: updatedAt || new Date().toISOString(),
});

const normalizeStateRow = (row) => {
  if (!row) {
    return {
      head: null,
      commit: null,
      snapshot: null,
      version: 0,
      updatedAt: null,
    };
  }

  const rawSnapshot = parseJsonOrNull(row.leaftab_sync_snapshot);
  const fileStore = normalizeFileStore(rawSnapshot);

  return {
    head: normalizeHead(parseJsonOrNull(row.leaftab_sync_head)),
    commit: normalizeCommit(parseJsonOrNull(row.leaftab_sync_commit)),
    snapshot: fileStore ? null : normalizeSnapshot(rawSnapshot),
    fileStore,
    version: Number.isFinite(Number(row.leaftab_sync_version)) ? Number(row.leaftab_sync_version) : 0,
    updatedAt: typeof row.leaftab_sync_updated_at === 'string' ? row.leaftab_sync_updated_at : null,
  };
};

const normalizeLockRow = (row) => {
  if (!row) return null;
  const deviceId = typeof row.leaftab_sync_lock_device_id === 'string' ? row.leaftab_sync_lock_device_id : '';
  const acquiredAt = typeof row.leaftab_sync_lock_acquired_at === 'string' ? row.leaftab_sync_lock_acquired_at : '';
  const expiresAt = typeof row.leaftab_sync_lock_expires_at === 'string' ? row.leaftab_sync_lock_expires_at : '';
  if (!deviceId || !expiresAt) return null;
  return {
    deviceId,
    acquiredAt: acquiredAt || null,
    expiresAt,
  };
};

const isLockActive = (lock, nowMs = Date.now()) => {
  if (!lock?.expiresAt) return false;
  const expiresAt = Date.parse(lock.expiresAt);
  if (!Number.isFinite(expiresAt)) return false;
  return expiresAt > nowMs;
};

const sameStateContent = (left, right) => stableStringify(left) === stableStringify(right);

module.exports = {
  LEAFTAB_SYNC_SCHEMA_VERSION,
  buildCommit,
  buildHead,
  isLockActive,
  normalizeLockRow,
  normalizeFileStore,
  normalizeCommit,
  normalizeHead,
  normalizeSnapshot,
  normalizeStateRow,
  normalizeSummary,
  sameStateContent,
};
