import type { LeafTabLocalBackupExportScope } from '@/sync/leaftab';

export const normalizeLocalBackupExportScope = (
  scope?: Partial<LeafTabLocalBackupExportScope> | null,
): LeafTabLocalBackupExportScope => ({
  shortcuts: scope?.shortcuts !== false,
  bookmarks: scope?.bookmarks !== false,
});

export const getDefaultLocalBackupExportScope = (): LeafTabLocalBackupExportScope => ({
  shortcuts: true,
  bookmarks: false,
});

export const resolveLocalBackupExportBookmarksMode = (
  scope?: Partial<LeafTabLocalBackupExportScope> | null,
) => {
  const normalizedScope = normalizeLocalBackupExportScope(scope);
  return {
    includeBookmarks: normalizedScope.bookmarks,
    requestBookmarkPermission: normalizedScope.bookmarks,
  };
};

export const resolveLocalBackupImportBookmarksMode = (
  scope?: Partial<LeafTabLocalBackupExportScope> | null,
) => {
  const normalizedScope = normalizeLocalBackupExportScope(scope);
  return {
    includeBookmarks: normalizedScope.bookmarks,
    skipBookmarkApply: !normalizedScope.bookmarks,
  };
};
