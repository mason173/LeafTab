import type { Shortcut } from '@/types';
import { isShortcutFolder } from './selectors';

export const SUPPORTED_SHORTCUT_FOLDER_DEPTH = 1;

export function getMaxShortcutFolderDepth(shortcuts: readonly Shortcut[]): number {
  const visit = (items: readonly Shortcut[], depth: number): number => {
    let maxDepth = depth;

    items.forEach((shortcut) => {
      if (!isShortcutFolder(shortcut)) {
        return;
      }
      maxDepth = Math.max(maxDepth, visit(shortcut.children, depth + 1));
    });

    return maxDepth;
  };

  return visit(shortcuts, 0);
}

export function supportsShortcutFolderDepth(shortcuts: readonly Shortcut[]): boolean {
  return getMaxShortcutFolderDepth(shortcuts) <= SUPPORTED_SHORTCUT_FOLDER_DEPTH;
}

export function hasNestedShortcutFolders(shortcuts: readonly Shortcut[]): boolean {
  return getMaxShortcutFolderDepth(shortcuts) > SUPPORTED_SHORTCUT_FOLDER_DEPTH;
}
