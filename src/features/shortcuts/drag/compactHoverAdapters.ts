import type { Shortcut } from '@/types';
import { reorderRootShortcutPreservingLargeFolderPositions } from '@/features/shortcuts/model/operations';
import { resolveMeasuredCompactHoverState } from './compactHoverState';
import {
  resolveCompactReorderOnlyHoverResolution,
  resolveCompactRootHoverResolution,
  type CompactTargetRegions,
} from './compactRootDrag';
import type { DragHoverResolution } from './dragSessionRuntime';
import { buildFolderReorderProjectionOffsets, type FolderDragRenderableItem } from './folderDragRenderState';
import { getProjectedGridItemRect, packGridItems } from './gridLayout';
import type { MeasuredDragItem } from './gridDragEngine';
import { buildRootReorderProjectionOffsets, type RootDragRenderableItem } from './rootDragRenderState';
import type { DragPoint, DragRect, RootDragDirectionMap, RootShortcutDropIntent } from './types';

export function buildRootSlotIntent<T extends RootDragRenderableItem>(params: {
  items: readonly T[];
  shortcuts: Shortcut[];
  activeSortId: string;
  recognitionPoint: DragPoint;
  rootRect: DOMRect;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
}): RootShortcutDropIntent | null {
  const {
    items,
    shortcuts,
    activeSortId,
    recognitionPoint,
    rootRect,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
  } = params;
  if (!gridColumnWidth) {
    return null;
  }

  let bestIntent: RootShortcutDropIntent | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const activeIndex = items.findIndex((item) => item.sortId === activeSortId);
  const itemById = new Map(items.map((item) => [item.shortcut.id, item] as const));

  for (let targetIndex = 0; targetIndex < items.length; targetIndex += 1) {
    const nextShortcuts = reorderRootShortcutPreservingLargeFolderPositions(shortcuts, activeSortId, targetIndex);
    if (!nextShortcuts) continue;

    const projectedItems = nextShortcuts
      .map((shortcut) => itemById.get(shortcut.id) ?? null)
      .filter((item): item is T => Boolean(item));
    const packedLayout = packGridItems({
      items: projectedItems,
      gridColumns,
      getSpan: (item) => ({
        columnSpan: item.layout.columnSpan,
        rowSpan: item.layout.rowSpan,
      }),
    });
    const placedActive = packedLayout.placedItems.find((item) => item.sortId === activeSortId);
    const activeProjectedItem = projectedItems.find((item) => item.sortId === activeSortId);
    if (!placedActive || !activeProjectedItem) continue;

    const projectedRect = getProjectedGridItemRect({
      placedItem: placedActive,
      gridColumnWidth,
      columnGap,
      rowHeight,
      rowGap,
      width: activeProjectedItem.layout.width,
      height: activeProjectedItem.layout.height,
    });
    const centerX = rootRect.left + projectedRect.left + projectedRect.width / 2;
    const centerY = rootRect.top + projectedRect.top + projectedRect.height / 2;
    const distance = Math.hypot(recognitionPoint.x - centerX, recognitionPoint.y - centerY);
    if (distance >= bestDistance) continue;

    const overShortcut = shortcuts[Math.min(targetIndex, shortcuts.length - 1)];
    if (!overShortcut) continue;

    bestDistance = distance;
    bestIntent = {
      type: 'reorder-root',
      activeShortcutId: activeSortId,
      overShortcutId: overShortcut.id,
      targetIndex,
      edge: targetIndex > activeIndex ? 'after' : 'before',
    };
  }

  return bestIntent;
}

export function resolveRootCompactHoverState<T extends RootDragRenderableItem>(params: {
  items: readonly T[];
  shortcuts: Shortcut[];
  activeId: string;
  pointer: DragPoint;
  previewOffset: DragPoint;
  measuredItems: readonly MeasuredDragItem<T>[];
  previousRecognitionPoint?: DragPoint | null;
  previousHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  directionMap: RootDragDirectionMap;
  createEmptyHoverResolution: () => DragHoverResolution<RootShortcutDropIntent>;
  rootRect: DOMRect;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  resolveRegions: (item: MeasuredDragItem<T>) => CompactTargetRegions;
}) {
  const {
    items,
    shortcuts,
    activeId,
    pointer,
    previewOffset,
    measuredItems,
    previousRecognitionPoint = null,
    previousHoverResolution,
    createEmptyHoverResolution,
    directionMap,
    rootRect,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
    resolveRegions,
  } = params;

  return resolveMeasuredCompactHoverState({
    activeId,
    pointer,
    previewOffset,
    measuredItems,
    previousRecognitionPoint,
    previousHoverResolution,
    createEmptyHoverResolution,
    getId: (item) => item.sortId,
    getVisualBounds: (item) => ({
      offsetX: item.layout.previewOffsetX,
      offsetY: item.layout.previewOffsetY,
      width: item.layout.previewWidth,
      height: item.layout.previewHeight,
    }),
    resolveHoverResolution: ({
      activeId: nextActiveId,
      measuredItems: nextMeasuredItems,
      previousRecognitionPoint: nextPreviousRecognitionPoint,
      previousHoverResolution: nextPreviousHoverResolution,
      recognitionPoint,
    }) => {
      const slotIntent = buildRootSlotIntent({
        items,
        shortcuts,
        activeSortId: nextActiveId,
        recognitionPoint,
        rootRect,
        gridColumns,
        gridColumnWidth,
        columnGap,
        rowHeight,
        rowGap,
      });

      const nextResolution = resolveCompactRootHoverResolution({
        activeSortId: nextActiveId,
        recognitionPoint,
        previousRecognitionPoint: nextPreviousRecognitionPoint,
        measuredItems: nextMeasuredItems,
        items,
        previousInteractionIntent: nextPreviousHoverResolution.interactionIntent,
        previousVisualProjectionIntent: nextPreviousHoverResolution.visualProjectionIntent,
        directionMap,
        interactionProjectionOffsets: buildRootReorderProjectionOffsets({
          items,
          layoutSnapshot: Array.from(nextMeasuredItems),
          activeSortId: nextActiveId,
          hoverIntent: nextPreviousHoverResolution.interactionIntent,
        }),
        visualProjectionOffsets: buildRootReorderProjectionOffsets({
          items,
          layoutSnapshot: Array.from(nextMeasuredItems),
          activeSortId: nextActiveId,
          hoverIntent: nextPreviousHoverResolution.visualProjectionIntent,
        }),
        resolveRegions,
        slotIntent,
        columnGap,
        rowGap,
      });

      return {
        interactionIntent: nextResolution.interactionIntent,
        visualProjectionIntent: nextResolution.visualProjectionIntent,
      };
    },
  });
}

export function resolveFolderCompactHoverState<T extends FolderDragRenderableItem>(params: {
  activeId: string;
  pointer: DragPoint;
  previewOffset: DragPoint;
  measuredItems: readonly MeasuredDragItem<T>[];
  previousRecognitionPoint?: DragPoint | null;
  previousHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  createEmptyHoverResolution: () => DragHoverResolution<RootShortcutDropIntent>;
  shortcuts: Shortcut[];
  resolveRegions: (item: MeasuredDragItem<T>) => CompactTargetRegions;
}) {
  const {
    activeId,
    pointer,
    previewOffset,
    measuredItems,
    previousRecognitionPoint = null,
    previousHoverResolution,
    createEmptyHoverResolution,
    shortcuts,
    resolveRegions,
  } = params;

  return resolveMeasuredCompactHoverState({
    activeId,
    pointer,
    previewOffset,
    measuredItems,
    previousRecognitionPoint,
    previousHoverResolution,
    createEmptyHoverResolution,
    getId: (item) => item.shortcut.id,
    getVisualBounds: (item) => ({
      offsetX: item.layout.previewOffsetX,
      offsetY: item.layout.previewOffsetY,
      width: item.layout.previewWidth,
      height: item.layout.previewHeight,
    }),
    resolveHoverResolution: ({
      activeId: nextActiveId,
      activeVisualRect,
      measuredItems: nextMeasuredItems,
      previousRecognitionPoint: nextPreviousRecognitionPoint,
      previousHoverResolution: nextPreviousHoverResolution,
      recognitionPoint,
    }) => resolveCompactReorderOnlyHoverResolution({
      activeSortId: nextActiveId,
      recognitionPoint,
      previousRecognitionPoint: nextPreviousRecognitionPoint,
      activeVisualRect: activeVisualRect as DragRect,
      measuredItems: nextMeasuredItems,
      items: nextMeasuredItems,
      previousInteractionIntent: nextPreviousHoverResolution.interactionIntent,
      previousVisualProjectionIntent: nextPreviousHoverResolution.visualProjectionIntent,
      interactionProjectionOffsets: buildFolderReorderProjectionOffsets({
        shortcuts,
        layoutSnapshot: Array.from(nextMeasuredItems),
        activeShortcutId: nextActiveId,
        hoverIntent: nextPreviousHoverResolution.interactionIntent,
      }),
      visualProjectionOffsets: buildFolderReorderProjectionOffsets({
        shortcuts,
        layoutSnapshot: Array.from(nextMeasuredItems),
        activeShortcutId: nextActiveId,
        hoverIntent: nextPreviousHoverResolution.visualProjectionIntent,
      }),
      resolveRegions,
      columnGap: 16,
      rowGap: 20,
    }),
  });
}
