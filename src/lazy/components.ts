import { lazyWithPageReload } from './lazyWithPageReload';

const importWallpaperSelector = () => import('../components/WallpaperSelector');
const importAppDialogs = () => import('../components/AppDialogs');
const importLeafTabSyncDialog = () => import('../components/sync/LeafTabSyncDialog');
const importLeafTabSyncEncryptionDialog = () => import('../components/sync/LeafTabSyncEncryptionDialog');
const importUpdateAvailableDialog = () => import('../components/UpdateAvailableDialog');
const importRoleSelector = () => import('../components/RoleSelector');
const importShortcutFolderCompactOverlay = () => import('../components/ShortcutFolderCompactOverlay');
const importShortcutFolderDialog = () => import('../components/ShortcutFolderDialog');
const importShortcutFolderNameDialog = () => import('../components/ShortcutFolderNameDialog');

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

export const LazyShortcutFolderCompactOverlay = lazyWithPageReload(
  'shortcut-folder-compact-overlay',
  importShortcutFolderCompactOverlay,
  (module) => module.ShortcutFolderCompactOverlay,
);

export function preloadShortcutFolderCompactOverlay() {
  return importShortcutFolderCompactOverlay();
}

export const LazyShortcutFolderDialog = lazyWithPageReload(
  'shortcut-folder-dialog',
  importShortcutFolderDialog,
  (module) => module.ShortcutFolderDialog,
);

export const LazyShortcutFolderNameDialog = lazyWithPageReload(
  'shortcut-folder-name-dialog',
  importShortcutFolderNameDialog,
  (module) => module.ShortcutFolderNameDialog,
);

export async function preloadHomeDialogs() {
  await Promise.allSettled([
    importAppDialogs(),
    importLeafTabSyncDialog(),
    importShortcutFolderCompactOverlay(),
    importShortcutFolderDialog(),
    importShortcutFolderNameDialog(),
  ]);
}
