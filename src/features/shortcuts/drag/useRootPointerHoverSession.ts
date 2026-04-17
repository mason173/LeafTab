import { useCallback, useRef } from 'react';
import type { Shortcut } from '@/types';
import type { DragHoverResolution } from './dragSessionRuntime';
import { resolveRootPointerHoverState } from './rootPointerHoverState';
import type { CompactTargetRegions } from './compactRootDrag';
import type { MeasuredDragItem } from './gridDragEngine';
import type { RootDragRenderableItem } from './rootDragRenderState';
import type { DragPoint, RootDragActiveTarget, RootDragSessionMeta, RootShortcutDropIntent } from './types';
import type { ActiveDragSession } from './dragSessionRuntime';

export function useRootPointerHoverSession<T extends RootDragRenderableItem>(params: {
  items: readonly T[];
  shortcuts: Shortcut[];
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  measureCurrentItems: () => Array<MeasuredDragItem<T>>;
  resolveRootRect: () => DOMRect | null;
  resolveRegions: (item: MeasuredDragItem<T>) => CompactTargetRegions;
  emptyHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
}) {
  const previousRecognitionPointRef = useRef<DragPoint | null>(null);
  const activeTargetRef = useRef<RootDragActiveTarget | null>(null);

  const resolveHover = useCallback((hover: {
    activeDrag: ActiveDragSession<string, RootDragSessionMeta>;
    pointer: DragPoint;
    previousHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  }) => {
    const rootRect = params.resolveRootRect();
    if (!rootRect) {
      return {
        hoverResolution: params.emptyHoverResolution,
        extra: {
          activeTarget: null,
          recognitionPoint: null,
        },
      };
    }

    const measuredItems = params.measureCurrentItems();
    const directionMap = hover.activeDrag.directionMap;
    if (!directionMap) {
      return {
        hoverResolution: params.emptyHoverResolution,
        extra: {
          activeTarget: null,
          recognitionPoint: null,
        },
      };
    }

    const nextHoverState = resolveRootPointerHoverState({
      items: params.items,
      shortcuts: params.shortcuts,
      activeId: hover.activeDrag.activeId,
      pointer: hover.pointer,
      previewOffset: hover.activeDrag.previewOffset,
      measuredItems,
      previousRecognitionPoint: previousRecognitionPointRef.current,
      previousHoverResolution: hover.previousHoverResolution,
      previousActiveTarget: activeTargetRef.current,
      directionMap,
      rootRect,
      gridColumns: params.gridColumns,
      gridColumnWidth: params.gridColumnWidth,
      columnGap: params.columnGap,
      rowHeight: params.rowHeight,
      rowGap: params.rowGap,
      resolveRegions: params.resolveRegions,
    });

    return {
      hoverResolution: nextHoverState.hoverResolution,
      extra: {
        activeTarget: nextHoverState.activeTarget,
        recognitionPoint: nextHoverState.recognitionPoint,
      },
    };
  }, [params]);

  const handleHoverResolved = useCallback((resolvedHover: {
    activeTarget: RootDragActiveTarget | null;
    recognitionPoint: DragPoint | null;
  }) => {
    activeTargetRef.current = resolvedHover.activeTarget;
    previousRecognitionPointRef.current = resolvedHover.recognitionPoint;
  }, []);

  const clearHoverState = useCallback(() => {
    activeTargetRef.current = null;
    previousRecognitionPointRef.current = null;
  }, []);

  return {
    resolveHover,
    handleHoverResolved,
    clearHoverState,
  };
}
