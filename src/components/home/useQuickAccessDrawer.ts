import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DisplayMode } from '@/displayMode/config';
import {
  DRAWER_COLLAPSED_HEIGHT_VH,
  DRAWER_CONTENT_BACKDROP_BLUR_MAX_PX,
  DRAWER_CONTENT_TOP_PADDING_EXPANDED_DELTA_PX,
  DRAWER_EXPANDED_HEIGHT_VH,
  DRAWER_LAYOUT_LINKED_ANIMATION_MS,
  DRAWER_OVERLAY_MAX_OPACITY,
  DRAWER_SNAP_TRANSITION_LOCK_MS,
  DRAWER_SURFACE_LINKED_ANIMATION_MS,
  QUICK_ACCESS_DEFAULT_SNAP_POINT,
  QUICK_ACCESS_FULL_SNAP_POINT,
  RHYTHM_BACKGROUND_SCALE_AT_FULL_DRAWER,
  WHEEL_SESSION_GAP_MS,
  WHEEL_SNAP_THRESHOLD,
} from './quickAccessDrawer.constants';

const IOS_BOUNCE_MAX_OFFSET_PX = 30;
const IOS_BOUNCE_COEFF = 0.12;
const IOS_BOUNCE_RELEASE_DELAY_MS = 16;
const IOS_BOUNCE_SPRING_STIFFNESS = 240;
const IOS_BOUNCE_SPRING_DAMPING = 26;

function resolveDrawerSnapPoint(value: number | string | null): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return value.trim().endsWith('%') ? parsed / 100 : parsed;
    }
  }
  return QUICK_ACCESS_DEFAULT_SNAP_POINT;
}

interface UseQuickAccessDrawerOptions {
  displayMode: DisplayMode;
  showShortcuts: boolean;
  disableScrollInteraction?: boolean;
}

interface UseQuickAccessDrawerResult {
  quickAccessOpen: boolean;
  quickAccessSnapPoint: number | string | null;
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
  displayMode,
  showShortcuts,
  disableScrollInteraction = false,
}: UseQuickAccessDrawerOptions): UseQuickAccessDrawerResult {
  const [quickAccessOpen, setQuickAccessOpen] = useState(true);
  const [quickAccessSnapPoint, setQuickAccessSnapPoint] = useState<number | string | null>(QUICK_ACCESS_DEFAULT_SNAP_POINT);
  const [drawerSurfaceOpacity, setDrawerSurfaceOpacity] = useState(0);
  const [drawerLayoutProgress, setDrawerLayoutProgress] = useState(0);
  const [drawerBottomBounceOffsetPx, setDrawerBottomBounceOffsetPx] = useState(0);

  const drawerWheelAreaRef = useRef<HTMLDivElement>(null);
  const drawerShortcutScrollRef = useRef<HTMLDivElement>(null);
  const drawerSurfaceOpacityRef = useRef(0);
  const drawerSurfaceAnimationFrameRef = useRef<number | null>(null);
  const drawerLayoutProgressRef = useRef(0);
  const drawerLayoutAnimationFrameRef = useRef<number | null>(null);
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

  const resolvedQuickAccessSnapPoint = resolveDrawerSnapPoint(quickAccessSnapPoint);
  const isDrawerExpanded = resolvedQuickAccessSnapPoint >= QUICK_ACCESS_FULL_SNAP_POINT - 0.001;
  const drawerOverlayOpacity = Math.min(drawerLayoutProgress * 1.35, 1) * DRAWER_OVERLAY_MAX_OPACITY;
  const drawerContentTopPaddingPx = drawerLayoutProgress * DRAWER_CONTENT_TOP_PADDING_EXPANDED_DELTA_PX;
  const drawerContentBackdropBlurPx = drawerSurfaceOpacity * DRAWER_CONTENT_BACKDROP_BLUR_MAX_PX;
  const drawerPanelHeightVh = DRAWER_COLLAPSED_HEIGHT_VH + (DRAWER_EXPANDED_HEIGHT_VH - DRAWER_COLLAPSED_HEIGHT_VH) * drawerLayoutProgress;

  const stopDrawerSurfaceAnimation = useCallback(() => {
    if (drawerSurfaceAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(drawerSurfaceAnimationFrameRef.current);
      drawerSurfaceAnimationFrameRef.current = null;
    }
  }, []);

  const stopDrawerLayoutAnimation = useCallback(() => {
    if (drawerLayoutAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(drawerLayoutAnimationFrameRef.current);
      drawerLayoutAnimationFrameRef.current = null;
    }
  }, []);

  const setDrawerSurfaceOpacityImmediate = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    stopDrawerSurfaceAnimation();
    drawerSurfaceOpacityRef.current = clamped;
    setDrawerSurfaceOpacity(clamped);
  }, [stopDrawerSurfaceAnimation]);

  const setDrawerLayoutProgressImmediate = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    stopDrawerLayoutAnimation();
    drawerLayoutProgressRef.current = clamped;
    setDrawerLayoutProgress(clamped);
  }, [stopDrawerLayoutAnimation]);

  const animateDrawerSurfaceOpacity = useCallback((target: number) => {
    const clampedTarget = Math.max(0, Math.min(1, target));
    const startValue = drawerSurfaceOpacityRef.current;
    if (Math.abs(clampedTarget - startValue) < 0.001) {
      setDrawerSurfaceOpacityImmediate(clampedTarget);
      return;
    }
    stopDrawerSurfaceAnimation();
    const startedAt = performance.now();
    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / DRAWER_SURFACE_LINKED_ANIMATION_MS, 1);
      const next = startValue + (clampedTarget - startValue) * easeOutCubic(progress);
      drawerSurfaceOpacityRef.current = next;
      setDrawerSurfaceOpacity(next);
      if (progress < 1) {
        drawerSurfaceAnimationFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        drawerSurfaceAnimationFrameRef.current = null;
      }
    };
    drawerSurfaceAnimationFrameRef.current = window.requestAnimationFrame(tick);
  }, [setDrawerSurfaceOpacityImmediate, stopDrawerSurfaceAnimation]);

  const animateDrawerLayoutProgress = useCallback((target: number) => {
    const clampedTarget = Math.max(0, Math.min(1, target));
    const startValue = drawerLayoutProgressRef.current;
    if (Math.abs(clampedTarget - startValue) < 0.001) {
      setDrawerLayoutProgressImmediate(clampedTarget);
      return;
    }
    stopDrawerLayoutAnimation();
    const startedAt = performance.now();
    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - ((-2 * t + 2) ** 3) / 2);
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / DRAWER_LAYOUT_LINKED_ANIMATION_MS, 1);
      const next = startValue + (clampedTarget - startValue) * easeInOutCubic(progress);
      drawerLayoutProgressRef.current = next;
      setDrawerLayoutProgress(next);
      if (progress < 1) {
        drawerLayoutAnimationFrameRef.current = window.requestAnimationFrame(tick);
      } else {
        drawerLayoutAnimationFrameRef.current = null;
      }
    };
    drawerLayoutAnimationFrameRef.current = window.requestAnimationFrame(tick);
  }, [setDrawerLayoutProgressImmediate, stopDrawerLayoutAnimation]);

  const rubberBandOffset = useCallback((overshootPx: number) => {
    if (overshootPx <= 0) return 0;
    const d = IOS_BOUNCE_MAX_OFFSET_PX;
    return (1 - 1 / ((overshootPx * IOS_BOUNCE_COEFF) / d + 1)) * d;
  }, []);

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

  const triggerBottomBounce = useCallback((overshootPx: number) => {
    if (overshootPx <= 0) return;
    stopBottomBounceRelease();
    setBottomBounceOffsetImmediate(rubberBandOffset(overshootPx));
    bottomBounceVelocityRef.current = 0;
    bottomBounceReleaseTimerRef.current = window.setTimeout(() => {
      bottomBounceReleaseTimerRef.current = null;
      startBottomBounceRelease();
    }, IOS_BOUNCE_RELEASE_DELAY_MS);
  }, [rubberBandOffset, setBottomBounceOffsetImmediate, startBottomBounceRelease, stopBottomBounceRelease]);

  const triggerDrawerSnap = useCallback((targetSnapPoint: number) => {
    // Lock snap transitions briefly to prevent jitter from rapid wheel bursts.
    if (snapTransitionLockedRef.current) return;
    snapTransitionLockedRef.current = true;
    wheelIntentRef.current = 0;
    setQuickAccessSnapPoint(targetSnapPoint);
    const targetProgress = targetSnapPoint >= QUICK_ACCESS_FULL_SNAP_POINT ? 1 : 0;
    animateDrawerSurfaceOpacity(targetProgress);
    animateDrawerLayoutProgress(targetProgress);
    if (snapTransitionTimerRef.current !== null) {
      window.clearTimeout(snapTransitionTimerRef.current);
    }
    snapTransitionTimerRef.current = window.setTimeout(() => {
      snapTransitionLockedRef.current = false;
      snapTransitionTimerRef.current = null;
    }, DRAWER_SNAP_TRANSITION_LOCK_MS);
  }, [animateDrawerLayoutProgress, animateDrawerSurfaceOpacity]);

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
        triggerDrawerSnap(QUICK_ACCESS_FULL_SNAP_POINT);
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
          triggerDrawerSnap(QUICK_ACCESS_DEFAULT_SNAP_POINT);
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
  ]);

  useEffect(() => {
    if (!disableScrollInteraction) return;
    wheelIntentRef.current = 0;
    blockedShortcutScrollSessionRef.current = null;
    setBottomBounceOffsetImmediate(0);
  }, [disableScrollInteraction, setBottomBounceOffsetImmediate]);

  const handleDrawerOpenChange = useCallback(() => {
    setQuickAccessOpen(true);
    setQuickAccessSnapPoint(QUICK_ACCESS_DEFAULT_SNAP_POINT);
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
  }, [setBottomBounceOffsetImmediate, setDrawerLayoutProgressImmediate, setDrawerSurfaceOpacityImmediate]);

  const handleActiveSnapPointChange = useCallback((next: number | string | null) => {
    setQuickAccessSnapPoint(next);
    const nextSnapPoint = resolveDrawerSnapPoint(next);
    const targetProgress = nextSnapPoint >= QUICK_ACCESS_FULL_SNAP_POINT - 0.001 ? 1 : 0;
    animateDrawerSurfaceOpacity(targetProgress);
    animateDrawerLayoutProgress(targetProgress);
    wheelIntentRef.current = 0;
    if (nextSnapPoint < QUICK_ACCESS_FULL_SNAP_POINT - 0.001) {
      setBottomBounceOffsetImmediate(0);
      blockedShortcutScrollSessionRef.current = null;
    }
  }, [animateDrawerLayoutProgress, animateDrawerSurfaceOpacity, setBottomBounceOffsetImmediate]);

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
    stopDrawerSurfaceAnimation();
    stopDrawerLayoutAnimation();
  }, [stopBottomBounceRelease, stopDrawerLayoutAnimation, stopDrawerSurfaceAnimation]);

  useEffect(() => {
    if (!isDrawerExpanded) {
      stopBottomBounceRelease();
      setBottomBounceOffsetImmediate(0);
    }
  }, [isDrawerExpanded, setBottomBounceOffsetImmediate, stopBottomBounceRelease]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const rhythmScale = displayMode === 'fresh'
      ? 1 + (RHYTHM_BACKGROUND_SCALE_AT_FULL_DRAWER - 1) * drawerLayoutProgress
      : 1;
    document.documentElement.style.setProperty('--rhythm-wallpaper-scale', rhythmScale.toFixed(4));
    return () => {
      document.documentElement.style.setProperty('--rhythm-wallpaper-scale', '1');
    };
  }, [displayMode, drawerLayoutProgress]);

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
