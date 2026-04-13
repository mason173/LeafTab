import {
  getCompactShortcutCardMetrics,
  isShortcutLargeFolder,
} from '@/components/shortcuts/compactFolderLayout';
import { getReorderTargetIndex } from '@/features/shortcuts/drag/dropEdge';
import {
  distanceToRect,
  distanceToRectCenter,
  pointInRect,
  type MeasuredDragItem,
  type PointerPoint,
  type ProjectionOffset,
} from '@/features/shortcuts/drag/gridDragEngine';
import { resolveRootDropIntent } from '@/features/shortcuts/drag/resolveRootDropIntent';
import type { RootShortcutDropIntent, RootShortcutDragItem } from '@/features/shortcuts/drag/types';
import type { Shortcut } from '@/types';

const COMPACT_DRAG_MATCH_DISTANCE_PX = 64;
const COMPACT_SMALL_TARGET_HIT_SLOP_PX = 0;
const COMPACT_LARGE_FOLDER_HIT_SLOP_PX = 8;

export type HitTestRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type CompactTargetRegions = {
  targetCellRegion: HitTestRect;
  targetIconRegion: HitTestRect;
  targetIconHitRegion: HitTestRect;
};

type CompactMeasuredItem = MeasuredDragItem<RootShortcutDragItem>;

type CompactOverCandidate = {
  overItem: CompactMeasuredItem;
  overRect: HitTestRect;
  overCenterRect: HitTestRect;
};

export type CompactRootHoverResolution = {
  interactionIntent: RootShortcutDropIntent | null;
  visualProjectionIntent: RootShortcutDropIntent | null;
};

function buildCompactDropCenterRect(params: {
  rect: HitTestRect;
  shortcut: Shortcut;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
}): HitTestRect {
  const { rect, shortcut, compactIconSize, largeFolderEnabled, largeFolderPreviewSize } = params;
  const metrics = getCompactShortcutCardMetrics({
    shortcut,
    iconSize: compactIconSize,
    allowLargeFolder: largeFolderEnabled,
    largeFolderPreviewSize,
  });
  const previewSize = Math.max(1, Math.min(metrics.previewSize, rect.width, rect.height));
  const left = rect.left + Math.max(0, (rect.width - previewSize) / 2);
  const top = rect.top;

  return {
    left,
    top,
    width: previewSize,
    height: previewSize,
    right: left + previewSize,
    bottom: top + previewSize,
  };
}

function inflateHitTestRect(rect: HitTestRect, amount: number): HitTestRect {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    right: rect.right + amount,
    bottom: rect.bottom + amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  };
}

function pointInHitTestRect(point: PointerPoint, rect: HitTestRect): boolean {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

function distanceToHitTestRect(point: PointerPoint, rect: HitTestRect): number {
  const dx = point.x < rect.left ? rect.left - point.x : point.x > rect.right ? point.x - rect.right : 0;
  const dy = point.y < rect.top ? rect.top - point.y : point.y > rect.bottom ? point.y - rect.bottom : 0;
  return Math.hypot(dx, dy);
}

function distanceToHitTestRectCenter(point: PointerPoint, rect: HitTestRect): number {
  return Math.hypot(point.x - (rect.left + rect.width / 2), point.y - (rect.top + rect.height / 2));
}

function isPointInTargetIconRegion(point: PointerPoint, regions: CompactTargetRegions): boolean {
  return pointInHitTestRect(point, regions.targetIconRegion);
}

function isPointInTargetCellNonIconRegion(point: PointerPoint, regions: CompactTargetRegions): boolean {
  return pointInHitTestRect(point, regions.targetCellRegion) && !isPointInTargetIconRegion(point, regions);
}

function isPointInTargetCellReorderRegion(point: PointerPoint, regions: CompactTargetRegions): boolean {
  if (!pointInHitTestRect(point, regions.targetCellRegion) || isPointInTargetIconRegion(point, regions)) {
    return false;
  }

  const iconColumnCorridor: HitTestRect = {
    left: regions.targetIconRegion.left,
    right: regions.targetIconRegion.right,
    top: regions.targetCellRegion.top,
    bottom: regions.targetCellRegion.bottom,
    width: regions.targetIconRegion.width,
    height: regions.targetCellRegion.height,
  };

  return !pointInHitTestRect(point, iconColumnCorridor);
}

function findMeasuredItemByShortcutId(measuredItems: CompactMeasuredItem[], shortcutId: string) {
  return measuredItems.find((item) => item.shortcut.id === shortcutId) ?? null;
}

function isShortcutCurrentlyDisplaced(
  projectionOffsets: Map<string, ProjectionOffset>,
  shortcutId: string,
): boolean {
  const projection = projectionOffsets.get(shortcutId);
  if (!projection) return false;

  return Math.abs(projection.x) >= 0.5 || Math.abs(projection.y) >= 0.5;
}

function hasAnyDisplacedShortcut(projectionOffsets: Map<string, ProjectionOffset>): boolean {
  for (const projection of projectionOffsets.values()) {
    if (Math.abs(projection.x) >= 0.5 || Math.abs(projection.y) >= 0.5) {
      return true;
    }
  }

  return false;
}

function isShortcutDisplacedInAnyProjection(params: {
  shortcutId: string;
  interactionProjectionOffsets: Map<string, ProjectionOffset>;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
}): boolean {
  const { shortcutId, interactionProjectionOffsets, visualProjectionOffsets } = params;
  return isShortcutCurrentlyDisplaced(interactionProjectionOffsets, shortcutId)
    || isShortcutCurrentlyDisplaced(visualProjectionOffsets, shortcutId);
}

function pickCompactIconCandidate(params: {
  activeSortId: string;
  measuredItems: CompactMeasuredItem[];
  pointer: PointerPoint;
  resolveRegions: (item: CompactMeasuredItem) => CompactTargetRegions;
}): CompactOverCandidate | null {
  const { activeSortId, measuredItems, pointer, resolveRegions } = params;
  const activeItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  if (activeItem && pointInHitTestRect(pointer, resolveRegions(activeItem).targetIconHitRegion)) {
    return null;
  }

  const directHit = measuredItems
    .filter((item) => item.sortId !== activeSortId)
    .map((item) => {
      const regions = resolveRegions(item);
      return {
        item,
        overRect: regions.targetIconHitRegion,
        overCenterRect: regions.targetIconRegion,
        inside: pointInHitTestRect(pointer, regions.targetIconHitRegion),
        distance: distanceToHitTestRect(pointer, regions.targetIconHitRegion),
        centerDistance: distanceToHitTestRectCenter(pointer, regions.targetIconRegion),
      };
    })
    .filter((candidate) => candidate.inside)
    .sort((left, right) => {
      if (left.centerDistance !== right.centerDistance) return left.centerDistance - right.centerDistance;
      return left.distance - right.distance;
    })[0];

  if (!directHit) return null;

  return {
    overItem: directHit.item,
    overRect: directHit.overRect,
    overCenterRect: directHit.overCenterRect,
  };
}

function pickCompactCellCandidate(params: {
  activeSortId: string;
  measuredItems: CompactMeasuredItem[];
  pointer: PointerPoint;
  resolveRegions: (item: CompactMeasuredItem) => CompactTargetRegions;
}): CompactOverCandidate | null {
  const { activeSortId, measuredItems, pointer, resolveRegions } = params;
  const activeItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  if (activeItem && pointInRect(pointer, activeItem.rect)) {
    return null;
  }

  const directCellHit = measuredItems
    .filter((item) => item.sortId !== activeSortId)
    .map((item) => {
      const regions = resolveRegions(item);
      return {
        item,
        overRect: regions.targetCellRegion,
        overCenterRect: regions.targetIconRegion,
        insideTargetCellNonIconRegion: isPointInTargetCellReorderRegion(pointer, regions),
        centerDistance: distanceToHitTestRectCenter(pointer, regions.targetIconRegion),
      };
    })
    .filter((candidate) => candidate.insideTargetCellNonIconRegion)
    .sort((left, right) => left.centerDistance - right.centerDistance)[0];

  if (!directCellHit) return null;

  return {
    overItem: directCellHit.item,
    overRect: directCellHit.overRect,
    overCenterRect: directCellHit.overCenterRect,
  };
}

function pickMeasuredItemCandidate(params: {
  activeSortId: string;
  measuredItems: CompactMeasuredItem[];
  pointer: PointerPoint;
}): { overItem: CompactMeasuredItem; overRect: DOMRect; overCenterRect: DOMRect } | null {
  const { activeSortId, measuredItems, pointer } = params;
  const activeItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  if (activeItem && pointInRect(pointer, activeItem.rect)) {
    return null;
  }

  const ranked = measuredItems
    .filter((item) => item.sortId !== activeSortId)
    .map((item) => ({
      item,
      distance: distanceToRect(pointer, item.rect),
      centerDistance: distanceToRectCenter(pointer, item.rect),
    }))
    .sort((left, right) => {
      if (left.distance !== right.distance) return left.distance - right.distance;
      return left.centerDistance - right.centerDistance;
    });

  const best = ranked[0];
  if (!best || best.distance > COMPACT_DRAG_MATCH_DISTANCE_PX) return null;

  return {
    overItem: best.item,
    overRect: best.item.rect,
    overCenterRect: best.item.rect,
  };
}

export function getCompactTargetCellRect(params: {
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
  rootRect: Pick<DOMRect, 'left' | 'top'>;
  gridColumnWidth: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
}): HitTestRect {
  const { columnStart, rowStart, columnSpan, rowSpan, rootRect, gridColumnWidth, columnGap, rowHeight, rowGap } = params;
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

export function resolveCompactTargetRegions(params: {
  rect: HitTestRect;
  shortcut: Shortcut;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
}): CompactTargetRegions {
  const { rect, shortcut, compactIconSize, largeFolderEnabled, largeFolderPreviewSize } = params;
  const targetIconRegion = buildCompactDropCenterRect({
    rect,
    shortcut,
    compactIconSize,
    largeFolderEnabled,
    largeFolderPreviewSize,
  });
  const hitSlop = isShortcutLargeFolder(shortcut)
    ? COMPACT_LARGE_FOLDER_HIT_SLOP_PX
    : COMPACT_SMALL_TARGET_HIT_SLOP_PX;

  return {
    targetCellRegion: rect,
    targetIconRegion,
    targetIconHitRegion: inflateHitTestRect(targetIconRegion, hitSlop),
  };
}

function buildCompactVisualProjectionIntent(params: {
  interactionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  items: RootShortcutDragItem[];
}): RootShortcutDropIntent | null {
  const { interactionIntent, previousVisualProjectionIntent, visualProjectionOffsets, items } = params;
  if (!interactionIntent) return null;
  if (interactionIntent.type === 'reorder-root') {
    return interactionIntent;
  }

  const hasDisplacedPreviousYield = previousVisualProjectionIntent?.type === 'reorder-root'
    && hasAnyDisplacedShortcut(visualProjectionOffsets);
  if (!hasDisplacedPreviousYield) {
    return null;
  }

  const targetShortcutId = interactionIntent.type === 'merge-root-shortcuts'
    ? interactionIntent.targetShortcutId
    : interactionIntent.targetFolderId;
  const activeItem = items.find((item) => item.shortcut.id === interactionIntent.activeShortcutId);
  const targetItem = items.find((item) => item.shortcut.id === targetShortcutId);
  if (!activeItem || !targetItem) {
    return null;
  }

  const edge = activeItem.shortcutIndex < targetItem.shortcutIndex ? 'before' : 'after';
  return {
    type: 'reorder-root',
    activeShortcutId: interactionIntent.activeShortcutId,
    overShortcutId: targetItem.shortcut.id,
    targetIndex: getReorderTargetIndex(activeItem.shortcutIndex, targetItem.shortcutIndex, edge),
    edge,
  };
}

function resolveStickyVisualReorderIntent(params: {
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  measuredItems: CompactMeasuredItem[];
  recognitionPoint: PointerPoint;
  resolveRegions: (item: CompactMeasuredItem) => CompactTargetRegions;
  columnGap: number;
  rowGap: number;
}): RootShortcutDropIntent | null {
  const {
    previousVisualProjectionIntent,
    visualProjectionOffsets,
    measuredItems,
    recognitionPoint,
    resolveRegions,
    columnGap,
    rowGap,
  } = params;

  if (previousVisualProjectionIntent?.type !== 'reorder-root') return null;
  if (!isShortcutCurrentlyDisplaced(visualProjectionOffsets, previousVisualProjectionIntent.overShortcutId)) {
    return null;
  }

  const previousTarget = findMeasuredItemByShortcutId(measuredItems, previousVisualProjectionIntent.overShortcutId);
  if (!previousTarget) return null;

  const stickyDistanceThresholdPx = Math.max(columnGap, rowGap);
  const distanceToPreviousTargetCell = distanceToHitTestRect(
    recognitionPoint,
    resolveRegions(previousTarget).targetCellRegion,
  );
  if (distanceToPreviousTargetCell > stickyDistanceThresholdPx) return null;

  return previousVisualProjectionIntent;
}

export function resolveCompactRootHoverResolution(params: {
  activeSortId: string;
  recognitionPoint: PointerPoint;
  measuredItems: CompactMeasuredItem[];
  items: RootShortcutDragItem[];
  previousInteractionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  interactionProjectionOffsets: Map<string, ProjectionOffset>;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  resolveRegions: (item: CompactMeasuredItem) => CompactTargetRegions;
  slotIntent?: RootShortcutDropIntent | null;
  columnGap: number;
  rowGap: number;
}): CompactRootHoverResolution {
  const {
    activeSortId,
    recognitionPoint,
    measuredItems,
    items,
    previousInteractionIntent,
    previousVisualProjectionIntent,
    interactionProjectionOffsets,
    visualProjectionOffsets,
    resolveRegions,
    slotIntent = null,
    columnGap,
    rowGap,
  } = params;

  const stickyVisualReorderIntent = resolveStickyVisualReorderIntent({
    previousVisualProjectionIntent,
    visualProjectionOffsets,
    measuredItems,
    recognitionPoint,
    resolveRegions,
    columnGap,
    rowGap,
  });

  const toResolution = (interactionIntent: RootShortcutDropIntent | null): CompactRootHoverResolution => ({
    interactionIntent,
    visualProjectionIntent: buildCompactVisualProjectionIntent({
      interactionIntent,
      previousVisualProjectionIntent,
      visualProjectionOffsets,
      items,
    }) ?? stickyVisualReorderIntent,
  });

  const previousStickyReorderIntent = (() => {
    if (previousInteractionIntent?.type !== 'reorder-root') return null;
    if (!isShortcutDisplacedInAnyProjection({
      shortcutId: previousInteractionIntent.overShortcutId,
      interactionProjectionOffsets,
      visualProjectionOffsets,
    })) {
      return null;
    }

    const previousTarget = findMeasuredItemByShortcutId(measuredItems, previousInteractionIntent.overShortcutId);
    if (!previousTarget) return null;

    const stickyDistanceThresholdPx = Math.max(columnGap, rowGap);
    const distanceToPreviousTargetCell = distanceToHitTestRect(
      recognitionPoint,
      resolveRegions(previousTarget).targetCellRegion,
    );
    if (distanceToPreviousTargetCell > stickyDistanceThresholdPx) return null;

    return previousInteractionIntent;
  })();

  if (previousInteractionIntent?.type === 'reorder-root') {
    const previousTarget = findMeasuredItemByShortcutId(measuredItems, previousInteractionIntent.overShortcutId);
    if (
      previousTarget
      && isShortcutDisplacedInAnyProjection({
        shortcutId: previousInteractionIntent.overShortcutId,
        interactionProjectionOffsets,
        visualProjectionOffsets,
      })
      && pointInHitTestRect(recognitionPoint, resolveRegions(previousTarget).targetCellRegion)
    ) {
      return toResolution(previousInteractionIntent);
    }
  }

  const pointerOverCandidate = pickCompactIconCandidate({
    activeSortId,
    measuredItems,
    pointer: recognitionPoint,
    resolveRegions,
  });
  const pointerRawIntent = pointerOverCandidate
    ? resolveRootDropIntent({
        activeSortId,
        overSortId: pointerOverCandidate.overItem.sortId,
        pointer: recognitionPoint,
        overRect: pointerOverCandidate.overRect,
        overCenterRect: pointerOverCandidate.overCenterRect,
        items,
        centerHitMode: 'full-center-rect',
        allowCenterIntent: !isShortcutDisplacedInAnyProjection({
          shortcutId: pointerOverCandidate.overItem.sortId,
          interactionProjectionOffsets,
          visualProjectionOffsets,
        }),
      })
    : null;

  if (pointerRawIntent && pointerRawIntent.type !== 'reorder-root') {
    return toResolution(pointerRawIntent);
  }

  const compactCellCandidate = pickCompactCellCandidate({
    activeSortId,
    measuredItems,
    pointer: recognitionPoint,
    resolveRegions,
  });
  const overCandidate = pointerOverCandidate ?? compactCellCandidate;
  if (!overCandidate) {
    return toResolution(slotIntent ?? previousStickyReorderIntent);
  }

  const rawIntent = resolveRootDropIntent({
    activeSortId,
    overSortId: overCandidate.overItem.sortId,
    pointer: recognitionPoint,
    overRect: overCandidate.overRect,
    overCenterRect: overCandidate.overCenterRect,
    items,
    centerHitMode: 'full-center-rect',
    allowCenterIntent: !isShortcutDisplacedInAnyProjection({
      shortcutId: overCandidate.overItem.sortId,
      interactionProjectionOffsets,
      visualProjectionOffsets,
    }),
  });
  if (!rawIntent) {
    return toResolution(slotIntent ?? previousStickyReorderIntent);
  }

  if (rawIntent.type === 'reorder-root') {
    if (compactCellCandidate && overCandidate.overItem.sortId === compactCellCandidate.overItem.sortId) {
      return toResolution(rawIntent);
    }

    return toResolution(slotIntent ?? rawIntent);
  }

  return toResolution(rawIntent);
}

export function pickMeasuredRootItemCandidate(params: {
  activeSortId: string;
  measuredItems: CompactMeasuredItem[];
  pointer: PointerPoint;
}) {
  return pickMeasuredItemCandidate(params);
}
