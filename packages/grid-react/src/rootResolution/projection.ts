import {
  buildReorderProjectionOffsets as buildSharedReorderProjectionOffsets,
  distanceToRect,
  distanceToRectCenter,
  getProjectedGridItemRect,
  pointInRect,
  type PointerPoint,
  type ProjectionOffset,
  type RootShortcutDropIntent,
  type ScrollOffset,
  type Shortcut,
} from '@leaftab/workspace-core';
import type React from 'react';
import {
  buildProjectedGridItemsForRootReorder,
  buildProjectedRootItemPreviewRect,
  type RootShortcutGridItem,
} from '../rootShortcutGridHelpers';
import {
  offsetMeasuredRootGridItemsByScrollOffset,
  type MeasuredRootGridItem,
} from '../rootGeometry/measurement';
import { packItemsIntoSerpentineGrid } from '../serpentineWorldGrid';

export type OverItemCandidate = {
  overItem: MeasuredRootGridItem;
  overRect: DOMRect;
};

export type ProjectedDropPreview = {
  shortcut: Shortcut;
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
  opacity?: number;
};

export type RootProjectionState = {
  projectionLayoutSnapshot: MeasuredRootGridItem[] | null;
  projectionOffsets: Map<string, ProjectionOffset>;
  hiddenSortId: string | null;
  projectedDropPreview: ProjectedDropPreview | null;
  effectiveProjectedDropPreview: ProjectedDropPreview | null;
};

export type RootProjectionController = RootProjectionState & {
  computeProjectionOffsetsForIntent: (
    projectionIntent: RootShortcutDropIntent | null,
  ) => Map<string, ProjectionOffset>;
};

const EMPTY_ROOT_PROJECTION_OFFSETS = new Map<string, ProjectionOffset>();

export function pickOverItemCandidate(params: {
  activeSortId: string;
  measuredItems: MeasuredRootGridItem[];
  pointer: PointerPoint;
  matchDistancePx: number;
}): OverItemCandidate | null {
  const { activeSortId, measuredItems, pointer, matchDistancePx } = params;
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
      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }
      return left.centerDistance - right.centerDistance;
    });

  const best = ranked[0];
  if (!best || best.distance > matchDistancePx) {
    return null;
  }

  return {
    overItem: best.item,
    overRect: best.item.rect,
  };
}

export function buildRootReorderProjectionOffsets(params: {
  items: RootShortcutGridItem[];
  layoutSnapshot: MeasuredRootGridItem[] | null;
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

export function computeRootProjectionOffsetsForIntent(params: {
  projectionIntent: RootShortcutDropIntent | null;
  usesSpanAwareReorder: boolean;
  projectionLayoutSnapshot: MeasuredRootGridItem[] | null;
  activeDragId: string | null;
  gridColumnWidth: number | null;
  rootRef: React.RefObject<HTMLDivElement | null>;
  items: RootShortcutGridItem[];
  frozenSortIds: ReadonlySet<string> | null;
  gridColumns: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
}): Map<string, ProjectionOffset> {
  const {
    projectionIntent,
    usesSpanAwareReorder,
    projectionLayoutSnapshot,
    activeDragId,
    gridColumnWidth,
    rootRef,
    items,
    frozenSortIds,
    gridColumns,
    columnGap,
    rowHeight,
    rowGap,
  } = params;

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
      frozenSortIds,
    });
    if (projectedItems) {
      const projectedLayout = packItemsIntoSerpentineGrid({
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

  return buildRootReorderProjectionOffsets({
    items,
    layoutSnapshot: projectionLayoutSnapshot,
    activeSortId: activeDragId,
    hoverIntent: projectionIntent,
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
  if (activeIndex < 0) {
    return false;
  }

  const projectedItems = buildProjectedGridItemsForRootReorder({
    items,
    activeSortId,
    targetIndex,
    frozenSortIds,
  });
  if (!projectedItems) {
    return false;
  }

  return projectedItems.findIndex((item) => item.sortId === activeSortId) === activeIndex;
}

export function buildProjectedDropPreview(params: {
  items: RootShortcutGridItem[];
  layoutSnapshot: MeasuredRootGridItem[] | null;
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

  const activeItem = items.find((item) => item.sortId === activeSortId) ?? null;
  if (!activeItem) {
    return null;
  }

  const snapshotById = new Map(layoutSnapshot.map((item) => [item.sortId, item]));
  const activeSnapshot = snapshotById.get(activeSortId);
  if (!activeSnapshot) {
    return null;
  }
  const rootRect = rootElement.getBoundingClientRect();

  if (!hoverIntent) {
    return {
      shortcut: activeItem.shortcut,
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
      shortcut: activeItem.shortcut,
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
    if (!projectedItems) {
      return null;
    }

    const projectedLayout = packItemsIntoSerpentineGrid({
      items: projectedItems,
      gridColumns,
      getSpan: (item) => ({
        columnSpan: item.layout.columnSpan,
        rowSpan: item.layout.rowSpan,
      }),
    });
    const placedActiveItem = projectedLayout.placedItems.find((item) => item.sortId === activeSortId) ?? null;
    if (!placedActiveItem) {
      return null;
    }

    return buildProjectedRootItemPreviewRect({
      placedItem: placedActiveItem,
      gridColumnWidth,
      columnGap,
      rowHeight,
      rowGap,
      layout: activeItem.layout,
      shortcut: activeItem.shortcut,
    });
  }

  const originalOrder = items.map((item) => item.sortId);
  const slotSortId = originalOrder[hoverIntent.targetIndex];
  const slotSnapshot = slotSortId ? snapshotById.get(slotSortId) : null;
  const resolvedSnapshot = slotSnapshot ?? activeSnapshot;
  if (!resolvedSnapshot) {
    return null;
  }

  return {
    shortcut: activeItem.shortcut,
    left: resolvedSnapshot.rect.left - rootRect.left + activeItem.layout.previewOffsetX,
    top: resolvedSnapshot.rect.top - rootRect.top + activeItem.layout.previewOffsetY,
    width: activeItem.layout.previewWidth,
    height: activeItem.layout.previewHeight,
    borderRadius: activeItem.layout.previewBorderRadius,
  };
}

export function resolveEffectiveProjectedDropPreview(params: {
  projectedDropPreview: ProjectedDropPreview | null;
  hoverIntent: RootShortcutDropIntent | null;
}): ProjectedDropPreview | null {
  const { projectedDropPreview, hoverIntent } = params;
  if (!projectedDropPreview) {
    return null;
  }

  return {
    ...projectedDropPreview,
    opacity: hoverIntent?.type === 'move-root-shortcut-into-folder' ? 0.01 : projectedDropPreview.opacity,
  };
}

export function resolveRootProjectionState(params: {
  dragLayoutSnapshot: MeasuredRootGridItem[] | null;
  dragScrollOffset: ScrollOffset;
  visualProjectionIntent: RootShortcutDropIntent | null;
  hoverIntent: RootShortcutDropIntent | null;
  activeDragId: string | null;
  dragSettlePreviewItemId: string | null;
  items: RootShortcutGridItem[];
  rootRef: React.RefObject<HTMLDivElement | null>;
  usesSpanAwareReorder: boolean;
  frozenSortIds: ReadonlySet<string> | null;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
}): RootProjectionState {
  const {
    dragLayoutSnapshot,
    dragScrollOffset,
    visualProjectionIntent,
    hoverIntent,
    activeDragId,
    dragSettlePreviewItemId,
    items,
    rootRef,
    usesSpanAwareReorder,
    frozenSortIds,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
  } = params;

  if (!activeDragId && !dragSettlePreviewItemId) {
    return {
      projectionLayoutSnapshot: null,
      projectionOffsets: EMPTY_ROOT_PROJECTION_OFFSETS,
      hiddenSortId: null,
      projectedDropPreview: null,
      effectiveProjectedDropPreview: null,
    };
  }

  const projectionLayoutSnapshot = offsetMeasuredRootGridItemsByScrollOffset(
    dragLayoutSnapshot,
    dragScrollOffset,
  );
  const projectionOffsets = activeDragId && visualProjectionIntent
    ? computeRootProjectionOffsetsForIntent({
        projectionIntent: visualProjectionIntent,
        usesSpanAwareReorder,
        projectionLayoutSnapshot,
        activeDragId,
        gridColumnWidth,
        rootRef,
        items,
        frozenSortIds,
        gridColumns,
        columnGap,
        rowHeight,
        rowGap,
      })
    : EMPTY_ROOT_PROJECTION_OFFSETS;
  const projectedDropPreview = activeDragId
    ? buildProjectedDropPreview({
        items,
        layoutSnapshot: projectionLayoutSnapshot,
        activeSortId: activeDragId,
        hoverIntent: visualProjectionIntent,
        rootElement: rootRef.current,
        usesSpanAwareReorder,
        frozenSortIds,
        gridColumns,
        gridColumnWidth,
        columnGap,
        rowHeight,
        rowGap,
      })
    : null;

  return {
    projectionLayoutSnapshot,
    projectionOffsets,
    hiddenSortId: activeDragId ?? dragSettlePreviewItemId ?? null,
    projectedDropPreview,
    effectiveProjectedDropPreview: resolveEffectiveProjectedDropPreview({
      projectedDropPreview,
      hoverIntent,
    }),
  };
}

export function createRootProjectionController(params: {
  dragLayoutSnapshot: MeasuredRootGridItem[] | null;
  dragScrollOffset: ScrollOffset;
  visualProjectionIntent: RootShortcutDropIntent | null;
  hoverIntent: RootShortcutDropIntent | null;
  activeDragId: string | null;
  dragSettlePreviewItemId: string | null;
  items: RootShortcutGridItem[];
  rootRef: React.RefObject<HTMLDivElement | null>;
  usesSpanAwareReorder: boolean;
  frozenSortIds: ReadonlySet<string> | null;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
}): RootProjectionController {
  const projectionState = resolveRootProjectionState(params);

  const computeProjectionOffsetsForIntent = (
    projectionIntent: RootShortcutDropIntent | null,
  ) => {
    if (!params.activeDragId || !projectionIntent || !projectionState.projectionLayoutSnapshot) {
      return EMPTY_ROOT_PROJECTION_OFFSETS;
    }

    return computeRootProjectionOffsetsForIntent({
      projectionIntent,
      usesSpanAwareReorder: params.usesSpanAwareReorder,
      projectionLayoutSnapshot: projectionState.projectionLayoutSnapshot,
      activeDragId: params.activeDragId,
      gridColumnWidth: params.gridColumnWidth,
      rootRef: params.rootRef,
      items: params.items,
      frozenSortIds: params.frozenSortIds,
      gridColumns: params.gridColumns,
      columnGap: params.columnGap,
      rowHeight: params.rowHeight,
      rowGap: params.rowGap,
    });
  };

  return {
    ...projectionState,
    computeProjectionOffsetsForIntent,
  };
}

export function buildProjectedDragSettleTarget(params: {
  items: RootShortcutGridItem[];
  layoutSnapshot: MeasuredRootGridItem[] | null;
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

  const activeItem = items.find((item) => item.sortId === activeSortId) ?? null;
  const activeSnapshot = layoutSnapshot.find((item) => item.sortId === activeSortId)?.rect ?? null;
  if (!activeItem || !activeSnapshot) {
    return null;
  }

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
    if (!projectedItems) {
      return null;
    }

    const projectedLayout = packItemsIntoSerpentineGrid({
      items: projectedItems,
      gridColumns,
      getSpan: (item) => ({
        columnSpan: item.layout.columnSpan,
        rowSpan: item.layout.rowSpan,
      }),
    });
    const placedActiveItem = projectedLayout.placedItems.find((item) => item.sortId === activeSortId) ?? null;
    if (!placedActiveItem) {
      return null;
    }

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
  if (orderedRects.length === 0) {
    return null;
  }

  const targetRect = orderedRects[Math.max(0, Math.min(hoverIntent.targetIndex, orderedRects.length - 1))];
  return {
    left: targetRect.left,
    top: targetRect.top,
  };
}
