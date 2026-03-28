export const resolveCloudSyncBookmarksEnabled = (
  configuredEnabled: boolean,
  permissionGranted: boolean,
) => {
  return configuredEnabled && permissionGranted;
};

export const resolveCloudSyncBookmarkApplyMode = (syncBookmarksEnabled: boolean) => {
  return {
    includeBookmarks: syncBookmarksEnabled,
    skipBookmarkApply: !syncBookmarksEnabled,
  };
};

export const resolveCloudSyncBookmarksToggleIntent = async (params: {
  nextChecked: boolean;
  requestPermission: () => Promise<boolean>;
}) => {
  if (!params.nextChecked) {
    return {
      enabled: false,
      permissionRequested: false,
      permissionDenied: false,
    };
  }

  const granted = await params.requestPermission();
  return {
    enabled: Boolean(granted),
    permissionRequested: true,
    permissionDenied: !granted,
  };
};
