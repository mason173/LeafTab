import {
  getProjectedGridItemRect,
  packGridItems,
  type PackedGridItem,
  type RootShortcutDropIntent,
  type Shortcut,
} from '@leaftab/workspace-core';
import { normalizePreviewGeometry, type GridPreviewRect } from './previewGeometry';

export type RootShortcutGridItemLayout = {
  width: number;
  height: number;
  previewWidth?: number;
  previewHeight?: number;
  previewOffsetX?: number;
  previewOffsetY?: number;
  previewBorderRadius?: string;
  previewRect?: GridPreviewRect;
  columnSpan?: number;
  rowSpan?: number;
  preserveSlot?: boolean;
};

export type NormalizedRootShortcutGridItemLayout = {
  width: number;
  height: number;
  previewWidth: number;
  previewHeight: number;
  previewOffsetX: number;
  previewOffsetY: number;
  previewBorderRadius?: string;
  previewRect: GridPreviewRect;
  columnSpan: number;
  rowSpan: number;
  preserveSlot: boolean;
};

export type RootShortcutGridItem<TShortcut extends Shortcut = Shortcut> = {
  sortId: string;
  shortcut: TShortcut;
  shortcutIndex: number;
  layout: NormalizedRootShortcutGridItemLayout;
};

export type RootReorderSlotCandidate = {
  targetIndex: number;
  overShortcutId: string;
  edge: 'before' | 'after';
  left: number;
  top: number;
  width: number;
  height: number;
  hitLeft: number;
  hitTop: number;
  hitWidth: number;
  hitHeight: number;
  centerX: number;
  centerY: number;
};

export type RootReorderSlotIntentMode = 'containing-probe' | 'closest-center';

export function normalizeRootShortcutGridItemLayout(
  layout: RootShortcutGridItemLayout,
): NormalizedRootShortcutGridItemLayout {
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
    previewRect: previewGeometry.previewRect,
    columnSpan: Math.max(1, layout.columnSpan ?? 1),
    rowSpan: Math.max(1, layout.rowSpan ?? 1),
    preserveSlot: Boolean(layout.preserveSlot),
  };
}

export function buildRootShortcutGridItems<TShortcut extends Shortcut>(params: {
  shortcuts: readonly TShortcut[];
  resolveItemLayout: (shortcut: TShortcut) => RootShortcutGridItemLayout;
}): RootShortcutGridItem<TShortcut>[] {
  const { shortcuts, resolveItemLayout } = params;
  const usedIds = new Map<string, number>();

  return shortcuts.map((shortcut, shortcutIndex) => {
    const baseId = (
      shortcut.id
      || `${shortcut.url}::${shortcut.title}`
      || `shortcut-${shortcutIndex}`
    ).trim();
    const duplicateCount = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, duplicateCount + 1);

    return {
      sortId: duplicateCount === 0 ? baseId : `${baseId}::dup-${duplicateCount}`,
      shortcut,
      shortcutIndex,
      layout: normalizeRootShortcutGridItemLayout(resolveItemLayout(shortcut)),
    };
  });
}

export function buildProjectedGridItemsPreservingFrozenSlotsByOrdinal<TShortcut extends Shortcut>(params: {
  items: RootShortcutGridItem<TShortcut>[];
  activeSortId: string;
  targetMovableOrdinal: number;
  frozenSortIds: ReadonlySet<string>;
}): { projectedItems: RootShortcutGridItem<TShortcut>[]; activeFullIndex: number } | null {
  const { items, activeSortId, targetMovableOrdinal, frozenSortIds } = params;
  const activeItem = items.find((item) => item.sortId === activeSortId);
  if (!activeItem || frozenSortIds.has(activeSortId)) return null;

  const remainingMovableItems = items.filter(
    (item) => !frozenSortIds.has(item.sortId) && item.sortId !== activeSortId,
  );
  const clampedOrdinal = Math.max(0, Math.min(targetMovableOrdinal, remainingMovableItems.length));
  const projectedMovableItems = [...remainingMovableItems];
  projectedMovableItems.splice(clampedOrdinal, 0, activeItem);

  let movableCursor = 0;
  let activeFullIndex = -1;
  const projectedItems = items.map((item, index) => {
    if (frozenSortIds.has(item.sortId)) {
      return item;
    }

    const nextItem = projectedMovableItems[movableCursor];
    if (!nextItem) {
      return item;
    }
    if (nextItem.sortId === activeSortId) {
      activeFullIndex = index;
    }
    movableCursor += 1;
    return nextItem;
  });

  if (projectedItems.some((item) => !item) || activeFullIndex < 0) {
    return null;
  }

  return {
    projectedItems,
    activeFullIndex,
  };
}

export function buildProjectedGridItemsForRootReorder<TShortcut extends Shortcut>(params: {
  items: RootShortcutGridItem<TShortcut>[];
  activeSortId: string;
  targetIndex: number;
  frozenSortIds?: ReadonlySet<string> | null;
}): RootShortcutGridItem<TShortcut>[] | null {
  const { items, activeSortId, targetIndex, frozenSortIds } = params;
  if (frozenSortIds && frozenSortIds.size > 0) {
    const movablePositions = items.flatMap((item, index) => (frozenSortIds.has(item.sortId) ? [] : [index]));
    if (movablePositions.length === 0) return null;

    const exactMovableOrdinal = movablePositions.indexOf(targetIndex);
    const fallbackMovableOrdinal = movablePositions.filter((position) => position < targetIndex).length;

    return buildProjectedGridItemsPreservingFrozenSlotsByOrdinal({
      items,
      activeSortId,
      targetMovableOrdinal: exactMovableOrdinal >= 0 ? exactMovableOrdinal : fallbackMovableOrdinal,
      frozenSortIds,
    })?.projectedItems ?? null;
  }

  const activeIndex = items.findIndex((item) => item.sortId === activeSortId);
  if (activeIndex < 0) return null;

  const remainingItems = items.filter((item) => item.sortId !== activeSortId);
  const clampedTargetIndex = Math.max(0, Math.min(targetIndex, remainingItems.length));
  const projectedItems = [...remainingItems];
  projectedItems.splice(clampedTargetIndex, 0, items[activeIndex]);
  return projectedItems;
}

export function buildRootReorderSlotCandidates<TShortcut extends Shortcut>(params: {
  items: RootShortcutGridItem<TShortcut>[];
  activeSortId: string;
  gridColumns: number;
  gridColumnWidth: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  frozenSortIds?: ReadonlySet<string> | null;
  rectMode?: 'item' | 'preview';
  hitRectMode?: 'item' | 'preview' | 'span-aware';
}): RootReorderSlotCandidate[] {
  const {
    items,
    activeSortId,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
    frozenSortIds = null,
    rectMode = 'item',
    hitRectMode = 'item',
  } = params;
  const activeItem = items.find((item) => item.sortId === activeSortId);
  if (!activeItem) return [];

  const seenPhysicalPlacements = new Set<string>();
  const registerCandidate = (candidate: {
    targetIndex: number;
    overShortcutId: string;
    edge: 'before' | 'after';
    placedActiveItem: Pick<PackedGridItem<unknown>, 'columnStart' | 'rowStart' | 'columnSpan'>;
  }): RootReorderSlotCandidate | null => {
    const placementKey = `${candidate.placedActiveItem.columnStart}:${candidate.placedActiveItem.rowStart}`;
    if (seenPhysicalPlacements.has(placementKey)) {
      return null;
    }
    seenPhysicalPlacements.add(placementKey);

    const itemRect = getProjectedGridItemRect({
      placedItem: candidate.placedActiveItem,
      gridColumnWidth,
      columnGap,
      rowHeight,
      rowGap,
      width: activeItem.layout.width,
      height: activeItem.layout.height,
    });
    const previewRect = buildProjectedRootItemPreviewRect({
      placedItem: candidate.placedActiveItem,
      gridColumnWidth,
      columnGap,
      rowHeight,
      rowGap,
      layout: activeItem.layout,
    });
    const anchorRect = buildProjectedRootItemAnchorRect({
      placedItem: candidate.placedActiveItem,
      gridColumnWidth,
      columnGap,
      rowHeight,
      rowGap,
    });
    const hitRect = (() => {
      switch (hitRectMode) {
        case 'preview':
          return previewRect;
        case 'span-aware':
          return resolveSpanAwareSlotHitRect({
            previewRect,
            anchorRect,
            layout: activeItem.layout,
          });
        case 'item':
        default:
          return itemRect;
      }
    })();
    const visualRect = rectMode === 'preview' ? previewRect : itemRect;

    return {
      targetIndex: candidate.targetIndex,
      overShortcutId: candidate.overShortcutId,
      edge: candidate.edge,
      left: visualRect.left,
      top: visualRect.top,
      width: visualRect.width,
      height: visualRect.height,
      hitLeft: hitRect.left,
      hitTop: hitRect.top,
      hitWidth: hitRect.width,
      hitHeight: hitRect.height,
      centerX: hitRect.left + hitRect.width / 2,
      centerY: hitRect.top + hitRect.height / 2,
    };
  };

  if (frozenSortIds && frozenSortIds.size > 0) {
    const remainingMovableItems = items.filter(
      (item) => !frozenSortIds.has(item.sortId) && item.sortId !== activeSortId,
    );
    if (remainingMovableItems.length === 0) return [];

    return Array.from({ length: remainingMovableItems.length + 1 }, (_, targetMovableOrdinal) => {
      const projection = buildProjectedGridItemsPreservingFrozenSlotsByOrdinal({
        items,
        activeSortId,
        targetMovableOrdinal,
        frozenSortIds,
      });
      if (!projection) return null;

      const projectedLayout = packGridItems({
        items: projection.projectedItems,
        gridColumns,
        getSpan: (item) => ({
          columnSpan: item.layout.columnSpan,
          rowSpan: item.layout.rowSpan,
        }),
      });
      const placedActiveItem = projectedLayout.placedItems.find((item) => item.sortId === activeSortId);
      const overItem = targetMovableOrdinal < remainingMovableItems.length
        ? remainingMovableItems[targetMovableOrdinal]
        : remainingMovableItems[remainingMovableItems.length - 1];
      if (!placedActiveItem || !overItem) return null;

      return registerCandidate({
        targetIndex: projection.activeFullIndex,
        overShortcutId: overItem.shortcut.id,
        edge: targetMovableOrdinal < remainingMovableItems.length ? 'before' : 'after',
        placedActiveItem,
      });
    }).filter((candidate): candidate is RootReorderSlotCandidate => Boolean(candidate));
  }

  const remainingItems = items.filter((item) => item.sortId !== activeSortId);
  if (remainingItems.length === 0) return [];

  return Array.from({ length: remainingItems.length + 1 }, (_, targetIndex) => {
    const projectedItems = [...remainingItems];
    projectedItems.splice(targetIndex, 0, activeItem);

    const projectedLayout = packGridItems({
      items: projectedItems,
      gridColumns,
      getSpan: (item) => ({
        columnSpan: item.layout.columnSpan,
        rowSpan: item.layout.rowSpan,
      }),
    });
    const placedActiveItem = projectedLayout.placedItems.find((item) => item.sortId === activeSortId);
    const overItem = targetIndex < remainingItems.length
      ? remainingItems[targetIndex]
      : remainingItems[remainingItems.length - 1];
    if (!placedActiveItem || !overItem) return null;

    return registerCandidate({
      targetIndex,
      overShortcutId: overItem.shortcut.id,
      edge: targetIndex < remainingItems.length ? 'before' : 'after',
      placedActiveItem,
    });
  }).filter((candidate): candidate is RootReorderSlotCandidate => Boolean(candidate));
}

function pointInRootReorderSlot(
  point: { x: number; y: number },
  slot: RootReorderSlotCandidate,
): boolean {
  return (
    point.x >= slot.hitLeft
    && point.x <= slot.hitLeft + slot.hitWidth
    && point.y >= slot.hitTop
    && point.y <= slot.hitTop + slot.hitHeight
  );
}

function distanceToRootReorderSlotCenter(
  point: { x: number; y: number },
  slot: RootReorderSlotCandidate,
): number {
  return Math.hypot(point.x - slot.centerX, point.y - slot.centerY);
}

export function pickContainingRootReorderSlotCandidate(params: {
  point: { x: number; y: number };
  candidates: RootReorderSlotCandidate[];
}): RootReorderSlotCandidate | null {
  const { point, candidates } = params;
  const containingSlots = candidates
    .filter((candidate) => pointInRootReorderSlot(point, candidate))
    .sort((left, right) => (
      distanceToRootReorderSlotCenter(point, left) - distanceToRootReorderSlotCenter(point, right)
    ));

  return containingSlots[0] ?? null;
}

function buildRootReorderIntentFromSlotCandidate(params: {
  activeShortcutId: string;
  candidate: Pick<RootReorderSlotCandidate, 'targetIndex' | 'overShortcutId' | 'edge'>;
}): RootShortcutDropIntent {
  const { activeShortcutId, candidate } = params;
  return {
    type: 'reorder-root',
    activeShortcutId,
    overShortcutId: candidate.overShortcutId,
    targetIndex: candidate.targetIndex,
    edge: candidate.edge,
  };
}

function isSameRootReorderSlotCandidate(
  candidate: RootReorderSlotCandidate,
  intent: Extract<RootShortcutDropIntent, { type: 'reorder-root' }>,
): boolean {
  return (
    intent.type === 'reorder-root'
    && candidate.targetIndex === intent.targetIndex
    && candidate.overShortcutId === intent.overShortcutId
    && candidate.edge === intent.edge
  );
}

export function pickClosestRootReorderSlotCandidate(params: {
  point: { x: number; y: number };
  candidates: RootReorderSlotCandidate[];
  previousIntent?: RootShortcutDropIntent | null;
  hysteresisPx?: number;
}): RootReorderSlotCandidate | null {
  const {
    point,
    candidates,
    previousIntent = null,
    hysteresisPx = 28,
  } = params;
  if (candidates.length === 0) {
    return null;
  }

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      distance: distanceToRootReorderSlotCenter(point, candidate),
    }))
    .sort((left, right) => left.distance - right.distance);

  const best = ranked[0] ?? null;
  if (!best) {
    return null;
  }

  if (previousIntent?.type === 'reorder-root') {
    const previous = ranked.find(({ candidate }) => isSameRootReorderSlotCandidate(candidate, previousIntent));
    if (previous && previous.distance <= best.distance + hysteresisPx) {
      return previous.candidate;
    }
  }

  return best.candidate;
}

export function resolveRootReorderSlotIntent(params: {
  activeShortcutId: string;
  point: { x: number; y: number };
  candidates: RootReorderSlotCandidate[];
  mode: RootReorderSlotIntentMode;
  previousIntent?: RootShortcutDropIntent | null;
}): RootShortcutDropIntent | null {
  const { activeShortcutId, point, candidates, mode, previousIntent = null } = params;
  const candidate = mode === 'closest-center'
    ? pickClosestRootReorderSlotCandidate({
        point,
        candidates,
        previousIntent,
      })
    : pickContainingRootReorderSlotCandidate({
        point,
        candidates,
      });

  if (!candidate) {
    return null;
  }

  return buildRootReorderIntentFromSlotCandidate({
    activeShortcutId,
    candidate,
  });
}

export function buildProjectedRootItemPreviewRect(params: {
  placedItem: Pick<PackedGridItem<unknown>, 'columnStart' | 'rowStart' | 'columnSpan'>;
  gridColumnWidth: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  layout: Pick<
    NormalizedRootShortcutGridItemLayout,
    'width' | 'height' | 'previewWidth' | 'previewHeight' | 'previewOffsetX' | 'previewOffsetY' | 'previewBorderRadius'
  >;
}): { left: number; top: number; width: number; height: number; borderRadius?: string } {
  const { placedItem, gridColumnWidth, columnGap, rowHeight, rowGap, layout } = params;
  const projectedItemRect = getProjectedGridItemRect({
    placedItem,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
    width: layout.width,
    height: layout.height,
  });

  return {
    left: projectedItemRect.left + layout.previewOffsetX,
    top: projectedItemRect.top + layout.previewOffsetY,
    width: layout.previewWidth,
    height: layout.previewHeight,
    borderRadius: layout.previewBorderRadius,
  };
}

export function buildProjectedRootItemAnchorRect(params: {
  placedItem: Pick<PackedGridItem<unknown>, 'columnStart' | 'rowStart'>;
  gridColumnWidth: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
}): { left: number; top: number; width: number; height: number } {
  const { placedItem, gridColumnWidth, columnGap, rowHeight, rowGap } = params;

  return {
    left: (placedItem.columnStart - 1) * (gridColumnWidth + columnGap),
    top: (placedItem.rowStart - 1) * (rowHeight + rowGap),
    width: gridColumnWidth,
    height: rowHeight,
  };
}

export function buildDraggedRootItemAnchorRect(params: {
  itemRect: { left: number; top: number };
  gridColumnWidth: number;
  columnGap: number;
  rowHeight: number;
  layout: Pick<NormalizedRootShortcutGridItemLayout, 'width' | 'columnSpan'>;
}): { left: number; top: number; width: number; height: number } {
  const { itemRect, gridColumnWidth, columnGap, rowHeight, layout } = params;
  const spanWidth = (
    gridColumnWidth * Math.max(1, layout.columnSpan)
    + columnGap * Math.max(0, Math.max(1, layout.columnSpan) - 1)
  );
  const slotLeft = itemRect.left - Math.max(0, (spanWidth - layout.width) / 2);

  return {
    left: slotLeft,
    top: itemRect.top,
    width: gridColumnWidth,
    height: rowHeight,
  };
}

export function resolveSpanAwareSlotProbePoint(params: {
  point: { x: number; y: number };
  anchorRect: { left: number; top: number; width: number; height: number };
  layout: Pick<NormalizedRootShortcutGridItemLayout, 'columnSpan' | 'rowSpan'>;
}): { x: number; y: number } {
  const { point, anchorRect, layout } = params;
  if (layout.columnSpan <= 1 && layout.rowSpan <= 1) {
    return point;
  }

  return {
    x: anchorRect.left + anchorRect.width / 2,
    y: anchorRect.top + anchorRect.height / 2,
  };
}

export function resolveSpanAwareSlotHitRect(params: {
  previewRect: { left: number; top: number; width: number; height: number };
  anchorRect: { left: number; top: number; width: number; height: number };
  layout: Pick<NormalizedRootShortcutGridItemLayout, 'columnSpan' | 'rowSpan'>;
}): { left: number; top: number; width: number; height: number } {
  const { previewRect, anchorRect, layout } = params;
  if (layout.columnSpan <= 1 && layout.rowSpan <= 1) {
    return previewRect;
  }

  return anchorRect;
}

export function shouldSkipLayoutShiftOnAnimationReenable(params: {
  previousAnimationDisabled: boolean;
  animationDisabled: boolean;
}): boolean {
  const { previousAnimationDisabled, animationDisabled } = params;
  return previousAnimationDisabled && !animationDisabled;
}

export function resolveFinalHoverIntent<TIntent>(resolution: {
  interactionIntent: TIntent | null;
  visualProjectionIntent: TIntent | null;
}): TIntent | null {
  return resolution.interactionIntent ?? resolution.visualProjectionIntent;
}
