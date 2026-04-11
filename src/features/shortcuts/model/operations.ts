import type { Shortcut } from '@/types';
import {
  findContainerShortcuts,
  findShortcutById,
  getShortcutChildren,
  isShortcutFolder,
  isShortcutLink,
} from './selectors';
import type { CreateShortcutFolder, ShortcutContainerPath } from './types';

function replaceContainerShortcuts(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
  nextContainerShortcuts: readonly Shortcut[],
): Shortcut[] | null {
  if (path.type === 'root') {
    return [...nextContainerShortcuts];
  }

  const visit = (items: readonly Shortcut[]): readonly Shortcut[] => {
    let changed = false;

    const nextItems = items.map((shortcut) => {
      if (!isShortcutFolder(shortcut)) return shortcut;

      if (shortcut.id === path.folderId) {
        changed = true;
        return {
          ...shortcut,
          children: [...nextContainerShortcuts],
        };
      }

      const currentChildren = getShortcutChildren(shortcut);
      const nextChildren = visit(currentChildren);
      if (nextChildren === currentChildren) return shortcut;

      changed = true;
      return {
        ...shortcut,
        children: [...nextChildren],
      };
    });

    return changed ? nextItems : items;
  };

  const nextShortcuts = visit(shortcuts);
  return nextShortcuts === shortcuts ? null : [...nextShortcuts];
}

function moveItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return [...items];
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function isLargeFolderShortcut(shortcut: Shortcut): boolean {
  return Boolean(isShortcutFolder(shortcut) && shortcut.folderDisplayMode === 'large');
}

export function mergeShortcutsIntoNewFolder(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
  shortcutIds: readonly string[],
  createFolder: CreateShortcutFolder,
): { nextShortcuts: Shortcut[]; folder: Shortcut } | null {
  const container = findContainerShortcuts(shortcuts, path);
  if (!container) return null;

  const requestedIds = new Set(shortcutIds.filter((id) => typeof id === 'string' && id.length > 0));
  if (requestedIds.size < 2) return null;

  const selectedEntries = container
    .map((shortcut, index) => ({ shortcut, index }))
    .filter(({ shortcut }) => requestedIds.has(shortcut.id) && isShortcutLink(shortcut));

  if (selectedEntries.length < 2) return null;

  const selectedIds = new Set(selectedEntries.map(({ shortcut }) => shortcut.id));
  const folderChildren = selectedEntries.map(({ shortcut }) => shortcut);
  const folder = createFolder(folderChildren);
  const insertIndex = selectedEntries[0].index;
  const nextContainerShortcuts: Shortcut[] = [];

  container.forEach((shortcut, index) => {
    if (index === insertIndex) {
      nextContainerShortcuts.push(folder);
    }
    if (selectedIds.has(shortcut.id)) return;
    nextContainerShortcuts.push(shortcut);
  });

  const nextShortcuts = replaceContainerShortcuts(shortcuts, path, nextContainerShortcuts);
  if (!nextShortcuts) return null;
  return { nextShortcuts, folder };
}

export function moveShortcutsIntoFolder(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
  shortcutIds: readonly string[],
  folderId: string,
): Shortcut[] | null {
  if (!folderId) return null;

  const container = findContainerShortcuts(shortcuts, path);
  if (!container) return null;

  const requestedIds = new Set(
    shortcutIds
      .filter((id) => typeof id === 'string' && id.length > 0 && id !== folderId),
  );
  if (requestedIds.size === 0) return null;

  const movedShortcuts = container.filter((shortcut) => requestedIds.has(shortcut.id) && isShortcutLink(shortcut));
  if (movedShortcuts.length === 0) return null;

  let targetFound = false;
  const nextContainerShortcuts = container
    .filter((shortcut) => !requestedIds.has(shortcut.id))
    .map((shortcut) => {
      if (shortcut.id !== folderId || !isShortcutFolder(shortcut)) return shortcut;
      targetFound = true;
      return {
        ...shortcut,
        children: [...getShortcutChildren(shortcut), ...movedShortcuts],
      };
    });

  if (!targetFound) return null;
  return replaceContainerShortcuts(shortcuts, path, nextContainerShortcuts);
}

export function moveShortcutIntoFolder(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
  shortcutId: string,
  folderId: string,
): Shortcut[] | null {
  return moveShortcutsIntoFolder(shortcuts, path, [shortcutId], folderId);
}

export function reorderShortcutWithinContainer(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
  shortcutId: string,
  targetIndex: number,
): Shortcut[] | null {
  const container = findContainerShortcuts(shortcuts, path);
  if (!container) return null;

  const currentIndex = container.findIndex((shortcut) => shortcut.id === shortcutId);
  if (currentIndex < 0) return null;

  const clampedTargetIndex = Math.min(Math.max(targetIndex, 0), Math.max(container.length - 1, 0));
  const nextContainerShortcuts = moveItem(container, currentIndex, clampedTargetIndex);
  return replaceContainerShortcuts(shortcuts, path, nextContainerShortcuts);
}

export function reorderRootShortcutPreservingLargeFolderPositions(
  shortcuts: readonly Shortcut[],
  shortcutId: string,
  targetIndex: number,
): Shortcut[] | null {
  const activeShortcut = shortcuts.find((shortcut) => shortcut.id === shortcutId);
  if (!activeShortcut || isLargeFolderShortcut(activeShortcut)) return null;

  const smallPositions = shortcuts.flatMap((shortcut, index) => (
    isLargeFolderShortcut(shortcut) ? [] : [index]
  ));
  if (smallPositions.length === 0) return null;

  const targetSmallOrdinal = (() => {
    const exactOrdinal = smallPositions.indexOf(targetIndex);
    if (exactOrdinal >= 0) return exactOrdinal;
    return smallPositions.filter((position) => position < targetIndex).length;
  })();

  const remainingSmallShortcuts = shortcuts.filter(
    (shortcut) => !isLargeFolderShortcut(shortcut) && shortcut.id !== shortcutId,
  );
  const clampedTargetSmallOrdinal = Math.max(0, Math.min(targetSmallOrdinal, remainingSmallShortcuts.length));
  const projectedSmallShortcuts = [...remainingSmallShortcuts];
  projectedSmallShortcuts.splice(clampedTargetSmallOrdinal, 0, activeShortcut);

  let smallCursor = 0;
  let changed = false;
  const nextShortcuts = shortcuts.map((shortcut) => {
    if (isLargeFolderShortcut(shortcut)) return shortcut;
    const nextShortcut = projectedSmallShortcuts[smallCursor];
    if (!nextShortcut) return shortcut;
    if (nextShortcut.id !== shortcut.id) {
      changed = true;
    }
    smallCursor += 1;
    return nextShortcut;
  });

  return changed ? nextShortcuts : null;
}

export function extractShortcutFromFolder(
  shortcuts: readonly Shortcut[],
  sourceFolderId: string,
  shortcutId: string,
  targetPath: ShortcutContainerPath,
  targetIndex?: number,
): Shortcut[] | null {
  const sourceFolder = findShortcutById(shortcuts, sourceFolderId);
  if (!isShortcutFolder(sourceFolder)) return null;

  const sourceChildren = getShortcutChildren(sourceFolder);
  const movingShortcut = sourceChildren.find((shortcut) => shortcut.id === shortcutId);
  if (!isShortcutLink(movingShortcut)) return null;

  if (targetPath.type === 'folder' && targetPath.folderId === sourceFolderId) {
    return null;
  }

  const afterRemoval = replaceContainerShortcuts(
    shortcuts,
    { type: 'folder', folderId: sourceFolderId },
    sourceChildren.filter((shortcut) => shortcut.id !== shortcutId),
  );
  if (!afterRemoval) return null;

  const normalizedAfterRemoval = sourceChildren.length - 1 <= 1
    ? (dissolveFolder(afterRemoval, sourceFolderId) ?? afterRemoval)
    : afterRemoval;

  const targetContainer = findContainerShortcuts(normalizedAfterRemoval, targetPath);
  if (!targetContainer) return null;

  const insertIndex = Math.min(Math.max(targetIndex ?? targetContainer.length, 0), targetContainer.length);
  const nextTargetContainer = [
    ...targetContainer.slice(0, insertIndex),
    movingShortcut,
    ...targetContainer.slice(insertIndex),
  ];

  return replaceContainerShortcuts(normalizedAfterRemoval, targetPath, nextTargetContainer);
}

export function dissolveFolder(
  shortcuts: readonly Shortcut[],
  folderId: string,
): Shortcut[] | null {
  const visit = (items: readonly Shortcut[]): readonly Shortcut[] => {
    let changed = false;
    const nextItems: Shortcut[] = [];

    items.forEach((shortcut) => {
      if (shortcut.id === folderId && isShortcutFolder(shortcut)) {
        changed = true;
        nextItems.push(...getShortcutChildren(shortcut));
        return;
      }

      if (!isShortcutFolder(shortcut)) {
        nextItems.push(shortcut);
        return;
      }

      const currentChildren = getShortcutChildren(shortcut);
      const nextChildren = visit(currentChildren);
      if (nextChildren !== currentChildren) {
        changed = true;
        nextItems.push({
          ...shortcut,
          children: [...nextChildren],
        });
        return;
      }

      nextItems.push(shortcut);
    });

    return changed ? nextItems : items;
  };

  const nextShortcuts = visit(shortcuts);
  return nextShortcuts === shortcuts ? null : [...nextShortcuts];
}
