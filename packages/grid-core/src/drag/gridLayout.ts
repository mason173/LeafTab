export type GridItemSpan = {
  columnSpan: number;
  rowSpan: number;
};

export type PackedGridItem<TItem> = TItem & {
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
};

function canPlaceGridItem(params: {
  occupied: boolean[][];
  row: number;
  column: number;
  columnSpan: number;
  rowSpan: number;
  gridColumns: number;
}): boolean {
  const { occupied, row, column, columnSpan, rowSpan, gridColumns } = params;
  if (column + columnSpan > gridColumns) return false;

  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    const occupiedRow = occupied[row + rowOffset] ?? [];
    for (let columnOffset = 0; columnOffset < columnSpan; columnOffset += 1) {
      if (occupiedRow[column + columnOffset]) return false;
    }
  }

  return true;
}

function occupyGridSlots(params: {
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

export function packGridItems<TItem>(params: {
  items: TItem[];
  gridColumns: number;
  getSpan: (item: TItem) => GridItemSpan;
}): {
  placedItems: PackedGridItem<TItem>[];
  rowCount: number;
} {
  const { items, gridColumns, getSpan } = params;
  const safeGridColumns = Math.max(gridColumns, 1);
  const occupied: boolean[][] = [];
  const placedItems: PackedGridItem<TItem>[] = [];
  let rowCount = 0;

  items.forEach((item) => {
    const span = getSpan(item);
    const columnSpan = Math.max(1, Math.min(span.columnSpan, safeGridColumns));
    const rowSpan = Math.max(1, span.rowSpan);
    let placed = false;
    let row = 0;

    while (!placed) {
      for (let column = 0; column < safeGridColumns; column += 1) {
        if (!canPlaceGridItem({
          occupied,
          row,
          column,
          columnSpan,
          rowSpan,
          gridColumns: safeGridColumns,
        })) {
          continue;
        }

        occupyGridSlots({
          occupied,
          row,
          column,
          columnSpan,
          rowSpan,
        });

        placedItems.push({
          ...item,
          columnStart: column + 1,
          rowStart: row + 1,
          columnSpan,
          rowSpan,
        });
        rowCount = Math.max(rowCount, row + rowSpan);
        placed = true;
        break;
      }

      row += 1;
    }
  });

  return {
    placedItems,
    rowCount,
  };
}

export function getProjectedGridItemRect(params: {
  placedItem: Pick<PackedGridItem<unknown>, 'columnStart' | 'rowStart' | 'columnSpan'>;
  gridColumnWidth: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  width: number;
  height: number;
}): { left: number; top: number; width: number; height: number } {
  const { placedItem, gridColumnWidth, columnGap, rowHeight, rowGap, width, height } = params;
  const spanWidth = gridColumnWidth * placedItem.columnSpan + columnGap * Math.max(0, placedItem.columnSpan - 1);

  return {
    left: (placedItem.columnStart - 1) * (gridColumnWidth + columnGap) + Math.max(0, (spanWidth - width) / 2),
    top: (placedItem.rowStart - 1) * (rowHeight + rowGap),
    width,
    height,
  };
}
