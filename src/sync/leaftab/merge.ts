import type {
  LeafTabSyncBookmarkFolderEntity,
  LeafTabSyncBookmarkItemEntity,
  LeafTabSyncBookmarkOrder,
  LeafTabSyncEntityType,
  LeafTabSyncPreferencesState,
  LeafTabSyncScenarioEntity,
  LeafTabSyncScenarioOrder,
  LeafTabSyncShortcutEntity,
  LeafTabSyncShortcutOrder,
  LeafTabSyncSnapshot,
  LeafTabSyncTombstone,
} from './schema';
import { LEAFTAB_SYNC_SCHEMA_VERSION } from './schema';
import type { SyncablePreferences } from '@/types';
import {
  getDefaultSyncablePreferences,
  normalizeSyncablePreferences,
} from '@/utils/syncablePreferences';

export type LeafTabSyncMergeSource = 'local' | 'remote' | 'merged' | 'tombstone';

export interface LeafTabSyncMergeConflict {
  id: string;
  type: LeafTabSyncEntityType;
  reason: 'type-mismatch';
}

export interface LeafTabSyncMergeResult {
  snapshot: LeafTabSyncSnapshot;
  entitySources: Record<string, LeafTabSyncMergeSource>;
  orderSources: Record<string, LeafTabSyncMergeSource>;
  conflicts: LeafTabSyncMergeConflict[];
}

type MergeableEntity =
  | LeafTabSyncScenarioEntity
  | LeafTabSyncShortcutEntity
  | LeafTabSyncBookmarkFolderEntity
  | LeafTabSyncBookmarkItemEntity;

const scenarioFields: Array<keyof LeafTabSyncScenarioEntity> = [
  'name',
  'color',
  'icon',
  'archived',
];

const shortcutFields: Array<keyof LeafTabSyncShortcutEntity> = [
  'scenarioId',
  'title',
  'url',
  'icon',
  'description',
  'useOfficialIcon',
  'autoUseOfficialIcon',
  'officialIconAvailableAtSave',
  'iconRendering',
  'iconColor',
];

const bookmarkFolderFields: Array<keyof LeafTabSyncBookmarkFolderEntity> = [
  'parentId',
  'title',
];

const bookmarkItemFields: Array<keyof LeafTabSyncBookmarkItemEntity> = [
  'parentId',
  'title',
  'url',
];

const toMs = (value: string | undefined | null) => {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const compareEntityFreshness = (
  left: Pick<MergeableEntity, 'revision' | 'updatedAt'> | null | undefined,
  right: Pick<MergeableEntity, 'revision' | 'updatedAt'> | null | undefined,
) => {
  const leftRevision = left?.revision || 0;
  const rightRevision = right?.revision || 0;
  if (leftRevision !== rightRevision) return leftRevision - rightRevision;
  return toMs(left?.updatedAt) - toMs(right?.updatedAt);
};

const compareTombstoneFreshness = (
  left: LeafTabSyncTombstone | null | undefined,
  right: LeafTabSyncTombstone | null | undefined,
) => {
  return toMs(left?.deletedAt) - toMs(right?.deletedAt);
};

const compareOrderFreshness = (
  left:
    | Pick<LeafTabSyncScenarioOrder, 'revision' | 'updatedAt'>
    | Pick<LeafTabSyncShortcutOrder, 'revision' | 'updatedAt'>
    | Pick<LeafTabSyncBookmarkOrder, 'revision' | 'updatedAt'>
    | null
    | undefined,
  right:
    | Pick<LeafTabSyncScenarioOrder, 'revision' | 'updatedAt'>
    | Pick<LeafTabSyncShortcutOrder, 'revision' | 'updatedAt'>
    | Pick<LeafTabSyncBookmarkOrder, 'revision' | 'updatedAt'>
    | null
    | undefined,
) => {
  const leftRevision = left?.revision || 0;
  const rightRevision = right?.revision || 0;
  if (leftRevision !== rightRevision) return leftRevision - rightRevision;
  return toMs(left?.updatedAt) - toMs(right?.updatedAt);
};

const cloneEntity = <T extends MergeableEntity>(entity: T): T => {
  return JSON.parse(JSON.stringify(entity)) as T;
};

const cloneTombstone = (tombstone: LeafTabSyncTombstone) => {
  return JSON.parse(JSON.stringify(tombstone)) as LeafTabSyncTombstone;
};

const clonePreferencesState = (preferences: LeafTabSyncPreferencesState) => {
  return JSON.parse(JSON.stringify(preferences)) as LeafTabSyncPreferencesState;
};

const cloneJsonValue = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T;
};

const resolvePreferredEntity = <T extends MergeableEntity>(
  local: T | null | undefined,
  remote: T | null | undefined,
) => {
  if (!local) return remote ? cloneEntity(remote) : null;
  if (!remote) return cloneEntity(local);
  return compareEntityFreshness(local, remote) >= 0
    ? cloneEntity(local)
    : cloneEntity(remote);
};

const resolvePreferredPreferences = (
  local: LeafTabSyncPreferencesState | null | undefined,
  remote: LeafTabSyncPreferencesState | null | undefined,
) => {
  if (!local) return remote ? clonePreferencesState(remote) : null;
  if (!remote) return clonePreferencesState(local);
  return compareOrderFreshness(local, remote) >= 0
    ? clonePreferencesState(local)
    : clonePreferencesState(remote);
};

const haveSamePreferenceValue = (left: unknown, right: unknown) => {
  return JSON.stringify(left) === JSON.stringify(right);
};

const mergePreferenceValues = (params: {
  base: SyncablePreferences;
  local: SyncablePreferences;
  remote: SyncablePreferences;
  preferLocal: boolean;
}) => {
  const defaults = getDefaultSyncablePreferences();
  const merged = cloneJsonValue(defaults);

  (Object.keys(defaults) as Array<keyof SyncablePreferences>).forEach((key) => {
    const baseValue = params.base[key];
    const localValue = params.local[key];
    const remoteValue = params.remote[key];
    const localChanged = !haveSamePreferenceValue(localValue, baseValue);
    const remoteChanged = !haveSamePreferenceValue(remoteValue, baseValue);

    if (localChanged && !remoteChanged) {
      merged[key] = cloneJsonValue(localValue);
      return;
    }
    if (!localChanged && remoteChanged) {
      merged[key] = cloneJsonValue(remoteValue);
      return;
    }
    if (!localChanged && !remoteChanged) {
      merged[key] = cloneJsonValue(localValue);
      return;
    }
    if (haveSamePreferenceValue(localValue, remoteValue)) {
      merged[key] = cloneJsonValue(localValue);
      return;
    }

    merged[key] = cloneJsonValue(params.preferLocal ? localValue : remoteValue);
  });

  return normalizeSyncablePreferences(merged);
};

const resolveMergedPreferences = (
  base: LeafTabSyncPreferencesState | null | undefined,
  local: LeafTabSyncPreferencesState | null | undefined,
  remote: LeafTabSyncPreferencesState | null | undefined,
  options: { deviceId: string; generatedAt: string },
): { state: LeafTabSyncPreferencesState | null; source: LeafTabSyncMergeSource } => {
  if (!local && !remote) {
    return { state: null, source: 'merged' };
  }
  if (!local) {
    return { state: remote ? clonePreferencesState(remote) : null, source: 'remote' };
  }
  if (!remote) {
    return { state: clonePreferencesState(local), source: 'local' };
  }
  if (!base) {
    const preferred = resolvePreferredPreferences(local, remote);
    return {
      state: preferred,
      source: compareOrderFreshness(local, remote) >= 0 ? 'local' : 'remote',
    };
  }

  const baseValue = normalizeSyncablePreferences(base.value);
  const localValue = normalizeSyncablePreferences(local.value);
  const remoteValue = normalizeSyncablePreferences(remote.value);
  const preferLocal = compareOrderFreshness(local, remote) >= 0;
  const mergedValue = mergePreferenceValues({
    base: baseValue,
    local: localValue,
    remote: remoteValue,
    preferLocal,
  });

  if (haveSamePreferenceValue(mergedValue, localValue)) {
    return { state: clonePreferencesState(local), source: 'local' };
  }
  if (haveSamePreferenceValue(mergedValue, remoteValue)) {
    return { state: clonePreferencesState(remote), source: 'remote' };
  }

  return {
    state: {
      revision: Math.max(base.revision || 0, local.revision || 0, remote.revision || 0) + 1,
      updatedAt: options.generatedAt,
      updatedBy: options.deviceId,
      value: mergedValue,
    },
    source: 'merged',
  };
};

const inferImplicitTombstone = (
  snapshot: LeafTabSyncSnapshot,
  entity: MergeableEntity | null | undefined,
): LeafTabSyncTombstone | null => {
  if (!entity) return null;
  const explicit = snapshot.tombstones[entity.id];
  if (explicit) return explicit;
  return {
    id: entity.id,
    type: entity.type,
    deletedAt: snapshot.meta.generatedAt,
    deletedBy: snapshot.meta.deviceId,
    lastKnownRevision: entity.revision,
  };
};

const mergeOrderedIds = (
  baseIds: string[],
  localIds: string[],
  remoteIds: string[],
  validIds?: Set<string>,
) => {
  const baseSet = new Set(baseIds);
  const localSet = new Set(localIds);
  const remoteSet = new Set(remoteIds);

  const remoteRemoved = new Set(baseIds.filter((id) => !remoteSet.has(id)));
  const localRemoved = new Set(baseIds.filter((id) => !localSet.has(id)));

  const merged = localIds.filter((id) => !remoteRemoved.has(id));
  const mergedSet = new Set(merged);

  remoteIds.forEach((id) => {
    if (!baseSet.has(id) && !mergedSet.has(id) && !localRemoved.has(id)) {
      merged.push(id);
      mergedSet.add(id);
    }
  });

  const filtered = validIds
    ? merged.filter((id) => validIds.has(id))
    : merged.slice();

  return Array.from(new Set(filtered));
};

const haveSameIdMembers = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
};

const appendMissingShortcutIds = (
  orderedIds: string[],
  scenarioId: string,
  nextShortcuts: Record<string, LeafTabSyncShortcutEntity>,
  candidateOrders: string[][],
) => {
  const nextIds = orderedIds.slice();
  const seen = new Set(nextIds);

  candidateOrders.forEach((candidateIds) => {
    candidateIds.forEach((shortcutId) => {
      const entity = nextShortcuts[shortcutId];
      if (!entity || entity.scenarioId !== scenarioId || seen.has(shortcutId)) return;
      nextIds.push(shortcutId);
      seen.add(shortcutId);
    });
  });

  Object.values(nextShortcuts)
    .filter((entity) => entity.scenarioId === scenarioId && !seen.has(entity.id))
    .sort((left, right) => {
      const createdAtDelta = toMs(left.createdAt) - toMs(right.createdAt);
      if (createdAtDelta !== 0) return createdAtDelta;
      return left.id.localeCompare(right.id);
    })
    .forEach((entity) => {
      nextIds.push(entity.id);
      seen.add(entity.id);
    });

  return nextIds;
};

const pruneOrphanedBookmarkEntities = (params: {
  bookmarkFolders: Record<string, LeafTabSyncBookmarkFolderEntity>;
  bookmarkItems: Record<string, LeafTabSyncBookmarkItemEntity>;
  tombstones: Record<string, LeafTabSyncTombstone>;
  entitySources: Record<string, LeafTabSyncMergeSource>;
  deviceId: string;
  generatedAt: string;
}) => {
  const reachableFolderIds = new Set<string>();
  const reachableItemIds = new Set<string>();
  const queue: string[] = Object.values(params.bookmarkFolders)
    .filter((folder) => folder.parentId === null)
    .map((folder) => folder.id);

  while (queue.length > 0) {
    const folderId = queue.shift();
    if (!folderId || reachableFolderIds.has(folderId)) continue;
    const folder = params.bookmarkFolders[folderId];
    if (!folder) continue;
    reachableFolderIds.add(folderId);

    Object.values(params.bookmarkFolders).forEach((childFolder) => {
      if (childFolder.parentId === folderId && !reachableFolderIds.has(childFolder.id)) {
        queue.push(childFolder.id);
      }
    });

    Object.values(params.bookmarkItems).forEach((item) => {
      if (item.parentId === folderId) {
        reachableItemIds.add(item.id);
      }
    });
  }

  Object.values(params.bookmarkFolders).forEach((folder) => {
    if (reachableFolderIds.has(folder.id)) return;
    delete params.bookmarkFolders[folder.id];
    params.tombstones[folder.id] = params.tombstones[folder.id] || {
      id: folder.id,
      type: 'bookmark-folder',
      deletedAt: params.generatedAt,
      deletedBy: params.deviceId,
      lastKnownRevision: folder.revision,
    };
    params.entitySources[folder.id] = 'tombstone';
  });

  Object.values(params.bookmarkItems).forEach((item) => {
    if (reachableItemIds.has(item.id)) return;
    delete params.bookmarkItems[item.id];
    params.tombstones[item.id] = params.tombstones[item.id] || {
      id: item.id,
      type: 'bookmark-item',
      deletedAt: params.generatedAt,
      deletedBy: params.deviceId,
      lastKnownRevision: item.revision,
    };
    params.entitySources[item.id] = 'tombstone';
  });
};

const mergeEntityFields = <T extends MergeableEntity>(
  entityType: T['type'],
  base: T | null | undefined,
  local: T | null | undefined,
  remote: T | null | undefined,
): { entity: T | null; source: LeafTabSyncMergeSource } => {
  if (!local && !remote) return { entity: null, source: 'merged' };
  if (!base) {
    if (!local) return { entity: remote ? cloneEntity(remote) : null, source: 'remote' };
    if (!remote) return { entity: cloneEntity(local), source: 'local' };
  }

  if (local && remote && local.type !== remote.type) {
    return {
      entity: resolvePreferredEntity(local, remote),
      source: compareEntityFreshness(local, remote) >= 0 ? 'local' : 'remote',
    };
  }

  const preferred = resolvePreferredEntity(local, remote);
  if (!preferred) {
    return { entity: null, source: 'merged' };
  }

  const fields = entityType === 'scenario'
    ? scenarioFields
    : entityType === 'bookmark-folder'
      ? bookmarkFolderFields
      : entityType === 'bookmark-item'
        ? bookmarkItemFields
          : shortcutFields;
  const preferredRecord = preferred as unknown as Record<string, unknown>;
  const baseRecord = (base || null) as unknown as Record<string, unknown> | null;
  const localRecord = (local || null) as unknown as Record<string, unknown> | null;
  const remoteRecord = (remote || null) as unknown as Record<string, unknown> | null;
  let merged = false;

  for (const field of fields as string[]) {
    const baseValue = baseRecord?.[field];
    const localValue = localRecord?.[field];
    const remoteValue = remoteRecord?.[field];

    const localChanged = !base || localValue !== baseValue;
    const remoteChanged = !base || remoteValue !== baseValue;

    if (localChanged && !remoteChanged && typeof localValue !== 'undefined') {
      preferredRecord[field] = localValue;
      continue;
    }
    if (!localChanged && remoteChanged && typeof remoteValue !== 'undefined') {
      preferredRecord[field] = remoteValue;
      continue;
    }
    if (localChanged && remoteChanged) {
      if (localValue === remoteValue) {
        preferredRecord[field] = localValue;
        continue;
      }
      const useLocal = compareEntityFreshness(local || null, remote || null) >= 0;
      preferredRecord[field] = useLocal ? localValue : remoteValue;
      merged = true;
    }
  }

  preferred.createdAt = [base?.createdAt, local?.createdAt, remote?.createdAt]
    .filter(Boolean)
    .sort()[0] || preferred.createdAt;
  preferred.updatedAt = [base?.updatedAt, local?.updatedAt, remote?.updatedAt]
    .filter(Boolean)
    .sort()
    .at(-1) || preferred.updatedAt;

  const maxRevision = Math.max(base?.revision || 0, local?.revision || 0, remote?.revision || 0);
  preferred.revision = merged ? maxRevision + 1 : maxRevision || 1;
  preferred.updatedBy = compareEntityFreshness(local || null, remote || null) >= 0
    ? (local?.updatedBy || preferred.updatedBy)
    : (remote?.updatedBy || preferred.updatedBy);

  if (local && remote) {
    const localJson = JSON.stringify(local);
    const remoteJson = JSON.stringify(remote);
    if (localJson === remoteJson) {
      return { entity: cloneEntity(local), source: 'local' };
    }
  }
  if (local && JSON.stringify(preferred) === JSON.stringify(local)) {
    return { entity: preferred, source: 'local' };
  }
  if (remote && JSON.stringify(preferred) === JSON.stringify(remote)) {
    return { entity: preferred, source: 'remote' };
  }
  return { entity: preferred, source: merged ? 'merged' : 'local' };
};

const resolveEntityState = <T extends MergeableEntity>(params: {
  baseSnapshot: LeafTabSyncSnapshot;
  localSnapshot: LeafTabSyncSnapshot;
  remoteSnapshot: LeafTabSyncSnapshot;
  baseEntity: T | null | undefined;
  localEntity: T | null | undefined;
  remoteEntity: T | null | undefined;
  entityType: T['type'];
}): {
  entity: T | null;
  tombstone: LeafTabSyncTombstone | null;
  source: LeafTabSyncMergeSource;
  conflict: LeafTabSyncMergeConflict | null;
} => {
  const baseId = params.baseEntity?.id || params.localEntity?.id || params.remoteEntity?.id || '';
  const explicitLocalTomb = baseId
    ? params.localSnapshot.tombstones[baseId]
    : null;
  const explicitRemoteTomb = baseId
    ? params.remoteSnapshot.tombstones[baseId]
    : null;
  const localTomb =
    explicitLocalTomb ||
    (params.baseEntity && !params.localEntity
      ? inferImplicitTombstone(params.localSnapshot, params.baseEntity)
      : null);
  const remoteTomb =
    explicitRemoteTomb ||
    (params.baseEntity && !params.remoteEntity
      ? inferImplicitTombstone(params.remoteSnapshot, params.baseEntity)
      : null);

  const latestTomb =
    compareTombstoneFreshness(localTomb, remoteTomb) >= 0
      ? localTomb
      : remoteTomb;

  let conflict: LeafTabSyncMergeConflict | null = null;
  if (
    params.localEntity &&
    params.remoteEntity &&
    params.localEntity.type !== params.remoteEntity.type
  ) {
    conflict = {
      id: baseId,
      type: params.entityType,
      reason: 'type-mismatch',
    };
  }

  const mergedEntity = mergeEntityFields(
    params.entityType,
    params.baseEntity || null,
    params.localEntity || null,
    params.remoteEntity || null,
  );

  if (latestTomb && (!mergedEntity.entity || toMs(latestTomb.deletedAt) >= toMs(mergedEntity.entity.updatedAt))) {
    return {
      entity: null,
      tombstone: cloneTombstone(latestTomb),
      source: 'tombstone',
      conflict,
    };
  }

  return {
    entity: mergedEntity.entity,
    tombstone: null,
    source: mergedEntity.source,
    conflict,
  };
};

export const mergeLeafTabSyncSnapshot = (
  baseSnapshot: LeafTabSyncSnapshot,
  localSnapshot: LeafTabSyncSnapshot,
  remoteSnapshot: LeafTabSyncSnapshot,
  options?: { deviceId?: string; generatedAt?: string },
): LeafTabSyncMergeResult => {
  const generatedAt = options?.generatedAt || new Date().toISOString();
  const deviceId = options?.deviceId || localSnapshot.meta.deviceId;

  const nextScenarios: Record<string, LeafTabSyncScenarioEntity> = {};
  const nextShortcuts: Record<string, LeafTabSyncShortcutEntity> = {};
  const nextBookmarkFolders: Record<string, LeafTabSyncBookmarkFolderEntity> = {};
  const nextBookmarkItems: Record<string, LeafTabSyncBookmarkItemEntity> = {};
  const nextTombstones: Record<string, LeafTabSyncTombstone> = {};
  const entitySources: Record<string, LeafTabSyncMergeSource> = {};
  const conflicts: LeafTabSyncMergeConflict[] = [];
  const mergedPreferences = resolveMergedPreferences(
    baseSnapshot.preferences,
    localSnapshot.preferences,
    remoteSnapshot.preferences,
    {
      deviceId,
      generatedAt,
    },
  );
  const nextPreferences = mergedPreferences.state;

  const scenarioIds = new Set([
    ...Object.keys(baseSnapshot.scenarios),
    ...Object.keys(localSnapshot.scenarios),
    ...Object.keys(remoteSnapshot.scenarios),
    ...Object.values(baseSnapshot.tombstones)
      .filter((entry) => entry.type === 'scenario')
      .map((entry) => entry.id),
    ...Object.values(localSnapshot.tombstones)
      .filter((entry) => entry.type === 'scenario')
      .map((entry) => entry.id),
    ...Object.values(remoteSnapshot.tombstones)
      .filter((entry) => entry.type === 'scenario')
      .map((entry) => entry.id),
  ]);

  scenarioIds.forEach((id) => {
    const resolution = resolveEntityState({
      baseSnapshot,
      localSnapshot,
      remoteSnapshot,
      baseEntity: baseSnapshot.scenarios[id],
      localEntity: localSnapshot.scenarios[id],
      remoteEntity: remoteSnapshot.scenarios[id],
      entityType: 'scenario',
    });
    if (resolution.entity) {
      nextScenarios[id] = resolution.entity;
    }
    if (resolution.tombstone) {
      nextTombstones[id] = resolution.tombstone;
    }
    if (resolution.conflict) {
      conflicts.push(resolution.conflict);
    }
    entitySources[id] = resolution.source;
  });

  const shortcutIds = new Set([
    ...Object.keys(baseSnapshot.shortcuts),
    ...Object.keys(localSnapshot.shortcuts),
    ...Object.keys(remoteSnapshot.shortcuts),
    ...Object.values(baseSnapshot.tombstones)
      .filter((entry) => entry.type === 'shortcut')
      .map((entry) => entry.id),
    ...Object.values(localSnapshot.tombstones)
      .filter((entry) => entry.type === 'shortcut')
      .map((entry) => entry.id),
    ...Object.values(remoteSnapshot.tombstones)
      .filter((entry) => entry.type === 'shortcut')
      .map((entry) => entry.id),
  ]);

  shortcutIds.forEach((id) => {
    const resolution = resolveEntityState({
      baseSnapshot,
      localSnapshot,
      remoteSnapshot,
      baseEntity: baseSnapshot.shortcuts[id],
      localEntity: localSnapshot.shortcuts[id],
      remoteEntity: remoteSnapshot.shortcuts[id],
      entityType: 'shortcut',
    });
    if (resolution.entity) {
      nextShortcuts[id] = resolution.entity;
    }
    if (resolution.tombstone) {
      nextTombstones[id] = resolution.tombstone;
    }
    if (resolution.conflict) {
      conflicts.push(resolution.conflict);
    }
    entitySources[id] = resolution.source;
  });

  const bookmarkFolderIds = new Set([
    ...Object.keys(baseSnapshot.bookmarkFolders),
    ...Object.keys(localSnapshot.bookmarkFolders),
    ...Object.keys(remoteSnapshot.bookmarkFolders),
    ...Object.values(baseSnapshot.tombstones)
      .filter((entry) => entry.type === 'bookmark-folder')
      .map((entry) => entry.id),
    ...Object.values(localSnapshot.tombstones)
      .filter((entry) => entry.type === 'bookmark-folder')
      .map((entry) => entry.id),
    ...Object.values(remoteSnapshot.tombstones)
      .filter((entry) => entry.type === 'bookmark-folder')
      .map((entry) => entry.id),
  ]);

  bookmarkFolderIds.forEach((id) => {
    const resolution = resolveEntityState({
      baseSnapshot,
      localSnapshot,
      remoteSnapshot,
      baseEntity: baseSnapshot.bookmarkFolders[id],
      localEntity: localSnapshot.bookmarkFolders[id],
      remoteEntity: remoteSnapshot.bookmarkFolders[id],
      entityType: 'bookmark-folder',
    });
    if (resolution.entity) {
      nextBookmarkFolders[id] = resolution.entity;
    }
    if (resolution.tombstone) {
      nextTombstones[id] = resolution.tombstone;
    }
    if (resolution.conflict) {
      conflicts.push(resolution.conflict);
    }
    entitySources[id] = resolution.source;
  });

  const bookmarkItemIds = new Set([
    ...Object.keys(baseSnapshot.bookmarkItems),
    ...Object.keys(localSnapshot.bookmarkItems),
    ...Object.keys(remoteSnapshot.bookmarkItems),
    ...Object.values(baseSnapshot.tombstones)
      .filter((entry) => entry.type === 'bookmark-item')
      .map((entry) => entry.id),
    ...Object.values(localSnapshot.tombstones)
      .filter((entry) => entry.type === 'bookmark-item')
      .map((entry) => entry.id),
    ...Object.values(remoteSnapshot.tombstones)
      .filter((entry) => entry.type === 'bookmark-item')
      .map((entry) => entry.id),
  ]);

  bookmarkItemIds.forEach((id) => {
    const resolution = resolveEntityState({
      baseSnapshot,
      localSnapshot,
      remoteSnapshot,
      baseEntity: baseSnapshot.bookmarkItems[id],
      localEntity: localSnapshot.bookmarkItems[id],
      remoteEntity: remoteSnapshot.bookmarkItems[id],
      entityType: 'bookmark-item',
    });
    if (resolution.entity) {
      nextBookmarkItems[id] = resolution.entity;
    }
    if (resolution.tombstone) {
      nextTombstones[id] = resolution.tombstone;
    }
    if (resolution.conflict) {
      conflicts.push(resolution.conflict);
    }
    entitySources[id] = resolution.source;
  });

  pruneOrphanedBookmarkEntities({
    bookmarkFolders: nextBookmarkFolders,
    bookmarkItems: nextBookmarkItems,
    tombstones: nextTombstones,
    entitySources,
    deviceId,
    generatedAt,
  });

  const validScenarioIds = new Set(Object.keys(nextScenarios));
  const validShortcutIds = new Set(Object.keys(nextShortcuts));
  const validBookmarkFolderIds = new Set(Object.keys(nextBookmarkFolders));
  const validBookmarkItemIds = new Set(Object.keys(nextBookmarkItems));
  const validBookmarkEntityIds = new Set([
    ...Object.keys(nextBookmarkFolders),
    ...Object.keys(nextBookmarkItems),
  ]);

  const mergedScenarioOrderIds = mergeOrderedIds(
    baseSnapshot.scenarioOrder.ids,
    localSnapshot.scenarioOrder.ids,
    remoteSnapshot.scenarioOrder.ids,
    validScenarioIds,
  );

  const scenarioOrderSource: LeafTabSyncMergeSource =
    JSON.stringify(mergedScenarioOrderIds) === JSON.stringify(localSnapshot.scenarioOrder.ids)
      ? 'local'
      : JSON.stringify(mergedScenarioOrderIds) === JSON.stringify(remoteSnapshot.scenarioOrder.ids)
        ? 'remote'
        : 'merged';

  const scenarioOrder: LeafTabSyncScenarioOrder = {
    type: 'scenario-order',
    ids: mergedScenarioOrderIds,
    updatedAt: generatedAt,
    updatedBy: deviceId,
    revision: Math.max(
      baseSnapshot.scenarioOrder.revision || 0,
      localSnapshot.scenarioOrder.revision || 0,
      remoteSnapshot.scenarioOrder.revision || 0,
    ) + (scenarioOrderSource === 'merged' ? 1 : 0),
  };

  const orderSources: Record<string, LeafTabSyncMergeSource> = {
    preferences: mergedPreferences.source,
    scenarios: scenarioOrderSource,
  };

  const allScenarioIdsForOrders = new Set([
    ...Object.keys(localSnapshot.shortcutOrders),
    ...Object.keys(remoteSnapshot.shortcutOrders),
    ...Object.keys(baseSnapshot.shortcutOrders),
    ...Object.keys(nextScenarios),
  ]);

  const shortcutOrders: Record<string, LeafTabSyncShortcutOrder> = {};
  allScenarioIdsForOrders.forEach((scenarioId) => {
    const baseOrder = baseSnapshot.shortcutOrders[scenarioId]?.ids || [];
    const localOrder = localSnapshot.shortcutOrders[scenarioId]?.ids || [];
    const remoteOrder = remoteSnapshot.shortcutOrders[scenarioId]?.ids || [];
    const localFilteredIds = localOrder.filter(
      (shortcutId) => nextShortcuts[shortcutId]?.scenarioId === scenarioId,
    );
    const remoteFilteredIds = remoteOrder.filter(
      (shortcutId) => nextShortcuts[shortcutId]?.scenarioId === scenarioId,
    );
    const baseFilteredIds = baseOrder.filter(
      (shortcutId) => nextShortcuts[shortcutId]?.scenarioId === scenarioId,
    );

    let filteredIds: string[];
    let source: LeafTabSyncMergeSource;

    if (
      haveSameIdMembers(localFilteredIds, remoteFilteredIds) &&
      JSON.stringify(localFilteredIds) !== JSON.stringify(remoteFilteredIds)
    ) {
      const preferLocal = compareOrderFreshness(
        localSnapshot.shortcutOrders[scenarioId],
        remoteSnapshot.shortcutOrders[scenarioId],
      ) >= 0;
      filteredIds = appendMissingShortcutIds(
        preferLocal ? localFilteredIds : remoteFilteredIds,
        scenarioId,
        nextShortcuts,
        preferLocal
          ? [localFilteredIds, remoteFilteredIds, baseFilteredIds]
          : [remoteFilteredIds, localFilteredIds, baseFilteredIds],
      );
      source = preferLocal ? 'local' : 'remote';
    } else {
      const mergedIds = mergeOrderedIds(baseOrder, localOrder, remoteOrder, validShortcutIds);
      filteredIds = appendMissingShortcutIds(
        mergedIds.filter((shortcutId) => nextShortcuts[shortcutId]?.scenarioId === scenarioId),
        scenarioId,
        nextShortcuts,
        [
          localFilteredIds,
          remoteFilteredIds,
          baseFilteredIds,
        ],
      );

      source =
        JSON.stringify(filteredIds) === JSON.stringify(localFilteredIds)
          ? 'local'
          : JSON.stringify(filteredIds) === JSON.stringify(remoteFilteredIds)
            ? 'remote'
            : 'merged';
    }

    if (!filteredIds.length && !nextScenarios[scenarioId]) {
      return;
    }

    shortcutOrders[scenarioId] = {
      type: 'shortcut-order',
      scenarioId,
      ids: filteredIds,
      updatedAt: generatedAt,
      updatedBy: deviceId,
      revision: Math.max(
        baseSnapshot.shortcutOrders[scenarioId]?.revision || 0,
        localSnapshot.shortcutOrders[scenarioId]?.revision || 0,
        remoteSnapshot.shortcutOrders[scenarioId]?.revision || 0,
      ) + (source === 'merged' ? 1 : 0),
    };
    orderSources[`scenario:${scenarioId}`] = source;
  });

  const allBookmarkParentIds = new Set([
    ...Object.keys(baseSnapshot.bookmarkOrders).map((key) => baseSnapshot.bookmarkOrders[key]?.parentId || '__root__'),
    ...Object.keys(localSnapshot.bookmarkOrders).map((key) => localSnapshot.bookmarkOrders[key]?.parentId || '__root__'),
    ...Object.keys(remoteSnapshot.bookmarkOrders).map((key) => remoteSnapshot.bookmarkOrders[key]?.parentId || '__root__'),
    '__root__',
    ...Object.keys(nextBookmarkFolders),
  ]);

  const bookmarkOrders: Record<string, LeafTabSyncBookmarkOrder> = {};
  allBookmarkParentIds.forEach((parentKey) => {
    const normalizedParentId = parentKey === '__root__' ? null : parentKey;
    const baseOrder = baseSnapshot.bookmarkOrders[parentKey]?.ids || [];
    const localOrder = localSnapshot.bookmarkOrders[parentKey]?.ids || [];
    const remoteOrder = remoteSnapshot.bookmarkOrders[parentKey]?.ids || [];
    const mergedIds = mergeOrderedIds(baseOrder, localOrder, remoteOrder, validBookmarkEntityIds);
    const filteredIds = mergedIds.filter((entityId) => {
      const folder = nextBookmarkFolders[entityId];
      if (folder) {
        return validBookmarkFolderIds.has(entityId) && folder.parentId === normalizedParentId;
      }
      const item = nextBookmarkItems[entityId];
      return Boolean(item && validBookmarkItemIds.has(entityId) && item.parentId === normalizedParentId);
    });

    if (!filteredIds.length && normalizedParentId && !nextBookmarkFolders[normalizedParentId]) {
      return;
    }

    const source: LeafTabSyncMergeSource =
      JSON.stringify(filteredIds) === JSON.stringify(localOrder.filter((id) => validBookmarkEntityIds.has(id)))
        ? 'local'
        : JSON.stringify(filteredIds) === JSON.stringify(remoteOrder.filter((id) => validBookmarkEntityIds.has(id)))
          ? 'remote'
          : 'merged';

    bookmarkOrders[parentKey] = {
      type: 'bookmark-order',
      parentId: normalizedParentId,
      ids: filteredIds,
      updatedAt: generatedAt,
      updatedBy: deviceId,
      revision: Math.max(
        baseSnapshot.bookmarkOrders[parentKey]?.revision || 0,
        localSnapshot.bookmarkOrders[parentKey]?.revision || 0,
        remoteSnapshot.bookmarkOrders[parentKey]?.revision || 0,
      ) + (source === 'merged' ? 1 : 0),
    };
    orderSources[`bookmark:${parentKey}`] = source;
  });

  return {
    snapshot: {
      meta: {
        version: LEAFTAB_SYNC_SCHEMA_VERSION,
        deviceId,
        generatedAt,
      },
      preferences: nextPreferences,
      scenarios: nextScenarios,
      shortcuts: nextShortcuts,
      bookmarkFolders: nextBookmarkFolders,
      bookmarkItems: nextBookmarkItems,
      scenarioOrder,
      shortcutOrders,
      bookmarkOrders,
      tombstones: nextTombstones,
    },
    entitySources,
    orderSources,
    conflicts,
  };
};
