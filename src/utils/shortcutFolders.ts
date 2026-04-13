import type { Shortcut } from '@/types';
import { ROOT_SHORTCUTS_PATH } from '@/features/shortcuts/model/paths';
export {
  getMaxShortcutFolderDepth,
  hasNestedShortcutFolders,
  SUPPORTED_SHORTCUT_FOLDER_DEPTH,
  supportsShortcutFolderDepth,
} from '@/features/shortcuts/model/constraints';
import {
  mergeShortcutsIntoNewFolder,
  moveShortcutIntoFolder,
} from '@/features/shortcuts/model/operations';
export {
  collectShortcutIds,
  countShortcutLinks,
  findShortcutById,
  flattenScenarioShortcutLinks,
  flattenShortcutLinks,
  getShortcutChildren,
  isShortcutFolder,
  isShortcutLink,
  mapShortcutTree,
  removeShortcutById,
} from '@/features/shortcuts/model/selectors';

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
