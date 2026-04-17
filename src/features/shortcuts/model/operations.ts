import type { Shortcut } from '@/types';
import { ROOT_SHORTCUTS_PATH, isRootShortcutsPath } from './paths';
import type { CreateShortcutFolder, ShortcutContainerPath, ShortcutFolder } from './types';
import { findContainerShortcuts, findShortcutById, getShortcutChildren, isShortcutFolder, isShortcutLink } from './selectors';

function reorderArray<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= items.length) return [...items];

  const nextItems = [...items];
  const [moved] = nextItems.splice(fromIndex, 1);
  const clampedTarget = Math.max(0, Math.min(toIndex, nextItems.length));
  nextItems.splice(clampedTarget, 0, moved);
  return nextItems;
}

function clampInsertionIndex(targetIndex: number, length: number): number {
  return Math.max(0, Math.min(targetIndex, length));
}

function replaceContainerShortcuts(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
  nextChildren: readonly Shortcut[],
): Shortcut[] | null {
  if (isRootShortcutsPath(path)) {
    return [...nextChildren];
  }

  let changed = false;
  const nextShortcuts = shortcuts.map((shortcut) => {
    if (!isShortcutFolder(shortcut) || shortcut.id !== path.folderId) {
      return shortcut;
    }
    changed = true;
    return {
      ...shortcut,
      children: [...nextChildren],
    };
  });

  return changed ? nextShortcuts : null;
}

function replaceRootFolder(shortcuts: readonly Shortcut[], folderId: string, replacement: readonly Shortcut[]): Shortcut[] | null {
  const folderIndex = shortcuts.findIndex((shortcut) => shortcut.id === folderId && isShortcutFolder(shortcut));
  if (folderIndex === -1) return null;

  return [
    ...shortcuts.slice(0, folderIndex),
    ...replacement,
    ...shortcuts.slice(folderIndex + 1),
  ];
}

function isLargeFolder(shortcut: Shortcut | null | undefined): shortcut is ShortcutFolder {
  return Boolean(isShortcutFolder(shortcut) && (shortcut.folderDisplayMode || 'small') === 'large');
}

function insertRootShortcutPreservingLargeFolderPositions(
  shortcuts: readonly Shortcut[],
  shortcut: Shortcut,
  targetIndex: number,
): Shortcut[] {
  if (isLargeFolder(shortcut)) {
    const insertionIndex = clampInsertionIndex(targetIndex, shortcuts.length);
    const nextShortcuts = [...shortcuts];
    nextShortcuts.splice(insertionIndex, 0, shortcut);
    return nextShortcuts;
  }

  const fixedLargeFolderEntries = shortcuts
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => isLargeFolder(item));
  const fixedLargeFolderIndexes = new Set(fixedLargeFolderEntries.map(({ index }) => index));
  const resultLength = shortcuts.length + 1;
  const availableIndexes = Array.from({ length: resultLength }, (_, index) => index)
    .filter((index) => !fixedLargeFolderIndexes.has(index));
  const movableShortcuts = shortcuts.filter((item) => !isLargeFolder(item));
  const desiredRank = availableIndexes.filter((index) => index < targetIndex).length;
  const insertionRank = clampInsertionIndex(desiredRank, movableShortcuts.length);
  const reorderedMovableShortcuts = [...movableShortcuts];
  reorderedMovableShortcuts.splice(insertionRank, 0, shortcut);

  const nextShortcuts = new Array<Shortcut>(resultLength);
  fixedLargeFolderEntries.forEach(({ item, index }) => {
    nextShortcuts[index] = item;
  });

  let movableCursor = 0;
  for (let index = 0; index < resultLength; index += 1) {
    if (fixedLargeFolderIndexes.has(index)) {
      continue;
    }
    nextShortcuts[index] = reorderedMovableShortcuts[movableCursor] ?? nextShortcuts[index];
    movableCursor += 1;
  }

  return nextShortcuts.filter((item): item is Shortcut => Boolean(item));
}

export function mergeShortcutsIntoNewFolder(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
  shortcutIds: readonly string[],
  createFolder: CreateShortcutFolder,
  anchorShortcutId?: string,
): { nextShortcuts: Shortcut[]; folder: Shortcut } | null {
  const container = findContainerShortcuts(shortcuts, path);
  if (!container) return null;

  const selectedIds = new Set(shortcutIds);
  const selectedEntries = container
    .map((shortcut, index) => ({ shortcut, index }))
    .filter(({ shortcut }) => selectedIds.has(shortcut.id) && isShortcutLink(shortcut));

  if (selectedEntries.length < 2) return null;

  const selectedIndexSet = new Set(selectedEntries.map(({ index }) => index));
  const insertAt = anchorShortcutId
    ? Math.max(0, container.findIndex((shortcut) => shortcut.id === anchorShortcutId))
    : selectedEntries[0]?.index ?? 0;
  const folderChildren = selectedEntries.map(({ shortcut }) => shortcut);
  const folder = createFolder(folderChildren);
  const nextContainer: Shortcut[] = [];

  container.forEach((shortcut, index) => {
    if (index === insertAt) {
      nextContainer.push(folder);
    }
    if (!selectedIndexSet.has(index)) {
      nextContainer.push(shortcut);
    }
  });

  if (insertAt >= container.length) {
    nextContainer.push(folder);
  }

  const nextShortcuts = replaceContainerShortcuts(shortcuts, path, nextContainer);
  return nextShortcuts ? { nextShortcuts, folder } : null;
}

export function moveShortcutIntoFolder(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
  shortcutId: string,
  folderId: string,
): Shortcut[] | null {
  return moveShortcutsIntoFolder(shortcuts, path, [shortcutId], folderId);
}

export function moveShortcutsIntoFolder(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
  shortcutIds: readonly string[],
  folderId: string,
): Shortcut[] | null {
  const container = findContainerShortcuts(shortcuts, path);
  if (!container) return null;

  const targetFolder = container.find((shortcut) => shortcut.id === folderId);
  if (!isShortcutFolder(targetFolder)) return null;

  const selectedIdSet = new Set(
    shortcutIds.filter((shortcutId) => shortcutId !== folderId),
  );
  const movingShortcuts = container.filter((shortcut) => selectedIdSet.has(shortcut.id) && isShortcutLink(shortcut));
  if (movingShortcuts.length === 0) return null;

  const nextContainer = container.flatMap((shortcut) => {
    if (selectedIdSet.has(shortcut.id)) {
      return [];
    }
    if (shortcut.id !== folderId || !isShortcutFolder(shortcut)) {
      return [shortcut];
    }
    return [{
      ...shortcut,
      children: [
        ...getShortcutChildren(shortcut),
        ...movingShortcuts,
      ],
    }];
  });

  return replaceContainerShortcuts(shortcuts, path, nextContainer);
}

export function reorderShortcutWithinContainer(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
  shortcutId: string,
  targetIndex: number,
): Shortcut[] | null {
  const container = findContainerShortcuts(shortcuts, path);
  if (!container) return null;

  const sourceIndex = container.findIndex((shortcut) => shortcut.id === shortcutId);
  if (sourceIndex === -1) return null;

  const nextContainer = reorderArray(container, sourceIndex, targetIndex);
  return replaceContainerShortcuts(shortcuts, path, nextContainer);
}

export function reorderRootShortcutPreservingLargeFolderPositions(
  shortcuts: readonly Shortcut[],
  shortcutId: string,
  targetIndex: number,
): Shortcut[] | null {
  const sourceIndex = shortcuts.findIndex((shortcut) => shortcut.id === shortcutId);
  if (sourceIndex === -1) return null;

  const activeShortcut = shortcuts[sourceIndex];
  if (isLargeFolder(activeShortcut)) {
    return reorderArray(shortcuts, sourceIndex, targetIndex);
  }

  const baseShortcuts = shortcuts.filter((shortcut) => shortcut.id !== shortcutId);
  return insertRootShortcutPreservingLargeFolderPositions(baseShortcuts, activeShortcut, targetIndex);
}

export function resolveRootShortcutInsertionIndexPreservingLargeFolderPositions(
  shortcuts: readonly Shortcut[],
  shortcutId: string,
  targetIndex: number,
): number | null {
  const reorderedShortcuts = reorderRootShortcutPreservingLargeFolderPositions(
    shortcuts,
    shortcutId,
    targetIndex,
  );
  if (!reorderedShortcuts) {
    return null;
  }

  const insertionIndex = reorderedShortcuts.findIndex((shortcut) => shortcut.id === shortcutId);
  return insertionIndex >= 0 ? insertionIndex : null;
}

export function extractShortcutFromFolder(
  shortcuts: readonly Shortcut[],
  folderId: string,
  shortcutId: string,
  destinationPath: ShortcutContainerPath,
  targetIndex: number,
): Shortcut[] | null {
  const sourceFolder = findShortcutById(shortcuts, folderId);
  if (!isShortcutFolder(sourceFolder)) return null;

  const childIndex = sourceFolder.children.findIndex((child) => child.id === shortcutId);
  if (childIndex === -1) return null;

  const extractedShortcut = sourceFolder.children[childIndex];
  const remainingChildren = sourceFolder.children.filter((child) => child.id !== shortcutId);
  const sourceRootIndex = shortcuts.findIndex((shortcut) => shortcut.id === folderId);
  if (sourceRootIndex === -1) return null;

  const sourceReplacement = remainingChildren.length === 0
    ? []
    : remainingChildren.length === 1
      ? remainingChildren
      : [{ ...sourceFolder, children: remainingChildren }];
  const nextRootShortcuts = replaceRootFolder(shortcuts, folderId, sourceReplacement);
  if (!nextRootShortcuts) return null;

  if (!isRootShortcutsPath(destinationPath)) {
    const destinationContainer = findContainerShortcuts(nextRootShortcuts, destinationPath);
    if (!destinationContainer) return null;
    const insertionIndex = Math.max(0, Math.min(targetIndex, destinationContainer.length));
    const nextDestinationContainer = [...destinationContainer];
    nextDestinationContainer.splice(insertionIndex, 0, extractedShortcut);
    return replaceContainerShortcuts(nextRootShortcuts, destinationPath, nextDestinationContainer);
  }

  const insertionIndex = Math.max(0, Math.min(targetIndex, nextRootShortcuts.length));
  return insertRootShortcutPreservingLargeFolderPositions(
    nextRootShortcuts,
    extractedShortcut,
    insertionIndex,
  );
}

export function dissolveFolder(shortcuts: readonly Shortcut[], folderId: string): Shortcut[] | null {
  const folder = findShortcutById(shortcuts, folderId);
  if (!isShortcutFolder(folder)) return null;

  return replaceRootFolder(shortcuts, folderId, folder.children);
}

export { ROOT_SHORTCUTS_PATH };
