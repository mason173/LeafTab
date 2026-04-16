import {
  buildRootCenterIntentCandidate,
  getReorderTargetIndex,
  isShortcutFolder,
  resolveRootDropIntent,
  type MeasuredDragItem,
  type ProjectionOffset,
  type PointerPoint,
  type RootDragInteractionMode,
  type RootShortcutDropIntent,
  type Shortcut,
} from '@leaftab/workspace-core';

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
  bigFolderMergeHitArea?: CompactTargetRegion;
};

export type CompactRootHoverResolution = {
  interactionIntent: RootShortcutDropIntent | null;
  visualProjectionIntent: RootShortcutDropIntent | null;
};

export type CompactReorderHoverIntent = {
  overShortcutId: string;
  targetIndex: number;
  edge: 'before' | 'after';
};

export type CompactReorderHoverResolution = {
  interactionIntent: CompactReorderHoverIntent | null;
  visualProjectionIntent: CompactReorderHoverIntent | null;
};

type CompactHoverItem = {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
};

type CompactMeasuredItem<TItem extends CompactHoverItem> = MeasuredDragItem<TItem>;

type CompactOverCandidate<TItem extends CompactHoverItem> = {
  overItem: CompactMeasuredItem<TItem>;
  overRect: CompactTargetRegion;
  overCenterRect: CompactTargetRegion;
};

type RelativeTargetDirection = 'above' | 'below' | 'left' | 'right' | 'overlap';
type TargetEdge = 'left' | 'right' | 'top' | 'bottom';
type DirectionalCompactZone = 'merge' | 'reorder' | 'neutral';
type RectLike = Pick<CompactTargetRegion, 'left' | 'top' | 'right' | 'bottom'>;

function extractPreviousRootReorderIntents(resolution: CompactRootHoverResolution): {
  interactionIntent: Extract<RootShortcutDropIntent, { type: 'reorder-root' }> | null;
  visualProjectionIntent: Extract<RootShortcutDropIntent, { type: 'reorder-root' }> | null;
} {
  return {
    interactionIntent: resolution.interactionIntent?.type === 'reorder-root'
      ? resolution.interactionIntent
      : null,
    visualProjectionIntent: resolution.visualProjectionIntent?.type === 'reorder-root'
      ? resolution.visualProjectionIntent
      : null,
  };
}

export function resolveReorderOnlyRootHoverResolution(params: {
  nextIntent: RootShortcutDropIntent | null;
  previousResolution: CompactRootHoverResolution;
}): CompactRootHoverResolution {
  const { nextIntent, previousResolution } = params;
  const previousReorderIntents = extractPreviousRootReorderIntents(previousResolution);
  return {
    interactionIntent: nextIntent ?? previousReorderIntents.interactionIntent,
    visualProjectionIntent: nextIntent
      ?? previousReorderIntents.visualProjectionIntent
      ?? previousReorderIntents.interactionIntent,
  };
}

export function resolveModeScopedRootReorderIntent(params: {
  dragMode?: RootDragInteractionMode;
  slotIntent?: RootShortcutDropIntent | null;
  externalInsertSlotIntent?: RootShortcutDropIntent | null;
}): RootShortcutDropIntent | null {
  const {
    dragMode = 'normal',
    slotIntent = null,
    externalInsertSlotIntent = null,
  } = params;

  if (dragMode === 'external-insert') {
    return externalInsertSlotIntent;
  }

  return slotIntent;
}

function resolveActiveSourceIconRegion<TItem extends CompactHoverItem>(params: {
  activeMeasuredItem: CompactMeasuredItem<TItem> | null;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
  activeSourceRegionOverride?: CompactTargetRegion | null;
}): CompactTargetRegion | null {
  const { activeMeasuredItem, resolveRegions, activeSourceRegionOverride = null } = params;
  if (activeSourceRegionOverride) {
    return activeSourceRegionOverride;
  }
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

function pointInTargetRegion(point: PointerPoint, rect: CompactTargetRegion): boolean {
  return (
    point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom
  );
}

function pointStrictlyInTargetRegion(point: PointerPoint, rect: CompactTargetRegion): boolean {
  return (
    point.x > rect.left
    && point.x < rect.right
    && point.y > rect.top
    && point.y < rect.bottom
  );
}

function rectIntersectsTargetRegion(rect: CompactTargetRegion, target: CompactTargetRegion): boolean {
  return (
    rect.left < target.right
    && rect.right > target.left
    && rect.top < target.bottom
    && rect.bottom > target.top
  );
}

function distanceToTargetRegion(point: PointerPoint, rect: CompactTargetRegion): number {
  const dx = point.x < rect.left ? rect.left - point.x : point.x > rect.right ? point.x - rect.right : 0;
  const dy = point.y < rect.top ? rect.top - point.y : point.y > rect.bottom ? point.y - rect.bottom : 0;
  return Math.hypot(dx, dy);
}

function distanceToTargetRegionCenter(point: PointerPoint, rect: CompactTargetRegion): number {
  return Math.hypot(point.x - (rect.left + rect.width / 2), point.y - (rect.top + rect.height / 2));
}

function expandTargetRegion(rect: CompactTargetRegion, padding: {
  x: number;
  y: number;
}): CompactTargetRegion {
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

function offsetTargetRegion(
  rect: CompactTargetRegion,
  offset: ProjectionOffset | null | undefined,
): CompactTargetRegion {
  if (!offset) {
    return rect;
  }

  return {
    left: rect.left + offset.x,
    right: rect.right + offset.x,
    top: rect.top + offset.y,
    bottom: rect.bottom + offset.y,
    width: rect.width,
    height: rect.height,
  };
}

function offsetTargetRegions(
  regions: CompactTargetRegions,
  offset: ProjectionOffset | null | undefined,
): CompactTargetRegions {
  if (!offset) {
    return regions;
  }

  return {
    targetCellRegion: offsetTargetRegion(regions.targetCellRegion, offset),
    targetIconRegion: offsetTargetRegion(regions.targetIconRegion, offset),
    targetIconHitRegion: offsetTargetRegion(regions.targetIconHitRegion, offset),
    bigFolderMergeHitArea: regions.bigFolderMergeHitArea
      ? offsetTargetRegion(regions.bigFolderMergeHitArea, offset)
      : undefined,
  };
}

function resolveBigFolderMergeHitArea(regions: CompactTargetRegions): CompactTargetRegion {
  return regions.bigFolderMergeHitArea ?? regions.targetIconRegion;
}

function resolveRelativeTargetDirection(params: {
  activeRect: RectLike;
  targetRect: CompactTargetRegion;
}): RelativeTargetDirection {
  const { activeRect, targetRect } = params;

  if (targetRect.bottom <= activeRect.top) return 'above';
  if (targetRect.top >= activeRect.bottom) return 'below';
  if (targetRect.right <= activeRect.left) return 'left';
  if (targetRect.left >= activeRect.right) return 'right';
  return 'overlap';
}

function buildStickyReorderBridgeRegion(params: {
  activeRect: RectLike;
  targetRect: CompactTargetRegion;
  columnGap: number;
  rowGap: number;
}): CompactTargetRegion | null {
  const { activeRect, targetRect, columnGap, rowGap } = params;
  const relativeDirection = resolveRelativeTargetDirection({ activeRect, targetRect });

  switch (relativeDirection) {
    case 'left':
      return expandTargetRegion({
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
      return expandTargetRegion({
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
      return expandTargetRegion({
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
      return expandTargetRegion({
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

function shouldKeepStickyReorderIntent<TItem extends CompactHoverItem>(params: {
  activeSortId: string;
  previousReorderIntent: CompactReorderHoverIntent | null;
  measuredItems: CompactMeasuredItem<TItem>[];
  recognitionPoint: PointerPoint;
  activeVisualRect?: CompactTargetRegion | null;
  activeSourceRegionOverride?: CompactTargetRegion | null;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
  columnGap: number;
  rowGap: number;
}): boolean {
  const {
    activeSortId,
    previousReorderIntent,
    measuredItems,
    recognitionPoint,
    activeVisualRect = null,
    activeSourceRegionOverride = null,
    resolveRegions,
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
    activeSourceRegionOverride,
  });
  if (!activeSourceIconRegion) return false;

  if (pointInTargetRegion(recognitionPoint, activeSourceIconRegion)) {
    return false;
  }

  const previousTargetRegions = resolveRegions(previousTarget);
  const targetCellRegion = previousTargetRegions.targetCellRegion;
  const targetIconRegion = previousTargetRegions.targetIconRegion;
  const targetIconHitRegion = previousTargetRegions.targetIconHitRegion;
  if (pointInTargetRegion(recognitionPoint, targetCellRegion)) {
    return resolveDirectionalCompactZone({
      activeRect: activeSourceIconRegion,
      targetRect: targetIconRegion,
      pointer: recognitionPoint,
    }) !== 'merge';
  }

  const bridgeRegion = buildStickyReorderBridgeRegion({
    activeRect: activeSourceIconRegion,
    targetRect: targetIconRegion,
    columnGap,
    rowGap,
  });
  if (bridgeRegion) {
    return activeVisualRect
      ? rectIntersectsTargetRegion(activeVisualRect, bridgeRegion)
      : pointInTargetRegion(recognitionPoint, bridgeRegion);
  }
  const stickyDistanceThresholdPx = Math.max(columnGap, rowGap);
  return distanceToTargetRegion(recognitionPoint, targetIconHitRegion) <= stickyDistanceThresholdPx;
}

function resolveDirectionalMergeEdges(relativeDirection: RelativeTargetDirection): TargetEdge[] {
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

function resolveDirectionalReorderEdge(
  relativeDirection: RelativeTargetDirection,
): CompactReorderHoverIntent['edge'] | null {
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

function resolveDirectionalEdgePriority(relativeDirection: RelativeTargetDirection): TargetEdge[] {
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
  pointer: PointerPoint;
  targetRect: CompactTargetRegion;
  relativeDirection: RelativeTargetDirection;
}): TargetEdge {
  const { pointer, targetRect, relativeDirection } = params;
  const priorities = resolveDirectionalEdgePriority(relativeDirection);

  return [
    { edge: 'left' as const, distance: Math.abs(pointer.x - targetRect.left) },
    { edge: 'right' as const, distance: Math.abs(targetRect.right - pointer.x) },
    { edge: 'top' as const, distance: Math.abs(pointer.y - targetRect.top) },
    { edge: 'bottom' as const, distance: Math.abs(targetRect.bottom - pointer.y) },
  ].sort((left, right) => {
    if (left.distance !== right.distance) return left.distance - right.distance;
    return priorities.indexOf(left.edge) - priorities.indexOf(right.edge);
  })[0].edge;
}

function resolveCrossedTargetEdge(params: {
  fromPoint: PointerPoint;
  toPoint: PointerPoint;
  targetRect: CompactTargetRegion;
  relativeDirection: RelativeTargetDirection;
}): TargetEdge | null {
  const { fromPoint, toPoint, targetRect, relativeDirection } = params;
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const priorities = resolveDirectionalEdgePriority(relativeDirection);
  const epsilon = 1e-6;
  const intersections: Array<{ edge: TargetEdge; t: number }> = [];

  const pushIntersection = (edge: TargetEdge, t: number, coordinate: number, min: number, max: number) => {
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
  activeRect: RectLike;
  targetRect: CompactTargetRegion;
  pointer: PointerPoint;
}): DirectionalCompactZone {
  const { activeRect, targetRect, pointer } = params;
  if (pointInTargetRegion(pointer, targetRect)) {
    return 'merge';
  }

  const relativeDirection = resolveRelativeTargetDirection({ activeRect, targetRect });
  if (relativeDirection === 'overlap') {
    return 'reorder';
  }

  const nearestEdge = resolveNearestTargetEdge({
    pointer,
    targetRect,
    relativeDirection,
  });

  return resolveDirectionalMergeEdges(relativeDirection).includes(nearestEdge)
    ? 'neutral'
    : 'reorder';
}

function findMeasuredItemByShortcutId<TItem extends CompactHoverItem>(
  measuredItems: CompactMeasuredItem<TItem>[],
  shortcutId: string,
) {
  return measuredItems.find((item) => item.shortcut.id === shortcutId) ?? null;
}

function hasAnyDisplacedShortcut(projectionOffsets: Map<string, ProjectionOffset>): boolean {
  for (const projection of projectionOffsets.values()) {
    if (Math.abs(projection.x) >= 0.5 || Math.abs(projection.y) >= 0.5) {
      return true;
    }
  }

  return false;
}

function hasAnyDisplacedShortcutInAnyProjection(params: {
  interactionProjectionOffsets: Map<string, ProjectionOffset>;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
}): boolean {
  const { interactionProjectionOffsets, visualProjectionOffsets } = params;
  return hasAnyDisplacedShortcut(interactionProjectionOffsets)
    || hasAnyDisplacedShortcut(visualProjectionOffsets);
}

function resolveClaimedReorderIntent(params: {
  activeSortId: string;
  recognitionPoint: PointerPoint;
  activeMeasuredItem: CompactMeasuredItem<CompactHoverItem> | null;
  previousInteractionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  interactionProjectionOffsets: Map<string, ProjectionOffset>;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  activeSourceRegionOverride?: CompactTargetRegion | null;
  resolveRegions: (item: CompactMeasuredItem<CompactHoverItem>) => CompactTargetRegions;
}): RootShortcutDropIntent | null {
  const {
    activeSortId,
    recognitionPoint,
    activeMeasuredItem,
    previousInteractionIntent,
    previousVisualProjectionIntent,
    interactionProjectionOffsets,
    visualProjectionOffsets,
    activeSourceRegionOverride = null,
    resolveRegions,
  } = params;

  if (!activeMeasuredItem) {
    return null;
  }

  if (!hasAnyDisplacedShortcutInAnyProjection({
    interactionProjectionOffsets,
    visualProjectionOffsets,
  })) {
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
    activeSourceRegionOverride,
  });
  if (!activeSourceRegion) {
    return null;
  }
  if (pointInTargetRegion(recognitionPoint, activeSourceRegion)) {
    return null;
  }

  return claimedIntent;
}

function resolveClaimedReorderOnlyIntent(params: {
  recognitionPoint: PointerPoint;
  activeMeasuredItem: CompactMeasuredItem<CompactHoverItem> | null;
  previousInteractionIntent: CompactReorderHoverIntent | null;
  previousVisualProjectionIntent: CompactReorderHoverIntent | null;
  interactionProjectionOffsets: Map<string, ProjectionOffset>;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  activeSourceRegionOverride?: CompactTargetRegion | null;
  resolveRegions: (item: CompactMeasuredItem<CompactHoverItem>) => CompactTargetRegions;
}): CompactReorderHoverIntent | null {
  const {
    recognitionPoint,
    activeMeasuredItem,
    previousInteractionIntent,
    previousVisualProjectionIntent,
    interactionProjectionOffsets,
    visualProjectionOffsets,
    activeSourceRegionOverride = null,
    resolveRegions,
  } = params;

  if (!activeMeasuredItem) {
    return null;
  }

  if (!hasAnyDisplacedShortcutInAnyProjection({
    interactionProjectionOffsets,
    visualProjectionOffsets,
  })) {
    return null;
  }

  const claimedIntent = previousInteractionIntent ?? previousVisualProjectionIntent;
  if (!claimedIntent) {
    return null;
  }

  const activeSourceRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem,
    resolveRegions,
    activeSourceRegionOverride,
  });
  if (!activeSourceRegion) {
    return null;
  }
  if (pointInTargetRegion(recognitionPoint, activeSourceRegion)) {
    return null;
  }

  return claimedIntent;
}

function shouldHoldPreviousReorderAcrossNeutralCandidate<TItem extends CompactHoverItem>(params: {
  activeSortId: string;
  previousReorderIntent: CompactReorderHoverIntent | null;
  candidate: CompactOverCandidate<TItem> | null;
  measuredItems: CompactMeasuredItem<TItem>[];
  recognitionPoint: PointerPoint;
  activeSourceRegionOverride?: CompactTargetRegion | null;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
  interactionProjectionOffsets: Map<string, ProjectionOffset>;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
}): boolean {
  const {
    activeSortId,
    previousReorderIntent,
    candidate,
    measuredItems,
    recognitionPoint,
    activeSourceRegionOverride = null,
    resolveRegions,
    interactionProjectionOffsets,
    visualProjectionOffsets,
  } = params;

  if (!previousReorderIntent || !candidate) return false;
  if (!hasAnyDisplacedShortcutInAnyProjection({
    interactionProjectionOffsets,
    visualProjectionOffsets,
  })) {
    return false;
  }

  const activeMeasuredItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  const previousTarget = findMeasuredItemByShortcutId(measuredItems, previousReorderIntent.overShortcutId);
  if (!activeMeasuredItem || !previousTarget) return false;

  const activeSourceRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem,
    resolveRegions,
    activeSourceRegionOverride,
  });
  if (!activeSourceRegion) return false;
  const previousDirection = resolveRelativeTargetDirection({
    activeRect: activeSourceRegion,
    targetRect: resolveRegions(previousTarget).targetIconRegion,
  });
  const candidateDirection = resolveRelativeTargetDirection({
    activeRect: activeSourceRegion,
    targetRect: candidate.overRect,
  });
  if (previousDirection === 'overlap' || candidateDirection !== previousDirection) {
    return false;
  }

  return resolveDirectionalCompactZone({
    activeRect: activeSourceRegion,
    targetRect: candidate.overRect,
    pointer: recognitionPoint,
  }) === 'neutral';
}

function pickCompactTargetCandidate<TItem extends CompactHoverItem>(params: {
  activeSortId: string;
  measuredItems: CompactMeasuredItem<TItem>[];
  pointer: PointerPoint;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
}): CompactOverCandidate<TItem> | null {
  const { activeSortId, measuredItems, pointer, resolveRegions } = params;
  const activeItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  if (activeItem && pointInTargetRegion(pointer, resolveRegions(activeItem).targetIconHitRegion)) {
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
        inside: pointInTargetRegion(pointer, regions.targetCellRegion),
        centerDistance: distanceToTargetRegionCenter(pointer, regions.targetIconRegion),
      };
    })
    .filter((candidate) => candidate.inside)
    .sort((left, right) => {
      if (left.centerDistance !== right.centerDistance) return left.centerDistance - right.centerDistance;
      return distanceToTargetRegionCenter(pointer, left.overCenterRect)
        - distanceToTargetRegionCenter(pointer, right.overCenterRect);
    })[0];

  if (!directHit) return null;

  return {
    overItem: directHit.item,
    overRect: directHit.overRect,
    overCenterRect: directHit.overCenterRect,
  };
}

function buildCompactCenterIntent<TItem extends CompactHoverItem>(params: {
  activeItem: CompactMeasuredItem<TItem>;
  overItem: CompactMeasuredItem<TItem>;
  dragMode?: RootDragInteractionMode;
}): RootShortcutDropIntent | null {
  const { activeItem, overItem, dragMode = 'normal' } = params;
  return buildRootCenterIntentCandidate({
    activeItem,
    overItem,
    mode: dragMode,
  })?.intent ?? null;
}

function buildDirectionalCompactReorderIntent<TItem extends CompactHoverItem>(params: {
  activeItem: CompactMeasuredItem<TItem>;
  overItem: CompactMeasuredItem<TItem>;
  relativeDirection: RelativeTargetDirection;
}): CompactReorderHoverIntent | null {
  const { activeItem, overItem, relativeDirection } = params;
  const edge = resolveDirectionalReorderEdge(relativeDirection);
  if (!edge) return null;

  const targetIndex = getReorderTargetIndex(
    activeItem.shortcutIndex,
    overItem.shortcutIndex,
    edge,
  );
  if (targetIndex === activeItem.shortcutIndex) {
    return null;
  }

  return {
    overShortcutId: overItem.shortcut.id,
    targetIndex,
    edge,
  };
}

function buildSourceTargetCompactReorderIntent<TItem extends CompactHoverItem>(params: {
  activeItem: CompactMeasuredItem<TItem>;
  overItem: CompactMeasuredItem<TItem>;
  sourceTargetShortcutId?: string | null;
}): CompactReorderHoverIntent | null {
  const { activeItem, overItem, sourceTargetShortcutId = null } = params;
  if (!sourceTargetShortcutId || overItem.shortcut.id !== sourceTargetShortcutId) {
    return null;
  }

  const targetIndex = getReorderTargetIndex(
    activeItem.shortcutIndex,
    overItem.shortcutIndex,
    'before',
  );
  if (targetIndex === activeItem.shortcutIndex) {
    return null;
  }

  return {
    overShortcutId: overItem.shortcut.id,
    targetIndex,
    edge: 'before',
  };
}

function extractCompactReorderIntent(
  intent: RootShortcutDropIntent | null,
): CompactReorderHoverIntent | null {
  if (intent?.type !== 'reorder-root') return null;
  return {
    overShortcutId: intent.overShortcutId,
    targetIndex: intent.targetIndex,
    edge: intent.edge,
  };
}

function toRootReorderIntent(
  activeShortcutId: string,
  intent: CompactReorderHoverIntent,
): RootShortcutDropIntent {
  return {
    type: 'reorder-root',
    activeShortcutId,
    overShortcutId: intent.overShortcutId,
    targetIndex: intent.targetIndex,
    edge: intent.edge,
  };
}

function buildFallbackCompactReorderIntent<TItem extends CompactHoverItem>(params: {
  activeItem: CompactMeasuredItem<TItem>;
  candidate: CompactOverCandidate<TItem>;
  pointer: PointerPoint;
  items: TItem[];
  dragMode?: RootDragInteractionMode;
}): CompactReorderHoverIntent | null {
  const { activeItem, candidate, pointer, items, dragMode = 'reorder-only' } = params;
  return extractCompactReorderIntent(resolveRootDropIntent({
    activeSortId: activeItem.sortId,
    overSortId: candidate.overItem.sortId,
    pointer,
    overRect: candidate.overRect,
    overCenterRect: candidate.overCenterRect,
    items,
    mode: dragMode,
    centerHitMode: 'full-center-rect',
    allowCenterIntent: false,
  }));
}

function resolveEnteredTargetThisFrame(params: {
  previousRecognitionPoint?: PointerPoint | null;
  targetRect: CompactTargetRegion;
  pointer: PointerPoint;
}): boolean {
  const { previousRecognitionPoint = null, targetRect, pointer } = params;
  return Boolean(
    previousRecognitionPoint
    && !pointStrictlyInTargetRegion(previousRecognitionPoint, targetRect)
    && pointInTargetRegion(pointer, targetRect),
  );
}

function buildDirectionalCompactIntent<TItem extends CompactHoverItem>(params: {
  activeItem: CompactMeasuredItem<TItem>;
  activeSourceRegion: CompactTargetRegion;
  candidate: CompactOverCandidate<TItem>;
  candidateRegions: CompactTargetRegions;
  dragMode?: RootDragInteractionMode;
  pointer: PointerPoint;
  previousRecognitionPoint?: PointerPoint | null;
  previousInteractionIntent?: RootShortcutDropIntent | null;
  items: TItem[];
}): RootShortcutDropIntent | null {
  const {
    activeItem,
    activeSourceRegion,
    candidate,
    candidateRegions,
    dragMode = 'normal',
    pointer,
    previousRecognitionPoint = null,
    previousInteractionIntent = null,
    items,
  } = params;
  const relativeDirection = resolveRelativeTargetDirection({
    activeRect: activeSourceRegion,
    targetRect: candidate.overRect,
  });
  const centerIntent = buildCompactCenterIntent({
    activeItem,
    overItem: candidate.overItem,
    dragMode,
  });
  const targetIsLargeFolder = (
    isShortcutFolder(candidate.overItem.shortcut)
    && candidate.overItem.shortcut.folderDisplayMode === 'large'
  );
  const previousTargetShortcutId = resolveIntentTargetShortcutId(previousInteractionIntent);
  const sameTargetAsPrevious = previousTargetShortcutId === candidate.overItem.shortcut.id;
  const previousReorderIntentForSameTarget = (
    sameTargetAsPrevious && previousInteractionIntent?.type === 'reorder-root'
      ? previousInteractionIntent
      : null
  );
  const mergeHitArea = targetIsLargeFolder
    ? resolveBigFolderMergeHitArea(candidateRegions)
    : candidate.overRect;
  const zone = pointInTargetRegion(pointer, mergeHitArea)
    ? 'merge'
    : resolveDirectionalCompactZone({
        activeRect: activeSourceRegion,
        targetRect: candidate.overRect,
        pointer,
      });

  if (zone === 'merge' && centerIntent) {
    const enteredTargetIconThisFrame = resolveEnteredTargetThisFrame({
      previousRecognitionPoint,
      targetRect: mergeHitArea,
      pointer,
    });
    const mergeEdges = resolveDirectionalMergeEdges(relativeDirection);

    if (previousReorderIntentForSameTarget) {
      if (!enteredTargetIconThisFrame) {
        return previousReorderIntentForSameTarget;
      }

      const entryEdge = resolveCrossedTargetEdge({
        fromPoint: previousRecognitionPoint!,
        toPoint: pointer,
        targetRect: mergeHitArea,
        relativeDirection,
      }) ?? resolveNearestTargetEdge({
        pointer: previousRecognitionPoint!,
        targetRect: mergeHitArea,
        relativeDirection,
      });

      if (!mergeEdges.includes(entryEdge)) {
        return previousReorderIntentForSameTarget;
      }
    }

    if (
      targetIsLargeFolder
      && previousRecognitionPoint
      && pointInTargetRegion(previousRecognitionPoint, mergeHitArea)
      && previousInteractionIntent?.type !== 'move-root-shortcut-into-folder'
    ) {
      return null;
    }

    if (enteredTargetIconThisFrame) {
      const entryEdge = resolveCrossedTargetEdge({
        fromPoint: previousRecognitionPoint!,
        toPoint: pointer,
        targetRect: mergeHitArea,
        relativeDirection,
      }) ?? resolveNearestTargetEdge({
        pointer: previousRecognitionPoint!,
        targetRect: mergeHitArea,
        relativeDirection,
      });

      if (!mergeEdges.includes(entryEdge)) {
        if (targetIsLargeFolder) {
          return null;
        }

        const reorderIntent = (
          buildDirectionalCompactReorderIntent({
            activeItem,
            overItem: candidate.overItem,
            relativeDirection,
          })
          ?? buildFallbackCompactReorderIntent({
            activeItem,
            candidate,
            pointer,
            items,
            dragMode,
          })
        );

        if (reorderIntent) {
          return toRootReorderIntent(activeItem.shortcut.id, reorderIntent);
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

  const reorderIntent = (
    buildDirectionalCompactReorderIntent({
      activeItem,
      overItem: candidate.overItem,
      relativeDirection,
    })
    ?? buildFallbackCompactReorderIntent({
      activeItem,
      candidate,
      pointer,
      items,
      dragMode,
    })
  );
  if (reorderIntent) {
    return toRootReorderIntent(activeItem.shortcut.id, reorderIntent);
  }

  return resolveRootDropIntent({
      activeSortId: activeItem.sortId,
      overSortId: candidate.overItem.sortId,
      pointer,
      overRect: candidate.overRect,
      overCenterRect: candidate.overCenterRect,
      items,
      mode: dragMode,
      centerHitMode: 'full-center-rect',
      allowCenterIntent: zone === 'merge',
    });
}

function resolveReorderIntentFromPreviousMergeExit<TItem extends CompactHoverItem>(params: {
  activeSortId: string;
  recognitionPoint: PointerPoint;
  previousRecognitionPoint?: PointerPoint | null;
  measuredItems: CompactMeasuredItem<TItem>[];
  previousInteractionIntent: RootShortcutDropIntent | null;
  activeSourceRegionOverride?: CompactTargetRegion | null;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
}): RootShortcutDropIntent | null {
  const {
    activeSortId,
    recognitionPoint,
    previousRecognitionPoint = null,
    measuredItems,
    previousInteractionIntent,
    activeSourceRegionOverride = null,
    resolveRegions,
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
  if (
    isShortcutFolder(previousTarget.shortcut)
    && previousTarget.shortcut.folderDisplayMode === 'large'
  ) {
    return null;
  }

  const targetIconRegion = resolveRegions(previousTarget).targetIconRegion;
  if (!pointInTargetRegion(previousRecognitionPoint, targetIconRegion)) {
    return null;
  }
  if (pointInTargetRegion(recognitionPoint, targetIconRegion)) {
    return null;
  }

  const activeSourceRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem,
    resolveRegions,
    activeSourceRegionOverride,
  });
  if (!activeSourceRegion) {
    return null;
  }
  const relativeDirection = resolveRelativeTargetDirection({
    activeRect: activeSourceRegion,
    targetRect: targetIconRegion,
  });
  if (relativeDirection === 'overlap') {
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

  const reorderIntent = buildDirectionalCompactReorderIntent({
    activeItem: activeMeasuredItem,
    overItem: previousTarget,
    relativeDirection,
  });
  if (!reorderIntent) {
    return null;
  }

  return toRootReorderIntent(activeMeasuredItem.shortcut.id, reorderIntent);
}

function buildCompactVisualProjectionIntent(params: {
  interactionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
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

function resolveLatchedVisualProjectionFromPreviousMerge<TItem extends CompactHoverItem>(params: {
  activeSortId: string;
  recognitionPoint: PointerPoint;
  measuredItems: CompactMeasuredItem<TItem>[];
  previousInteractionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  activeSourceRegionOverride?: CompactTargetRegion | null;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
  columnGap: number;
  rowGap: number;
}): RootShortcutDropIntent | null {
  const {
    activeSortId,
    recognitionPoint,
    measuredItems,
    previousInteractionIntent,
    previousVisualProjectionIntent,
    visualProjectionOffsets,
    activeSourceRegionOverride = null,
    resolveRegions,
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
    activeSourceRegionOverride,
  });
  if (!activeSourceIconRegion) {
    return null;
  }
  if (pointInTargetRegion(recognitionPoint, activeSourceIconRegion)) {
    return null;
  }

  const mergeTargetRegions = resolveRegions(mergeTarget);
  if (pointInTargetRegion(recognitionPoint, mergeTargetRegions.targetCellRegion)) {
    return previousVisualProjectionIntent;
  }

  if (claimedTarget) {
    const claimedTargetRegions = resolveRegions(claimedTarget);
    if (pointInTargetRegion(recognitionPoint, claimedTargetRegions.targetCellRegion)) {
      return previousVisualProjectionIntent;
    }
  }

  const bridgeRegion = buildStickyReorderBridgeRegion({
    activeRect: activeSourceIconRegion,
    targetRect: mergeTargetRegions.targetIconRegion,
    columnGap,
    rowGap,
  });
  if (bridgeRegion && pointInTargetRegion(recognitionPoint, bridgeRegion)) {
    return previousVisualProjectionIntent;
  }

  return null;
}

function resolveStickyVisualReorderIntent<TItem extends CompactHoverItem>(params: {
  activeSortId: string;
  previousVisualProjectionIntent: CompactReorderHoverIntent | null;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  measuredItems: CompactMeasuredItem<TItem>[];
  recognitionPoint: PointerPoint;
  activeVisualRect?: CompactTargetRegion | null;
  activeSourceRegionOverride?: CompactTargetRegion | null;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
  columnGap: number;
  rowGap: number;
}): CompactReorderHoverIntent | null {
  const {
    activeSortId,
    previousVisualProjectionIntent,
    visualProjectionOffsets,
    measuredItems,
    recognitionPoint,
    activeVisualRect = null,
    activeSourceRegionOverride = null,
    resolveRegions,
    columnGap,
    rowGap,
  } = params;

  if (!previousVisualProjectionIntent) return null;
  if (!hasAnyDisplacedShortcut(visualProjectionOffsets)) {
    return null;
  }

  if (!shouldKeepStickyReorderIntent({
    activeSortId,
    previousReorderIntent: previousVisualProjectionIntent,
    measuredItems,
    recognitionPoint,
    activeVisualRect,
    activeSourceRegionOverride,
    resolveRegions,
    columnGap,
    rowGap,
  })) {
    return null;
  }

  return previousVisualProjectionIntent;
}

function buildDirectionalCompactReorderOnlyIntent<TItem extends CompactHoverItem>(params: {
  activeItem: CompactMeasuredItem<TItem>;
  activeSourceRegion: CompactTargetRegion;
  candidate: CompactOverCandidate<TItem>;
  pointer: PointerPoint;
  previousRecognitionPoint?: PointerPoint | null;
  previousInteractionIntent?: CompactReorderHoverIntent | null;
  items: TItem[];
  sourceTargetShortcutId?: string | null;
  allowTargetCellHit?: boolean;
}): CompactReorderHoverIntent | null {
  const {
    activeItem,
    activeSourceRegion,
    candidate,
    pointer,
    items,
    sourceTargetShortcutId = null,
    allowTargetCellHit = false,
  } = params;
  if (!allowTargetCellHit && !pointInTargetRegion(pointer, candidate.overRect)) {
    return null;
  }

  const sourceTargetIntent = buildSourceTargetCompactReorderIntent({
    activeItem,
    overItem: candidate.overItem,
    sourceTargetShortcutId,
  });
  if (sourceTargetIntent) {
    return sourceTargetIntent;
  }

  const relativeDirection = resolveRelativeTargetDirection({
    activeRect: activeSourceRegion,
    targetRect: candidate.overRect,
  });

  return (
    buildDirectionalCompactReorderIntent({
      activeItem,
      overItem: candidate.overItem,
      relativeDirection,
    })
    ?? buildFallbackCompactReorderIntent({
      activeItem,
      candidate,
      pointer,
      items,
    })
  );
}

export function resolveCompactReorderOnlyHoverResolution<TItem extends CompactHoverItem>(params: {
  activeSortId: string;
  recognitionPoint: PointerPoint;
  previousRecognitionPoint?: PointerPoint | null;
  activeVisualRect?: CompactTargetRegion | null;
  activeSourceRegionOverride?: CompactTargetRegion | null;
  sourceTargetShortcutId?: string | null;
  measuredItems: CompactMeasuredItem<TItem>[];
  items: TItem[];
  previousInteractionIntent: CompactReorderHoverIntent | null;
  previousVisualProjectionIntent: CompactReorderHoverIntent | null;
  interactionProjectionOffsets: Map<string, ProjectionOffset>;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
  columnGap: number;
  rowGap: number;
}): CompactReorderHoverResolution {
  const {
    activeSortId,
    recognitionPoint,
    previousRecognitionPoint = null,
    activeVisualRect = null,
    activeSourceRegionOverride = null,
    sourceTargetShortcutId = null,
    measuredItems,
    items,
    previousInteractionIntent,
    previousVisualProjectionIntent,
    interactionProjectionOffsets,
    visualProjectionOffsets,
    resolveRegions,
    columnGap,
    rowGap,
  } = params;

  const stickyVisualReorderIntent = resolveStickyVisualReorderIntent({
    activeSortId,
    previousVisualProjectionIntent,
    visualProjectionOffsets,
    measuredItems,
    recognitionPoint,
    activeVisualRect,
    activeSourceRegionOverride,
    resolveRegions,
    columnGap,
    rowGap,
  });

  const activeMeasuredItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;

  const toResolution = (
    interactionIntent: CompactReorderHoverIntent | null,
  ): CompactReorderHoverResolution => ({
    interactionIntent,
    visualProjectionIntent: interactionIntent ?? stickyVisualReorderIntent,
  });

  const previousStickyReorderIntent = (() => {
    if (!hasAnyDisplacedShortcutInAnyProjection({
      interactionProjectionOffsets,
      visualProjectionOffsets,
    })) {
      return null;
    }

    if (!shouldKeepStickyReorderIntent({
      activeSortId,
      previousReorderIntent: previousInteractionIntent,
      measuredItems,
      recognitionPoint,
      activeVisualRect,
      activeSourceRegionOverride,
      resolveRegions,
      columnGap,
      rowGap,
    })) {
      return null;
    }

    return previousInteractionIntent;
  })();
  const claimedReorderIntent = resolveClaimedReorderOnlyIntent({
    recognitionPoint,
    activeMeasuredItem,
    previousInteractionIntent,
    previousVisualProjectionIntent,
    interactionProjectionOffsets,
    visualProjectionOffsets,
    activeSourceRegionOverride,
    resolveRegions: resolveRegions as (
      item: CompactMeasuredItem<CompactHoverItem>,
    ) => CompactTargetRegions,
  });

  if (previousInteractionIntent) {
    const previousTarget = findMeasuredItemByShortcutId(measuredItems, previousInteractionIntent.overShortcutId);
    const previousTargetRegions = previousTarget ? resolveRegions(previousTarget) : null;
    const activeSourceIconRegion = resolveActiveSourceIconRegion({
      activeMeasuredItem,
      resolveRegions,
      activeSourceRegionOverride,
    });
    if (
      previousTarget
      && previousTargetRegions
      && hasAnyDisplacedShortcutInAnyProjection({
        interactionProjectionOffsets,
        visualProjectionOffsets,
      })
      && pointInTargetRegion(recognitionPoint, previousTargetRegions.targetCellRegion)
      && resolveDirectionalCompactZone({
        activeRect: activeSourceIconRegion ?? previousTargetRegions.targetIconRegion,
        targetRect: previousTargetRegions.targetIconRegion,
        pointer: recognitionPoint,
      }) !== 'merge'
    ) {
      return toResolution(previousInteractionIntent);
    }
  }

  const pointerOverCandidate = pickCompactTargetCandidate({
    activeSortId,
    measuredItems,
    pointer: recognitionPoint,
    resolveRegions,
  });
  if (!activeMeasuredItem || !pointerOverCandidate) {
    return toResolution(previousStickyReorderIntent ?? claimedReorderIntent);
  }

  const activeSourceIconRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem,
    resolveRegions,
    activeSourceRegionOverride,
  });
  if (!activeSourceIconRegion) {
    return toResolution(previousStickyReorderIntent ?? claimedReorderIntent);
  }
  const rawIntent = buildDirectionalCompactReorderOnlyIntent({
    activeItem: activeMeasuredItem,
    activeSourceRegion: activeSourceIconRegion,
    candidate: pointerOverCandidate,
    pointer: recognitionPoint,
    previousRecognitionPoint,
    previousInteractionIntent,
    items,
    sourceTargetShortcutId,
    allowTargetCellHit: Boolean(activeSourceRegionOverride || sourceTargetShortcutId),
  });
  if (!rawIntent) {
    const shouldHoldPreviousReorder = shouldHoldPreviousReorderAcrossNeutralCandidate({
      activeSortId,
      previousReorderIntent: previousInteractionIntent,
      candidate: pointerOverCandidate,
      measuredItems,
      recognitionPoint,
      activeSourceRegionOverride,
      resolveRegions,
      interactionProjectionOffsets,
      visualProjectionOffsets,
    });
    return toResolution(
      shouldHoldPreviousReorder
        ? previousInteractionIntent
        : previousStickyReorderIntent ?? claimedReorderIntent,
    );
  }

  return toResolution(rawIntent);
}

export function resolveCompactRootHoverResolution<TItem extends CompactHoverItem>(params: {
  activeSortId: string;
  dragMode?: RootDragInteractionMode;
  recognitionPoint: PointerPoint;
  previousRecognitionPoint?: PointerPoint | null;
  activeVisualRect?: CompactTargetRegion | null;
  activeSourceRegionOverride?: CompactTargetRegion | null;
  measuredItems: CompactMeasuredItem<TItem>[];
  items: TItem[];
  previousInteractionIntent: RootShortcutDropIntent | null;
  previousVisualProjectionIntent: RootShortcutDropIntent | null;
  interactionProjectionOffsets: Map<string, ProjectionOffset>;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
  slotIntent?: RootShortcutDropIntent | null;
  preferSlotIntentForReorder?: boolean;
  columnGap: number;
  rowGap: number;
}): CompactRootHoverResolution {
  const {
    activeSortId,
    dragMode = 'normal',
    recognitionPoint,
    previousRecognitionPoint = null,
    activeVisualRect = null,
    activeSourceRegionOverride = null,
    measuredItems,
    items,
    previousInteractionIntent,
    previousVisualProjectionIntent,
    interactionProjectionOffsets,
    visualProjectionOffsets,
    resolveRegions,
    slotIntent = null,
    preferSlotIntentForReorder = false,
    columnGap,
    rowGap,
  } = params;

  const activeMeasuredItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  const resolveDisplayedRegions = (item: CompactMeasuredItem<TItem>): CompactTargetRegions => {
    const regions = resolveRegions(item);
    if (!preferSlotIntentForReorder || item.sortId === activeSortId) {
      return regions;
    }

    return offsetTargetRegions(
      regions,
      visualProjectionOffsets.get(item.sortId)
      ?? interactionProjectionOffsets.get(item.sortId),
    );
  };

  const stickyVisualReorderIntent = resolveStickyVisualReorderIntent({
    activeSortId,
    previousVisualProjectionIntent: extractCompactReorderIntent(previousVisualProjectionIntent),
    visualProjectionOffsets,
    measuredItems,
    recognitionPoint,
    activeVisualRect,
    activeSourceRegionOverride,
    resolveRegions: resolveDisplayedRegions,
    columnGap,
    rowGap,
  });
  const mergeLatchedVisualIntent = resolveLatchedVisualProjectionFromPreviousMerge({
    activeSortId,
    recognitionPoint,
    measuredItems,
    previousInteractionIntent,
    previousVisualProjectionIntent,
    visualProjectionOffsets,
    activeSourceRegionOverride,
    resolveRegions: resolveDisplayedRegions,
    columnGap,
    rowGap,
  });

  const toResolution = (interactionIntent: RootShortcutDropIntent | null): CompactRootHoverResolution => ({
    interactionIntent,
    visualProjectionIntent: buildCompactVisualProjectionIntent({
    interactionIntent,
    previousVisualProjectionIntent,
    visualProjectionOffsets,
    }) ?? (
      stickyVisualReorderIntent
        ? toRootReorderIntent(activeSortId, stickyVisualReorderIntent)
        : mergeLatchedVisualIntent
    ),
  });

  const previousStickyReorderIntent = (() => {
    if (!hasAnyDisplacedShortcutInAnyProjection({
      interactionProjectionOffsets,
      visualProjectionOffsets,
    })) {
      return null;
    }

    if (!shouldKeepStickyReorderIntent({
      activeSortId,
      previousReorderIntent: extractCompactReorderIntent(previousInteractionIntent),
      measuredItems,
      recognitionPoint,
      activeVisualRect,
      activeSourceRegionOverride,
      resolveRegions: resolveDisplayedRegions,
      columnGap,
      rowGap,
    })) {
      return null;
    }

    return previousInteractionIntent;
  })();
  const claimedReorderIntent = resolveClaimedReorderIntent({
    activeSortId,
    recognitionPoint,
    activeMeasuredItem,
    previousInteractionIntent,
    previousVisualProjectionIntent,
    interactionProjectionOffsets,
    visualProjectionOffsets,
    activeSourceRegionOverride,
    resolveRegions: resolveDisplayedRegions as (
      item: CompactMeasuredItem<CompactHoverItem>,
    ) => CompactTargetRegions,
  });
  const mergeExitIntent = activeMeasuredItem
    ? resolveReorderIntentFromPreviousMergeExit({
        activeSortId,
        recognitionPoint,
        previousRecognitionPoint,
        measuredItems,
        previousInteractionIntent,
        activeSourceRegionOverride,
        resolveRegions: resolveDisplayedRegions,
      })
    : null;

  if (!preferSlotIntentForReorder && previousInteractionIntent?.type === 'reorder-root') {
    const previousTarget = findMeasuredItemByShortcutId(measuredItems, previousInteractionIntent.overShortcutId);
    const previousTargetRegions = previousTarget ? resolveDisplayedRegions(previousTarget) : null;
    const previousMergeHitArea = previousTargetRegions && isShortcutFolder(previousTarget?.shortcut)
      && previousTarget.shortcut.folderDisplayMode === 'large'
      ? resolveBigFolderMergeHitArea(previousTargetRegions)
      : previousTargetRegions?.targetIconRegion ?? null;
    if (
      previousTarget
      && previousTargetRegions
      && hasAnyDisplacedShortcutInAnyProjection({
        interactionProjectionOffsets,
        visualProjectionOffsets,
      })
      && pointInTargetRegion(recognitionPoint, previousTargetRegions.targetCellRegion)
      && (!previousMergeHitArea || !pointInTargetRegion(recognitionPoint, previousMergeHitArea))
    ) {
      return toResolution(previousInteractionIntent);
    }
  }

  if (claimedReorderIntent?.type === 'reorder-root') {
    const claimedTarget = findMeasuredItemByShortcutId(measuredItems, claimedReorderIntent.overShortcutId);
    const claimedTargetRegions = claimedTarget ? resolveRegions(claimedTarget) : null;
    const claimedMergeHitArea = claimedTargetRegions && isShortcutFolder(claimedTarget?.shortcut)
      && claimedTarget.shortcut.folderDisplayMode === 'large'
      ? resolveBigFolderMergeHitArea(claimedTargetRegions)
      : claimedTargetRegions?.targetIconRegion ?? null;

    if (
      claimedTarget
      && claimedTargetRegions
      && pointInTargetRegion(recognitionPoint, claimedTargetRegions.targetCellRegion)
      && (!claimedMergeHitArea || !pointInTargetRegion(recognitionPoint, claimedMergeHitArea))
    ) {
      return toResolution(claimedReorderIntent);
    }
  }

  if (mergeExitIntent) {
    return toResolution(mergeExitIntent);
  }

  const pointerOverCandidate = pickCompactTargetCandidate({
    activeSortId,
    measuredItems,
    pointer: recognitionPoint,
    resolveRegions: resolveDisplayedRegions,
  });
  if (!activeMeasuredItem || !pointerOverCandidate) {
    const resolution = toResolution(mergeExitIntent ?? slotIntent ?? previousStickyReorderIntent);
    if (!mergeExitIntent && !slotIntent && !previousStickyReorderIntent && claimedReorderIntent) {
      return toResolution(claimedReorderIntent);
    }
    return resolution;
  }

  const activeSourceIconRegion = resolveActiveSourceIconRegion({
    activeMeasuredItem,
    resolveRegions: resolveDisplayedRegions,
    activeSourceRegionOverride,
  });
  if (!activeSourceIconRegion) {
    return toResolution(
      (preferSlotIntentForReorder ? slotIntent : null)
      ?? previousStickyReorderIntent
      ?? claimedReorderIntent,
    );
  }
  const rawIntent = buildDirectionalCompactIntent({
    activeItem: activeMeasuredItem,
    activeSourceRegion: activeSourceIconRegion,
    candidate: pointerOverCandidate,
    candidateRegions: resolveDisplayedRegions(pointerOverCandidate.overItem),
    dragMode,
    pointer: recognitionPoint,
    previousRecognitionPoint,
    previousInteractionIntent,
    items,
  });
  if (
    rawIntent?.type === 'move-root-shortcut-into-folder'
    && isShortcutFolder(pointerOverCandidate.overItem.shortcut)
    && claimedReorderIntent?.type === 'reorder-root'
  ) {
    return {
      interactionIntent: rawIntent,
      visualProjectionIntent: claimedReorderIntent,
    };
  }
  if (!rawIntent) {
    const previousReorderIntent = extractCompactReorderIntent(previousInteractionIntent);
    const shouldHoldPreviousReorder = shouldHoldPreviousReorderAcrossNeutralCandidate({
      activeSortId,
      previousReorderIntent,
      candidate: pointerOverCandidate,
      measuredItems,
      recognitionPoint,
      activeSourceRegionOverride,
      resolveRegions: resolveDisplayedRegions,
      interactionProjectionOffsets,
      visualProjectionOffsets,
    });
    const shouldPreferSparseSlotIntent = (
      preferSlotIntentForReorder
      && !pointerOverCandidate
    );
    const resolution = toResolution(
      (shouldPreferSparseSlotIntent ? slotIntent : null)
      ?? (
      (shouldHoldPreviousReorder && previousInteractionIntent?.type === 'reorder-root'
        ? previousInteractionIntent
        : previousStickyReorderIntent ?? claimedReorderIntent)
      ),
    );
    if (
      shouldPreferSparseSlotIntent
      && slotIntent?.type === 'reorder-root'
      && resolution.interactionIntent?.type !== 'move-root-shortcut-into-folder'
    ) {
      return toResolution(slotIntent);
    }
    return resolution;
  }

  if (preferSlotIntentForReorder && rawIntent.type === 'reorder-root') {
    return toResolution(slotIntent ?? rawIntent);
  }

  return toResolution(rawIntent);
}

export function resolveModeAwareCompactRootHoverResolution<TItem extends CompactHoverItem>(params: {
  dragMode?: RootDragInteractionMode;
  activeSortId: string;
  recognitionPoint: PointerPoint;
  previousRecognitionPoint?: PointerPoint | null;
  activeVisualRect?: CompactTargetRegion | null;
  activeSourceRegionOverride?: CompactTargetRegion | null;
  measuredItems: CompactMeasuredItem<TItem>[];
  items: TItem[];
  previousResolution: CompactRootHoverResolution;
  interactionProjectionOffsets: Map<string, ProjectionOffset>;
  visualProjectionOffsets: Map<string, ProjectionOffset>;
  resolveRegions: (item: CompactMeasuredItem<TItem>) => CompactTargetRegions;
  slotIntent?: RootShortcutDropIntent | null;
  externalInsertSlotIntent?: RootShortcutDropIntent | null;
  preferSlotIntentForReorder?: boolean;
  columnGap: number;
  rowGap: number;
}): CompactRootHoverResolution {
  const {
    dragMode = 'normal',
    previousResolution,
    slotIntent = null,
    externalInsertSlotIntent = null,
    ...rest
  } = params;

  const reorderOnlyIntent = resolveModeScopedRootReorderIntent({
    dragMode,
    slotIntent,
    externalInsertSlotIntent,
  });

  if (dragMode !== 'normal') {
    return resolveReorderOnlyRootHoverResolution({
      nextIntent: reorderOnlyIntent,
      previousResolution,
    });
  }

  return resolveCompactRootHoverResolution({
    dragMode,
    previousInteractionIntent: previousResolution.interactionIntent,
    previousVisualProjectionIntent: previousResolution.visualProjectionIntent,
    slotIntent,
    ...rest,
  });
}
