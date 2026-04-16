import type { Shortcut } from '../shortcutTypes';
import { getShortcutChildren, isShortcutFolder } from './selectors';

export const SUPPORTED_SHORTCUT_FOLDER_DEPTH = 1;

function getShortcutFolderDepth(shortcut: Shortcut): number {
  if (!isShortcutFolder(shortcut)) return 0;

  return 1 + getShortcutChildren(shortcut).reduce(
    (maxDepth, child) => Math.max(maxDepth, getShortcutFolderDepth(child)),
    0,
  );
}

export function getMaxShortcutFolderDepth(shortcuts: readonly Shortcut[]): number {
  return shortcuts.reduce(
    (maxDepth, shortcut) => Math.max(maxDepth, getShortcutFolderDepth(shortcut)),
    0,
  );
}

export function supportsShortcutFolderDepth(
  shortcuts: readonly Shortcut[],
  maxSupportedDepth = SUPPORTED_SHORTCUT_FOLDER_DEPTH,
): boolean {
  return getMaxShortcutFolderDepth(shortcuts) <= Math.max(0, maxSupportedDepth);
}

export function hasNestedShortcutFolders(shortcuts: readonly Shortcut[]): boolean {
  return !supportsShortcutFolderDepth(shortcuts, SUPPORTED_SHORTCUT_FOLDER_DEPTH);
}
