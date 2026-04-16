import type { PointerPoint } from './gridDragEngine';
import type {
  BigFolderFootprint,
  GridCellCoord,
  GridWorldSpec,
  SerpentineGridCell,
} from './types';
import type { RectLike } from './worldCoordinates';

function normalizeGridWorldSpec(spec: GridWorldSpec): Required<GridWorldSpec> {
  return {
    columns: Math.max(1, Math.floor(spec.columns)),
    cellSize: Math.max(1, spec.cellSize),
    origin: spec.origin ?? { x: 0, y: 0 },
    rowCount: spec.rowCount == null ? Number.POSITIVE_INFINITY : Math.max(1, Math.floor(spec.rowCount)),
  };
}

function clampCellCoord(coord: GridCellCoord, spec: Required<GridWorldSpec>): GridCellCoord {
  const maxColumn = Math.max(0, spec.columns - 1);
  const maxRow = Number.isFinite(spec.rowCount) ? Math.max(0, spec.rowCount - 1) : Number.POSITIVE_INFINITY;

  return {
    row: Math.min(Math.max(coord.row, 0), maxRow),
    column: Math.min(Math.max(coord.column, 0), maxColumn),
  };
}

function clampFootprintStart(value: number, span: number, limit: number): number {
  const maxStart = Math.max(limit - span, 0);
  return Math.min(Math.max(value, 0), maxStart);
}

export function isSerpentineRowReversed(row: number): boolean {
  return Math.max(0, Math.floor(row)) % 2 === 1;
}

export function getSerpentineCoordFromSequence(sequence: number, columns: number): GridCellCoord {
  const safeColumns = Math.max(1, Math.floor(columns));
  const safeSequence = Math.max(0, Math.floor(sequence));
  const row = Math.floor(safeSequence / safeColumns);
  const columnOffset = safeSequence % safeColumns;

  return {
    row,
    column: isSerpentineRowReversed(row)
      ? safeColumns - 1 - columnOffset
      : columnOffset,
  };
}

export function getSequenceFromSerpentineCoord(coord: GridCellCoord, columns: number): number {
  const safeColumns = Math.max(1, Math.floor(columns));
  const safeCoord = {
    row: Math.max(0, Math.floor(coord.row)),
    column: Math.min(Math.max(Math.floor(coord.column), 0), safeColumns - 1),
  };
  const columnOffset = isSerpentineRowReversed(safeCoord.row)
    ? safeColumns - 1 - safeCoord.column
    : safeCoord.column;

  return safeCoord.row * safeColumns + columnOffset;
}

export function getSerpentineCellFromSequence(sequence: number, columns: number): SerpentineGridCell {
  const coord = getSerpentineCoordFromSequence(sequence, columns);
  return {
    sequence: getSequenceFromSerpentineCoord(coord, columns),
    row: coord.row,
    column: coord.column,
  };
}

export function getSerpentineCellBounds(params: {
  coord: GridCellCoord;
  gridSpec: GridWorldSpec;
}): RectLike {
  const { coord, gridSpec } = params;
  const spec = normalizeGridWorldSpec(gridSpec);
  const safeCoord = clampCellCoord(coord, spec);
  const left = spec.origin.x + safeCoord.column * spec.cellSize;
  const top = spec.origin.y + safeCoord.row * spec.cellSize;

  return {
    left,
    top,
    right: left + spec.cellSize,
    bottom: top + spec.cellSize,
    width: spec.cellSize,
    height: spec.cellSize,
  };
}

export function getSerpentineCellCoordFromGlobalPoint(params: {
  globalPoint: PointerPoint;
  gridSpec: GridWorldSpec;
}): GridCellCoord {
  const { globalPoint, gridSpec } = params;
  const spec = normalizeGridWorldSpec(gridSpec);

  return clampCellCoord({
    column: Math.floor((globalPoint.x - spec.origin.x) / spec.cellSize),
    row: Math.floor((globalPoint.y - spec.origin.y) / spec.cellSize),
  }, spec);
}

export function getSerpentineCellFromGlobalPoint(params: {
  globalPoint: PointerPoint;
  gridSpec: GridWorldSpec;
}): SerpentineGridCell {
  const { globalPoint, gridSpec } = params;
  const spec = normalizeGridWorldSpec(gridSpec);
  const coord = getSerpentineCellCoordFromGlobalPoint({
    globalPoint,
    gridSpec: spec,
  });

  return {
    row: coord.row,
    column: coord.column,
    sequence: getSequenceFromSerpentineCoord(coord, spec.columns),
  };
}

export function getSerpentineSequenceFromGlobalPoint(params: {
  globalPoint: PointerPoint;
  gridSpec: GridWorldSpec;
}): number {
  return getSerpentineCellFromGlobalPoint(params).sequence;
}

export function getSerpentineFootprintCells(params: {
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
  columns: number;
}): SerpentineGridCell[] {
  const {
    columnStart,
    rowStart,
    columnSpan,
    rowSpan,
    columns,
  } = params;
  const safeColumns = Math.max(1, Math.floor(columns));
  const safeColumnSpan = Math.max(1, Math.floor(columnSpan));
  const safeRowSpan = Math.max(1, Math.floor(rowSpan));
  const cells: SerpentineGridCell[] = [];

  for (let rowOffset = 0; rowOffset < safeRowSpan; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < safeColumnSpan; columnOffset += 1) {
      const row = Math.max(0, Math.floor(rowStart)) + rowOffset;
      const column = Math.max(0, Math.floor(columnStart)) + columnOffset;
      cells.push({
        row,
        column,
        sequence: getSequenceFromSerpentineCoord({ row, column }, safeColumns),
      });
    }
  }

  return cells.sort((left, right) => left.sequence - right.sequence);
}

export function getBigFolderFootprintFromGlobalPoint(params: {
  globalPoint: PointerPoint;
  gridSpec: GridWorldSpec;
}): BigFolderFootprint | null {
  const { globalPoint, gridSpec } = params;
  const spec = normalizeGridWorldSpec(gridSpec);
  if (spec.columns < 2 || spec.rowCount < 2) {
    return null;
  }

  const centerColumn = Math.round((globalPoint.x - spec.origin.x) / spec.cellSize);
  const centerRow = Math.round((globalPoint.y - spec.origin.y) / spec.cellSize);
  const columnStart = clampFootprintStart(centerColumn - 1, 2, spec.columns);
  const rowLimit = Number.isFinite(spec.rowCount) ? spec.rowCount : Number.MAX_SAFE_INTEGER;
  const rowStart = clampFootprintStart(centerRow - 1, 2, rowLimit);

  return {
    anchorPolicy: 'center',
    columnStart,
    rowStart,
    columnSpan: 2,
    rowSpan: 2,
    cells: getSerpentineFootprintCells({
      columnStart,
      rowStart,
      columnSpan: 2,
      rowSpan: 2,
      columns: spec.columns,
    }),
  };
}
