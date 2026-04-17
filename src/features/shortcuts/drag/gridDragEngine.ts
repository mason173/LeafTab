import type { DragPoint, DragRect } from './types';

export type PointerPoint = DragPoint;
export type ProjectionOffset = {
  x: number;
  y: number;
};

export type PendingPointerDragState = {
  pointerId: number;
  pointerType: string;
  origin: PointerPoint;
};

export type ActivePointerDragState = PendingPointerDragState & {
  pointer: PointerPoint;
  previewOffset: PointerPoint;
};

export type MeasuredDragItem<T = unknown> = T & {
  rect: DragRect;
};

export function pointInRect(point: PointerPoint, rect: DragRect): boolean {
  return point.x >= rect.left
    && point.x <= rect.right
    && point.y >= rect.top
    && point.y <= rect.bottom;
}

export function distanceToRect(point: PointerPoint, rect: DragRect): number {
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
  return Math.hypot(dx, dy);
}

export function distanceToRectCenter(point: PointerPoint, rect: DragRect): number {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  return Math.hypot(point.x - centerX, point.y - centerY);
}

export function measureDragItems<T>(params: {
  items: readonly T[];
  resolveRect: (item: T) => DragRect | null;
}): Array<MeasuredDragItem<T>> {
  const { items, resolveRect } = params;
  return items.flatMap((item) => {
    const rect = resolveRect(item);
    return rect ? [{ ...item, rect }] : [];
  });
}

export function buildReorderProjectionOffsets<T>(params: {
  items: readonly T[];
  layoutSnapshot: Array<T & { rect: DragRect }>;
  activeId: string;
  hoveredId: string | null;
  targetIndex: number | null;
  getId: (item: T) => string;
}): Map<string, ProjectionOffset> {
  const { items, layoutSnapshot, activeId, hoveredId, targetIndex, getId } = params;
  if (!hoveredId || targetIndex === null) {
    return new Map();
  }

  const orderedIds = items.map((item) => getId(item));
  const activeIndex = orderedIds.indexOf(activeId);
  if (activeIndex === -1) {
    return new Map();
  }

  const previewOrder = [...orderedIds];
  previewOrder.splice(activeIndex, 1);
  previewOrder.splice(Math.max(0, Math.min(targetIndex, previewOrder.length)), 0, activeId);

  const oldRects = new Map(layoutSnapshot.map((item) => [getId(item), item.rect] as const));
  const slotRects = previewOrder.map((_, index) => layoutSnapshot[index]?.rect ?? null);
  const offsets = new Map<string, ProjectionOffset>();

  previewOrder.forEach((id, previewIndex) => {
    if (id === activeId) return;
    const oldRect = oldRects.get(id);
    const nextRect = slotRects[previewIndex];
    if (!oldRect || !nextRect) return;
    const offset = {
      x: oldRect.left - nextRect.left,
      y: oldRect.top - nextRect.top,
    };
    if (offset.x === 0 && offset.y === 0) return;
    offsets.set(id, offset);
  });

  return offsets;
}

export function getDragVisualCenter(params: {
  pointer: PointerPoint;
  previewOffset: PointerPoint;
  activeRect: Pick<DragRect, 'width' | 'height'>;
  visualRect?: {
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  };
}): PointerPoint {
  const { pointer, previewOffset, activeRect, visualRect } = params;
  const baseLeft = pointer.x - previewOffset.x;
  const baseTop = pointer.y - previewOffset.y;

  if (visualRect) {
    return {
      x: baseLeft + visualRect.offsetX + visualRect.width / 2,
      y: baseTop + visualRect.offsetY + visualRect.height / 2,
    };
  }

  return {
    x: baseLeft + activeRect.width / 2,
    y: baseTop + activeRect.height / 2,
  };
}
