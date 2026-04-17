import { deriveDragSessionGeometry, type DragHoverResolution, type DragSessionVisualBounds } from './dragSessionRuntime';
import type { MeasuredDragItem } from './gridDragEngine';
import type { DragPoint, DragRect } from './types';

export type CompactHoverState<TItem, TIntent> = {
  activeItem: MeasuredDragItem<TItem> | null;
  activeVisualRect: DragRect | null;
  hoverResolution: DragHoverResolution<TIntent>;
  recognitionPoint: DragPoint | null;
};

export function resolveMeasuredCompactHoverState<TItem, TIntent>(params: {
  activeId: string;
  pointer: DragPoint;
  previewOffset: DragPoint;
  measuredItems: readonly MeasuredDragItem<TItem>[];
  previousRecognitionPoint?: DragPoint | null;
  previousHoverResolution: DragHoverResolution<TIntent>;
  createEmptyHoverResolution: () => DragHoverResolution<TIntent>;
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
  }) => DragHoverResolution<TIntent>;
}): CompactHoverState<TItem, TIntent> {
  const {
    activeId,
    pointer,
    previewOffset,
    measuredItems,
    previousRecognitionPoint = null,
    previousHoverResolution,
    createEmptyHoverResolution,
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
    hoverResolution: resolveHoverResolution({
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
