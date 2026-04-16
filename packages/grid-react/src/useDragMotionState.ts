import { buildLayoutShiftOffsets, type ProjectionOffset } from '@leaftab/workspace-core';
import { useCallback, useEffect, useRef, useState } from 'react';

export type DragSettlePreview<TItem> = {
  itemId: string;
  item: TItem;
  fromLeft: number;
  fromTop: number;
  toLeft: number;
  toTop: number;
  settling: boolean;
};

export function useDragMotionState<TItem>(params: {
  minLayoutShiftDistancePx: number;
  settleDurationMs: number;
}) {
  const { minLayoutShiftDistancePx, settleDurationMs } = params;
  const previousItemRectsRef = useRef<Map<string, DOMRect> | null>(null);
  const pendingLayoutShiftSourceRectsRef = useRef<Map<string, DOMRect> | null>(null);
  const layoutShiftResumeRafRef = useRef<number | null>(null);
  const dragSettleStartRafRef = useRef<number | null>(null);
  const dragSettleCleanupTimeoutRef = useRef<number | null>(null);

  const [layoutShiftOffsets, setLayoutShiftOffsets] = useState<Map<string, ProjectionOffset>>(new Map());
  const [disableLayoutShiftTransition, setDisableLayoutShiftTransition] = useState(false);
  const [dragSettlePreview, setDragSettlePreview] = useState<DragSettlePreview<TItem> | null>(null);

  const hasPendingLayoutShiftSourceRects = useCallback(
    () => pendingLayoutShiftSourceRectsRef.current !== null,
    [],
  );

  const captureLayoutShiftSourceRects = useCallback((rects: Map<string, DOMRect>) => {
    pendingLayoutShiftSourceRectsRef.current = rects;
  }, []);

  const commitMeasuredItemRects = useCallback((commit: {
    currentRects: Map<string, DOMRect>;
    skip: boolean;
  }) => {
    const { currentRects, skip } = commit;
    const pendingSourceRects = pendingLayoutShiftSourceRectsRef.current;
    const previousRects = pendingSourceRects ?? previousItemRectsRef.current;

    if (pendingSourceRects) {
      pendingLayoutShiftSourceRectsRef.current = null;
    }
    previousItemRectsRef.current = currentRects;

    if (skip || !previousRects || currentRects.size === 0) {
      return;
    }

    const nextOffsets = buildLayoutShiftOffsets({
      previousRects,
      currentRects,
      minDistancePx: minLayoutShiftDistancePx,
    });
    if (nextOffsets.size === 0) return;

    if (layoutShiftResumeRafRef.current !== null) {
      window.cancelAnimationFrame(layoutShiftResumeRafRef.current);
      layoutShiftResumeRafRef.current = null;
    }

    setDisableLayoutShiftTransition(true);
    setLayoutShiftOffsets(nextOffsets);
    layoutShiftResumeRafRef.current = window.requestAnimationFrame(() => {
      layoutShiftResumeRafRef.current = null;
      setDisableLayoutShiftTransition(false);
      setLayoutShiftOffsets(new Map());
    });
  }, [minLayoutShiftDistancePx]);

  const startDragSettlePreview = useCallback((preview: Omit<DragSettlePreview<TItem>, 'settling'>) => {
    if (typeof window === 'undefined') return;

    if (dragSettleStartRafRef.current !== null) {
      window.cancelAnimationFrame(dragSettleStartRafRef.current);
      dragSettleStartRafRef.current = null;
    }
    if (dragSettleCleanupTimeoutRef.current !== null) {
      window.clearTimeout(dragSettleCleanupTimeoutRef.current);
      dragSettleCleanupTimeoutRef.current = null;
    }

    setDragSettlePreview({ ...preview, settling: false });
    dragSettleStartRafRef.current = window.requestAnimationFrame(() => {
      dragSettleStartRafRef.current = window.requestAnimationFrame(() => {
        dragSettleStartRafRef.current = null;
        setDragSettlePreview((current) => {
          if (!current || current.itemId !== preview.itemId) return current;
          return { ...current, settling: true };
        });
      });
    });

    dragSettleCleanupTimeoutRef.current = window.setTimeout(() => {
      dragSettleCleanupTimeoutRef.current = null;
      setDragSettlePreview((current) => (current?.itemId === preview.itemId ? null : current));
    }, settleDurationMs + 80);
  }, [settleDurationMs]);

  const clearDragSettlePreview = useCallback(() => {
    setDragSettlePreview(null);
  }, []);

  useEffect(() => () => {
    if (layoutShiftResumeRafRef.current !== null) {
      window.cancelAnimationFrame(layoutShiftResumeRafRef.current);
      layoutShiftResumeRafRef.current = null;
    }
    if (dragSettleStartRafRef.current !== null) {
      window.cancelAnimationFrame(dragSettleStartRafRef.current);
      dragSettleStartRafRef.current = null;
    }
    if (dragSettleCleanupTimeoutRef.current !== null) {
      window.clearTimeout(dragSettleCleanupTimeoutRef.current);
      dragSettleCleanupTimeoutRef.current = null;
    }
  }, []);

  return {
    layoutShiftOffsets,
    disableLayoutShiftTransition,
    dragSettlePreview,
    hasPendingLayoutShiftSourceRects,
    captureLayoutShiftSourceRects,
    commitMeasuredItemRects,
    startDragSettlePreview,
    clearDragSettlePreview,
  };
}
