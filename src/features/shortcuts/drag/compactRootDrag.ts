import {
  getCompactShortcutCardMetrics,
  isShortcutLargeFolder,
} from '@/components/shortcuts/compactFolderLayout';
import { isShortcutFolder, isShortcutLink } from '@/features/shortcuts/model/selectors';
import { getReorderTargetIndex } from '@/features/shortcuts/drag/dropEdge';
import { resolveRootDropIntent } from '@/features/shortcuts/drag/resolveRootDropIntent';
import type { ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';
import type { DragPoint, RootDragDirectionMap, RootShortcutDropIntent } from '@/features/shortcuts/drag/types';
import type { Shortcut } from '@/types';

const COMPACT_SMALL_TARGET_HIT_SLOP_PX = 0;
const COMPACT_LARGE_FOLDER_HIT_SLOP_PX = 8;

export type CompactTargetRegion = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type CompactTargetRegions = {
  targetCellRegion: CompactTargetRegion;
  targetIconRegion: CompactTargetRegion;
  targetIconHitRegion: CompactTargetRegion;
};

export type CompactRootHoverResolution = {
  hoveredSortId: string | null;
  interactionIntent: RootShortcutDropIntent | null;
  visualProjectionIntent: RootShortcutDropIntent | null;
};

export type HitTestRect = CompactTargetRegion;

function pointInRect(point: DragPoint, rect: CompactTargetRegion): boolean {
  return point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom;
}

function pointStrictlyInRect(point: DragPoint, rect: CompactTargetRegion): boolean {
  return point.x > rect.left
    && point.x < rect.right
    && point.y > rect.top
    && point.y < rect.bottom;
}

function distanceToRect(point: DragPoint, rect: CompactTargetRegion): number {
  const dx = point.x < rect.left ? rect.left - point.x : point.x > rect.right ? point.x - rect.right : 0;
  const dy = point.y < rect.top ? rect.top - point.y : point.y > rect.bottom ? point.y - rect.bottom : 0;
  return Math.hypot(dx, dy);
}

function distanceToRectCenter(point: DragPoint, rect: CompactTargetRegion): number {
  return Math.hypot(point.x - (rect.left + rect.width / 2), point.y - (rect.top + rect.height / 2));
}

function expandRect(rect: CompactTargetRegion, padding: { x: number; y: number }): CompactTargetRegion {
  const left = rect.left - padding.x;
  const top = rect.top - padding.y;
  const right = rect.right + padding.x;
  const bottom = rect.bottom + padding.y;

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}

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

type CompactDirection = 'above' | 'below' | 'left' | 'right' | 'overlap';
type CompactZone = 'merge' | 'neutral' | 'reorder';
type CompactEdge = 'left' | 'right' | 'top' | 'bottom';
type CompactReorderIntent = Extract<RootShortcutDropIntent, { type: 'reorder-root' }>;
type CompactMeasuredItem<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }> = T & {
  rect: CompactTargetRegion;
};
type CompactCandidate<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }> = {
  overItem: CompactMeasuredItem<T>;
  overRect: CompactTargetRegion;
  overCenterRect: CompactTargetRegion;
};

function resolveActiveSourceIconRegion<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  activeMeasuredItem: CompactMeasuredItem<T> | null;
  resolveRegions: (item: CompactMeasuredItem<T>) => CompactTargetRegions;
}) {
  const { activeMeasuredItem, resolveRegions } = params;
  if (!activeMeasuredItem) {
    return null;
  }
  return resolveRegions(activeMeasuredItem).targetIconRegion;
}

function resolveIntentTargetShortcutId(intent: RootShortcutDropIntent | null): string | null {
  if (!intent) return null;
  switch (intent.type) {
    case 'reorder-root':
      return intent.overShortcutId;
    case 'merge-root-shortcuts':
      return intent.targetShortcutId;
    case 'move-root-shortcut-into-folder':
      return intent.targetFolderId;
    default:
      return null;
  }
}

function isCenterIntent(intent: RootShortcutDropIntent | null): boolean {
  return intent?.type === 'merge-root-shortcuts' || intent?.type === 'move-root-shortcut-into-folder';
}

function resolveCenterIntentTargetShortcutId(intent: RootShortcutDropIntent | null): string | null {
  if (!intent) return null;
  switch (intent.type) {
    case 'merge-root-shortcuts':
      return intent.targetShortcutId;
    case 'move-root-shortcut-into-folder':
      return intent.targetFolderId;
    default:
      return null;
  }
}

function resolveRelativeTargetDirection(params: {
  activeRect: CompactTargetRegion;
  targetRect: CompactTargetRegion;
}): CompactDirection {
  const { activeRect, targetRect } = params;
  if (targetRect.bottom <= activeRect.top) return 'above';
  if (targetRect.top >= activeRect.bottom) return 'below';
  if (targetRect.right <= activeRect.left) return 'left';
  if (targetRect.left >= activeRect.right) return 'right';
  return 'overlap';
}

function resolveFrozenTargetDirection(
  directionMap: RootDragDirectionMap,
  targetSortId: string,
): CompactDirection | null {
  if (directionMap.upper.has(targetSortId)) {
    return 'above';
  }
  if (directionMap.lower.has(targetSortId)) {
    return 'below';
  }
  if (directionMap.left.has(targetSortId)) {
    return 'left';
  }
  if (directionMap.right.has(targetSortId)) {
    return 'right';
  }
  return null;
}

export function buildRootDragDirectionMap<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  activeSortId: string;
  measuredItems: readonly CompactMeasuredItem<T>[];
  resolveRegions: (item: CompactMeasuredItem<T>) => CompactTargetRegions;
}): RootDragDirectionMap {
  const activeMeasuredItem = params.measuredItems.find((item) => item.sortId === params.activeSortId) ?? null;
  const activeSourceRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem,
    resolveRegions: params.resolveRegions,
  });
  if (!activeMeasuredItem || !activeSourceRegion) {
    return {
      upper: new Set(),
      lower: new Set(),
      left: new Set(),
      right: new Set(),
    };
  }

  const upper = new Set<string>();
  const lower = new Set<string>();
  const left = new Set<string>();
  const right = new Set<string>();

  params.measuredItems.forEach((item) => {
    if (item.sortId === params.activeSortId) {
      return;
    }

    const direction = resolveRelativeTargetDirection({
      activeRect: activeSourceRegion,
      targetRect: params.resolveRegions(item).targetIconRegion,
    });

    switch (direction) {
      case 'above':
        upper.add(item.sortId);
        break;
      case 'below':
        lower.add(item.sortId);
        break;
      case 'left':
        left.add(item.sortId);
        break;
      case 'right':
        right.add(item.sortId);
        break;
      default:
        break;
    }
  });

  return {
    upper,
    lower,
    left,
    right,
  };
}

function createEmptyRootDragDirectionMap(): RootDragDirectionMap {
  return {
    upper: new Set(),
    lower: new Set(),
    left: new Set(),
    right: new Set(),
  };
}

function buildStickyReorderBridgeRegion(params: {
  targetRect: CompactTargetRegion;
  activeRect: CompactTargetRegion;
  relativeDirection: CompactDirection;
  columnGap: number;
  rowGap: number;
}): CompactTargetRegion | null {
  const { activeRect, targetRect, relativeDirection, columnGap, rowGap } = params;

  switch (relativeDirection) {
    case 'left':
      return expandRect({
        left: targetRect.left,
        top: Math.min(targetRect.top, activeRect.top),
        right: activeRect.left,
        bottom: Math.max(targetRect.bottom, activeRect.bottom),
        width: activeRect.left - targetRect.left,
        height: Math.max(targetRect.bottom, activeRect.bottom) - Math.min(targetRect.top, activeRect.top),
      }, {
        x: 0,
        y: rowGap / 2,
      });
    case 'right':
      return expandRect({
        left: activeRect.right,
        top: Math.min(targetRect.top, activeRect.top),
        right: targetRect.right,
        bottom: Math.max(targetRect.bottom, activeRect.bottom),
        width: targetRect.right - activeRect.right,
        height: Math.max(targetRect.bottom, activeRect.bottom) - Math.min(targetRect.top, activeRect.top),
      }, {
        x: 0,
        y: rowGap / 2,
      });
    case 'above':
      return expandRect({
        left: Math.min(targetRect.left, activeRect.left),
        top: targetRect.top,
        right: Math.max(targetRect.right, activeRect.right),
        bottom: activeRect.top,
        width: Math.max(targetRect.right, activeRect.right) - Math.min(targetRect.left, activeRect.left),
        height: activeRect.top - targetRect.top,
      }, {
        x: columnGap / 2,
        y: 0,
      });
    case 'below':
      return expandRect({
        left: Math.min(targetRect.left, activeRect.left),
        top: activeRect.bottom,
        right: Math.max(targetRect.right, activeRect.right),
        bottom: targetRect.bottom,
        width: Math.max(targetRect.right, activeRect.right) - Math.min(targetRect.left, activeRect.left),
        height: targetRect.bottom - activeRect.bottom,
      }, {
        x: columnGap / 2,
        y: 0,
      });
    default:
      return null;
  }
}

function resolveDirectionalMergeEdges(relativeDirection: CompactDirection): CompactEdge[] {
  switch (relativeDirection) {
    case 'above':
    case 'left':
      return ['right', 'bottom'];
    case 'below':
    case 'right':
      return ['left', 'top'];
    default:
      return [];
  }
}

function resolveDirectionalReorderEdge(relativeDirection: CompactDirection): 'before' | 'after' | null {
  switch (relativeDirection) {
    case 'above':
    case 'left':
      return 'before';
    case 'below':
    case 'right':
      return 'after';
    default:
      return null;
  }
}

function resolveDirectionalEdgePriority(relativeDirection: CompactDirection): CompactEdge[] {
  switch (relativeDirection) {
    case 'above':
      return ['bottom', 'right', 'left', 'top'];
    case 'below':
      return ['top', 'left', 'right', 'bottom'];
    case 'left':
      return ['right', 'bottom', 'left', 'top'];
    case 'right':
      return ['left', 'top', 'right', 'bottom'];
    default:
      return ['left', 'right', 'top', 'bottom'];
  }
}

function resolveNearestTargetEdge(params: {
  pointer: DragPoint;
  targetRect: CompactTargetRegion;
  relativeDirection: CompactDirection;
}): CompactEdge {
  const { pointer, targetRect, relativeDirection } = params;
  const priorities = resolveDirectionalEdgePriority(relativeDirection);

  return [
    { edge: 'left' as const, distance: Math.abs(pointer.x - targetRect.left) },
    { edge: 'right' as const, distance: Math.abs(targetRect.right - pointer.x) },
    { edge: 'top' as const, distance: Math.abs(pointer.y - targetRect.top) },
    { edge: 'bottom' as const, distance: Math.abs(targetRect.bottom - pointer.y) },
  ].sort((left, right) => {
    if (left.distance !== right.distance) {
      return left.distance - right.distance;
    }
    return priorities.indexOf(left.edge) - priorities.indexOf(right.edge);
  })[0].edge;
}

function resolveCrossedTargetEdge(params: {
  fromPoint: DragPoint;
  toPoint: DragPoint;
  targetRect: CompactTargetRegion;
  relativeDirection: CompactDirection;
}): CompactEdge | null {
  const { fromPoint, toPoint, targetRect, relativeDirection } = params;
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const priorities = resolveDirectionalEdgePriority(relativeDirection);
  const epsilon = 1e-6;
  const intersections: Array<{ edge: CompactEdge; t: number }> = [];

  const pushIntersection = (edge: CompactEdge, t: number, coordinate: number, min: number, max: number) => {
    if (!Number.isFinite(t) || t < -epsilon || t > 1 + epsilon) return;
    if (coordinate < min - epsilon || coordinate > max + epsilon) return;
    intersections.push({
      edge,
      t: Math.max(0, Math.min(1, t)),
    });
  };

  if (Math.abs(dx) > epsilon) {
    const leftT = (targetRect.left - fromPoint.x) / dx;
    const leftY = fromPoint.y + dy * leftT;
    pushIntersection('left', leftT, leftY, targetRect.top, targetRect.bottom);

    const rightT = (targetRect.right - fromPoint.x) / dx;
    const rightY = fromPoint.y + dy * rightT;
    pushIntersection('right', rightT, rightY, targetRect.top, targetRect.bottom);
  }

  if (Math.abs(dy) > epsilon) {
    const topT = (targetRect.top - fromPoint.y) / dy;
    const topX = fromPoint.x + dx * topT;
    pushIntersection('top', topT, topX, targetRect.left, targetRect.right);

    const bottomT = (targetRect.bottom - fromPoint.y) / dy;
    const bottomX = fromPoint.x + dx * bottomT;
    pushIntersection('bottom', bottomT, bottomX, targetRect.left, targetRect.right);
  }

  if (intersections.length === 0) {
    return null;
  }

  intersections.sort((left, right) => {
    if (Math.abs(left.t - right.t) > epsilon) {
      return left.t - right.t;
    }
    return priorities.indexOf(left.edge) - priorities.indexOf(right.edge);
  });

  return intersections[0]?.edge ?? null;
}

function resolveDirectionalCompactZone(params: {
  targetRect: CompactTargetRegion;
  pointer: DragPoint;
  relativeDirection: CompactDirection;
}): CompactZone {
  const { targetRect, pointer, relativeDirection } = params;
  if (pointInRect(pointer, targetRect)) {
    return 'merge';
  }

  if (relativeDirection === 'overlap') {
    return 'reorder';
  }

  const nearestEdge = resolveNearestTargetEdge({
    pointer,
    targetRect,
    relativeDirection,
  });
  return resolveDirectionalMergeEdges(relativeDirection).includes(nearestEdge) ? 'neutral' : 'reorder';
}

function findMeasuredItemByShortcutId<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(
  measuredItems: readonly CompactMeasuredItem<T>[],
  shortcutId: string,
): CompactMeasuredItem<T> | null {
  return measuredItems.find((item) => item.shortcut.id === shortcutId) ?? null;
}

function hasAnyDisplacedShortcut(projectionOffsets?: ReadonlyMap<string, ProjectionOffset>): boolean {
  if (!projectionOffsets) {
    return false;
  }

  for (const projection of projectionOffsets.values()) {
    if (Math.abs(projection.x) >= 0.5 || Math.abs(projection.y) >= 0.5) {
      return true;
    }
  }

  return false;
}

function hasAnyDisplacedShortcutInAnyProjection(params: {
  interactionProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
  visualProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
}): boolean {
  return hasAnyDisplacedShortcut(params.interactionProjectionOffsets)
    || hasAnyDisplacedShortcut(params.visualProjectionOffsets);
}

function extractCompactReorderIntent(intent: RootShortcutDropIntent | null): CompactReorderIntent | null {
  return intent?.type === 'reorder-root' ? intent : null;
}

function buildCompactCenterIntent<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  activeItem: CompactMeasuredItem<T>;
  overItem: CompactMeasuredItem<T>;
}): RootShortcutDropIntent | null {
  const { activeItem, overItem } = params;
  if (isShortcutLink(activeItem.shortcut) && isShortcutFolder(overItem.shortcut)) {
    return {
      type: 'move-root-shortcut-into-folder',
      activeShortcutId: activeItem.shortcut.id,
      targetFolderId: overItem.shortcut.id,
    };
  }

  if (isShortcutLink(activeItem.shortcut) && isShortcutLink(overItem.shortcut)) {
    return {
      type: 'merge-root-shortcuts',
      activeShortcutId: activeItem.shortcut.id,
      targetShortcutId: overItem.shortcut.id,
    };
  }

  return null;
}

function buildDirectionalCompactReorderIntent<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  activeItem: CompactMeasuredItem<T>;
  overItem: CompactMeasuredItem<T>;
  relativeDirection: CompactDirection;
  items: readonly T[];
}): CompactReorderIntent | null {
  const { activeItem, overItem, relativeDirection, items } = params;
  const edge = resolveDirectionalReorderEdge(relativeDirection);
  if (!edge) {
    return null;
  }

  const targetIndex = getReorderTargetIndex({
    items,
    activeSortId: activeItem.sortId,
    overSortId: overItem.sortId,
    edge,
  });
  if (targetIndex === null || targetIndex === activeItem.shortcutIndex) {
    return null;
  }

  return {
    type: 'reorder-root',
    activeShortcutId: activeItem.shortcut.id,
    overShortcutId: overItem.shortcut.id,
    targetIndex,
    edge,
  };
}

function buildFallbackCompactReorderIntent<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  activeItem: CompactMeasuredItem<T>;
  candidate: CompactCandidate<T>;
  pointer: DragPoint;
  items: readonly T[];
}): CompactReorderIntent | null {
  const { activeItem, candidate, pointer, items } = params;
  const intent = resolveRootDropIntent({
    activeSortId: activeItem.sortId,
    overSortId: candidate.overItem.sortId,
    pointer,
    overRect: candidate.overRect,
    overCenterRect: candidate.overCenterRect,
    items,
    centerHitMode: 'full-center-rect',
    allowCenterIntent: false,
  });

  return intent?.type === 'reorder-root' ? intent : null;
}

function resolveEnteredTargetThisFrame(params: {
  previousRecognitionPoint?: DragPoint | null;
  targetRect: CompactTargetRegion;
  pointer: DragPoint;
}): boolean {
  const { previousRecognitionPoint = null, targetRect, pointer } = params;
  return Boolean(
    previousRecognitionPoint
      && !pointStrictlyInRect(previousRecognitionPoint, targetRect)
      && pointInRect(pointer, targetRect),
  );
}

function pickCompactTargetCandidate<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  activeSortId: string;
  measuredItems: readonly CompactMeasuredItem<T>[];
  pointer: DragPoint;
  resolveRegions: (item: CompactMeasuredItem<T>) => CompactTargetRegions;
}): CompactCandidate<T> | null {
  const { activeSortId, measuredItems, pointer, resolveRegions } = params;
  const activeItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  if (activeItem && pointInRect(pointer, resolveRegions(activeItem).targetIconHitRegion)) {
    return null;
  }

  const directHit = measuredItems
    .filter((item) => item.sortId !== activeSortId)
    .map((item) => {
      const regions = resolveRegions(item);
      return {
        item,
        overRect: regions.targetIconRegion,
        overCenterRect: regions.targetIconRegion,
        inside: pointInRect(pointer, regions.targetCellRegion),
        centerDistance: distanceToRectCenter(pointer, regions.targetIconRegion),
      };
    })
    .filter((candidate) => candidate.inside)
    .sort((left, right) => {
      if (left.centerDistance !== right.centerDistance) {
        return left.centerDistance - right.centerDistance;
      }
      return distanceToRectCenter(pointer, left.overCenterRect) - distanceToRectCenter(pointer, right.overCenterRect);
    })[0];

  if (!directHit) {
    return null;
  }

  return {
    overItem: directHit.item,
    overRect: directHit.overRect,
    overCenterRect: directHit.overCenterRect,
  };
}

function shouldKeepStickyReorderIntent<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  activeSortId: string;
  previousReorderIntent: CompactReorderIntent | null;
  measuredItems: readonly CompactMeasuredItem<T>[];
  recognitionPoint: DragPoint;
  resolveRegions: (item: CompactMeasuredItem<T>) => CompactTargetRegions;
  directionMap: RootDragDirectionMap;
  columnGap: number;
  rowGap: number;
}): boolean {
  const {
    activeSortId,
    previousReorderIntent,
    measuredItems,
    recognitionPoint,
    resolveRegions,
    directionMap,
    columnGap,
    rowGap,
  } = params;
  if (!previousReorderIntent) return false;

  const activeItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  const previousTarget = findMeasuredItemByShortcutId(measuredItems, previousReorderIntent.overShortcutId);
  if (!activeItem || !previousTarget) return false;

  const activeSourceIconRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem: activeItem,
    resolveRegions,
  });
  if (!activeSourceIconRegion) return false;
  if (pointInRect(recognitionPoint, activeSourceIconRegion)) {
    return false;
  }

  const previousTargetRegions = resolveRegions(previousTarget);
  const targetCellRegion = previousTargetRegions.targetCellRegion;
  const targetIconRegion = previousTargetRegions.targetIconRegion;
  const targetIconHitRegion = previousTargetRegions.targetIconHitRegion;
  const relativeDirection = resolveFrozenTargetDirection(directionMap, previousTarget.sortId);
  if (!relativeDirection) {
    return false;
  }

  if (pointInRect(recognitionPoint, targetCellRegion)) {
    return resolveDirectionalCompactZone({
      targetRect: targetIconRegion,
      pointer: recognitionPoint,
      relativeDirection,
    }) !== 'merge';
  }

  const bridgeRegion = buildStickyReorderBridgeRegion({
    activeRect: activeSourceIconRegion,
    targetRect: targetIconRegion,
    relativeDirection,
    columnGap,
    rowGap,
  });
  if (bridgeRegion) {
    return pointInRect(recognitionPoint, bridgeRegion);
  }

  const stickyDistanceThresholdPx = Math.max(columnGap, rowGap);
  return distanceToRect(recognitionPoint, targetIconHitRegion) <= stickyDistanceThresholdPx;
}

function resolveClaimedReorderIntent<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  activeSortId: string;
  recognitionPoint: DragPoint;
  activeMeasuredItem: CompactMeasuredItem<T> | null;
  previousInteractionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  interactionProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
  visualProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
  resolveRegions: (item: CompactMeasuredItem<T>) => CompactTargetRegions;
}): CompactReorderIntent | null {
  const {
    activeSortId,
    recognitionPoint,
    activeMeasuredItem,
    previousInteractionIntent,
    previousVisualProjectionIntent,
    interactionProjectionOffsets,
    visualProjectionOffsets,
    resolveRegions,
  } = params;
  if (!activeMeasuredItem) {
    return null;
  }

  if (!hasAnyDisplacedShortcutInAnyProjection({ interactionProjectionOffsets, visualProjectionOffsets })) {
    return null;
  }

  const claimedIntent = previousInteractionIntent?.type === 'reorder-root'
    ? previousInteractionIntent
    : previousVisualProjectionIntent?.type === 'reorder-root'
      ? previousVisualProjectionIntent
      : null;
  if (!claimedIntent || claimedIntent.activeShortcutId !== activeSortId) {
    return null;
  }

  const activeSourceRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem,
    resolveRegions,
  });
  if (!activeSourceRegion) {
    return null;
  }
  if (pointInRect(recognitionPoint, activeSourceRegion)) {
    return null;
  }

  return claimedIntent;
}

function shouldHoldPreviousReorderAcrossNeutralCandidate<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  activeSortId: string;
  previousReorderIntent: CompactReorderIntent | null;
  candidate: CompactCandidate<T> | null;
  measuredItems: readonly CompactMeasuredItem<T>[];
  recognitionPoint: DragPoint;
  resolveRegions: (item: CompactMeasuredItem<T>) => CompactTargetRegions;
  directionMap: RootDragDirectionMap;
  interactionProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
  visualProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
}): boolean {
  const {
    activeSortId,
    previousReorderIntent,
    candidate,
    measuredItems,
    recognitionPoint,
    resolveRegions,
    directionMap,
    interactionProjectionOffsets,
    visualProjectionOffsets,
  } = params;
  if (!previousReorderIntent || !candidate) return false;
  if (!hasAnyDisplacedShortcutInAnyProjection({ interactionProjectionOffsets, visualProjectionOffsets })) {
    return false;
  }

  const activeMeasuredItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  const previousTarget = findMeasuredItemByShortcutId(measuredItems, previousReorderIntent.overShortcutId);
  if (!activeMeasuredItem || !previousTarget) return false;

  const activeSourceRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem,
    resolveRegions,
  });
  if (!activeSourceRegion) return false;

  const previousDirection = resolveFrozenTargetDirection(directionMap, previousTarget.sortId);
  const candidateDirection = resolveFrozenTargetDirection(directionMap, candidate.overItem.sortId);
  if (!previousDirection || !candidateDirection || candidateDirection !== previousDirection) {
    return false;
  }

  return resolveDirectionalCompactZone({
    targetRect: candidate.overRect,
    pointer: recognitionPoint,
    relativeDirection: candidateDirection,
  }) === 'neutral';
}

function buildCompactVisualProjectionIntent(params: {
  interactionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  visualProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
}): RootShortcutDropIntent | null {
  const { interactionIntent, previousVisualProjectionIntent, visualProjectionOffsets } = params;
  if (!interactionIntent) return null;
  if (interactionIntent.type === 'reorder-root') {
    return interactionIntent;
  }
  if (interactionIntent.type !== 'merge-root-shortcuts') {
    return null;
  }

  const hasDisplacedPreviousYield = previousVisualProjectionIntent?.type === 'reorder-root'
    && hasAnyDisplacedShortcut(visualProjectionOffsets);
  if (!hasDisplacedPreviousYield) {
    return null;
  }

  return previousVisualProjectionIntent;
}

function buildMergeVisualProjectionIntent<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  interactionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  visualProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
  items: readonly T[];
  activeSortId: string;
}): CompactReorderIntent | null {
  const {
    interactionIntent,
    previousVisualProjectionIntent,
    visualProjectionOffsets,
    items,
    activeSortId,
  } = params;
  if (interactionIntent?.type !== 'merge-root-shortcuts') {
    return null;
  }
  if (previousVisualProjectionIntent?.type !== 'reorder-root') {
    return null;
  }
  if (!hasAnyDisplacedShortcut(visualProjectionOffsets)) {
    return null;
  }

  const overShortcutId = interactionIntent.targetShortcutId;
  const targetIndex = previousVisualProjectionIntent.targetIndex;
  const beforeIndex = getReorderTargetIndex({
    items,
    activeSortId,
    overSortId: overShortcutId,
    edge: 'before',
  });
  const afterIndex = getReorderTargetIndex({
    items,
    activeSortId,
    overSortId: overShortcutId,
    edge: 'after',
  });

  const edge = beforeIndex === targetIndex
    ? 'before'
    : afterIndex === targetIndex
      ? 'after'
      : previousVisualProjectionIntent.edge;

  return {
    type: 'reorder-root',
    activeShortcutId: interactionIntent.activeShortcutId,
    overShortcutId,
    targetIndex,
    edge,
  };
}

function resolveLatchedVisualProjectionFromPreviousMerge<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  activeSortId: string;
  recognitionPoint: DragPoint;
  measuredItems: readonly CompactMeasuredItem<T>[];
  previousInteractionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  visualProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
  resolveRegions: (item: CompactMeasuredItem<T>) => CompactTargetRegions;
  directionMap: RootDragDirectionMap;
  columnGap: number;
  rowGap: number;
}): CompactReorderIntent | null {
  const {
    activeSortId,
    recognitionPoint,
    measuredItems,
    previousInteractionIntent,
    previousVisualProjectionIntent,
    visualProjectionOffsets,
    resolveRegions,
    directionMap,
    columnGap,
    rowGap,
  } = params;
  if (previousInteractionIntent?.type !== 'merge-root-shortcuts') {
    return null;
  }
  if (previousVisualProjectionIntent?.type !== 'reorder-root') {
    return null;
  }
  if (previousVisualProjectionIntent.activeShortcutId !== activeSortId) {
    return null;
  }
  if (!hasAnyDisplacedShortcut(visualProjectionOffsets)) {
    return null;
  }

  const activeMeasuredItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  const mergeTarget = findMeasuredItemByShortcutId(measuredItems, previousInteractionIntent.targetShortcutId);
  const claimedTarget = findMeasuredItemByShortcutId(measuredItems, previousVisualProjectionIntent.overShortcutId);
  if (!activeMeasuredItem || !mergeTarget) {
    return null;
  }

  const activeSourceIconRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem,
    resolveRegions,
  });
  if (!activeSourceIconRegion) {
    return null;
  }
  if (pointInRect(recognitionPoint, activeSourceIconRegion)) {
    return null;
  }

  const mergeTargetRegions = resolveRegions(mergeTarget);
  if (pointInRect(recognitionPoint, mergeTargetRegions.targetCellRegion)) {
    return previousVisualProjectionIntent;
  }

  if (claimedTarget) {
    const claimedTargetRegions = resolveRegions(claimedTarget);
    if (pointInRect(recognitionPoint, claimedTargetRegions.targetCellRegion)) {
      return previousVisualProjectionIntent;
    }
  }

  const relativeDirection = resolveFrozenTargetDirection(directionMap, mergeTarget.sortId);
  if (!relativeDirection) {
    return null;
  }

  const bridgeRegion = buildStickyReorderBridgeRegion({
    activeRect: activeSourceIconRegion,
    targetRect: mergeTargetRegions.targetIconRegion,
    relativeDirection,
    columnGap,
    rowGap,
  });
  if (bridgeRegion && pointInRect(recognitionPoint, bridgeRegion)) {
    return previousVisualProjectionIntent;
  }

  return null;
}

function buildDirectionalCompactIntent<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  activeItem: CompactMeasuredItem<T>;
  candidate: CompactCandidate<T>;
  pointer: DragPoint;
  previousRecognitionPoint?: DragPoint | null;
  previousInteractionIntent: RootShortcutDropIntent | null;
  items: readonly T[];
  relativeDirection: CompactDirection;
}): RootShortcutDropIntent | null {
  const {
    activeItem,
    candidate,
    pointer,
    previousRecognitionPoint = null,
    previousInteractionIntent,
    items,
    relativeDirection,
  } = params;
  const zone = resolveDirectionalCompactZone({
    targetRect: candidate.overRect,
    pointer,
    relativeDirection,
  });
  const centerIntent = buildCompactCenterIntent({
    activeItem,
    overItem: candidate.overItem,
  });
  const targetIsLargeFolder = isShortcutFolder(candidate.overItem.shortcut)
    && candidate.overItem.shortcut.folderDisplayMode === 'large';
  const previousTargetShortcutId = resolveIntentTargetShortcutId(previousInteractionIntent);
  const sameTargetAsPrevious = previousTargetShortcutId === candidate.overItem.shortcut.id;
  const previousReorderIntentForSameTarget = sameTargetAsPrevious && previousInteractionIntent?.type === 'reorder-root'
    ? previousInteractionIntent
    : null;

  if (zone === 'merge' && centerIntent) {
    const enteredTargetIconThisFrame = resolveEnteredTargetThisFrame({
      previousRecognitionPoint,
      targetRect: candidate.overRect,
      pointer,
    });
    const mergeEdges = resolveDirectionalMergeEdges(relativeDirection);

    if (previousReorderIntentForSameTarget) {
      if (!enteredTargetIconThisFrame) {
        return previousRecognitionPoint || relativeDirection === 'above' || relativeDirection === 'below'
          ? previousReorderIntentForSameTarget
          : centerIntent;
      }

      const entryEdge = resolveCrossedTargetEdge({
        fromPoint: previousRecognitionPoint ?? pointer,
        toPoint: pointer,
        targetRect: candidate.overRect,
        relativeDirection,
      }) ?? resolveNearestTargetEdge({
        pointer: previousRecognitionPoint ?? pointer,
        targetRect: candidate.overRect,
        relativeDirection,
      });
      if (!mergeEdges.includes(entryEdge)) {
        return previousReorderIntentForSameTarget;
      }
    }

    if (
      targetIsLargeFolder
      && previousRecognitionPoint
      && pointInRect(previousRecognitionPoint, candidate.overRect)
      && previousInteractionIntent?.type !== 'move-root-shortcut-into-folder'
    ) {
      return null;
    }

    if (enteredTargetIconThisFrame) {
      const entryEdge = resolveCrossedTargetEdge({
        fromPoint: previousRecognitionPoint ?? pointer,
        toPoint: pointer,
        targetRect: candidate.overRect,
        relativeDirection,
      }) ?? resolveNearestTargetEdge({
        pointer: previousRecognitionPoint ?? pointer,
        targetRect: candidate.overRect,
        relativeDirection,
      });

      if (!mergeEdges.includes(entryEdge)) {
        if (targetIsLargeFolder) {
          return null;
        }

        const reorderIntent = buildDirectionalCompactReorderIntent({
          activeItem,
          overItem: candidate.overItem,
          relativeDirection,
          items,
        }) ?? buildFallbackCompactReorderIntent({
          activeItem,
          candidate,
          pointer,
          items,
        });

        if (reorderIntent) {
          return reorderIntent;
        }

        return sameTargetAsPrevious && previousInteractionIntent?.type === 'reorder-root'
          ? previousInteractionIntent
          : null;
      }
    }

    return centerIntent;
  }

  if (targetIsLargeFolder) {
    return null;
  }
  if (zone === 'neutral') {
    return null;
  }

  return buildDirectionalCompactReorderIntent({
    activeItem,
    overItem: candidate.overItem,
    relativeDirection,
    items,
  }) ?? buildFallbackCompactReorderIntent({
    activeItem,
    candidate,
    pointer,
    items,
  });
}

function resolveReorderIntentFromPreviousMergeExit<T extends { sortId: string; shortcut: Shortcut; shortcutIndex: number }>(params: {
  activeSortId: string;
  recognitionPoint: DragPoint;
  previousRecognitionPoint?: DragPoint | null;
  measuredItems: readonly CompactMeasuredItem<T>[];
  previousInteractionIntent: RootShortcutDropIntent | null;
  resolveRegions: (item: CompactMeasuredItem<T>) => CompactTargetRegions;
  items: readonly T[];
  directionMap: RootDragDirectionMap;
}): CompactReorderIntent | null {
  const {
    activeSortId,
    recognitionPoint,
    previousRecognitionPoint = null,
    measuredItems,
    previousInteractionIntent,
    resolveRegions,
    items,
    directionMap,
  } = params;
  if (!isCenterIntent(previousInteractionIntent)) {
    return null;
  }

  const activeMeasuredItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  const previousTargetShortcutId = resolveCenterIntentTargetShortcutId(previousInteractionIntent);
  if (!previousTargetShortcutId) {
    return null;
  }

  const previousTarget = findMeasuredItemByShortcutId(measuredItems, previousTargetShortcutId);
  if (!activeMeasuredItem || !previousTarget || !previousRecognitionPoint) {
    return null;
  }

  if (isShortcutFolder(previousTarget.shortcut) && previousTarget.shortcut.folderDisplayMode === 'large') {
    return null;
  }

  const targetIconRegion = resolveRegions(previousTarget).targetIconRegion;
  if (!pointInRect(previousRecognitionPoint, targetIconRegion)) {
    return null;
  }
  if (pointInRect(recognitionPoint, targetIconRegion)) {
    return null;
  }

  const activeSourceRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem,
    resolveRegions,
  });
  if (!activeSourceRegion) {
    return null;
  }

  const relativeDirection = resolveFrozenTargetDirection(directionMap, previousTarget.sortId);
  if (!relativeDirection) {
    return null;
  }

  const exitEdge = resolveCrossedTargetEdge({
    fromPoint: previousRecognitionPoint,
    toPoint: recognitionPoint,
    targetRect: targetIconRegion,
    relativeDirection,
  }) ?? resolveNearestTargetEdge({
    pointer: recognitionPoint,
    targetRect: targetIconRegion,
    relativeDirection,
  });
  if (resolveDirectionalMergeEdges(relativeDirection).includes(exitEdge)) {
    return null;
  }

  return buildDirectionalCompactReorderIntent({
    activeItem: activeMeasuredItem,
    overItem: previousTarget,
    relativeDirection,
    items,
  });
}

export function resolveCompactReorderOnlyHoverResolution<T extends {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
}>(params: {
  activeSortId: string;
  recognitionPoint: DragPoint;
  previousRecognitionPoint?: DragPoint | null;
  activeVisualRect?: CompactTargetRegion | null;
  measuredItems: Array<T & { rect: CompactTargetRegion }>;
  items: readonly T[];
  previousInteractionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  interactionProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
  visualProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
  resolveRegions: (item: T) => CompactTargetRegions;
  columnGap: number;
  rowGap: number;
}): CompactRootHoverResolution {
  const stickyVisualReorderIntent = (() => {
    const previousVisualReorderIntent = extractCompactReorderIntent(params.previousVisualProjectionIntent);
    if (!previousVisualReorderIntent) {
      return null;
    }
    if (!hasAnyDisplacedShortcut(params.visualProjectionOffsets)) {
      return null;
    }
    if (!shouldKeepStickyReorderIntent({
      activeSortId: params.activeSortId,
      previousReorderIntent: previousVisualReorderIntent,
      measuredItems: params.measuredItems,
      recognitionPoint: params.recognitionPoint,
      resolveRegions: params.resolveRegions,
      directionMap: createEmptyRootDragDirectionMap(),
      columnGap: params.columnGap,
      rowGap: params.rowGap,
    })) {
      return null;
    }
    return previousVisualReorderIntent;
  })();

  const activeMeasuredItem = params.measuredItems.find((item) => item.sortId === params.activeSortId) ?? null;
  const toResolution = (interactionIntent: RootShortcutDropIntent | null): CompactRootHoverResolution => ({
    hoveredSortId: interactionIntent ? resolveIntentTargetShortcutId(interactionIntent) : null,
    interactionIntent,
    visualProjectionIntent: interactionIntent ?? stickyVisualReorderIntent,
  });

  const previousStickyReorderIntent = (() => {
    const previousInteractionReorderIntent = extractCompactReorderIntent(params.previousInteractionIntent);
    if (!previousInteractionReorderIntent) {
      return null;
    }
    if (!hasAnyDisplacedShortcutInAnyProjection({
      interactionProjectionOffsets: params.interactionProjectionOffsets,
      visualProjectionOffsets: params.visualProjectionOffsets,
    })) {
      return null;
    }
    if (!shouldKeepStickyReorderIntent({
      activeSortId: params.activeSortId,
      previousReorderIntent: previousInteractionReorderIntent,
      measuredItems: params.measuredItems,
      recognitionPoint: params.recognitionPoint,
      resolveRegions: params.resolveRegions,
      directionMap: createEmptyRootDragDirectionMap(),
      columnGap: params.columnGap,
      rowGap: params.rowGap,
    })) {
      return null;
    }
    return previousInteractionReorderIntent;
  })();

  const claimedReorderIntent = resolveClaimedReorderIntent({
    activeSortId: params.activeSortId,
    recognitionPoint: params.recognitionPoint,
    activeMeasuredItem,
    previousInteractionIntent: params.previousInteractionIntent,
    previousVisualProjectionIntent: params.previousVisualProjectionIntent,
    interactionProjectionOffsets: params.interactionProjectionOffsets,
    visualProjectionOffsets: params.visualProjectionOffsets,
    resolveRegions: params.resolveRegions,
  });

  if (params.previousInteractionIntent?.type === 'reorder-root') {
    const previousTarget = findMeasuredItemByShortcutId(
      params.measuredItems,
      params.previousInteractionIntent.overShortcutId,
    );
    const previousTargetRegions = previousTarget ? params.resolveRegions(previousTarget) : null;
    const activeSourceIconRegion = resolveActiveSourceIconRegion({
      activeMeasuredItem,
      resolveRegions: params.resolveRegions,
    });

    if (
      previousTarget
      && previousTargetRegions
      && hasAnyDisplacedShortcutInAnyProjection({
        interactionProjectionOffsets: params.interactionProjectionOffsets,
        visualProjectionOffsets: params.visualProjectionOffsets,
      })
      && pointInRect(params.recognitionPoint, previousTargetRegions.targetCellRegion)
      && resolveDirectionalCompactZone({
        activeRect: activeSourceIconRegion ?? previousTargetRegions.targetIconRegion,
        targetRect: previousTargetRegions.targetIconRegion,
        pointer: params.recognitionPoint,
      }) !== 'merge'
    ) {
      return toResolution(params.previousInteractionIntent);
    }
  }

  const pointerOverCandidate = pickCompactTargetCandidate({
    activeSortId: params.activeSortId,
    measuredItems: params.measuredItems,
    pointer: params.recognitionPoint,
    resolveRegions: params.resolveRegions,
  });

  if (!activeMeasuredItem || !pointerOverCandidate) {
    return toResolution(previousStickyReorderIntent ?? claimedReorderIntent);
  }

  const activeSourceIconRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem,
    resolveRegions: params.resolveRegions,
  });
  if (!activeSourceIconRegion) {
    return toResolution(previousStickyReorderIntent ?? claimedReorderIntent);
  }

  const rawIntent = buildDirectionalCompactReorderIntent({
    activeItem: activeMeasuredItem,
    overItem: pointerOverCandidate.overItem,
    relativeDirection: resolveRelativeTargetDirection({
      activeRect: activeSourceIconRegion,
      targetRect: pointerOverCandidate.overRect,
    }),
    items: params.items,
  }) ?? (pointInRect(params.recognitionPoint, pointerOverCandidate.overRect)
    ? buildFallbackCompactReorderIntent({
        activeItem: activeMeasuredItem,
        candidate: pointerOverCandidate,
        pointer: params.recognitionPoint,
        items: params.items,
      })
    : null);

  if (!rawIntent) {
    const previousReorderIntent = extractCompactReorderIntent(params.previousInteractionIntent);
    const shouldHoldPreviousReorder = shouldHoldPreviousReorderAcrossNeutralCandidate({
      activeSortId: params.activeSortId,
      previousReorderIntent,
      candidate: pointerOverCandidate,
      measuredItems: params.measuredItems,
      recognitionPoint: params.recognitionPoint,
      resolveRegions: params.resolveRegions,
      interactionProjectionOffsets: params.interactionProjectionOffsets,
      visualProjectionOffsets: params.visualProjectionOffsets,
    });

    return toResolution(
      shouldHoldPreviousReorder && params.previousInteractionIntent?.type === 'reorder-root'
        ? params.previousInteractionIntent
        : previousStickyReorderIntent ?? claimedReorderIntent,
    );
  }

  return toResolution(rawIntent);
}

export function resolveCompactRootHoverResolution<T extends {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
}>(params: {
  activeSortId: string;
  recognitionPoint: DragPoint;
  previousRecognitionPoint?: DragPoint | null;
  activeVisualRect?: CompactTargetRegion | null;
  measuredItems: Array<T & { rect: CompactTargetRegion }>;
  items: readonly T[];
  previousInteractionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  interactionProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
  visualProjectionOffsets?: ReadonlyMap<string, ProjectionOffset>;
  resolveRegions: (item: T) => CompactTargetRegions;
  directionMap: RootDragDirectionMap;
  slotIntent?: RootShortcutDropIntent | null;
  columnGap: number;
  rowGap: number;
}): CompactRootHoverResolution {
  const activeMeasuredItem = params.measuredItems.find((item) => item.sortId === params.activeSortId) ?? null;
  const stickyVisualReorderIntent = (() => {
    const previousVisualReorderIntent = extractCompactReorderIntent(params.previousVisualProjectionIntent);
    if (!previousVisualReorderIntent) {
      return null;
    }
    if (!hasAnyDisplacedShortcut(params.visualProjectionOffsets)) {
      return null;
    }
    if (!shouldKeepStickyReorderIntent({
      activeSortId: params.activeSortId,
      previousReorderIntent: previousVisualReorderIntent,
      measuredItems: params.measuredItems,
      recognitionPoint: params.recognitionPoint,
      resolveRegions: params.resolveRegions,
      directionMap: params.directionMap,
      columnGap: params.columnGap,
      rowGap: params.rowGap,
    })) {
      return null;
    }
    return previousVisualReorderIntent;
  })();

  const mergeLatchedVisualIntent = resolveLatchedVisualProjectionFromPreviousMerge({
    activeSortId: params.activeSortId,
    recognitionPoint: params.recognitionPoint,
    measuredItems: params.measuredItems,
    previousInteractionIntent: params.previousInteractionIntent,
    previousVisualProjectionIntent: params.previousVisualProjectionIntent,
    visualProjectionOffsets: params.visualProjectionOffsets,
    resolveRegions: params.resolveRegions,
    directionMap: params.directionMap,
    columnGap: params.columnGap,
    rowGap: params.rowGap,
  });

  const toResolution = (interactionIntent: RootShortcutDropIntent | null): CompactRootHoverResolution => ({
    hoveredSortId: interactionIntent ? resolveIntentTargetShortcutId(interactionIntent) : null,
    interactionIntent,
    visualProjectionIntent: buildMergeVisualProjectionIntent({
      interactionIntent,
      previousVisualProjectionIntent: params.previousVisualProjectionIntent,
      visualProjectionOffsets: params.visualProjectionOffsets,
      items: params.items,
      activeSortId: params.activeSortId,
    }) ?? buildCompactVisualProjectionIntent({
      interactionIntent,
      previousVisualProjectionIntent: params.previousVisualProjectionIntent,
      visualProjectionOffsets: params.visualProjectionOffsets,
    }) ?? stickyVisualReorderIntent ?? mergeLatchedVisualIntent,
  });

  const previousStickyReorderIntent = (() => {
    const previousInteractionReorderIntent = extractCompactReorderIntent(params.previousInteractionIntent);
    if (!previousInteractionReorderIntent) {
      return null;
    }
    if (!hasAnyDisplacedShortcutInAnyProjection({
      interactionProjectionOffsets: params.interactionProjectionOffsets,
      visualProjectionOffsets: params.visualProjectionOffsets,
    })) {
      return null;
    }
    if (!shouldKeepStickyReorderIntent({
      activeSortId: params.activeSortId,
      previousReorderIntent: previousInteractionReorderIntent,
      measuredItems: params.measuredItems,
      recognitionPoint: params.recognitionPoint,
      resolveRegions: params.resolveRegions,
      directionMap: params.directionMap,
      columnGap: params.columnGap,
      rowGap: params.rowGap,
    })) {
      return null;
    }
    return previousInteractionReorderIntent;
  })();

  const claimedReorderIntent = resolveClaimedReorderIntent({
    activeSortId: params.activeSortId,
    recognitionPoint: params.recognitionPoint,
    activeMeasuredItem,
    previousInteractionIntent: params.previousInteractionIntent,
    previousVisualProjectionIntent: params.previousVisualProjectionIntent,
    interactionProjectionOffsets: params.interactionProjectionOffsets,
    visualProjectionOffsets: params.visualProjectionOffsets,
    resolveRegions: params.resolveRegions,
  });

  if (params.previousInteractionIntent?.type === 'reorder-root') {
    const previousTarget = findMeasuredItemByShortcutId(
      params.measuredItems,
      params.previousInteractionIntent.overShortcutId,
    );
    const previousTargetRegions = previousTarget ? params.resolveRegions(previousTarget) : null;
    const activeSourceIconRegion = resolveActiveSourceIconRegion({
      activeMeasuredItem,
      resolveRegions: params.resolveRegions,
    });

    if (
      previousTarget
      && previousTargetRegions
      && hasAnyDisplacedShortcutInAnyProjection({
        interactionProjectionOffsets: params.interactionProjectionOffsets,
        visualProjectionOffsets: params.visualProjectionOffsets,
      })
      && pointInRect(params.recognitionPoint, previousTargetRegions.targetCellRegion)
      && (() => {
        const relativeDirection = resolveFrozenTargetDirection(params.directionMap, previousTarget.sortId);
        if (!relativeDirection) {
          return false;
        }

        return resolveDirectionalCompactZone({
          targetRect: previousTargetRegions.targetIconRegion,
          pointer: params.recognitionPoint,
          relativeDirection,
        }) !== 'merge';
      })()
    ) {
      return toResolution(params.previousInteractionIntent);
    }
  }

  const pointerOverCandidate = pickCompactTargetCandidate({
    activeSortId: params.activeSortId,
    measuredItems: params.measuredItems,
    pointer: params.recognitionPoint,
    resolveRegions: params.resolveRegions,
  });

  if (!activeMeasuredItem || !pointerOverCandidate) {
    const mergeExitIntent = activeMeasuredItem
      ? resolveReorderIntentFromPreviousMergeExit({
          activeSortId: params.activeSortId,
          recognitionPoint: params.recognitionPoint,
          previousRecognitionPoint: params.previousRecognitionPoint,
          measuredItems: params.measuredItems,
          previousInteractionIntent: params.previousInteractionIntent,
          resolveRegions: params.resolveRegions,
          items: params.items,
          directionMap: params.directionMap,
        })
      : null;
    const resolution = toResolution(mergeExitIntent ?? params.slotIntent ?? previousStickyReorderIntent);
    if (!mergeExitIntent && !params.slotIntent && !previousStickyReorderIntent && claimedReorderIntent) {
      return toResolution(claimedReorderIntent);
    }
    return resolution;
  }

  const activeSourceIconRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem,
    resolveRegions: params.resolveRegions,
  });
  if (!activeSourceIconRegion) {
    return toResolution(previousStickyReorderIntent ?? claimedReorderIntent);
  }

  const relativeDirection = resolveFrozenTargetDirection(
    params.directionMap,
    pointerOverCandidate.overItem.sortId,
  );
  if (!relativeDirection) {
    return toResolution(previousStickyReorderIntent ?? claimedReorderIntent);
  }

  const rawIntent = buildDirectionalCompactIntent({
    activeItem: activeMeasuredItem,
    candidate: pointerOverCandidate,
    pointer: params.recognitionPoint,
    previousRecognitionPoint: params.previousRecognitionPoint,
    previousInteractionIntent: params.previousInteractionIntent,
    items: params.items,
    relativeDirection,
  });

  if (
    rawIntent?.type === 'move-root-shortcut-into-folder'
    && isShortcutFolder(pointerOverCandidate.overItem.shortcut)
    && claimedReorderIntent?.type === 'reorder-root'
  ) {
    return {
      hoveredSortId: resolveIntentTargetShortcutId(rawIntent),
      interactionIntent: rawIntent,
      visualProjectionIntent: claimedReorderIntent,
    };
  }

  if (!rawIntent) {
    const previousReorderIntent = extractCompactReorderIntent(params.previousInteractionIntent);
    const shouldHoldPreviousReorder = shouldHoldPreviousReorderAcrossNeutralCandidate({
      activeSortId: params.activeSortId,
      previousReorderIntent,
      candidate: pointerOverCandidate,
      measuredItems: params.measuredItems,
      recognitionPoint: params.recognitionPoint,
      resolveRegions: params.resolveRegions,
      directionMap: params.directionMap,
      interactionProjectionOffsets: params.interactionProjectionOffsets,
      visualProjectionOffsets: params.visualProjectionOffsets,
    });

    return toResolution(
      shouldHoldPreviousReorder && params.previousInteractionIntent?.type === 'reorder-root'
        ? params.previousInteractionIntent
        : previousStickyReorderIntent ?? claimedReorderIntent,
    );
  }

  return toResolution(rawIntent);
}
