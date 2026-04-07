import { describe, expect, it } from 'vitest';
import { resolveDeferredBookmarkSyncExecution } from '@/utils/deferredBookmarkSync';

describe('resolveDeferredBookmarkSyncExecution', () => {
  it('keeps bookmark sync enabled when nothing is deferred', () => {
    expect(resolveDeferredBookmarkSyncExecution({
      requestBookmarkPermission: true,
      skipBookmarksForThisRun: false,
      hasDeferredDangerousBookmarks: false,
    })).toEqual({
      effectiveSkipBookmarks: false,
      effectiveRequestBookmarkPermission: true,
    });
  });

  it('forces bookmark sync off for one-shot skip runs', () => {
    expect(resolveDeferredBookmarkSyncExecution({
      requestBookmarkPermission: true,
      skipBookmarksForThisRun: true,
      hasDeferredDangerousBookmarks: false,
    })).toEqual({
      effectiveSkipBookmarks: true,
      effectiveRequestBookmarkPermission: false,
    });
  });

  it('continues skipping bookmarks while dangerous bookmark sync is deferred', () => {
    expect(resolveDeferredBookmarkSyncExecution({
      requestBookmarkPermission: true,
      skipBookmarksForThisRun: false,
      hasDeferredDangerousBookmarks: true,
    })).toEqual({
      effectiveSkipBookmarks: true,
      effectiveRequestBookmarkPermission: false,
    });
  });
});
