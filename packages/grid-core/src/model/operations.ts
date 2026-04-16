import {
  getSerpentineCoordFromSequence,
  getSerpentineFootprintCells,
} from '../drag/serpentineGrid';
import type {
  BigFolderFootprint,
  SerpentineGridCell,
} from '../drag/types';
import type { Shortcut } from '../shortcutTypes';
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

export type ShortcutSequencePlacement = {
  shortcut: Shortcut;
  orderIndex: number;
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
  firstSequence: number;
  cells: SerpentineGridCell[];
};

type ShortcutGridSpan = {
  columnSpan: number;
  rowSpan: number;
};

type FixedShortcutPlacement = {
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
  cells?: SerpentineGridCell[];
};

export function stableInsertItem<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (items.length === 0) {
    return [];
  }

  const clampedFromIndex = Math.max(0, Math.min(fromIndex, items.length - 1));
  const next = [...items];
  const [moved] = next.splice(clampedFromIndex, 1);
  const clampedTargetIndex = Math.max(0, Math.min(toIndex, next.length));
  next.splice(clampedTargetIndex, 0, moved);
  return next;
}

function isLargeFolderShortcut(shortcut: Shortcut): boolean {
  return Boolean(isShortcutFolder(shortcut) && shortcut.folderDisplayMode === 'large');
}

function resolveShortcutGridSpan(shortcut: Shortcut): ShortcutGridSpan {
  return isLargeFolderShortcut(shortcut)
    ? { columnSpan: 2, rowSpan: 2 }
    : { columnSpan: 1, rowSpan: 1 };
}

function buildPlacementCells(params: {
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
  gridColumns: number;
}): SerpentineGridCell[] {
  const { columnStart, rowStart, columnSpan, rowSpan, gridColumns } = params;
  return getSerpentineFootprintCells({
    columnStart,
    rowStart,
    columnSpan,
    rowSpan,
    columns: gridColumns,
  });
}

function cellsIntersect(left: readonly SerpentineGridCell[], right: readonly SerpentineGridCell[]): boolean {
  const rightSequences = new Set(right.map((cell) => cell.sequence));
  return left.some((cell) => rightSequences.has(cell.sequence));
}

function buildPlacementFromCells(params: {
  shortcut: Shortcut;
  orderIndex: number;
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
  cells: SerpentineGridCell[];
}): ShortcutSequencePlacement {
  const { shortcut, orderIndex, columnStart, rowStart, columnSpan, rowSpan, cells } = params;
  return {
    shortcut,
    orderIndex,
    columnStart,
    rowStart,
    columnSpan,
    rowSpan,
    firstSequence: cells[0]?.sequence ?? 0,
    cells,
  };
}

function buildOccupiedSequenceMap(
  fixedPlacements: ReadonlyMap<string, FixedShortcutPlacement>,
  gridColumns: number,
): Map<number, string> {
  const occupied = new Map<number, string>();

  for (const [shortcutId, placement] of fixedPlacements.entries()) {
    const cells = placement.cells ?? buildPlacementCells({
      columnStart: placement.columnStart,
      rowStart: placement.rowStart,
      columnSpan: placement.columnSpan,
      rowSpan: placement.rowSpan,
      gridColumns,
    });

    for (const cell of cells) {
      if (!occupied.has(cell.sequence)) {
        occupied.set(cell.sequence, shortcutId);
      }
    }
  }

  return occupied;
}

function canOccupyPlacement(params: {
  occupied: ReadonlyMap<number, string>;
  candidateShortcutId: string;
  columnStart: number;
  rowStart: number;
  span: ShortcutGridSpan;
  gridColumns: number;
  rowCount?: number;
}): boolean {
  const {
    occupied,
    candidateShortcutId,
    columnStart,
    rowStart,
    span,
    gridColumns,
    rowCount,
  } = params;
  if (columnStart + span.columnSpan > gridColumns) {
    return false;
  }
  if (rowCount != null && rowStart + span.rowSpan > rowCount) {
    return false;
  }

  const cells = buildPlacementCells({
    columnStart,
    rowStart,
    columnSpan: span.columnSpan,
    rowSpan: span.rowSpan,
    gridColumns,
  });

  return cells.every((cell) => {
    const occupiedBy = occupied.get(cell.sequence);
    return occupiedBy == null || occupiedBy === candidateShortcutId;
  });
}

export function packRootShortcutsIntoSerpentineGrid(params: {
  shortcuts: readonly Shortcut[];
  gridColumns: number;
  rowCount?: number;
  fixedPlacements?: ReadonlyMap<string, FixedShortcutPlacement>;
}): ShortcutSequencePlacement[] | null {
  const {
    shortcuts,
    gridColumns,
    rowCount,
    fixedPlacements = new Map<string, FixedShortcutPlacement>(),
  } = params;
  const safeGridColumns = Math.max(1, Math.floor(gridColumns));
  const safeRowCount = rowCount == null ? undefined : Math.max(1, Math.floor(rowCount));
  const occupied = buildOccupiedSequenceMap(fixedPlacements, safeGridColumns);
  const placements: ShortcutSequencePlacement[] = [];

  for (let orderIndex = 0; orderIndex < shortcuts.length; orderIndex += 1) {
    const shortcut = shortcuts[orderIndex];
    const span = resolveShortcutGridSpan(shortcut);
    const fixedPlacement = fixedPlacements.get(shortcut.id) ?? null;

    if (fixedPlacement) {
      const cells = fixedPlacement.cells ?? buildPlacementCells({
        columnStart: fixedPlacement.columnStart,
        rowStart: fixedPlacement.rowStart,
        columnSpan: fixedPlacement.columnSpan,
        rowSpan: fixedPlacement.rowSpan,
        gridColumns: safeGridColumns,
      });

      if (!canOccupyPlacement({
        occupied,
        candidateShortcutId: shortcut.id,
        columnStart: fixedPlacement.columnStart,
        rowStart: fixedPlacement.rowStart,
        span: {
          columnSpan: fixedPlacement.columnSpan,
          rowSpan: fixedPlacement.rowSpan,
        },
        gridColumns: safeGridColumns,
        rowCount: safeRowCount,
      })) {
        return null;
      }

      cells.forEach((cell) => occupied.set(cell.sequence, shortcut.id));
      placements.push(buildPlacementFromCells({
        shortcut,
        orderIndex,
        columnStart: fixedPlacement.columnStart,
        rowStart: fixedPlacement.rowStart,
        columnSpan: fixedPlacement.columnSpan,
        rowSpan: fixedPlacement.rowSpan,
        cells,
      }));
      continue;
    }

    let candidateSequence = 0;
    let placed = false;

    while (!placed) {
      const candidateCoord = getSerpentineCoordFromSequence(candidateSequence, safeGridColumns);
      if (safeRowCount != null && candidateCoord.row >= safeRowCount) {
        return null;
      }

      if (!canOccupyPlacement({
        occupied,
        candidateShortcutId: shortcut.id,
        columnStart: candidateCoord.column,
        rowStart: candidateCoord.row,
        span,
        gridColumns: safeGridColumns,
        rowCount: safeRowCount,
      })) {
        candidateSequence += 1;
        continue;
      }

      const cells = buildPlacementCells({
        columnStart: candidateCoord.column,
        rowStart: candidateCoord.row,
        columnSpan: span.columnSpan,
        rowSpan: span.rowSpan,
        gridColumns: safeGridColumns,
      });

      cells.forEach((cell) => occupied.set(cell.sequence, shortcut.id));
      placements.push(buildPlacementFromCells({
        shortcut,
        orderIndex,
        columnStart: candidateCoord.column,
        rowStart: candidateCoord.row,
        columnSpan: span.columnSpan,
        rowSpan: span.rowSpan,
        cells,
      }));
      placed = true;
    }
  }

  return placements;
}

export function collectBigFolderBlockInsertConflicts(params: {
  placements: readonly ShortcutSequencePlacement[];
  targetFootprint: BigFolderFootprint;
  excludeShortcutId?: string | null;
}): ShortcutSequencePlacement[] {
  const { placements, targetFootprint, excludeShortcutId = null } = params;

  return placements
    .filter((placement) => placement.shortcut.id !== excludeShortcutId)
    .filter((placement) => cellsIntersect(placement.cells, targetFootprint.cells))
    .sort((left, right) => {
      if (left.firstSequence !== right.firstSequence) {
        return left.firstSequence - right.firstSequence;
      }
      return left.orderIndex - right.orderIndex;
    });
}

function sortPlacementsIntoSequenceOrder(
  placements: readonly ShortcutSequencePlacement[],
): ShortcutSequencePlacement[] {
  return [...placements].sort((left, right) => {
    if (left.firstSequence !== right.firstSequence) {
      return left.firstSequence - right.firstSequence;
    }
    return left.orderIndex - right.orderIndex;
  });
}

export function applyBigFolderBlockInsert(params: {
  shortcuts: readonly Shortcut[];
  shortcutId: string;
  targetFootprint: BigFolderFootprint;
  gridColumns: number;
  rowCount?: number;
}): Shortcut[] | null {
  const {
    shortcuts,
    shortcutId,
    targetFootprint,
    gridColumns,
    rowCount,
  } = params;
  const activeShortcut = shortcuts.find((shortcut) => shortcut.id === shortcutId) ?? null;
  if (!activeShortcut || !isLargeFolderShortcut(activeShortcut)) {
    return null;
  }

  const remainingShortcuts = shortcuts.filter((shortcut) => shortcut.id !== shortcutId);
  const currentLayout = packRootShortcutsIntoSerpentineGrid({
    shortcuts: remainingShortcuts,
    gridColumns,
    rowCount,
  });
  if (!currentLayout) {
    return null;
  }

  const conflicts = collectBigFolderBlockInsertConflicts({
    placements: currentLayout,
    targetFootprint,
  });
  const earliestTargetSequence = targetFootprint.cells[0]?.sequence ?? 0;
  const insertionIndex = conflicts.length > 0
    ? Math.min(...conflicts.map((placement) => placement.orderIndex))
    : currentLayout.filter((placement) => placement.firstSequence < earliestTargetSequence).length;
  const projectedOrder = stableInsertItem(
    [...remainingShortcuts, activeShortcut],
    remainingShortcuts.length,
    insertionIndex,
  );
  const projectedLayout = packRootShortcutsIntoSerpentineGrid({
    shortcuts: projectedOrder,
    gridColumns,
    rowCount,
    fixedPlacements: new Map([
      [shortcutId, targetFootprint],
    ]),
  });
  if (!projectedLayout) {
    return null;
  }

  const nextShortcuts = sortPlacementsIntoSequenceOrder(projectedLayout).map((placement) => placement.shortcut);
  const changed = nextShortcuts.some((shortcut, index) => shortcut.id !== shortcuts[index]?.id);
  return changed ? nextShortcuts : null;
}

export function mergeShortcutsIntoNewFolder(
  shortcuts: readonly Shortcut[],
  path: ShortcutContainerPath,
  shortcutIds: readonly string[],
  createFolder: CreateShortcutFolder,
  anchorShortcutId?: string | null,
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
  const anchorEntry = anchorShortcutId
    ? selectedEntries.find(({ shortcut }) => shortcut.id === anchorShortcutId) ?? null
    : null;
  const insertIndex = anchorEntry?.index ?? selectedEntries[0].index;
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
  const nextContainerShortcuts = stableInsertItem(container, currentIndex, clampedTargetIndex);
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
