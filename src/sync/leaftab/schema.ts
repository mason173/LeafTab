import type { LeafTabSyncEncryptionMetadata } from '@/utils/leafTabSyncEncryption';
import type { Shortcut, ShortcutKind, ShortcutVisualMode, SyncablePreferences } from '@/types';
import { normalizeSyncablePreferences } from '@/utils/syncablePreferences';

export const LEAFTAB_SYNC_SCHEMA_VERSION = 2 as const;
export const LEAFTAB_SYNC_DEFAULT_ROOT = 'leaftab/v1';
export const LEAFTAB_SYNC_SHORTCUT_PACK_SHARDS = 4;
export const LEAFTAB_SYNC_BOOKMARK_FOLDER_PACK_SHARDS = 4;
export const LEAFTAB_SYNC_BOOKMARK_ITEM_PACK_SHARDS = 16;
export const LEAFTAB_SYNC_TOMBSTONE_PACK_SHARDS = 8;

export type LeafTabSyncEntityType =
  | 'scenario'
  | 'shortcut'
  | 'bookmark-folder'
  | 'bookmark-item';
export type LeafTabSyncOrderType = 'scenario-order' | 'shortcut-order' | 'bookmark-order';

export interface LeafTabSyncSnapshotMeta {
  version: typeof LEAFTAB_SYNC_SCHEMA_VERSION;
  deviceId: string;
  generatedAt: string;
}

export interface LeafTabSyncBaseEntity {
  id: string;
  type: LeafTabSyncEntityType;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  revision: number;
}

export interface LeafTabSyncScenarioEntity extends LeafTabSyncBaseEntity {
  type: 'scenario';
  name: string;
  color: string;
  icon: string;
  archived: boolean;
}

export interface LeafTabSyncShortcutEntity extends LeafTabSyncBaseEntity {
  type: 'shortcut';
  scenarioId: string;
  title: string;
  url: string;
  icon: string;
  description: string;
  kind?: ShortcutKind;
  children?: Shortcut[];
  useOfficialIcon?: boolean;
  autoUseOfficialIcon?: boolean;
  officialIconAvailableAtSave?: boolean;
  iconRendering?: ShortcutVisualMode;
  iconColor?: string;
}

export interface LeafTabSyncBookmarkFolderEntity extends LeafTabSyncBaseEntity {
  type: 'bookmark-folder';
  parentId: string | null;
  title: string;
}

export interface LeafTabSyncBookmarkItemEntity extends LeafTabSyncBaseEntity {
  type: 'bookmark-item';
  parentId: string | null;
  title: string;
  url: string;
}

export type LeafTabSyncEntity =
  | LeafTabSyncScenarioEntity
  | LeafTabSyncShortcutEntity
  | LeafTabSyncBookmarkFolderEntity
  | LeafTabSyncBookmarkItemEntity;

export interface LeafTabSyncScenarioOrder {
  type: 'scenario-order';
  ids: string[];
  updatedAt: string;
  updatedBy: string;
  revision: number;
}

export interface LeafTabSyncShortcutOrder {
  type: 'shortcut-order';
  scenarioId: string;
  ids: string[];
  updatedAt: string;
  updatedBy: string;
  revision: number;
}

export interface LeafTabSyncBookmarkOrder {
  type: 'bookmark-order';
  parentId: string | null;
  ids: string[];
  updatedAt: string;
  updatedBy: string;
  revision: number;
}

export interface LeafTabSyncTombstone {
  id: string;
  type: LeafTabSyncEntityType;
  deletedAt: string;
  deletedBy: string;
  lastKnownRevision: number;
}

export interface LeafTabSyncHeadFile {
  version: typeof LEAFTAB_SYNC_SCHEMA_VERSION;
  commitId: string;
  updatedAt: string;
}

export interface LeafTabSyncPreferencesState {
  revision: number;
  updatedAt: string;
  updatedBy: string;
  value: SyncablePreferences;
}

export type LeafTabSyncPackKind =
  | 'preferences'
  | 'scenarios'
  | 'shortcuts'
  | 'shortcut-orders'
  | 'bookmark-folders'
  | 'bookmark-items'
  | 'bookmark-orders'
  | 'tombstones';

export interface LeafTabSyncManifestPackRef {
  kind: LeafTabSyncPackKind;
  path: string;
  shard: string | null;
  itemCount: number;
}

export interface LeafTabSyncManifestFile {
  version: typeof LEAFTAB_SYNC_SCHEMA_VERSION;
  commitId: string;
  deviceId: string;
  generatedAt: string;
  packs: LeafTabSyncManifestPackRef[];
}

export interface LeafTabSyncCommitFile {
  id: string;
  version: typeof LEAFTAB_SYNC_SCHEMA_VERSION;
  deviceId: string;
  createdAt: string;
  parentCommitId: string | null;
  manifestPath: string;
  encryption?: {
    mode: 'encrypted-sharded-v1';
    metadata: LeafTabSyncEncryptionMetadata;
  } | null;
  summary: {
    scenarios: number;
    shortcuts: number;
    bookmarkFolders: number;
    bookmarkItems: number;
    tombstones: number;
  };
}

export interface LeafTabSyncSnapshot {
  meta: LeafTabSyncSnapshotMeta;
  preferences?: LeafTabSyncPreferencesState | null;
  scenarios: Record<string, LeafTabSyncScenarioEntity>;
  shortcuts: Record<string, LeafTabSyncShortcutEntity>;
  bookmarkFolders: Record<string, LeafTabSyncBookmarkFolderEntity>;
  bookmarkItems: Record<string, LeafTabSyncBookmarkItemEntity>;
  scenarioOrder: LeafTabSyncScenarioOrder;
  shortcutOrders: Record<string, LeafTabSyncShortcutOrder>;
  bookmarkOrders: Record<string, LeafTabSyncBookmarkOrder>;
  tombstones: Record<string, LeafTabSyncTombstone>;
}

export interface LeafTabSyncBaselineFileEntry {
  sha: string | null;
  content: string;
}

export interface LeafTabSyncBaseline {
  commitId: string | null;
  files: Record<string, LeafTabSyncBaselineFileEntry>;
  snapshot?: LeafTabSyncSnapshot;
  savedAt: string;
}

const normalizeRoot = (rootPath = LEAFTAB_SYNC_DEFAULT_ROOT) => {
  return rootPath.replace(/^\/+/, '').replace(/\/+$/, '') || LEAFTAB_SYNC_DEFAULT_ROOT;
};

export const createLeafTabSyncDeviceId = () => {
  try {
    return crypto.randomUUID();
  } catch {
    return `dev_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
};

export const createLeafTabSyncCommitId = (
  deviceId: string,
  createdAt = new Date().toISOString(),
) => {
  const safeTimestamp = createdAt.replace(/[:.]/g, '-');
  const compactDeviceId = (deviceId || 'device').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `cmt_${safeTimestamp}_${compactDeviceId}`;
};

export const getLeafTabSyncHeadPath = (rootPath = LEAFTAB_SYNC_DEFAULT_ROOT) => {
  return `${normalizeRoot(rootPath)}/head.json`;
};

export const getLeafTabSyncLockPath = (rootPath = LEAFTAB_SYNC_DEFAULT_ROOT) => {
  return `${normalizeRoot(rootPath)}/sync.lock.json`;
};

export const getLeafTabSyncCommitPath = (
  commitId: string,
  rootPath = LEAFTAB_SYNC_DEFAULT_ROOT,
) => {
  return `${normalizeRoot(rootPath)}/commits/${commitId}.json`;
};

export const getLeafTabSyncManifestPath = (rootPath = LEAFTAB_SYNC_DEFAULT_ROOT) => {
  return `${normalizeRoot(rootPath)}/manifest.json`;
};

export const getLeafTabSyncPackPath = (
  kind: LeafTabSyncPackKind,
  shard: string | null = null,
  rootPath = LEAFTAB_SYNC_DEFAULT_ROOT,
) => {
  if (kind === 'preferences') {
    return `${normalizeRoot(rootPath)}/packs/preferences.pack.json`;
  }
  const shardSuffix = shard ? `-${shard}` : '';
  return `${normalizeRoot(rootPath)}/packs/${kind}${shardSuffix}.pack.json`;
};

export const createLeafTabSyncHeadFile = (
  commitId: string,
  updatedAt = new Date().toISOString(),
): LeafTabSyncHeadFile => ({
  version: LEAFTAB_SYNC_SCHEMA_VERSION,
  commitId,
  updatedAt,
});

export const createLeafTabSyncCommitFile = (params: {
  deviceId: string;
  createdAt?: string;
  parentCommitId?: string | null;
  snapshot: LeafTabSyncSnapshot;
  rootPath?: string;
}): LeafTabSyncCommitFile => {
  const createdAt = params.createdAt || new Date().toISOString();
  const id = createLeafTabSyncCommitId(params.deviceId, createdAt);
  return {
    id,
    version: LEAFTAB_SYNC_SCHEMA_VERSION,
    deviceId: params.deviceId,
    createdAt,
    parentCommitId: params.parentCommitId ?? null,
    manifestPath: getLeafTabSyncManifestPath(params.rootPath || LEAFTAB_SYNC_DEFAULT_ROOT),
    encryption: null,
    summary: {
      scenarios: Object.keys(params.snapshot.scenarios).length,
      shortcuts: Object.keys(params.snapshot.shortcuts).length,
      bookmarkFolders: Object.keys(params.snapshot.bookmarkFolders).length,
      bookmarkItems: Object.keys(params.snapshot.bookmarkItems).length,
      tombstones: Object.keys(params.snapshot.tombstones).length,
    },
  };
};

export const normalizeLeafTabSyncSnapshot = (
  snapshot: LeafTabSyncSnapshot | null | undefined,
): LeafTabSyncSnapshot | null => {
  if (!snapshot) return null;

  const generatedAt = snapshot.meta?.generatedAt || new Date(0).toISOString();
  const deviceId = snapshot.meta?.deviceId || 'unknown-device';
  const scenarios = snapshot.scenarios || {};

  return {
    meta: {
      version: LEAFTAB_SYNC_SCHEMA_VERSION,
      deviceId,
      generatedAt,
    },
    preferences: snapshot.preferences
      ? {
          revision: Number(snapshot.preferences.revision) > 0 ? Number(snapshot.preferences.revision) : 1,
          updatedAt: snapshot.preferences.updatedAt || generatedAt,
          updatedBy: snapshot.preferences.updatedBy || deviceId,
          value: normalizeSyncablePreferences(snapshot.preferences.value),
        }
      : null,
    scenarios,
    shortcuts: snapshot.shortcuts || {},
    bookmarkFolders: snapshot.bookmarkFolders || {},
    bookmarkItems: snapshot.bookmarkItems || {},
    scenarioOrder: snapshot.scenarioOrder || {
      type: 'scenario-order',
      ids: Object.keys(scenarios).sort(),
      updatedAt: generatedAt,
      updatedBy: deviceId,
      revision: 1,
    },
    shortcutOrders: snapshot.shortcutOrders || {},
    bookmarkOrders: snapshot.bookmarkOrders || {},
    tombstones: snapshot.tombstones || {},
  };
};

export const isLeafTabSyncScenarioEntity = (
  value: unknown,
): value is LeafTabSyncScenarioEntity => {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: unknown }).type === 'scenario' &&
      typeof (value as { id?: unknown }).id === 'string',
  );
};

export const isLeafTabSyncPreferencesState = (
  value: unknown,
): value is LeafTabSyncPreferencesState => {
  return Boolean(
    value
      && typeof value === 'object'
      && Number.isFinite((value as { revision?: unknown }).revision)
      && typeof (value as { updatedAt?: unknown }).updatedAt === 'string'
      && typeof (value as { updatedBy?: unknown }).updatedBy === 'string'
      && (value as { value?: unknown }).value
      && typeof (value as { value?: unknown }).value === 'object'
      && !Array.isArray((value as { value?: unknown }).value),
  );
};

export const isLeafTabSyncShortcutEntity = (
  value: unknown,
): value is LeafTabSyncShortcutEntity => {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: unknown }).type === 'shortcut' &&
      typeof (value as { id?: unknown }).id === 'string',
  );
};

export const isLeafTabSyncBookmarkFolderEntity = (
  value: unknown,
): value is LeafTabSyncBookmarkFolderEntity => {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: unknown }).type === 'bookmark-folder' &&
      typeof (value as { id?: unknown }).id === 'string',
  );
};

export const isLeafTabSyncBookmarkItemEntity = (
  value: unknown,
): value is LeafTabSyncBookmarkItemEntity => {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as { type?: unknown }).type === 'bookmark-item' &&
      typeof (value as { id?: unknown }).id === 'string',
  );
};

export const isLeafTabSyncTombstone = (
  value: unknown,
): value is LeafTabSyncTombstone => {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as { id?: unknown }).id === 'string' &&
      ((value as { type?: unknown }).type === 'scenario' ||
        (value as { type?: unknown }).type === 'shortcut' ||
        (value as { type?: unknown }).type === 'bookmark-folder' ||
        (value as { type?: unknown }).type === 'bookmark-item') &&
      typeof (value as { deletedAt?: unknown }).deletedAt === 'string',
  );
};
