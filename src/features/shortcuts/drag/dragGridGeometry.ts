export function resolveGridColumnWidth(params: {
  gridWidthPx: number | null;
  gridColumns: number;
  columnGap: number;
}): number | null {
  if (typeof params.gridWidthPx !== 'number' || params.gridColumns <= 0) {
    return null;
  }

  return (
    params.gridWidthPx - params.columnGap * Math.max(0, params.gridColumns - 1)
  ) / Math.max(params.gridColumns, 1);
}

export function resolveGridContentHeight(params: {
  rowCount: number;
  rowHeight: number;
  rowGap: number;
}): number {
  return params.rowCount * params.rowHeight + Math.max(0, params.rowCount - 1) * params.rowGap;
}
