export const resolveDeferredBookmarkSyncExecution = (params: {
  skipBookmarksForThisRun?: boolean;
  hasDeferredDangerousBookmarks?: boolean;
  requestBookmarkPermission?: boolean;
}) => {
  const effectiveSkipBookmarks = Boolean(
    params.skipBookmarksForThisRun || params.hasDeferredDangerousBookmarks,
  );

  return {
    effectiveSkipBookmarks,
    effectiveRequestBookmarkPermission: effectiveSkipBookmarks
      ? false
      : params.requestBookmarkPermission,
  };
};
