import type { ScenarioShortcuts, Shortcut } from '@/types';
import type { ShortcutContainerPath, ShortcutFolder } from './types';

export function isShortcutFolder(shortcut: Shortcut | null | undefined): shortcut is ShortcutFolder {
  return Boolean(
    shortcut && (
      shortcut.kind === 'folder'
      || (
        typeof shortcut.kind === 'undefined'
        && Array.isArray(shortcut.children)
        && shortcut.children.length > 0
      )
    ),
  );
}

export function isShortcutLink(shortcut: Shortcut | null | undefined): shortcut is Shortcut {
  return Boolean(shortcut) && !isShortcutFolder(shortcut);
}

export function getShortcutChildren(shortcut: Shortcut | null | undefined): Shortcut[] {
  if (!isShortcutFolder(shortcut)) return [];
  return Array.isArray(shortcut.children) ? shortcut.children.filter(Boolean) : [];
}

export function flattenShortcutLinks(shortcuts: readonly Shortcut[]): Shortcut[] {
  const flat: Shortcut[] = [];
  shortcuts.forEach((shortcut) => {
    if (isShortcutFolder(shortcut)) {
      flat.push(...flattenShortcutLinks(getShortcutChildren(shortcut)));
      return;
    }
    flat.push(shortcut);
  });
  return flat;
}

export function flattenScenarioShortcutLinks(scenarioShortcuts: ScenarioShortcuts): Shortcut[] {
  return Object.values(scenarioShortcuts).flatMap((shortcuts) => flattenShortcutLinks(shortcuts || []));
}

export function countShortcutLinks(shortcuts: readonly Shortcut[]): number {
  return flattenShortcutLinks(shortcuts).length;
}

export function collectShortcutIds(shortcuts: readonly Shortcut[]): string[] {
  const ids: string[] = [];
  shortcuts.forEach((shortcut) => {
    ids.push(shortcut.id);
    if (isShortcutFolder(shortcut)) {
      ids.push(...collectShortcutIds(getShortcutChildren(shortcut)));
    }
  });
  return ids;
}

export function findShortcutById(shortcuts: readonly Shortcut[], targetId: string): Shortcut | null {
  for (const shortcut of shortcuts) {
    if (shortcut.id === targetId) return shortcut;
    if (isShortcutFolder(shortcut)) {
      const found = findShortcutById(getShortcutChildren(shortcut), targetId);
      if (found) return found;
    }
  }
  return null;
}

export function findContainerShortcuts(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
): Shortcut[] | null {
  if (path.type === 'root') return [...shortcuts];
  const folder = findShortcutById(shortcuts, path.folderId);
  if (!isShortcutFolder(folder)) return null;
  return getShortcutChildren(folder);
}

export function removeShortcutById(shortcuts: readonly Shortcut[], targetId: string): Shortcut[] {
  return shortcuts
    .filter((shortcut) => shortcut.id !== targetId)
    .map((shortcut) => {
      if (!isShortcutFolder(shortcut)) return shortcut;
      return {
        ...shortcut,
        children: removeShortcutById(getShortcutChildren(shortcut), targetId).filter(isShortcutLink),
      };
    });
}

export function mapShortcutTree(
  shortcuts: readonly Shortcut[],
  mapper: (shortcut: Shortcut) => Shortcut,
): Shortcut[] {
  return shortcuts.map((shortcut) => {
    const nextShortcut = mapper(shortcut);
    if (!isShortcutFolder(nextShortcut)) return nextShortcut;
    return {
      ...nextShortcut,
      children: mapShortcutTree(getShortcutChildren(nextShortcut), mapper).filter(isShortcutLink),
    };
  });
}
