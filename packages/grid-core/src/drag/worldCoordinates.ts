import type { PointerPoint } from './gridDragEngine';

export type ScrollOffset = {
  x: number;
  y: number;
};

export type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export function toGlobalPoint(point: PointerPoint, scrollOffset: ScrollOffset): PointerPoint {
  return {
    x: point.x + scrollOffset.x,
    y: point.y + scrollOffset.y,
  };
}

export function toViewportPoint(globalPoint: PointerPoint, scrollOffset: ScrollOffset): PointerPoint {
  return {
    x: globalPoint.x - scrollOffset.x,
    y: globalPoint.y - scrollOffset.y,
  };
}

export function offsetRect(rect: RectLike, scrollOffset: ScrollOffset): RectLike {
  return {
    left: rect.left + scrollOffset.x,
    top: rect.top + scrollOffset.y,
    right: rect.right + scrollOffset.x,
    bottom: rect.bottom + scrollOffset.y,
    width: rect.width,
    height: rect.height,
  };
}
