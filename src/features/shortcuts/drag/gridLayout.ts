export type GridItemSpan = {
  columnSpan: number;
  rowSpan: number;
};

export type PackedGridItem<T> = T & {
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
};

function canPlaceAt(
  occupied: boolean[][],
  row: number,
  column: number,
  span: GridItemSpan,
  gridColumns: number,
): boolean {
  if (column + span.columnSpan > gridColumns) return false;

  for (let rowOffset = 0; rowOffset < span.rowSpan; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < span.columnSpan; columnOffset += 1) {
      if (occupied[row + rowOffset]?.[column + columnOffset]) {
        return false;
      }
    }
  }

  return true;
}

function occupy(
  occupied: boolean[][],
  row: number,
  column: number,
  span: GridItemSpan,
) {
  for (let rowOffset = 0; rowOffset < span.rowSpan; rowOffset += 1) {
    occupied[row + rowOffset] ||= [];
    for (let columnOffset = 0; columnOffset < span.columnSpan; columnOffset += 1) {
      occupied[row + rowOffset][column + columnOffset] = true;
    }
  }
}

export function packGridItems<T>(params: {
  items: readonly T[];
  gridColumns: number;
  getSpan: (item: T) => GridItemSpan;
}): {
  placedItems: Array<PackedGridItem<T>>;
  rowCount: number;
} {
  const { items, gridColumns, getSpan } = params;
  const occupied: boolean[][] = [];
  const placedItems: Array<PackedGridItem<T>> = [];
  let rowCount = 0;

  items.forEach((item) => {
    const span = getSpan(item);
    let placed = false;
    let row = 0;

    while (!placed) {
      for (let column = 0; column < gridColumns; column += 1) {
        if (!canPlaceAt(occupied, row, column, span, gridColumns)) {
          continue;
        }

        occupy(occupied, row, column, span);
        placedItems.push({
          ...item,
          columnStart: column + 1,
          rowStart: row + 1,
          columnSpan: span.columnSpan,
          rowSpan: span.rowSpan,
        });
        rowCount = Math.max(rowCount, row + span.rowSpan);
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
  placedItem: {
    columnStart: number;
    rowStart: number;
    columnSpan: number;
  };
  gridColumnWidth: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  width: number;
  height: number;
}): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const { placedItem, gridColumnWidth, columnGap, rowHeight, rowGap, width, height } = params;
  const spanWidth = placedItem.columnSpan * gridColumnWidth + (placedItem.columnSpan - 1) * columnGap;

  return {
    left: (placedItem.columnStart - 1) * (gridColumnWidth + columnGap) + (spanWidth - width) / 2,
    top: (placedItem.rowStart - 1) * (rowHeight + rowGap),
    width,
    height,
  };
}

export function getPackedGridItemRenderRect(params: {
  placedItem: {
    columnStart: number;
    rowStart: number;
    columnSpan: number;
  };
  gridColumnWidth: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  minWidth: number;
  height: number;
}): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const spanWidth = params.placedItem.columnSpan * params.gridColumnWidth
    + (params.placedItem.columnSpan - 1) * params.columnGap;
  const width = Math.max(params.minWidth, spanWidth);

  return {
    left: (params.placedItem.columnStart - 1) * (params.gridColumnWidth + params.columnGap)
      + (spanWidth - width) / 2,
    top: (params.placedItem.rowStart - 1) * (params.rowHeight + params.rowGap),
    width,
    height: params.height,
  };
}
