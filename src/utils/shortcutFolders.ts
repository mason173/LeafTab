import type { ScenarioShortcuts, Shortcut } from '@/types';

export function isShortcutFolder(shortcut: Shortcut | null | undefined): shortcut is Shortcut & { kind: 'folder'; children: Shortcut[] } {
  return Boolean(shortcut && (shortcut.kind === 'folder' || Array.isArray(shortcut.children)));
}

export function isShortcutLink(shortcut: Shortcut | null | undefined): shortcut is Shortcut {
  return Boolean(shortcut) && !isShortcutFolder(shortcut);
}

export function getShortcutChildren(shortcut: Shortcut | null | undefined): Shortcut[] {
  if (!isShortcutFolder(shortcut)) return [];
  return Array.isArray(shortcut.children) ? shortcut.children.filter(Boolean) : [];
}

export function groupTopLevelShortcutsIntoFolder(
  shortcuts: readonly Shortcut[],
  shortcutIds: readonly string[],
  createFolder: (children: Shortcut[]) => Shortcut,
): { nextShortcuts: Shortcut[]; folder: Shortcut } | null {
  const requestedIds = new Set(shortcutIds.filter((id) => typeof id === 'string' && id.length > 0));
  if (requestedIds.size < 2) return null;

  const selectedEntries = shortcuts
    .map((shortcut, index) => ({ shortcut, index }))
    .filter(({ shortcut }) => requestedIds.has(shortcut.id) && isShortcutLink(shortcut));

  if (selectedEntries.length < 2) return null;

  const selectedIds = new Set(selectedEntries.map(({ shortcut }) => shortcut.id));
  const folderChildren = selectedEntries.map(({ shortcut }) => shortcut);
  const folder = createFolder(folderChildren);
  const insertIndex = selectedEntries[0].index;
  const nextShortcuts: Shortcut[] = [];

  shortcuts.forEach((shortcut, index) => {
    if (index === insertIndex) {
      nextShortcuts.push(folder);
    }
    if (selectedIds.has(shortcut.id)) return;
    nextShortcuts.push(shortcut);
  });

  return { nextShortcuts, folder };
}

export function moveTopLevelShortcutIntoFolder(
  shortcuts: readonly Shortcut[],
  shortcutId: string,
  folderId: string,
): Shortcut[] | null {
  if (!shortcutId || !folderId || shortcutId === folderId) return null;

  const movingShortcut = shortcuts.find((shortcut) => shortcut.id === shortcutId);
  const targetFolder = shortcuts.find((shortcut) => shortcut.id === folderId);

  if (!isShortcutLink(movingShortcut) || !isShortcutFolder(targetFolder)) {
    return null;
  }

  let folderFound = false;
  const nextShortcuts = shortcuts
    .filter((shortcut) => shortcut.id !== shortcutId)
    .map((shortcut) => {
      if (shortcut.id !== folderId || !isShortcutFolder(shortcut)) return shortcut;
      folderFound = true;
      return {
        ...shortcut,
        children: [...getShortcutChildren(shortcut), movingShortcut],
      };
    });

  return folderFound ? nextShortcuts : null;
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
