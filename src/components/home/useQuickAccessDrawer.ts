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
  disableScrollInteraction?: boolean;
  topContentBottomPx?: number;
  topContentSafeGapPx?: number;
}

interface UseQuickAccessDrawerResult {
  quickAccessOpen: boolean;
  quickAccessSnapPoint: number | string | null;
  quickAccessDefaultSnapPoint: number;
  quickAccessFullSnapPoint: number;
  isDrawerExpanded: boolean;
  drawerSurfaceOpacity: number;
  drawerLayoutProgress: number;
  drawerOverlayOpacity: number;
  drawerBottomBounceOffsetPx: number;
  drawerContentTopPaddingPx: number;
  drawerContentBackdropBlurPx: number;
  drawerPanelHeightVh: number;
  drawerWheelAreaRef: RefObject<HTMLDivElement | null>;
  drawerShortcutScrollRef: RefObject<HTMLDivElement | null>;
  handleDrawerOpenChange: () => void;
  handleActiveSnapPointChange: (next: number | string | null) => void;
}

export function useQuickAccessDrawer({
  viewportHeight,
  showShortcuts,
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
  const [quickAccessOpen, setQuickAccessOpen] = useState(true);
  const [quickAccessSnapPoint, setQuickAccessSnapPoint] = useState<number | string | null>(quickAccessDefaultSnapPoint);
  const [drawerSurfaceOpacity, setDrawerSurfaceOpacity] = useState(0);
  const [drawerLayoutProgress, setDrawerLayoutProgress] = useState(0);
  const [drawerBottomBounceOffsetPx, setDrawerBottomBounceOffsetPx] = useState(0);

  const drawerWheelAreaRef = useRef<HTMLDivElement>(null);
  const drawerShortcutScrollRef = useRef<HTMLDivElement>(null);
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
  const drawerOverlayOpacity = Math.min(drawerLayoutProgress * 1.35, 1) * DRAWER_OVERLAY_MAX_OPACITY;
  const drawerContentTopPaddingPx = DRAWER_CONTENT_TOP_PADDING_EXPANDED_DELTA_PX;
  const drawerContentBackdropBlurPx = drawerSurfaceOpacity * DRAWER_CONTENT_BACKDROP_BLUR_MAX_PX;
  const drawerPanelHeightVh = collapsedHeightVh + (expandedHeightVh - collapsedHeightVh) * drawerLayoutProgress;

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
    if (disableScrollInteraction) {
      wheelIntentRef.current = 0;
      blockedShortcutScrollSessionRef.current = null;
      setBottomBounceOffsetImmediate(0);
      event.preventDefault();
      return;
    }
    if (!showShortcuts) return;
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
      scrollEl.scrollTop += deltaY;
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

  const handleDrawerOpenChange = useCallback(() => {
    setQuickAccessOpen(true);
    setQuickAccessSnapPoint(quickAccessDefaultSnapPoint);
    setDrawerSurfaceOpacityImmediate(0);
    setDrawerLayoutProgressImmediate(0);
    setBottomBounceOffsetImmediate(0);
    wheelIntentRef.current = 0;
    blockedShortcutScrollSessionRef.current = null;
    lastWheelTimestampRef.current = 0;
    snapTransitionLockedRef.current = false;
    if (snapTransitionTimerRef.current !== null) {
      window.clearTimeout(snapTransitionTimerRef.current);
      snapTransitionTimerRef.current = null;
    }
  }, [quickAccessDefaultSnapPoint, setBottomBounceOffsetImmediate, setDrawerLayoutProgressImmediate, setDrawerSurfaceOpacityImmediate]);

  const handleActiveSnapPointChange = useCallback((next: number | string | null) => {
    setQuickAccessSnapPoint(next);
    const nextSnapPoint = resolveDrawerSnapPoint(next, quickAccessDefaultSnapPoint);
    const targetProgress = nextSnapPoint >= quickAccessFullSnapPoint - 0.001 ? 1 : 0;
    animateDrawerSurfaceOpacity(targetProgress);
    animateDrawerLayoutProgress(targetProgress);
    wheelIntentRef.current = 0;
    if (nextSnapPoint < quickAccessFullSnapPoint - 0.001) {
      setBottomBounceOffsetImmediate(0);
      blockedShortcutScrollSessionRef.current = null;
    }
  }, [
    animateDrawerLayoutProgress,
    animateDrawerSurfaceOpacity,
    quickAccessDefaultSnapPoint,
    quickAccessFullSnapPoint,
    setBottomBounceOffsetImmediate,
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
  }, [stopBottomBounceRelease]);

  useEffect(() => {
    if (!isDrawerExpanded) {
      stopBottomBounceRelease();
      setBottomBounceOffsetImmediate(0);
    }
  }, [isDrawerExpanded, setBottomBounceOffsetImmediate, stopBottomBounceRelease]);

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

  return {
    quickAccessOpen,
    quickAccessSnapPoint,
    quickAccessDefaultSnapPoint,
    quickAccessFullSnapPoint,
    isDrawerExpanded,
    drawerSurfaceOpacity,
    drawerLayoutProgress,
    drawerOverlayOpacity,
    drawerBottomBounceOffsetPx,
    drawerContentTopPaddingPx,
    drawerContentBackdropBlurPx,
    drawerPanelHeightVh,
    drawerWheelAreaRef,
    drawerShortcutScrollRef,
    handleDrawerOpenChange,
    handleActiveSnapPointChange,
  };
}
