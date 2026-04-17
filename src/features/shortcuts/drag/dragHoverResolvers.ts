import { resolveCompactTargetRegions, type CompactTargetRegions } from './compactRootDrag';
import { measureNullableElementDragRect } from './dragDomAdapters';
import { resolveGridColumnWidth } from './dragGridGeometry';
import type { FolderDragRenderableItem } from './folderDragRenderState';
import type { MeasuredDragItem } from './gridDragEngine';
import type { RootDragRenderableItem } from './rootDragRenderState';

const FOLDER_GRID_COLUMN_GAP_PX = 16;

export function measureNullableElementDomRect(
  element: Element | null | undefined,
): DOMRect | null {
  return measureNullableElementDragRect(element) as DOMRect | null;
}

export function resolveRootHoverTargetRegions<T extends RootDragRenderableItem>(params: {
  item: MeasuredDragItem<T>;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
}): CompactTargetRegions {
  return resolveCompactTargetRegions({
    rect: params.item.rect,
    shortcut: params.item.shortcut,
    compactIconSize: params.compactIconSize,
    largeFolderEnabled: params.largeFolderEnabled,
    largeFolderPreviewSize: params.largeFolderPreviewSize,
  });
}

export function resolveFolderHoverTargetRegions<T extends FolderDragRenderableItem & { shortcutIndex: number }>(params: {
  item: MeasuredDragItem<T>;
  columns: number;
  rootRect: Pick<DOMRect, 'left' | 'width'> | null;
  columnGap?: number;
}): CompactTargetRegions {
  const { item, rootRect } = params;
  const safeColumns = Math.max(params.columns, 1);
  const columnGap = params.columnGap ?? FOLDER_GRID_COLUMN_GAP_PX;
  const columnWidth = resolveGridColumnWidth({
    gridWidthPx: rootRect?.width ?? null,
    gridColumns: safeColumns,
    columnGap,
  }) ?? item.rect.width;
  const columnIndex = item.shortcutIndex % safeColumns;
  const cellLeft = rootRect ? rootRect.left + columnIndex * (columnWidth + columnGap) : item.rect.left;
  const targetCellRegion = {
    left: cellLeft,
    top: item.rect.top,
    right: cellLeft + columnWidth,
    bottom: item.rect.bottom,
    width: columnWidth,
    height: item.rect.height,
  };
  const targetIconRegion = {
    left: item.rect.left + item.layout.previewOffsetX,
    top: item.rect.top + item.layout.previewOffsetY,
    right: item.rect.left + item.layout.previewOffsetX + item.layout.previewWidth,
    bottom: item.rect.top + item.layout.previewOffsetY + item.layout.previewHeight,
    width: item.layout.previewWidth,
    height: item.layout.previewHeight,
  };

  return {
    targetCellRegion,
    targetIconRegion,
    targetIconHitRegion: targetIconRegion,
  };
}
