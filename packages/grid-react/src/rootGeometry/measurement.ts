import {
  measureDragItems,
  offsetRect,
  type MeasuredDragItem,
  type ScrollOffset,
} from '@leaftab/workspace-core';
import type React from 'react';
import { type RootShortcutGridItem } from '../rootShortcutGridHelpers';

export type MeasuredRootGridItem = MeasuredDragItem<RootShortcutGridItem>;

export function findScrollableParent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    const canScroll = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && current.scrollHeight > current.clientHeight + 1;
    if (canScroll) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

export function measureRootGridItems(
  items: RootShortcutGridItem[],
  itemElements: Map<string, HTMLDivElement>,
): MeasuredRootGridItem[] {
  return measureDragItems({
    items,
    itemElements,
    getId: (item) => item.sortId,
  });
}

export function offsetDomRectByScrollOffset(rect: DOMRect, scrollOffset: ScrollOffset): DOMRect {
  if (Math.abs(scrollOffset.x) < 0.01 && Math.abs(scrollOffset.y) < 0.01) {
    return rect;
  }

  const worldRect = offsetRect({
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  }, scrollOffset);

  return new DOMRect(
    worldRect.left,
    worldRect.top,
    worldRect.width,
    worldRect.height,
  );
}

export function offsetMeasuredRootGridItemsByScrollOffset(
  snapshot: MeasuredRootGridItem[] | null,
  scrollOffset: ScrollOffset,
): MeasuredRootGridItem[] | null {
  if (!snapshot || (Math.abs(scrollOffset.x) < 0.01 && Math.abs(scrollOffset.y) < 0.01)) {
    return snapshot;
  }

  return snapshot.map((item) => ({
    ...item,
    rect: offsetDomRectByScrollOffset(item.rect, scrollOffset),
  }));
}

export function createRootGridMeasurementController(params: {
  items: RootShortcutGridItem[];
  itemElements: Map<string, HTMLDivElement>;
  scrollOffset: ScrollOffset;
}) {
  const { items, itemElements, scrollOffset } = params;

  const measureCurrentGridItems = () => measureRootGridItems(items, itemElements);
  const measureVisibleGridItems = () => (
    offsetMeasuredRootGridItemsByScrollOffset(measureCurrentGridItems(), scrollOffset) ?? []
  );

  return {
    measureCurrentGridItems,
    measureVisibleGridItems,
  };
}

export function bindRootGridWidthObserver(params: {
  rootRef: React.RefObject<HTMLDivElement | null>;
  setGridWidthPx: React.Dispatch<React.SetStateAction<number | null>>;
}) {
  const rootNode = params.rootRef.current;
  if (!rootNode || typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
    return () => {};
  }

  const updateGridWidth = () => {
    const nextWidth = Math.round(rootNode.clientWidth);
    params.setGridWidthPx((current) => (current === nextWidth ? current : nextWidth));
  };

  updateGridWidth();
  const resizeObserver = new ResizeObserver(() => {
    updateGridWidth();
  });
  resizeObserver.observe(rootNode);
  window.addEventListener('resize', updateGridWidth, { passive: true });

  return () => {
    resizeObserver.disconnect();
    window.removeEventListener('resize', updateGridWidth);
  };
}
