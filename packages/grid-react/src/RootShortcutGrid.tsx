import {
  buildPreviewOffsetFromAnchor,
  buildPreviewOffsetFromPointer,
  buildReorderProjectionOffsets as buildSharedReorderProjectionOffsets,
  combineProjectionOffsets,
  distanceToRect,
  distanceToRectCenter,
  getDragVisualCenter,
  getProjectedGridItemRect,
  hasPointerDragActivated,
  isShortcutFolder,
  measureDragItemRects,
  measureDragItems,
  packGridItems,
  pointInRect,
  resolveRootDropIntent,
  type ActivePointerDragState,
  type DragRect,
  type MeasuredDragItem,
  type PendingPointerDragState,
  type PointerPoint,
  type ProjectionOffset,
  type RootShortcutDropIntent,
  type Shortcut,
  type ShortcutExternalDragSessionSeed,
} from '@leaftab/workspace-core';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { GridDragItemFrame } from './GridDragItemFrame';
import {
  resolveCompactRootHoverResolution,
  type CompactRootHoverResolution,
  type CompactTargetRegion,
  type CompactTargetRegions,
} from './compactRootHover';
import {
  buildDraggedRootItemAnchorRect,
  buildRootReorderSlotCandidates,
  buildProjectedRootItemPreviewRect,
  buildProjectedGridItemsForRootReorder,
  buildRootShortcutGridItems,
  resolveFinalHoverIntent,
  resolveRootReorderSlotIntent,
  resolveSpanAwareSlotProbePoint,
  shouldSkipLayoutShiftOnAnimationReenable,
  type NormalizedRootShortcutGridItemLayout,
  type RootReorderSlotCandidate,
  type RootShortcutGridItem,
  type RootShortcutGridItemLayout,
} from './rootShortcutGridHelpers';
import { useDragMotionState } from './useDragMotionState';

export type { RootShortcutGridItemLayout } from './rootShortcutGridHelpers';

const DRAG_OVERLAY_Z_INDEX = 14030;
const DRAG_AUTO_SCROLL_EDGE_PX = 88;
const DRAG_AUTO_SCROLL_MAX_SPEED_PX = 26;
const DRAG_MATCH_DISTANCE_PX = 64;
const LAYOUT_SHIFT_MIN_DISTANCE_PX = 0.5;
const DRAG_RELEASE_SETTLE_DURATION_MS = 220;

type RootHoverState =
  | { type: 'item'; sortId: string; edge: 'before' | 'after' | 'center' }
  | null;

type PendingDragState = PendingPointerDragState<string> & {
  activeSortId: string;
  current: PointerPoint;
};

type DragSessionState = ActivePointerDragState<string> & {
  activeSortId: string;
  sourceRootShortcutId?: string;
};

type MeasuredGridItem = MeasuredDragItem<RootShortcutGridItem>;

type OverItemCandidate = {
  overItem: MeasuredGridItem;
  overRect: DOMRect;
};

type HoverResolution = CompactRootHoverResolution;

type RootDragResolutionMode =
  | 'normal'
  | 'large-folder-reorder-only'
  | 'extracted-reorder-only';

type ProjectedDropPreview = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
  opacity?: number;
};

const EMPTY_HOVER_RESOLUTION: HoverResolution = {
  interactionIntent: null,
  visualProjectionIntent: null,
};

function extractPreviousRootReorderIntents(resolution: HoverResolution): {
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

function buildReorderOnlyHoverResolution(params: {
  nextIntent: RootShortcutDropIntent | null;
  previousInteractionIntent: Extract<RootShortcutDropIntent, { type: 'reorder-root' }> | null;
  previousVisualProjectionIntent: Extract<RootShortcutDropIntent, { type: 'reorder-root' }> | null;
}): HoverResolution {
  const { nextIntent, previousInteractionIntent, previousVisualProjectionIntent } = params;
  return {
    interactionIntent: nextIntent ?? previousInteractionIntent,
    visualProjectionIntent: nextIntent ?? previousVisualProjectionIntent ?? previousInteractionIntent,
  };
}

function resolveRootDragResolutionMode(params: {
  sourceRootShortcutId: string | null;
  activeShortcut: Shortcut;
}): RootDragResolutionMode {
  const { sourceRootShortcutId, activeShortcut } = params;
  if (sourceRootShortcutId) {
    return 'extracted-reorder-only';
  }
  if (isShortcutFolder(activeShortcut) && activeShortcut.folderDisplayMode === 'large') {
    return 'large-folder-reorder-only';
  }
  return 'normal';
}

export type RootShortcutExternalDragSession = ShortcutExternalDragSessionSeed & {
  token: number;
};

export type RootShortcutGridRenderItemParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
  selected: boolean;
  selectionMode: boolean;
  selectionDisabled: boolean;
  centerPreviewActive: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export type RootShortcutGridRenderDragPreviewParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
};

export type RootShortcutGridRenderCenterPreviewParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
};

export type RootShortcutGridRenderDropPreviewParams = ProjectedDropPreview;

export type RootShortcutGridResolveDropTargetRectsParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
  sortId: string;
  rect: DOMRect;
  layout: NormalizedRootShortcutGridItemLayout;
  columnStart: number;
  rowStart: number;
  columnSpan: number;
  rowSpan: number;
};

export type RootShortcutGridDropTargetRects = {
  overRect: DragRect;
  overCenterRect?: DragRect;
};

export type RootShortcutGridResolveCompactTargetRegionsParams =
  RootShortcutGridResolveDropTargetRectsParams;

type CompactRegionPlacement = Pick<
  RootShortcutGridResolveCompactTargetRegionsParams,
  'columnStart' | 'rowStart' | 'columnSpan' | 'rowSpan'
>;

function buildVisualRect(params: {
  pointer: PointerPoint;
  previewOffset: PointerPoint;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}): CompactTargetRegion {
  const { pointer, previewOffset, width, height, offsetX, offsetY } = params;
  const left = pointer.x - previewOffset.x + offsetX;
  const top = pointer.y - previewOffset.y + offsetY;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

export interface RootShortcutGridProps {
  containerHeight: number;
  bottomInset?: number;
  shortcuts: Shortcut[];
  gridColumns: number;
  minRows: number;
  rowHeight: number;
  rowGap?: number;
  columnGap?: number;
  overlayZIndex?: number;
  resolveItemLayout: (shortcut: Shortcut) => RootShortcutGridItemLayout;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu?: (
    event: React.MouseEvent<HTMLDivElement>,
    shortcutIndex: number,
    shortcut: Shortcut,
  ) => void;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  onShortcutDropIntent?: (intent: RootShortcutDropIntent) => void;
  onGridContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  disableReorderAnimation?: boolean;
  selectionMode?: boolean;
  selectedShortcutIndexes?: ReadonlySet<number>;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
  externalDragSession?: RootShortcutExternalDragSession | null;
  onExternalDragSessionConsumed?: (token: number) => void;
  isItemDragDisabled?: (shortcut: Shortcut) => boolean;
  isFirefox?: boolean;
  resolveDropTargetRects?: (
    params: RootShortcutGridResolveDropTargetRectsParams,
  ) => RootShortcutGridDropTargetRects;
  resolveCompactTargetRegions?: (
    params: RootShortcutGridResolveCompactTargetRegionsParams,
  ) => CompactTargetRegions;
  renderItem: (params: RootShortcutGridRenderItemParams) => React.ReactNode;
  renderDragPreview: (params: RootShortcutGridRenderDragPreviewParams) => React.ReactNode;
  renderCenterPreview?: (params: RootShortcutGridRenderCenterPreviewParams) => React.ReactNode;
  renderDropPreview?: (params: RootShortcutGridRenderDropPreviewParams) => React.ReactNode;
}

function detectFirefox() {
  return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
}

function deriveHoverStateFromIntent(intent: RootShortcutDropIntent | null): RootHoverState {
  if (!intent) return null;

  switch (intent.type) {
    case 'reorder-root':
      return { type: 'item', sortId: intent.overShortcutId, edge: intent.edge };
    case 'merge-root-shortcuts':
      return { type: 'item', sortId: intent.targetShortcutId, edge: 'center' };
    case 'move-root-shortcut-into-folder':
      return { type: 'item', sortId: intent.targetFolderId, edge: 'center' };
    default:
      return null;
  }
}

function buildResolveMeasuredItemCompactRegions(params: {
  resolveCompactTargetRegions: NonNullable<RootShortcutGridProps['resolveCompactTargetRegions']>;
  placementsBySortId: Map<string, CompactRegionPlacement>;
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

function buildDefaultPlaceholder(layout: NormalizedRootShortcutGridItemLayout) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none border-2 border-dashed border-current/25 bg-current/5"
      style={{
        width: layout.width,
        height: layout.height,
        margin: '0 auto',
        borderRadius: layout.previewBorderRadius ?? '18px',
      }}
    />
  );
}

function renderDefaultDropPreview(params: RootShortcutGridRenderDropPreviewParams) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-0 bg-black/10"
      style={{
        left: params.left,
        top: params.top,
        width: params.width,
        height: params.height,
        borderRadius: params.borderRadius ?? '18px',
        opacity: params.opacity,
      }}
    />
  );
}

function findScrollableParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const canScroll = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && current.scrollHeight > current.clientHeight + 1;
    if (canScroll) return current;
    current = current.parentElement;
  }
  return null;
}

function measureGridItems(
  items: RootShortcutGridItem[],
  itemElements: Map<string, HTMLDivElement>,
): MeasuredGridItem[] {
  return measureDragItems({
    items,
    itemElements,
    getId: (item) => item.sortId,
  });
}

function offsetDomRectByScrollY(rect: DOMRect, scrollOffsetY: number): DOMRect {
  if (Math.abs(scrollOffsetY) < 0.01) {
    return rect;
  }

  return new DOMRect(
    rect.x,
    rect.y - scrollOffsetY,
    rect.width,
    rect.height,
  );
}

function offsetMeasuredGridItemsByScrollY(
  snapshot: MeasuredGridItem[] | null,
  scrollOffsetY: number,
): MeasuredGridItem[] | null {
  if (!snapshot || Math.abs(scrollOffsetY) < 0.01) {
    return snapshot;
  }

  return snapshot.map((item) => ({
    ...item,
    rect: offsetDomRectByScrollY(item.rect, scrollOffsetY),
  }));
}

function pickOverItemCandidate(params: {
  activeSortId: string;
  measuredItems: MeasuredGridItem[];
  pointer: PointerPoint;
}): OverItemCandidate | null {
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
  if (!best || best.distance > DRAG_MATCH_DISTANCE_PX) return null;
  return {
    overItem: best.item,
    overRect: best.item.rect,
  };
}

function buildReorderProjectionOffsets(params: {
  items: RootShortcutGridItem[];
  layoutSnapshot: MeasuredGridItem[] | null;
  activeSortId: string | null;
  hoverIntent: RootShortcutDropIntent | null;
}): Map<string, ProjectionOffset> {
  const { items, layoutSnapshot, activeSortId, hoverIntent } = params;
  return buildSharedReorderProjectionOffsets({
    items,
    layoutSnapshot,
    activeId: activeSortId,
    hoveredId: hoverIntent?.type === 'reorder-root' ? hoverIntent.overShortcutId : null,
    targetIndex: hoverIntent?.type === 'reorder-root' ? hoverIntent.targetIndex : null,
    getId: (item) => item.sortId,
  });
}

function projectsActiveItemToOwnSlot(params: {
  items: RootShortcutGridItem[];
  activeSortId: string;
  targetIndex: number;
  frozenSortIds: ReadonlySet<string> | null;
}): boolean {
  const { items, activeSortId, targetIndex, frozenSortIds } = params;
  const activeIndex = items.findIndex((item) => item.sortId === activeSortId);
  if (activeIndex < 0) return false;

  const projectedItems = buildProjectedGridItemsForRootReorder({
    items,
    activeSortId,
    targetIndex,
    frozenSortIds,
  });
  if (!projectedItems) return false;

  return projectedItems.findIndex((item) => item.sortId === activeSortId) === activeIndex;
}

function buildProjectedDropPreview(params: {
  items: RootShortcutGridItem[];
  layoutSnapshot: MeasuredGridItem[] | null;
  activeSortId: string | null;
  hoverIntent: RootShortcutDropIntent | null;
  rootElement: HTMLDivElement | null;
  usesSpanAwareReorder: boolean;
  frozenSortIds: ReadonlySet<string> | null;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
}): ProjectedDropPreview | null {
  const {
    items,
    layoutSnapshot,
    activeSortId,
    hoverIntent,
    rootElement,
    usesSpanAwareReorder,
    frozenSortIds,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
  } = params;

  if (!layoutSnapshot || !activeSortId || !rootElement) {
    return null;
  }

  const activeItem = items.find((item) => item.sortId === activeSortId);
  if (!activeItem) return null;

  const snapshotById = new Map(layoutSnapshot.map((item) => [item.sortId, item]));
  const activeSnapshot = snapshotById.get(activeSortId);
  if (!activeSnapshot) return null;
  const rootRect = rootElement.getBoundingClientRect();

  if (!hoverIntent) {
    return {
      left: activeSnapshot.rect.left - rootRect.left + activeItem.layout.previewOffsetX,
      top: activeSnapshot.rect.top - rootRect.top + activeItem.layout.previewOffsetY,
      width: activeItem.layout.previewWidth,
      height: activeItem.layout.previewHeight,
      borderRadius: activeItem.layout.previewBorderRadius,
    };
  }

  if (hoverIntent.type !== 'reorder-root') {
    return null;
  }

  if (projectsActiveItemToOwnSlot({
    items,
    activeSortId,
    targetIndex: hoverIntent.targetIndex,
    frozenSortIds,
  })) {
    return {
      left: activeSnapshot.rect.left - rootRect.left + activeItem.layout.previewOffsetX,
      top: activeSnapshot.rect.top - rootRect.top + activeItem.layout.previewOffsetY,
      width: activeItem.layout.previewWidth,
      height: activeItem.layout.previewHeight,
      borderRadius: activeItem.layout.previewBorderRadius,
    };
  }

  if (usesSpanAwareReorder && gridColumnWidth) {
    const projectedItems = buildProjectedGridItemsForRootReorder({
      items,
      activeSortId,
      targetIndex: hoverIntent.targetIndex,
      frozenSortIds,
    });
    if (!projectedItems) return null;

    const projectedLayout = packGridItems({
      items: projectedItems,
      gridColumns,
      getSpan: (item) => ({
        columnSpan: item.layout.columnSpan,
        rowSpan: item.layout.rowSpan,
      }),
    });
    const placedActiveItem = projectedLayout.placedItems.find((item) => item.sortId === activeSortId);
    if (!placedActiveItem) return null;

    return buildProjectedRootItemPreviewRect({
      placedItem: placedActiveItem,
      gridColumnWidth,
      columnGap,
      rowHeight,
      rowGap,
      layout: activeItem.layout,
    });
  }

  const originalOrder = items.map((item) => item.sortId);
  const slotSortId = originalOrder[hoverIntent.targetIndex];
  const slotSnapshot = slotSortId ? snapshotById.get(slotSortId) : null;
  const resolvedSnapshot = slotSnapshot ?? activeSnapshot;
  if (!resolvedSnapshot) return null;

  return {
    left: resolvedSnapshot.rect.left - rootRect.left + activeItem.layout.previewOffsetX,
    top: resolvedSnapshot.rect.top - rootRect.top + activeItem.layout.previewOffsetY,
    width: activeItem.layout.previewWidth,
    height: activeItem.layout.previewHeight,
    borderRadius: activeItem.layout.previewBorderRadius,
  };
}

function buildProjectedDragSettleTarget(params: {
  items: RootShortcutGridItem[];
  layoutSnapshot: MeasuredGridItem[] | null;
  activeSortId: string | null;
  hoverIntent: RootShortcutDropIntent | null;
  rootElement: HTMLDivElement | null;
  usesSpanAwareReorder: boolean;
  frozenSortIds: ReadonlySet<string> | null;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
}): { left: number; top: number } | null {
  const {
    items,
    layoutSnapshot,
    activeSortId,
    hoverIntent,
    rootElement,
    usesSpanAwareReorder,
    frozenSortIds,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
  } = params;

  if (!layoutSnapshot || !activeSortId) {
    return null;
  }

  const activeItem = items.find((item) => item.sortId === activeSortId);
  const activeSnapshot = layoutSnapshot.find((item) => item.sortId === activeSortId)?.rect ?? null;
  if (!activeItem || !activeSnapshot) return null;

  if (!hoverIntent) {
    return {
      left: activeSnapshot.left,
      top: activeSnapshot.top,
    };
  }

  if (hoverIntent.type !== 'reorder-root') {
    return null;
  }

  if (projectsActiveItemToOwnSlot({
    items,
    activeSortId,
    targetIndex: hoverIntent.targetIndex,
    frozenSortIds,
  })) {
    return {
      left: activeSnapshot.left,
      top: activeSnapshot.top,
    };
  }

  if (usesSpanAwareReorder && gridColumnWidth && rootElement) {
    const projectedItems = buildProjectedGridItemsForRootReorder({
      items,
      activeSortId,
      targetIndex: hoverIntent.targetIndex,
      frozenSortIds,
    });
    if (!projectedItems) return null;

    const projectedLayout = packGridItems({
      items: projectedItems,
      gridColumns,
      getSpan: (item) => ({
        columnSpan: item.layout.columnSpan,
        rowSpan: item.layout.rowSpan,
      }),
    });
    const placedActiveItem = projectedLayout.placedItems.find((item) => item.sortId === activeSortId);
    if (!placedActiveItem) return null;

    const projectedRect = getProjectedGridItemRect({
      placedItem: placedActiveItem,
      gridColumnWidth,
      columnGap,
      rowHeight,
      rowGap,
      width: activeItem.layout.width,
      height: activeItem.layout.height,
    });
    const rootRect = rootElement.getBoundingClientRect();
    return {
      left: rootRect.left + projectedRect.left,
      top: rootRect.top + projectedRect.top,
    };
  }

  const snapshotById = new Map(layoutSnapshot.map((item) => [item.sortId, item.rect]));
  const orderedRects = items
    .map((item) => snapshotById.get(item.sortId) ?? null)
    .filter((rect): rect is DOMRect => Boolean(rect));
  if (orderedRects.length === 0) return null;

  const targetRect = orderedRects[Math.max(0, Math.min(hoverIntent.targetIndex, orderedRects.length - 1))];
  return {
    left: targetRect.left,
    top: targetRect.top,
  };
}

export const RootShortcutGrid = React.memo(function RootShortcutGrid({
  containerHeight,
  bottomInset = 0,
  shortcuts,
  gridColumns,
  minRows,
  rowHeight,
  rowGap = 20,
  columnGap = 12,
  overlayZIndex = DRAG_OVERLAY_Z_INDEX,
  resolveItemLayout,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutReorder,
  onShortcutDropIntent,
  onGridContextMenu,
  onDragStart,
  onDragEnd,
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
  renderDropPreview = renderDefaultDropPreview,
}: RootShortcutGridProps) {
  const items = useMemo(() => buildRootShortcutGridItems({
    shortcuts,
    resolveItemLayout,
  }), [shortcuts, resolveItemLayout]);

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
    minLayoutShiftDistancePx: LAYOUT_SHIFT_MIN_DISTANCE_PX,
    settleDurationMs: DRAG_RELEASE_SETTLE_DURATION_MS,
  });

  const hoverIntent = hoverResolution.interactionIntent;
  const visualProjectionIntent = hoverResolution.visualProjectionIntent;

  const commitDragLayoutSnapshot = useCallback((nextSnapshot: MeasuredGridItem[] | null) => {
    dragLayoutSnapshotRef.current = nextSnapshot;
    setDragLayoutSnapshot(nextSnapshot);
  }, []);

  const updateDragScrollOffset = useCallback(() => {
    const container = autoScrollContainerRef.current;
    const nextOffset = container ? container.scrollTop - dragScrollOriginTopRef.current : 0;
    setDragScrollOffsetY((current) => (Math.abs(current - nextOffset) < 0.01 ? current : nextOffset));
  }, []);

  const packedLayout = useMemo(() => packGridItems({
    items,
    gridColumns,
    getSpan: (item) => ({
      columnSpan: item.layout.columnSpan,
      rowSpan: item.layout.rowSpan,
    }),
  }), [items, gridColumns]);
  const placedGridItemsBySortId = useMemo(
    () => new Map(packedLayout.placedItems.map((item) => [item.sortId, item])),
    [packedLayout.placedItems],
  );
  const displayRows = Math.max(packedLayout.rowCount, minRows);
  const gridMinHeight = displayRows * rowHeight + Math.max(0, displayRows - 1) * rowGap;
  const usesSpanAwareReorder = packedLayout.placedItems.some(
    (item) => item.columnSpan > 1 || item.rowSpan > 1,
  );
  const gridColumnWidth = useMemo(() => {
    if (!gridWidthPx || gridColumns <= 0) return null;
    return (gridWidthPx - columnGap * Math.max(0, gridColumns - 1)) / Math.max(gridColumns, 1);
  }, [columnGap, gridColumns, gridWidthPx]);
  const usesSparseRootSlotReorder = gridColumns < 8;
  const shouldUseProjectedRootReorderSlots = Boolean(gridColumnWidth) && (
    usesSpanAwareReorder || usesSparseRootSlotReorder
  );
  const activeDragItem = useMemo(
    () => items.find((item) => item.sortId === activeDragId) ?? null,
    [items, activeDragId],
  );
  const frozenSpanItemSortIds = useMemo(() => {
    if (
      !usesSpanAwareReorder
      || !activeDragItem
      || activeDragItem.layout.columnSpan > 1
      || activeDragItem.layout.rowSpan > 1
    ) {
      return null;
    }

    const frozenIds = new Set(
      items
        .filter((item) => item.sortId !== activeDragItem.sortId && (item.layout.columnSpan > 1 || item.layout.rowSpan > 1))
        .map((item) => item.sortId),
    );

    return frozenIds.size > 0 ? frozenIds : null;
  }, [activeDragItem, items, usesSpanAwareReorder]);

  const reorderSlotCandidates = useMemo<RootReorderSlotCandidate[]>(() => {
    if (!shouldUseProjectedRootReorderSlots || !activeDragId || !gridColumnWidth) return [];
    return buildRootReorderSlotCandidates({
      items,
      activeSortId: activeDragId,
      gridColumns,
      gridColumnWidth,
      columnGap,
      rowHeight,
      rowGap,
      frozenSortIds: frozenSpanItemSortIds,
      rectMode: 'preview',
      hitRectMode: usesSpanAwareReorder ? 'span-aware' : 'preview',
    });
  }, [
    activeDragId,
    frozenSpanItemSortIds,
    columnGap,
    gridColumnWidth,
    gridColumns,
    items,
    rowGap,
    rowHeight,
    shouldUseProjectedRootReorderSlots,
    usesSparseRootSlotReorder,
    usesSpanAwareReorder,
  ]);
  const extractedReorderSlotCandidates = useMemo<RootReorderSlotCandidate[]>(() => {
    if (!activeSourceRootShortcutId || !activeDragId || !gridColumnWidth) return [];

    return buildRootReorderSlotCandidates({
      items,
      activeSortId: activeDragId,
      gridColumns,
      gridColumnWidth,
      columnGap,
      rowHeight,
      rowGap,
      frozenSortIds: frozenSpanItemSortIds,
      rectMode: 'item',
      hitRectMode: 'item',
    });
  }, [
    activeDragId,
    activeSourceRootShortcutId,
    columnGap,
    frozenSpanItemSortIds,
    gridColumnWidth,
    gridColumns,
    items,
    rowGap,
    rowHeight,
  ]);

  useLayoutEffect(() => {
    const rootNode = rootRef.current;
    if (!rootNode || typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return;

    const updateGridWidth = () => {
      const nextWidth = Math.round(rootNode.clientWidth);
      setGridWidthPx((current) => (current === nextWidth ? current : nextWidth));
    };

    updateGridWidth();
    const resizeObserver = new ResizeObserver(() => {
      updateGridWidth();
    });
    resizeObserver.observe(rootNode);
    window.addEventListener('resize', updateGridWidth, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateGridWidth);
    };
  }, []);

  const hoverState = useMemo(() => deriveHoverStateFromIntent(hoverIntent), [hoverIntent]);
  const projectionLayoutSnapshot = useMemo(
    () => offsetMeasuredGridItemsByScrollY(dragLayoutSnapshot, dragScrollOffsetY),
    [dragLayoutSnapshot, dragScrollOffsetY],
  );

  const computeProjectionOffsetsForIntent = useCallback((projectionIntent: RootShortcutDropIntent | null) => {
    if (
      usesSpanAwareReorder
      && projectionLayoutSnapshot
      && activeDragId
      && projectionIntent?.type === 'reorder-root'
      && gridColumnWidth
      && rootRef.current
    ) {
      const projectedItems = buildProjectedGridItemsForRootReorder({
        items,
        activeSortId: activeDragId,
        targetIndex: projectionIntent.targetIndex,
        frozenSortIds: frozenSpanItemSortIds,
      });
      if (projectedItems) {
        const projectedLayout = packGridItems({
          items: projectedItems,
          gridColumns,
          getSpan: (item) => ({
            columnSpan: item.layout.columnSpan,
            rowSpan: item.layout.rowSpan,
          }),
        });
        const rootRect = rootRef.current.getBoundingClientRect();
        const currentRects = new Map(projectionLayoutSnapshot.map((item) => [item.sortId, item.rect]));
        const offsets = new Map<string, ProjectionOffset>();

        projectedLayout.placedItems.forEach((item) => {
          if (item.sortId === activeDragId) return;
          const currentRect = currentRects.get(item.sortId);
          if (!currentRect) return;

          const projectedRect = getProjectedGridItemRect({
            placedItem: item,
            gridColumnWidth,
            columnGap,
            rowHeight,
            rowGap,
            width: item.layout.width,
            height: item.layout.height,
          });
          const dx = rootRect.left + projectedRect.left - currentRect.left;
          const dy = rootRect.top + projectedRect.top - currentRect.top;
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

          offsets.set(item.sortId, { x: dx, y: dy });
        });

        return offsets;
      }
    }

    return buildReorderProjectionOffsets({
      items,
      layoutSnapshot: projectionLayoutSnapshot,
      activeSortId: activeDragId,
      hoverIntent: projectionIntent,
    });
  }, [
    activeDragId,
    columnGap,
    projectionLayoutSnapshot,
    frozenSpanItemSortIds,
    gridColumnWidth,
    gridColumns,
    items,
    rowGap,
    rowHeight,
    usesSpanAwareReorder,
  ]);

  const projectionOffsets = useMemo(
    () => computeProjectionOffsetsForIntent(visualProjectionIntent),
    [computeProjectionOffsetsForIntent, visualProjectionIntent],
  );
  const hiddenSortId = activeDragId ?? dragSettlePreview?.itemId ?? null;
  const projectedDropPreview = useMemo(() => buildProjectedDropPreview({
    items,
    layoutSnapshot: projectionLayoutSnapshot,
    activeSortId: activeDragId,
    hoverIntent: visualProjectionIntent,
    rootElement: rootRef.current,
    usesSpanAwareReorder,
    frozenSortIds: frozenSpanItemSortIds,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
  }), [
    activeDragId,
    columnGap,
    projectionLayoutSnapshot,
    frozenSpanItemSortIds,
    gridColumnWidth,
    gridColumns,
    items,
    rowGap,
    rowHeight,
    usesSpanAwareReorder,
    visualProjectionIntent,
  ]);
  const effectiveProjectedDropPreview = useMemo(() => {
    if (!projectedDropPreview) return null;

    return {
      ...projectedDropPreview,
      opacity: hoverIntent?.type === 'move-root-shortcut-into-folder' ? 0.01 : projectedDropPreview.opacity,
    };
  }, [hoverIntent, projectedDropPreview]);

  useEffect(() => {
    activeDragIdRef.current = activeDragId;
  }, [activeDragId]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const skipLayoutShiftForAnimationToggle = shouldSkipLayoutShiftOnAnimationReenable({
      previousAnimationDisabled: disableReorderAnimationRef.current,
      animationDisabled: disableReorderAnimation,
    });

    commitMeasuredItemRects({
      currentRects: measureDragItemRects(itemElementsRef.current),
      skip: (
        (dragging && !hasPendingLayoutShiftSourceRects())
        || suppressProjectionSettleAnimation
        || skipLayoutShiftForAnimationToggle
      ),
    });
    disableReorderAnimationRef.current = disableReorderAnimation;
  }, [
    commitMeasuredItemRects,
    disableReorderAnimation,
    dragging,
    hasPendingLayoutShiftSourceRects,
    items,
    packedLayout.placedItems,
    suppressProjectionSettleAnimation,
  ]);

  const stopAutoScroll = useCallback(() => {
    autoScrollVelocityRef.current = 0;
    if (autoScrollRafRef.current !== null) {
      window.cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  const armProjectionSettleSuppression = useCallback(() => {
    if (projectionSettleResumeRafRef.current !== null) {
      window.cancelAnimationFrame(projectionSettleResumeRafRef.current);
      projectionSettleResumeRafRef.current = null;
    }

    setSuppressProjectionSettleAnimation(true);
    const firstFrame = window.requestAnimationFrame(() => {
      projectionSettleResumeRafRef.current = window.requestAnimationFrame(() => {
        projectionSettleResumeRafRef.current = null;
        setSuppressProjectionSettleAnimation(false);
      });
    });
    projectionSettleResumeRafRef.current = firstFrame;
  }, []);

  const refreshAutoScrollBounds = useCallback(() => {
    const container = autoScrollContainerRef.current;
    if (!container) {
      autoScrollBoundsRef.current = null;
      return;
    }
    const rect = container.getBoundingClientRect();
    autoScrollBoundsRef.current = { top: rect.top, bottom: rect.bottom };
  }, []);

  const resolveHoverResolutionFromPointer = useCallback((
    pointer: PointerPoint,
    measuredItemsOverride?: MeasuredGridItem[],
  ): HoverResolution => {
    const nextActiveDragId = activeDragIdRef.current;
    const rootElement = rootRef.current;
    const session = dragSessionRef.current;
    if (!nextActiveDragId || !rootElement || !session) return EMPTY_HOVER_RESOLUTION;
    const currentHoverResolution = hoverResolutionRef.current;
    const currentInteractionProjectionOffsets = computeProjectionOffsetsForIntent(currentHoverResolution.interactionIntent);
    const currentVisualProjectionOffsets = computeProjectionOffsetsForIntent(currentHoverResolution.visualProjectionIntent);

    const measuredItems = measuredItemsOverride ?? measureGridItems(items, itemElementsRef.current);
    const activeItem = measuredItems.find((item) => item.sortId === nextActiveDragId);
    if (!activeItem) return EMPTY_HOVER_RESOLUTION;
    const extractedSourceRootShortcutId = session.sourceRootShortcutId ?? activeSourceRootShortcutId;
    const activeExtractedSlotCandidates = extractedSourceRootShortcutId && gridColumnWidth
      ? (
          extractedReorderSlotCandidates.length > 0
            ? extractedReorderSlotCandidates
            : buildRootReorderSlotCandidates({
                items,
                activeSortId: nextActiveDragId,
                gridColumns,
                gridColumnWidth,
                columnGap,
                rowHeight,
                rowGap,
                frozenSortIds: frozenSpanItemSortIds,
                rectMode: 'item',
                hitRectMode: 'item',
              })
        )
      : [];

    const recognitionPoint = getDragVisualCenter({
	      pointer,
	      previewOffset: session.previewOffset,
	      activeRect: activeItem.rect,
      visualRect: {
        offsetX: activeItem.layout.previewOffsetX,
        offsetY: activeItem.layout.previewOffsetY,
        width: activeItem.layout.previewWidth,
        height: activeItem.layout.previewHeight,
	      },
	    });
	    const activeVisualRect = buildVisualRect({
	      pointer,
	      previewOffset: session.previewOffset,
	      width: activeItem.layout.previewWidth,
	      height: activeItem.layout.previewHeight,
	      offsetX: activeItem.layout.previewOffsetX,
	      offsetY: activeItem.layout.previewOffsetY,
	    });
    const activeItemRect = {
      left: pointer.x - session.previewOffset.x,
      top: pointer.y - session.previewOffset.y,
      width: activeItem.layout.width,
      height: activeItem.layout.height,
    };

    const rootRect = rootElement.getBoundingClientRect();
    const activeSlotCandidates = extractedSourceRootShortcutId
      ? activeExtractedSlotCandidates
      : reorderSlotCandidates;
    const hoverBounds = activeSlotCandidates.length > 0
      ? {
          left: Math.min(
            rootRect.left,
            ...activeSlotCandidates.map((candidate) => rootRect.left + candidate.left),
          ),
          top: Math.min(
            rootRect.top,
            ...activeSlotCandidates.map((candidate) => rootRect.top + candidate.top),
          ),
          right: Math.max(
            rootRect.right,
            ...activeSlotCandidates.map((candidate) => rootRect.left + candidate.left + candidate.width),
          ),
          bottom: Math.max(
            rootRect.bottom,
            ...activeSlotCandidates.map((candidate) => rootRect.top + candidate.top + candidate.height),
          ),
        }
      : rootRect;
    if (
      recognitionPoint.x < hoverBounds.left
      || recognitionPoint.x > hoverBounds.right
      || recognitionPoint.y < hoverBounds.top
      || recognitionPoint.y > hoverBounds.bottom
    ) {
      return EMPTY_HOVER_RESOLUTION;
    }

    const {
      interactionIntent: previousReorderIntent,
      visualProjectionIntent: previousVisualReorderIntent,
    } = extractPreviousRootReorderIntents(currentHoverResolution);
    const shouldUseSlotIntent = shouldUseProjectedRootReorderSlots && !(
      resolveCompactTargetRegions
      && frozenSpanItemSortIds
      && frozenSpanItemSortIds.size > 0
    );

    const slotIntent = shouldUseSlotIntent
      ? (() => {
          if (!gridColumnWidth) return null;
          const slotProbePoint = resolveSpanAwareSlotProbePoint({
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
              layout: activeItem.layout,
            }),
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
    const resolutionMode = resolveRootDragResolutionMode({
      sourceRootShortcutId: extractedSourceRootShortcutId,
      activeShortcut: activeItem.shortcut,
    });
    const extractedSlotIntent = extractedSourceRootShortcutId
      ? (() => {
          return resolveRootReorderSlotIntent({
            activeShortcutId: activeItem.shortcut.id,
            point: {
              x: activeItemRect.left - rootRect.left + activeItemRect.width / 2,
              y: activeItemRect.top - rootRect.top + activeItemRect.height / 2,
            },
            candidates: activeExtractedSlotCandidates,
            previousIntent: previousReorderIntent ?? previousVisualReorderIntent,
            mode: 'closest-center',
          });
        })()
      : null;

    if (resolutionMode === 'large-folder-reorder-only') {
      return buildReorderOnlyHoverResolution({
        nextIntent: slotIntent,
        previousInteractionIntent: previousReorderIntent,
        previousVisualProjectionIntent: previousVisualReorderIntent,
      });
    }

    if (resolutionMode === 'extracted-reorder-only') {
      return buildReorderOnlyHoverResolution({
        nextIntent: extractedSlotIntent,
        previousInteractionIntent: previousReorderIntent,
        previousVisualProjectionIntent: previousVisualReorderIntent,
      });
    }

    if (resolveCompactTargetRegions) {
      return resolveCompactRootHoverResolution({
        activeSortId: nextActiveDragId,
        recognitionPoint,
        previousRecognitionPoint: recognitionPointRef.current,
        activeVisualRect,
        measuredItems,
        items,
        previousInteractionIntent: currentHoverResolution.interactionIntent,
        previousVisualProjectionIntent: currentHoverResolution.visualProjectionIntent,
        interactionProjectionOffsets: currentInteractionProjectionOffsets,
        visualProjectionOffsets: currentVisualProjectionOffsets,
        resolveRegions: buildResolveMeasuredItemCompactRegions({
          resolveCompactTargetRegions,
          placementsBySortId: placedGridItemsBySortId,
        }),
        slotIntent,
        preferSlotIntentForReorder: usesSparseRootSlotReorder,
        columnGap,
        rowGap,
      });
    }

    const overCandidate = pickOverItemCandidate({
      activeSortId: nextActiveDragId,
      measuredItems,
      pointer: recognitionPoint,
    });
    if (!overCandidate) {
      return {
        interactionIntent: slotIntent,
        visualProjectionIntent: slotIntent,
      };
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
      activeSortId: nextActiveDragId,
      overSortId: overCandidate.overItem.sortId,
      pointer: recognitionPoint,
      overRect: resolvedDropTargetRects.overRect,
      overCenterRect: resolvedDropTargetRects.overCenterRect,
      items,
    });
    if (!rawIntent) {
      return {
        interactionIntent: slotIntent,
        visualProjectionIntent: slotIntent,
      };
    }

    if (rawIntent.type === 'reorder-root') {
      const interactionIntent = slotIntent ?? rawIntent;
      return {
        interactionIntent,
        visualProjectionIntent: interactionIntent,
      };
    }

    return {
      interactionIntent: rawIntent,
      visualProjectionIntent: rawIntent,
    };
  }, [
    activeSourceRootShortcutId,
    columnGap,
    computeProjectionOffsetsForIntent,
    dragLayoutSnapshot,
    extractedReorderSlotCandidates,
    gridColumnWidth,
    items,
    placedGridItemsBySortId,
    reorderSlotCandidates,
    resolveCompactTargetRegions,
    resolveDropTargetRects,
    rowGap,
    rowHeight,
    shouldUseProjectedRootReorderSlots,
    usesSparseRootSlotReorder,
    usesSpanAwareReorder,
  ]);

  const syncHoverResolution = useCallback((
    pointer: PointerPoint,
    measuredItemsOverride?: MeasuredGridItem[],
  ) => {
    latestPointerRef.current = pointer;
    const measuredItems = measuredItemsOverride ?? measureGridItems(items, itemElementsRef.current);
    const nextResolution = resolveHoverResolutionFromPointer(pointer, measuredItems);
    const nextActiveDragId = activeDragIdRef.current;
    const session = dragSessionRef.current;
    const activeItem = nextActiveDragId
      ? measuredItems.find((item) => item.sortId === nextActiveDragId) ?? null
      : null;
    recognitionPointRef.current = (
      activeItem
      && session
        ? getDragVisualCenter({
            pointer,
            previewOffset: session.previewOffset,
            activeRect: activeItem.rect,
            visualRect: {
              offsetX: activeItem.layout.previewOffsetX,
              offsetY: activeItem.layout.previewOffsetY,
              width: activeItem.layout.previewWidth,
              height: activeItem.layout.previewHeight,
            },
          })
        : null
    );
    hoverResolutionRef.current = nextResolution;
    setHoverResolution(nextResolution);
  }, [resolveHoverResolutionFromPointer]);

  useEffect(() => {
    if (!externalDragSession) return;
    if (dragSessionRef.current || pendingDragRef.current) return;
    if (consumedExternalDragTokenRef.current === externalDragSession.token) return;

    const activeItem = items.find((item) => item.shortcut.id === externalDragSession.shortcutId);
    if (!activeItem) return;

    const measuredItems = measureGridItems(items, itemElementsRef.current);
    const measuredActiveItem = measuredItems.find((item) => item.sortId === activeItem.sortId);
    if (!measuredActiveItem) return;

    const previewOffset = buildPreviewOffsetFromAnchor({
      rect: measuredActiveItem.rect,
      anchor: externalDragSession.anchor,
    });

    const nextSession: DragSessionState = {
      pointerId: externalDragSession.pointerId,
      pointerType: externalDragSession.pointerType,
      activeId: activeItem.sortId,
      activeSortId: activeItem.sortId,
      sourceRootShortcutId: externalDragSession.sourceRootShortcutId,
      pointer: externalDragSession.pointer,
      previewOffset,
    };
    dragSessionRef.current = nextSession;
    latestPointerRef.current = externalDragSession.pointer;
    recognitionPointRef.current = null;
    autoScrollContainerRef.current = findScrollableParent(rootRef.current);
    dragScrollOriginTopRef.current = autoScrollContainerRef.current?.scrollTop ?? 0;
    refreshAutoScrollBounds();
    setDragScrollOffsetY(0);
    autoScrollVelocityRef.current = 0;
    document.body.style.userSelect = 'none';
    consumedExternalDragTokenRef.current = externalDragSession.token;

    clearDragSettlePreview();
    commitDragLayoutSnapshot(measuredItems);
    setDragging(true);
    setActiveSourceRootShortcutId(externalDragSession.sourceRootShortcutId ?? null);
    setActiveDragId(activeItem.sortId);
    setDragPreviewOffset(previewOffset);
    setDragPointer(externalDragSession.pointer);
    syncHoverResolution(externalDragSession.pointer);
    onExternalDragSessionConsumed?.(externalDragSession.token);
  }, [
    clearDragSettlePreview,
    commitDragLayoutSnapshot,
    externalDragSession,
    items,
    onExternalDragSessionConsumed,
    refreshAutoScrollBounds,
    syncHoverResolution,
  ]);

  const startAutoScrollLoop = useCallback(() => {
    if (autoScrollRafRef.current !== null) return;

    const tick = () => {
      const container = autoScrollContainerRef.current;
      const velocity = autoScrollVelocityRef.current;
      if (!container || Math.abs(velocity) < 0.01) {
        autoScrollRafRef.current = null;
        return;
      }

      const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
      const previousScrollTop = container.scrollTop;
      const nextScrollTop = Math.max(0, Math.min(maxScrollTop, previousScrollTop + velocity));
      container.scrollTop = nextScrollTop;
      updateDragScrollOffset();

      const pointer = latestPointerRef.current;
      if (pointer) {
        if (Math.abs(nextScrollTop - previousScrollTop) >= 0.25) {
          syncHoverResolution(pointer, measureGridItems(items, itemElementsRef.current));
        } else {
          syncHoverResolution(pointer);
        }
      }

      autoScrollRafRef.current = window.requestAnimationFrame(tick);
    };

    autoScrollRafRef.current = window.requestAnimationFrame(tick);
  }, [items, syncHoverResolution, updateDragScrollOffset]);

  const updateAutoScrollVelocity = useCallback((clientY: number) => {
    const container = autoScrollContainerRef.current;
    const bounds = autoScrollBoundsRef.current;
    if (!container || !bounds) return;

    let velocity = 0;
    if (clientY < bounds.top + DRAG_AUTO_SCROLL_EDGE_PX) {
      const ratio = Math.min(1, (bounds.top + DRAG_AUTO_SCROLL_EDGE_PX - clientY) / DRAG_AUTO_SCROLL_EDGE_PX);
      velocity = -(DRAG_AUTO_SCROLL_MAX_SPEED_PX * ratio * ratio);
    } else if (clientY > bounds.bottom - DRAG_AUTO_SCROLL_EDGE_PX) {
      const ratio = Math.min(1, (clientY - (bounds.bottom - DRAG_AUTO_SCROLL_EDGE_PX)) / DRAG_AUTO_SCROLL_EDGE_PX);
      velocity = DRAG_AUTO_SCROLL_MAX_SPEED_PX * ratio * ratio;
    }

    autoScrollVelocityRef.current = velocity;
    if (Math.abs(velocity) > 0.01) {
      startAutoScrollLoop();
    } else {
      stopAutoScroll();
    }
  }, [startAutoScrollLoop, stopAutoScroll]);

  const clearDragRuntimeState = useCallback(() => {
    pendingDragRef.current = null;
    dragSessionRef.current = null;
    latestPointerRef.current = null;
    recognitionPointRef.current = null;
    hoverResolutionRef.current = EMPTY_HOVER_RESOLUTION;
    setDragging(false);
    setActiveSourceRootShortcutId(null);
    setActiveDragId(null);
    setDragPointer(null);
    setDragPreviewOffset(null);
    setHoverResolution(EMPTY_HOVER_RESOLUTION);
    commitDragLayoutSnapshot(null);
    setDragScrollOffsetY(0);
    dragScrollOriginTopRef.current = 0;
    stopAutoScroll();
    autoScrollContainerRef.current = null;
    autoScrollBoundsRef.current = null;
    document.body.style.userSelect = '';
  }, [commitDragLayoutSnapshot, stopAutoScroll]);

  const scheduleDragCleanup = useCallback(() => {
    if (dropCleanupRafRef.current !== null) {
      window.cancelAnimationFrame(dropCleanupRafRef.current);
    }
    dropCleanupRafRef.current = window.requestAnimationFrame(() => {
      dropCleanupRafRef.current = null;
      clearDragRuntimeState();
    });
  }, [clearDragRuntimeState]);

  useEffect(() => {
    if (dragging) {
      ignoreClickRef.current = true;
      onDragStart?.();
    } else {
      window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, 120);
      onDragEnd?.();
    }
  }, [dragging, onDragEnd, onDragStart]);

  useEffect(() => () => {
    if (dropCleanupRafRef.current !== null) {
      window.cancelAnimationFrame(dropCleanupRafRef.current);
      dropCleanupRafRef.current = null;
    }
    if (projectionSettleResumeRafRef.current !== null) {
      window.cancelAnimationFrame(projectionSettleResumeRafRef.current);
      projectionSettleResumeRafRef.current = null;
    }
    clearDragRuntimeState();
    clearDragSettlePreview();
  }, [clearDragRuntimeState, clearDragSettlePreview]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      const session = dragSessionRef.current;

      if (pending && event.pointerId === pending.pointerId) {
        const nextPointer = { x: event.clientX, y: event.clientY };
        pending.current = nextPointer;

        if (!hasPointerDragActivated({
          origin: pending.origin,
          pointer: nextPointer,
        })) {
          return;
        }

        const nextSession: DragSessionState = {
          pointerId: pending.pointerId,
          pointerType: pending.pointerType,
          activeId: pending.activeSortId,
          activeSortId: pending.activeSortId,
          pointer: nextPointer,
          previewOffset: pending.previewOffset,
        };
        dragSessionRef.current = nextSession;
        pendingDragRef.current = null;

        if (dropCleanupRafRef.current !== null) {
          window.cancelAnimationFrame(dropCleanupRafRef.current);
          dropCleanupRafRef.current = null;
        }

        autoScrollContainerRef.current = findScrollableParent(rootRef.current);
        dragScrollOriginTopRef.current = autoScrollContainerRef.current?.scrollTop ?? 0;
        refreshAutoScrollBounds();
        setDragScrollOffsetY(0);
        autoScrollVelocityRef.current = 0;
        document.body.style.userSelect = 'none';
        clearDragSettlePreview();
        commitDragLayoutSnapshot(measureGridItems(items, itemElementsRef.current));

        setDragging(true);
        setActiveSourceRootShortcutId(null);
        setActiveDragId(nextSession.activeSortId);
        setDragPreviewOffset(nextSession.previewOffset);
        setDragPointer(nextPointer);
        syncHoverResolution(nextPointer);
        event.preventDefault();
        return;
      }

      if (!session || event.pointerId !== session.pointerId) return;

      const nextPointer = { x: event.clientX, y: event.clientY };
      session.pointer = nextPointer;
      setDragPointer(nextPointer);
      updateAutoScrollVelocity(nextPointer.y);
      syncHoverResolution(nextPointer);
      event.preventDefault();
    };

    const finishPointerInteraction = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      const session = dragSessionRef.current;

      if (pending && event.pointerId === pending.pointerId) {
        pendingDragRef.current = null;
        return;
      }
      if (!session || event.pointerId !== session.pointerId) return;

      const finalResolution = (() => {
        if (event.type === 'pointercancel') {
          return hoverResolutionRef.current;
        }

        const releasePointer = { x: event.clientX, y: event.clientY };
        session.pointer = releasePointer;
        latestPointerRef.current = releasePointer;
        const resolutionAtRelease = resolveHoverResolutionFromPointer(releasePointer);
        hoverResolutionRef.current = resolutionAtRelease;
        return resolutionAtRelease;
      })();

      const finalIntent = resolveFinalHoverIntent(finalResolution);
      const dragReleasePreview = (() => {
        const activeItem = items.find((item) => item.sortId === session.activeSortId);
        const target = buildProjectedDragSettleTarget({
          items,
          layoutSnapshot: offsetMeasuredGridItemsByScrollY(
            dragLayoutSnapshotRef.current,
            dragScrollOffsetY,
          ),
          activeSortId: session.activeSortId,
          hoverIntent: finalIntent,
          rootElement: rootRef.current,
          usesSpanAwareReorder,
          frozenSortIds: frozenSpanItemSortIds,
          gridColumns,
          gridColumnWidth,
          columnGap,
          rowHeight,
          rowGap,
        });
        if (!activeItem || !target) return null;

        return {
          itemId: session.activeSortId,
          item: activeItem.shortcut,
          fromLeft: session.pointer.x - session.previewOffset.x,
          fromTop: session.pointer.y - session.previewOffset.y,
          toLeft: target.left,
          toTop: target.top,
        };
      })();

      if (!finalIntent) {
        if (dragReleasePreview) {
          startDragSettlePreview(dragReleasePreview);
        }
        clearDragRuntimeState();
        return;
      }

      if (onShortcutDropIntent) {
        if (finalIntent.type === 'reorder-root') {
          armProjectionSettleSuppression();
          flushSync(() => {
            if (dragReleasePreview) {
              startDragSettlePreview(dragReleasePreview);
            }
            onShortcutDropIntent(finalIntent);
            clearDragRuntimeState();
          });
          return;
        }

        captureLayoutShiftSourceRects(measureDragItemRects(itemElementsRef.current));
        flushSync(() => {
          onShortcutDropIntent(finalIntent);
          clearDragRuntimeState();
        });
        return;
      }

      if (finalIntent.type !== 'reorder-root') {
        scheduleDragCleanup();
        return;
      }

      const activeIndex = items.findIndex((item) => item.shortcut.id === finalIntent.activeShortcutId);
      if (activeIndex < 0) {
        clearDragRuntimeState();
        return;
      }

      const next = [...items];
      const [moved] = next.splice(activeIndex, 1);
      next.splice(finalIntent.targetIndex, 0, moved);
      armProjectionSettleSuppression();
      flushSync(() => {
        if (dragReleasePreview) {
          startDragSettlePreview(dragReleasePreview);
        }
        onShortcutReorder(next.map((item) => item.shortcut));
        clearDragRuntimeState();
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', finishPointerInteraction, { passive: true });
    window.addEventListener('pointercancel', finishPointerInteraction, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishPointerInteraction);
      window.removeEventListener('pointercancel', finishPointerInteraction);
    };
  }, [
    armProjectionSettleSuppression,
    captureLayoutShiftSourceRects,
    clearDragRuntimeState,
    clearDragSettlePreview,
    columnGap,
    commitDragLayoutSnapshot,
    dragScrollOffsetY,
    frozenSpanItemSortIds,
    gridColumnWidth,
    gridColumns,
    items,
    onShortcutDropIntent,
    onShortcutReorder,
    refreshAutoScrollBounds,
    rowGap,
    rowHeight,
    scheduleDragCleanup,
    startDragSettlePreview,
    syncHoverResolution,
    updateAutoScrollVelocity,
    usesSpanAwareReorder,
  ]);

  return (
    <div
      ref={rootRef}
      className="relative w-full"
      style={{
        minHeight: Math.max(containerHeight, gridMinHeight),
        paddingBottom: Math.max(0, bottomInset),
      }}
      onContextMenu={onGridContextMenu}
    >
      {dragging && effectiveProjectedDropPreview ? renderDropPreview(effectiveProjectedDropPreview) : null}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${Math.max(gridColumns, 1)}, minmax(0, 1fr))`,
          gridAutoRows: `${rowHeight}px`,
          columnGap: `${columnGap}px`,
          rowGap: `${rowGap}px`,
          touchAction: 'pan-y',
        }}
      >
        {packedLayout.placedItems.map((item) => {
          const dragProjectionOffset = projectionOffsets.get(item.sortId) ?? null;
          const layoutShiftOffset = layoutShiftOffsets.get(item.sortId) ?? null;
          const combinedProjectionOffset = combineProjectionOffsets(
            dragProjectionOffset,
            layoutShiftOffset,
          );
          const isSelected = Boolean(selectedShortcutIndexes?.has(item.shortcutIndex));
          const selectionDisabled = selectionMode && isShortcutFolder(item.shortcut);
          const dragDisabled = selectionMode || Boolean(isItemDragDisabled?.(item.shortcut));
          const isHovered = hoverState?.type === 'item' && hoverState.sortId === item.sortId;
          const centerPreviewActive = isHovered && hoverState.edge === 'center';

          return (
            <div
              key={item.sortId}
              className="relative flex h-full items-start justify-center"
              style={{
                gridColumn: `${item.columnStart} / span ${item.columnSpan}`,
                gridRow: `${item.rowStart} / span ${item.rowSpan}`,
              }}
            >
              <GridDragItemFrame
                isDragging={hiddenSortId === item.sortId}
                hideDragPlaceholder
                centerPreviewActive={centerPreviewActive}
                centerPreview={centerPreviewActive
                  ? renderCenterPreview?.({
                      shortcut: item.shortcut,
                      shortcutIndex: item.shortcutIndex,
                    }) ?? null
                  : null}
                projectionOffset={combinedProjectionOffset}
                disableReorderAnimation={
                  disableReorderAnimation
                  || suppressProjectionSettleAnimation
                  || disableLayoutShiftTransition
                }
                firefox={isFirefox}
                dimmed={selectionMode && !isSelected}
                dragDisabled={dragDisabled}
                registerElement={(element) => {
                  if (element) {
                    itemElementsRef.current.set(item.sortId, element);
                    return;
                  }
                  itemElementsRef.current.delete(item.sortId);
                }}
                onPointerDown={(event) => {
                  if (dragDisabled) return;
                  if (event.button !== 0) return;
                  if (!event.isPrimary) return;

                  const rect = event.currentTarget.getBoundingClientRect();
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
                }}
                placeholder={buildDefaultPlaceholder(item.layout)}
                frameProps={{
                  'data-shortcut-grid-columns': gridColumns,
                  'data-shortcut-drag-item': 'true',
                  'data-shortcut-id': item.shortcut.id,
                  'data-shortcut-title': item.shortcut.title,
                }}
              >
                {renderItem({
                  shortcut: item.shortcut,
                  shortcutIndex: item.shortcutIndex,
                  selected: isSelected,
                  selectionMode,
                  selectionDisabled,
                  centerPreviewActive,
                  onOpen: () => {
                    if (ignoreClickRef.current) return;
                    if (selectionMode) {
                      if (selectionDisabled) return;
                      onToggleShortcutSelection?.(item.shortcutIndex);
                      return;
                    }
                    onShortcutOpen(item.shortcut);
                  },
                  onContextMenu: (event) => {
                    if (!ignoreClickRef.current) {
                      onShortcutContextMenu?.(event, item.shortcutIndex, item.shortcut);
                    }
                  },
                })}
              </GridDragItemFrame>
            </div>
          );
        })}
      </div>
      {typeof document !== 'undefined' && activeDragItem && dragPointer && dragPreviewOffset ? createPortal(
        <div
          className="pointer-events-none fixed left-0 top-0"
          style={{
            zIndex: overlayZIndex,
            transform: `translate(${dragPointer.x - dragPreviewOffset.x}px, ${dragPointer.y - dragPreviewOffset.y}px)`,
          }}
        >
          {renderDragPreview({
            shortcut: activeDragItem.shortcut,
            shortcutIndex: activeDragItem.shortcutIndex,
          })}
        </div>,
        document.body,
      ) : null}
      {typeof document !== 'undefined' && dragSettlePreview ? createPortal(
        <div
          className="pointer-events-none fixed left-0 top-0"
          style={{
            zIndex: overlayZIndex,
            transform: `translate(${dragSettlePreview.settling ? dragSettlePreview.toLeft : dragSettlePreview.fromLeft}px, ${dragSettlePreview.settling ? dragSettlePreview.toTop : dragSettlePreview.fromTop}px)`,
            transition: `transform ${DRAG_RELEASE_SETTLE_DURATION_MS}ms ease-out`,
          }}
        >
          {renderDragPreview({
            shortcut: dragSettlePreview.item,
            shortcutIndex: shortcuts.findIndex((shortcut) => shortcut.id === dragSettlePreview.item.id),
          })}
        </div>,
        document.body,
      ) : null}
    </div>
  );
});
