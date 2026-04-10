import { lazyWithPageReload } from './lazyWithPageReload';

export const LazyWallpaperSelector = lazyWithPageReload(
  'wallpaper-selector',
  () => import('../components/WallpaperSelector'),
  (module) => module.default,
);
export const LazyAppDialogs = lazyWithPageReload(
  'app-dialogs',
  () => import('../components/AppDialogs'),
  (module) => module.AppDialogs,
);
export const LazyLeafTabSyncDialog = lazyWithPageReload(
  'leaftab-sync-dialog',
  () => import('../components/sync/LeafTabSyncDialog'),
  (module) => module.LeafTabSyncDialog,
);
export const LazyLeafTabSyncEncryptionDialog = lazyWithPageReload(
  'leaftab-sync-encryption-dialog',
  () => import('../components/sync/LeafTabSyncEncryptionDialog'),
  (module) => module.LeafTabSyncEncryptionDialog,
);

export const LazyUpdateAvailableDialog = lazyWithPageReload(
  'update-available-dialog',
  () => import('../components/UpdateAvailableDialog'),
  (module) => module.UpdateAvailableDialog,
);

export const LazyRoleSelector = lazyWithPageReload(
  'role-selector',
  () => import('../components/RoleSelector'),
  (module) => module.RoleSelector,
);
