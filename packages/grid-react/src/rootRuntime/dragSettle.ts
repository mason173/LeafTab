import {
  type PointerPoint,
  type RootShortcutDropIntent,
  type ScrollOffset,
  type Shortcut,
} from '@leaftab/workspace-core';
import { offsetMeasuredRootGridItemsByScrollOffset, type MeasuredRootGridItem } from '../rootGeometry/measurement';
import { buildProjectedDragSettleTarget } from '../rootResolution/projection';
import { type RootShortcutGridItem } from '../rootShortcutGridHelpers';
import { type DragSettlePreview } from '../useDragMotionState';

type RootDragSettleSession = {
  activeSortId: string;
  pointer: PointerPoint;
  previewOffset: PointerPoint;
};

export function buildRootDragReleasePreview(params: {
  items: RootShortcutGridItem[];
  session: RootDragSettleSession;
  hoverIntent: RootShortcutDropIntent | null;
  layoutSnapshot: MeasuredRootGridItem[] | null;
  dragScrollOffset: ScrollOffset;
  rootElement: HTMLDivElement | null;
  usesSpanAwareReorder: boolean;
  frozenSortIds?: ReadonlySet<string> | null;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
}): Omit<DragSettlePreview<Shortcut>, 'settling'> | null {
  const {
    items,
    session,
    hoverIntent,
    layoutSnapshot,
    dragScrollOffset,
    rootElement,
    usesSpanAwareReorder,
    frozenSortIds = null,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
  } = params;

  const activeItem = items.find((item) => item.sortId === session.activeSortId) ?? null;
  const target = buildProjectedDragSettleTarget({
    items,
    layoutSnapshot: offsetMeasuredRootGridItemsByScrollOffset(layoutSnapshot, dragScrollOffset),
    activeSortId: session.activeSortId,
    hoverIntent,
    rootElement,
    usesSpanAwareReorder,
    frozenSortIds,
    gridColumns,
    gridColumnWidth,
    columnGap,
    rowHeight,
    rowGap,
  });

  if (!activeItem || !target) {
    return null;
  }

  return {
    itemId: session.activeSortId,
    item: activeItem.shortcut,
    fromLeft: session.pointer.x - session.previewOffset.x,
    fromTop: session.pointer.y - session.previewOffset.y,
    toLeft: target.left,
    toTop: target.top,
  };
}
