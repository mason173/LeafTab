export type PositionedRect = {
  left: number;
  top: number;
};

export type ProjectionOffset = {
  x: number;
  y: number;
};

export function buildLayoutShiftOffsets(params: {
  previousRects: ReadonlyMap<string, PositionedRect>;
  currentRects: ReadonlyMap<string, PositionedRect>;
  minDistancePx?: number;
}): Map<string, ProjectionOffset> {
  const { previousRects, currentRects, minDistancePx = 0.5 } = params;
  const offsets = new Map<string, ProjectionOffset>();

  currentRects.forEach((currentRect, id) => {
    const previousRect = previousRects.get(id);
    if (!previousRect) return;

    const x = previousRect.left - currentRect.left;
    const y = previousRect.top - currentRect.top;
    if (Math.hypot(x, y) < minDistancePx) return;
    offsets.set(id, { x, y });
  });

  return offsets;
}

export function combineProjectionOffsets(
  ...offsets: Array<ProjectionOffset | null | undefined>
): ProjectionOffset {
  return offsets.reduce<ProjectionOffset>((combined, offset) => ({
    x: combined.x + (offset?.x ?? 0),
    y: combined.y + (offset?.y ?? 0),
  }), { x: 0, y: 0 });
}

export function measureDragItemRects<T>(params: {
  items: readonly T[];
  getId: (item: T) => string;
  getRect: (item: T) => { left: number; top: number } | null;
}): Map<string, PositionedRect> {
  const { items, getId, getRect } = params;
  const rects = new Map<string, PositionedRect>();

  items.forEach((item) => {
    const rect = getRect(item);
    if (!rect) return;
    rects.set(getId(item), rect);
  });

  return rects;
}
