import { describe, expect, it } from 'vitest';
import {
  getDefaultLocalBackupExportScope,
  normalizeLocalBackupExportScope,
  resolveLocalBackupExportBookmarksMode,
  resolveLocalBackupImportBookmarksMode,
} from './localBackupScopePolicy';

describe('localBackupScopePolicy', () => {
  it('defaults local backup export to shortcuts only', () => {
    expect(getDefaultLocalBackupExportScope()).toEqual({
      shortcuts: true,
      bookmarks: false,
    });
  });

  it('normalizes missing scope to include both sections for internal full-scope operations', () => {
    expect(normalizeLocalBackupExportScope()).toEqual({
      shortcuts: true,
      bookmarks: true,
    });
  });

  it('requests bookmark permission only when export scope includes bookmarks', () => {
    expect(resolveLocalBackupExportBookmarksMode({
      shortcuts: true,
      bookmarks: false,
    })).toEqual({
      includeBookmarks: false,
      requestBookmarkPermission: false,
    });

    expect(resolveLocalBackupExportBookmarksMode({
      shortcuts: true,
      bookmarks: true,
    })).toEqual({
      includeBookmarks: true,
      requestBookmarkPermission: true,
    });
  });

  it('skips bookmark apply when importing shortcuts only', () => {
    expect(resolveLocalBackupImportBookmarksMode({
      shortcuts: true,
      bookmarks: false,
    })).toEqual({
      includeBookmarks: false,
      skipBookmarkApply: true,
    });

    expect(resolveLocalBackupImportBookmarksMode({
      shortcuts: true,
      bookmarks: true,
    })).toEqual({
      includeBookmarks: true,
      skipBookmarkApply: false,
    });
  });
});
