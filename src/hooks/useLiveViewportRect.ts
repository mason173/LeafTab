import { useLayoutEffect, useState } from 'react';

export type ViewportRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const VIEWPORT_RECT_BURST_FRAME_COUNT = 12;
const VIEWPORT_RECT_ANIMATION_FRAME_COUNT = 20;
const VIEWPORT_RECT_POINTER_DRAG_FRAME_COUNT = 2;
const VIEWPORT_RECT_POINTER_SETTLE_FRAME_COUNT = 8;
const VIEWPORT_RECT_SAFETY_SYNC_INTERVAL_MS = 240;

function rectEquals(left: ViewportRect | null, right: ViewportRect | null) {
  if (!left || !right) return left === right;
  return (
    Math.abs(left.left - right.left) < 0.25
    && Math.abs(left.top - right.top) < 0.25
    && Math.abs(left.width - right.width) < 0.25
    && Math.abs(left.height - right.height) < 0.25
  );
}

function resolveViewportRect(element: HTMLElement): ViewportRect | null {
  if (!element.isConnected) return null;

  const nextRect = element.getBoundingClientRect();
  return {
    left: nextRect.left,
    top: nextRect.top,
    width: nextRect.width,
    height: nextRect.height,
  };
}

export function useLiveViewportRect(element: HTMLElement | null, enabled: boolean) {
  const [rect, setRect] = useState<ViewportRect | null>(null);

  useLayoutEffect(() => {
    if (!enabled || !element || typeof window === 'undefined') {
      setRect(null);
      return;
    }

    let rafId = 0;
    let intervalId = 0;
    let burstFramesRemaining = 0;
    let resizeObserver: ResizeObserver | null = null;

    const commitRect = () => {
      const nextRect = resolveViewportRect(element);
      setRect((current) => (rectEquals(current, nextRect) ? current : nextRect));
      return nextRect;
    };

    const flushFrame = () => {
      rafId = 0;
      const nextRect = commitRect();
      if (!nextRect) return;

      if (burstFramesRemaining > 0) {
        burstFramesRemaining -= 1;
        rafId = window.requestAnimationFrame(flushFrame);
      }
    };

    const requestSync = (burstFrames = 0) => {
      burstFramesRemaining = Math.max(burstFramesRemaining, burstFrames);
      if (rafId) return;
      rafId = window.requestAnimationFrame(flushFrame);
    };

    const handleViewportChange = () => {
      requestSync(1);
    };

    const handleAnimatedChange = () => {
      requestSync(VIEWPORT_RECT_ANIMATION_FRAME_COUNT);
    };

    const handlePointerDown = () => {
      requestSync(VIEWPORT_RECT_POINTER_SETTLE_FRAME_COUNT);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const pointerDragging = event.buttons !== 0 || event.pointerType === 'touch';
      if (!pointerDragging) return;
      requestSync(VIEWPORT_RECT_POINTER_DRAG_FRAME_COUNT);
    };

    const handlePointerRelease = () => {
      requestSync(VIEWPORT_RECT_POINTER_SETTLE_FRAME_COUNT);
    };

    commitRect();
    requestSync(VIEWPORT_RECT_BURST_FRAME_COUNT);

    window.addEventListener('resize', handleViewportChange, { passive: true });
    window.addEventListener('scroll', handleViewportChange, { passive: true, capture: true });
    window.addEventListener('orientationchange', handleViewportChange);
    window.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true, capture: true });
    window.addEventListener('pointerup', handlePointerRelease, { passive: true, capture: true });
    window.addEventListener('pointercancel', handlePointerRelease, { passive: true, capture: true });
    document.addEventListener('transitionrun', handleAnimatedChange, true);
    document.addEventListener('transitionend', handleAnimatedChange, true);
    document.addEventListener('animationstart', handleAnimatedChange, true);
    document.addEventListener('animationend', handleAnimatedChange, true);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange, { passive: true });
      window.visualViewport.addEventListener('scroll', handleViewportChange, { passive: true });
    }

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        requestSync(VIEWPORT_RECT_BURST_FRAME_COUNT);
      });
      resizeObserver.observe(element);
      resizeObserver.observe(document.documentElement);
    }

    intervalId = window.setInterval(() => {
      requestSync();
    }, VIEWPORT_RECT_SAFETY_SYNC_INTERVAL_MS);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      if (intervalId) {
        window.clearInterval(intervalId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('orientationchange', handleViewportChange);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerup', handlePointerRelease, true);
      window.removeEventListener('pointercancel', handlePointerRelease, true);
      document.removeEventListener('transitionrun', handleAnimatedChange, true);
      document.removeEventListener('transitionend', handleAnimatedChange, true);
      document.removeEventListener('animationstart', handleAnimatedChange, true);
      document.removeEventListener('animationend', handleAnimatedChange, true);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, [element, enabled]);

  return rect;
}
