import type { PointerPoint } from './gridDragEngine';

export const POINTER_DRAG_ACTIVATION_DISTANCE_PX = 8;

export type DragAnchor = {
  xRatio: number;
  yRatio: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function hasPointerDragActivated(params: {
  origin: PointerPoint;
  pointer: PointerPoint;
  activationDistancePx?: number;
}): boolean {
  const { origin, pointer, activationDistancePx = POINTER_DRAG_ACTIVATION_DISTANCE_PX } = params;
  return Math.hypot(pointer.x - origin.x, pointer.y - origin.y) >= activationDistancePx;
}

export function buildPreviewOffsetFromPointer(params: {
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
  pointer: PointerPoint;
}): PointerPoint {
  const { rect, pointer } = params;
  return {
    x: clamp(pointer.x - rect.left, 0, rect.width),
    y: clamp(pointer.y - rect.top, 0, rect.height),
  };
}

export function buildPreviewOffsetFromAnchor(params: {
  rect: Pick<DOMRect, 'width' | 'height'>;
  anchor: DragAnchor;
}): PointerPoint {
  const { rect, anchor } = params;
  return {
    x: clamp(rect.width * anchor.xRatio, 0, rect.width),
    y: clamp(rect.height * anchor.yRatio, 0, rect.height),
  };
}

export function buildDragAnchor(params: {
  rect: Pick<DOMRect, 'width' | 'height'>;
  previewOffset: PointerPoint;
}): DragAnchor {
  const { rect, previewOffset } = params;
  return {
    xRatio: rect.width > 0 ? clamp(previewOffset.x / rect.width, 0, 1) : 0.5,
    yRatio: rect.height > 0 ? clamp(previewOffset.y / rect.height, 0, 1) : 0.5,
  };
}
