import type { ShortcutLayoutDensity } from '@/components/shortcuts/shortcutCardVariant';
import type { PackedGridItem } from './gridLayout';
import { packGridItems } from './gridLayout';
import { resolveGridColumnWidth, resolveGridContentHeight } from './dragGridGeometry';
import type { RootDragRenderableItem } from './rootDragRenderState';

export const ROOT_GRID_COLUMN_GAP_PX = 16;

export type RootGridLayoutState<T extends RootDragRenderableItem> = {
  columnGap: number;
  rowGap: number;
  rowHeight: number;
  packedLayout: {
    placedItems: Array<PackedGridItem<T>>;
    rowCount: number;
  };
  displayRows: number;
  gridMinHeight: number;
  gridColumnWidth: number | null;
  usesSpanAwareReorder: boolean;
};

export function resolveRootGridRowGap(
  layoutDensity: ShortcutLayoutDensity,
): number {
  if (layoutDensity === 'compact') {
    return 16;
  }
  if (layoutDensity === 'large') {
    return 24;
  }
  return 20;
}

export function resolveRootGridLayoutState<T extends RootDragRenderableItem>(params: {
  items: readonly T[];
  gridColumns: number;
  minRows: number;
  gridWidthPx: number | null;
  compactIconSize: number;
  layoutDensity: ShortcutLayoutDensity;
  columnGap?: number;
}): RootGridLayoutState<T> {
  const columnGap = params.columnGap ?? ROOT_GRID_COLUMN_GAP_PX;
  const rowGap = resolveRootGridRowGap(params.layoutDensity);
  const rowHeight = params.compactIconSize + 24;
  const packedLayout = packGridItems({
    items: params.items,
    gridColumns: params.gridColumns,
    getSpan: (item) => ({
      columnSpan: item.layout.columnSpan,
      rowSpan: item.layout.rowSpan,
    }),
  });
  const displayRows = Math.max(packedLayout.rowCount, params.minRows);
  const gridMinHeight = resolveGridContentHeight({
    rowCount: displayRows,
    rowHeight,
    rowGap,
  });
  const gridColumnWidth = resolveGridColumnWidth({
    gridWidthPx: params.gridWidthPx,
    gridColumns: params.gridColumns,
    columnGap,
  });
  const usesSpanAwareReorder = params.items.some((item) => item.layout.columnSpan > 1 || item.layout.rowSpan > 1);

  return {
    columnGap,
    rowGap,
    rowHeight,
    packedLayout,
    displayRows,
    gridMinHeight,
    gridColumnWidth,
    usesSpanAwareReorder,
  };
}
