import type {
  GridInteractionProfileLike,
  PointerPoint,
  Shortcut,
} from '@leaftab/workspace-core';
import {
  buildPreviewOffsetFromPointer,
  measureDragItemRects,
} from '@leaftab/workspace-core';
import React, { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import type { MeasuredRootGridItem } from '../rootGeometry/measurement';
import { createRootGridMeasurementController } from '../rootGeometry/measurement';
import type { RootShortcutGridHeatZoneInspector } from '../rootResolution/compactHover';
import type { RootCompactRegionPlacement } from '../rootResolution/compactHover';
import type { RootReorderSlotCandidate, RootShortcutGridItem } from '../rootShortcutGridHelpers';
import type { SerpentinePackedGridItem } from '../serpentineWorldGrid';
import {
  areHeatZoneInspectorsEqual,
  ROOT_SHORTCUT_GRID_DRAG_AUTO_SCROLL_EDGE_PX,
  ROOT_SHORTCUT_GRID_DRAG_AUTO_SCROLL_MAX_SPEED_PX,
  ROOT_SHORTCUT_GRID_DRAG_MATCH_DISTANCE_PX,
  ROOT_SHORTCUT_GRID_EXTRACT_HANDOFF_DELAY_MS,
  ROOT_SHORTCUT_GRID_HEAT_ZONE_CORE_INSET,
  ROOT_SHORTCUT_GRID_HEAT_ZONE_LARGE_FOLDER_CORE_INSET,
  ROOT_SHORTCUT_GRID_MERGE_DWELL_MS,
  ROOT_SHORTCUT_GRID_REORDER_DWELL_MS,
  type DragSessionState,
  type HoverResolution,
  type PendingDragState,
  type RootShortcutExternalDragSession,
  type RootShortcutGridProps,
} from '../rootShortcutGridContracts';
import { isPointInsidePreviewRect } from '../rootView/renderSurface';
import { createRootAutoScrollController } from './autoScroll';
import {
  createRootDragRuntimeController,
  createRootProjectionSettleController,
  syncRootDraggingLifecycle,
} from './dragState';
import { createRootPointerReleaseController } from './dropCommit';
import { createRootHoverControllerBundle } from './hoverControllers';
import {
  createRootHoverIntentController,
  createRootInteractionProfileResolver,
} from './hoverTiming';
import { createRootPointerSessionController } from './pointerSession';
import {
  createRootExternalDragSessionController,
  createRootSessionActivationController,
} from './sessionStart';
import type { DragSettlePreview } from '../useDragMotionState';

type UseRootShortcutGridControllerBundleParams = {
  items: RootShortcutGridItem[];
  activeDragId: string | null;
  activeSourceRootShortcutId: string | null;
  dragging: boolean;
  selectionMode: boolean;
  dragScrollOffset: { x: number; y: number };
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  usesSpanAwareReorder: boolean;
  shouldUseProjectedRootReorderSlots: boolean;
  frozenSpanItemSortIds: ReadonlySet<string> | null;
  reorderSlotCandidates: RootReorderSlotCandidate[];
  extractedReorderSlotCandidates: RootReorderSlotCandidate[];
  placedGridItemsBySortId: Map<string, RootCompactRegionPlacement>;
  computeProjectionOffsetsForIntent: (intent: import('@leaftab/workspace-core').RootShortcutDropIntent | null) => Map<string, import('@leaftab/workspace-core').ProjectionOffset>;
  dragLayoutSnapshotRef: React.MutableRefObject<MeasuredRootGridItem[] | null>;
  dragScrollOriginTopRef: React.MutableRefObject<number>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  hoverResolutionRef: React.MutableRefObject<HoverResolution>;
  confirmedHoverResolutionRef: React.MutableRefObject<HoverResolution>;
  hoverConfirmTimerRef: React.MutableRefObject<number | null>;
  pendingHoverIntentKeyRef: React.MutableRefObject<string | null>;
  pendingHoverIntentPointRef: React.MutableRefObject<PointerPoint | null>;
  heatZoneInspectorRef: React.MutableRefObject<RootShortcutGridHeatZoneInspector | null>;
  recognitionPointRef: React.MutableRefObject<PointerPoint | null>;
  activeDragIdRef: React.MutableRefObject<string | null>;
  dropCleanupRafRef: React.MutableRefObject<number | null>;
  ignoreClickRef: React.MutableRefObject<boolean>;
  autoScrollContainerRef: React.MutableRefObject<HTMLElement | null>;
  autoScrollBoundsRef: React.MutableRefObject<{ top: number; bottom: number } | null>;
  autoScrollVelocityRef: React.MutableRefObject<number>;
  autoScrollRafRef: React.MutableRefObject<number | null>;
  projectionSettleResumeRafRef: React.MutableRefObject<number | null>;
  consumedExternalDragTokenRef: React.MutableRefObject<number | null>;
  extractHandoffTimerRef: React.MutableRefObject<number | null>;
  boundaryHoveredRef: React.MutableRefObject<boolean>;
  pendingDragRef: React.MutableRefObject<PendingDragState | null>;
  dragSessionRef: React.MutableRefObject<DragSessionState | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
  itemElementsRef: React.MutableRefObject<Map<string, HTMLDivElement>>;
  extractBoundaryRef?: React.RefObject<HTMLElement | null>;
  interactionProfile?: GridInteractionProfileLike;
  forceReorderOnly: boolean;
  onHeatZoneInspectorChange?: RootShortcutGridProps['onHeatZoneInspectorChange'];
  onBoundaryHoverChange?: RootShortcutGridProps['onBoundaryHoverChange'];
  onExtractDragStart?: RootShortcutGridProps['onExtractDragStart'];
  onExternalDragSessionConsumed?: RootShortcutGridProps['onExternalDragSessionConsumed'];
  onShortcutDropIntent?: RootShortcutGridProps['onShortcutDropIntent'];
  onShortcutReorder: RootShortcutGridProps['onShortcutReorder'];
  onDragStart?: RootShortcutGridProps['onDragStart'];
  onDragEnd?: RootShortcutGridProps['onDragEnd'];
  externalDragSession?: RootShortcutExternalDragSession | null;
  resolveCompactTargetRegions?: RootShortcutGridProps['resolveCompactTargetRegions'];
  resolveDropTargetRects?: RootShortcutGridProps['resolveDropTargetRects'];
  isItemDragDisabled?: RootShortcutGridProps['isItemDragDisabled'];
  clearDragSettlePreview: () => void;
  commitDragLayoutSnapshot: (snapshot: MeasuredRootGridItem[] | null) => void;
  setHoverResolution: React.Dispatch<React.SetStateAction<HoverResolution>>;
  setDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveSourceRootShortcutId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveDragId: React.Dispatch<React.SetStateAction<string | null>>;
  setDragPreviewOffset: React.Dispatch<React.SetStateAction<PointerPoint | null>>;
  setDragPointer: React.Dispatch<React.SetStateAction<PointerPoint | null>>;
  setDragScrollOffsetY: React.Dispatch<React.SetStateAction<number>>;
  setSuppressProjectionSettleAnimation: React.Dispatch<React.SetStateAction<boolean>>;
  emptyHoverResolution: HoverResolution;
  captureLayoutShiftSourceRects: (rects: Map<string, DOMRect>) => void;
  startDragSettlePreview: (preview: Omit<DragSettlePreview<Shortcut>, 'settling'>) => void;
};

type UseRootShortcutGridControllerBundleResult = {
  handleItemPointerDown: (
    item: SerpentinePackedGridItem<RootShortcutGridItem>,
    event: React.PointerEvent<HTMLDivElement>,
  ) => void;
};

export function useRootShortcutGridControllerBundle({
  items,
  activeDragId,
  activeSourceRootShortcutId,
  dragging,
  selectionMode,
  dragScrollOffset,
  gridColumns,
  gridColumnWidth,
  columnGap,
  rowHeight,
  rowGap,
  usesSpanAwareReorder,
  shouldUseProjectedRootReorderSlots,
  frozenSpanItemSortIds,
  reorderSlotCandidates,
  extractedReorderSlotCandidates,
  placedGridItemsBySortId,
  computeProjectionOffsetsForIntent,
  dragLayoutSnapshotRef,
  dragScrollOriginTopRef,
  latestPointerRef,
  hoverResolutionRef,
  confirmedHoverResolutionRef,
  hoverConfirmTimerRef,
  pendingHoverIntentKeyRef,
  pendingHoverIntentPointRef,
  heatZoneInspectorRef,
  recognitionPointRef,
  activeDragIdRef,
  dropCleanupRafRef,
  ignoreClickRef,
  autoScrollContainerRef,
  autoScrollBoundsRef,
  autoScrollVelocityRef,
  autoScrollRafRef,
  projectionSettleResumeRafRef,
  consumedExternalDragTokenRef,
  extractHandoffTimerRef,
  boundaryHoveredRef,
  pendingDragRef,
  dragSessionRef,
  rootRef,
  itemElementsRef,
  extractBoundaryRef,
  interactionProfile,
  forceReorderOnly,
  onHeatZoneInspectorChange,
  onBoundaryHoverChange,
  onExtractDragStart,
  onExternalDragSessionConsumed,
  onShortcutDropIntent,
  onShortcutReorder,
  onDragStart,
  onDragEnd,
  externalDragSession,
  resolveCompactTargetRegions,
  resolveDropTargetRects,
  isItemDragDisabled,
  clearDragSettlePreview,
  commitDragLayoutSnapshot,
  setHoverResolution,
  setDragging,
  setActiveSourceRootShortcutId,
  setActiveDragId,
  setDragPreviewOffset,
  setDragPointer,
  setDragScrollOffsetY,
  setSuppressProjectionSettleAnimation,
  emptyHoverResolution,
  captureLayoutShiftSourceRects,
  startDragSettlePreview,
}: UseRootShortcutGridControllerBundleParams): UseRootShortcutGridControllerBundleResult {
  const commitHeatZoneInspector = useCallback((nextInspector: RootShortcutGridHeatZoneInspector | null) => {
    if (areHeatZoneInspectorsEqual(heatZoneInspectorRef.current, nextInspector)) {
      return;
    }

    heatZoneInspectorRef.current = nextInspector;
    onHeatZoneInspectorChange?.(nextInspector);
  }, [heatZoneInspectorRef, onHeatZoneInspectorChange]);

  const commitBoundaryHoverState = useCallback((hovered: boolean) => {
    if (boundaryHoveredRef.current === hovered) {
      return;
    }

    boundaryHoveredRef.current = hovered;
    onBoundaryHoverChange?.(hovered);
  }, [boundaryHoveredRef, onBoundaryHoverChange]);

  const clearExtractHandoffTimer = useCallback(() => {
    if (extractHandoffTimerRef.current !== null) {
      window.clearTimeout(extractHandoffTimerRef.current);
      extractHandoffTimerRef.current = null;
    }
  }, [extractHandoffTimerRef]);

  const autoScrollController = useMemo(() => createRootAutoScrollController({
    autoScrollBoundsRef,
    autoScrollContainerRef,
  }), [autoScrollBoundsRef, autoScrollContainerRef]);

  const resolvedIncomingInteractionProfile = useMemo<GridInteractionProfileLike | null>(
    () => interactionProfile ?? (forceReorderOnly ? 'folder-internal' : null),
    [forceReorderOnly, interactionProfile],
  );

  const resolveInteractionProfile = useMemo(
    () => createRootInteractionProfileResolver({
      interactionProfile: resolvedIncomingInteractionProfile,
      forceReorderOnly: false,
    }),
    [resolvedIncomingInteractionProfile],
  );

  const hoverIntentController = useMemo(() => createRootHoverIntentController({
    emptyHoverResolution,
    hoverResolutionRef,
    confirmedHoverResolutionRef,
    hoverConfirmTimerRef,
    pendingHoverIntentKeyRef,
    pendingHoverIntentPointRef,
    reorderDwellMs: ROOT_SHORTCUT_GRID_REORDER_DWELL_MS,
    mergeDwellMs: ROOT_SHORTCUT_GRID_MERGE_DWELL_MS,
    resolveCurrentInteractionProfile: () => {
      const activeSortId = activeDragIdRef.current;
      if (!activeSortId) {
        return null;
      }

      const activeItem = items.find((item) => item.sortId === activeSortId) ?? null;
      if (!activeItem) {
        return null;
      }

      return resolveInteractionProfile({
        sourceRootShortcutId: dragSessionRef.current?.sourceRootShortcutId ?? activeSourceRootShortcutId ?? null,
        activeShortcut: activeItem.shortcut,
      });
    },
    setHoverResolution,
  }), [
    activeSourceRootShortcutId,
    confirmedHoverResolutionRef,
    dragSessionRef,
    emptyHoverResolution,
    hoverConfirmTimerRef,
    hoverResolutionRef,
    pendingHoverIntentPointRef,
    pendingHoverIntentKeyRef,
    resolveInteractionProfile,
    setHoverResolution,
  ]);
  const { clearCommittedHoverResolution, commitResolvedHoverResolution } = hoverIntentController;

  const sessionActivationController = useMemo(() => createRootSessionActivationController({
    rootRef,
    emptyHoverResolution,
    dragSessionRef,
    latestPointerRef,
    recognitionPointRef,
    dragScrollOriginTopRef,
    autoScrollContainerRef,
    autoScrollVelocityRef,
    hoverResolutionRef,
    confirmedHoverResolutionRef,
    refreshAutoScrollBounds: autoScrollController.refreshAutoScrollBounds,
    clearDragSettlePreview,
    commitDragLayoutSnapshot,
    clearExtractHandoffTimer,
    commitBoundaryHoverState,
    clearHoverConfirmTimer: hoverIntentController.clearHoverConfirmTimer,
    setDragScrollOffsetY,
    setHoverResolution,
    setDragging,
    setActiveSourceRootShortcutId,
    setActiveDragId,
    setDragPreviewOffset,
    setDragPointer,
  }), [
    autoScrollContainerRef,
    autoScrollController,
    autoScrollVelocityRef,
    clearDragSettlePreview,
    clearExtractHandoffTimer,
    commitBoundaryHoverState,
    commitDragLayoutSnapshot,
    confirmedHoverResolutionRef,
    dragScrollOriginTopRef,
    dragSessionRef,
    emptyHoverResolution,
    hoverIntentController,
    hoverResolutionRef,
    latestPointerRef,
    recognitionPointRef,
    rootRef,
    setActiveDragId,
    setActiveSourceRootShortcutId,
    setDragPointer,
    setDragPreviewOffset,
    setDragScrollOffsetY,
    setDragging,
    setHoverResolution,
  ]);
  const { activateMeasuredDragSession } = sessionActivationController;

  const updateDragScrollOffset = useCallback(() => {
    const container = autoScrollContainerRef.current;
    const nextOffset = container ? container.scrollTop - dragScrollOriginTopRef.current : 0;
    setDragScrollOffsetY((current) => (Math.abs(current - nextOffset) < 0.01 ? current : nextOffset));
  }, [autoScrollContainerRef, dragScrollOriginTopRef, setDragScrollOffsetY]);

  useEffect(() => {
    activeDragIdRef.current = activeDragId;
  }, [activeDragId, activeDragIdRef]);

  const projectionSettleController = useMemo(() => createRootProjectionSettleController({
    projectionSettleResumeRafRef,
    setSuppressProjectionSettleAnimation,
  }), [projectionSettleResumeRafRef, setSuppressProjectionSettleAnimation]);

  const measurementController = useMemo(() => createRootGridMeasurementController({
    items,
    itemElements: itemElementsRef.current,
    scrollOffset: dragScrollOffset,
    rootRef,
    dragging,
    dragLayoutSnapshotRef,
    stickySortIds: activeDragId ? [activeDragId] : [],
  }), [
    activeDragId,
    dragLayoutSnapshotRef,
    dragScrollOffset,
    dragging,
    itemElementsRef,
    items,
    rootRef,
  ]);

  const {
    clearDragRuntimeState,
    scheduleDragCleanup,
    cleanupOnUnmount,
  } = useMemo(() => createRootDragRuntimeController({
    pendingDragRef,
    dragSessionRef,
    latestPointerRef,
    recognitionPointRef,
    hoverResolutionRef,
    confirmedHoverResolutionRef,
    dragScrollOriginTopRef,
    autoScrollContainerRef,
    autoScrollBoundsRef,
    emptyHoverResolution,
    clearHoverConfirmTimer: hoverIntentController.clearHoverConfirmTimer,
    clearExtractHandoffTimer,
    commitHeatZoneInspector,
    commitBoundaryHoverState,
    commitDragLayoutSnapshot,
    autoScrollVelocityRef,
    autoScrollRafRef,
    setDragging,
    setActiveSourceRootShortcutId,
    setActiveDragId,
    setDragPointer,
    setDragPreviewOffset,
    setHoverResolution,
    setDragScrollOffsetY,
    dropCleanupRafRef,
    projectionSettleResumeRafRef,
    clearDragSettlePreview,
  }), [
    autoScrollBoundsRef,
    autoScrollContainerRef,
    autoScrollRafRef,
    autoScrollVelocityRef,
    clearDragSettlePreview,
    clearExtractHandoffTimer,
    commitBoundaryHoverState,
    commitDragLayoutSnapshot,
    commitHeatZoneInspector,
    confirmedHoverResolutionRef,
    dragScrollOriginTopRef,
    dragSessionRef,
    dropCleanupRafRef,
    emptyHoverResolution,
    hoverIntentController,
    hoverResolutionRef,
    latestPointerRef,
    pendingDragRef,
    projectionSettleResumeRafRef,
    recognitionPointRef,
    setActiveDragId,
    setActiveSourceRootShortcutId,
    setDragPointer,
    setDragPreviewOffset,
    setDragScrollOffsetY,
    setDragging,
    setHoverResolution,
  ]);

  const {
    hoverRuntimeController,
    resolveHoverResolutionFromPointer,
  } = useMemo(() => createRootHoverControllerBundle({
    measurementController,
    activeDragIdRef,
    dragSessionRef,
    latestPointerRef,
    recognitionPointRef,
    hoverResolutionRef,
    confirmedHoverResolutionRef,
    extractHandoffTimerRef,
    activeSourceRootShortcutId,
    dragScrollOffset,
    rootRef,
    extractBoundaryRef,
    extractionEnabled: Boolean(onExtractDragStart),
    items,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
    usesSpanAwareReorder,
    shouldUseProjectedRootReorderSlots,
    frozenSortIds: frozenSpanItemSortIds,
    reorderSlotCandidates,
    extractedReorderSlotCandidates,
    resolveInteractionProfile,
    resolveCompactTargetRegions,
    resolveDropTargetRects,
    placementsBySortId: placedGridItemsBySortId,
    computeProjectionOffsetsForIntent,
    emptyHoverResolution,
    coreInset: ROOT_SHORTCUT_GRID_HEAT_ZONE_CORE_INSET,
    largeFolderCoreInset: ROOT_SHORTCUT_GRID_HEAT_ZONE_LARGE_FOLDER_CORE_INSET,
    matchDistancePx: ROOT_SHORTCUT_GRID_DRAG_MATCH_DISTANCE_PX,
    delayMs: ROOT_SHORTCUT_GRID_EXTRACT_HANDOFF_DELAY_MS,
    onExtractDragStart,
    clearDragRuntimeState,
    clearCommittedHoverResolution,
    clearExtractHandoffTimer,
    commitBoundaryHoverState,
    commitHeatZoneInspector,
    commitResolvedHoverResolution,
    autoScrollRafRef,
    autoScrollContainerRef,
    autoScrollBoundsRef,
    autoScrollVelocityRef,
    updateDragScrollOffset,
    edgePx: ROOT_SHORTCUT_GRID_DRAG_AUTO_SCROLL_EDGE_PX,
    maxSpeedPx: ROOT_SHORTCUT_GRID_DRAG_AUTO_SCROLL_MAX_SPEED_PX,
  }), [
    activeDragIdRef,
    activeSourceRootShortcutId,
    autoScrollBoundsRef,
    autoScrollContainerRef,
    autoScrollRafRef,
    autoScrollVelocityRef,
    clearCommittedHoverResolution,
    clearDragRuntimeState,
    clearExtractHandoffTimer,
    columnGap,
    commitBoundaryHoverState,
    commitHeatZoneInspector,
    commitResolvedHoverResolution,
    computeProjectionOffsetsForIntent,
    confirmedHoverResolutionRef,
    dragScrollOffset,
    dragSessionRef,
    emptyHoverResolution,
    extractBoundaryRef,
    extractHandoffTimerRef,
    extractedReorderSlotCandidates,
    frozenSpanItemSortIds,
    gridColumnWidth,
    gridColumns,
    hoverResolutionRef,
    items,
    latestPointerRef,
    measurementController,
    onExtractDragStart,
    placedGridItemsBySortId,
    recognitionPointRef,
    reorderSlotCandidates,
    resolveCompactTargetRegions,
    resolveDropTargetRects,
    resolveInteractionProfile,
    rootRef,
    rowGap,
    rowHeight,
    shouldUseProjectedRootReorderSlots,
    updateDragScrollOffset,
    usesSpanAwareReorder,
  ]);

  const externalDragSessionController = useMemo(() => createRootExternalDragSessionController({
    externalDragSession: externalDragSession ?? null,
    items,
    dragSessionRef,
    pendingDragRef,
    consumedExternalDragTokenRef,
    measureItems: measurementController.measureCurrentGridItems,
    activateMeasuredDragSession,
    syncHoverResolution: hoverRuntimeController.syncHoverResolution,
    onExternalDragSessionConsumed,
  }), [
    activateMeasuredDragSession,
    consumedExternalDragTokenRef,
    dragSessionRef,
    externalDragSession,
    hoverRuntimeController,
    items,
    measurementController,
    onExternalDragSessionConsumed,
    pendingDragRef,
  ]);

  useLayoutEffect(() => {
    externalDragSessionController.activate();
  }, [externalDragSessionController]);

  useEffect(() => syncRootDraggingLifecycle({
    dragging,
    ignoreClickRef,
    onDragStart,
    onDragEnd,
  }), [dragging, ignoreClickRef, onDragEnd, onDragStart]);

  const cleanupOnUnmountRef = React.useRef(cleanupOnUnmount);

  useEffect(() => {
    cleanupOnUnmountRef.current = cleanupOnUnmount;
  }, [cleanupOnUnmount]);

  useEffect(() => () => {
    cleanupOnUnmountRef.current();
  }, []);

  const pointerReleaseController = useMemo(() => createRootPointerReleaseController({
    confirmedHoverResolutionRef,
    items,
    layoutSnapshotRef: dragLayoutSnapshotRef,
    dragScrollOffset,
    rootElement: rootRef.current,
    usesSpanAwareReorder,
    frozenSortIds: frozenSpanItemSortIds,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
    onShortcutDropIntent,
    onShortcutReorder,
    armProjectionSettleSuppression: projectionSettleController.armProjectionSettleSuppression,
    startDragSettlePreview,
    captureLayoutShiftSourceRects,
    measureCurrentRects: () => measureDragItemRects(itemElementsRef.current),
    clearDragRuntimeState,
    scheduleDragCleanup,
  }), [
    captureLayoutShiftSourceRects,
    clearDragRuntimeState,
    columnGap,
    confirmedHoverResolutionRef,
    dragLayoutSnapshotRef,
    dragScrollOffset,
    frozenSpanItemSortIds,
    gridColumnWidth,
    gridColumns,
    itemElementsRef,
    items,
    onShortcutDropIntent,
    onShortcutReorder,
    projectionSettleController,
    rootRef,
    rowGap,
    rowHeight,
    scheduleDragCleanup,
    startDragSettlePreview,
    usesSpanAwareReorder,
  ]);

  const pointerSessionController = useMemo(() => createRootPointerSessionController({
    pendingDragRef,
    dragSessionRef,
    dropCleanupRafRef,
    latestPointerRef,
    confirmedHoverResolutionRef,
    measureItems: measurementController.measureCurrentGridItems,
    activateMeasuredDragSession,
    setDragPointer,
    updateAutoScrollVelocity: hoverRuntimeController.updateAutoScrollVelocity,
    syncHoverResolution: hoverRuntimeController.syncHoverResolution,
    resolveHoverResolutionFromPointer,
    commitResolvedHoverResolution,
    onRelease: pointerReleaseController.onRelease,
    onUnexpectedError: () => {
      clearDragRuntimeState();
    },
  }), [
    activateMeasuredDragSession,
    clearDragRuntimeState,
    commitResolvedHoverResolution,
    confirmedHoverResolutionRef,
    dragSessionRef,
    dropCleanupRafRef,
    hoverRuntimeController,
    latestPointerRef,
    measurementController,
    pendingDragRef,
    pointerReleaseController,
    resolveHoverResolutionFromPointer,
    setDragPointer,
  ]);

  useEffect(() => pointerSessionController.bindListeners(), [pointerSessionController]);

  const handleItemPointerDown = useCallback((
    item: SerpentinePackedGridItem<RootShortcutGridItem>,
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const dragDisabled = selectionMode || Boolean(isItemDragDisabled?.(item.shortcut));
    if (dragDisabled) return;
    if (event.button !== 0) return;
    if (!event.isPrimary) return;

    const rect = event.currentTarget.getBoundingClientRect();
    if (!isPointInsidePreviewRect({
      point: { x: event.clientX, y: event.clientY },
      rect,
      layout: item.layout,
    })) {
      return;
    }

    pendingDragRef.current = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      activeId: item.sortId,
      activeSortId: item.sortId,
      origin: { x: event.clientX, y: event.clientY },
      current: { x: event.clientX, y: event.clientY },
      previewOffset: buildPreviewOffsetFromPointer({
        rect,
        pointer: { x: event.clientX, y: event.clientY },
      }),
    };
  }, [isItemDragDisabled, pendingDragRef, selectionMode]);

  return {
    handleItemPointerDown,
  };
}
