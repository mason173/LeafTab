import { useCallback, useRef } from 'react';
import type { Shortcut } from '@/types';
import type { DragHoverResolution } from './dragSessionRuntime';
import { resolveRootPointerHoverState } from './rootPointerHoverState';
import { buildRootDragDirectionMap, type CompactTargetRegions } from './compactRootDrag';
import type { MeasuredDragItem } from './gridDragEngine';
import type { RootDragRenderableItem } from './rootDragRenderState';
import type { DragPoint, RootDragSessionMeta, RootShortcutDropIntent } from './types';
import type { ActiveDragSession } from './dragSessionRuntime';

export function useRootPointerHoverSession<T extends RootDragRenderableItem>(params: {
  activeDragRef: { current: ActiveDragSession<string, RootDragSessionMeta> | null };
  items: readonly T[];
  shortcuts: Shortcut[];
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  getDragLayoutSnapshot: <TResult>(measure: () => TResult) => TResult;
  measureCurrentItems: () => Array<MeasuredDragItem<T>>;
  resolveRootRect: () => DOMRect | null;
  resolveRegions: (item: MeasuredDragItem<T>) => CompactTargetRegions;
  emptyHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
}) {
  const previousRecognitionPointRef = useRef<DragPoint | null>(null);

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
          recognitionPoint: null,
        },
      };
    }

    const frozenMeasuredItems = params.getDragLayoutSnapshot(params.measureCurrentItems);
    const measuredItems = params.measureCurrentItems();
    const nextActiveDrag = hover.activeDrag.directionMap
      ? hover.activeDrag
      : {
          ...hover.activeDrag,
          directionMap: buildRootDragDirectionMap({
            activeSortId: hover.activeDrag.activeId,
            measuredItems: frozenMeasuredItems,
            resolveRegions: params.resolveRegions,
          }),
        };

    if (nextActiveDrag !== hover.activeDrag) {
      params.activeDragRef.current = nextActiveDrag;
    }

    const nextHoverState = resolveRootPointerHoverState({
      items: params.items,
      shortcuts: params.shortcuts,
      activeId: nextActiveDrag.activeId,
      pointer: hover.pointer,
      previewOffset: nextActiveDrag.previewOffset,
      measuredItems,
      previousRecognitionPoint: previousRecognitionPointRef.current,
      previousHoverResolution: hover.previousHoverResolution,
      directionMap: nextActiveDrag.directionMap ?? buildRootDragDirectionMap({
        activeSortId: nextActiveDrag.activeId,
        measuredItems: frozenMeasuredItems,
        resolveRegions: params.resolveRegions,
      }),
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
        recognitionPoint: nextHoverState.recognitionPoint,
      },
    };
  }, [params]);

  const handleHoverResolved = useCallback((recognitionPoint: DragPoint | null) => {
    previousRecognitionPointRef.current = recognitionPoint;
  }, []);

  const clearHoverState = useCallback(() => {
    previousRecognitionPointRef.current = null;
  }, []);

  return {
    resolveHover,
    handleHoverResolved,
    clearHoverState,
  };
}
