import type { Shortcut } from '@/types';
import { resolveShortcutIndexLetter } from '@/components/home/drawerShortcutAlphabetIndex';
import {
  buildShortcutSearchMatchIndex,
  matchesShortcutSearchQuery,
} from '@/utils/shortcutSearch';
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
    if (entry.parentFolderId) {
      return [entry.shortcut];
    }

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
    if (entry.parentFolderId) {
      return resolveShortcutIndexLetter(entry.shortcut) === letter ? [entry] : [];
    }

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

function collectMatchingFolderChildren(
  children: readonly Shortcut[],
  rootIndex: number,
  parentFolderId: string,
  normalizedQuery: string,
): DrawerShortcutEntry[] {
  return children.flatMap((child) => {
    if (isShortcutFolder(child)) {
      return collectMatchingFolderChildren(
        getShortcutChildren(child),
        rootIndex,
        child.id,
        normalizedQuery,
      );
    }

    return matchesShortcutSearchQuery(
      buildShortcutSearchMatchIndex(child),
      normalizedQuery,
    )
      ? [{
          shortcut: child,
          rootIndex,
          parentFolderId,
        }]
      : [];
  });
}

export function searchDrawerShortcutEntries(
  entries: DrawerShortcutEntry[],
  normalizedQuery: string,
): DrawerShortcutEntry[] {
  if (!normalizedQuery) return entries;

  return entries.flatMap((entry) => {
    if (entry.parentFolderId) {
      return matchesShortcutSearchQuery(
        buildShortcutSearchMatchIndex(entry.shortcut),
        normalizedQuery,
      ) ? [entry] : [];
    }

    if (isShortcutFolder(entry.shortcut)) {
      const matchesFolderShell = matchesShortcutSearchQuery(
        buildShortcutSearchMatchIndex(entry.shortcut),
        normalizedQuery,
      );
      const matchingChildren = collectMatchingFolderChildren(
        getShortcutChildren(entry.shortcut),
        entry.rootIndex,
        entry.shortcut.id,
        normalizedQuery,
      );

      return matchesFolderShell ? [entry, ...matchingChildren] : matchingChildren;
    }

    return matchesShortcutSearchQuery(
      buildShortcutSearchMatchIndex(entry.shortcut),
      normalizedQuery,
    ) ? [entry] : [];
  });
}
