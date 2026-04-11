export type PointerPoint = { x: number; y: number };

export type PendingPointerDragState<TId extends string = string> = {
  pointerId: number;
  pointerType: string;
  activeId: TId;
  origin: PointerPoint;
  current?: PointerPoint;
  previewOffset: PointerPoint;
};

export type ActivePointerDragState<TId extends string = string> = {
  pointerId: number;
  pointerType: string;
  activeId: TId;
  pointer: PointerPoint;
  previewOffset: PointerPoint;
};

export type ProjectionOffset = {
  x: number;
  y: number;
};

export type MeasuredDragItem<TItem> = TItem & {
  rect: DOMRect;
};

export function pointInRect(point: PointerPoint, rect: DOMRect): boolean {
  return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

export function distanceToRect(point: PointerPoint, rect: DOMRect): number {
  const dx = point.x < rect.left ? rect.left - point.x : point.x > rect.right ? point.x - rect.right : 0;
  const dy = point.y < rect.top ? rect.top - point.y : point.y > rect.bottom ? point.y - rect.bottom : 0;
  return Math.hypot(dx, dy);
}

export function distanceToRectCenter(point: PointerPoint, rect: DOMRect): number {
  return Math.hypot(point.x - (rect.left + rect.width / 2), point.y - (rect.top + rect.height / 2));
}

export function getDragVisualCenter(params: {
  pointer: PointerPoint;
  previewOffset: PointerPoint;
  activeRect: DOMRect;
}): PointerPoint {
  const { pointer, previewOffset, activeRect } = params;
  const visualLeft = pointer.x - previewOffset.x;
  const visualTop = pointer.y - previewOffset.y;

  return {
    x: visualLeft + activeRect.width / 2,
    y: visualTop + activeRect.height / 2,
  };
}

export function measureDragItems<TItem>(params: {
  items: TItem[];
  itemElements: Map<string, HTMLDivElement>;
  getId: (item: TItem) => string;
}): MeasuredDragItem<TItem>[] {
  const { items, itemElements, getId } = params;
  return items.flatMap((item) => {
    const element = itemElements.get(getId(item));
    if (!element) return [];
    return [{ ...item, rect: element.getBoundingClientRect() }];
  });
}

export function pickClosestMeasuredItem<TItem>(params: {
  activeId: string;
  measuredItems: MeasuredDragItem<TItem>[];
  pointer: PointerPoint;
  getId: (item: MeasuredDragItem<TItem>) => string;
  maxDistance: number;
}): MeasuredDragItem<TItem> | null {
  const { activeId, measuredItems, pointer, getId, maxDistance } = params;
  const activeItem = measuredItems.find((item) => getId(item) === activeId) ?? null;
  if (activeItem && pointInRect(pointer, activeItem.rect)) {
    return null;
  }

  const ranked = measuredItems
    .filter((item) => getId(item) !== activeId)
    .map((item) => ({
      item,
      distance: distanceToRect(pointer, item.rect),
      centerDistance: distanceToRectCenter(pointer, item.rect),
    }))
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.centerDistance - b.centerDistance;
    });

  const best = ranked[0];
  if (!best || best.distance > maxDistance) return null;
  return best.item;
}

export function buildReorderProjectionOffsets<TItem>(params: {
  items: TItem[];
  layoutSnapshot: MeasuredDragItem<TItem>[] | null;
  activeId: string | null;
  hoveredId: string | null;
  targetIndex: number | null;
  getId: (item: TItem) => string;
}): Map<string, ProjectionOffset> {
  const { items, layoutSnapshot, activeId, hoveredId, targetIndex, getId } = params;
  const offsets = new Map<string, ProjectionOffset>();
  if (!layoutSnapshot || !activeId || !hoveredId || targetIndex == null) {
    return offsets;
  }

  const originalOrder = items.map(getId);
  const activeIndex = originalOrder.indexOf(activeId);
  if (activeIndex < 0) return offsets;

  const snapshotById = new Map(layoutSnapshot.map((item) => [getId(item), item]));
  const projectedOrder = [...originalOrder];
  const [activeEntry] = projectedOrder.splice(activeIndex, 1);
  projectedOrder.splice(targetIndex, 0, activeEntry);

  projectedOrder.forEach((id, projectedIndex) => {
    if (id === activeId) return;

    const snapshot = snapshotById.get(id);
    const slotId = originalOrder[projectedIndex];
    const slotSnapshot = slotId ? snapshotById.get(slotId) : null;
    if (!snapshot || !slotSnapshot) return;

    const dx = slotSnapshot.rect.left - snapshot.rect.left;
    const dy = slotSnapshot.rect.top - snapshot.rect.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    offsets.set(id, { x: dx, y: dy });
  });

  return offsets;
}
