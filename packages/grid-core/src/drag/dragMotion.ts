import type { ProjectionOffset } from './gridDragEngine';

export type PositionedRect = Pick<DOMRect, 'left' | 'top'>;

export function measureDragItemRects(itemElements: Map<string, HTMLDivElement>): Map<string, DOMRect> {
  const rects = new Map<string, DOMRect>();
  itemElements.forEach((element, itemId) => {
    rects.set(itemId, element.getBoundingClientRect());
  });
  return rects;
}

export function buildLayoutShiftOffsets(params: {
  previousRects: Map<string, PositionedRect> | null;
  currentRects: Map<string, PositionedRect>;
  minDistancePx: number;
}): Map<string, ProjectionOffset> {
  const { previousRects, currentRects, minDistancePx } = params;
  const offsets = new Map<string, ProjectionOffset>();
  if (!previousRects || currentRects.size === 0) {
    return offsets;
  }

  currentRects.forEach((currentRect, itemId) => {
    const previousRect = previousRects.get(itemId);
    if (!previousRect) return;

    const offsetX = previousRect.left - currentRect.left;
    const offsetY = previousRect.top - currentRect.top;
    if (Math.abs(offsetX) < minDistancePx && Math.abs(offsetY) < minDistancePx) {
      return;
    }

    offsets.set(itemId, { x: offsetX, y: offsetY });
  });

  return offsets;
}

export function combineProjectionOffsets(
  ...offsets: Array<ProjectionOffset | null | undefined>
): ProjectionOffset | null {
  const resolved = offsets.filter((offset): offset is ProjectionOffset => Boolean(offset));
  if (resolved.length === 0) return null;

  return resolved.reduce<ProjectionOffset>((combined, offset) => ({
    x: combined.x + offset.x,
    y: combined.y + offset.y,
  }), { x: 0, y: 0 });
}
