import {
  buildDragAnchor,
  buildPreviewOffsetFromPointer,
  buildReorderProjectionOffsets as buildSharedReorderProjectionOffsets,
  combineProjectionOffsets,
  getDragVisualCenter,
  getReorderTargetIndex,
  hasPointerDragActivated,
  measureDragItemRects,
  measureDragItems,
  pointInRect,
  type ActivePointerDragState,
  type FolderExtractDragStartPayload,
  type FolderShortcutDropIntent,
  type PendingPointerDragState,
  type PointerPoint,
  type ProjectionOffset,
  type Shortcut,
} from '@leaftab/workspace-core';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  resolveCompactReorderOnlyHoverResolution,
  type CompactReorderHoverIntent,
  type CompactReorderHoverResolution,
  type CompactTargetRegion,
  type CompactTargetRegions,
} from './compactRootHover';
import { GridDragItemFrame } from './GridDragItemFrame';
import { normalizePreviewGeometry, type GridPreviewRect } from './previewGeometry';
import { resolveFinalHoverIntent } from './rootShortcutGridHelpers';
import { useDragMotionState } from './useDragMotionState';

const EXTRACT_HANDOFF_DELAY_MS = 520;
const DRAG_OVERLAY_Z_INDEX = 2147483000;
const LAYOUT_SHIFT_MIN_DISTANCE_PX = 0.5;
const DRAG_RELEASE_SETTLE_DURATION_MS = 220;
const DRAG_AUTO_SCROLL_EDGE_PX = 88;
const DRAG_AUTO_SCROLL_MAX_SPEED_PX = 26;

const EMPTY_FOLDER_HOVER_RESOLUTION: CompactReorderHoverResolution = {
  interactionIntent: null,
  visualProjectionIntent: null,
};

type PendingDragState = PendingPointerDragState<string> & {
  activeShortcutId: string;
  activeShortcutIndex: number;
};

type DragSessionState = ActivePointerDragState<string> & {
  activeShortcutId: string;
  activeShortcutIndex: number;
};

type FolderItemLayout = {
  width: number;
  height: number;
  previewWidth: number;
  previewHeight: number;
  previewOffsetX: number;
  previewOffsetY: number;
  previewBorderRadius?: string;
};

type MeasuredFolderItem = {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
  layout: FolderItemLayout;
  rect: DOMRect;
};

type FolderProjectedDropPreview = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
};

export type FolderShortcutSurfaceItemLayout = {
  width: number;
  height: number;
  previewWidth?: number;
  previewHeight?: number;
  previewOffsetX?: number;
  previewOffsetY?: number;
  previewBorderRadius?: string;
  previewRect?: GridPreviewRect;
};

export type FolderShortcutSurfaceRenderItemParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
  isDragging: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export type FolderShortcutSurfaceRenderDragPreviewParams = {
  shortcut: Shortcut;
  shortcutIndex: number;
};

export type FolderShortcutSurfaceRenderDropPreviewParams = FolderProjectedDropPreview;

export interface FolderShortcutSurfaceProps {
  folderId: string;
  shortcuts: Shortcut[];
  emptyText?: string;
  renderEmptyState?: () => React.ReactNode;
  columns?: number;
  columnGap?: number;
  rowGap?: number;
  overlayZIndex?: number;
  maskBoundaryRef: React.RefObject<HTMLElement | null>;
  resolveItemLayout: (shortcut: Shortcut) => FolderShortcutSurfaceItemLayout;
  renderItem: (params: FolderShortcutSurfaceRenderItemParams) => React.ReactNode;
  renderDragPreview: (params: FolderShortcutSurfaceRenderDragPreviewParams) => React.ReactNode;
  renderDropPreview?: (params: FolderShortcutSurfaceRenderDropPreviewParams) => React.ReactNode;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu?: (event: React.MouseEvent<HTMLDivElement>, shortcut: Shortcut) => void;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  onDragActiveChange?: (active: boolean) => void;
  isFirefox?: boolean;
}

function detectFirefox() {
  return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
}

function normalizeItemLayout(layout: FolderShortcutSurfaceItemLayout): FolderItemLayout {
  const width = Math.max(1, layout.width);
  const height = Math.max(1, layout.height);
  const previewGeometry = normalizePreviewGeometry({
    width,
    height,
    previewWidth: layout.previewWidth,
    previewHeight: layout.previewHeight,
    previewOffsetX: layout.previewOffsetX,
    previewOffsetY: layout.previewOffsetY,
    previewBorderRadius: layout.previewBorderRadius,
    previewRect: layout.previewRect,
  });
  return {
    width,
    height,
    previewWidth: previewGeometry.previewWidth,
    previewHeight: previewGeometry.previewHeight,
    previewOffsetX: previewGeometry.previewOffsetX,
    previewOffsetY: previewGeometry.previewOffsetY,
    previewBorderRadius: previewGeometry.previewBorderRadius,
  };
}

function buildDefaultPlaceholder(layout: FolderItemLayout) {
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

function renderDefaultDropPreview(params: FolderShortcutSurfaceRenderDropPreviewParams) {
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
      }}
    />
  );
}

function buildMeasuredItems(
  shortcuts: Shortcut[],
  resolveItemLayout: (shortcut: Shortcut) => FolderShortcutSurfaceItemLayout,
) {
  return shortcuts.map((shortcut, shortcutIndex) => ({
    sortId: shortcut.id,
    shortcut,
    shortcutIndex,
    layout: normalizeItemLayout(resolveItemLayout(shortcut)),
  }));
}

function measureFolderItems(
  items: Array<{ sortId: string; shortcut: Shortcut; shortcutIndex: number; layout: FolderItemLayout }>,
  itemElements: Map<string, HTMLDivElement>,
): MeasuredFolderItem[] {
  return measureDragItems({
    items,
    itemElements,
    getId: (item) => item.shortcut.id,
  });
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

function offsetMeasuredFolderItemsByScrollY(
  snapshot: MeasuredFolderItem[] | null,
  scrollOffsetY: number,
): MeasuredFolderItem[] | null {
  if (!snapshot || Math.abs(scrollOffsetY) < 0.01) {
    return snapshot;
  }

  return snapshot.map((item) => ({
    ...item,
    rect: offsetDomRectByScrollY(item.rect, scrollOffsetY),
  }));
}

function buildReorderProjectionOffsets(params: {
  shortcuts: Shortcut[];
  layoutSnapshot: MeasuredFolderItem[] | null;
  activeShortcutId: string | null;
  hoverIntent: CompactReorderHoverIntent | null;
}): Map<string, ProjectionOffset> {
  const { shortcuts, layoutSnapshot, activeShortcutId, hoverIntent } = params;
  if (!hoverIntent) {
    return new Map<string, ProjectionOffset>();
  }

  const items = shortcuts.map((shortcut, shortcutIndex) => ({ shortcut, shortcutIndex }));
  const activeIndex = shortcuts.findIndex((shortcut) => shortcut.id === activeShortcutId);
  const overIndex = shortcuts.findIndex((shortcut) => shortcut.id === hoverIntent.overShortcutId);
  const targetIndex = activeIndex < 0 || overIndex < 0
    ? null
    : getReorderTargetIndex(activeIndex, overIndex, hoverIntent.edge);

  return buildSharedReorderProjectionOffsets({
    items,
    layoutSnapshot,
    activeId: activeShortcutId,
    hoveredId: hoverIntent.overShortcutId,
    targetIndex,
    getId: (item) => item.shortcut.id,
  });
}

function buildProjectedDropPreview(params: {
  shortcuts: Shortcut[];
  measuredItems: Array<{ shortcut: Shortcut; shortcutIndex: number; layout: FolderItemLayout }>;
  layoutSnapshot: MeasuredFolderItem[] | null;
  activeShortcutId: string | null;
  hoverIntent: CompactReorderHoverIntent | null;
  rootElement: HTMLDivElement | null;
}): FolderProjectedDropPreview | null {
  const {
    shortcuts,
    measuredItems,
    layoutSnapshot,
    activeShortcutId,
    hoverIntent,
    rootElement,
  } = params;

  if (!layoutSnapshot || !activeShortcutId || !rootElement) {
    return null;
  }

  const activeItem = measuredItems.find((item) => item.shortcut.id === activeShortcutId);
  if (!activeItem) return null;

  const target = buildProjectedDragSettleTarget({
    shortcuts,
    layoutSnapshot,
    activeShortcutId,
    hoverIntent,
  });
  if (!target) return null;
  const rootRect = rootElement.getBoundingClientRect();

  return {
    left: target.left - rootRect.left + activeItem.layout.previewOffsetX,
    top: target.top - rootRect.top + activeItem.layout.previewOffsetY,
    width: activeItem.layout.previewWidth,
    height: activeItem.layout.previewHeight,
    borderRadius: activeItem.layout.previewBorderRadius,
  };
}

function buildProjectedDragSettleTarget(params: {
  shortcuts: Shortcut[];
  layoutSnapshot: MeasuredFolderItem[] | null;
  activeShortcutId: string | null;
  hoverIntent: CompactReorderHoverIntent | null;
}): { left: number; top: number } | null {
  const { shortcuts, layoutSnapshot, activeShortcutId, hoverIntent } = params;
  if (!layoutSnapshot || !activeShortcutId) return null;

  const activeIndex = shortcuts.findIndex((shortcut) => shortcut.id === activeShortcutId);
  const activeSnapshot = layoutSnapshot.find((item) => item.shortcut.id === activeShortcutId)?.rect ?? null;
  if (activeIndex < 0 || !activeSnapshot) return null;

  if (!hoverIntent) {
    return {
      left: activeSnapshot.left,
      top: activeSnapshot.top,
    };
  }

  const targetShortcutIndex = shortcuts.findIndex((shortcut) => shortcut.id === hoverIntent.overShortcutId);
  if (targetShortcutIndex < 0) {
    return {
      left: activeSnapshot.left,
      top: activeSnapshot.top,
    };
  }

  const targetIndex = getReorderTargetIndex(activeIndex, targetShortcutIndex, hoverIntent.edge);
  const orderedRects = shortcuts
    .map((shortcut) => layoutSnapshot.find((item) => item.shortcut.id === shortcut.id)?.rect ?? null)
    .filter((rect): rect is DOMRect => Boolean(rect));
  if (orderedRects.length === 0) return null;

  const targetRect = orderedRects[Math.max(0, Math.min(targetIndex, orderedRects.length - 1))] ?? activeSnapshot;
  return {
    left: targetRect.left,
    top: targetRect.top,
  };
}

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

function FolderMaskDropZones({
  active,
  hovered,
  boundaryRef,
}: {
  active: boolean;
  hovered: boolean;
  boundaryRef: React.RefObject<HTMLElement | null>;
}) {
  const [boundaryRect, setBoundaryRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!active) {
      setBoundaryRect(null);
      return;
    }

    const updateRect = () => {
      const node = boundaryRef.current;
      setBoundaryRect(node ? node.getBoundingClientRect() : null);
    };

    updateRect();
    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('scroll', updateRect, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [active, boundaryRef]);

  if (!active || !boundaryRect || typeof document === 'undefined') return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const zoneClassName = hovered ? 'bg-black/10' : 'bg-black/5';

  return createPortal(
    <>
      <div className={`pointer-events-none fixed left-0 top-0 z-[51] transition-colors ${zoneClassName}`} style={{ width: viewportWidth, height: Math.max(0, boundaryRect.top) }} />
      <div className={`pointer-events-none fixed z-[51] transition-colors ${zoneClassName}`} style={{ left: Math.max(0, boundaryRect.right), top: Math.max(0, boundaryRect.top), width: Math.max(0, viewportWidth - boundaryRect.right), height: Math.max(0, boundaryRect.height) }} />
      <div className={`pointer-events-none fixed left-0 z-[51] transition-colors ${zoneClassName}`} style={{ top: Math.max(0, boundaryRect.bottom), width: viewportWidth, height: Math.max(0, viewportHeight - boundaryRect.bottom) }} />
      <div className={`pointer-events-none fixed z-[51] transition-colors ${zoneClassName}`} style={{ left: 0, top: Math.max(0, boundaryRect.top), width: Math.max(0, boundaryRect.left), height: Math.max(0, boundaryRect.height) }} />
    </>,
    document.body,
  );
}

export function FolderShortcutSurface({
  folderId,
  shortcuts,
  emptyText = '',
  renderEmptyState,
  columns = 3,
  columnGap = 16,
  rowGap = 20,
  overlayZIndex = DRAG_OVERLAY_Z_INDEX,
  maskBoundaryRef,
  resolveItemLayout,
  renderItem,
  renderDragPreview,
  renderDropPreview = renderDefaultDropPreview,
  onShortcutOpen,
  onShortcutContextMenu,
  onShortcutDropIntent,
  onExtractDragStart,
  onDragActiveChange,
  isFirefox = detectFirefox(),
}: FolderShortcutSurfaceProps) {
  const measuredItems = useMemo(
    () => buildMeasuredItems(shortcuts, resolveItemLayout),
    [resolveItemLayout, shortcuts],
  );
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragPointer, setDragPointer] = useState<PointerPoint | null>(null);
  const [dragPreviewOffset, setDragPreviewOffset] = useState<PointerPoint | null>(null);
  const [hoverResolution, setHoverResolution] = useState<CompactReorderHoverResolution>(
    EMPTY_FOLDER_HOVER_RESOLUTION,
  );
  const [hoveredMask, setHoveredMask] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemElementsRef = useRef(new Map<string, HTMLDivElement>());
  const ignoreClickRef = useRef(false);
  const pendingDragRef = useRef<PendingDragState | null>(null);
  const dragSessionRef = useRef<DragSessionState | null>(null);
  const latestHoverResolutionRef = useRef<CompactReorderHoverResolution>(EMPTY_FOLDER_HOVER_RESOLUTION);
  const hoveredMaskRef = useRef(false);
  const extractHandoffTimerRef = useRef<number | null>(null);
  const latestPointerRef = useRef<PointerPoint | null>(null);
  const recognitionPointRef = useRef<PointerPoint | null>(null);
  const projectionSettleResumeRafRef = useRef<number | null>(null);
  const [dragLayoutSnapshot, setDragLayoutSnapshot] = useState<MeasuredFolderItem[] | null>(null);
  const dragLayoutSnapshotRef = useRef<MeasuredFolderItem[] | null>(null);
  const [dragScrollOffsetY, setDragScrollOffsetY] = useState(0);
  const dragScrollOriginTopRef = useRef(0);
  const autoScrollContainerRef = useRef<HTMLElement | null>(null);
  const autoScrollBoundsRef = useRef<{ top: number; bottom: number } | null>(null);
  const autoScrollVelocityRef = useRef(0);
  const autoScrollRafRef = useRef<number | null>(null);
  const [suppressProjectionSettleAnimation, setSuppressProjectionSettleAnimation] = useState(false);

  const {
    layoutShiftOffsets,
    disableLayoutShiftTransition,
    dragSettlePreview,
    commitMeasuredItemRects,
    startDragSettlePreview,
    clearDragSettlePreview,
  } = useDragMotionState<Shortcut>({
    minLayoutShiftDistancePx: LAYOUT_SHIFT_MIN_DISTANCE_PX,
    settleDurationMs: DRAG_RELEASE_SETTLE_DURATION_MS,
  });

  const activeDragItem = useMemo(
    () => measuredItems.find((item) => item.shortcut.id === activeDragId) ?? null,
    [activeDragId, measuredItems],
  );

  const hoverIntent = hoverResolution.interactionIntent;
  const visualProjectionIntent = hoverResolution.visualProjectionIntent;
  const projectionLayoutSnapshot = useMemo(
    () => offsetMeasuredFolderItemsByScrollY(dragLayoutSnapshot, dragScrollOffsetY),
    [dragLayoutSnapshot, dragScrollOffsetY],
  );

  const commitDragLayoutSnapshot = useCallback((nextSnapshot: MeasuredFolderItem[] | null) => {
    dragLayoutSnapshotRef.current = nextSnapshot;
    setDragLayoutSnapshot(nextSnapshot);
  }, []);

  const updateDragScrollOffset = useCallback(() => {
    const container = autoScrollContainerRef.current;
    const nextOffset = container ? container.scrollTop - dragScrollOriginTopRef.current : 0;
    setDragScrollOffsetY((current) => (Math.abs(current - nextOffset) < 0.01 ? current : nextOffset));
  }, []);

  const projectionOffsets = useMemo(
    () => buildReorderProjectionOffsets({
      shortcuts,
      layoutSnapshot: projectionLayoutSnapshot,
      activeShortcutId: activeDragId,
      hoverIntent: visualProjectionIntent,
    }),
    [activeDragId, projectionLayoutSnapshot, shortcuts, visualProjectionIntent],
  );
  const projectedDropPreview = useMemo(() => buildProjectedDropPreview({
    shortcuts,
    measuredItems,
    layoutSnapshot: projectionLayoutSnapshot,
    activeShortcutId: activeDragId,
    hoverIntent: visualProjectionIntent,
    rootElement: rootRef.current,
  }), [
    activeDragId,
    projectionLayoutSnapshot,
    measuredItems,
    shortcuts,
    visualProjectionIntent,
  ]);
  const hiddenShortcutId = activeDragId ?? dragSettlePreview?.itemId ?? null;

  useEffect(() => {
    latestHoverResolutionRef.current = hoverResolution;
  }, [hoverResolution]);

  useEffect(() => {
    hoveredMaskRef.current = hoveredMask;
  }, [hoveredMask]);

  useEffect(() => {
    if (!activeDragId) {
      window.setTimeout(() => {
        ignoreClickRef.current = false;
      }, 120);
      onDragActiveChange?.(false);
      return;
    }

    ignoreClickRef.current = true;
    onDragActiveChange?.(true);
  }, [activeDragId, onDragActiveChange]);

  const stopAutoScroll = useCallback(() => {
    autoScrollVelocityRef.current = 0;
    if (autoScrollRafRef.current !== null) {
      window.cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
  }, []);

  const clearDragState = useCallback(() => {
    if (extractHandoffTimerRef.current !== null) {
      window.clearTimeout(extractHandoffTimerRef.current);
      extractHandoffTimerRef.current = null;
    }
    pendingDragRef.current = null;
    dragSessionRef.current = null;
    latestPointerRef.current = null;
    recognitionPointRef.current = null;
    setActiveDragId(null);
    setDragPointer(null);
    setDragPreviewOffset(null);
    commitDragLayoutSnapshot(null);
    setDragScrollOffsetY(0);
    dragScrollOriginTopRef.current = 0;
    stopAutoScroll();
    autoScrollContainerRef.current = null;
    autoScrollBoundsRef.current = null;
    setHoverResolution(EMPTY_FOLDER_HOVER_RESOLUTION);
    setHoveredMask(false);
    document.body.style.userSelect = '';
  }, [commitDragLayoutSnapshot, stopAutoScroll]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    commitMeasuredItemRects({
      currentRects: measureDragItemRects(itemElementsRef.current),
      skip: Boolean(activeDragId) || suppressProjectionSettleAnimation,
    });
  }, [activeDragId, commitMeasuredItemRects, measuredItems, suppressProjectionSettleAnimation]);

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

  const performExtractHandoff = useCallback((pointer: PointerPoint) => {
    const session = dragSessionRef.current;
    if (!session) return;

    const activeItem = (
      offsetMeasuredFolderItemsByScrollY(dragLayoutSnapshotRef.current, dragScrollOffsetY)
      ?? measureFolderItems(measuredItems, itemElementsRef.current)
    )
      .find((item) => item.shortcut.id === session.activeShortcutId);
    if (!activeItem) return;

    const anchor = buildDragAnchor({
      rect: activeItem.rect,
      previewOffset: session.previewOffset,
    });

    clearDragState();
    onExtractDragStart?.({
      folderId,
      shortcutId: activeItem.shortcut.id,
      pointerId: session.pointerId,
      pointerType: session.pointerType,
      pointer,
      anchor,
    });
  }, [clearDragState, dragScrollOffsetY, folderId, measuredItems, onExtractDragStart]);

  const clearExtractHandoffTimer = useCallback(() => {
    if (extractHandoffTimerRef.current !== null) {
      window.clearTimeout(extractHandoffTimerRef.current);
      extractHandoffTimerRef.current = null;
    }
  }, []);

  const ensureExtractHandoffTimer = useCallback(() => {
    if (extractHandoffTimerRef.current !== null) return;

    extractHandoffTimerRef.current = window.setTimeout(() => {
      extractHandoffTimerRef.current = null;
      const pointer = latestPointerRef.current;
      if (pointer) {
        performExtractHandoff(pointer);
      }
    }, EXTRACT_HANDOFF_DELAY_MS);
  }, [performExtractHandoff]);

  const resolveFolderCompactRegions = useCallback((item: MeasuredFolderItem): CompactTargetRegions => {
    const rootRect = rootRef.current?.getBoundingClientRect() ?? null;
    const safeColumns = Math.max(columns, 1);
    const columnWidth = rootRect
      ? (rootRect.width - columnGap * Math.max(0, safeColumns - 1)) / safeColumns
      : item.rect.width;
    const columnIndex = item.shortcutIndex % safeColumns;
    const cellLeft = rootRect
      ? rootRect.left + columnIndex * (columnWidth + columnGap)
      : item.rect.left;
    const targetCellRegion: CompactTargetRegion = {
      left: cellLeft,
      top: item.rect.top,
      right: cellLeft + columnWidth,
      bottom: item.rect.bottom,
      width: columnWidth,
      height: item.rect.height,
    };
    const targetIconRegion: CompactTargetRegion = {
      left: item.rect.left + item.layout.previewOffsetX,
      top: item.rect.top + item.layout.previewOffsetY,
      right: item.rect.left + item.layout.previewOffsetX + item.layout.previewWidth,
      bottom: item.rect.top + item.layout.previewOffsetY + item.layout.previewHeight,
      width: item.layout.previewWidth,
      height: item.layout.previewHeight,
    };

    return {
      targetCellRegion,
      targetIconRegion,
      targetIconHitRegion: targetIconRegion,
    };
  }, [columnGap, columns]);

  const resolveHoverState = useCallback((
    pointer: PointerPoint,
    measuredItemsOverride?: MeasuredFolderItem[],
  ) => {
    const session = dragSessionRef.current;
    if (!session) {
      return {
        hoverResolution: EMPTY_FOLDER_HOVER_RESOLUTION,
        hoveredMask: false,
        recognitionPoint: null,
      };
    }

    latestPointerRef.current = pointer;
    const snapshot = measuredItemsOverride ?? measureFolderItems(measuredItems, itemElementsRef.current);
    const activeItem = snapshot.find((item) => item.shortcut.id === session.activeShortcutId);
    if (!activeItem) {
      return {
        hoverResolution: EMPTY_FOLDER_HOVER_RESOLUTION,
        hoveredMask: false,
        recognitionPoint: null,
      };
    }

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

    const boundaryRect = maskBoundaryRef.current?.getBoundingClientRect() ?? null;
    if (boundaryRect && !pointInRect(recognitionPoint, boundaryRect)) {
      ensureExtractHandoffTimer();
      return {
        hoverResolution: EMPTY_FOLDER_HOVER_RESOLUTION,
        hoveredMask: true,
        recognitionPoint,
      };
    }

    clearExtractHandoffTimer();
    return {
      hoverResolution: resolveCompactReorderOnlyHoverResolution({
        activeSortId: session.activeShortcutId,
        recognitionPoint,
        previousRecognitionPoint: recognitionPointRef.current,
        activeVisualRect,
        measuredItems: snapshot,
        items: snapshot,
        previousInteractionIntent: latestHoverResolutionRef.current.interactionIntent,
        previousVisualProjectionIntent: latestHoverResolutionRef.current.visualProjectionIntent,
        interactionProjectionOffsets: buildReorderProjectionOffsets({
          shortcuts,
          layoutSnapshot: snapshot,
          activeShortcutId: session.activeShortcutId,
          hoverIntent: latestHoverResolutionRef.current.interactionIntent,
        }),
        visualProjectionOffsets: buildReorderProjectionOffsets({
          shortcuts,
          layoutSnapshot: snapshot,
          activeShortcutId: session.activeShortcutId,
          hoverIntent: latestHoverResolutionRef.current.visualProjectionIntent,
        }),
        resolveRegions: resolveFolderCompactRegions,
        columnGap,
        rowGap,
      }),
      hoveredMask: false,
      recognitionPoint,
    };
  }, [
    clearExtractHandoffTimer,
    columnGap,
    ensureExtractHandoffTimer,
    maskBoundaryRef,
    measuredItems,
    resolveFolderCompactRegions,
    rowGap,
    shortcuts,
  ]);

  const syncHoverState = useCallback((
    pointer: PointerPoint,
    measuredItemsOverride?: MeasuredFolderItem[],
  ) => {
    const nextHoverState = resolveHoverState(pointer, measuredItemsOverride);
    recognitionPointRef.current = nextHoverState.recognitionPoint;
    setHoverResolution(nextHoverState.hoverResolution);
    setHoveredMask(nextHoverState.hoveredMask);
  }, [resolveHoverState]);

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
          syncHoverState(pointer, measureFolderItems(measuredItems, itemElementsRef.current));
        } else {
          syncHoverState(pointer);
        }
      }

      autoScrollRafRef.current = window.requestAnimationFrame(tick);
    };

    autoScrollRafRef.current = window.requestAnimationFrame(tick);
  }, [measuredItems, syncHoverState, updateDragScrollOffset]);

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

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      const session = dragSessionRef.current;

      if (pending && event.pointerId === pending.pointerId) {
        const pointer = { x: event.clientX, y: event.clientY };
        if (!hasPointerDragActivated({
          origin: pending.origin,
          pointer,
        })) {
          return;
        }

        const nextSession: DragSessionState = {
          pointerId: pending.pointerId,
          pointerType: pending.pointerType,
          activeId: pending.activeShortcutId,
          activeShortcutId: pending.activeShortcutId,
          activeShortcutIndex: pending.activeShortcutIndex,
          pointer,
          previewOffset: pending.previewOffset,
        };
        dragSessionRef.current = nextSession;
        pendingDragRef.current = null;
        autoScrollContainerRef.current = findScrollableParent(rootRef.current);
        dragScrollOriginTopRef.current = autoScrollContainerRef.current?.scrollTop ?? 0;
        refreshAutoScrollBounds();
        setDragScrollOffsetY(0);
        commitDragLayoutSnapshot(measureFolderItems(measuredItems, itemElementsRef.current));
        document.body.style.userSelect = 'none';
        setActiveDragId(nextSession.activeShortcutId);
        setDragPreviewOffset(nextSession.previewOffset);
        setDragPointer(pointer);
        syncHoverState(pointer);
        event.preventDefault();
        return;
      }

      if (!session || event.pointerId !== session.pointerId) return;

      const pointer = { x: event.clientX, y: event.clientY };
      session.pointer = pointer;
      setDragPointer(pointer);
      updateAutoScrollVelocity(pointer.y);
      syncHoverState(pointer);
      event.preventDefault();
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const pending = pendingDragRef.current;
      const session = dragSessionRef.current;
      if (pending && event.pointerId === pending.pointerId) {
        pendingDragRef.current = null;
        return;
      }
      if (!session || event.pointerId !== session.pointerId) return;

      const finalHoverIntent = resolveFinalHoverIntent(latestHoverResolutionRef.current);
      const finalHoveredMask = hoveredMaskRef.current;
      const activeShortcutId = session.activeShortcutId;
      const activeShortcutIndex = session.activeShortcutIndex;
      const dragReleasePreview = (() => {
        const activeItem = measuredItems.find((item) => item.shortcut.id === activeShortcutId) ?? null;
        const target = buildProjectedDragSettleTarget({
          shortcuts,
          layoutSnapshot: projectionLayoutSnapshot,
          activeShortcutId,
          hoverIntent: finalHoverIntent,
        });
        if (!activeItem || !target) return null;

        return {
          itemId: activeShortcutId,
          item: activeItem.shortcut,
          fromLeft: session.pointer.x - session.previewOffset.x,
          fromTop: session.pointer.y - session.previewOffset.y,
          toLeft: target.left,
          toTop: target.top,
        };
      })();
      clearDragState();

      if (!finalHoverIntent) {
        if (dragReleasePreview) {
          startDragSettlePreview(dragReleasePreview);
        }
        return;
      }

      if (finalHoveredMask) {
        return;
      }

      const targetShortcutIndex = shortcuts.findIndex((shortcut) => shortcut.id === finalHoverIntent.overShortcutId);
      if (targetShortcutIndex < 0) return;

      const targetIndex = getReorderTargetIndex(activeShortcutIndex, targetShortcutIndex, finalHoverIntent.edge);
      if (targetIndex === activeShortcutIndex) {
        if (dragReleasePreview) {
          startDragSettlePreview(dragReleasePreview);
        }
        return;
      }

      armProjectionSettleSuppression();
      if (dragReleasePreview) {
        startDragSettlePreview(dragReleasePreview);
      }
      onShortcutDropIntent({
        type: 'reorder-folder-shortcuts',
        folderId,
        shortcutId: activeShortcutId,
        targetIndex,
        edge: finalHoverIntent.edge,
      });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerEnd, { passive: true });
    window.addEventListener('pointercancel', handlePointerEnd, { passive: true });

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, [
    armProjectionSettleSuppression,
    clearDragState,
    folderId,
    measuredItems,
    onShortcutDropIntent,
    projectionLayoutSnapshot,
    refreshAutoScrollBounds,
    shortcuts,
    startDragSettlePreview,
    commitDragLayoutSnapshot,
    syncHoverState,
    updateAutoScrollVelocity,
  ]);

  useEffect(() => () => {
    if (projectionSettleResumeRafRef.current !== null) {
      window.cancelAnimationFrame(projectionSettleResumeRafRef.current);
      projectionSettleResumeRafRef.current = null;
    }
    onDragActiveChange?.(false);
    clearDragState();
    clearDragSettlePreview();
  }, [clearDragSettlePreview, clearDragState, onDragActiveChange]);

  if (shortcuts.length === 0) {
    if (renderEmptyState) {
      return <>{renderEmptyState()}</>;
    }

    return (
      <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-black/15 bg-black/5 text-sm text-black/55">
        {emptyText}
      </div>
    );
  }

  return (
    <>
      <FolderMaskDropZones
        active={Boolean(activeDragId)}
        hovered={hoveredMask}
        boundaryRef={maskBoundaryRef}
      />
      <div
        ref={rootRef}
        className="relative grid"
        style={{
          gridTemplateColumns: `repeat(${Math.max(columns, 1)}, minmax(0, 1fr))`,
          columnGap: `${columnGap}px`,
          rowGap: `${rowGap}px`,
        }}
        data-folder-shortcut-grid="true"
      >
        {activeDragId && projectedDropPreview ? renderDropPreview(projectedDropPreview) : null}
        {measuredItems.map((item) => {
          const isDragging = hiddenShortcutId === item.shortcut.id;
          const dragProjectionOffset = projectionOffsets.get(item.shortcut.id) ?? null;
          const layoutShiftOffset = layoutShiftOffsets.get(item.shortcut.id) ?? null;
          const projectionOffset = combineProjectionOffsets(
            dragProjectionOffset,
            layoutShiftOffset,
          );

          return (
            <div
              key={item.shortcut.id}
              className="relative flex justify-center"
              data-folder-shortcut-grid-item="true"
            >
              <GridDragItemFrame
                isDragging={isDragging}
                hideDragPlaceholder
                projectionOffset={projectionOffset}
                disableReorderAnimation={disableLayoutShiftTransition || suppressProjectionSettleAnimation}
                firefox={isFirefox}
                registerElement={(element) => {
                  if (element) {
                    itemElementsRef.current.set(item.shortcut.id, element);
                    return;
                  }
                  itemElementsRef.current.delete(item.shortcut.id);
                }}
                onPointerDown={(event) => {
                  if (event.button !== 0 || !event.isPrimary) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  pendingDragRef.current = {
                    pointerId: event.pointerId,
                    pointerType: event.pointerType,
                    activeId: item.shortcut.id,
                    activeShortcutId: item.shortcut.id,
                    activeShortcutIndex: item.shortcutIndex,
                    origin: { x: event.clientX, y: event.clientY },
                    previewOffset: buildPreviewOffsetFromPointer({
                      rect,
                      pointer: { x: event.clientX, y: event.clientY },
                    }),
                  };
                }}
                placeholder={buildDefaultPlaceholder(item.layout)}
                frameProps={{
                  'data-folder-shortcut-id': item.shortcut.id,
                }}
              >
                {renderItem({
                  shortcut: item.shortcut,
                  shortcutIndex: item.shortcutIndex,
                  isDragging,
                  onOpen: () => {
                    if (ignoreClickRef.current) return;
                    onShortcutOpen(item.shortcut);
                  },
                  onContextMenu: (event) => {
                    if (ignoreClickRef.current) return;
                    onShortcutContextMenu?.(event, item.shortcut);
                  },
                })}
              </GridDragItemFrame>
            </div>
          );
        })}
      </div>
      {activeDragItem && dragPointer && dragPreviewOffset && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="pointer-events-none fixed left-0 top-0 isolate"
              style={{
                zIndex: overlayZIndex,
                transform: `translate3d(${dragPointer.x - dragPreviewOffset.x}px, ${dragPointer.y - dragPreviewOffset.y}px, 0)`,
              }}
            >
              {renderDragPreview({
                shortcut: activeDragItem.shortcut,
                shortcutIndex: activeDragItem.shortcutIndex,
              })}
            </div>,
            document.body,
          )
        : null}
      {dragSettlePreview && typeof document !== 'undefined' ? createPortal(
        <div
          className="pointer-events-none fixed left-0 top-0 isolate"
          style={{
            zIndex: overlayZIndex,
            transform: `translate3d(${dragSettlePreview.settling ? dragSettlePreview.toLeft : dragSettlePreview.fromLeft}px, ${dragSettlePreview.settling ? dragSettlePreview.toTop : dragSettlePreview.fromTop}px, 0)`,
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
    </>
  );
}
