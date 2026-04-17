import type { DragPoint, DragRect } from './types';

export type DragAnchor = {
  xRatio: number;
  yRatio: number;
};

export const POINTER_DRAG_ACTIVATION_DISTANCE_PX = 6;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function hasPointerDragActivated(params: {
  origin: DragPoint;
  pointer: DragPoint;
}): boolean {
  const { origin, pointer } = params;
  const distance = Math.hypot(pointer.x - origin.x, pointer.y - origin.y);
  return distance >= POINTER_DRAG_ACTIVATION_DISTANCE_PX;
}

export function buildPreviewOffsetFromPointer(params: {
  rect: Pick<DragRect, 'left' | 'top' | 'width' | 'height'>;
  pointer: DragPoint;
}): DragPoint {
  const { rect, pointer } = params;
  return {
    x: clamp(pointer.x - rect.left, 0, rect.width),
    y: clamp(pointer.y - rect.top, 0, rect.height),
  };
}

export function buildPreviewOffsetFromAnchor(params: {
  rect: Pick<DragRect, 'width' | 'height'>;
  anchor: DragAnchor;
}): DragPoint {
  const { rect, anchor } = params;
  return {
    x: rect.width * clamp(anchor.xRatio, 0, 1),
    y: rect.height * clamp(anchor.yRatio, 0, 1),
  };
}

export function buildDragAnchor(params: {
  rect: Pick<DragRect, 'width' | 'height'>;
  previewOffset: DragPoint;
}): DragAnchor {
  const { rect, previewOffset } = params;
  if (rect.width <= 0 || rect.height <= 0) {
    return {
      xRatio: 0.5,
      yRatio: 0.5,
    };
  }

  return {
    xRatio: clamp(previewOffset.x / rect.width, 0, 1),
    yRatio: clamp(previewOffset.y / rect.height, 0, 1),
  };
}
