import { useCallback, useRef, useState } from 'react';
import type { Shortcut } from '@/types';
import type { DragHoverResolution } from './dragSessionRuntime';
import { resolveFolderPointerHoverState } from './folderPointerHoverState';
import type { CompactTargetRegions } from './compactRootDrag';
import type { FolderDragRenderableItem } from './folderDragRenderState';
import type { MeasuredDragItem } from './gridDragEngine';
import type { DragPoint, RootShortcutDropIntent } from './types';
import type { ActiveDragSession } from './dragSessionRuntime';

export function useFolderPointerHoverSession<T extends FolderDragRenderableItem>(params: {
  shortcuts: Shortcut[];
  getDragLayoutSnapshot: <TResult>(measure: () => TResult) => TResult;
  measureCurrentItems: () => Array<MeasuredDragItem<T>>;
  resolveRegions: (item: MeasuredDragItem<T>) => CompactTargetRegions;
  resolveBoundaryRect: () => Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'> | null;
  ensureExtractHandoffTimer: () => void;
  clearExtractHandoffTimer: () => void;
  emptyHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
}) {
  const recognitionPointRef = useRef<DragPoint | null>(null);
  const hoveredMaskRef = useRef(false);
  const [hoveredMask, setHoveredMask] = useState(false);

  const resolveHover = useCallback((hover: {
    activeDrag: ActiveDragSession<string, { activeShortcutIndex: number }>;
    pointer: DragPoint;
    previousHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  }) => {
    const snapshot = params.getDragLayoutSnapshot(params.measureCurrentItems);
    const nextHoverState = resolveFolderPointerHoverState({
      activeId: hover.activeDrag.activeId,
      pointer: hover.pointer,
      previewOffset: hover.activeDrag.previewOffset,
      measuredItems: snapshot,
      previousRecognitionPoint: recognitionPointRef.current,
      previousHoverResolution: hover.previousHoverResolution,
      shortcuts: params.shortcuts,
      resolveRegions: params.resolveRegions,
      boundaryRect: params.resolveBoundaryRect(),
    });

    if (nextHoverState.shouldScheduleExtractHandoff) {
      params.ensureExtractHandoffTimer();
    } else {
      params.clearExtractHandoffTimer();
    }

    return {
      hoverResolution: nextHoverState.hoverResolution,
      extra: {
        hoveredMask: nextHoverState.hoveredMask,
        recognitionPoint: nextHoverState.recognitionPoint,
      },
    };
  }, [params]);

  const handleHoverResolved = useCallback((resolvedHover: {
    hoveredMask: boolean;
    recognitionPoint: DragPoint | null;
  }) => {
    recognitionPointRef.current = resolvedHover.recognitionPoint;
    hoveredMaskRef.current = resolvedHover.hoveredMask;
    setHoveredMask(resolvedHover.hoveredMask);
  }, []);

  const clearHoverState = useCallback(() => {
    recognitionPointRef.current = null;
    hoveredMaskRef.current = false;
    setHoveredMask(false);
  }, []);

  return {
    hoveredMask,
    hoveredMaskRef,
    resolveHover,
    handleHoverResolved,
    clearHoverState,
  };
}
