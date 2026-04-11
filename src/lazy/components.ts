import { lazyWithPageReload } from './lazyWithPageReload';

const importWallpaperSelector = () => import('../components/WallpaperSelector');
const importAppDialogs = () => import('../components/AppDialogs');
const importLeafTabSyncDialog = () => import('../components/sync/LeafTabSyncDialog');
const importLeafTabSyncEncryptionDialog = () => import('../components/sync/LeafTabSyncEncryptionDialog');
const importUpdateAvailableDialog = () => import('../components/UpdateAvailableDialog');
const importRoleSelector = () => import('../components/RoleSelector');

export const LazyWallpaperSelector = lazyWithPageReload(
  'wallpaper-selector',
  importWallpaperSelector,
  (module) => module.default,
);
export const LazyAppDialogs = lazyWithPageReload(
  'app-dialogs',
  importAppDialogs,
  (module) => module.AppDialogs,
);
export const LazyLeafTabSyncDialog = lazyWithPageReload(
  'leaftab-sync-dialog',
  importLeafTabSyncDialog,
  (module) => module.LeafTabSyncDialog,
);
export const LazyLeafTabSyncEncryptionDialog = lazyWithPageReload(
  'leaftab-sync-encryption-dialog',
  importLeafTabSyncEncryptionDialog,
  (module) => module.LeafTabSyncEncryptionDialog,
);

export const LazyUpdateAvailableDialog = lazyWithPageReload(
  'update-available-dialog',
  importUpdateAvailableDialog,
  (module) => module.UpdateAvailableDialog,
);

export const LazyRoleSelector = lazyWithPageReload(
  'role-selector',
  importRoleSelector,
  (module) => module.RoleSelector,
);

export async function preloadHomeDialogs() {
  await Promise.allSettled([
    importAppDialogs(),
    importLeafTabSyncDialog(),
  ]);
}
