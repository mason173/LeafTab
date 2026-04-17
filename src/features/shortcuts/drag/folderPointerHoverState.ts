import type { Shortcut } from '@/types';
import { resolveFolderCompactHoverState } from './compactHoverAdapters';
import type { CompactTargetRegions } from './compactRootDrag';
import type { DragHoverResolution } from './dragSessionRuntime';
import { resolveFolderMaskHoverState } from './folderMaskHoverState';
import type { FolderDragRenderableItem } from './folderDragRenderState';
import type { MeasuredDragItem } from './gridDragEngine';
import type { DragPoint, RootDragActiveTarget, RootDragDirectionMap, RootShortcutDropIntent } from './types';

export function resolveFolderPointerHoverState<T extends FolderDragRenderableItem>(params: {
  activeId: string;
  pointer: DragPoint;
  previewOffset: DragPoint;
  measuredItems: readonly MeasuredDragItem<T>[];
  previousRecognitionPoint?: DragPoint | null;
  previousHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  previousActiveTarget: RootDragActiveTarget | null;
  shortcuts: Shortcut[];
  directionMap: RootDragDirectionMap;
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
    previousActiveTarget: params.previousActiveTarget,
    createEmptyHoverResolution: () => ({
      interactionIntent: null,
      visualProjectionIntent: null,
    }),
    shortcuts: params.shortcuts,
    directionMap: params.directionMap,
    resolveRegions: params.resolveRegions,
  });

  return resolveFolderMaskHoverState({
    hoverResolution: nextHoverState.hoverResolution,
    recognitionPoint: nextHoverState.recognitionPoint,
    boundaryRect: params.boundaryRect,
    activeTarget: nextHoverState.activeTarget,
  });
}
