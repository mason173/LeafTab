import type { DragPoint, DragRect, RootDropEdge, RootShortcutDragItem } from './types';
import { resolveRootShortcutInsertionIndexPreservingLargeFolderPositions } from '@/features/shortcuts/model/operations';
import { resolveLinearReorderTargetIndex } from './linearReorderProjection';

function resolveCenterRect(rect: DragRect, centerRect?: DragRect): DragRect {
  if (centerRect) {
    return centerRect;
  }

  const insetX = rect.width * 0.2;
  const insetY = rect.height * 0.2;

  return {
    left: rect.left + insetX,
    top: rect.top + insetY,
    right: rect.right - insetX,
    bottom: rect.bottom - insetY,
    width: rect.width - insetX * 2,
    height: rect.height - insetY * 2,
  };
}

export function isPointInDropCenter(point: DragPoint, rect: DragRect, centerRect?: DragRect): boolean {
  const resolvedCenterRect = resolveCenterRect(rect, centerRect);
  return point.x >= resolvedCenterRect.left
    && point.x <= resolvedCenterRect.right
    && point.y >= resolvedCenterRect.top
    && point.y <= resolvedCenterRect.bottom;
}

export function getDropEdge(point: DragPoint, rect: DragRect): RootDropEdge {
  const leadingDistance = Math.min(point.x - rect.left, point.y - rect.top);
  const trailingDistance = Math.min(rect.right - point.x, rect.bottom - point.y);
  return leadingDistance <= trailingDistance ? 'before' : 'after';
}

export function getReorderTargetIndex(params: {
  items: readonly RootShortcutDragItem[];
  activeSortId: string;
  overSortId: string;
  edge: RootDropEdge;
}): number | null {
  const { items, activeSortId, overSortId, edge } = params;
  const rawTargetIndex = resolveLinearReorderTargetIndex({
    items,
    activeId: activeSortId,
    overId: overSortId,
    edge,
    getId: (item) => item.sortId,
  });
  if (rawTargetIndex === null) {
    return null;
  }

  return resolveRootShortcutInsertionIndexPreservingLargeFolderPositions(
    items.map((item) => item.shortcut),
    activeSortId,
    rawTargetIndex,
  );
}
