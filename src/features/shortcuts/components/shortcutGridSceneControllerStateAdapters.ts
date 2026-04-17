import type React from 'react';
import type { DragHoverResolution, ResolvedDragHoverState } from '@/features/shortcuts/drag/dragSessionRuntime';
import { resolveDragHoverState } from '@/features/shortcuts/drag/dragSessionRuntime';
import type { MeasuredDragItem, ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';
import type { RootShortcutDropIntent } from '@/features/shortcuts/drag/types';

type PointerDragInteractionStateParams<TItem, TPendingDragRef> = {
  layoutSnapshot: Array<MeasuredDragItem<TItem>> | null;
  activeDragId: string | null;
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  dragPointer: { x: number; y: number } | null;
  dragPreviewOffset: { x: number; y: number } | null;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  disableLayoutShiftTransition: boolean;
  pendingDragRef: React.MutableRefObject<TPendingDragRef>;
  itemElements: Map<string, HTMLDivElement>;
  ignoreClickRef: React.MutableRefObject<boolean>;
};

function resolvePointerDragInteractionState<TItem, TPendingDragRef>(
  params: PointerDragInteractionStateParams<TItem, TPendingDragRef>,
) {
  return {
    layoutSnapshot: params.layoutSnapshot,
    activeDragId: params.activeDragId,
    hoverState: resolveDragHoverState(params.hoverResolution) as ResolvedDragHoverState<RootShortcutDropIntent>,
    dragPointer: params.dragPointer,
    dragPreviewOffset: params.dragPreviewOffset,
    layoutShiftOffsets: params.layoutShiftOffsets,
    disableLayoutShiftTransition: params.disableLayoutShiftTransition,
    pendingDragRef: params.pendingDragRef,
    itemElements: params.itemElements,
    ignoreClickRef: params.ignoreClickRef,
  };
}

export function resolveRootShortcutGridInteractionState<TItem, TPendingDragRef>(
  params: PointerDragInteractionStateParams<TItem, TPendingDragRef>,
) {
  return resolvePointerDragInteractionState(params);
}

export function resolveFolderShortcutSurfaceInteractionState<TItem, TPendingDragRef, TExtra extends {
  dragSettlePreview: unknown;
  hoveredMask: boolean;
  suppressProjectionSettleAnimation: boolean;
}>(params: PointerDragInteractionStateParams<TItem, TPendingDragRef> & TExtra) {
  return {
    ...resolvePointerDragInteractionState(params),
    dragSettlePreview: params.dragSettlePreview,
    hoveredMask: params.hoveredMask,
    suppressProjectionSettleAnimation: params.suppressProjectionSettleAnimation,
  };
}
