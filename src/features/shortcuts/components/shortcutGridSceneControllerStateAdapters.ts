import type React from 'react';
import type { DragHoverResolution } from '@/features/shortcuts/drag/dragSessionRuntime';
import type { MeasuredDragItem, ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';
import type { RootShortcutDropIntent } from '@/features/shortcuts/drag/types';

export function buildSceneControllerState<TLayoutState, TInteractionState>(params: {
  layoutState: TLayoutState;
  interactionState: TInteractionState;
}) {
  return params;
}

export function buildSceneLayoutState<TItem, TExtra extends object>(params: {
  items: readonly TItem[];
} & TExtra) {
  return params;
}

export function buildSceneInteractionState<TItem, TPendingDragRef, TExtra extends object = {}>(params: {
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
} & TExtra) {
  return params;
}
