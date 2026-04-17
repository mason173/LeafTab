import { deriveDragSessionGeometry, type DragHoverResolution, type DragSessionVisualBounds } from './dragSessionRuntime';
import type { MeasuredDragItem } from './gridDragEngine';
import type { DragPoint, DragRect } from './types';

export type CompactHoverResolutionResult<TIntent, TResolved extends object = object> = {
  hoverResolution: DragHoverResolution<TIntent>;
} & TResolved;

export type CompactHoverState<TItem, TIntent, TResolved extends object = object> = {
  activeItem: MeasuredDragItem<TItem> | null;
  activeVisualRect: DragRect | null;
  hoverResolution: DragHoverResolution<TIntent>;
  recognitionPoint: DragPoint | null;
} & TResolved;

export function resolveMeasuredCompactHoverState<TItem, TIntent, TResolved extends object = object>(params: {
  activeId: string;
  pointer: DragPoint;
  previewOffset: DragPoint;
  measuredItems: readonly MeasuredDragItem<TItem>[];
  previousRecognitionPoint?: DragPoint | null;
  previousHoverResolution: DragHoverResolution<TIntent>;
  createEmptyHoverResolution: () => DragHoverResolution<TIntent>;
  createEmptyResolvedState: () => TResolved;
  getId: (item: MeasuredDragItem<TItem>) => string;
  getVisualBounds: (item: MeasuredDragItem<TItem>) => DragSessionVisualBounds;
  resolveHoverResolution: (params: {
    activeId: string;
    activeItem: MeasuredDragItem<TItem>;
    activeVisualRect: DragRect;
    measuredItems: readonly MeasuredDragItem<TItem>[];
    previousRecognitionPoint?: DragPoint | null;
    previousHoverResolution: DragHoverResolution<TIntent>;
    recognitionPoint: DragPoint;
  }) => CompactHoverResolutionResult<TIntent, TResolved>;
}): CompactHoverState<TItem, TIntent, TResolved> {
  const {
    activeId,
    pointer,
    previewOffset,
    measuredItems,
    previousRecognitionPoint = null,
    previousHoverResolution,
    createEmptyHoverResolution,
    createEmptyResolvedState,
    getId,
    getVisualBounds,
    resolveHoverResolution,
  } = params;
  const activeItem = measuredItems.find((item) => getId(item) === activeId) ?? null;
  if (!activeItem) {
    return {
      activeItem: null,
      activeVisualRect: null,
      hoverResolution: createEmptyHoverResolution(),
      recognitionPoint: null,
      ...createEmptyResolvedState(),
    };
  }

  const { recognitionPoint, visualRect } = deriveDragSessionGeometry({
    pointer,
    previewOffset,
    activeRect: activeItem.rect,
    visualBounds: getVisualBounds(activeItem),
  });

  return {
    activeItem,
    activeVisualRect: visualRect,
    ...resolveHoverResolution({
      activeId,
      activeItem,
      activeVisualRect: visualRect,
      measuredItems,
      previousRecognitionPoint,
      previousHoverResolution,
      recognitionPoint,
    }),
    recognitionPoint,
  };
}
