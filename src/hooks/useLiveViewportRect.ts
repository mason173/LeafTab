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

type RectListener = (rect: ViewportRect | null) => void;
type SubscriptionEntry = {
  listeners: Set<RectListener>;
  rect: ViewportRect | null;
};

const viewportRectSubscriptions = new Map<HTMLElement, SubscriptionEntry>();
let viewportRectRafId = 0;
let viewportRectIntervalId = 0;
let viewportRectBurstFramesRemaining = 0;
let viewportRectResizeObserver: ResizeObserver | null = null;
let viewportRectListenersAttached = false;

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

function notifyViewportRectListeners(element: HTMLElement, nextRect: ViewportRect | null) {
  const entry = viewportRectSubscriptions.get(element);
  if (!entry) return;
  if (rectEquals(entry.rect, nextRect)) return;
  entry.rect = nextRect;
  entry.listeners.forEach((listener) => {
    listener(nextRect);
  });
}

function commitViewportRects() {
  viewportRectSubscriptions.forEach((_entry, element) => {
    notifyViewportRectListeners(element, resolveViewportRect(element));
  });
}

function flushViewportRectFrame() {
  viewportRectRafId = 0;
  commitViewportRects();
  if (viewportRectBurstFramesRemaining > 0) {
    viewportRectBurstFramesRemaining -= 1;
    viewportRectRafId = window.requestAnimationFrame(flushViewportRectFrame);
  }
}

function requestViewportRectSync(burstFrames = 0) {
  if (typeof window === 'undefined') return;
  viewportRectBurstFramesRemaining = Math.max(viewportRectBurstFramesRemaining, burstFrames);
  if (viewportRectRafId) return;
  viewportRectRafId = window.requestAnimationFrame(flushViewportRectFrame);
}

function handleViewportRectViewportChange() {
  requestViewportRectSync(1);
}

function handleViewportRectAnimatedChange() {
  requestViewportRectSync(VIEWPORT_RECT_ANIMATION_FRAME_COUNT);
}

function handleViewportRectPointerDown() {
  requestViewportRectSync(VIEWPORT_RECT_POINTER_SETTLE_FRAME_COUNT);
}

function handleViewportRectPointerMove(event: PointerEvent) {
  const pointerDragging = event.buttons !== 0 || event.pointerType === 'touch';
  if (!pointerDragging) return;
  requestViewportRectSync(VIEWPORT_RECT_POINTER_DRAG_FRAME_COUNT);
}

function handleViewportRectPointerRelease() {
  requestViewportRectSync(VIEWPORT_RECT_POINTER_SETTLE_FRAME_COUNT);
}

function attachViewportRectListeners() {
  if (viewportRectListenersAttached || typeof window === 'undefined') return;

  window.addEventListener('resize', handleViewportRectViewportChange, { passive: true });
  window.addEventListener('scroll', handleViewportRectViewportChange, { passive: true, capture: true });
  window.addEventListener('orientationchange', handleViewportRectViewportChange);
  window.addEventListener('pointerdown', handleViewportRectPointerDown, { passive: true, capture: true });
  window.addEventListener('pointermove', handleViewportRectPointerMove, { passive: true, capture: true });
  window.addEventListener('pointerup', handleViewportRectPointerRelease, { passive: true, capture: true });
  window.addEventListener('pointercancel', handleViewportRectPointerRelease, { passive: true, capture: true });
  document.addEventListener('transitionrun', handleViewportRectAnimatedChange, true);
  document.addEventListener('transitionend', handleViewportRectAnimatedChange, true);
  document.addEventListener('animationstart', handleViewportRectAnimatedChange, true);
  document.addEventListener('animationend', handleViewportRectAnimatedChange, true);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportRectViewportChange, { passive: true });
    window.visualViewport.addEventListener('scroll', handleViewportRectViewportChange, { passive: true });
  }

  viewportRectIntervalId = window.setInterval(() => {
    requestViewportRectSync();
  }, VIEWPORT_RECT_SAFETY_SYNC_INTERVAL_MS);

  viewportRectResizeObserver = new ResizeObserver(() => {
    requestViewportRectSync(VIEWPORT_RECT_BURST_FRAME_COUNT);
  });
  viewportRectResizeObserver.observe(document.documentElement);
  viewportRectSubscriptions.forEach((_entry, element) => {
    viewportRectResizeObserver?.observe(element);
  });

  viewportRectListenersAttached = true;
}

function detachViewportRectListeners() {
  if (!viewportRectListenersAttached || typeof window === 'undefined') return;

  if (viewportRectRafId) {
    window.cancelAnimationFrame(viewportRectRafId);
    viewportRectRafId = 0;
  }
  if (viewportRectIntervalId) {
    window.clearInterval(viewportRectIntervalId);
    viewportRectIntervalId = 0;
  }

  viewportRectResizeObserver?.disconnect();
  viewportRectResizeObserver = null;

  window.removeEventListener('resize', handleViewportRectViewportChange);
  window.removeEventListener('scroll', handleViewportRectViewportChange, true);
  window.removeEventListener('orientationchange', handleViewportRectViewportChange);
  window.removeEventListener('pointerdown', handleViewportRectPointerDown, true);
  window.removeEventListener('pointermove', handleViewportRectPointerMove, true);
  window.removeEventListener('pointerup', handleViewportRectPointerRelease, true);
  window.removeEventListener('pointercancel', handleViewportRectPointerRelease, true);
  document.removeEventListener('transitionrun', handleViewportRectAnimatedChange, true);
  document.removeEventListener('transitionend', handleViewportRectAnimatedChange, true);
  document.removeEventListener('animationstart', handleViewportRectAnimatedChange, true);
  document.removeEventListener('animationend', handleViewportRectAnimatedChange, true);

  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', handleViewportRectViewportChange);
    window.visualViewport.removeEventListener('scroll', handleViewportRectViewportChange);
  }

  viewportRectBurstFramesRemaining = 0;
  viewportRectListenersAttached = false;
}

function subscribeToViewportRect(element: HTMLElement, listener: RectListener) {
  let entry = viewportRectSubscriptions.get(element);
  if (!entry) {
    entry = {
      listeners: new Set<RectListener>(),
      rect: resolveViewportRect(element),
    };
    viewportRectSubscriptions.set(element, entry);
  }

  entry.listeners.add(listener);
  listener(entry.rect);

  attachViewportRectListeners();
  viewportRectResizeObserver?.observe(element);
  requestViewportRectSync(VIEWPORT_RECT_BURST_FRAME_COUNT);

  return () => {
    const currentEntry = viewportRectSubscriptions.get(element);
    if (!currentEntry) return;

    currentEntry.listeners.delete(listener);
    if (currentEntry.listeners.size > 0) return;

    viewportRectResizeObserver?.unobserve(element);
    viewportRectSubscriptions.delete(element);

    if (viewportRectSubscriptions.size === 0) {
      detachViewportRectListeners();
    }
  };
}

export function useLiveViewportRect(element: HTMLElement | null, enabled: boolean) {
  const [rect, setRect] = useState<ViewportRect | null>(null);

  useLayoutEffect(() => {
    if (!enabled || !element || typeof window === 'undefined') {
      setRect(null);
      return;
    }

    return subscribeToViewportRect(element, setRect);
  }, [element, enabled]);

  return rect;
}
