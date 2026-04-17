import { createEmptyDragHoverResolution, type DragHoverResolution } from './dragSessionRuntime';
import type { DragPoint, RootDragActiveTarget, RootShortcutDropIntent } from './types';

export type FolderMaskHoverState = {
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  activeTarget: RootDragActiveTarget | null;
  hoveredMask: boolean;
  recognitionPoint: DragPoint | null;
  shouldScheduleExtractHandoff: boolean;
};

export function resolveFolderMaskHoverState(params: {
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  activeTarget: RootDragActiveTarget | null;
  recognitionPoint: DragPoint | null;
  boundaryRect: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'> | null;
}): FolderMaskHoverState {
  const { hoverResolution, activeTarget, recognitionPoint, boundaryRect } = params;
  const emptyHoverResolution = createEmptyDragHoverResolution<RootShortcutDropIntent>();

  if (!recognitionPoint) {
    return {
      hoverResolution: emptyHoverResolution,
      activeTarget: null,
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
      activeTarget: null,
      hoveredMask: true,
      recognitionPoint,
      shouldScheduleExtractHandoff: true,
    };
  }

  return {
    hoverResolution,
    activeTarget,
    hoveredMask: false,
    recognitionPoint,
    shouldScheduleExtractHandoff: false,
  };
}
