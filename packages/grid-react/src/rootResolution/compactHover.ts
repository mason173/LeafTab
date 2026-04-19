import {
  buildRootCenterIntentCandidate,
  getDragVisualCenter,
  isShortcutFolder,
  resolveRootDragInteractionModeFromProfile,
  type GridInteractionProfile,
  resolveRootDropIntent,
  toGlobalPoint,
  type PointerPoint,
  type ProjectionOffset,
  type RootShortcutDropIntent,
  type Shortcut,
} from '@leaftab/workspace-core';
import {
  resolveReorderOnlyRootHoverResolution,
  resolveModeScopedRootReorderIntent,
  type CompactRootHoverResolution,
  type CompactTargetRegion,
  type CompactTargetRegions,
} from '../compactRootHover';
import { type MeasuredRootGridItem } from '../rootGeometry/measurement';
import {
  buildDraggedRootItemAnchorRect,
  buildRootReorderSlotCandidates,
  buildProjectedGridItemsForRootReorder,
  resolveRootReorderSlotIntent,
  resolveSpanAwareSlotProbePoint,
  type NormalizedRootShortcutGridItemLayout,
  type RootReorderSlotCandidate,
  type RootShortcutGridItem,
} from '../rootShortcutGridHelpers';
import { pickOverItemCandidate } from './projection';
import { extractPreviousRootReorderIntents } from '../rootRuntime/hoverTiming';
import { packItemsIntoSerpentineGrid } from '../serpentineWorldGrid';
import {
  buildUniformGridMetrics,
  resolveUniformGridCellHit,
} from '../sharedGrid/uniformGrid';
import {
  classifyGridHeatZone,
  type GridHeatZone,
} from '../sharedGrid/heatZone';
import {
  buildGridHeatZoneInspector,
  buildUniformGridHitRect,
  type GridHeatZoneInspector,
} from '../sharedGrid/inspector';
import {
  buildHoverResolution,
  buildMirroredHoverResolution,
  resolveDisplayedReorderEdge,
} from '../sharedGrid/hoverResolution';
import type { RootShortcutGridDropTargetRects } from '../rootView/renderSurface';

export type RootShortcutGridHeatZone = GridHeatZone;

export type RootShortcutGridHeatZoneInspector = GridHeatZoneInspector;

export type RootCompactRegionPlacement = Pick<
  {
    columnStart: number;
    rowStart: number;
    columnSpan: number;
    rowSpan: number;
  },
  'columnStart' | 'rowStart' | 'columnSpan' | 'rowSpan'
>;

type MeasuredGridItem = MeasuredRootGridItem;
type HoverResolution = CompactRootHoverResolution;

function profileTreatsAllTargetZonesAsReorder(profile: GridInteractionProfile): boolean {
  return profile.treatAllTargetZonesAsReorder || (!profile.allowMerge && !profile.allowEnterFolder);
}

function offsetCompactTargetRegion(
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

export function offsetCompactTargetRegions(
  regions: CompactTargetRegions,
  offset: ProjectionOffset | null | undefined,
): CompactTargetRegions {
  if (!offset) {
    return regions;
  }

  return {
    targetCellRegion: offsetCompactTargetRegion(regions.targetCellRegion, offset),
    targetIconRegion: offsetCompactTargetRegion(regions.targetIconRegion, offset),
    targetIconHitRegion: offsetCompactTargetRegion(regions.targetIconHitRegion, offset),
    bigFolderMergeHitArea: regions.bigFolderMergeHitArea
      ? offsetCompactTargetRegion(regions.bigFolderMergeHitArea, offset)
      : undefined,
  };
}

function pointInCompactTargetRegion(point: PointerPoint, rect: CompactTargetRegion): boolean {
  return (
    point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom
  );
}

export function classifyRectHeatZone(params: {
  point: PointerPoint;
  rect: CompactTargetRegion;
  coreInset: number;
  reorderOnlyMode: boolean;
  largeTarget: boolean;
}): RootShortcutGridHeatZone {
  return classifyGridHeatZone({
    point: params.point,
    rect: params.rect,
    coreInset: params.coreInset,
    reorderOnlyMode: params.reorderOnlyMode,
    disableEdgeZones: params.largeTarget,
  });
}

function buildPlacementFootprintSlotIndexes(params: {
  placement: RootCompactRegionPlacement;
  gridColumns: number;
}): number[] {
  const { placement, gridColumns } = params;
  const footprint: number[] = [];

  for (let rowOffset = 0; rowOffset < placement.rowSpan; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < placement.columnSpan; columnOffset += 1) {
      footprint.push(
        (placement.rowStart - 1 + rowOffset) * gridColumns + (placement.columnStart - 1 + columnOffset),
      );
    }
  }

  return footprint;
}

export function buildResolveMeasuredItemCompactRegions(params: {
  resolveCompactTargetRegions: (params: {
    shortcut: Shortcut;
    shortcutIndex: number;
    sortId: string;
    rect: DOMRect;
    layout: NormalizedRootShortcutGridItemLayout;
    columnStart: number;
    rowStart: number;
    columnSpan: number;
    rowSpan: number;
  }) => CompactTargetRegions;
  placementsBySortId: Map<string, RootCompactRegionPlacement>;
}): (item: MeasuredGridItem) => CompactTargetRegions {
  const { resolveCompactTargetRegions, placementsBySortId } = params;
  return (item) => {
    const placement = placementsBySortId.get(item.sortId);
    return resolveCompactTargetRegions({
      shortcut: item.shortcut,
      shortcutIndex: item.shortcutIndex,
      sortId: item.sortId,
      rect: item.rect,
      layout: item.layout,
      columnStart: placement?.columnStart ?? 1,
      rowStart: placement?.rowStart ?? 1,
      columnSpan: placement?.columnSpan ?? item.layout.columnSpan,
      rowSpan: placement?.rowSpan ?? item.layout.rowSpan,
    });
  };
}

export function resolveConfirmedDisplayedRootReorderIntent(
  resolution: HoverResolution,
): Extract<RootShortcutDropIntent, { type: 'reorder-root' }> | null {
  const visualProjectionIntent = resolution.visualProjectionIntent?.type === 'reorder-root'
    ? resolution.visualProjectionIntent
    : null;
  const interactionIntent = resolution.interactionIntent?.type === 'reorder-root'
    ? resolution.interactionIntent
    : null;

  return visualProjectionIntent ?? interactionIntent;
}

function buildPrototypeDisplayedCompactGrid(params: {
  items: RootShortcutGridItem[];
  activeSortId: string;
  placeholderSlotIndex: number;
  frozenSortIds?: ReadonlySet<string> | null;
  gridColumns: number;
}) {
  const {
    items,
    activeSortId,
    placeholderSlotIndex,
    frozenSortIds = null,
    gridColumns,
  } = params;
  const projectedItems = buildProjectedGridItemsForRootReorder({
    items,
    activeSortId,
    targetIndex: placeholderSlotIndex,
    frozenSortIds,
  }) ?? items;
  const projectedItemIndexBySortId = new Map<string, number>();
  projectedItems.forEach((item, index) => {
    projectedItemIndexBySortId.set(item.sortId, index);
  });

  const projectedLayout = packItemsIntoSerpentineGrid({
    items: projectedItems,
    gridColumns,
    getSpan: (item) => ({
      columnSpan: item.layout.columnSpan,
      rowSpan: item.layout.rowSpan,
    }),
  });
  const displayedTargetBySlotIndex = new Map<number, {
    sortId: string;
    targetIndex: number;
  }>();
  let placeholderFootprintSlotIndexes: number[] = [];

  projectedLayout.placedItems.forEach((placedItem) => {
    const footprintSlotIndexes = buildPlacementFootprintSlotIndexes({
      placement: {
        columnStart: placedItem.columnStart,
        rowStart: placedItem.rowStart,
        columnSpan: placedItem.columnSpan,
        rowSpan: placedItem.rowSpan,
      },
      gridColumns,
    });

    if (placedItem.sortId === activeSortId) {
      placeholderFootprintSlotIndexes = footprintSlotIndexes;
      return;
    }

    const targetIndex = projectedItemIndexBySortId.get(placedItem.sortId);
    if (targetIndex == null) {
      return;
    }

    footprintSlotIndexes.forEach((slotIndex) => {
      displayedTargetBySlotIndex.set(slotIndex, {
        sortId: placedItem.sortId,
        targetIndex,
      });
    });
  });

  const resolvedPlaceholderSlotIndex = projectedItemIndexBySortId.get(activeSortId) ?? placeholderSlotIndex;

  return {
    projectedItems,
    placeholderSlotIndex: resolvedPlaceholderSlotIndex,
    placeholderFootprintSlotIndexes,
    displayedTargetBySlotIndex,
  };
}

export function resolvePrototypeAlignedCompactRootHoverResolution(params: {
  activeSortId: string;
  interactionProfile: GridInteractionProfile;
  recognitionPoint: PointerPoint;
  rootRect: DOMRect;
  items: RootShortcutGridItem[];
  measuredItems: MeasuredGridItem[];
  currentResolution: HoverResolution;
  confirmedResolution: HoverResolution;
  resolveRegions: (item: MeasuredGridItem) => CompactTargetRegions;
  displayedProjectionOffsets: Map<string, ProjectionOffset>;
  frozenSortIds?: ReadonlySet<string> | null;
  slotIntent?: RootShortcutDropIntent | null;
  gridColumns: number;
  gridColumnWidth: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  emptyHoverResolution: HoverResolution;
  coreInset: number;
  largeFolderCoreInset: number;
  matchDistancePx: number;
}): HoverResolution {
  const {
    activeSortId,
    interactionProfile,
    recognitionPoint,
    rootRect,
    items,
    measuredItems,
    currentResolution,
    confirmedResolution,
    resolveRegions,
    displayedProjectionOffsets,
    frozenSortIds = null,
    slotIntent = null,
    gridColumns,
    columnGap,
    rowHeight,
    rowGap,
    emptyHoverResolution,
    coreInset,
    largeFolderCoreInset,
  } = params;
  const activeMeasuredItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  if (!activeMeasuredItem) {
    return emptyHoverResolution;
  }

  const confirmedDisplayedReorderIntent = resolveConfirmedDisplayedRootReorderIntent(confirmedResolution);
  const placeholderSlotIndex = confirmedDisplayedReorderIntent?.activeShortcutId === activeMeasuredItem.shortcut.id
    ? confirmedDisplayedReorderIntent.targetIndex
    : activeMeasuredItem.shortcutIndex;
  const displayedGrid = buildPrototypeDisplayedCompactGrid({
    items,
    activeSortId,
    placeholderSlotIndex,
    frozenSortIds,
    gridColumns,
  });
  const metrics = buildUniformGridMetrics({
    rootRect,
    columns: gridColumns,
    columnGap,
    rowHeight,
    rowGap,
  });
  if (!metrics) {
    return emptyHoverResolution;
  }
  const hit = resolveUniformGridCellHit({
    point: recognitionPoint,
    rootRect,
    metrics,
  });
  if (!hit) {
    return emptyHoverResolution;
  }
  if (displayedGrid.placeholderFootprintSlotIndexes.includes(hit.slotIndex)) {
    return emptyHoverResolution;
  }

  const resolveDisplayedRegions = (item: MeasuredGridItem): CompactTargetRegions => {
    if (item.sortId === activeSortId) {
      return resolveRegions(item);
    }

    return offsetCompactTargetRegions(
      resolveRegions(item),
      displayedProjectionOffsets.get(item.sortId),
    );
  };

  const displayedTarget = displayedGrid.displayedTargetBySlotIndex.get(hit.slotIndex) ?? null;
  if (!displayedTarget) {
    return buildMirroredHoverResolution({
      intent: slotIntent?.type === 'reorder-root' ? slotIntent : null,
      emptyResolution: emptyHoverResolution,
    });
  }

  const targetMeasuredItem = measuredItems.find((item) => item.sortId === displayedTarget.sortId) ?? null;
  if (!targetMeasuredItem) {
    return emptyHoverResolution;
  }

  const targetRegions = resolveDisplayedRegions(targetMeasuredItem);
  const dragMode = resolveRootDragInteractionModeFromProfile(interactionProfile);
  const largeTarget = (
    isShortcutFolder(targetMeasuredItem.shortcut)
    && targetMeasuredItem.shortcut.folderDisplayMode === 'large'
  );
  const zone = classifyRectHeatZone({
    point: recognitionPoint,
    rect: targetRegions.targetCellRegion,
    coreInset: largeTarget ? largeFolderCoreInset : coreInset,
    reorderOnlyMode: profileTreatsAllTargetZonesAsReorder(interactionProfile),
    largeTarget,
  });

  const centerIntent = buildRootCenterIntentCandidate({
    activeItem: activeMeasuredItem,
    overItem: targetMeasuredItem,
    mode: dragMode,
  })?.intent ?? null;
  const currentDisplayedReorderIntent = resolveConfirmedDisplayedRootReorderIntent(currentResolution);

  if (zone === 'core' && centerIntent) {
    return buildHoverResolution({
      interactionIntent: centerIntent,
      visualProjectionIntent: currentDisplayedReorderIntent,
      emptyResolution: emptyHoverResolution,
    });
  }

  if (!zone) {
    return emptyHoverResolution;
  }

  const reorderIntent: Extract<RootShortcutDropIntent, { type: 'reorder-root' }> = {
    type: 'reorder-root',
    activeShortcutId: activeMeasuredItem.shortcut.id,
    overShortcutId: targetMeasuredItem.shortcut.id,
    targetIndex: displayedTarget.targetIndex,
    edge: resolveDisplayedReorderEdge({
      placeholderSlotIndex: displayedGrid.placeholderSlotIndex,
      targetIndex: displayedTarget.targetIndex,
    }),
  };

  return buildMirroredHoverResolution({
    intent: reorderIntent,
    emptyResolution: emptyHoverResolution,
  });
}

export function resolveRootGridHoverResolution(params: {
  pointer: PointerPoint;
  measuredItems: MeasuredGridItem[];
  items: RootShortcutGridItem[];
  currentHoverResolution: HoverResolution;
  confirmedHoverResolution: HoverResolution;
  activeSortId: string;
  sourceRootShortcutId: string | null;
  previewOffset: PointerPoint;
  dragScrollOffset: { x: number; y: number };
  rootRect: DOMRect;
  hoverBounds: DOMRect | {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  usesSpanAwareReorder: boolean;
  shouldUseProjectedRootReorderSlots: boolean;
  frozenSortIds?: ReadonlySet<string> | null;
  reorderSlotCandidates: RootReorderSlotCandidate[];
  extractedReorderSlotCandidates: RootReorderSlotCandidate[];
  resolveInteractionProfile: (params: {
    sourceRootShortcutId: string | null;
    activeShortcut: Shortcut;
  }) => GridInteractionProfile;
  resolveCompactTargetRegions?: ((params: {
    shortcut: Shortcut;
    shortcutIndex: number;
    sortId: string;
    rect: DOMRect;
    layout: NormalizedRootShortcutGridItemLayout;
    columnStart: number;
    rowStart: number;
    columnSpan: number;
    rowSpan: number;
  }) => CompactTargetRegions) | null;
  resolveDropTargetRects?: ((params: {
    shortcut: Shortcut;
    shortcutIndex: number;
    sortId: string;
    rect: DOMRect;
    layout: NormalizedRootShortcutGridItemLayout;
    columnStart: number;
    rowStart: number;
    columnSpan: number;
    rowSpan: number;
  }) => RootShortcutGridDropTargetRects) | null;
  placedGridItemsBySortId: Map<string, RootCompactRegionPlacement>;
  computeProjectionOffsetsForIntent: (intent: RootShortcutDropIntent | null) => Map<string, ProjectionOffset>;
  emptyHoverResolution: HoverResolution;
  coreInset: number;
  largeFolderCoreInset: number;
  matchDistancePx: number;
}): HoverResolution {
  const {
    pointer,
    measuredItems,
    items,
    currentHoverResolution,
    confirmedHoverResolution,
    activeSortId,
    sourceRootShortcutId,
    previewOffset,
    dragScrollOffset,
    rootRect,
    hoverBounds,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
    usesSpanAwareReorder,
    shouldUseProjectedRootReorderSlots,
    frozenSortIds = null,
    reorderSlotCandidates,
    extractedReorderSlotCandidates,
    resolveInteractionProfile,
    resolveCompactTargetRegions = null,
    resolveDropTargetRects = null,
    placedGridItemsBySortId,
    computeProjectionOffsetsForIntent,
    emptyHoverResolution,
    coreInset,
    largeFolderCoreInset,
    matchDistancePx,
  } = params;
  const activeItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  if (!activeItem) {
    return emptyHoverResolution;
  }

  const activeExtractedSlotCandidates = sourceRootShortcutId && gridColumnWidth
    ? (
        extractedReorderSlotCandidates.length > 0
          ? extractedReorderSlotCandidates
          : buildRootReorderSlotCandidates({
              items,
              activeSortId,
              gridColumns,
              gridColumnWidth,
              columnGap,
              rowHeight,
              rowGap,
              frozenSortIds,
              rectMode: 'item',
              hitRectMode: 'item',
            })
      )
    : [];

  const recognitionPoint = buildRootRecognitionPoint({
    pointer,
    dragScrollOffset,
    previewOffset,
    activeItem,
  });

  if (
    recognitionPoint.x < hoverBounds.left
    || recognitionPoint.x > hoverBounds.right
    || recognitionPoint.y < hoverBounds.top
    || recognitionPoint.y > hoverBounds.bottom
  ) {
    return emptyHoverResolution;
  }

  const activeItemRect = {
    left: pointer.x - previewOffset.x,
    top: pointer.y - previewOffset.y,
    width: activeItem.layout.width,
    height: activeItem.layout.height,
  };
  const {
    interactionIntent: previousReorderIntent,
    visualProjectionIntent: previousVisualReorderIntent,
  } = extractPreviousRootReorderIntents(currentHoverResolution);
  const interactionProfile = resolveInteractionProfile({
    sourceRootShortcutId,
    activeShortcut: activeItem.shortcut,
  });
  const dragMode = resolveRootDragInteractionModeFromProfile(interactionProfile);
  const shouldUsePrototypeAlignedCompactHover = Boolean(resolveCompactTargetRegions && gridColumnWidth);
  const shouldUseSlotIntent = shouldUseProjectedRootReorderSlots && (
    shouldUsePrototypeAlignedCompactHover
    || !(
      resolveCompactTargetRegions
      && frozenSortIds
      && frozenSortIds.size > 0
    )
  );

  const slotIntent = shouldUseSlotIntent
    ? (() => {
        if (!gridColumnWidth) return null;
        const slotProbePoint = resolveSpanAwareRootSlotProbePoint({
          recognitionPoint,
          rootRect,
          activeItemRect,
          gridColumnWidth,
          columnGap,
          rowHeight,
          layout: activeItem.layout,
        });
        return resolveRootReorderSlotIntent({
          activeShortcutId: activeItem.shortcut.id,
          point: usesSpanAwareReorder
            ? slotProbePoint
            : {
                x: recognitionPoint.x - rootRect.left,
                y: recognitionPoint.y - rootRect.top,
              },
          candidates: reorderSlotCandidates,
          previousIntent: previousReorderIntent ?? previousVisualReorderIntent,
          mode: usesSpanAwareReorder ? 'containing-probe' : 'closest-center',
        });
      })()
    : null;
  const extractedSlotIntent = sourceRootShortcutId
    ? resolveRootReorderSlotIntent({
        activeShortcutId: activeItem.shortcut.id,
        point: {
          x: activeItemRect.left - rootRect.left + activeItemRect.width / 2,
          y: activeItemRect.top - rootRect.top + activeItemRect.height / 2,
        },
        candidates: activeExtractedSlotCandidates,
        previousIntent: previousReorderIntent ?? previousVisualReorderIntent,
        mode: 'closest-center',
      })
    : null;

  if (resolveCompactTargetRegions) {
    if (!gridColumnWidth) {
      return emptyHoverResolution;
    }

    const compactRegionResolver = buildResolveMeasuredItemCompactRegions({
      resolveCompactTargetRegions,
      placementsBySortId: placedGridItemsBySortId,
    });
    const confirmedDisplayedReorderIntent = resolveConfirmedDisplayedRootReorderIntent(
      confirmedHoverResolution,
    );
    const displayedProjectionOffsets = computeProjectionOffsetsForIntent(confirmedDisplayedReorderIntent);
    const modeScopedSlotIntent = resolveModeScopedRootReorderIntent({
      dragMode,
      slotIntent,
      externalInsertSlotIntent: extractedSlotIntent,
    });

    return resolvePrototypeAlignedCompactRootHoverResolution({
      activeSortId,
      interactionProfile,
      recognitionPoint,
      rootRect,
      items,
      measuredItems,
      currentResolution: currentHoverResolution,
      confirmedResolution: confirmedHoverResolution,
      resolveRegions: compactRegionResolver,
      displayedProjectionOffsets,
      frozenSortIds,
      slotIntent: modeScopedSlotIntent,
      gridColumns,
      gridColumnWidth,
      columnGap,
      rowHeight,
      rowGap,
      emptyHoverResolution,
      coreInset,
      largeFolderCoreInset,
      matchDistancePx,
    });
  }

  if (profileTreatsAllTargetZonesAsReorder(interactionProfile)) {
    return resolveReorderOnlyRootHoverResolution({
      nextIntent: resolveModeScopedRootReorderIntent({
        dragMode,
        slotIntent,
        externalInsertSlotIntent: extractedSlotIntent,
      }),
      previousResolution: currentHoverResolution,
    });
  }

  const overCandidate = pickOverItemCandidate({
    activeSortId,
    measuredItems,
    pointer: recognitionPoint,
    matchDistancePx,
  });
  if (!overCandidate) {
    return buildMirroredHoverResolution({
      intent: slotIntent,
      emptyResolution: emptyHoverResolution,
    });
  }

  const placedItem = placedGridItemsBySortId.get(overCandidate.overItem.sortId);
  const resolvedDropTargetRects = resolveDropTargetRects?.({
    shortcut: overCandidate.overItem.shortcut,
    shortcutIndex: overCandidate.overItem.shortcutIndex,
    sortId: overCandidate.overItem.sortId,
    rect: overCandidate.overRect,
    layout: overCandidate.overItem.layout,
    columnStart: placedItem?.columnStart ?? 1,
    rowStart: placedItem?.rowStart ?? 1,
    columnSpan: placedItem?.columnSpan ?? overCandidate.overItem.layout.columnSpan,
    rowSpan: placedItem?.rowSpan ?? overCandidate.overItem.layout.rowSpan,
  }) ?? {
    overRect: overCandidate.overRect,
    overCenterRect: overCandidate.overRect,
  };

  const rawIntent = resolveRootDropIntent({
    activeSortId,
    overSortId: overCandidate.overItem.sortId,
    pointer: recognitionPoint,
    overRect: resolvedDropTargetRects.overRect,
    overCenterRect: resolvedDropTargetRects.overCenterRect,
    items,
    mode: dragMode,
  });
  if (!rawIntent) {
    return buildMirroredHoverResolution({
      intent: slotIntent,
      emptyResolution: emptyHoverResolution,
    });
  }

  if (rawIntent.type === 'reorder-root') {
    const interactionIntent = slotIntent ?? rawIntent;
    return buildMirroredHoverResolution({
      intent: interactionIntent,
      emptyResolution: emptyHoverResolution,
    });
  }

  return buildMirroredHoverResolution({
    intent: rawIntent,
    emptyResolution: emptyHoverResolution,
  });
}

function buildRootRecognitionPoint(params: {
  pointer: PointerPoint;
  dragScrollOffset: { x: number; y: number };
  previewOffset: PointerPoint;
  activeItem: MeasuredGridItem;
}): PointerPoint {
  const { pointer, dragScrollOffset, previewOffset, activeItem } = params;

  return getDragVisualCenter({
    pointer: toGlobalPoint(pointer, dragScrollOffset),
    previewOffset,
    activeRect: activeItem.rect,
    visualRect: {
      offsetX: activeItem.layout.previewOffsetX,
      offsetY: activeItem.layout.previewOffsetY,
      width: activeItem.layout.previewWidth,
      height: activeItem.layout.previewHeight,
    },
  });
}

function resolveSpanAwareRootSlotProbePoint(params: {
  recognitionPoint: PointerPoint;
  rootRect: DOMRect;
  activeItemRect: {
    left: number;
    top: number;
  };
  gridColumnWidth: number;
  columnGap: number;
  rowHeight: number;
  layout: NormalizedRootShortcutGridItemLayout;
}) {
  const { recognitionPoint, rootRect, activeItemRect, gridColumnWidth, columnGap, rowHeight, layout } = params;
  return resolveSpanAwareSlotProbePoint({
    point: {
      x: recognitionPoint.x - rootRect.left,
      y: recognitionPoint.y - rootRect.top,
    },
    anchorRect: buildDraggedRootItemAnchorRect({
      itemRect: {
        left: activeItemRect.left - rootRect.left,
        top: activeItemRect.top - rootRect.top,
      },
      gridColumnWidth,
      columnGap,
      rowHeight,
      layout,
    }),
    layout,
  });
}

export function resolveHeatZoneInspector(params: {
  recognitionPoint: PointerPoint | null;
  rootRect: DOMRect | null;
  activeSortId: string | null;
  interactionProfile: GridInteractionProfile;
  measuredItems: MeasuredGridItem[];
  resolveRegions?: ((item: MeasuredGridItem) => CompactTargetRegions) | null;
  placementsBySortId: Map<string, RootCompactRegionPlacement>;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  coreInset: number;
  largeFolderCoreInset: number;
}): RootShortcutGridHeatZoneInspector | null {
  const {
    recognitionPoint,
    rootRect,
    activeSortId,
    interactionProfile,
    measuredItems,
    resolveRegions = null,
    placementsBySortId,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
    coreInset,
    largeFolderCoreInset,
  } = params;

  if (!recognitionPoint || !rootRect) {
    return null;
  }

  if (
    recognitionPoint.x < rootRect.left
    || recognitionPoint.x > rootRect.right
    || recognitionPoint.y < rootRect.top
    || recognitionPoint.y > rootRect.bottom
  ) {
    return null;
  }

  const reorderOnlyMode = profileTreatsAllTargetZonesAsReorder(interactionProfile);
  const occupiedTarget = resolveRegions
    ? measuredItems
      .filter((item) => item.sortId !== activeSortId)
      .map((item) => ({
        item,
        regions: resolveRegions(item),
      }))
      .filter(({ regions }) => pointInCompactTargetRegion(recognitionPoint, regions.targetCellRegion))
      .sort((left, right) => {
        const leftCenterX = left.regions.targetCellRegion.left + left.regions.targetCellRegion.width / 2;
        const leftCenterY = left.regions.targetCellRegion.top + left.regions.targetCellRegion.height / 2;
        const rightCenterX = right.regions.targetCellRegion.left + right.regions.targetCellRegion.width / 2;
        const rightCenterY = right.regions.targetCellRegion.top + right.regions.targetCellRegion.height / 2;
        return (
          Math.hypot(recognitionPoint.x - leftCenterX, recognitionPoint.y - leftCenterY)
          - Math.hypot(recognitionPoint.x - rightCenterX, recognitionPoint.y - rightCenterY)
        );
      })[0] ?? null
    : null;

  if (occupiedTarget) {
    const placement = placementsBySortId.get(occupiedTarget.item.sortId);
    const targetRow = (placement?.rowStart ?? 1) - 1;
    const targetColumn = (placement?.columnStart ?? 1) - 1;
    const targetSlotIndex = targetRow * gridColumns + targetColumn;
    const largeTarget = (
      isShortcutFolder(occupiedTarget.item.shortcut)
      && occupiedTarget.item.shortcut.folderDisplayMode === 'large'
    );

    return buildGridHeatZoneInspector({
      point: recognitionPoint,
      slotIndex: targetSlotIndex,
      row: targetRow,
      column: targetColumn,
      rect: occupiedTarget.regions.targetCellRegion,
      coreInset: largeTarget ? largeFolderCoreInset : coreInset,
      reorderOnlyMode,
      targetId: occupiedTarget.item.shortcut.id,
      targetTitle: occupiedTarget.item.shortcut.title || occupiedTarget.item.shortcut.url || occupiedTarget.item.shortcut.id,
      targetKind: isShortcutFolder(occupiedTarget.item.shortcut) ? 'folder' : 'shortcut',
      footprintSlotIndexes: placement
        ? buildPlacementFootprintSlotIndexes({ placement, gridColumns })
        : [targetSlotIndex],
      largeTarget,
      disableEdgeZones: largeTarget,
    });
  }

  if (!gridColumnWidth || gridColumns <= 0) {
    return null;
  }
  const metrics = buildUniformGridMetrics({
    rootRect,
    columns: gridColumns,
    columnGap,
    rowHeight,
    rowGap,
  });
  if (!metrics) {
    return null;
  }
  const hit = resolveUniformGridCellHit({
    point: recognitionPoint,
    rootRect,
    metrics,
    mode: 'clamped',
  });
  if (!hit) {
    return null;
  }

  return buildGridHeatZoneInspector({
    point: recognitionPoint,
    slotIndex: hit.slotIndex,
    row: hit.row,
    column: hit.column,
    rect: buildUniformGridHitRect({ hit, metrics }),
    coreInset,
    reorderOnlyMode,
    targetId: null,
    targetTitle: null,
    targetKind: 'empty',
    footprintSlotIndexes: [hit.slotIndex],
    largeTarget: false,
  });
}
