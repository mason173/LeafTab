import {
  createPendingDragSession,
  type PendingDragSession,
} from './dragSessionRuntime';
import { measureDragItemRects, type PositionedRect } from './dragMotion';
import { measureDragItems, type MeasuredDragItem } from './gridDragEngine';
import type { DragPoint, DragRect } from './types';

export function measureElementDragRect(
  element: Element,
): DragRect {
  const rect = element.getBoundingClientRect();

  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export function measureNullableElementDragRect(
  element: Element | null | undefined,
): DragRect | null {
  return element ? measureElementDragRect(element) : null;
}

export function measureElementPosition(
  element: Element,
): DragPoint {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left,
    y: rect.top,
  };
}

export function registerDragElement(
  registry: Map<string, HTMLDivElement>,
  id: string,
  element: HTMLDivElement | null,
) {
  if (element) {
    registry.set(id, element);
    return;
  }

  registry.delete(id);
}

export function measureRegisteredDragItems<T>(params: {
  items: readonly T[];
  registry: ReadonlyMap<string, Element>;
  getId: (item: T) => string;
}): Array<MeasuredDragItem<T>> {
  const { items, registry, getId } = params;

  return measureDragItems({
    items,
    resolveRect: (item) => {
      const element = registry.get(getId(item));
      return element ? measureElementDragRect(element) : null;
    },
  });
}

export function measureRegisteredItemPositions<T>(params: {
  items: readonly T[];
  registry: ReadonlyMap<string, Element>;
  getId: (item: T) => string;
}): Map<string, PositionedRect> {
  const { items, registry, getId } = params;

  return measureDragItemRects({
    items,
    getId,
    getRect: (item) => {
      const element = registry.get(getId(item));
      if (!element) return null;
      const position = measureElementPosition(element);
      return {
        left: position.x,
        top: position.y,
      };
    },
  });
}

export function createPendingDragSessionFromElement<TActiveId extends string, TMeta extends object = object>(
  params: {
    element: Element;
    activeId: TActiveId;
    pointerId: number;
    pointerType: string;
    pointer: DragPoint;
    meta?: TMeta;
  },
): PendingDragSession<TActiveId, TMeta> {
  const {
    element,
    activeId,
    pointerId,
    pointerType,
    pointer,
    meta,
  } = params;

  return createPendingDragSession({
    activeId,
    pointerId,
    pointerType,
    origin: pointer,
    rect: measureElementDragRect(element),
    ...((meta ?? {}) as TMeta),
  });
}
