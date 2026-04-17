import { getDragVisualCenter, type PendingPointerDragState } from './gridDragEngine';
import { buildPreviewOffsetFromPointer } from './pointerDragSession';
import type { DragPoint, DragRect } from './types';

export type DragHoverResolution<TIntent> = {
  interactionIntent: TIntent | null;
  visualProjectionIntent: TIntent | null;
};

export type ResolvedDragHoverState<TIntent> = {
  interactionIntent: TIntent | null;
  visualProjectionIntent: TIntent | null;
  finalIntent: TIntent | null;
};

export type PendingDragSession<TActiveId extends string = string, TMeta extends object = object> =
  PendingPointerDragState
  & TMeta
  & {
    activeId: TActiveId;
    previewOffset: DragPoint;
  };

export type ActiveDragSession<TActiveId extends string = string, TMeta extends object = object> =
  PendingDragSession<TActiveId, TMeta>
  & {
    pointer: DragPoint;
  };

export type DragSessionVisualBounds = {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

export function createEmptyDragHoverResolution<TIntent>(): DragHoverResolution<TIntent> {
  return {
    interactionIntent: null,
    visualProjectionIntent: null,
  };
}

export function createPendingDragSession<TActiveId extends string, TMeta extends object = object>(
  params: PendingPointerDragState
    & TMeta
    & {
      activeId: TActiveId;
      rect: Pick<DragRect, 'left' | 'top' | 'width' | 'height'>;
      pointer?: DragPoint;
    },
): PendingDragSession<TActiveId, TMeta> {
  const {
    activeId,
    pointerId,
    pointerType,
    origin,
    rect,
    pointer = origin,
    ...meta
  } = params;

  return {
    activeId,
    pointerId,
    pointerType,
    origin,
    ...(meta as TMeta),
    previewOffset: buildPreviewOffsetFromPointer({
      rect,
      pointer,
    }),
  };
}

export function activatePendingDragSession<TActiveId extends string, TMeta extends object>(
  pendingDrag: PendingDragSession<TActiveId, TMeta>,
  pointer: DragPoint,
): ActiveDragSession<TActiveId, TMeta> {
  return {
    ...pendingDrag,
    pointer,
  };
}

export function updateActiveDragSessionPointer<TActiveId extends string, TMeta extends object>(
  activeDrag: ActiveDragSession<TActiveId, TMeta>,
  pointer: DragPoint,
): ActiveDragSession<TActiveId, TMeta> {
  return {
    ...activeDrag,
    pointer,
  };
}

export function buildDragSessionVisualRect(params: {
  pointer: DragPoint;
  previewOffset: DragPoint;
  visualBounds: DragSessionVisualBounds;
}): DragRect {
  const { pointer, previewOffset, visualBounds } = params;
  const left = pointer.x - previewOffset.x + visualBounds.offsetX;
  const top = pointer.y - previewOffset.y + visualBounds.offsetY;

  return {
    left,
    top,
    right: left + visualBounds.width,
    bottom: top + visualBounds.height,
    width: visualBounds.width,
    height: visualBounds.height,
  };
}

export function deriveDragSessionGeometry(params: {
  pointer: DragPoint;
  previewOffset: DragPoint;
  activeRect: Pick<DragRect, 'width' | 'height'>;
  visualBounds: DragSessionVisualBounds;
}) {
  const { pointer, previewOffset, activeRect, visualBounds } = params;
  return {
    recognitionPoint: getDragVisualCenter({
      pointer,
      previewOffset,
      activeRect,
      visualRect: visualBounds,
    }),
    visualRect: buildDragSessionVisualRect({
      pointer,
      previewOffset,
      visualBounds,
    }),
  };
}

export function resolveFinalHoverIntent<TIntent>(
  hoverResolution: DragHoverResolution<TIntent>,
): TIntent | null {
  return hoverResolution.interactionIntent ?? hoverResolution.visualProjectionIntent;
}

export function resolveDragHoverState<TIntent>(
  hoverResolution: DragHoverResolution<TIntent>,
): ResolvedDragHoverState<TIntent> {
  return {
    interactionIntent: hoverResolution.interactionIntent,
    visualProjectionIntent: hoverResolution.visualProjectionIntent,
    finalIntent: resolveFinalHoverIntent(hoverResolution),
  };
}
