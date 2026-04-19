import { isShortcutFolder, type Shortcut } from '@leaftab/workspace-core';
import type {
  CompactTargetRegions,
  FolderShortcutSurfaceItemLayout,
  RootShortcutGridDropTargetRects,
  RootShortcutGridItemLayout,
  RootShortcutGridResolveCompactTargetRegionsParams,
} from '@leaftab/workspace-react';
import { LEAFTAB_COMPACT_GRID_METRICS } from './constants';

export type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const DEFAULT_LEAFTAB_ICON_CORNER_RADIUS = LEAFTAB_COMPACT_GRID_METRICS.iconCornerRadius;
const MIN_LEAFTAB_ICON_CORNER_RADIUS = 0;
const MAX_LEAFTAB_ICON_CORNER_RADIUS = 50;
const SMALL_FOLDER_PREVIEW_MAX_BORDER_RADIUS_PX = 40;
const LARGE_FOLDER_PREVIEW_MAX_BORDER_RADIUS_PX = 28;
const FOLDER_SHARED_ICON_BASE_SIZE = 72;
const COMPACT_TARGET_CORE_INSET = 0.24;
const LARGE_FOLDER_TARGET_CORE_INSET = 0.12;

export function clampLeaftabIconCornerRadius(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_LEAFTAB_ICON_CORNER_RADIUS;
  return Math.max(
    MIN_LEAFTAB_ICON_CORNER_RADIUS,
    Math.min(MAX_LEAFTAB_ICON_CORNER_RADIUS, Math.round(numeric)),
  );
}

export function getLeaftabShortcutIconBorderRadius(
  cornerRadius: unknown = DEFAULT_LEAFTAB_ICON_CORNER_RADIUS,
) {
  return `${clampLeaftabIconCornerRadius(cornerRadius)}%`;
}

function getLeaftabFolderPreviewBorderRadius(params: {
  size: number;
  iconCornerRadius: number;
  maxRadiusPx: number;
  sizeRadiusRatio: number;
}) {
  const { size, iconCornerRadius, maxRadiusPx, sizeRadiusRatio } = params;
  const normalizedCornerRadius = clampLeaftabIconCornerRadius(iconCornerRadius);
  const resolvedRadiusPx = Math.min(
    maxRadiusPx,
    Math.round(FOLDER_SHARED_ICON_BASE_SIZE * normalizedCornerRadius / 100),
    Math.round(size * sizeRadiusRatio),
  );
  return `${Math.max(0, resolvedRadiusPx)}px`;
}

export function getLeaftabSmallFolderBorderRadius(
  size: number,
  iconCornerRadius: number = DEFAULT_LEAFTAB_ICON_CORNER_RADIUS,
) {
  return getLeaftabFolderPreviewBorderRadius({
    size,
    iconCornerRadius,
    maxRadiusPx: SMALL_FOLDER_PREVIEW_MAX_BORDER_RADIUS_PX,
    sizeRadiusRatio: 0.3,
  });
}

export function getLeaftabLargeFolderBorderRadius(
  size: number,
  iconCornerRadius: number = DEFAULT_LEAFTAB_ICON_CORNER_RADIUS,
) {
  return getLeaftabFolderPreviewBorderRadius({
    size,
    iconCornerRadius,
    maxRadiusPx: LARGE_FOLDER_PREVIEW_MAX_BORDER_RADIUS_PX,
    sizeRadiusRatio: 0.18,
  });
}

export function buildLeaftabCompactTargetCellRect(params: {
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
  rootRect: Pick<DOMRect, 'left' | 'top'>;
  gridColumnWidth: number;
  columnGap?: number;
  rowHeight: number;
  rowGap: number;
}): RectLike {
  const {
    columnStart,
    rowStart,
    columnSpan,
    rowSpan,
    rootRect,
    gridColumnWidth,
    columnGap = LEAFTAB_COMPACT_GRID_METRICS.columnGap,
    rowHeight,
    rowGap,
  } = params;
  const width = gridColumnWidth * columnSpan + columnGap * Math.max(0, columnSpan - 1);
  const height = rowHeight * rowSpan + rowGap * Math.max(0, rowSpan - 1);
  const left = rootRect.left + (columnStart - 1) * (gridColumnWidth + columnGap);
  const top = rootRect.top + (rowStart - 1) * (rowHeight + rowGap);

  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

export function inflateLeaftabRect(rect: RectLike, amount: number): RectLike {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    right: rect.right + amount,
    bottom: rect.bottom + amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

function buildLeaftabCompactTargetCoreRect(params: {
  cellRect: RectLike;
  insetRatio: number;
}): RectLike {
  const { cellRect, insetRatio } = params;
  const insetX = cellRect.width * insetRatio;
  const insetY = cellRect.height * insetRatio;
  const left = cellRect.left + insetX;
  const top = cellRect.top + insetY;
  const right = cellRect.right - insetX;
  const bottom = cellRect.bottom - insetY;

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

export function computeLeaftabLargeFolderPreviewSize(params: {
  gridWidthPx: number | null;
  gridColumns: number;
  compactIconSize?: number;
  columnGap?: number;
  rowGap?: number;
  largeFolderEnabled?: boolean;
}) {
  const {
    gridWidthPx,
    gridColumns,
    compactIconSize = LEAFTAB_COMPACT_GRID_METRICS.iconSize,
    columnGap = LEAFTAB_COMPACT_GRID_METRICS.columnGap,
    rowGap: _rowGap = LEAFTAB_COMPACT_GRID_METRICS.rowGap,
    largeFolderEnabled = gridColumns >= LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan,
  } = params;
  if (!largeFolderEnabled) return undefined;

  const minimumPreviewSize = compactIconSize * LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan + columnGap;

  if (!gridWidthPx || gridColumns <= 0) {
    return minimumPreviewSize;
  }

  const gridColumnWidth = (gridWidthPx - columnGap * Math.max(0, gridColumns - 1)) / Math.max(gridColumns, 1);
  // Match the prototype's visual-balance rule:
  // a large folder still occupies a fixed 2x2 footprint, but its visible box
  // should align to the outer edges of neighboring 1x1 icon previews.
  const alignedPreviewSize = (
    compactIconSize
    + gridColumnWidth * Math.max(0, LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan - 1)
    + columnGap * Math.max(0, LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan - 1)
  );

  return Math.max(
    minimumPreviewSize,
    Math.floor(alignedPreviewSize),
  );
}

export function resolveLeaftabRootItemLayout(params: {
  shortcut: Shortcut;
  compactIconSize?: number;
  columnGap?: number;
  iconCornerRadius?: number;
  largeFolderPreviewSize?: number;
  largeFolderEnabled?: boolean;
  compactFallbackLargeFolderPreviewSize?: number;
}): RootShortcutGridItemLayout {
  const {
    shortcut,
    compactIconSize = LEAFTAB_COMPACT_GRID_METRICS.iconSize,
    columnGap = LEAFTAB_COMPACT_GRID_METRICS.columnGap,
    iconCornerRadius = LEAFTAB_COMPACT_GRID_METRICS.iconCornerRadius,
    largeFolderPreviewSize,
    largeFolderEnabled = true,
    compactFallbackLargeFolderPreviewSize = compactIconSize * LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan + columnGap,
  } = params;

  if (
    largeFolderEnabled
    && isShortcutFolder(shortcut)
    && shortcut.folderDisplayMode === 'large'
  ) {
    const previewSize = largeFolderPreviewSize ?? compactFallbackLargeFolderPreviewSize;
    const resolvedLargeFolderBorderRadius = getLeaftabLargeFolderBorderRadius(previewSize, iconCornerRadius);
    return {
      width: previewSize,
      // Keep the 2x2 folder body's measured box aligned to the icon system;
      // the title is treated as a visual attachment rather than part of the body.
      height: previewSize,
      previewRect: {
        left: 0,
        top: 0,
        width: previewSize,
        height: previewSize,
        borderRadius: resolvedLargeFolderBorderRadius,
      },
      columnSpan: LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan,
      rowSpan: LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan,
      previewBorderRadius: resolvedLargeFolderBorderRadius,
    };
  }

  const resolvedPreviewBorderRadius = isShortcutFolder(shortcut)
    ? getLeaftabSmallFolderBorderRadius(compactIconSize, iconCornerRadius)
    : getLeaftabShortcutIconBorderRadius(iconCornerRadius);

  return {
    width: compactIconSize,
    height: compactIconSize,
    previewRect: {
      left: 0,
      top: 0,
      width: compactIconSize,
      height: compactIconSize,
      borderRadius: resolvedPreviewBorderRadius,
    },
    previewBorderRadius: resolvedPreviewBorderRadius,
  };
}

export function resolveLeaftabFolderItemLayout(params: {
  shortcut: Shortcut;
  compactIconSize?: number;
  iconCornerRadius?: number;
}): FolderShortcutSurfaceItemLayout {
  const {
    shortcut,
    compactIconSize = LEAFTAB_COMPACT_GRID_METRICS.iconSize,
    iconCornerRadius = LEAFTAB_COMPACT_GRID_METRICS.iconCornerRadius,
  } = params;
  const resolvedPreviewBorderRadius = isShortcutFolder(shortcut)
    ? (shortcut.folderDisplayMode === 'large'
      ? getLeaftabLargeFolderBorderRadius(compactIconSize, iconCornerRadius)
      : getLeaftabSmallFolderBorderRadius(compactIconSize, iconCornerRadius))
    : getLeaftabShortcutIconBorderRadius(iconCornerRadius);

  return {
    width: compactIconSize,
    height: compactIconSize,
    previewRect: {
      left: 0,
      top: 0,
      width: compactIconSize,
      height: compactIconSize,
      borderRadius: resolvedPreviewBorderRadius,
    },
    previewBorderRadius: resolvedPreviewBorderRadius,
  };
}

export type LeaftabRootDropResolverConfig = {
  getRootRect: () => DOMRect | null | undefined;
  gridWidthPx: number;
  gridColumns: number;
  rowHeight: number;
  rowGap: number;
  columnGap?: number;
  compactIconSize?: number;
  largeFolderPreviewSize?: number;
  largeFolderEnabled?: boolean;
  largeFolderHitSlop?: number;
};

export function resolveLeaftabCompactTargetRegions(
  params: RootShortcutGridResolveCompactTargetRegionsParams,
  config: LeaftabRootDropResolverConfig,
): CompactTargetRegions {
  const {
    getRootRect,
    gridWidthPx,
    gridColumns,
    rowHeight,
    rowGap,
    columnGap = LEAFTAB_COMPACT_GRID_METRICS.columnGap,
    largeFolderEnabled = gridColumns >= LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan,
    largeFolderHitSlop = LEAFTAB_COMPACT_GRID_METRICS.largeFolderHitSlop,
  } = config;
  const rootRect = getRootRect();
  if (!rootRect || !gridWidthPx) {
    return {
      targetCellRegion: params.rect,
      targetIconRegion: params.rect,
      targetIconHitRegion: params.rect,
    };
  }

  const gridColumnWidth = (gridWidthPx - columnGap * Math.max(0, gridColumns - 1)) / Math.max(gridColumns, 1);
  const targetCellRegion = buildLeaftabCompactTargetCellRect({
    columnStart: params.columnStart,
    rowStart: params.rowStart,
    columnSpan: params.columnSpan,
    rowSpan: params.rowSpan,
    rootRect,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
  });

  const isLargeFolder = (
    largeFolderEnabled
    && isShortcutFolder(params.shortcut)
    && params.shortcut.folderDisplayMode === 'large'
  );
  const targetCoreRegion = buildLeaftabCompactTargetCoreRect({
    cellRect: targetCellRegion,
    insetRatio: isLargeFolder ? LARGE_FOLDER_TARGET_CORE_INSET : COMPACT_TARGET_CORE_INSET,
  });

  return {
    targetCellRegion,
    targetIconRegion: targetCoreRegion,
    targetIconHitRegion: isLargeFolder
      ? inflateLeaftabRect(targetCoreRegion, largeFolderHitSlop)
      : targetCoreRegion,
    bigFolderMergeHitArea: isLargeFolder ? targetCoreRegion : undefined,
  };
}

export function resolveLeaftabDropTargetRects(
  params: RootShortcutGridResolveCompactTargetRegionsParams,
  config: LeaftabRootDropResolverConfig,
): RootShortcutGridDropTargetRects {
  const regions = resolveLeaftabCompactTargetRegions(params, config);
  return {
    overRect: regions.targetCellRegion,
    overCenterRect: regions.targetIconRegion,
  };
}

export function createLeaftabRootDropResolvers(config: LeaftabRootDropResolverConfig) {
  return {
    resolveCompactTargetRegions: (params: RootShortcutGridResolveCompactTargetRegionsParams) => (
      resolveLeaftabCompactTargetRegions(params, config)
    ),
    resolveDropTargetRects: (params: RootShortcutGridResolveCompactTargetRegionsParams) => (
      resolveLeaftabDropTargetRects(params, config)
    ),
  };
}
