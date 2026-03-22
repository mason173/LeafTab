import type { ScenarioMode } from '@/scenario/scenario';
import type { ScenarioShortcuts, Shortcut } from '@/types';
import { getShortcutIdentityKey } from '@/utils/shortcutIdentity';
import type { LeafTabBookmarkTreeDraft } from './bookmarks';
import type {
  LeafTabSyncBookmarkFolderEntity,
  LeafTabSyncBookmarkItemEntity,
  LeafTabSyncBookmarkOrder,
  LeafTabSyncScenarioEntity,
  LeafTabSyncScenarioOrder,
  LeafTabSyncShortcutEntity,
  LeafTabSyncShortcutOrder,
  LeafTabSyncSnapshot,
  LeafTabSyncTombstone,
} from './schema';
import { LEAFTAB_SYNC_SCHEMA_VERSION } from './schema';

type LeafTabEntityMetadata = {
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  revision: number;
};

type LeafTabOrderMetadata = {
  updatedAt: string;
  updatedBy: string;
  revision: number;
};

export interface LeafTabSnapshotBuildState {
  entities?: Record<string, LeafTabEntityMetadata>;
  tombstones?: Record<string, LeafTabSyncTombstone>;
  orders?: {
    scenarioOrder?: LeafTabOrderMetadata;
    shortcutOrders?: Record<string, LeafTabOrderMetadata>;
    bookmarkOrders?: Record<string, LeafTabOrderMetadata>;
  };
}

type ResolvedShortcutEntry = {
  scenarioId: string;
  shortcutId: string;
  shortcut: Shortcut;
};

type ResolvedBookmarkFolderEntry = {
  folderId: string;
  parentId: string | null;
  title: string;
};

type ResolvedBookmarkItemEntry = {
  bookmarkId: string;
  parentId: string | null;
  title: string;
  url: string;
};

const shortHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const slugify = (value: string) => {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'item';
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const createShortcutFallbackId = (
  shortcut: Shortcut,
  scenarioId: string,
  occurrence: number,
) => {
  const identity = getShortcutIdentityKey(shortcut) || `${shortcut.title}|${shortcut.url}`;
  const digest = shortHash(`${scenarioId}|${identity}|${occurrence}`);
  return `sht_${slugify(shortcut.title || 'shortcut')}_${digest}`;
};

const getEntityMetadata = (
  id: string,
  deviceId: string,
  timestamp: string,
  state?: LeafTabSnapshotBuildState,
): LeafTabEntityMetadata => {
  const fromState = state?.entities?.[id];
  if (fromState) return fromState;
  return {
    createdAt: timestamp,
    updatedAt: timestamp,
    updatedBy: deviceId,
    revision: 1,
  };
};

const getOrderMetadata = (
  metadata: LeafTabOrderMetadata | undefined,
  deviceId: string,
  timestamp: string,
): LeafTabOrderMetadata => {
  if (metadata) return metadata;
  return {
    updatedAt: timestamp,
    updatedBy: deviceId,
    revision: 1,
  };
};

const areArraysEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
};

const isSameScenarioValue = (
  mode: ScenarioMode,
  entity: LeafTabSyncScenarioEntity | undefined,
) => {
  if (!entity) return false;
  return (
    entity.name === mode.name &&
    entity.color === mode.color &&
    entity.icon === mode.icon &&
    entity.archived === false
  );
};

const isSameShortcutValue = (
  scenarioId: string,
  shortcut: Shortcut,
  entity: LeafTabSyncShortcutEntity | undefined,
) => {
  if (!entity) return false;
  return (
    entity.scenarioId === scenarioId &&
    entity.title === (shortcut.title || '') &&
    entity.url === (shortcut.url || '') &&
    entity.icon === (shortcut.icon || '') &&
    entity.description === ''
  );
};

const isSameBookmarkFolderValue = (
  folder: ResolvedBookmarkFolderEntry,
  entity: LeafTabSyncBookmarkFolderEntity | undefined,
) => {
  if (!entity) return false;
  return entity.parentId === folder.parentId && entity.title === folder.title;
};

const isSameBookmarkItemValue = (
  item: ResolvedBookmarkItemEntry,
  entity: LeafTabSyncBookmarkItemEntity | undefined,
) => {
  if (!entity) return false;
  return entity.parentId === item.parentId && entity.title === item.title && entity.url === item.url;
};

const createUpdatedEntityMetadata = (
  current: LeafTabEntityMetadata | undefined,
  deviceId: string,
  timestamp: string,
): LeafTabEntityMetadata => {
  if (!current) {
    return {
      createdAt: timestamp,
      updatedAt: timestamp,
      updatedBy: deviceId,
      revision: 1,
    };
  }
  return {
    createdAt: current.createdAt,
    updatedAt: timestamp,
    updatedBy: deviceId,
    revision: current.revision + 1,
  };
};

const createUpdatedOrderMetadata = (
  current: LeafTabOrderMetadata | undefined,
  deviceId: string,
  timestamp: string,
): LeafTabOrderMetadata => {
  if (!current) {
    return {
      updatedAt: timestamp,
      updatedBy: deviceId,
      revision: 1,
    };
  }
  return {
    updatedAt: timestamp,
    updatedBy: deviceId,
    revision: current.revision + 1,
  };
};

const createTombstone = (
  entity: Pick<
    LeafTabSyncScenarioEntity
    | LeafTabSyncShortcutEntity
    | LeafTabSyncBookmarkFolderEntity
    | LeafTabSyncBookmarkItemEntity,
    'id' | 'type' | 'revision'
  >,
  deletedBy: string,
  deletedAt: string,
): LeafTabSyncTombstone => ({
  id: entity.id,
  type: entity.type,
  deletedAt,
  deletedBy,
  lastKnownRevision: entity.revision,
});

const resolveSnapshotInput = (
  scenarioModes: ScenarioMode[],
  scenarioShortcuts: ScenarioShortcuts,
  bookmarkTree: LeafTabBookmarkTreeDraft | null | undefined,
) => {
  const scenarioIds = scenarioModes.map((mode) => mode.id);
  const resolvedShortcutEntries: ResolvedShortcutEntry[] = [];
  const resolvedBookmarkFolderEntries: ResolvedBookmarkFolderEntry[] = [];
  const resolvedBookmarkItemEntries: ResolvedBookmarkItemEntry[] = [];
  const shortcutIdsByScenario: Record<string, string[]> = {};
  const bookmarkOrderIdsByParent: Record<string, string[]> = {};

  scenarioModes.forEach((mode) => {
    const items = scenarioShortcuts[mode.id] || [];
    const counts = new Map<string, number>();
    const shortcutIds: string[] = [];

    items.forEach((shortcut) => {
      const identitySeed = getShortcutIdentityKey(shortcut) || `${shortcut.title}|${shortcut.url}`;
      const nextCount = (counts.get(identitySeed) || 0) + 1;
      counts.set(identitySeed, nextCount);

      const shortcutId = isNonEmptyString(shortcut.id)
        ? shortcut.id.trim()
        : createShortcutFallbackId(shortcut, mode.id, nextCount);

      shortcutIds.push(shortcutId);
      resolvedShortcutEntries.push({
        scenarioId: mode.id,
        shortcutId,
        shortcut,
      });
    });

    shortcutIdsByScenario[mode.id] = shortcutIds;
  });

  (bookmarkTree?.folders || []).forEach((folder) => {
    resolvedBookmarkFolderEntries.push({
      folderId: folder.entityId,
      parentId: folder.parentId,
      title: folder.title,
    });
  });

  (bookmarkTree?.items || []).forEach((item) => {
    resolvedBookmarkItemEntries.push({
      bookmarkId: item.entityId,
      parentId: item.parentId,
      title: item.title,
      url: item.url,
    });
  });

  Object.entries(bookmarkTree?.orderIdsByParent || {}).forEach(([parentId, ids]) => {
    bookmarkOrderIdsByParent[parentId] = ids.slice();
  });
  if (!bookmarkOrderIdsByParent.__root__) {
    bookmarkOrderIdsByParent.__root__ = [];
  }

  return {
    scenarioIds,
    resolvedShortcutEntries,
    resolvedBookmarkFolderEntries,
    resolvedBookmarkItemEntries,
    shortcutIdsByScenario,
    bookmarkOrderIdsByParent,
  };
};

export const createLeafTabSyncBuildState = (params: {
  previousSnapshot?: LeafTabSyncSnapshot | null;
  scenarioModes: ScenarioMode[];
  scenarioShortcuts: ScenarioShortcuts;
  bookmarkTree?: LeafTabBookmarkTreeDraft | null;
  deviceId: string;
  generatedAt?: string;
}): LeafTabSnapshotBuildState => {
  const generatedAt = params.generatedAt || new Date().toISOString();
  const previousSnapshot = params.previousSnapshot || null;
  const state: LeafTabSnapshotBuildState = {
    entities: {},
    tombstones: {
      ...(previousSnapshot?.tombstones || {}),
    },
    orders: {
      shortcutOrders: {},
      bookmarkOrders: {},
    },
  };

  const {
    scenarioIds,
    resolvedShortcutEntries,
    resolvedBookmarkFolderEntries,
    resolvedBookmarkItemEntries,
    shortcutIdsByScenario,
    bookmarkOrderIdsByParent,
  } = resolveSnapshotInput(
    params.scenarioModes,
    params.scenarioShortcuts,
    params.bookmarkTree,
  );

  params.scenarioModes.forEach((mode) => {
    const previousEntity = previousSnapshot?.scenarios[mode.id];
    state.entities![mode.id] = previousEntity && isSameScenarioValue(mode, previousEntity)
      ? {
          createdAt: previousEntity.createdAt,
          updatedAt: previousEntity.updatedAt,
          updatedBy: previousEntity.updatedBy,
          revision: previousEntity.revision,
        }
      : createUpdatedEntityMetadata(previousEntity, params.deviceId, generatedAt);
    delete state.tombstones![mode.id];
  });

  resolvedShortcutEntries.forEach(({ scenarioId, shortcutId, shortcut }) => {
    const previousEntity = previousSnapshot?.shortcuts[shortcutId];
    state.entities![shortcutId] = previousEntity && isSameShortcutValue(scenarioId, shortcut, previousEntity)
      ? {
          createdAt: previousEntity.createdAt,
          updatedAt: previousEntity.updatedAt,
          updatedBy: previousEntity.updatedBy,
          revision: previousEntity.revision,
        }
      : createUpdatedEntityMetadata(previousEntity, params.deviceId, generatedAt);
    delete state.tombstones![shortcutId];
  });

  resolvedBookmarkFolderEntries.forEach((folder) => {
    const previousEntity = previousSnapshot?.bookmarkFolders[folder.folderId];
    state.entities![folder.folderId] = previousEntity && isSameBookmarkFolderValue(folder, previousEntity)
      ? {
          createdAt: previousEntity.createdAt,
          updatedAt: previousEntity.updatedAt,
          updatedBy: previousEntity.updatedBy,
          revision: previousEntity.revision,
        }
      : createUpdatedEntityMetadata(previousEntity, params.deviceId, generatedAt);
    delete state.tombstones![folder.folderId];
  });

  resolvedBookmarkItemEntries.forEach((item) => {
    const previousEntity = previousSnapshot?.bookmarkItems[item.bookmarkId];
    state.entities![item.bookmarkId] = previousEntity && isSameBookmarkItemValue(item, previousEntity)
      ? {
          createdAt: previousEntity.createdAt,
          updatedAt: previousEntity.updatedAt,
          updatedBy: previousEntity.updatedBy,
          revision: previousEntity.revision,
        }
      : createUpdatedEntityMetadata(previousEntity, params.deviceId, generatedAt);
    delete state.tombstones![item.bookmarkId];
  });

  Object.values(previousSnapshot?.scenarios || {}).forEach((entity) => {
    if (!state.entities?.[entity.id]) {
      state.tombstones![entity.id] = createTombstone(entity, params.deviceId, generatedAt);
    }
  });

  Object.values(previousSnapshot?.shortcuts || {}).forEach((entity) => {
    if (!state.entities?.[entity.id]) {
      state.tombstones![entity.id] = createTombstone(entity, params.deviceId, generatedAt);
    }
  });

  Object.values(previousSnapshot?.bookmarkFolders || {}).forEach((entity) => {
    if (!state.entities?.[entity.id]) {
      state.tombstones![entity.id] = createTombstone(entity, params.deviceId, generatedAt);
    }
  });

  Object.values(previousSnapshot?.bookmarkItems || {}).forEach((entity) => {
    if (!state.entities?.[entity.id]) {
      state.tombstones![entity.id] = createTombstone(entity, params.deviceId, generatedAt);
    }
  });

  const previousScenarioOrder = previousSnapshot?.scenarioOrder;
  state.orders!.scenarioOrder = previousScenarioOrder && areArraysEqual(previousScenarioOrder.ids, scenarioIds)
    ? {
        updatedAt: previousScenarioOrder.updatedAt,
        updatedBy: previousScenarioOrder.updatedBy,
        revision: previousScenarioOrder.revision,
      }
    : createUpdatedOrderMetadata(previousScenarioOrder, params.deviceId, generatedAt);

  scenarioIds.forEach((scenarioId) => {
    const previousOrder = previousSnapshot?.shortcutOrders[scenarioId];
    const nextIds = shortcutIdsByScenario[scenarioId] || [];
    state.orders!.shortcutOrders![scenarioId] = previousOrder && areArraysEqual(previousOrder.ids, nextIds)
      ? {
          updatedAt: previousOrder.updatedAt,
          updatedBy: previousOrder.updatedBy,
          revision: previousOrder.revision,
        }
      : createUpdatedOrderMetadata(previousOrder, params.deviceId, generatedAt);
  });

  Object.entries(bookmarkOrderIdsByParent).forEach(([orderKey, nextIds]) => {
    const previousOrder = previousSnapshot?.bookmarkOrders[orderKey];
    state.orders!.bookmarkOrders![orderKey] = previousOrder && areArraysEqual(previousOrder.ids, nextIds)
      ? {
          updatedAt: previousOrder.updatedAt,
          updatedBy: previousOrder.updatedBy,
          revision: previousOrder.revision,
        }
      : createUpdatedOrderMetadata(previousOrder, params.deviceId, generatedAt);
  });

  return state;
};

export const buildLeafTabSyncSnapshot = (params: {
  scenarioModes: ScenarioMode[];
  scenarioShortcuts: ScenarioShortcuts;
  bookmarkTree?: LeafTabBookmarkTreeDraft | null;
  deviceId: string;
  generatedAt?: string;
  state?: LeafTabSnapshotBuildState;
}): LeafTabSyncSnapshot => {
  const generatedAt = params.generatedAt || new Date().toISOString();
  const scenarios: Record<string, LeafTabSyncScenarioEntity> = {};
  const shortcuts: Record<string, LeafTabSyncShortcutEntity> = {};
  const bookmarkFolders: Record<string, LeafTabSyncBookmarkFolderEntity> = {};
  const bookmarkItems: Record<string, LeafTabSyncBookmarkItemEntity> = {};
  const shortcutOrders: Record<string, LeafTabSyncShortcutOrder> = {};
  const bookmarkOrders: Record<string, LeafTabSyncBookmarkOrder> = {};
  const {
    scenarioIds,
    resolvedShortcutEntries,
    resolvedBookmarkFolderEntries,
    resolvedBookmarkItemEntries,
    shortcutIdsByScenario,
    bookmarkOrderIdsByParent,
  } = resolveSnapshotInput(
    params.scenarioModes,
    params.scenarioShortcuts,
    params.bookmarkTree,
  );
  const tombstones = { ...(params.state?.tombstones || {}) };

  params.scenarioModes.forEach((mode) => {
    const metadata = getEntityMetadata(mode.id, params.deviceId, generatedAt, params.state);
    scenarios[mode.id] = {
      id: mode.id,
      type: 'scenario',
      name: mode.name,
      color: mode.color,
      icon: mode.icon,
      archived: false,
      ...metadata,
    };
    delete tombstones[mode.id];
  });

  resolvedShortcutEntries.forEach(({ scenarioId, shortcutId, shortcut }) => {
    const metadata = getEntityMetadata(shortcutId, params.deviceId, generatedAt, params.state);
    shortcuts[shortcutId] = {
      id: shortcutId,
      type: 'shortcut',
      scenarioId,
      title: shortcut.title || '',
      url: shortcut.url || '',
      icon: shortcut.icon || '',
      description: '',
      ...metadata,
    };
    delete tombstones[shortcutId];
  });

  resolvedBookmarkFolderEntries.forEach((folder) => {
    const metadata = getEntityMetadata(folder.folderId, params.deviceId, generatedAt, params.state);
    bookmarkFolders[folder.folderId] = {
      id: folder.folderId,
      type: 'bookmark-folder',
      parentId: folder.parentId,
      title: folder.title,
      ...metadata,
    };
    delete tombstones[folder.folderId];
  });

  resolvedBookmarkItemEntries.forEach((item) => {
    const metadata = getEntityMetadata(item.bookmarkId, params.deviceId, generatedAt, params.state);
    bookmarkItems[item.bookmarkId] = {
      id: item.bookmarkId,
      type: 'bookmark-item',
      parentId: item.parentId,
      title: item.title,
      url: item.url,
      ...metadata,
    };
    delete tombstones[item.bookmarkId];
  });

  scenarioIds.forEach((scenarioId) => {
    const orderMetadata = getOrderMetadata(
      params.state?.orders?.shortcutOrders?.[scenarioId],
      params.deviceId,
      generatedAt,
    );
    shortcutOrders[scenarioId] = {
      type: 'shortcut-order',
      scenarioId,
      ids: shortcutIdsByScenario[scenarioId] || [],
      ...orderMetadata,
    };
  });

  const scenarioOrderMetadata = getOrderMetadata(
    params.state?.orders?.scenarioOrder,
    params.deviceId,
    generatedAt,
  );
  const scenarioOrder: LeafTabSyncScenarioOrder = {
    type: 'scenario-order',
    ids: scenarioIds,
    ...scenarioOrderMetadata,
  };

  Object.entries(bookmarkOrderIdsByParent).forEach(([orderKey, ids]) => {
    const orderMetadata = getOrderMetadata(
      params.state?.orders?.bookmarkOrders?.[orderKey],
      params.deviceId,
      generatedAt,
    );
    bookmarkOrders[orderKey] = {
      type: 'bookmark-order',
      parentId: orderKey === '__root__' ? null : orderKey,
      ids,
      ...orderMetadata,
    };
  });

  return {
    meta: {
      version: LEAFTAB_SYNC_SCHEMA_VERSION,
      deviceId: params.deviceId,
      generatedAt,
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

export const projectLeafTabSyncSnapshotToAppState = (
  snapshot: LeafTabSyncSnapshot,
): {
  scenarioModes: ScenarioMode[];
  scenarioShortcuts: ScenarioShortcuts;
  bookmarkFolders: Record<string, LeafTabSyncBookmarkFolderEntity>;
  bookmarkItems: Record<string, LeafTabSyncBookmarkItemEntity>;
  bookmarkOrders: Record<string, LeafTabSyncBookmarkOrder>;
} => {
  const orderedScenarioIds = snapshot.scenarioOrder.ids.filter((id) => snapshot.scenarios[id]);
  const missingScenarioIds = Object.keys(snapshot.scenarios).filter(
    (id) => !orderedScenarioIds.includes(id),
  );
  const scenarioModes = orderedScenarioIds
    .concat(missingScenarioIds.sort())
    .map((id) => {
      const scenario = snapshot.scenarios[id];
      return {
        id: scenario.id,
        name: scenario.name,
        color: scenario.color,
        icon: scenario.icon as ScenarioMode['icon'],
      };
    });

  const scenarioShortcuts: ScenarioShortcuts = {};
  scenarioModes.forEach((scenario) => {
    const order = snapshot.shortcutOrders[scenario.id];
    const orderedShortcutIds = order?.ids || [];
    const orderedShortcutList = orderedShortcutIds
      .filter((id) => snapshot.shortcuts[id]?.scenarioId === scenario.id)
      .map((id) => {
        const shortcut = snapshot.shortcuts[id];
        return {
          id: shortcut.id,
          title: shortcut.title,
          url: shortcut.url,
          icon: shortcut.icon,
        };
      });
    const seenShortcutIds = new Set(orderedShortcutList.map((shortcut) => shortcut.id));
    const unorderedShortcutList = Object.values(snapshot.shortcuts)
      .filter((shortcut) => shortcut.scenarioId === scenario.id && !seenShortcutIds.has(shortcut.id))
      .sort((left, right) => {
        const createdAtDelta = Date.parse(left.createdAt) - Date.parse(right.createdAt);
        if (Number.isFinite(createdAtDelta) && createdAtDelta !== 0) {
          return createdAtDelta;
        }
        return left.id.localeCompare(right.id);
      })
      .map((shortcut) => ({
        id: shortcut.id,
        title: shortcut.title,
        url: shortcut.url,
        icon: shortcut.icon,
      }));
    scenarioShortcuts[scenario.id] = orderedShortcutList.concat(unorderedShortcutList);
  });

  return {
    scenarioModes,
    scenarioShortcuts,
    bookmarkFolders: snapshot.bookmarkFolders,
    bookmarkItems: snapshot.bookmarkItems,
    bookmarkOrders: snapshot.bookmarkOrders,
  };
};
