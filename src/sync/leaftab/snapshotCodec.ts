import type { LeafTabSyncFileMap } from './fileMap';
import type {
  LeafTabSyncCommitFile,
  LeafTabSyncHeadFile,
  LeafTabSyncManifestFile,
  LeafTabSyncSnapshot,
} from './schema';
import {
  getLeafTabSyncCommitPath,
  getLeafTabSyncHeadPath,
  isLeafTabSyncBookmarkFolderEntity,
  isLeafTabSyncBookmarkItemEntity,
  isLeafTabSyncScenarioEntity,
  isLeafTabSyncShortcutEntity,
  isLeafTabSyncTombstone,
  LEAFTAB_SYNC_DEFAULT_ROOT,
  LEAFTAB_SYNC_SCHEMA_VERSION,
} from './schema';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

export const normalizeLeafTabSyncRootPath = (rootPath?: string) => {
  return (rootPath || LEAFTAB_SYNC_DEFAULT_ROOT)
    .trim()
    .replace(/^\/+/, '')
    .replace(/\/+$/, '') || LEAFTAB_SYNC_DEFAULT_ROOT;
};

export const parseLeafTabSyncJsonLike = <T>(value: unknown): T | null => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  if (value !== null && typeof value !== 'undefined') {
    return value as T;
  }

  return null;
};

export const materializeLeafTabSyncSnapshotFromFiles = (
  files: LeafTabSyncFileMap,
  rootPath: string,
): LeafTabSyncSnapshot | null => {
  const normalizedRootPath = normalizeLeafTabSyncRootPath(rootPath);
  const head = parseLeafTabSyncJsonLike<LeafTabSyncHeadFile>(files[getLeafTabSyncHeadPath(normalizedRootPath)]);
  if (!head?.commitId) return null;

  const commit = parseLeafTabSyncJsonLike<LeafTabSyncCommitFile>(
    files[getLeafTabSyncCommitPath(head.commitId, normalizedRootPath)],
  );
  if (!commit?.manifestPath) return null;

  return materializeLeafTabSyncSnapshotFromPayloadMap(files, commit);
};

export const materializeLeafTabSyncSnapshotFromPayloadMap = (
  payloadMap: Record<string, unknown>,
  commit: Pick<LeafTabSyncCommitFile, 'manifestPath' | 'createdAt' | 'deviceId'>,
): LeafTabSyncSnapshot | null => {
  const manifest = parseLeafTabSyncJsonLike<LeafTabSyncManifestFile>(payloadMap[commit.manifestPath]);
  if (!manifest?.packs?.length) return null;

  const scenarios: LeafTabSyncSnapshot['scenarios'] = {};
  const shortcuts: LeafTabSyncSnapshot['shortcuts'] = {};
  const bookmarkFolders: LeafTabSyncSnapshot['bookmarkFolders'] = {};
  const bookmarkItems: LeafTabSyncSnapshot['bookmarkItems'] = {};
  const shortcutOrders: LeafTabSyncSnapshot['shortcutOrders'] = {};
  const bookmarkOrders: LeafTabSyncSnapshot['bookmarkOrders'] = {};
  const tombstones: LeafTabSyncSnapshot['tombstones'] = {};
  let scenarioOrder: LeafTabSyncSnapshot['scenarioOrder'] = {
    type: 'scenario-order',
    ids: [],
    updatedAt: commit.createdAt,
    updatedBy: commit.deviceId,
    revision: 1,
  };

  manifest.packs.forEach((packRef) => {
    const value = parseLeafTabSyncJsonLike<unknown>(payloadMap[packRef.path]);
    if (!isRecord(value)) return;

    if (packRef.kind === 'scenarios') {
      Object.values(isRecord(value.entities) ? value.entities : {}).forEach((entity) => {
        if (isLeafTabSyncScenarioEntity(entity)) {
          scenarios[entity.id] = entity;
        }
      });
      if (isRecord(value.order) && (value.order as { type?: unknown }).type === 'scenario-order') {
        scenarioOrder = value.order as unknown as LeafTabSyncSnapshot['scenarioOrder'];
      }
      return;
    }

    if (packRef.kind === 'shortcuts') {
      Object.values(isRecord(value.entities) ? value.entities : {}).forEach((entity) => {
        if (isLeafTabSyncShortcutEntity(entity)) {
          shortcuts[entity.id] = entity;
        }
      });
      return;
    }

    if (packRef.kind === 'shortcut-orders') {
      Object.values(isRecord(value.orders) ? value.orders : {}).forEach((order) => {
        if (isRecord(order) && (order as { type?: unknown }).type === 'shortcut-order') {
          const typedOrder = order as unknown as LeafTabSyncSnapshot['shortcutOrders'][string];
          shortcutOrders[typedOrder.scenarioId] = typedOrder;
        }
      });
      return;
    }

    if (packRef.kind === 'bookmark-folders') {
      Object.values(isRecord(value.entities) ? value.entities : {}).forEach((entity) => {
        if (isLeafTabSyncBookmarkFolderEntity(entity)) {
          bookmarkFolders[entity.id] = entity;
        }
      });
      return;
    }

    if (packRef.kind === 'bookmark-items') {
      Object.values(isRecord(value.entities) ? value.entities : {}).forEach((entity) => {
        if (isLeafTabSyncBookmarkItemEntity(entity)) {
          bookmarkItems[entity.id] = entity;
        }
      });
      return;
    }

    if (packRef.kind === 'bookmark-orders') {
      Object.values(isRecord(value.orders) ? value.orders : {}).forEach((order) => {
        if (isRecord(order) && (order as { type?: unknown }).type === 'bookmark-order') {
          const typedOrder = order as unknown as LeafTabSyncSnapshot['bookmarkOrders'][string];
          bookmarkOrders[typedOrder.parentId || '__root__'] = typedOrder;
        }
      });
      return;
    }

    if (packRef.kind === 'tombstones') {
      Object.values(isRecord(value.entities) ? value.entities : {}).forEach((entry) => {
        if (isLeafTabSyncTombstone(entry)) {
          tombstones[entry.id] = entry;
        }
      });
    }
  });

  return {
    meta: {
      version: LEAFTAB_SYNC_SCHEMA_VERSION,
      deviceId: commit.deviceId,
      generatedAt: manifest.generatedAt || commit.createdAt,
    },
    scenarios,
    shortcuts,
    bookmarkFolders,
    bookmarkItems,
    scenarioOrder,
    shortcutOrders,
    bookmarkOrders,
    tombstones,
  };
};
