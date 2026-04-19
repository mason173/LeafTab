import type React from 'react';
import type {
  GridInteractionProfile,
  PointerPoint,
  ProjectionOffset,
  RootShortcutDropIntent,
  ScrollOffset,
  Shortcut,
} from '@leaftab/workspace-core';
import type { CompactTargetRegions } from '../compactRootHover';
import type { MeasuredRootGridItem } from '../rootGeometry/measurement';
import {
  createRootHoverResolutionController,
  type RootCompactRegionPlacement,
  type RootShortcutGridHeatZoneInspector,
} from '../rootResolution/hoverFromPointer';
import { createRootHoverRuntimeController } from './hoverSync';
import type { RootHoverResolution } from './hoverTiming';
import type {
  NormalizedRootShortcutGridItemLayout,
  RootReorderSlotCandidate,
  RootShortcutGridItem,
} from '../rootShortcutGridHelpers';

type RootHoverMeasurementController = {
  measureCurrentGridItems: () => MeasuredRootGridItem[];
  measureVisibleGridItems: () => MeasuredRootGridItem[];
};

export function createRootHoverControllerBundle<
  TSession extends {
    activeSortId: string;
    sourceRootShortcutId?: string;
    pointerId: number;
    pointerType: string;
    previewOffset: PointerPoint;
  },
>(params: {
  measurementController: RootHoverMeasurementController;
  activeDragIdRef: React.MutableRefObject<string | null>;
  dragSessionRef: React.MutableRefObject<TSession | null>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  recognitionPointRef: React.MutableRefObject<PointerPoint | null>;
  hoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  confirmedHoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  extractHandoffTimerRef: React.MutableRefObject<number | null>;
  activeSourceRootShortcutId: string | null;
  dragScrollOffset: ScrollOffset;
  rootRef: React.RefObject<HTMLDivElement | null>;
  extractBoundaryRef?: React.RefObject<HTMLElement | null> | null;
  extractionEnabled: boolean;
  items: RootShortcutGridItem[];
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
  }) => import('../rootView/renderSurface').RootShortcutGridDropTargetRects) | null;
  placementsBySortId: Map<string, RootCompactRegionPlacement>;
  computeProjectionOffsetsForIntent: (intent: RootShortcutDropIntent | null) => Map<string, ProjectionOffset>;
  emptyHoverResolution: RootHoverResolution;
  coreInset: number;
  largeFolderCoreInset: number;
  matchDistancePx: number;
  delayMs: number;
  onExtractDragStart?: (payload: import('@leaftab/workspace-core').ShortcutExternalDragSessionSeed) => void;
  clearDragRuntimeState: () => void;
  clearCommittedHoverResolution: () => void;
  clearExtractHandoffTimer: () => void;
  commitBoundaryHoverState: (hovered: boolean) => void;
  commitHeatZoneInspector: (inspector: RootShortcutGridHeatZoneInspector | null) => void;
  commitResolvedHoverResolution: (resolution: RootHoverResolution) => RootHoverResolution;
  autoScrollRafRef: React.MutableRefObject<number | null>;
  autoScrollContainerRef: React.MutableRefObject<HTMLElement | null>;
  autoScrollBoundsRef: React.MutableRefObject<{ top: number; bottom: number } | null>;
  autoScrollVelocityRef: React.MutableRefObject<number>;
  updateDragScrollOffset: () => void;
  edgePx: number;
  maxSpeedPx: number;
}) {
  const hoverResolutionController = createRootHoverResolutionController({
    dragScrollOffset: params.dragScrollOffset,
    activeDragIdRef: params.activeDragIdRef,
    dragSessionRef: params.dragSessionRef,
    activeSourceRootShortcutId: params.activeSourceRootShortcutId,
    rootRef: params.rootRef,
    extractBoundaryRef: params.extractBoundaryRef,
    extractionEnabled: params.extractionEnabled,
    items: params.items,
    hoverResolutionRef: params.hoverResolutionRef,
    confirmedHoverResolutionRef: params.confirmedHoverResolutionRef,
    gridColumns: params.gridColumns,
    gridColumnWidth: params.gridColumnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
    usesSpanAwareReorder: params.usesSpanAwareReorder,
    shouldUseProjectedRootReorderSlots: params.shouldUseProjectedRootReorderSlots,
    frozenSortIds: params.frozenSortIds,
    reorderSlotCandidates: params.reorderSlotCandidates,
    extractedReorderSlotCandidates: params.extractedReorderSlotCandidates,
    resolveInteractionProfile: params.resolveInteractionProfile,
    resolveCompactTargetRegions: params.resolveCompactTargetRegions,
    resolveDropTargetRects: params.resolveDropTargetRects,
    placedGridItemsBySortId: params.placementsBySortId,
    computeProjectionOffsetsForIntent: params.computeProjectionOffsetsForIntent,
    emptyHoverResolution: params.emptyHoverResolution,
    coreInset: params.coreInset,
    largeFolderCoreInset: params.largeFolderCoreInset,
    matchDistancePx: params.matchDistancePx,
    measureVisibleItems: params.measurementController.measureVisibleGridItems,
  });

  const resolveHoverResolutionFromPointer = (
    pointer: PointerPoint,
    measuredItemsOverride?: MeasuredRootGridItem[],
  ) => hoverResolutionController.resolveHoverResolutionFromPointer(
    pointer,
    measuredItemsOverride,
  );

  const hoverRuntimeController = createRootHoverRuntimeController({
    measureItems: params.measurementController.measureCurrentGridItems,
    measureVisibleItems: params.measurementController.measureVisibleGridItems,
    activeDragIdRef: params.activeDragIdRef,
    dragSessionRef: params.dragSessionRef,
    latestPointerRef: params.latestPointerRef,
    recognitionPointRef: params.recognitionPointRef,
    activeSourceRootShortcutId: params.activeSourceRootShortcutId,
    dragScrollOffset: params.dragScrollOffset,
    rootElement: params.rootRef.current,
    resolveHoverResolutionFromPointer,
    resolveRecognitionPointFromPointer: hoverResolutionController.resolveRecognitionPointFromPointer,
    resolveExtractBoundaryRect: hoverResolutionController.resolveExtractBoundaryRect,
    extractHandoffTimerRef: params.extractHandoffTimerRef,
    delayMs: params.delayMs,
    onExtractDragStart: params.onExtractDragStart,
    clearDragRuntimeState: params.clearDragRuntimeState,
    clearCommittedHoverResolution: params.clearCommittedHoverResolution,
    clearExtractHandoffTimer: params.clearExtractHandoffTimer,
    commitBoundaryHoverState: params.commitBoundaryHoverState,
    resolveInteractionProfile: params.resolveInteractionProfile,
    resolveCompactTargetRegions: params.resolveCompactTargetRegions,
    placementsBySortId: params.placementsBySortId,
    computeProjectionOffsetsForIntent: params.computeProjectionOffsetsForIntent,
    commitHeatZoneInspector: params.commitHeatZoneInspector,
    commitResolvedHoverResolution: params.commitResolvedHoverResolution,
    gridColumns: params.gridColumns,
    gridColumnWidth: params.gridColumnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
    coreInset: params.coreInset,
    largeFolderCoreInset: params.largeFolderCoreInset,
    autoScrollRafRef: params.autoScrollRafRef,
    autoScrollContainerRef: params.autoScrollContainerRef,
    autoScrollBoundsRef: params.autoScrollBoundsRef,
    autoScrollVelocityRef: params.autoScrollVelocityRef,
    updateDragScrollOffset: params.updateDragScrollOffset,
    edgePx: params.edgePx,
    maxSpeedPx: params.maxSpeedPx,
  });

  return {
    hoverRuntimeController,
    resolveHoverResolutionFromPointer,
  };
}
