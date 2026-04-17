import type { Shortcut } from '@/types';
import { resolveFolderCompactHoverState } from './compactHoverAdapters';
import type { CompactTargetRegions } from './compactRootDrag';
import type { DragHoverResolution } from './dragSessionRuntime';
import { resolveFolderMaskHoverState } from './folderMaskHoverState';
import type { FolderDragRenderableItem } from './folderDragRenderState';
import type { MeasuredDragItem } from './gridDragEngine';
import type { DragPoint, RootShortcutDropIntent } from './types';

export function resolveFolderPointerHoverState<T extends FolderDragRenderableItem>(params: {
  activeId: string;
  pointer: DragPoint;
  previewOffset: DragPoint;
  measuredItems: readonly MeasuredDragItem<T>[];
  previousRecognitionPoint?: DragPoint | null;
  previousHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  shortcuts: Shortcut[];
  resolveRegions: (item: MeasuredDragItem<T>) => CompactTargetRegions;
  boundaryRect: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'> | null;
}) {
  const nextHoverState = resolveFolderCompactHoverState({
    activeId: params.activeId,
    pointer: params.pointer,
    previewOffset: params.previewOffset,
    measuredItems: params.measuredItems,
    previousRecognitionPoint: params.previousRecognitionPoint,
    previousHoverResolution: params.previousHoverResolution,
    createEmptyHoverResolution: () => ({
      interactionIntent: null,
      visualProjectionIntent: null,
    }),
    shortcuts: params.shortcuts,
    resolveRegions: params.resolveRegions,
  });

  return resolveFolderMaskHoverState({
    hoverResolution: nextHoverState.hoverResolution,
    recognitionPoint: nextHoverState.recognitionPoint,
    boundaryRect: params.boundaryRect,
  });
}
