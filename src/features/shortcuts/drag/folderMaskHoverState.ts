import { createEmptyDragHoverResolution, type DragHoverResolution } from './dragSessionRuntime';
import type { DragPoint, RootShortcutDropIntent } from './types';

export type FolderMaskHoverState = {
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  hoveredMask: boolean;
  recognitionPoint: DragPoint | null;
  shouldScheduleExtractHandoff: boolean;
};

export function resolveFolderMaskHoverState(params: {
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  recognitionPoint: DragPoint | null;
  boundaryRect: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'> | null;
}): FolderMaskHoverState {
  const { hoverResolution, recognitionPoint, boundaryRect } = params;
  const emptyHoverResolution = createEmptyDragHoverResolution<RootShortcutDropIntent>();

  if (!recognitionPoint) {
    return {
      hoverResolution: emptyHoverResolution,
      hoveredMask: false,
      recognitionPoint: null,
      shouldScheduleExtractHandoff: false,
    };
  }

  const withinBoundary = boundaryRect
    ? recognitionPoint.x >= boundaryRect.left
      && recognitionPoint.x <= boundaryRect.right
      && recognitionPoint.y >= boundaryRect.top
      && recognitionPoint.y <= boundaryRect.bottom
    : true;

  if (!withinBoundary) {
    return {
      hoverResolution: emptyHoverResolution,
      hoveredMask: true,
      recognitionPoint,
      shouldScheduleExtractHandoff: true,
    };
  }

  return {
    hoverResolution,
    hoveredMask: false,
    recognitionPoint,
    shouldScheduleExtractHandoff: false,
  };
}
