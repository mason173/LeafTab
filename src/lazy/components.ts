import { lazy } from 'react';

export const LazyWallpaperSelector = lazy(() => import('../components/WallpaperSelector'));
export const LazyAppDialogs = lazy(() =>
  import('../components/AppDialogs').then((module) => ({ default: module.AppDialogs })),
);
export const LazyLeafTabSyncDialog = lazy(() =>
  import('../components/sync/LeafTabSyncDialog').then((module) => ({
    default: module.LeafTabSyncDialog,
  })),
);
export const LazyLeafTabSyncEncryptionDialog = lazy(() =>
  import('../components/sync/LeafTabSyncEncryptionDialog').then((module) => ({
    default: module.LeafTabSyncEncryptionDialog,
  })),
);

export const LazyUpdateAvailableDialog = lazy(() =>
  import('../components/UpdateAvailableDialog').then((module) => ({
    default: module.UpdateAvailableDialog,
  })),
);

export const LazyRoleSelector = lazy(() =>
  import('../components/RoleSelector').then((module) => ({ default: module.RoleSelector })),
);
