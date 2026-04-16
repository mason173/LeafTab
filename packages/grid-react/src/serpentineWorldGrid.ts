import { getSerpentineCoordFromSequence } from '@leaftab/workspace-core';

export type SerpentineGridSpan = {
  columnSpan: number;
  rowSpan: number;
};

export type SerpentinePackedGridItem<TItem> = TItem & {
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
  firstSequence: number;
};

function canPlaceSerpentineGridItem(params: {
  occupied: boolean[][];
  row: number;
  column: number;
  columnSpan: number;
  rowSpan: number;
  gridColumns: number;
}): boolean {
  const { occupied, row, column, columnSpan, rowSpan, gridColumns } = params;
  if (column + columnSpan > gridColumns) {
    return false;
  }

  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    const occupiedRow = occupied[row + rowOffset] ?? [];
    for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
      if (occupiedRow[column + columnOffset]) {
        return false;
      }
    }
  }

  return true;
}

function occupySerpentineGridItem(params: {
  occupied: boolean[][];
  row: number;
  column: number;
  columnSpan: number;
  rowSpan: number;
}) {
  const { occupied, row, column, columnSpan, rowSpan } = params;

  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    const targetRow = row + rowOffset;
    if (!occupied[targetRow]) {
      occupied[targetRow] = [];
    }

    for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
      occupied[targetRow][column + columnOffset] = true;
    }
  }
}

export function packItemsIntoSerpentineGrid<TItem>(params: {
  items: TItem[];
  gridColumns: number;
  getSpan: (item: TItem) => SerpentineGridSpan;
}): {
  placedItems: SerpentinePackedGridItem<TItem>[];
  rowCount: number;
} {
  const { items, gridColumns, getSpan } = params;
  const safeGridColumns = Math.max(1, Math.floor(gridColumns));
  const occupied: boolean[][] = [];
  const placedItems: SerpentinePackedGridItem<TItem>[] = [];
  let rowCount = 0;

  items.forEach((item) => {
    const span = getSpan(item);
    const columnSpan = Math.max(1, Math.min(Math.floor(span.columnSpan), safeGridColumns));
    const rowSpan = Math.max(1, Math.floor(span.rowSpan));
    let candidateSequence = 0;
    let placed = false;

    while (!placed) {
      const candidateCoord = getSerpentineCoordFromSequence(candidateSequence, safeGridColumns);

      if (!canPlaceSerpentineGridItem({
        occupied,
        row: candidateCoord.row,
        column: candidateCoord.column,
        columnSpan,
        rowSpan,
        gridColumns: safeGridColumns,
      })) {
        candidateSequence += 1;
        continue;
      }

      occupySerpentineGridItem({
        occupied,
        row: candidateCoord.row,
        column: candidateCoord.column,
        columnSpan,
        rowSpan,
      });

      placedItems.push({
        ...item,
        columnStart: candidateCoord.column + 1,
        rowStart: candidateCoord.row + 1,
        columnSpan,
        rowSpan,
        firstSequence: candidateSequence,
      });
      rowCount = Math.max(rowCount, candidateCoord.row + rowSpan);
      placed = true;
    }
  });

  return {
    placedItems,
    rowCount,
  };
}
