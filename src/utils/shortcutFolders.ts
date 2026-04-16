import {
  ROOT_SHORTCUTS_PATH,
  collectShortcutIds,
  countShortcutLinks,
  findShortcutById,
  flattenScenarioShortcutLinks,
  flattenShortcutLinks,
  getMaxShortcutFolderDepth,
  getShortcutChildren,
  hasNestedShortcutFolders,
  isShortcutFolder,
  isShortcutLink,
  mapShortcutTree,
  mergeShortcutsIntoNewFolder,
  moveShortcutIntoFolder,
  removeShortcutById,
  SUPPORTED_SHORTCUT_FOLDER_DEPTH,
  supportsShortcutFolderDepth,
} from '@leaftab/workspace-core';
import type { Shortcut } from '@/types';
export {
  collectShortcutIds,
  countShortcutLinks,
  findShortcutById,
  flattenScenarioShortcutLinks,
  flattenShortcutLinks,
  getMaxShortcutFolderDepth,
  getShortcutChildren,
  hasNestedShortcutFolders,
  isShortcutFolder,
  isShortcutLink,
  mapShortcutTree,
  mergeShortcutsIntoNewFolder,
  removeShortcutById,
  SUPPORTED_SHORTCUT_FOLDER_DEPTH,
  supportsShortcutFolderDepth,
};

export function groupTopLevelShortcutsIntoFolder(
  shortcuts: readonly Shortcut[],
  shortcutIds: readonly string[],
  createFolder: (children: Shortcut[]) => Shortcut,
): { nextShortcuts: Shortcut[]; folder: Shortcut } | null {
  return mergeShortcutsIntoNewFolder(shortcuts, ROOT_SHORTCUTS_PATH, shortcutIds, createFolder);
}

export function moveTopLevelShortcutIntoFolder(
  shortcuts: readonly Shortcut[],
  shortcutId: string,
  folderId: string,
): Shortcut[] | null {
  return moveShortcutIntoFolder(shortcuts, ROOT_SHORTCUTS_PATH, shortcutId, folderId);
}
