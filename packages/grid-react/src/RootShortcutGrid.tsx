import {
  measureDragItemRects,
  type PointerPoint,
  type Shortcut,
} from '@leaftab/workspace-core';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  buildRootLayoutAnimationSignature,
  buildRootShortcutGridItems,
} from './rootShortcutGridHelpers';
import {
  bindRootGridWidthObserver,
  type MeasuredRootGridItem,
} from './rootGeometry/measurement';
import { type RootShortcutGridHeatZoneInspector } from './rootResolution/compactHover';
import { useRootShortcutGridDerivedState } from './rootResolution/useRootShortcutGridDerivedState';
import {
  commitRootMeasuredRectsForLayoutShift,
} from './rootRuntime/dragState';
import {
  EMPTY_ROOT_HOVER_RESOLUTION,
} from './rootRuntime/hoverTiming';
import { useRootShortcutGridControllerBundle } from './rootRuntime/useRootShortcutGridControllerBundle';
import { useDragMotionState } from './useDragMotionState';
import {
  detectFirefox,
  renderDefaultRootDropPreview,
  RootShortcutGridSurface,
} from './rootView/renderSurface';
import {
  ROOT_SHORTCUT_GRID_DRAG_OVERLAY_Z_INDEX,
  ROOT_SHORTCUT_GRID_DRAG_RELEASE_SETTLE_DURATION_MS,
  ROOT_SHORTCUT_GRID_LAYOUT_SHIFT_MIN_DISTANCE_PX,
  type DragSessionState,
  type HoverResolution,
  type PendingDragState,
  type RootShortcutGridProps,
} from './rootShortcutGridContracts';

export type {
  RootShortcutGridHeatZone,
  RootShortcutGridHeatZoneInspector,
} from './rootResolution/compactHover';

export type { RootShortcutGridItemLayout } from './rootShortcutGridHelpers';
export type {
  RootShortcutGridDropTargetRects,
  RootShortcutGridRenderCenterPreviewParams,
  RootShortcutGridRenderDragPreviewParams,
  RootShortcutGridRenderDropPreviewParams,
  RootShortcutGridRenderItemParams,
  RootShortcutGridResolveCompactTargetRegionsParams,
  RootShortcutGridResolveDropTargetRectsParams,
} from './rootView/renderSurface';
export type {
  RootShortcutExternalDragSession,
  RootShortcutGridProps,
} from './rootShortcutGridContracts';

type MeasuredGridItem = MeasuredRootGridItem;

const EMPTY_HOVER_RESOLUTION: HoverResolution = EMPTY_ROOT_HOVER_RESOLUTION;

export const RootShortcutGrid = React.memo(function RootShortcutGrid({
  containerHeight,
  bottomInset = 0,
  shortcuts,
  gridColumns,
  minRows,
  rowHeight,
  rowGap = 20,
  columnGap = 12,
  overlayZIndex = ROOT_SHORTCUT_GRID_DRAG_OVERLAY_Z_INDEX,
  resolveItemLayout,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutReorder,
  onShortcutDropIntent,
  onGridContextMenu,
  onDragStart,
  onDragEnd,
  onHeatZoneInspectorChange,
  interactionProfile,
  forceReorderOnly = false,
  extractBoundaryRef,
  onExtractDragStart,
  onBoundaryHoverChange,
  disableReorderAnimation = false,
  selectionMode = false,
  selectedShortcutIndexes,
  onToggleShortcutSelection,
  externalDragSession,
  onExternalDragSessionConsumed,
  isItemDragDisabled,
  isFirefox = detectFirefox(),
  resolveDropTargetRects,
  resolveCompactTargetRegions,
  renderItem,
  renderDragPreview,
  renderCenterPreview,
  renderDropPreview = renderDefaultRootDropPreview,
}: RootShortcutGridProps) {
  const items = useMemo(() => buildRootShortcutGridItems({
    shortcuts,
    resolveItemLayout,
  }), [shortcuts, resolveItemLayout]);
  const layoutAnimationSignature = useMemo(
    () => buildRootLayoutAnimationSignature(items),
    [items],
  );

  const [dragging, setDragging] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragPointer, setDragPointer] = useState<PointerPoint | null>(null);
  const [dragPreviewOffset, setDragPreviewOffset] = useState<PointerPoint | null>(null);
  const [hoverResolution, setHoverResolution] = useState<HoverResolution>(EMPTY_HOVER_RESOLUTION);
  const [dragLayoutSnapshot, setDragLayoutSnapshot] = useState<MeasuredGridItem[] | null>(null);
  const [activeSourceRootShortcutId, setActiveSourceRootShortcutId] = useState<string | null>(null);
  const [gridWidthPx, setGridWidthPx] = useState<number | null>(null);
  const [dragScrollOffsetY, setDragScrollOffsetY] = useState(0);
  const [suppressProjectionSettleAnimation, setSuppressProjectionSettleAnimation] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const itemElementsRef = useRef(new Map<string, HTMLDivElement>());
  const pendingDragRef = useRef<PendingDragState | null>(null);
  const dragSessionRef = useRef<DragSessionState | null>(null);
  const dragLayoutSnapshotRef = useRef<MeasuredGridItem[] | null>(null);
  const dragScrollOriginTopRef = useRef(0);
  const latestPointerRef = useRef<PointerPoint | null>(null);
  const hoverResolutionRef = useRef<HoverResolution>(EMPTY_HOVER_RESOLUTION);
  const confirmedHoverResolutionRef = useRef<HoverResolution>(EMPTY_HOVER_RESOLUTION);
  const hoverConfirmTimerRef = useRef<number | null>(null);
  const pendingHoverIntentKeyRef = useRef<string | null>(null);
  const pendingHoverIntentPointRef = useRef<PointerPoint | null>(null);
  const heatZoneInspectorRef = useRef<RootShortcutGridHeatZoneInspector | null>(null);
  const recognitionPointRef = useRef<PointerPoint | null>(null);
  const activeDragIdRef = useRef<string | null>(null);
  const dropCleanupRafRef = useRef<number | null>(null);
  const ignoreClickRef = useRef(false);
  const autoScrollContainerRef = useRef<HTMLElement | null>(null);
  const autoScrollBoundsRef = useRef<{ top: number; bottom: number } | null>(null);
  const autoScrollVelocityRef = useRef(0);
  const autoScrollRafRef = useRef<number | null>(null);
  const projectionSettleResumeRafRef = useRef<number | null>(null);
  const consumedExternalDragTokenRef = useRef<number | null>(null);
  const disableReorderAnimationRef = useRef(disableReorderAnimation);
  const extractHandoffTimerRef = useRef<number | null>(null);
  const boundaryHoveredRef = useRef(false);
  const previousLayoutAnimationSignatureRef = useRef<string | null>(null);

  const {
    layoutShiftOffsets,
    disableLayoutShiftTransition,
    dragSettlePreview,
    hasPendingLayoutShiftSourceRects,
    captureLayoutShiftSourceRects,
    commitMeasuredItemRects,
    startDragSettlePreview,
    clearDragSettlePreview,
  } = useDragMotionState<Shortcut>({
    minLayoutShiftDistancePx: ROOT_SHORTCUT_GRID_LAYOUT_SHIFT_MIN_DISTANCE_PX,
    settleDurationMs: ROOT_SHORTCUT_GRID_DRAG_RELEASE_SETTLE_DURATION_MS,
  });

  const hoverIntent = hoverResolution.interactionIntent;
  const visualProjectionIntent = hoverResolution.visualProjectionIntent;

  const commitDragLayoutSnapshot = useCallback((nextSnapshot: MeasuredGridItem[] | null) => {
    dragLayoutSnapshotRef.current = nextSnapshot;
    setDragLayoutSnapshot(nextSnapshot);
  }, []);

  const {
    packedLayout,
    placedGridItemsBySortId,
    gridMinHeight,
    usesSpanAwareReorder,
    gridColumnWidth,
    shouldUseProjectedRootReorderSlots,
    activeDragItem,
    frozenSpanItemSortIds,
    reorderSlotCandidates,
    extractedReorderSlotCandidates,
    hoverState,
    dragScrollOffset,
    projectionOffsets,
    hiddenSortId,
    effectiveProjectedDropPreview,
    computeProjectionOffsetsForIntent,
  } = useRootShortcutGridDerivedState({
    items,
    gridColumns,
    minRows,
    rowHeight,
    rowGap,
    columnGap,
    activeDragId,
    activeSourceRootShortcutId,
    gridWidthPx,
    dragScrollOffsetY,
    dragLayoutSnapshot,
    hoverIntent,
    visualProjectionIntent,
    dragSettlePreviewItemId: dragSettlePreview?.itemId ?? null,
    rootRef,
  });

  useLayoutEffect(() => bindRootGridWidthObserver({
    rootRef,
    setGridWidthPx,
  }), []);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const previousLayoutAnimationSignature = previousLayoutAnimationSignatureRef.current;
    const skipLayoutShiftForStableLayoutSignature = (
      previousLayoutAnimationSignature !== null
      && previousLayoutAnimationSignature === layoutAnimationSignature
    );
    if (dragging && !hasPendingLayoutShiftSourceRects()) {
      disableReorderAnimationRef.current = disableReorderAnimation;
      previousLayoutAnimationSignatureRef.current = layoutAnimationSignature;
      return;
    }

    commitRootMeasuredRectsForLayoutShift({
      disableReorderAnimationRef,
      disableReorderAnimation,
      dragging,
      hasPendingLayoutShiftSourceRects,
      suppressProjectionSettleAnimation,
      skipForStableLayoutSignature: skipLayoutShiftForStableLayoutSignature,
      commitMeasuredItemRects,
      currentRects: measureDragItemRects(itemElementsRef.current),
    });
    previousLayoutAnimationSignatureRef.current = layoutAnimationSignature;
  }, [
    commitMeasuredItemRects,
    disableReorderAnimation,
    dragging,
    hasPendingLayoutShiftSourceRects,
    items,
    layoutAnimationSignature,
    packedLayout.placedItems,
    suppressProjectionSettleAnimation,
  ]);

  const { handleItemPointerDown } = useRootShortcutGridControllerBundle({
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
    emptyHoverResolution: EMPTY_HOVER_RESOLUTION,
    captureLayoutShiftSourceRects,
    startDragSettlePreview,
  });

  const handleItemOpen = useCallback((
    item: typeof packedLayout.placedItems[number],
    selectionDisabled: boolean,
  ) => {
    if (ignoreClickRef.current) return;
    if (selectionMode) {
      if (selectionDisabled) return;
      onToggleShortcutSelection?.(item.shortcutIndex);
      return;
    }
    onShortcutOpen(item.shortcut);
  }, [onShortcutOpen, onToggleShortcutSelection, selectionMode]);

  const handleItemContextMenu = useCallback((
    item: typeof packedLayout.placedItems[number],
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!ignoreClickRef.current) {
      onShortcutContextMenu?.(event, item.shortcutIndex, item.shortcut);
    }
  }, [onShortcutContextMenu]);

  return (
    <RootShortcutGridSurface
      rootRef={rootRef}
      containerHeight={containerHeight}
      bottomInset={bottomInset}
      gridMinHeight={gridMinHeight}
      onGridContextMenu={onGridContextMenu}
      dragging={dragging}
      effectiveProjectedDropPreview={effectiveProjectedDropPreview}
      renderDropPreview={renderDropPreview}
      gridColumns={gridColumns}
      rowHeight={rowHeight}
      columnGap={columnGap}
      rowGap={rowGap}
      placedItems={packedLayout.placedItems}
      projectionOffsets={projectionOffsets}
      layoutShiftOffsets={layoutShiftOffsets}
      selectedShortcutIndexes={selectedShortcutIndexes}
      selectionMode={selectionMode}
      isItemDragDisabled={isItemDragDisabled}
      hoverState={hoverState}
      hiddenSortId={hiddenSortId}
      renderCenterPreview={renderCenterPreview}
      disableReorderAnimation={disableReorderAnimation}
      suppressProjectionSettleAnimation={suppressProjectionSettleAnimation}
      disableLayoutShiftTransition={disableLayoutShiftTransition}
      isFirefox={isFirefox}
      itemElementsRef={itemElementsRef}
      onItemPointerDown={handleItemPointerDown}
      renderItem={renderItem}
      onItemOpen={handleItemOpen}
      onItemContextMenu={handleItemContextMenu}
      activeDragItem={activeDragItem}
      dragPointer={dragPointer}
      dragPreviewOffset={dragPreviewOffset}
      overlayZIndex={overlayZIndex}
      renderDragPreview={renderDragPreview}
      dragSettlePreview={dragSettlePreview}
      shortcuts={shortcuts}
    />
  );
});
