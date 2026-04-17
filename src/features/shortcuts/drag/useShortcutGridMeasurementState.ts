import { useRef, type MutableRefObject } from 'react';
import type { MeasuredDragItem } from './gridDragEngine';
import { useDragLayoutSnapshotState } from './useDragLayoutSnapshotState';
import { useRegisteredDragMeasurements } from './useRegisteredDragMeasurements';

export function useShortcutGridMeasurementState<T>(params: {
  items: readonly T[];
  getId: (item: T) => string;
  commitMeasuredItemRects?: (commit: {
    currentRects: Map<string, { left: number; top: number }>;
    skip?: boolean;
  }) => void;
  commitSkipped?: boolean;
}): {
  itemElementsRef: MutableRefObject<Map<string, HTMLDivElement>>;
  dragLayoutSnapshot: Array<MeasuredDragItem<T>> | null;
  captureDragLayoutSnapshot: (measureSnapshot: () => Array<MeasuredDragItem<T>>) => Array<MeasuredDragItem<T>>;
  getDragLayoutSnapshot: (measureSnapshot: () => Array<MeasuredDragItem<T>>) => Array<MeasuredDragItem<T>>;
  clearDragLayoutSnapshot: () => void;
  measureCurrentItems: () => Array<MeasuredDragItem<T>>;
} {
  const itemElementsRef = useRef(new Map<string, HTMLDivElement>());
  const {
    dragLayoutSnapshot,
    captureDragLayoutSnapshot,
    getDragLayoutSnapshot,
    clearDragLayoutSnapshot,
  } = useDragLayoutSnapshotState<T>();
  const { measureCurrentItems } = useRegisteredDragMeasurements({
    items: params.items,
    registryRef: itemElementsRef,
    getId: params.getId,
    commitMeasuredItemRects: params.commitMeasuredItemRects,
    commitSkipped: params.commitSkipped,
  });

  return {
    itemElementsRef,
    dragLayoutSnapshot,
    captureDragLayoutSnapshot,
    getDragLayoutSnapshot,
    clearDragLayoutSnapshot,
    measureCurrentItems,
  };
}
