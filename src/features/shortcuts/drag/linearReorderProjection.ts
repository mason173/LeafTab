import type { MeasuredDragItem } from './gridDragEngine';
import type { RootDropEdge, RootShortcutDropIntent } from './types';

export type DragPreviewLayoutMetrics = {
  previewOffsetX: number;
  previewOffsetY: number;
  previewWidth: number;
  previewHeight: number;
  previewBorderRadius?: string;
};

export type ProjectedDropPreview = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius?: string;
  opacity?: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function resolveLinearReorderTargetIndex<T>(params: {
  items: readonly T[];
  activeId: string;
  overId: string;
  edge: RootDropEdge;
  getId: (item: T) => string;
}): number | null {
  const { items, activeId, overId, edge, getId } = params;
  const activeIndex = items.findIndex((item) => getId(item) === activeId);
  const overIndex = items.findIndex((item) => getId(item) === overId);
  if (activeIndex < 0 || overIndex < 0) {
    return null;
  }

  const rawIndex = overIndex + (edge === 'after' ? 1 : 0);
  return activeIndex < rawIndex ? rawIndex - 1 : rawIndex;
}

export function buildLinearProjectedDragSettleTarget<T>(params: {
  items: readonly T[];
  layoutSnapshot: Array<MeasuredDragItem<T>> | null;
  activeId: string;
  hoverIntent: RootShortcutDropIntent | null;
  getId: (item: T) => string;
  resolveTargetIndex?: (hoverIntent: Extract<RootShortcutDropIntent, { type: 'reorder-root' }>) => number | null;
}): { left: number; top: number } | null {
  const { items, layoutSnapshot, activeId, hoverIntent, getId, resolveTargetIndex } = params;
  if (!layoutSnapshot) {
    return null;
  }

  const activeIndex = items.findIndex((item) => getId(item) === activeId);
  const snapshotById = new Map(layoutSnapshot.map((item) => [getId(item), item.rect] as const));
  const activeSnapshot = snapshotById.get(activeId) ?? null;
  if (activeIndex < 0 || !activeSnapshot) {
    return null;
  }

  if (!hoverIntent || hoverIntent.type !== 'reorder-root') {
    return { left: activeSnapshot.left, top: activeSnapshot.top };
  }

  const targetIndex = resolveTargetIndex
    ? resolveTargetIndex(hoverIntent)
    : hoverIntent.targetIndex ?? resolveLinearReorderTargetIndex({
        items,
        activeId,
        overId: hoverIntent.overShortcutId,
        edge: hoverIntent.edge,
        getId,
      });
  const orderedRects = items
    .map((item) => snapshotById.get(getId(item)) ?? null)
    .filter((rect): rect is NonNullable<typeof rect> => Boolean(rect));

  if (targetIndex === null || orderedRects.length === 0) {
    return { left: activeSnapshot.left, top: activeSnapshot.top };
  }

  const targetRect = orderedRects[clamp(targetIndex, 0, orderedRects.length - 1)] ?? activeSnapshot;
  return {
    left: targetRect.left,
    top: targetRect.top,
  };
}

export function buildLinearProjectedDropPreview<T>(params: {
  items: readonly T[];
  layoutSnapshot: Array<MeasuredDragItem<T>> | null;
  activeId: string | null;
  hoverIntent: RootShortcutDropIntent | null;
  rootElement: HTMLDivElement | null;
  getId: (item: T) => string;
  getLayout: (item: T) => DragPreviewLayoutMetrics;
  resolveTargetIndex?: (hoverIntent: Extract<RootShortcutDropIntent, { type: 'reorder-root' }>) => number | null;
}): ProjectedDropPreview | null {
  const { items, layoutSnapshot, activeId, hoverIntent, rootElement, getId, getLayout, resolveTargetIndex } = params;
  if (!layoutSnapshot || !activeId || !rootElement) {
    return null;
  }

  const activeItem = items.find((item) => getId(item) === activeId);
  if (!activeItem) {
    return null;
  }

  const target = buildLinearProjectedDragSettleTarget({
    items,
    layoutSnapshot,
    activeId,
    hoverIntent,
    getId,
    resolveTargetIndex,
  });
  if (!target) {
    return null;
  }

  const rootRect = rootElement.getBoundingClientRect();
  const layout = getLayout(activeItem);
  return {
    left: target.left - rootRect.left + layout.previewOffsetX,
    top: target.top - rootRect.top + layout.previewOffsetY,
    width: layout.previewWidth,
    height: layout.previewHeight,
    borderRadius: layout.previewBorderRadius,
  };
}
