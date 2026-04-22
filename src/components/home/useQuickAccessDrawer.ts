import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DRAWER_CONTENT_BACKDROP_BLUR_MAX_PX,
  DRAWER_CONTENT_TOP_PADDING_EXPANDED_DELTA_PX,
  DRAWER_OVERLAY_MAX_OPACITY,
  DRAWER_SNAP_TRANSITION_LOCK_MS,
  WHEEL_SESSION_GAP_MS,
  WHEEL_SNAP_THRESHOLD,
  resolveQuickAccessDrawerViewportMetrics,
} from './quickAccessDrawer.constants';

const IOS_BOUNCE_MAX_OFFSET_PX = 30;
const IOS_BOUNCE_SPRING_STIFFNESS = 240;
const IOS_BOUNCE_SPRING_DAMPING = 26;
const LOCKED_SCROLL_ALLOW_SELECTOR = '[data-allow-drawer-locked-scroll="true"]';
const DRAG_AUTO_SCROLL_EDGE_ZONE_PX = 84;
const DRAG_AUTO_SCROLL_HORIZONTAL_SLOP_PX = 24;
const DRAG_AUTO_SCROLL_MAX_SPEED_PX_PER_SEC = 1680;

function canUseLockedScrollRegion(event: WheelEvent): boolean {
  const eventTarget = event.target;
  if (!(eventTarget instanceof Element)) return false;
  const region = eventTarget.closest(LOCKED_SCROLL_ALLOW_SELECTOR);
  if (!(region instanceof HTMLElement)) return false;
  const viewport = region.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]') || region;
  const maxScrollTop = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
  if (maxScrollTop <= 1) return false;
  const deltaY = event.deltaY;
  if (deltaY > 1) return viewport.scrollTop < maxScrollTop - 1;
  if (deltaY < -1) return viewport.scrollTop > 1;
  return true;
}

function resolveDrawerSnapPoint(value: number | string | null, fallbackValue: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return value.trim().endsWith('%') ? parsed / 100 : parsed;
    }
  }
  return fallbackValue;
}

interface UseQuickAccessDrawerOptions {
  viewportHeight: number;
  showShortcuts: boolean;
  allowWheelExpandWhenHidden?: boolean;
  disableScrollInteraction?: boolean;
  topContentBottomPx?: number;
  topContentSafeGapPx?: number;
}

interface UseQuickAccessDrawerResult {
  quickAccessOpen: boolean;
  isDrawerExpanded: boolean;
  drawerSurfaceOpacity: number;
  drawerLayoutProgress: number;
  drawerOverlayOpacity: number;
  drawerBottomBounceOffsetPx: number;
  drawerContentTopPaddingPx: number;
  drawerContentBackdropBlurPx: number;
  drawerPanelHeightVh: number;
  drawerPanelTranslateYPx: number;
  drawerScrollLocked: boolean;
  drawerWheelAreaRef: RefObject<HTMLDivElement | null>;
  drawerShortcutScrollRef: RefObject<HTMLDivElement | null>;
  handleShortcutDragStart: () => void;
  handleShortcutDragEnd: () => void;
}

export function useQuickAccessDrawer({
  viewportHeight,
  showShortcuts,
  allowWheelExpandWhenHidden = false,
  disableScrollInteraction = false,
  topContentBottomPx,
  topContentSafeGapPx,
}: UseQuickAccessDrawerOptions): UseQuickAccessDrawerResult {
  const {
    defaultSnapPoint: quickAccessDefaultSnapPoint,
    fullSnapPoint: quickAccessFullSnapPoint,
    collapsedHeightVh,
    expandedHeightVh,
  } = useMemo(
    () => resolveQuickAccessDrawerViewportMetrics(viewportHeight, {
      topContentBottomPx,
      topContentSafeGapPx,
    }),
    [topContentBottomPx, topContentSafeGapPx, viewportHeight],
  );
  const [quickAccessOpen] = useState(true);
  const [quickAccessSnapPoint, setQuickAccessSnapPoint] = useState<number | string | null>(quickAccessDefaultSnapPoint);
  const [drawerSurfaceOpacity, setDrawerSurfaceOpacity] = useState(0);
  const [drawerLayoutProgress, setDrawerLayoutProgress] = useState(0);
  const [drawerBottomBounceOffsetPx, setDrawerBottomBounceOffsetPx] = useState(0);
  const [dragInteractionActive, setDragInteractionActive] = useState(false);

  const drawerWheelAreaRef = useRef<HTMLDivElement>(null);
  const drawerShortcutScrollRef = useRef<HTMLDivElement>(null);
  const dragInteractionActiveRef = useRef(false);
  const dragAutoScrollRafRef = useRef<number | null>(null);
  const dragAutoScrollLastFrameRef = useRef(0);
  const lastDragPointerRef = useRef<{
    x: number;
    y: number;
    pointerId: number;
    pointerType: string;
    buttons: number;
  } | null>(null);
  const drawerSurfaceOpacityRef = useRef(0);
  const drawerLayoutProgressRef = useRef(0);
  const bottomBounceOffsetRef = useRef(0);
  const bottomBounceVelocityRef = useRef(0);
  const bottomBounceLastFrameRef = useRef(0);
  const bottomBounceReleaseTimerRef = useRef<number | null>(null);
  const bottomBounceReleaseRafRef = useRef<number | null>(null);
  const wheelIntentRef = useRef(0);
  const wheelSessionRef = useRef(0);
  const lastWheelTimestampRef = useRef(0);
  const blockedShortcutScrollSessionRef = useRef<number | null>(null);
  const snapTransitionLockedRef = useRef(false);
  const snapTransitionTimerRef = useRef<number | null>(null);

  const resolvedQuickAccessSnapPoint = resolveDrawerSnapPoint(quickAccessSnapPoint, quickAccessDefaultSnapPoint);
  const isDrawerExpanded = resolvedQuickAccessSnapPoint >= quickAccessFullSnapPoint - 0.001;
  const drawerScrollLocked = disableScrollInteraction || dragInteractionActive;
  const drawerOverlayOpacity = Math.min(drawerLayoutProgress * 1.35, 1) * DRAWER_OVERLAY_MAX_OPACITY;
  const drawerContentTopPaddingPx = DRAWER_CONTENT_TOP_PADDING_EXPANDED_DELTA_PX;
  const drawerContentBackdropBlurPx = drawerSurfaceOpacity * DRAWER_CONTENT_BACKDROP_BLUR_MAX_PX;
  const drawerVisibleHeightVh = collapsedHeightVh + (expandedHeightVh - collapsedHeightVh) * drawerLayoutProgress;
  const drawerPanelHeightVh = expandedHeightVh;
  const drawerPanelTranslateYPx = Math.max(0, ((expandedHeightVh - drawerVisibleHeightVh) / 100) * viewportHeight);

  const setDrawerSurfaceOpacityImmediate = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    drawerSurfaceOpacityRef.current = clamped;
    setDrawerSurfaceOpacity(clamped);
  }, []);

  const setDrawerLayoutProgressImmediate = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    drawerLayoutProgressRef.current = clamped;
    setDrawerLayoutProgress(clamped);
  }, []);

  const animateDrawerSurfaceOpacity = useCallback((target: number) => {
    // Avoid per-frame React updates: let CSS transitions animate visual interpolation.
    setDrawerSurfaceOpacityImmediate(target);
  }, [setDrawerSurfaceOpacityImmediate]);

  const animateDrawerLayoutProgress = useCallback((target: number) => {
    // Avoid per-frame React updates: let CSS transitions animate visual interpolation.
    setDrawerLayoutProgressImmediate(target);
  }, [setDrawerLayoutProgressImmediate]);

  const stopBottomBounceRelease = useCallback(() => {
    if (bottomBounceReleaseTimerRef.current !== null) {
      window.clearTimeout(bottomBounceReleaseTimerRef.current);
      bottomBounceReleaseTimerRef.current = null;
    }
    if (bottomBounceReleaseRafRef.current !== null) {
      window.cancelAnimationFrame(bottomBounceReleaseRafRef.current);
      bottomBounceReleaseRafRef.current = null;
    }
    bottomBounceVelocityRef.current = 0;
    bottomBounceLastFrameRef.current = 0;
  }, []);

  const stopDragAutoScroll = useCallback(() => {
    if (dragAutoScrollRafRef.current !== null) {
      window.cancelAnimationFrame(dragAutoScrollRafRef.current);
      dragAutoScrollRafRef.current = null;
    }
    dragAutoScrollLastFrameRef.current = 0;
  }, []);

  const dispatchSyntheticDragPointerMove = useCallback((pointer: {
    x: number;
    y: number;
    pointerId: number;
    pointerType: string;
    buttons: number;
  }) => {
    if (typeof document === 'undefined') return;

    if (typeof window.PointerEvent === 'function') {
      document.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        clientX: pointer.x,
        clientY: pointer.y,
        pointerId: pointer.pointerId,
        pointerType: pointer.pointerType,
        buttons: pointer.buttons,
        pressure: pointer.buttons === 0 ? 0 : 0.5,
        isPrimary: true,
      }));
      return;
    }

    document.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: pointer.x,
      clientY: pointer.y,
      buttons: pointer.buttons,
    }));
  }, []);

  const setBottomBounceOffsetImmediate = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(IOS_BOUNCE_MAX_OFFSET_PX, value));
    bottomBounceOffsetRef.current = clamped;
    setDrawerBottomBounceOffsetPx(clamped);
  }, []);

  const startBottomBounceRelease = useCallback(() => {
    if (bottomBounceOffsetRef.current <= 0.01) {
      setBottomBounceOffsetImmediate(0);
      return;
    }
    if (bottomBounceReleaseRafRef.current !== null) return;
    const tick = (now: number) => {
      const last = bottomBounceLastFrameRef.current || now;
      const dt = Math.max(0.008, Math.min(0.032, (now - last) / 1000));
      bottomBounceLastFrameRef.current = now;

      const x = bottomBounceOffsetRef.current;
      let v = bottomBounceVelocityRef.current;
      const a = -IOS_BOUNCE_SPRING_STIFFNESS * x - IOS_BOUNCE_SPRING_DAMPING * v;
      v += a * dt;
      let next = x + v * dt;

      if (next < 0) {
        next = 0;
        v = 0;
      }

      bottomBounceVelocityRef.current = v;
      setBottomBounceOffsetImmediate(next);

      if (next > 0.08 || Math.abs(v) > 1.2) {
        bottomBounceReleaseRafRef.current = window.requestAnimationFrame(tick);
      } else {
        bottomBounceReleaseRafRef.current = null;
        bottomBounceVelocityRef.current = 0;
        bottomBounceLastFrameRef.current = 0;
        setBottomBounceOffsetImmediate(0);
      }
    };
    bottomBounceLastFrameRef.current = 0;
    bottomBounceReleaseRafRef.current = window.requestAnimationFrame(tick);
  }, [setBottomBounceOffsetImmediate]);

  const triggerBottomBounce = useCallback((_overshootPx: number) => {
    // Disabled: keep bottom boundary rigid with no visual rebound.
    stopBottomBounceRelease();
    setBottomBounceOffsetImmediate(0);
  }, [setBottomBounceOffsetImmediate, stopBottomBounceRelease]);

  const triggerDrawerSnap = useCallback((targetSnapPoint: number) => {
    // Lock snap transitions briefly to prevent jitter from rapid wheel bursts.
    if (snapTransitionLockedRef.current) return;
    snapTransitionLockedRef.current = true;
    wheelIntentRef.current = 0;
    setQuickAccessSnapPoint(targetSnapPoint);
    const targetProgress = targetSnapPoint >= quickAccessFullSnapPoint - 0.001 ? 1 : 0;
    animateDrawerSurfaceOpacity(targetProgress);
    animateDrawerLayoutProgress(targetProgress);
    if (snapTransitionTimerRef.current !== null) {
      window.clearTimeout(snapTransitionTimerRef.current);
    }
    snapTransitionTimerRef.current = window.setTimeout(() => {
      snapTransitionLockedRef.current = false;
      snapTransitionTimerRef.current = null;
    }, DRAWER_SNAP_TRANSITION_LOCK_MS);
  }, [animateDrawerLayoutProgress, animateDrawerSurfaceOpacity, quickAccessFullSnapPoint]);

  const handleDrawerWheel = useCallback((event: WheelEvent) => {
    if (dragInteractionActiveRef.current) {
      wheelIntentRef.current = 0;
      blockedShortcutScrollSessionRef.current = null;
      setBottomBounceOffsetImmediate(0);
      event.preventDefault();
      return;
    }
    if (disableScrollInteraction) {
      if (canUseLockedScrollRegion(event)) {
        wheelIntentRef.current = 0;
        blockedShortcutScrollSessionRef.current = null;
        setBottomBounceOffsetImmediate(0);
        return;
      }
      wheelIntentRef.current = 0;
      blockedShortcutScrollSessionRef.current = null;
      setBottomBounceOffsetImmediate(0);
      event.preventDefault();
      return;
    }
    const canRevealShortcutsViaDrawer = showShortcuts || allowWheelExpandWhenHidden;
    if (!canRevealShortcutsViaDrawer) return;
    if (snapTransitionLockedRef.current) {
      event.preventDefault();
      return;
    }
    // Group wheel deltas into short sessions so one "flick" can trigger at most one snap action.
    const now = typeof event.timeStamp === 'number' ? event.timeStamp : performance.now();
    if (now - lastWheelTimestampRef.current > WHEEL_SESSION_GAP_MS) {
      wheelSessionRef.current += 1;
    }
    lastWheelTimestampRef.current = now;
    const currentWheelSession = wheelSessionRef.current;

    const scrollEl = drawerShortcutScrollRef.current;
    const canScrollShortcuts = Boolean(scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight + 1);
    const deltaY = event.deltaY;
    const scrollingDown = deltaY > 1;
    const scrollingUp = deltaY < -1;

    if (!scrollingDown && !scrollingUp) return;

    if (scrollingDown && !isDrawerExpanded) {
      event.preventDefault();
      setBottomBounceOffsetImmediate(0);
      wheelIntentRef.current = wheelIntentRef.current > 0 ? wheelIntentRef.current + deltaY : deltaY;
      setDrawerSurfaceOpacityImmediate(0);
      setDrawerLayoutProgressImmediate(0);
      if (wheelIntentRef.current >= WHEEL_SNAP_THRESHOLD) {
        blockedShortcutScrollSessionRef.current = currentWheelSession;
        triggerDrawerSnap(quickAccessFullSnapPoint);
      }
      return;
    }

    if (scrollingDown && isDrawerExpanded) {
      wheelIntentRef.current = 0;
      setDrawerSurfaceOpacityImmediate(1);
      setDrawerLayoutProgressImmediate(1);
      // After a snap-up, consume the rest of the same wheel session.
      if (blockedShortcutScrollSessionRef.current === currentWheelSession) {
        event.preventDefault();
        return;
      }
      if (canScrollShortcuts && scrollEl) {
        event.preventDefault();
        const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
        const prevScrollTop = scrollEl.scrollTop;
        const unclampedNext = prevScrollTop + deltaY;
        const nextScrollTop = Math.max(0, Math.min(maxScrollTop, unclampedNext));
        scrollEl.scrollTop = nextScrollTop;
        const overshoot = unclampedNext - maxScrollTop;
        if (overshoot > 0.5) {
          triggerBottomBounce(overshoot);
        } else if (bottomBounceOffsetRef.current > 0.01) {
          startBottomBounceRelease();
        }
      }
      return;
    }

    if (scrollingUp && isDrawerExpanded) {
      setBottomBounceOffsetImmediate(0);
      const atTop = (scrollEl?.scrollTop ?? 0) <= 0;
      if (!canScrollShortcuts || atTop) {
        event.preventDefault();
        wheelIntentRef.current = wheelIntentRef.current < 0 ? wheelIntentRef.current + deltaY : deltaY;
        setDrawerSurfaceOpacityImmediate(1);
        setDrawerLayoutProgressImmediate(1);
        if (Math.abs(wheelIntentRef.current) >= WHEEL_SNAP_THRESHOLD) {
          blockedShortcutScrollSessionRef.current = null;
          triggerDrawerSnap(quickAccessDefaultSnapPoint);
        }
        return;
      }
      event.preventDefault();
      if (scrollEl) {
        scrollEl.scrollTop += deltaY;
      }
      wheelIntentRef.current = 0;
      setDrawerSurfaceOpacityImmediate(1);
      setDrawerLayoutProgressImmediate(1);
      return;
    }

    setBottomBounceOffsetImmediate(0);
    wheelIntentRef.current = 0;
    setDrawerSurfaceOpacityImmediate(isDrawerExpanded ? 1 : 0);
    setDrawerLayoutProgressImmediate(isDrawerExpanded ? 1 : 0);
  }, [
    disableScrollInteraction,
    bottomBounceOffsetRef,
    isDrawerExpanded,
    allowWheelExpandWhenHidden,
    setBottomBounceOffsetImmediate,
    setDrawerLayoutProgressImmediate,
    setDrawerSurfaceOpacityImmediate,
    showShortcuts,
    startBottomBounceRelease,
    triggerBottomBounce,
    triggerDrawerSnap,
    quickAccessDefaultSnapPoint,
    quickAccessFullSnapPoint,
  ]);

  const handleShortcutDragStart = useCallback(() => {
    dragInteractionActiveRef.current = true;
    setDragInteractionActive(true);
    wheelIntentRef.current = 0;
    blockedShortcutScrollSessionRef.current = null;
    stopBottomBounceRelease();
    setBottomBounceOffsetImmediate(0);
  }, [setBottomBounceOffsetImmediate, stopBottomBounceRelease]);

  const handleShortcutDragEnd = useCallback(() => {
    dragInteractionActiveRef.current = false;
    setDragInteractionActive(false);
    lastDragPointerRef.current = null;
    stopDragAutoScroll();
    wheelIntentRef.current = 0;
    blockedShortcutScrollSessionRef.current = null;
    setBottomBounceOffsetImmediate(0);
  }, [setBottomBounceOffsetImmediate, stopDragAutoScroll]);

  useEffect(() => {
    setQuickAccessSnapPoint((previous) => {
      const resolved = resolveDrawerSnapPoint(previous, quickAccessDefaultSnapPoint);
      return resolved >= quickAccessFullSnapPoint - 0.001
        ? quickAccessFullSnapPoint
        : quickAccessDefaultSnapPoint;
    });
  }, [quickAccessDefaultSnapPoint, quickAccessFullSnapPoint]);

  useEffect(() => {
    if (!disableScrollInteraction) return;
    wheelIntentRef.current = 0;
    blockedShortcutScrollSessionRef.current = null;
    setBottomBounceOffsetImmediate(0);
  }, [disableScrollInteraction, setBottomBounceOffsetImmediate]);

  useEffect(() => {
    if (!dragInteractionActive) {
      lastDragPointerRef.current = null;
      stopDragAutoScroll();
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      lastDragPointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        buttons: event.buttons,
      };
    };

    const clearPointer = () => {
      lastDragPointerRef.current = null;
    };

    const tick = (now: number) => {
      dragAutoScrollRafRef.current = null;

      if (!dragInteractionActiveRef.current || !isDrawerExpanded || !showShortcuts) {
        dragAutoScrollLastFrameRef.current = 0;
        return;
      }

      const scrollEl = drawerShortcutScrollRef.current;
      const pointer = lastDragPointerRef.current;
      if (!scrollEl || !pointer) {
        dragAutoScrollLastFrameRef.current = now;
        dragAutoScrollRafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const maxScrollTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
      if (maxScrollTop <= 0.5) {
        dragAutoScrollLastFrameRef.current = now;
        dragAutoScrollRafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const rect = scrollEl.getBoundingClientRect();
      const withinHorizontalBounds = pointer.x >= rect.left - DRAG_AUTO_SCROLL_HORIZONTAL_SLOP_PX
        && pointer.x <= rect.right + DRAG_AUTO_SCROLL_HORIZONTAL_SLOP_PX;

      let direction = 0;
      let depth = 0;

      if (withinHorizontalBounds) {
        const topDistance = pointer.y - rect.top;
        const bottomDistance = rect.bottom - pointer.y;

        if (topDistance <= DRAG_AUTO_SCROLL_EDGE_ZONE_PX) {
          direction = -1;
          depth = (DRAG_AUTO_SCROLL_EDGE_ZONE_PX - topDistance) / DRAG_AUTO_SCROLL_EDGE_ZONE_PX;
        } else if (bottomDistance <= DRAG_AUTO_SCROLL_EDGE_ZONE_PX) {
          direction = 1;
          depth = (DRAG_AUTO_SCROLL_EDGE_ZONE_PX - bottomDistance) / DRAG_AUTO_SCROLL_EDGE_ZONE_PX;
        }
      }

      const normalizedDepth = Math.max(0, Math.min(1, depth));
      if (direction !== 0 && normalizedDepth > 0) {
        const easedDepth = normalizedDepth * normalizedDepth;
        const dtSeconds = Math.max(
          0.008,
          Math.min(0.032, (now - (dragAutoScrollLastFrameRef.current || now)) / 1000),
        );
        const delta = direction * DRAG_AUTO_SCROLL_MAX_SPEED_PX_PER_SEC * easedDepth * dtSeconds;
        const nextScrollTop = Math.max(0, Math.min(maxScrollTop, scrollEl.scrollTop + delta));
        if (Math.abs(nextScrollTop - scrollEl.scrollTop) >= 0.25) {
          scrollEl.scrollTop = nextScrollTop;
          dispatchSyntheticDragPointerMove(pointer);
        }
      }

      dragAutoScrollLastFrameRef.current = now;
      dragAutoScrollRafRef.current = window.requestAnimationFrame(tick);
    };

    const listenerOptions: AddEventListenerOptions = { capture: true, passive: true };
    document.addEventListener('pointermove', handlePointerMove, listenerOptions);
    document.addEventListener('pointerup', clearPointer, listenerOptions);
    document.addEventListener('pointercancel', clearPointer, listenerOptions);
    dragAutoScrollRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove, listenerOptions);
      document.removeEventListener('pointerup', clearPointer, listenerOptions);
      document.removeEventListener('pointercancel', clearPointer, listenerOptions);
      stopDragAutoScroll();
    };
  }, [
    dispatchSyntheticDragPointerMove,
    dragInteractionActive,
    isDrawerExpanded,
    showShortcuts,
    stopDragAutoScroll,
  ]);

  useEffect(() => {
    if (snapTransitionLockedRef.current) return;
    const targetProgress = isDrawerExpanded ? 1 : 0;
    animateDrawerSurfaceOpacity(targetProgress);
    animateDrawerLayoutProgress(targetProgress);
  }, [animateDrawerLayoutProgress, animateDrawerSurfaceOpacity, isDrawerExpanded]);

  useEffect(() => () => {
    if (snapTransitionTimerRef.current !== null) {
      window.clearTimeout(snapTransitionTimerRef.current);
    }
    stopBottomBounceRelease();
    stopDragAutoScroll();
  }, [stopBottomBounceRelease, stopDragAutoScroll]);

  useEffect(() => {
    if (!isDrawerExpanded) {
      stopBottomBounceRelease();
      setBottomBounceOffsetImmediate(0);
      if (dragInteractionActiveRef.current) {
        dragInteractionActiveRef.current = false;
        setDragInteractionActive(false);
        lastDragPointerRef.current = null;
        stopDragAutoScroll();
      }
    }
  }, [isDrawerExpanded, setBottomBounceOffsetImmediate, stopBottomBounceRelease, stopDragAutoScroll]);

  useEffect(() => {
    const wheelListenerOptions: AddEventListenerOptions = { passive: false, capture: true };
    const handleDocumentWheel = (event: WheelEvent) => {
      const wheelArea = drawerWheelAreaRef.current;
      const eventTarget = event.target;
      if (!wheelArea || !(eventTarget instanceof Node) || !wheelArea.contains(eventTarget)) {
        return;
      }
      handleDrawerWheel(event);
    };

    document.addEventListener('wheel', handleDocumentWheel, wheelListenerOptions);
    return () => {
      document.removeEventListener('wheel', handleDocumentWheel, wheelListenerOptions);
    };
  }, [handleDrawerWheel]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isDrawerExpanded) return;
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key !== 'Escape') return;

      event.preventDefault();
      event.stopPropagation();
      triggerDrawerSnap(quickAccessDefaultSnapPoint);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isDrawerExpanded, quickAccessDefaultSnapPoint, triggerDrawerSnap]);

  return {
    quickAccessOpen,
    isDrawerExpanded,
    drawerSurfaceOpacity,
    drawerLayoutProgress,
    drawerOverlayOpacity,
    drawerBottomBounceOffsetPx,
    drawerContentTopPaddingPx,
    drawerContentBackdropBlurPx,
    drawerPanelHeightVh,
    drawerPanelTranslateYPx,
    drawerScrollLocked,
    drawerWheelAreaRef,
    drawerShortcutScrollRef,
    handleShortcutDragStart,
    handleShortcutDragEnd,
  };
}
