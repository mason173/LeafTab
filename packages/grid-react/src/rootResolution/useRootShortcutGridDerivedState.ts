import type { RootShortcutDropIntent, ScrollOffset, ProjectionOffset } from '@leaftab/workspace-core';
import React, { useMemo } from 'react';
import {
  resolveRootPackedLayoutState,
  resolveRootReorderSlotState,
  type RootShortcutGridItem,
} from '../rootShortcutGridHelpers';
import { createRootProjectionController } from './projection';
import { deriveHoverStateFromIntent, type RootHoverState } from '../rootView/renderSurface';
import type { MeasuredRootGridItem } from '../rootGeometry/measurement';
import type { ProjectedDropPreview } from './projection';

type UseRootShortcutGridDerivedStateParams = {
  items: RootShortcutGridItem[];
  gridColumns: number;
  minRows: number;
  rowHeight: number;
  rowGap: number;
  columnGap: number;
  activeDragId: string | null;
  activeSourceRootShortcutId: string | null;
  gridWidthPx: number | null;
  dragScrollOffsetY: number;
  dragLayoutSnapshot: MeasuredRootGridItem[] | null;
  hoverIntent: RootShortcutDropIntent | null;
  visualProjectionIntent: RootShortcutDropIntent | null;
  dragSettlePreviewItemId: string | null;
  rootRef: React.RefObject<HTMLDivElement | null>;
};

type UseRootShortcutGridDerivedStateResult = {
  packedLayout: ReturnType<typeof resolveRootPackedLayoutState>['packedLayout'];
  placedGridItemsBySortId: ReturnType<typeof resolveRootPackedLayoutState>['placedGridItemsBySortId'];
  gridMinHeight: number;
  usesSpanAwareReorder: boolean;
  gridColumnWidth: number | null;
  shouldUseProjectedRootReorderSlots: boolean;
  activeDragItem: RootShortcutGridItem | null;
  frozenSpanItemSortIds: ReadonlySet<string> | null;
  reorderSlotCandidates: ReturnType<typeof resolveRootReorderSlotState>['reorderSlotCandidates'];
  extractedReorderSlotCandidates: ReturnType<typeof resolveRootReorderSlotState>['extractedReorderSlotCandidates'];
  hoverState: RootHoverState;
  dragScrollOffset: ScrollOffset;
  projectionLayoutSnapshot: MeasuredRootGridItem[] | null;
  projectionOffsets: Map<string, ProjectionOffset>;
  hiddenSortId: string | null;
  effectiveProjectedDropPreview: ProjectedDropPreview | null;
  computeProjectionOffsetsForIntent: ReturnType<typeof createRootProjectionController>['computeProjectionOffsetsForIntent'];
};

export function useRootShortcutGridDerivedState({
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
  dragSettlePreviewItemId,
  rootRef,
}: UseRootShortcutGridDerivedStateParams): UseRootShortcutGridDerivedStateResult {
  const packedLayoutState = useMemo(() => resolveRootPackedLayoutState({
    items,
    gridColumns,
    minRows,
    rowHeight,
    rowGap,
  }), [gridColumns, items, minRows, rowGap, rowHeight]);

  const {
    packedLayout,
    placedGridItemsBySortId,
    gridMinHeight,
    usesSpanAwareReorder,
  } = packedLayoutState;

  const {
    gridColumnWidth,
    shouldUseProjectedRootReorderSlots,
    activeDragItem,
    frozenSortIds: frozenSpanItemSortIds,
    reorderSlotCandidates,
    extractedReorderSlotCandidates,
  } = useMemo(() => resolveRootReorderSlotState({
    items,
    activeDragId,
    activeSourceRootShortcutId,
    usesSpanAwareReorder,
    gridColumns,
    gridWidthPx,
    columnGap,
    rowHeight,
    rowGap,
  }), [
    activeDragId,
    activeSourceRootShortcutId,
    columnGap,
    gridColumns,
    gridWidthPx,
    items,
    rowGap,
    rowHeight,
    usesSpanAwareReorder,
  ]);

  const hoverState = useMemo(() => deriveHoverStateFromIntent(hoverIntent), [hoverIntent]);
  const dragScrollOffset = useMemo<ScrollOffset>(() => ({
    x: 0,
    y: dragScrollOffsetY,
  }), [dragScrollOffsetY]);

  const {
    projectionLayoutSnapshot,
    projectionOffsets,
    hiddenSortId,
    effectiveProjectedDropPreview,
    computeProjectionOffsetsForIntent,
  } = useMemo(() => createRootProjectionController({
    dragLayoutSnapshot,
    dragScrollOffset,
    visualProjectionIntent,
    hoverIntent,
    activeDragId,
    dragSettlePreviewItemId,
    items,
    rootRef,
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
    dragLayoutSnapshot,
    dragScrollOffset,
    dragSettlePreviewItemId,
    frozenSpanItemSortIds,
    gridColumnWidth,
    gridColumns,
    hoverIntent,
    items,
    rootRef,
    rowGap,
    rowHeight,
    usesSpanAwareReorder,
    visualProjectionIntent,
  ]);

  return {
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
    projectionLayoutSnapshot,
    projectionOffsets,
    hiddenSortId,
    effectiveProjectedDropPreview,
    computeProjectionOffsetsForIntent,
  };
}
