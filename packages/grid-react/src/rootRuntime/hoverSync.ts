import {
  offsetDomRectByScrollOffset,
  offsetMeasuredRootGridItemsByScrollOffset,
  type MeasuredRootGridItem,
} from '../rootGeometry/measurement';
import {
  buildResolveMeasuredItemCompactRegions,
  offsetCompactTargetRegions,
  resolveHeatZoneInspector,
  type RootCompactRegionPlacement,
  type RootShortcutGridHeatZoneInspector,
} from '../rootResolution/compactHover';
import {
  handleRootExtractBoundaryExit,
  handleRootExtractBoundaryInside,
  hasExitedRootExtractBoundary,
} from './extractHandoff';
import { updateRootAutoScrollVelocity } from './autoScroll';
import {
  type RootHoverResolution,
} from './hoverTiming';
import { type CompactTargetRegions } from '../compactRootHover';
import {
  createGridInteractionProfile,
  type GridInteractionProfile,
  type PointerPoint,
  type ProjectionOffset,
  type ScrollOffset,
  type Shortcut,
} from '@leaftab/workspace-core';
import type React from 'react';

export function syncRootHoverRuntime(params: {
  pointer: PointerPoint;
  measuredItems: MeasuredRootGridItem[];
  activeDragIdRef: React.MutableRefObject<string | null>;
  dragSessionRef: React.MutableRefObject<{ sourceRootShortcutId?: string } | null>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  recognitionPointRef: React.MutableRefObject<PointerPoint | null>;
  activeSourceRootShortcutId: string | null;
  dragScrollOffset: ScrollOffset;
  rootElement: HTMLDivElement | null;
  resolveHoverResolutionFromPointer: (
    pointer: PointerPoint,
    measuredItemsOverride?: MeasuredRootGridItem[],
  ) => RootHoverResolution;
  resolveRecognitionPointFromPointer: (
    pointer: PointerPoint,
    measuredItems: MeasuredRootGridItem[],
  ) => PointerPoint | null;
  resolveExtractBoundaryRect: () => DOMRect | null;
  onExtractBoundaryExit: () => void;
  onInsideBoundary: () => void;
  resolveInteractionProfile: (params: {
    sourceRootShortcutId: string | null;
    activeShortcut: Shortcut;
  }) => GridInteractionProfile;
  resolveCompactTargetRegions?: ((params: {
    shortcut: Shortcut;
    shortcutIndex: number;
    sortId: string;
    rect: DOMRect;
    layout: MeasuredRootGridItem['layout'];
    columnStart: number;
    rowStart: number;
    columnSpan: number;
    rowSpan: number;
  }) => CompactTargetRegions) | null;
  placementsBySortId: Map<string, RootCompactRegionPlacement>;
  computeProjectionOffsetsForIntent: (intent: import('@leaftab/workspace-core').RootShortcutDropIntent | null) => Map<string, ProjectionOffset>;
  commitHeatZoneInspector: (inspector: RootShortcutGridHeatZoneInspector | null) => void;
  commitResolvedHoverResolution: (resolution: RootHoverResolution) => void;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  coreInset: number;
  largeFolderCoreInset: number;
}) {
  const {
    pointer,
    measuredItems,
    activeDragIdRef,
    dragSessionRef,
    latestPointerRef,
    recognitionPointRef,
    activeSourceRootShortcutId,
    dragScrollOffset,
    rootElement,
    resolveHoverResolutionFromPointer,
    resolveRecognitionPointFromPointer,
    resolveExtractBoundaryRect,
    onExtractBoundaryExit,
    onInsideBoundary,
    resolveInteractionProfile,
    resolveCompactTargetRegions = null,
    placementsBySortId,
    computeProjectionOffsetsForIntent,
    commitHeatZoneInspector,
    commitResolvedHoverResolution,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
    coreInset,
    largeFolderCoreInset,
  } = params;

  latestPointerRef.current = pointer;
  const nextResolution = resolveHoverResolutionFromPointer(pointer, measuredItems);
  const nextActiveDragId = activeDragIdRef.current;
  const session = dragSessionRef.current;
  recognitionPointRef.current = resolveRecognitionPointFromPointer(pointer, measuredItems);
  const extractBoundaryRect = resolveExtractBoundaryRect();

  if (hasExitedRootExtractBoundary({
    recognitionPoint: recognitionPointRef.current,
    extractBoundaryRect,
  })) {
    onExtractBoundaryExit();
    return;
  }

  onInsideBoundary();
  const activeItem = nextActiveDragId
    ? measuredItems.find((item) => item.sortId === nextActiveDragId) ?? null
    : null;
  const activeShortcut = activeItem?.shortcut ?? null;
  const extractedSourceRootShortcutId = session?.sourceRootShortcutId ?? activeSourceRootShortcutId ?? null;
  const interactionProfile = activeShortcut
    ? resolveInteractionProfile({
        sourceRootShortcutId: extractedSourceRootShortcutId,
        activeShortcut,
      })
    : null;
  const rootRect = rootElement
    ? offsetDomRectByScrollOffset(rootElement.getBoundingClientRect(), dragScrollOffset)
    : null;
  const resolveRegions = resolveCompactTargetRegions
    ? buildResolveMeasuredItemCompactRegions({
        resolveCompactTargetRegions,
        placementsBySortId,
      })
    : null;
  const nextInteractionProjectionOffsets = computeProjectionOffsetsForIntent(nextResolution.interactionIntent);
  const nextVisualProjectionOffsets = computeProjectionOffsetsForIntent(nextResolution.visualProjectionIntent);
  const resolveDisplayedInspectorRegions = resolveRegions
    ? ((item: MeasuredRootGridItem) => {
        if (item.sortId === nextActiveDragId) {
          return resolveRegions(item);
        }

        const projectedOffset = nextVisualProjectionOffsets.get(item.sortId)
          ?? nextInteractionProjectionOffsets.get(item.sortId);
        return offsetCompactTargetRegions(resolveRegions(item), projectedOffset);
      })
    : null;

  commitHeatZoneInspector(resolveHeatZoneInspector({
    recognitionPoint: recognitionPointRef.current,
    rootRect,
    activeSortId: nextActiveDragId,
    interactionProfile: interactionProfile ?? createGridInteractionProfile('root-normal'),
    measuredItems,
    resolveRegions: resolveDisplayedInspectorRegions,
    placementsBySortId,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
    coreInset,
    largeFolderCoreInset,
  }));
  commitResolvedHoverResolution(nextResolution);
}

export function syncRootHoverFromPointer(params: {
  pointer: PointerPoint;
  measuredItemsOverride?: MeasuredRootGridItem[];
  measureItems: () => MeasuredRootGridItem[];
  dragScrollOffset: ScrollOffset;
  activeDragIdRef: React.MutableRefObject<string | null>;
  dragSessionRef: React.MutableRefObject<{ sourceRootShortcutId?: string } | null>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  recognitionPointRef: React.MutableRefObject<PointerPoint | null>;
  activeSourceRootShortcutId: string | null;
  rootElement: HTMLDivElement | null;
  resolveHoverResolutionFromPointer: (
    pointer: PointerPoint,
    measuredItemsOverride?: MeasuredRootGridItem[],
  ) => RootHoverResolution;
  resolveRecognitionPointFromPointer: (
    pointer: PointerPoint,
    measuredItems: MeasuredRootGridItem[],
  ) => PointerPoint | null;
  resolveExtractBoundaryRect: () => DOMRect | null;
  onExtractBoundaryExit: () => void;
  onInsideBoundary: () => void;
  resolveInteractionProfile: (params: {
    sourceRootShortcutId: string | null;
    activeShortcut: Shortcut;
  }) => GridInteractionProfile;
  resolveCompactTargetRegions?: ((params: {
    shortcut: Shortcut;
    shortcutIndex: number;
    sortId: string;
    rect: DOMRect;
    layout: MeasuredRootGridItem['layout'];
    columnStart: number;
    rowStart: number;
    columnSpan: number;
    rowSpan: number;
  }) => CompactTargetRegions) | null;
  placementsBySortId: Map<string, RootCompactRegionPlacement>;
  computeProjectionOffsetsForIntent: (intent: import('@leaftab/workspace-core').RootShortcutDropIntent | null) => Map<string, ProjectionOffset>;
  commitHeatZoneInspector: (inspector: RootShortcutGridHeatZoneInspector | null) => void;
  commitResolvedHoverResolution: (resolution: RootHoverResolution) => void;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  coreInset: number;
  largeFolderCoreInset: number;
}) {
  const {
    pointer,
    measuredItemsOverride,
    measureItems,
    dragScrollOffset,
    ...runtimeParams
  } = params;

  const measuredItems = offsetMeasuredRootGridItemsByScrollOffset(
    measuredItemsOverride ?? measureItems(),
    dragScrollOffset,
  ) ?? [];

  syncRootHoverRuntime({
    pointer,
    measuredItems,
    dragScrollOffset,
    ...runtimeParams,
  });
}

export function syncRootHoverWithExtractHandoff<
  TSession extends {
    activeSortId: string;
    sourceRootShortcutId?: string;
    pointerId: number;
    pointerType: string;
    previewOffset: PointerPoint;
  },
>(params: {
  pointer: PointerPoint;
  measuredItemsOverride?: MeasuredRootGridItem[];
  measureItems: () => MeasuredRootGridItem[];
  measureVisibleItems: () => MeasuredRootGridItem[];
  dragScrollOffset: ScrollOffset;
  activeDragIdRef: React.MutableRefObject<string | null>;
  dragSessionRef: React.MutableRefObject<TSession | null>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  recognitionPointRef: React.MutableRefObject<PointerPoint | null>;
  activeSourceRootShortcutId: string | null;
  rootElement: HTMLDivElement | null;
  resolveHoverResolutionFromPointer: (
    pointer: PointerPoint,
    measuredItemsOverride?: MeasuredRootGridItem[],
  ) => RootHoverResolution;
  resolveRecognitionPointFromPointer: (
    pointer: PointerPoint,
    measuredItems: MeasuredRootGridItem[],
  ) => PointerPoint | null;
  resolveExtractBoundaryRect: () => DOMRect | null;
  extractHandoffTimerRef: React.MutableRefObject<number | null>;
  delayMs: number;
  onExtractDragStart?: (payload: import('@leaftab/workspace-core').ShortcutExternalDragSessionSeed) => void;
  clearDragRuntimeState: () => void;
  clearCommittedHoverResolution: () => void;
  clearExtractHandoffTimer: () => void;
  commitBoundaryHoverState: (hovered: boolean) => void;
  commitHeatZoneInspector: (inspector: RootShortcutGridHeatZoneInspector | null) => void;
  resolveInteractionProfile: (params: {
    sourceRootShortcutId: string | null;
    activeShortcut: Shortcut;
  }) => GridInteractionProfile;
  resolveCompactTargetRegions?: ((params: {
    shortcut: Shortcut;
    shortcutIndex: number;
    sortId: string;
    rect: DOMRect;
    layout: MeasuredRootGridItem['layout'];
    columnStart: number;
    rowStart: number;
    columnSpan: number;
    rowSpan: number;
  }) => CompactTargetRegions) | null;
  placementsBySortId: Map<string, RootCompactRegionPlacement>;
  computeProjectionOffsetsForIntent: (intent: import('@leaftab/workspace-core').RootShortcutDropIntent | null) => Map<string, ProjectionOffset>;
  commitResolvedHoverResolution: (resolution: RootHoverResolution) => void;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  coreInset: number;
  largeFolderCoreInset: number;
}) {
  const {
    extractHandoffTimerRef,
    delayMs,
    latestPointerRef,
    dragSessionRef,
    activeDragIdRef,
    measureVisibleItems,
    onExtractDragStart,
    clearDragRuntimeState,
    clearCommittedHoverResolution,
    clearExtractHandoffTimer,
    commitBoundaryHoverState,
    commitHeatZoneInspector,
    ...hoverParams
  } = params;

  syncRootHoverFromPointer({
    ...hoverParams,
    activeDragIdRef,
    dragSessionRef,
    latestPointerRef,
    commitHeatZoneInspector,
    onExtractBoundaryExit: () => {
      handleRootExtractBoundaryExit({
        delayMs,
        extractHandoffTimerRef,
        latestPointerRef,
        dragSessionRef,
        activeDragIdRef,
        measureItems: measureVisibleItems,
        onExtractDragStart,
        clearDragRuntimeState,
        clearCommittedHoverResolution,
        commitHeatZoneInspector,
        commitBoundaryHoverState,
      });
    },
    onInsideBoundary: () => {
      handleRootExtractBoundaryInside({
        clearExtractHandoffTimer,
        commitBoundaryHoverState,
      });
    },
  });
}

export function createRootHoverRuntimeController<
  TSession extends {
    activeSortId: string;
    sourceRootShortcutId?: string;
    pointerId: number;
    pointerType: string;
    previewOffset: PointerPoint;
  },
>(params: {
  measureItems: () => MeasuredRootGridItem[];
  measureVisibleItems: () => MeasuredRootGridItem[];
  activeDragIdRef: React.MutableRefObject<string | null>;
  dragSessionRef: React.MutableRefObject<TSession | null>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  recognitionPointRef: React.MutableRefObject<PointerPoint | null>;
  activeSourceRootShortcutId: string | null;
  dragScrollOffset: ScrollOffset;
  rootElement: HTMLDivElement | null;
  resolveHoverResolutionFromPointer: (
    pointer: PointerPoint,
    measuredItemsOverride?: MeasuredRootGridItem[],
  ) => RootHoverResolution;
  resolveRecognitionPointFromPointer: (
    pointer: PointerPoint,
    measuredItems: MeasuredRootGridItem[],
  ) => PointerPoint | null;
  resolveExtractBoundaryRect: () => DOMRect | null;
  extractHandoffTimerRef: React.MutableRefObject<number | null>;
  delayMs: number;
  onExtractDragStart?: (payload: import('@leaftab/workspace-core').ShortcutExternalDragSessionSeed) => void;
  clearDragRuntimeState: () => void;
  clearCommittedHoverResolution: () => void;
  clearExtractHandoffTimer: () => void;
  commitBoundaryHoverState: (hovered: boolean) => void;
  resolveInteractionProfile: (params: {
    sourceRootShortcutId: string | null;
    activeShortcut: Shortcut;
  }) => GridInteractionProfile;
  resolveCompactTargetRegions?: ((params: {
    shortcut: Shortcut;
    shortcutIndex: number;
    sortId: string;
    rect: DOMRect;
    layout: MeasuredRootGridItem['layout'];
    columnStart: number;
    rowStart: number;
    columnSpan: number;
    rowSpan: number;
  }) => CompactTargetRegions) | null;
  placementsBySortId: Map<string, RootCompactRegionPlacement>;
  computeProjectionOffsetsForIntent: (intent: import('@leaftab/workspace-core').RootShortcutDropIntent | null) => Map<string, ProjectionOffset>;
  commitHeatZoneInspector: (inspector: RootShortcutGridHeatZoneInspector | null) => void;
  commitResolvedHoverResolution: (resolution: RootHoverResolution) => void;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  coreInset: number;
  largeFolderCoreInset: number;
  autoScrollRafRef: React.MutableRefObject<number | null>;
  autoScrollContainerRef: React.MutableRefObject<HTMLElement | null>;
  autoScrollBoundsRef: React.MutableRefObject<{ top: number; bottom: number } | null>;
  autoScrollVelocityRef: React.MutableRefObject<number>;
  updateDragScrollOffset: () => void;
  edgePx: number;
  maxSpeedPx: number;
}) {
  const syncHoverResolution = (
    pointer: PointerPoint,
    measuredItemsOverride?: MeasuredRootGridItem[],
  ) => {
    syncRootHoverWithExtractHandoff({
      pointer,
      measuredItemsOverride,
      ...params,
    });
  };

  const updateAutoScrollVelocity = (clientY: number) => {
    updateRootAutoScrollVelocity({
      clientY,
      autoScrollRafRef: params.autoScrollRafRef,
      autoScrollContainerRef: params.autoScrollContainerRef,
      autoScrollBoundsRef: params.autoScrollBoundsRef,
      autoScrollVelocityRef: params.autoScrollVelocityRef,
      latestPointerRef: params.latestPointerRef,
      measureItems: params.measureItems,
      updateDragScrollOffset: params.updateDragScrollOffset,
      syncHoverResolution,
      edgePx: params.edgePx,
      maxSpeedPx: params.maxSpeedPx,
    });
  };

  return {
    syncHoverResolution,
    updateAutoScrollVelocity,
  };
}
