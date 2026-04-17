import { reorderRootShortcutPreservingLargeFolderPositions } from '@/features/shortcuts/model/operations';
import type { Shortcut } from '@/types';
import type { DragHoverResolution } from './dragSessionRuntime';
import { resolveGridDragFrameState } from './dragFrameRenderState';
import { buildLinearProjectedDropPreview, type ProjectedDropPreview } from './linearReorderProjection';
import { buildReorderProjectionOffsets, type MeasuredDragItem, type ProjectionOffset } from './gridDragEngine';
import { getPackedGridItemRenderRect, getProjectedGridItemRect, type PackedGridItem, packGridItems } from './gridLayout';
import type { RootShortcutDropIntent } from './types';
import {
  resolveRootDragItemVisualState,
  resolveRootDragVisualState,
  type RootDragItemVisualState,
  type RootDragVisualState,
} from './rootDragVisualState';

export { resolveRootDragItemVisualState } from './rootDragVisualState';

export type RootDragRenderableLayout = {
  width: number;
  height: number;
  previewWidth: number;
  previewHeight: number;
  previewOffsetX: number;
  previewOffsetY: number;
  previewBorderRadius?: string;
  columnSpan: number;
  rowSpan: number;
};

export type RootDragRenderableItem = {
  sortId: string;
  shortcut: Shortcut;
  layout: RootDragRenderableLayout;
};

export type RootGridItemRenderState = {
  itemRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  frameState: ReturnType<typeof resolveGridDragFrameState>;
  visualState: RootDragItemVisualState;
  selectionDisabled: boolean;
  selectionIndicatorVisible: boolean;
};

function buildProjectedItemsForIntent<T extends RootDragRenderableItem>(params: {
  items: readonly T[];
  shortcuts: Shortcut[];
  activeSortId: string;
  hoverIntent: RootShortcutDropIntent | null;
}): T[] | null {
  const { items, shortcuts, activeSortId, hoverIntent } = params;
  if (!hoverIntent || hoverIntent.type !== 'reorder-root') {
    return null;
  }

  const nextShortcuts = reorderRootShortcutPreservingLargeFolderPositions(
    shortcuts,
    activeSortId,
    hoverIntent.targetIndex,
  );
  if (!nextShortcuts) {
    return null;
  }

  const itemById = new Map(items.map((item) => [item.shortcut.id, item]));
  return nextShortcuts
    .map((shortcut) => itemById.get(shortcut.id) ?? null)
    .filter((item): item is T => Boolean(item));
}

export function buildRootReorderProjectionOffsets<T extends RootDragRenderableItem>(params: {
  items: readonly T[];
  layoutSnapshot: Array<MeasuredDragItem<T>> | null;
  activeSortId: string | null;
  hoverIntent: RootShortcutDropIntent | null;
}): Map<string, ProjectionOffset> {
  const { items, layoutSnapshot, activeSortId, hoverIntent } = params;
  if (!layoutSnapshot || !activeSortId) {
    return new Map();
  }

  return buildReorderProjectionOffsets({
    items,
    layoutSnapshot,
    activeId: activeSortId,
    hoveredId: hoverIntent?.type === 'reorder-root' ? hoverIntent.overShortcutId : null,
    targetIndex: hoverIntent?.type === 'reorder-root' ? hoverIntent.targetIndex : null,
    getId: (item) => item.sortId,
  });
}

function buildRootProjectedDropPreview<T extends RootDragRenderableItem>(params: {
  items: readonly T[];
  shortcuts: Shortcut[];
  layoutSnapshot: Array<MeasuredDragItem<T>> | null;
  activeSortId: string | null;
  hoverIntent: RootShortcutDropIntent | null;
  rootElement: HTMLDivElement | null;
  usesSpanAwareReorder: boolean;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
}): ProjectedDropPreview | null {
  const {
    items,
    shortcuts,
    layoutSnapshot,
    activeSortId,
    hoverIntent,
    rootElement,
    usesSpanAwareReorder,
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
  if (!activeItem) {
    return null;
  }

  if (usesSpanAwareReorder && hoverIntent?.type === 'reorder-root' && gridColumnWidth) {
    const projectedItems = buildProjectedItemsForIntent({
      items,
      shortcuts,
      activeSortId,
      hoverIntent,
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
      const placedActiveItem = projectedLayout.placedItems.find((item) => item.sortId === activeSortId);
      if (placedActiveItem) {
        const projectedRect = getProjectedGridItemRect({
          placedItem: placedActiveItem,
          gridColumnWidth,
          columnGap,
          rowHeight,
          rowGap,
          width: activeItem.layout.width,
          height: activeItem.layout.height,
        });
        return {
          left: projectedRect.left + activeItem.layout.previewOffsetX,
          top: projectedRect.top + activeItem.layout.previewOffsetY,
          width: activeItem.layout.previewWidth,
          height: activeItem.layout.previewHeight,
          borderRadius: activeItem.layout.previewBorderRadius,
        };
      }
    }
  }

  return buildLinearProjectedDropPreview({
    items,
    layoutSnapshot,
    activeId: activeSortId,
    hoverIntent,
    rootElement,
    getId: (item) => item.sortId,
    getLayout: (item) => item.layout,
    resolveTargetIndex: (intent) => intent.targetIndex,
  });
}

export function resolveRootGridItemRenderState<T extends RootDragRenderableItem>(params: {
  item: T;
  placedItem: PackedGridItem<T>;
  gridColumnWidth: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  selectionMode: boolean;
  activeDragId: string | null;
  projectionOffsets: ReadonlyMap<string, ProjectionOffset>;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  rootDragVisualState: RootDragVisualState;
}): RootGridItemRenderState {
  const itemRect = getPackedGridItemRenderRect({
    placedItem: params.placedItem,
    gridColumnWidth: params.gridColumnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
    minWidth: params.item.layout.width,
    height: params.item.layout.height,
  });
  const visualState = resolveRootDragItemVisualState({
    shortcut: params.item.shortcut,
    shortcutId: params.item.shortcut.id,
    visualState: params.rootDragVisualState,
  });

  return {
    itemRect,
    frameState: resolveGridDragFrameState({
      itemId: params.item.sortId,
      hiddenItemId: params.activeDragId,
      activeDragId: params.activeDragId,
      reorderProjectionOffsets: params.projectionOffsets,
      layoutShiftOffsets: params.layoutShiftOffsets,
      invertReorderProjection: true,
    }),
    visualState,
    selectionDisabled: Boolean(params.selectionMode && params.item.shortcut.kind === 'folder'),
    selectionIndicatorVisible: Boolean(params.selectionMode && params.item.shortcut.kind !== 'folder'),
  };
}

export function resolveRootDragRenderState<T extends RootDragRenderableItem>(params: {
  items: readonly T[];
  shortcuts: Shortcut[];
  layoutSnapshot: Array<MeasuredDragItem<T>> | null;
  activeSortId: string | null;
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  rootElement: HTMLDivElement | null;
  usesSpanAwareReorder: boolean;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
}): {
  projectionOffsets: Map<string, ProjectionOffset>;
  projectedDropPreview: ProjectedDropPreview | null;
  visualState: RootDragVisualState;
} {
  const projectionOffsets = buildRootReorderProjectionOffsets({
    items: params.items,
    layoutSnapshot: params.layoutSnapshot,
    activeSortId: params.activeSortId,
    hoverIntent: params.hoverResolution.visualProjectionIntent,
  });

  const basePreview = buildRootProjectedDropPreview({
    items: params.items,
    shortcuts: params.shortcuts,
    layoutSnapshot: params.layoutSnapshot,
    activeSortId: params.activeSortId,
    hoverIntent: params.hoverResolution.visualProjectionIntent,
    rootElement: params.rootElement,
    usesSpanAwareReorder: params.usesSpanAwareReorder,
    gridColumns: params.gridColumns,
    gridColumnWidth: params.gridColumnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
  });
  const visualState = resolveRootDragVisualState(
    params.hoverResolution.interactionIntent,
    basePreview?.opacity,
  );

  return {
    projectionOffsets,
    projectedDropPreview: basePreview
      ? {
          ...basePreview,
          opacity: visualState.dropPreviewOpacity,
        }
      : null,
    visualState,
  };
}
