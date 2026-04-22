import { buildDragAnchor, type PointerPoint, type ShortcutExternalDragSessionSeed } from '@leaftab/workspace-core';
import type React from 'react';
import { type MeasuredRootGridItem } from '../rootGeometry/measurement';
import { shouldSkipLayoutShiftOnAnimationReenable } from '../rootShortcutGridHelpers';
import { type RootHoverResolution } from './hoverTiming';
import { stopRootAutoScroll } from './autoScroll';

type ResetRootDragRuntimeStateParams = {
  pendingDragRef: React.MutableRefObject<unknown>;
  dragSessionRef: React.MutableRefObject<unknown>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  recognitionPointRef: React.MutableRefObject<PointerPoint | null>;
  hoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  confirmedHoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  dragScrollOriginTopRef: React.MutableRefObject<number>;
  autoScrollContainerRef: React.MutableRefObject<HTMLElement | null>;
  autoScrollBoundsRef: React.MutableRefObject<{ top: number; bottom: number } | null>;
  emptyHoverResolution: RootHoverResolution;
  clearHoverConfirmTimer: () => void;
  clearExtractHandoffTimer: () => void;
  commitHeatZoneInspector: (inspector: null) => void;
  commitBoundaryHoverState: (hovered: boolean) => void;
  commitDragLayoutSnapshot: (snapshot: null) => void;
  autoScrollVelocityRef: React.MutableRefObject<number>;
  autoScrollRafRef: React.MutableRefObject<number | null>;
  setDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveSourceRootShortcutId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveDragId: React.Dispatch<React.SetStateAction<string | null>>;
  setDragPointer: React.Dispatch<React.SetStateAction<PointerPoint | null>>;
  setDragPreviewOffset: React.Dispatch<React.SetStateAction<PointerPoint | null>>;
  setHoverResolution: React.Dispatch<React.SetStateAction<RootHoverResolution>>;
  setDragScrollOffsetY: React.Dispatch<React.SetStateAction<number>>;
};

export function buildExtractDragSessionSeed(params: {
  activeMeasuredItem: MeasuredRootGridItem;
  activeSession: {
    sourceRootShortcutId?: string;
    pointerId: number;
    pointerType: string;
    previewOffset: PointerPoint;
  };
  pointer: PointerPoint;
}): ShortcutExternalDragSessionSeed {
  const { activeMeasuredItem, activeSession, pointer } = params;
  const anchor = buildDragAnchor({
    rect: activeMeasuredItem.rect,
    previewOffset: activeSession.previewOffset,
  });

  return {
    shortcutId: activeMeasuredItem.shortcut.id,
    sourceRootShortcutId: activeSession.sourceRootShortcutId,
    pointerId: activeSession.pointerId,
    pointerType: activeSession.pointerType,
    pointer,
    anchor,
  };
}

export function resetRootDragRuntimeState(params: ResetRootDragRuntimeStateParams) {
  const {
    pendingDragRef,
    dragSessionRef,
    latestPointerRef,
    recognitionPointRef,
    hoverResolutionRef,
    confirmedHoverResolutionRef,
    dragScrollOriginTopRef,
    autoScrollContainerRef,
    autoScrollBoundsRef,
    emptyHoverResolution,
    clearHoverConfirmTimer,
    clearExtractHandoffTimer,
    commitHeatZoneInspector,
    commitBoundaryHoverState,
    commitDragLayoutSnapshot,
    autoScrollVelocityRef,
    autoScrollRafRef,
    setDragging,
    setActiveSourceRootShortcutId,
    setActiveDragId,
    setDragPointer,
    setDragPreviewOffset,
    setHoverResolution,
    setDragScrollOffsetY,
  } = params;

  pendingDragRef.current = null;
  dragSessionRef.current = null;
  latestPointerRef.current = null;
  recognitionPointRef.current = null;
  clearHoverConfirmTimer();
  clearExtractHandoffTimer();
  hoverResolutionRef.current = emptyHoverResolution;
  confirmedHoverResolutionRef.current = emptyHoverResolution;
  commitHeatZoneInspector(null);
  commitBoundaryHoverState(false);
  setDragging(false);
  setActiveSourceRootShortcutId(null);
  setActiveDragId(null);
  setDragPointer(null);
  setDragPreviewOffset(null);
  setHoverResolution(emptyHoverResolution);
  commitDragLayoutSnapshot(null);
  setDragScrollOffsetY(0);
  dragScrollOriginTopRef.current = 0;
  stopRootAutoScroll({
    autoScrollVelocityRef,
    autoScrollRafRef,
  });
  autoScrollContainerRef.current = null;
  autoScrollBoundsRef.current = null;
  document.body.style.userSelect = '';
}

export function scheduleRootDragCleanup(params: {
  dropCleanupRafRef: React.MutableRefObject<number | null>;
  clearDragRuntimeState: () => void;
}) {
  const { dropCleanupRafRef, clearDragRuntimeState } = params;

  if (dropCleanupRafRef.current !== null) {
    window.cancelAnimationFrame(dropCleanupRafRef.current);
  }

  dropCleanupRafRef.current = window.requestAnimationFrame(() => {
    dropCleanupRafRef.current = null;
    clearDragRuntimeState();
  });
}

export function cleanupRootDragRuntimeOnUnmount(params: {
  dropCleanupRafRef: React.MutableRefObject<number | null>;
  projectionSettleResumeRafRef: React.MutableRefObject<number | null>;
  clearDragRuntimeState: () => void;
  clearDragSettlePreview: () => void;
}) {
  const {
    dropCleanupRafRef,
    projectionSettleResumeRafRef,
    clearDragRuntimeState,
    clearDragSettlePreview,
  } = params;

  if (dropCleanupRafRef.current !== null) {
    window.cancelAnimationFrame(dropCleanupRafRef.current);
    dropCleanupRafRef.current = null;
  }

  if (projectionSettleResumeRafRef.current !== null) {
    window.cancelAnimationFrame(projectionSettleResumeRafRef.current);
    projectionSettleResumeRafRef.current = null;
  }

  clearDragRuntimeState();
  clearDragSettlePreview();
}

export function syncRootDraggingLifecycle(params: {
  dragging: boolean;
  ignoreClickRef: React.MutableRefObject<boolean>;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const {
    dragging,
    ignoreClickRef,
    onDragStart,
    onDragEnd,
  } = params;

  if (dragging) {
    ignoreClickRef.current = true;
    onDragStart?.();
    return;
  }

  const ignoreResetTimer = window.setTimeout(() => {
    ignoreClickRef.current = false;
  }, 120);
  onDragEnd?.();

  return () => {
    window.clearTimeout(ignoreResetTimer);
  };
}

export function armRootProjectionSettleSuppression(params: {
  projectionSettleResumeRafRef: React.MutableRefObject<number | null>;
  setSuppressProjectionSettleAnimation: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const {
    projectionSettleResumeRafRef,
    setSuppressProjectionSettleAnimation,
  } = params;

  if (projectionSettleResumeRafRef.current !== null) {
    window.cancelAnimationFrame(projectionSettleResumeRafRef.current);
    projectionSettleResumeRafRef.current = null;
  }

  setSuppressProjectionSettleAnimation(true);
  const firstFrame = window.requestAnimationFrame(() => {
    projectionSettleResumeRafRef.current = window.requestAnimationFrame(() => {
      projectionSettleResumeRafRef.current = null;
      setSuppressProjectionSettleAnimation(false);
    });
  });
  projectionSettleResumeRafRef.current = firstFrame;
}

export function commitRootMeasuredRectsForLayoutShift(params: {
  disableReorderAnimationRef: React.MutableRefObject<boolean>;
  disableReorderAnimation: boolean;
  dragging: boolean;
  hasPendingLayoutShiftSourceRects: () => boolean;
  suppressProjectionSettleAnimation: boolean;
  skipForStableLayoutSignature: boolean;
  commitMeasuredItemRects: (commit: {
    currentRects: Map<string, DOMRect>;
    skip: boolean;
  }) => void;
  currentRects: Map<string, DOMRect>;
}) {
  const skipLayoutShiftForAnimationToggle = shouldSkipLayoutShiftOnAnimationReenable({
    previousAnimationDisabled: params.disableReorderAnimationRef.current,
    animationDisabled: params.disableReorderAnimation,
  });

  params.commitMeasuredItemRects({
    currentRects: params.currentRects,
    skip: (
      (params.dragging && !params.hasPendingLayoutShiftSourceRects())
      || params.suppressProjectionSettleAnimation
      || params.skipForStableLayoutSignature
      || skipLayoutShiftForAnimationToggle
    ),
  });
  params.disableReorderAnimationRef.current = params.disableReorderAnimation;
}

export function createRootProjectionSettleController(params: {
  projectionSettleResumeRafRef: React.MutableRefObject<number | null>;
  setSuppressProjectionSettleAnimation: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return {
    armProjectionSettleSuppression: () => {
      armRootProjectionSettleSuppression(params);
    },
  };
}

export function createRootDragRuntimeController(params: ResetRootDragRuntimeStateParams & {
  dropCleanupRafRef: React.MutableRefObject<number | null>;
  projectionSettleResumeRafRef: React.MutableRefObject<number | null>;
  clearDragSettlePreview: () => void;
}) {
  const {
    dropCleanupRafRef,
    projectionSettleResumeRafRef,
    clearDragSettlePreview,
    ...resetParams
  } = params;

  const clearDragRuntimeState = () => {
    resetRootDragRuntimeState(resetParams);
  };

  const scheduleDragCleanup = () => {
    scheduleRootDragCleanup({
      dropCleanupRafRef,
      clearDragRuntimeState,
    });
  };

  const cleanupOnUnmount = () => {
    cleanupRootDragRuntimeOnUnmount({
      dropCleanupRafRef,
      projectionSettleResumeRafRef,
      clearDragRuntimeState,
      clearDragSettlePreview,
    });
  };

  return {
    clearDragRuntimeState,
    scheduleDragCleanup,
    cleanupOnUnmount,
  };
}
