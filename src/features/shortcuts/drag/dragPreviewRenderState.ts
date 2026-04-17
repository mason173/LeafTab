import type { DragSettlePreview } from './useDragMotionState';
import type { DragPoint } from './types';

export function resolveActiveDragPreviewItem<T>(params: {
  items: readonly T[];
  activeDragId: string | null;
  getId: (item: T) => string;
}): T | null {
  const { items, activeDragId, getId } = params;
  if (!activeDragId) {
    return null;
  }

  return items.find((item) => getId(item) === activeDragId) ?? null;
}

export function buildPointerDragOverlayTransform(params: {
  pointer: DragPoint;
  previewOffset: DragPoint;
  threeDimensional?: boolean;
}): string {
  const { pointer, previewOffset, threeDimensional = false } = params;
  const x = pointer.x - previewOffset.x;
  const y = pointer.y - previewOffset.y;

  return threeDimensional
    ? `translate3d(${x}px, ${y}px, 0)`
    : `translate(${x}px, ${y}px)`;
}

export function buildSettlingDragOverlayTransform<T>(preview: DragSettlePreview<T>): string {
  const left = preview.settling ? preview.toLeft : preview.fromLeft;
  const top = preview.settling ? preview.toTop : preview.fromTop;

  return `translate3d(${left}px, ${top}px, 0)`;
}
