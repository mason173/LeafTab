import { parseLeafTabBackup, type WebdavPayload } from '@/utils/backupData';
import type { LeafTabBookmarkSyncScope } from './bookmarkScope';
import { createLeafTabSyncSerializedSnapshot, type LeafTabSyncFileMap } from './fileMap';
import {
  materializeLeafTabSyncSnapshotFromFiles,
  normalizeLeafTabSyncRootPath,
} from './snapshotCodec';
import type {
  LeafTabSyncSnapshot,
  LeafTabSyncTombstone,
} from './schema';
import { LEAFTAB_SYNC_SCHEMA_VERSION } from './schema';

export const LEAFTAB_LOCAL_BACKUP_BUNDLE_TYPE = 'leaftab_engine_bundle';
export const LEAFTAB_LOCAL_BACKUP_BUNDLE_VERSION = 1 as const;

export interface LeafTabLocalBackupExportScope {
  shortcuts: boolean;
  bookmarks: boolean;
}

const FULL_EXPORT_SCOPE: LeafTabLocalBackupExportScope = {
  shortcuts: true,
  bookmarks: true,
};

export interface LeafTabLocalBackupBundle {
  type: typeof LEAFTAB_LOCAL_BACKUP_BUNDLE_TYPE;
  version: typeof LEAFTAB_LOCAL_BACKUP_BUNDLE_VERSION;
  exportedAt: string;
  meta?: {
    appVersion?: string;
    deviceId?: string;
    selectedScenarioId?: string;
    bookmarkScope?: LeafTabBookmarkSyncScope | null;
    exportScope?: LeafTabLocalBackupExportScope;
  };
  engine: {
    schemaVersion: number;
    rootPath: string;
    files: LeafTabSyncFileMap;
  };
}

export type LeafTabLocalBackupImportData =
  | {
      kind: 'engine-bundle';
      bundle: LeafTabLocalBackupBundle;
      snapshot: LeafTabSyncSnapshot;
      selectedScenarioId: string;
      bookmarkScope: LeafTabBookmarkSyncScope | null;
      exportScope: LeafTabLocalBackupExportScope;
    }
  | {
      kind: 'legacy-backup';
      payload: WebdavPayload;
      exportScope: LeafTabLocalBackupExportScope;
    };

const normalizeRootPath = normalizeLeafTabSyncRootPath;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const getSelectedScenarioIdFromSnapshot = (snapshot: LeafTabSyncSnapshot) => {
  const orderedId = snapshot.scenarioOrder.ids.find((id) => Boolean(snapshot.scenarios[id]));
  return orderedId || Object.keys(snapshot.scenarios).sort()[0] || '';
};

const normalizeExportScope = (scope?: Partial<LeafTabLocalBackupExportScope> | null): LeafTabLocalBackupExportScope => {
  return {
    shortcuts: scope?.shortcuts !== false,
    bookmarks: scope?.bookmarks !== false,
  };
};

export const getLeafTabLocalBackupAvailableScope = (
  data: LeafTabLocalBackupImportData,
): LeafTabLocalBackupExportScope => {
  return normalizeExportScope(data.exportScope);
};

export const restrictLeafTabLocalBackupImportScope = (
  data: LeafTabLocalBackupImportData,
  scopeInput?: Partial<LeafTabLocalBackupExportScope> | null,
): LeafTabLocalBackupImportData => {
  const availableScope = getLeafTabLocalBackupAvailableScope(data);
  const requestedScope = normalizeExportScope(scopeInput);
  const nextScope: LeafTabLocalBackupExportScope = {
    shortcuts: availableScope.shortcuts && requestedScope.shortcuts,
    bookmarks: availableScope.bookmarks && requestedScope.bookmarks,
  };

  if (data.kind === 'legacy-backup') {
    return {
      ...data,
      exportScope: nextScope,
    };
  }

  const nextSnapshot = filterLeafTabLocalBackupSnapshot(data.snapshot, nextScope);
  return {
    ...data,
    snapshot: nextSnapshot,
    selectedScenarioId: nextScope.shortcuts ? data.selectedScenarioId : '',
    exportScope: nextScope,
    bundle: {
      ...data.bundle,
      meta: {
        ...data.bundle.meta,
        selectedScenarioId: nextScope.shortcuts ? data.selectedScenarioId : '',
        exportScope: nextScope,
      },
    },
  };
};

const pickTombstonesByScope = (
  tombstones: Record<string, LeafTabSyncTombstone>,
  scope: LeafTabLocalBackupExportScope,
) => {
  return Object.fromEntries(
    Object.entries(tombstones).filter(([, tombstone]) => {
      if (tombstone.type === 'scenario' || tombstone.type === 'shortcut') {
        return scope.shortcuts;
      }
      if (tombstone.type === 'bookmark-folder' || tombstone.type === 'bookmark-item') {
        return scope.bookmarks;
      }
      return false;
    }),
  );
};

export const filterLeafTabLocalBackupSnapshot = (
  snapshot: LeafTabSyncSnapshot,
  scopeInput?: Partial<LeafTabLocalBackupExportScope> | null,
) => {
  const scope = normalizeExportScope(scopeInput);
  return {
    meta: snapshot.meta,
    preferences: snapshot.preferences,
    scenarios: scope.shortcuts ? snapshot.scenarios : {},
    shortcuts: scope.shortcuts ? snapshot.shortcuts : {},
    bookmarkFolders: scope.bookmarks ? snapshot.bookmarkFolders : {},
    bookmarkItems: scope.bookmarks ? snapshot.bookmarkItems : {},
    scenarioOrder: scope.shortcuts
      ? snapshot.scenarioOrder
      : {
          type: 'scenario-order',
          ids: [],
          updatedAt: snapshot.meta.generatedAt,
          updatedBy: snapshot.meta.deviceId,
          revision: 1,
        },
    shortcutOrders: scope.shortcuts ? snapshot.shortcutOrders : {},
    bookmarkOrders: scope.bookmarks
      ? snapshot.bookmarkOrders
      : {
          __root__: {
            type: 'bookmark-order',
            parentId: null,
            ids: [],
            updatedAt: snapshot.meta.generatedAt,
            updatedBy: snapshot.meta.deviceId,
            revision: 1,
          },
        },
    tombstones: pickTombstonesByScope(snapshot.tombstones, scope),
  } satisfies LeafTabSyncSnapshot;
};

export const mergeLeafTabLocalBackupSnapshotWithBase = (params: {
  baseSnapshot: LeafTabSyncSnapshot;
  importedSnapshot: LeafTabSyncSnapshot;
  exportScope?: Partial<LeafTabLocalBackupExportScope> | null;
}) => {
  const scope = normalizeExportScope(params.exportScope);
  return {
    meta: params.importedSnapshot.meta,
    preferences: params.importedSnapshot.preferences || params.baseSnapshot.preferences,
    scenarios: scope.shortcuts ? params.importedSnapshot.scenarios : params.baseSnapshot.scenarios,
    shortcuts: scope.shortcuts ? params.importedSnapshot.shortcuts : params.baseSnapshot.shortcuts,
    bookmarkFolders: scope.bookmarks ? params.importedSnapshot.bookmarkFolders : params.baseSnapshot.bookmarkFolders,
    bookmarkItems: scope.bookmarks ? params.importedSnapshot.bookmarkItems : params.baseSnapshot.bookmarkItems,
    scenarioOrder: scope.shortcuts ? params.importedSnapshot.scenarioOrder : params.baseSnapshot.scenarioOrder,
    shortcutOrders: scope.shortcuts ? params.importedSnapshot.shortcutOrders : params.baseSnapshot.shortcutOrders,
    bookmarkOrders: scope.bookmarks ? params.importedSnapshot.bookmarkOrders : params.baseSnapshot.bookmarkOrders,
    tombstones: {
      ...pickTombstonesByScope(params.baseSnapshot.tombstones, {
        shortcuts: !scope.shortcuts,
        bookmarks: !scope.bookmarks,
      }),
      ...pickTombstonesByScope(params.importedSnapshot.tombstones, scope),
    },
  } satisfies LeafTabSyncSnapshot;
};

export const createLeafTabLocalBackupBundle = (params: {
  snapshot: LeafTabSyncSnapshot;
  selectedScenarioId?: string | null;
  bookmarkScope?: LeafTabBookmarkSyncScope | null;
  exportScope?: Partial<LeafTabLocalBackupExportScope> | null;
  rootPath?: string;
  appVersion?: string;
  exportedAt?: string;
}): LeafTabLocalBackupBundle => {
  const rootPath = normalizeRootPath(params.rootPath);
  const exportScope = normalizeExportScope(params.exportScope);
  const exportSnapshot = filterLeafTabLocalBackupSnapshot(params.snapshot, exportScope);
  const serialized = createLeafTabSyncSerializedSnapshot(exportSnapshot, {
    rootPath,
  });

  return {
    type: LEAFTAB_LOCAL_BACKUP_BUNDLE_TYPE,
    version: LEAFTAB_LOCAL_BACKUP_BUNDLE_VERSION,
    exportedAt: params.exportedAt || new Date().toISOString(),
    meta: {
      appVersion: params.appVersion,
      deviceId: exportSnapshot.meta.deviceId,
      selectedScenarioId: exportScope.shortcuts
        ? (params.selectedScenarioId || getSelectedScenarioIdFromSnapshot(exportSnapshot))
        : '',
      bookmarkScope: params.bookmarkScope || null,
      exportScope,
    },
    engine: {
      schemaVersion: LEAFTAB_SYNC_SCHEMA_VERSION,
      rootPath,
      files: serialized.files,
    },
  };
};

export const parseLeafTabLocalBackupImport = (
  raw: unknown,
): LeafTabLocalBackupImportData | null => {
  if (isRecord(raw) && raw.type === LEAFTAB_LOCAL_BACKUP_BUNDLE_TYPE) {
    const bundle = raw as unknown as LeafTabLocalBackupBundle;
    if (!bundle.engine || !isRecord(bundle.engine.files)) {
      return null;
    }

    const rootPath = normalizeRootPath(bundle.engine.rootPath);
    const files = Object.fromEntries(
      Object.entries(bundle.engine.files).filter(([, value]) => typeof value === 'string'),
    ) as LeafTabSyncFileMap;
    const snapshot = materializeLeafTabSyncSnapshotFromFiles(files, rootPath);
    if (!snapshot) return null;

    const selectedScenarioId = typeof bundle.meta?.selectedScenarioId === 'string'
      ? bundle.meta.selectedScenarioId
      : getSelectedScenarioIdFromSnapshot(snapshot);
    const exportScope = normalizeExportScope(bundle.meta?.exportScope || FULL_EXPORT_SCOPE);

    return {
      kind: 'engine-bundle',
      bundle: {
        ...bundle,
        engine: {
          ...bundle.engine,
          rootPath,
          files,
        },
      },
      snapshot,
      selectedScenarioId,
      bookmarkScope: bundle.meta?.bookmarkScope || null,
      exportScope,
    };
  }

  const legacyPayload = parseLeafTabBackup(raw);
  if (!legacyPayload) return null;

  return {
    kind: 'legacy-backup',
    payload: legacyPayload,
    exportScope: {
      shortcuts: true,
      bookmarks: false,
    },
  };
};
