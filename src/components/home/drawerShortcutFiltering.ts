import type { Shortcut } from '@/types';
import { resolveShortcutIndexLetter } from '@/components/home/drawerShortcutAlphabetIndex';
import { getShortcutChildren, isShortcutFolder } from '@/utils/shortcutFolders';

export type DrawerShortcutEntry = {
  shortcut: Shortcut;
  rootIndex: number;
  parentFolderId: string | null;
};

export function buildDrawerShortcutEntries(shortcuts: Shortcut[]): DrawerShortcutEntry[] {
  return shortcuts.map((shortcut, rootIndex) => ({
    shortcut,
    rootIndex,
    parentFolderId: null,
  }));
}

export function collectDrawerShortcutIndexTargets(entries: DrawerShortcutEntry[]): Shortcut[] {
  return entries.flatMap((entry) => {
    if (isShortcutFolder(entry.shortcut)) {
      return getShortcutChildren(entry.shortcut).filter((child) => !isShortcutFolder(child));
    }

    return [entry.shortcut];
  });
}

export function filterDrawerShortcutEntriesByIndexLetter(
  entries: DrawerShortcutEntry[],
  letter: string | null,
): DrawerShortcutEntry[] {
  if (!letter) return entries;

  return entries.flatMap((entry) => {
    if (isShortcutFolder(entry.shortcut)) {
      return getShortcutChildren(entry.shortcut)
        .filter((child) => resolveShortcutIndexLetter(child) === letter)
        .map((child) => ({
          shortcut: child,
          rootIndex: entry.rootIndex,
          parentFolderId: entry.shortcut.id,
        }));
    }

    if (resolveShortcutIndexLetter(entry.shortcut) !== letter) {
      return [];
    }

    return [entry];
  });
}
