import { getBookmarksApi } from '@/platform/runtime';
import { ensureExtensionPermission } from '@/utils/extensionPermissions';

export type LeafTabBookmarkSyncScopeRole = 'toolbar' | 'other' | 'mobile';

export interface LeafTabBookmarkSyncScope {
  role: LeafTabBookmarkSyncScopeRole;
  pathSegments: string[];
}

export interface LeafTabBookmarkFolderDraft {
  entityId: string;
  localNodeId: string;
  parentId: string | null;
  title: string;
}

export interface LeafTabBookmarkItemDraft {
  entityId: string;
  localNodeId: string;
  parentId: string | null;
  title: string;
  url: string;
}

export interface LeafTabBookmarkTreeDraft {
  folders: LeafTabBookmarkFolderDraft[];
  items: LeafTabBookmarkItemDraft[];
  orderIdsByParent: Record<string, string[]>;
  nodeIdToEntityId: Record<string, string>;
}

interface LeafTabBookmarkMappingState {
  version: 1;
  nodeIdToEntityId: Record<string, string>;
  savedAt: string;
}

interface LeafTabBookmarkDraftCacheEntry {
  draft?: LeafTabBookmarkTreeDraft;
  savedAt: number;
  pending?: Promise<LeafTabBookmarkTreeDraft>;
}

type BookmarkApi = typeof chrome.bookmarks;
type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode;
type BookmarkCreateArg = chrome.bookmarks.CreateDetails;

const ROOT_FOLDER_ID_MAP: Record<string, LeafTabBookmarkSyncScopeRole | 'unknown'> = {
  '1': 'toolbar',
  '2': 'other',
  '3': 'mobile',
  toolbar_____: 'toolbar',
  menu________: 'other',
  mobile______: 'mobile',
  unfiled_____: 'unknown',
};

const ROOT_FOLDER_TITLE_PATTERNS: Array<{
  pattern: RegExp;
  role: LeafTabBookmarkSyncScopeRole | 'unknown';
}> = [
  { pattern: /toolbar|bookmarks bar|bookmarks toolbar|lesezeichen-symbolleiste/i, role: 'toolbar' },
  { pattern: /bookmarks menu|menu|other|weitere|sonstige/i, role: 'other' },
  { pattern: /mobile|mobil/i, role: 'mobile' },
];

const DEFAULT_SCOPE: LeafTabBookmarkSyncScope = {
  role: 'other',
  pathSegments: [],
};

const ROOT_ORDER_KEY = '__root__';
const SCOPE_STORAGE_KEY = 'leaftab_sync_bookmark_scope_v1';
const MAPPING_KEY_PREFIX = 'leaftab_sync_bookmark_mapping_v1:';
const BOOKMARK_DRAFT_CACHE_TTL_MS = 5 * 60 * 1000;
const bookmarkDraftCache = new Map<string, LeafTabBookmarkDraftCacheEntry>();
let bookmarkDraftCacheListenersBound = false;
const SYNC_ROOT_ROLES: LeafTabBookmarkSyncScopeRole[] = ['toolbar', 'other'];
const FIXED_SCOPE_STORAGE_KEY = 'roots:toolbar+other';

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
    .slice(0, 32) || 'bookmark';
};

const getOrderKey = (parentId: string | null) => parentId || ROOT_ORDER_KEY;
const getRoleEntityId = (role: LeafTabBookmarkSyncScopeRole) => `browser_root_${role}`;

const createEmptyBookmarkTreeDraft = (): LeafTabBookmarkTreeDraft => ({
  folders: [],
  items: [],
  orderIdsByParent: {
    [ROOT_ORDER_KEY]: [],
  },
  nodeIdToEntityId: {},
});

const cloneBookmarkTreeDraft = (draft: LeafTabBookmarkTreeDraft): LeafTabBookmarkTreeDraft => ({
  folders: draft.folders.map((folder) => ({ ...folder })),
  items: draft.items.map((item) => ({ ...item })),
  orderIdsByParent: Object.fromEntries(
    Object.entries(draft.orderIdsByParent).map(([key, ids]) => [key, ids.slice()]),
  ),
  nodeIdToEntityId: { ...draft.nodeIdToEntityId },
});

const getScopeRoleLabel = (role: LeafTabBookmarkSyncScopeRole) => {
  if (role === 'toolbar') return '书签栏';
  if (role === 'mobile') return '移动书签';
  return '其他书签';
};

const getBrowserRootsScopeLabel = () => '书签栏 / 其他书签';

const hasBookmarkRuntimeError = () => {
  return Boolean(globalThis.chrome?.runtime?.lastError);
};

const callBookmarksApi = <T>(
  executor: (api: BookmarkApi, resolve: (value: T) => void, reject: (error: Error) => void) => void,
): Promise<T> => {
  const api = getBookmarksApi();
  if (!api) {
    return Promise.reject(new Error('当前环境不支持书签 API'));
  }

  return new Promise<T>((resolve, reject) => {
    executor(
      api,
      (value) => {
        if (hasBookmarkRuntimeError()) {
          reject(new Error(globalThis.chrome?.runtime?.lastError?.message || '书签 API 调用失败'));
          return;
        }
        resolve(value);
      },
      reject,
    );
  });
};

const getBookmarkTree = () => {
  return callBookmarksApi<BookmarkTreeNode[]>((api, resolve) => {
    api.getTree((nodes) => resolve(nodes || []));
  });
};

const createBookmarkNode = (details: BookmarkCreateArg) => {
  return callBookmarksApi<BookmarkTreeNode>((api, resolve) => {
    api.create(details, (node) => resolve(node));
  });
};

const removeBookmarkTree = (id: string) => {
  return callBookmarksApi<void>((api, resolve) => {
    api.removeTree(id, () => resolve());
  });
};

const removeBookmarkNode = (id: string) => {
  return callBookmarksApi<void>((api, resolve) => {
    api.remove(id, () => resolve());
  });
};

const detectRootFolderRole = (
  node: BookmarkTreeNode,
): LeafTabBookmarkSyncScopeRole | 'unknown' => {
  if (node.id && ROOT_FOLDER_ID_MAP[node.id]) {
    const mapped = ROOT_FOLDER_ID_MAP[node.id];
    return mapped === 'unknown' ? 'unknown' : mapped;
  }

  const title = node.title || '';
  for (const entry of ROOT_FOLDER_TITLE_PATTERNS) {
    if (entry.pattern.test(title)) return entry.role;
  }

  return 'unknown';
};

const normalizeScope = (
  _scope: LeafTabBookmarkSyncScope | null | undefined,
): LeafTabBookmarkSyncScope => {
  return {
    role: DEFAULT_SCOPE.role,
    pathSegments: [],
  };
};

const getScopeStorageKey = (_scope: LeafTabBookmarkSyncScope) => {
  return FIXED_SCOPE_STORAGE_KEY;
};

const invalidateLeafTabBookmarkDraftCache = (scope?: LeafTabBookmarkSyncScope | null) => {
  if (!scope) {
    bookmarkDraftCache.clear();
    return;
  }
  bookmarkDraftCache.delete(getScopeStorageKey(scope));
};

const ensureLeafTabBookmarkDraftCacheListeners = () => {
  if (bookmarkDraftCacheListenersBound) return;
  const api = getBookmarksApi();
  if (!api) return;

  const invalidate = () => invalidateLeafTabBookmarkDraftCache();
  api.onCreated?.addListener?.(invalidate);
  api.onRemoved?.addListener?.(invalidate);
  api.onChanged?.addListener?.(invalidate);
  api.onMoved?.addListener?.(invalidate);
  api.onChildrenReordered?.addListener?.(invalidate);
  api.onImportEnded?.addListener?.(invalidate);
  bookmarkDraftCacheListenersBound = true;
};

const readCachedLeafTabBookmarkTreeDraft = (scope: LeafTabBookmarkSyncScope) => {
  const entry = bookmarkDraftCache.get(getScopeStorageKey(scope));
  if (!entry?.draft) return null;
  if (Date.now() - entry.savedAt > BOOKMARK_DRAFT_CACHE_TTL_MS) {
    bookmarkDraftCache.delete(getScopeStorageKey(scope));
    return null;
  }
  return cloneBookmarkTreeDraft(entry.draft);
};

const writeCachedLeafTabBookmarkTreeDraft = (
  scope: LeafTabBookmarkSyncScope,
  draft: LeafTabBookmarkTreeDraft,
) => {
  bookmarkDraftCache.set(getScopeStorageKey(scope), {
    draft: cloneBookmarkTreeDraft(draft),
    savedAt: Date.now(),
  });
};

const readBookmarkMapping = (scope: LeafTabBookmarkSyncScope): LeafTabBookmarkMappingState => {
  try {
    const raw = globalThis.localStorage?.getItem(`${MAPPING_KEY_PREFIX}${getScopeStorageKey(scope)}`);
    if (!raw) {
      return {
        version: 1,
        nodeIdToEntityId: {},
        savedAt: new Date(0).toISOString(),
      };
    }
    const parsed = JSON.parse(raw) as Partial<LeafTabBookmarkMappingState>;
    return {
      version: 1,
      nodeIdToEntityId:
        parsed?.nodeIdToEntityId && typeof parsed.nodeIdToEntityId === 'object'
          ? Object.fromEntries(
              Object.entries(parsed.nodeIdToEntityId).filter(
                ([nodeId, entityId]) => typeof nodeId === 'string' && typeof entityId === 'string',
              ),
            )
          : {},
      savedAt: typeof parsed?.savedAt === 'string' ? parsed.savedAt : new Date(0).toISOString(),
    };
  } catch {
    return {
      version: 1,
      nodeIdToEntityId: {},
      savedAt: new Date(0).toISOString(),
    };
  }
};

const writeBookmarkMapping = (
  scope: LeafTabBookmarkSyncScope,
  nodeIdToEntityId: Record<string, string>,
) => {
  try {
    globalThis.localStorage?.setItem(
      `${MAPPING_KEY_PREFIX}${getScopeStorageKey(scope)}`,
      JSON.stringify({
        version: 1,
        nodeIdToEntityId,
        savedAt: new Date().toISOString(),
      } satisfies LeafTabBookmarkMappingState),
    );
  } catch {}
};

const createFolderEntityId = (parentId: string | null, title: string, occurrence: number) => {
  return `bkf_${slugify(title || 'folder')}_${shortHash(`${parentId || ROOT_ORDER_KEY}|${title}|${occurrence}`)}`;
};

const createItemEntityId = (
  parentId: string | null,
  title: string,
  url: string,
  occurrence: number,
) => {
  return `bkm_${slugify(title || url || 'item')}_${shortHash(`${parentId || ROOT_ORDER_KEY}|${title}|${url}|${occurrence}`)}`;
};

const resolveSyncRoleRoots = async () => {
  const tree = await getBookmarkTree();
  const topLevelFolders = tree[0]?.children || [];
  const roleRoots = new Map<LeafTabBookmarkSyncScopeRole, BookmarkTreeNode>();
  for (const node of topLevelFolders) {
    const role = detectRootFolderRole(node);
    if (role === 'toolbar' || role === 'other' || role === 'mobile') {
      if (!roleRoots.has(role)) {
        roleRoots.set(role, node);
      }
    }
  }
  return roleRoots;
};

const walkBookmarkChildren = (
  parentNode: BookmarkTreeNode,
  parentEntityId: string | null,
  mapping: LeafTabBookmarkMappingState,
  draft: LeafTabBookmarkTreeDraft,
) => {
  const folderCounts = new Map<string, number>();
  const itemCounts = new Map<string, number>();
  const orderedIds: string[] = [];

  for (const child of parentNode.children || []) {
    if (child.url) {
      const key = `${child.title || ''}|${child.url || ''}`;
      const occurrence = (itemCounts.get(key) || 0) + 1;
      itemCounts.set(key, occurrence);
      const entityId =
        mapping.nodeIdToEntityId[child.id] ||
        createItemEntityId(parentEntityId, child.title || '', child.url || '', occurrence);
      draft.items.push({
        entityId,
        localNodeId: child.id,
        parentId: parentEntityId,
        title: child.title || '',
        url: child.url || '',
      });
      draft.nodeIdToEntityId[child.id] = entityId;
      orderedIds.push(entityId);
      continue;
    }

    const key = child.title || '';
    const occurrence = (folderCounts.get(key) || 0) + 1;
    folderCounts.set(key, occurrence);
    const entityId =
      mapping.nodeIdToEntityId[child.id] ||
      createFolderEntityId(parentEntityId, child.title || '', occurrence);

    draft.folders.push({
      entityId,
      localNodeId: child.id,
      parentId: parentEntityId,
      title: child.title || '',
    });
    draft.nodeIdToEntityId[child.id] = entityId;
    orderedIds.push(entityId);
    walkBookmarkChildren(child, entityId, mapping, draft);
  }

  draft.orderIdsByParent[getOrderKey(parentEntityId)] = orderedIds;
};

export const getDefaultLeafTabBookmarkSyncScope = (): LeafTabBookmarkSyncScope => {
  return normalizeScope(null);
};

export const readLeafTabBookmarkSyncScope = (): LeafTabBookmarkSyncScope => {
  try {
    const raw = globalThis.localStorage?.getItem(SCOPE_STORAGE_KEY);
    if (!raw) return getDefaultLeafTabBookmarkSyncScope();
    return normalizeScope(JSON.parse(raw) as LeafTabBookmarkSyncScope);
  } catch {
    return getDefaultLeafTabBookmarkSyncScope();
  }
};

export const writeLeafTabBookmarkSyncScope = (scope: LeafTabBookmarkSyncScope) => {
  try {
    globalThis.localStorage?.setItem(SCOPE_STORAGE_KEY, JSON.stringify(normalizeScope(scope)));
  } catch {}
  invalidateLeafTabBookmarkDraftCache();
};

export const formatLeafTabBookmarkSyncScopeLabel = (
  _scope: LeafTabBookmarkSyncScope | null | undefined,
) => {
  return getBrowserRootsScopeLabel();
};

export const captureLeafTabBookmarkTreeDraft = async (options?: {
  scope?: LeafTabBookmarkSyncScope | null;
  requestPermission?: boolean;
}): Promise<LeafTabBookmarkTreeDraft> => {
  const scope = normalizeScope(options?.scope);
  ensureLeafTabBookmarkDraftCacheListeners();
  const granted = await ensureExtensionPermission('bookmarks', {
    requestIfNeeded: options?.requestPermission === true,
  });

  if (!granted) {
    return createEmptyBookmarkTreeDraft();
  }

  const cached = readCachedLeafTabBookmarkTreeDraft(scope);
  if (cached) {
    return cached;
  }

  const cacheKey = getScopeStorageKey(scope);
  const pending = bookmarkDraftCache.get(cacheKey)?.pending;
  if (pending) {
    return cloneBookmarkTreeDraft(await pending);
  }

  const nextPending = (async () => {
    const roleRoots = await resolveSyncRoleRoots();

    const draft: LeafTabBookmarkTreeDraft = {
      folders: [],
      items: [],
      orderIdsByParent: {},
      nodeIdToEntityId: {},
    };
    const mapping = readBookmarkMapping(scope);
    const rootIds: string[] = [];

    for (const role of SYNC_ROOT_ROLES) {
      const roleRoot = roleRoots.get(role);
      if (!roleRoot) continue;
      const entityId = getRoleEntityId(role);
      draft.folders.push({
        entityId,
        localNodeId: roleRoot.id,
        parentId: null,
        title: getScopeRoleLabel(role),
      });
      draft.nodeIdToEntityId[roleRoot.id] = entityId;
      rootIds.push(entityId);
      walkBookmarkChildren(roleRoot, entityId, mapping, draft);
    }

    draft.orderIdsByParent[ROOT_ORDER_KEY] = rootIds;
    writeBookmarkMapping(scope, draft.nodeIdToEntityId);
    writeCachedLeafTabBookmarkTreeDraft(scope, draft);
    return draft;
  })();

  bookmarkDraftCache.set(cacheKey, {
    ...bookmarkDraftCache.get(cacheKey),
    savedAt: 0,
    pending: nextPending,
  });

  try {
    return cloneBookmarkTreeDraft(await nextPending);
  } finally {
    const current = bookmarkDraftCache.get(cacheKey);
    if (current?.pending === nextPending) {
      if (current.draft) {
        bookmarkDraftCache.set(cacheKey, {
          draft: current.draft,
          savedAt: current.savedAt,
        });
      } else {
        bookmarkDraftCache.delete(cacheKey);
      }
    }
  }
};

const createSnapshotFolderChildren = (params: {
  parentBookmarkNodeId: string;
  parentEntityId: string | null;
  folderLookup: Record<string, { title: string; parentId: string | null }>;
  itemLookup: Record<string, { title: string; parentId: string | null; url: string }>;
  orderIdsByParent: Record<string, string[]>;
  nodeIdToEntityId: Record<string, string>;
}) => {
  const ids = params.orderIdsByParent[getOrderKey(params.parentEntityId)] || [];
  return ids.reduce<Promise<void>>(async (previous, entityId) => {
    await previous;

    const folder = params.folderLookup[entityId];
    if (folder) {
      const created = await createBookmarkNode({
        parentId: params.parentBookmarkNodeId,
        title: folder.title,
      });
      params.nodeIdToEntityId[created.id] = entityId;
      await createSnapshotFolderChildren({
        parentBookmarkNodeId: created.id,
        parentEntityId: entityId,
        folderLookup: params.folderLookup,
        itemLookup: params.itemLookup,
        orderIdsByParent: params.orderIdsByParent,
        nodeIdToEntityId: params.nodeIdToEntityId,
      });
      return;
    }

    const item = params.itemLookup[entityId];
    if (!item) return;
    const created = await createBookmarkNode({
      parentId: params.parentBookmarkNodeId,
      title: item.title,
      url: item.url,
    });
    params.nodeIdToEntityId[created.id] = entityId;
  }, Promise.resolve());
};

export const replaceLeafTabBookmarkTree = async (params: {
  scope?: LeafTabBookmarkSyncScope | null;
  folderLookup: Record<string, { title: string; parentId: string | null }>;
  itemLookup: Record<string, { title: string; parentId: string | null; url: string }>;
  orderIdsByParent: Record<string, string[]>;
  requestPermission?: boolean;
}) => {
  const scope = normalizeScope(params.scope);
  invalidateLeafTabBookmarkDraftCache(scope);
  const granted = await ensureExtensionPermission('bookmarks', {
    requestIfNeeded: params.requestPermission !== false,
  });
  if (!granted) {
    if (params.requestPermission === false) return false;
    throw new Error('书签权限未授予，无法写入本地书签');
  }

  const roleRoots = await resolveSyncRoleRoots();
  const nodeIdToEntityId: Record<string, string> = {};

  for (const role of SYNC_ROOT_ROLES) {
    const scopeRoot = roleRoots.get(role);
    if (!scopeRoot) continue;
    const roleEntityId = getRoleEntityId(role);
    nodeIdToEntityId[scopeRoot.id] = roleEntityId;

    for (const child of [...(scopeRoot.children || [])].reverse()) {
      if (child.url) {
        await removeBookmarkNode(child.id);
        continue;
      }
      await removeBookmarkTree(child.id);
    }

    await createSnapshotFolderChildren({
      parentBookmarkNodeId: scopeRoot.id,
      parentEntityId: roleEntityId,
      folderLookup: params.folderLookup,
      itemLookup: params.itemLookup,
      orderIdsByParent: params.orderIdsByParent,
      nodeIdToEntityId,
    });
  }

  writeBookmarkMapping(scope, nodeIdToEntityId);
  invalidateLeafTabBookmarkDraftCache(scope);
  return true;
};
