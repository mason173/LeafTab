import type { Shortcut } from '@/types';
import type { MeasuredDragItem } from './gridDragEngine';
import { resolveRootCompactHoverState } from './compactHoverAdapters';
import type { CompactTargetRegions } from './compactRootDrag';
import type { DragHoverResolution } from './dragSessionRuntime';
import type { RootDragRenderableItem } from './rootDragRenderState';
import type { DragPoint, RootDragDirectionMap, RootShortcutDropIntent } from './types';

export function resolveRootPointerHoverState<T extends RootDragRenderableItem>(params: {
  items: readonly T[];
  shortcuts: Shortcut[];
  activeId: string;
  pointer: DragPoint;
  previewOffset: DragPoint;
  measuredItems: readonly MeasuredDragItem<T>[];
  previousRecognitionPoint?: DragPoint | null;
  previousHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  directionMap: RootDragDirectionMap;
  rootRect: DOMRect;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  resolveRegions: (item: MeasuredDragItem<T>) => CompactTargetRegions;
}) {
  const nextHoverState = resolveRootCompactHoverState({
    items: params.items,
    shortcuts: params.shortcuts,
    activeId: params.activeId,
    pointer: params.pointer,
    previewOffset: params.previewOffset,
    measuredItems: params.measuredItems,
    previousRecognitionPoint: params.previousRecognitionPoint,
    previousHoverResolution: params.previousHoverResolution,
    directionMap: params.directionMap,
    createEmptyHoverResolution: () => ({
      interactionIntent: null,
      visualProjectionIntent: null,
    }),
    rootRect: params.rootRect,
    gridColumns: params.gridColumns,
    gridColumnWidth: params.gridColumnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
    resolveRegions: params.resolveRegions,
  });

  return {
    hoverResolution: nextHoverState.hoverResolution,
    recognitionPoint: nextHoverState.recognitionPoint,
  };
}
