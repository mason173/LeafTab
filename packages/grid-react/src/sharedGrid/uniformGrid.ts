import { type PointerPoint } from '@leaftab/workspace-core';

export type UniformGridMetrics = {
  columns: number;
  columnWidth: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  columnPitch: number;
  rowPitch: number;
};

export type UniformGridCellHit = {
  column: number;
  row: number;
  slotIndex: number;
  cellLeft: number;
  cellTop: number;
  cellOffsetX: number;
  cellOffsetY: number;
};

export function buildUniformGridMetrics(params: {
  rootRect: Pick<DOMRect, 'width'>;
  columns: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
}): UniformGridMetrics | null {
  const safeColumns = Math.max(params.columns, 1);
  const columnWidth = (
    params.rootRect.width - params.columnGap * Math.max(0, safeColumns - 1)
  ) / safeColumns;
  if (columnWidth <= 0 || params.rowHeight <= 0) {
    return null;
  }

  return {
    columns: safeColumns,
    columnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
    columnPitch: columnWidth + params.columnGap,
    rowPitch: params.rowHeight + params.rowGap,
  };
}

export function resolveUniformGridCellHit(params: {
  point: PointerPoint;
  rootRect: Pick<DOMRect, 'left' | 'top'>;
  metrics: UniformGridMetrics;
  mode?: 'strict' | 'clamped';
}): UniformGridCellHit | null {
  const { point, rootRect, metrics, mode = 'strict' } = params;
  const strict = mode === 'strict';
  const rawLocalX = point.x - rootRect.left;
  const rawLocalY = point.y - rootRect.top;
  const localX = strict ? rawLocalX : Math.max(0, rawLocalX);
  const localY = strict ? rawLocalY : Math.max(0, rawLocalY);

  let column = Math.floor(localX / metrics.columnPitch);
  let row = Math.floor(localY / metrics.rowPitch);

  if (strict) {
    if (column < 0 || column >= metrics.columns || row < 0) {
      return null;
    }
  } else {
    column = Math.max(0, Math.min(metrics.columns - 1, column));
    row = Math.max(0, row);
  }

  const cellLeft = rootRect.left + column * metrics.columnPitch;
  const cellTop = rootRect.top + row * metrics.rowPitch;
  const cellOffsetX = localX - column * metrics.columnPitch;
  const cellOffsetY = localY - row * metrics.rowPitch;

  if (
    strict
    && (
      cellOffsetX < 0
      || cellOffsetX > metrics.columnWidth
      || cellOffsetY < 0
      || cellOffsetY > metrics.rowHeight
    )
  ) {
    return null;
  }

  return {
    column,
    row,
    slotIndex: row * metrics.columns + column,
    cellLeft,
    cellTop,
    cellOffsetX,
    cellOffsetY,
  };
}
