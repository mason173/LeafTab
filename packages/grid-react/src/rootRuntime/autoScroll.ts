export type VerticalAutoScrollBounds = {
  top: number;
  bottom: number;
};

import type { MeasuredRootGridItem } from '../rootGeometry/measurement';

type RootAutoScrollLoopParams = {
  autoScrollRafRef: { current: number | null };
  autoScrollContainerRef: { current: HTMLElement | null };
  autoScrollVelocityRef: { current: number };
  latestPointerRef: { current: { x: number; y: number } | null };
  measureItems: () => MeasuredRootGridItem[];
  updateDragScrollOffset: () => void;
  syncHoverResolution: (
    pointer: { x: number; y: number },
    measuredItemsOverride?: MeasuredRootGridItem[],
  ) => void;
};

export function measureVerticalAutoScrollBounds(
  container: HTMLElement | null,
): VerticalAutoScrollBounds | null {
  if (!container) {
    return null;
  }

  const rect = container.getBoundingClientRect();
  return {
    top: rect.top,
    bottom: rect.bottom,
  };
}

export function refreshRootAutoScrollBounds(params: {
  autoScrollBoundsRef: { current: VerticalAutoScrollBounds | null };
  autoScrollContainerRef: { current: HTMLElement | null };
}) {
  const { autoScrollBoundsRef, autoScrollContainerRef } = params;
  autoScrollBoundsRef.current = measureVerticalAutoScrollBounds(autoScrollContainerRef.current);
}

export function createRootAutoScrollController(params: {
  autoScrollBoundsRef: { current: VerticalAutoScrollBounds | null };
  autoScrollContainerRef: { current: HTMLElement | null };
}) {
  return {
    refreshAutoScrollBounds: () => {
      refreshRootAutoScrollBounds(params);
    },
  };
}

export function resolveVerticalAutoScrollVelocity(params: {
  clientY: number;
  bounds: VerticalAutoScrollBounds | null;
  edgePx: number;
  maxSpeedPx: number;
}): number {
  const { clientY, bounds, edgePx, maxSpeedPx } = params;
  if (!bounds) {
    return 0;
  }

  if (clientY < bounds.top + edgePx) {
    const ratio = Math.min(1, (bounds.top + edgePx - clientY) / edgePx);
    return -(maxSpeedPx * ratio * ratio);
  }

  if (clientY > bounds.bottom - edgePx) {
    const ratio = Math.min(1, (clientY - (bounds.bottom - edgePx)) / edgePx);
    return maxSpeedPx * ratio * ratio;
  }

  return 0;
}

export function startRootAutoScrollLoop(params: RootAutoScrollLoopParams) {
  const {
    autoScrollRafRef,
    autoScrollContainerRef,
    autoScrollVelocityRef,
    latestPointerRef,
    measureItems,
    updateDragScrollOffset,
    syncHoverResolution,
  } = params;

  if (autoScrollRafRef.current !== null) {
    return;
  }

  const tick = () => {
    const container = autoScrollContainerRef.current;
    const velocity = autoScrollVelocityRef.current;
    if (!container || Math.abs(velocity) < 0.01) {
      autoScrollRafRef.current = null;
      return;
    }

    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    const previousScrollTop = container.scrollTop;
    const nextScrollTop = Math.max(0, Math.min(maxScrollTop, previousScrollTop + velocity));
    container.scrollTop = nextScrollTop;
    updateDragScrollOffset();

    const pointer = latestPointerRef.current;
    if (pointer) {
      if (Math.abs(nextScrollTop - previousScrollTop) >= 0.25) {
        syncHoverResolution(pointer, measureItems());
      } else {
        syncHoverResolution(pointer);
      }
    }

    autoScrollRafRef.current = window.requestAnimationFrame(tick);
  };

  autoScrollRafRef.current = window.requestAnimationFrame(tick);
}

export function stopRootAutoScroll(params: {
  autoScrollVelocityRef: { current: number };
  autoScrollRafRef: { current: number | null };
}) {
  const { autoScrollVelocityRef, autoScrollRafRef } = params;

  autoScrollVelocityRef.current = 0;
  if (autoScrollRafRef.current !== null) {
    window.cancelAnimationFrame(autoScrollRafRef.current);
    autoScrollRafRef.current = null;
  }
}

export function updateRootAutoScrollVelocity(params: {
  clientY: number;
  autoScrollRafRef: { current: number | null };
  autoScrollContainerRef: { current: HTMLElement | null };
  autoScrollBoundsRef: { current: VerticalAutoScrollBounds | null };
  autoScrollVelocityRef: { current: number };
  latestPointerRef: { current: { x: number; y: number } | null };
  measureItems: () => MeasuredRootGridItem[];
  updateDragScrollOffset: () => void;
  syncHoverResolution: (
    pointer: { x: number; y: number },
    measuredItemsOverride?: MeasuredRootGridItem[],
  ) => void;
  edgePx: number;
  maxSpeedPx: number;
}) {
  const {
    clientY,
    autoScrollRafRef,
    autoScrollContainerRef,
    autoScrollBoundsRef,
    autoScrollVelocityRef,
    latestPointerRef,
    measureItems,
    updateDragScrollOffset,
    syncHoverResolution,
    edgePx,
    maxSpeedPx,
  } = params;

  const container = autoScrollContainerRef.current;
  const bounds = autoScrollBoundsRef.current;
  if (!container || !bounds) {
    return;
  }

  const velocity = resolveVerticalAutoScrollVelocity({
    clientY,
    bounds,
    edgePx,
    maxSpeedPx,
  });

  autoScrollVelocityRef.current = velocity;
  if (Math.abs(velocity) > 0.01) {
    startRootAutoScrollLoop({
      autoScrollRafRef,
      autoScrollContainerRef,
      autoScrollVelocityRef,
      latestPointerRef,
      measureItems,
      updateDragScrollOffset,
      syncHoverResolution,
    });
  } else {
    stopRootAutoScroll({
      autoScrollVelocityRef,
      autoScrollRafRef,
    });
  }
}
