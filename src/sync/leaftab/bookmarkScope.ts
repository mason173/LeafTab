export type LeafTabBookmarkSyncScopeRole = 'toolbar' | 'other' | 'mobile';

export interface LeafTabBookmarkSyncScope {
  role: LeafTabBookmarkSyncScopeRole;
  pathSegments: string[];
}

const DEFAULT_SCOPE: LeafTabBookmarkSyncScope = {
  role: 'other',
  pathSegments: [],
};

const SCOPE_STORAGE_KEY = 'leaftab_sync_bookmark_scope_v1';
const FIXED_SCOPE_STORAGE_KEY = 'roots:toolbar+other';

export const normalizeLeafTabBookmarkSyncScope = (
  _scope: LeafTabBookmarkSyncScope | null | undefined,
): LeafTabBookmarkSyncScope => {
  return {
    role: DEFAULT_SCOPE.role,
    pathSegments: [],
  };
};

export const getLeafTabBookmarkScopeStorageKey = (_scope: LeafTabBookmarkSyncScope) => {
  return FIXED_SCOPE_STORAGE_KEY;
};

export const getDefaultLeafTabBookmarkSyncScope = (): LeafTabBookmarkSyncScope => {
  return normalizeLeafTabBookmarkSyncScope(null);
};

export const readLeafTabBookmarkSyncScope = (): LeafTabBookmarkSyncScope => {
  try {
    const raw = globalThis.localStorage?.getItem(SCOPE_STORAGE_KEY);
    if (!raw) return getDefaultLeafTabBookmarkSyncScope();
    return normalizeLeafTabBookmarkSyncScope(JSON.parse(raw) as LeafTabBookmarkSyncScope);
  } catch {
    return getDefaultLeafTabBookmarkSyncScope();
  }
};

export const writeLeafTabBookmarkSyncScope = (scope: LeafTabBookmarkSyncScope) => {
  try {
    globalThis.localStorage?.setItem(
      SCOPE_STORAGE_KEY,
      JSON.stringify(normalizeLeafTabBookmarkSyncScope(scope)),
    );
  } catch {}
};

export const formatLeafTabBookmarkSyncScopeLabel = (
  _scope: LeafTabBookmarkSyncScope | null | undefined,
) => {
  return '书签栏 / 其他书签';
};
