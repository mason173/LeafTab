import { useCallback, useEffect, useRef, useState } from 'react';
import { buildLayoutShiftOffsets, type PositionedRect, type ProjectionOffset } from '@/features/shortcuts/drag/dragMotion';

export type DragSettlePreview<T = unknown> = {
  itemId: string;
  item: T;
  fromLeft: number;
  fromTop: number;
  toLeft: number;
  toTop: number;
  settling: boolean;
};

export function useDragMotionState<T = unknown>(params: {
  minLayoutShiftDistancePx: number;
  settleDurationMs: number;
  disabled?: boolean;
}) {
  const { minLayoutShiftDistancePx, settleDurationMs, disabled = false } = params;
  const previousItemRectsRef = useRef<Map<string, PositionedRect> | null>(null);
  const pendingLayoutShiftSourceRectsRef = useRef<Map<string, PositionedRect> | null>(null);
  const layoutShiftResumeRafRef = useRef<number | null>(null);
  const dragSettleStartRafRef = useRef<number | null>(null);
  const dragSettleCleanupTimeoutRef = useRef<number | null>(null);
  const [layoutShiftOffsets, setLayoutShiftOffsets] = useState<Map<string, ProjectionOffset>>(new Map());
  const [disableLayoutShiftTransition, setDisableLayoutShiftTransition] = useState(false);
  const [dragSettlePreview, setDragSettlePreview] = useState<DragSettlePreview<T> | null>(null);

  const hasPendingLayoutShiftSourceRects = useCallback(
    () => pendingLayoutShiftSourceRectsRef.current !== null,
    [],
  );

  const captureLayoutShiftSourceRects = useCallback((rects: Map<string, PositionedRect>) => {
    pendingLayoutShiftSourceRectsRef.current = rects;
  }, []);

  const commitMeasuredItemRects = useCallback((commit: {
    currentRects: Map<string, PositionedRect>;
    skip?: boolean;
  }) => {
    const { currentRects, skip } = commit;
    const pendingSourceRects = pendingLayoutShiftSourceRectsRef.current;
    const previousRects = pendingSourceRects ?? previousItemRectsRef.current;
    if (pendingSourceRects) {
      pendingLayoutShiftSourceRectsRef.current = null;
    }

    previousItemRectsRef.current = currentRects;
    if (disabled || skip || !previousRects || currentRects.size === 0) {
      return;
    }

    const nextOffsets = buildLayoutShiftOffsets({
      previousRects,
      currentRects,
      minDistancePx: minLayoutShiftDistancePx,
    });
    if (nextOffsets.size === 0) {
      return;
    }

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
  }, [disabled, minLayoutShiftDistancePx]);

  const startDragSettlePreview = useCallback((preview: Omit<DragSettlePreview<T>, 'settling'>) => {
    if (disabled || typeof window === 'undefined') return;

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
          if (!current || current.itemId !== preview.itemId) {
            return current;
          }
          return { ...current, settling: true };
        });
      });
    });

    dragSettleCleanupTimeoutRef.current = window.setTimeout(() => {
      dragSettleCleanupTimeoutRef.current = null;
      setDragSettlePreview((current) => (current?.itemId === preview.itemId ? null : current));
    }, settleDurationMs + 80);
  }, [disabled, settleDurationMs]);

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
