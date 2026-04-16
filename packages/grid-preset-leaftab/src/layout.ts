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
    rowGap = LEAFTAB_COMPACT_GRID_METRICS.rowGap,
    largeFolderEnabled = gridColumns >= LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan,
  } = params;
  if (!largeFolderEnabled) return undefined;

  const minimumPreviewSize = compactIconSize * LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan + columnGap;
  const maxPreviewHeight = minimumPreviewSize + rowGap + LEAFTAB_COMPACT_GRID_METRICS.titleBlockHeight - columnGap;

  if (!gridWidthPx || gridColumns <= 0) {
    return maxPreviewHeight;
  }

  const gridColumnWidth = (gridWidthPx - columnGap * Math.max(0, gridColumns - 1)) / Math.max(gridColumns, 1);
  const maxPreviewWidth = gridColumnWidth * LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan + columnGap;

  return Math.max(
    minimumPreviewSize,
    Math.floor(Math.min(maxPreviewWidth, maxPreviewHeight)),
  );
}

export function resolveLeaftabRootItemLayout(params: {
  shortcut: Shortcut;
  compactIconSize?: number;
  titleBlockHeight?: number;
  columnGap?: number;
  iconCornerRadius?: number;
  largeFolderPreviewSize?: number;
  largeFolderEnabled?: boolean;
  compactFallbackLargeFolderPreviewSize?: number;
}): RootShortcutGridItemLayout {
  const {
    shortcut,
    compactIconSize = LEAFTAB_COMPACT_GRID_METRICS.iconSize,
    titleBlockHeight = LEAFTAB_COMPACT_GRID_METRICS.titleBlockHeight,
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
      height: previewSize + titleBlockHeight,
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
    height: compactIconSize + titleBlockHeight,
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
  titleBlockHeight?: number;
  iconCornerRadius?: number;
}): FolderShortcutSurfaceItemLayout {
  const {
    shortcut,
    compactIconSize = LEAFTAB_COMPACT_GRID_METRICS.iconSize,
    titleBlockHeight = LEAFTAB_COMPACT_GRID_METRICS.titleBlockHeight,
    iconCornerRadius = LEAFTAB_COMPACT_GRID_METRICS.iconCornerRadius,
  } = params;
  const resolvedPreviewBorderRadius = isShortcutFolder(shortcut)
    ? (shortcut.folderDisplayMode === 'large'
      ? getLeaftabLargeFolderBorderRadius(compactIconSize, iconCornerRadius)
      : getLeaftabSmallFolderBorderRadius(compactIconSize, iconCornerRadius))
    : getLeaftabShortcutIconBorderRadius(iconCornerRadius);

  return {
    width: compactIconSize,
    height: compactIconSize + titleBlockHeight,
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
    compactIconSize = LEAFTAB_COMPACT_GRID_METRICS.iconSize,
    largeFolderPreviewSize,
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
  const previewSize = isLargeFolder
    ? (largeFolderPreviewSize ?? compactIconSize * LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan + columnGap)
    : compactIconSize;
  const left = targetCellRegion.left + Math.max(0, (targetCellRegion.width - previewSize) / 2);
  const top = targetCellRegion.top;
  const targetIconRegion: RectLike = {
    left,
    top,
    width: previewSize,
    height: previewSize,
    right: left + previewSize,
    bottom: top + previewSize,
  };

  return {
    targetCellRegion,
    targetIconRegion,
    targetIconHitRegion: isLargeFolder
      ? inflateLeaftabRect(targetIconRegion, largeFolderHitSlop)
      : targetIconRegion,
    bigFolderMergeHitArea: isLargeFolder ? targetIconRegion : undefined,
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
