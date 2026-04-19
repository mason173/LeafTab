import {
  getDragVisualCenter,
  pointInRect,
  type GridInteractionProfile,
  toGlobalPoint,
  type PointerPoint,
  type ProjectionOffset,
  type RootShortcutDropIntent,
  type ScrollOffset,
  type Shortcut,
} from '@leaftab/workspace-core';
import type React from 'react';
import { type CompactTargetRegions } from '../compactRootHover';
import {
  offsetDomRectByScrollOffset,
  type MeasuredRootGridItem,
} from '../rootGeometry/measurement';
import {
  buildRootReorderSlotCandidates,
  type NormalizedRootShortcutGridItemLayout,
  type RootReorderSlotCandidate,
  type RootShortcutGridItem,
} from '../rootShortcutGridHelpers';
import {
  resolveRootGridHoverResolution,
  type RootCompactRegionPlacement,
} from './compactHover';
import { type RootHoverResolution } from '../rootRuntime/hoverTiming';
import type { RootShortcutGridDropTargetRects } from '../rootView/renderSurface';

export type {
  RootCompactRegionPlacement,
  RootShortcutGridHeatZoneInspector,
} from './compactHover';

type MeasuredGridItem = MeasuredRootGridItem;

export function buildRootRecognitionPointFromMeasuredPointer(params: {
  pointer: PointerPoint;
  dragScrollOffset: ScrollOffset;
  activeSortId: string | null;
  previewOffset: PointerPoint | null;
  measuredItems: MeasuredGridItem[];
}): PointerPoint | null {
  const {
    pointer,
    dragScrollOffset,
    activeSortId,
    previewOffset,
    measuredItems,
  } = params;

  if (!activeSortId || !previewOffset) {
    return null;
  }

  const activeItem = measuredItems.find((item) => item.sortId === activeSortId) ?? null;
  if (!activeItem) {
    return null;
  }

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

function resolveActiveRootSlotCandidates(params: {
  sourceRootShortcutId: string | null;
  extractedReorderSlotCandidates: RootReorderSlotCandidate[];
  reorderSlotCandidates: RootReorderSlotCandidate[];
  gridColumnWidth: number | null;
  items: RootShortcutGridItem[];
  activeSortId: string;
  gridColumns: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  frozenSortIds?: ReadonlySet<string> | null;
}): RootReorderSlotCandidate[] {
  const {
    sourceRootShortcutId,
    extractedReorderSlotCandidates,
    reorderSlotCandidates,
    gridColumnWidth,
    items,
    activeSortId,
    gridColumns,
    columnGap,
    rowHeight,
    rowGap,
    frozenSortIds = null,
  } = params;

  if (!sourceRootShortcutId) {
    return reorderSlotCandidates;
  }

  if (extractedReorderSlotCandidates.length > 0) {
    return extractedReorderSlotCandidates;
  }

  if (!gridColumnWidth) {
    return [];
  }

  return buildRootReorderSlotCandidates({
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
  });
}

function buildRootHoverBounds(params: {
  rootRect: DOMRect;
  slotCandidates: RootReorderSlotCandidate[];
}) {
  const { rootRect, slotCandidates } = params;

  if (slotCandidates.length === 0) {
    return rootRect;
  }

  return {
    left: Math.min(
      rootRect.left,
      ...slotCandidates.map((candidate) => rootRect.left + candidate.left),
    ),
    top: Math.min(
      rootRect.top,
      ...slotCandidates.map((candidate) => rootRect.top + candidate.top),
    ),
    right: Math.max(
      rootRect.right,
      ...slotCandidates.map((candidate) => rootRect.left + candidate.left + candidate.width),
    ),
    bottom: Math.max(
      rootRect.bottom,
      ...slotCandidates.map((candidate) => rootRect.top + candidate.top + candidate.height),
    ),
  };
}

export function resolveRootHoverResolutionFromMeasuredPointer(params: {
  pointer: PointerPoint;
  measuredItems: MeasuredGridItem[];
  items: RootShortcutGridItem[];
  activeSortId: string | null;
  previewOffset: PointerPoint | null;
  sourceRootShortcutId: string | null;
  dragScrollOffset: ScrollOffset;
  rootRect: DOMRect | null;
  extractBoundaryRect: DOMRect | null;
  currentHoverResolution: RootHoverResolution;
  confirmedHoverResolution: RootHoverResolution;
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
  emptyHoverResolution: RootHoverResolution;
  coreInset: number;
  largeFolderCoreInset: number;
  matchDistancePx: number;
}) {
  const {
    pointer,
    measuredItems,
    items,
    activeSortId,
    previewOffset,
    sourceRootShortcutId,
    dragScrollOffset,
    rootRect,
    extractBoundaryRect,
    currentHoverResolution,
    confirmedHoverResolution,
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

  if (!activeSortId || !previewOffset || !rootRect) {
    return emptyHoverResolution;
  }

  const recognitionPoint = buildRootRecognitionPointFromMeasuredPointer({
    pointer,
    dragScrollOffset,
    activeSortId,
    previewOffset,
    measuredItems,
  });
  if (!recognitionPoint) {
    return emptyHoverResolution;
  }

  if (extractBoundaryRect && !pointInRect(recognitionPoint, extractBoundaryRect)) {
    return emptyHoverResolution;
  }

  const slotCandidates = resolveActiveRootSlotCandidates({
    sourceRootShortcutId,
    extractedReorderSlotCandidates,
    reorderSlotCandidates,
    gridColumnWidth,
    items,
    activeSortId,
    gridColumns,
    columnGap,
    rowHeight,
    rowGap,
    frozenSortIds,
  });
  const hoverBounds = buildRootHoverBounds({
    rootRect,
    slotCandidates,
  });

  return resolveRootGridHoverResolution({
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
    frozenSortIds,
    reorderSlotCandidates,
    extractedReorderSlotCandidates,
    resolveInteractionProfile,
    resolveCompactTargetRegions,
    resolveDropTargetRects,
    placedGridItemsBySortId,
    computeProjectionOffsetsForIntent,
    emptyHoverResolution,
    coreInset,
    largeFolderCoreInset,
    matchDistancePx,
  });
}

export function resolveRootHoverResolutionFromPointer(params: {
  pointer: PointerPoint;
  measuredItemsOverride?: MeasuredGridItem[];
  measureVisibleItems: () => MeasuredGridItem[];
  resolveMeasuredHoverResolution: (
    pointer: PointerPoint,
    measuredItems: MeasuredGridItem[],
  ) => RootHoverResolution;
}) {
  const {
    pointer,
    measuredItemsOverride,
    measureVisibleItems,
    resolveMeasuredHoverResolution,
  } = params;

  return resolveMeasuredHoverResolution(
    pointer,
    measuredItemsOverride ?? measureVisibleItems(),
  );
}

export function createRootHoverResolutionController(params: {
  dragScrollOffset: ScrollOffset;
  activeDragIdRef: React.MutableRefObject<string | null>;
  dragSessionRef: React.MutableRefObject<{
    previewOffset: PointerPoint;
    sourceRootShortcutId?: string;
  } | null>;
  activeSourceRootShortcutId: string | null;
  rootRef: React.RefObject<HTMLDivElement | null>;
  extractBoundaryRef?: React.RefObject<HTMLElement | null> | null;
  extractionEnabled: boolean;
  items: RootShortcutGridItem[];
  hoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  confirmedHoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
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
  emptyHoverResolution: RootHoverResolution;
  coreInset: number;
  largeFolderCoreInset: number;
  matchDistancePx: number;
  measureVisibleItems: () => MeasuredGridItem[];
}) {
  const {
    dragScrollOffset,
    activeDragIdRef,
    dragSessionRef,
    activeSourceRootShortcutId,
    rootRef,
    extractBoundaryRef = null,
    extractionEnabled,
    items,
    hoverResolutionRef,
    confirmedHoverResolutionRef,
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
    measureVisibleItems,
  } = params;

  const resolveRecognitionPointFromPointer = (
    pointer: PointerPoint,
    measuredItems: MeasuredGridItem[],
  ): PointerPoint | null => buildRootRecognitionPointFromMeasuredPointer({
    pointer,
    dragScrollOffset,
    activeSortId: activeDragIdRef.current,
    previewOffset: dragSessionRef.current?.previewOffset ?? null,
    measuredItems,
  });

  const resolveExtractBoundaryRect = (): DOMRect | null => {
    if (!extractBoundaryRef || !extractionEnabled) {
      return null;
    }

    const boundaryViewportRect = extractBoundaryRef.current?.getBoundingClientRect() ?? null;
    return boundaryViewportRect
      ? offsetDomRectByScrollOffset(boundaryViewportRect, dragScrollOffset)
      : null;
  };

  const resolveMeasuredHoverResolution = (
    pointer: PointerPoint,
    measuredItems: MeasuredGridItem[],
  ): RootHoverResolution => resolveRootHoverResolutionFromMeasuredPointer({
    pointer,
    measuredItems,
    items,
    activeSortId: activeDragIdRef.current,
    previewOffset: dragSessionRef.current?.previewOffset ?? null,
    sourceRootShortcutId: dragSessionRef.current?.sourceRootShortcutId ?? activeSourceRootShortcutId ?? null,
    dragScrollOffset,
    rootRect: rootRef.current
      ? offsetDomRectByScrollOffset(rootRef.current.getBoundingClientRect(), dragScrollOffset)
      : null,
    extractBoundaryRect: resolveExtractBoundaryRect(),
    currentHoverResolution: hoverResolutionRef.current,
    confirmedHoverResolution: confirmedHoverResolutionRef.current,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
    usesSpanAwareReorder,
    shouldUseProjectedRootReorderSlots,
    frozenSortIds,
    reorderSlotCandidates,
    extractedReorderSlotCandidates,
    resolveInteractionProfile,
    resolveCompactTargetRegions,
    resolveDropTargetRects,
    placedGridItemsBySortId,
    computeProjectionOffsetsForIntent,
    emptyHoverResolution,
    coreInset,
    largeFolderCoreInset,
    matchDistancePx,
  });

  const resolveHoverResolutionFromPointer = (
    pointer: PointerPoint,
    measuredItemsOverride?: MeasuredGridItem[],
  ): RootHoverResolution => resolveRootHoverResolutionFromPointer({
    pointer,
    measuredItemsOverride,
    measureVisibleItems,
    resolveMeasuredHoverResolution,
  });

  return {
    resolveRecognitionPointFromPointer,
    resolveExtractBoundaryRect,
    resolveMeasuredHoverResolution,
    resolveHoverResolutionFromPointer,
  };
}
