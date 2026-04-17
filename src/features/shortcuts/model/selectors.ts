import type { ScenarioShortcuts, Shortcut } from '@/types';
import type { ShortcutContainerPath, ShortcutFolder } from './types';
import { isRootShortcutsPath } from './paths';

export function isShortcutFolder(shortcut: Shortcut | null | undefined): shortcut is ShortcutFolder {
  return Boolean(shortcut && shortcut.kind === 'folder' && Array.isArray(shortcut.children));
}

export function isShortcutLink(shortcut: Shortcut | null | undefined): shortcut is Shortcut {
  return Boolean(shortcut && !isShortcutFolder(shortcut));
}

export function getShortcutChildren(shortcut: Shortcut | null | undefined): Shortcut[] {
  return isShortcutFolder(shortcut) ? shortcut.children : [];
}

export function collectShortcutIds(shortcuts: readonly Shortcut[]): string[] {
  const ids: string[] = [];

  const visit = (items: readonly Shortcut[]) => {
    items.forEach((shortcut) => {
      ids.push(shortcut.id);
      if (isShortcutFolder(shortcut)) {
        visit(shortcut.children);
      }
    });
  };

  visit(shortcuts);
  return ids;
}

export function countShortcutLinks(shortcuts: readonly Shortcut[]): number {
  return flattenShortcutLinks(shortcuts).length;
}

export function findShortcutById(shortcuts: readonly Shortcut[], shortcutId: string): Shortcut | null {
  for (const shortcut of shortcuts) {
    if (shortcut.id === shortcutId) {
      return shortcut;
    }
    if (isShortcutFolder(shortcut)) {
      const nested = findShortcutById(shortcut.children, shortcutId);
      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

export function findContainerShortcuts(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
): readonly Shortcut[] | null {
  if (isRootShortcutsPath(path)) {
    return shortcuts;
  }

  const folder = findShortcutById(shortcuts, path.folderId);
  return isShortcutFolder(folder) ? folder.children : null;
}

export function flattenShortcutLinks(shortcuts: readonly Shortcut[]): Shortcut[] {
  const links: Shortcut[] = [];

  shortcuts.forEach((shortcut) => {
    if (isShortcutFolder(shortcut)) {
      links.push(...flattenShortcutLinks(shortcut.children));
      return;
    }
    links.push(shortcut);
  });

  return links;
}

export function flattenScenarioShortcutLinks(scenarios: ScenarioShortcuts): Shortcut[] {
  return Object.values(scenarios).flatMap((shortcuts) => flattenShortcutLinks(shortcuts));
}

export function mapShortcutTree(
  shortcuts: readonly Shortcut[],
  mapper: (shortcut: Shortcut) => Shortcut,
): Shortcut[] {
  return shortcuts.map((shortcut) => {
    const nextShortcut = isShortcutFolder(shortcut)
      ? mapper({
          ...shortcut,
          children: mapShortcutTree(shortcut.children, mapper),
        })
      : mapper(shortcut);

    if (isShortcutFolder(nextShortcut) && !Array.isArray(nextShortcut.children)) {
      return {
        ...nextShortcut,
        children: [],
      };
    }

    return nextShortcut;
  });
}

export function removeShortcutById(shortcuts: readonly Shortcut[], shortcutId: string): Shortcut[] {
  const nextShortcuts: Shortcut[] = [];

  shortcuts.forEach((shortcut) => {
    if (shortcut.id === shortcutId) {
      return;
    }

    if (isShortcutFolder(shortcut)) {
      nextShortcuts.push({
        ...shortcut,
        children: removeShortcutById(shortcut.children, shortcutId),
      });
      return;
    }

    nextShortcuts.push(shortcut);
  });

  return nextShortcuts;
}
