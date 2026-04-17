import { useCallback, useRef, useState } from 'react';
import type { MeasuredDragItem } from './gridDragEngine';

export function useDragLayoutSnapshotState<TItem>() {
  const snapshotRef = useRef<Array<MeasuredDragItem<TItem>> | null>(null);
  const [dragLayoutSnapshot, setDragLayoutSnapshot] = useState<Array<MeasuredDragItem<TItem>> | null>(null);

  const publishDragLayoutSnapshot = useCallback((snapshot: Array<MeasuredDragItem<TItem>>) => {
    snapshotRef.current = snapshot;
    setDragLayoutSnapshot(snapshot);
    return snapshot;
  }, []);

  const captureDragLayoutSnapshot = useCallback((measureSnapshot: () => Array<MeasuredDragItem<TItem>>) => (
    publishDragLayoutSnapshot(measureSnapshot())
  ), [publishDragLayoutSnapshot]);

  const getDragLayoutSnapshot = useCallback((measureSnapshot: () => Array<MeasuredDragItem<TItem>>) => (
    snapshotRef.current ?? captureDragLayoutSnapshot(measureSnapshot)
  ), [captureDragLayoutSnapshot]);

  const clearDragLayoutSnapshot = useCallback(() => {
    snapshotRef.current = null;
    setDragLayoutSnapshot(null);
  }, []);

  return {
    dragLayoutSnapshot,
    publishDragLayoutSnapshot,
    captureDragLayoutSnapshot,
    getDragLayoutSnapshot,
    clearDragLayoutSnapshot,
  };
}
