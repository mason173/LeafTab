import {
  pointInRect,
  type PointerPoint,
  type ShortcutExternalDragSessionSeed,
} from '@leaftab/workspace-core';
import type React from 'react';
import { type MeasuredRootGridItem } from '../rootGeometry/measurement';
import { buildExtractDragSessionSeed } from './dragState';

type RootExtractDragSession = {
  activeSortId: string;
  sourceRootShortcutId?: string;
  pointerId: number;
  pointerType: string;
  previewOffset: PointerPoint;
};

export function hasExitedRootExtractBoundary(params: {
  recognitionPoint: PointerPoint | null;
  extractBoundaryRect: DOMRect | null;
}) {
  const { recognitionPoint, extractBoundaryRect } = params;

  return Boolean(
    recognitionPoint
    && extractBoundaryRect
    && !pointInRect(recognitionPoint, extractBoundaryRect),
  );
}

export function scheduleRootExtractHandoff<TSession extends RootExtractDragSession>(params: {
  delayMs: number;
  extractHandoffTimerRef: React.MutableRefObject<number | null>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  dragSessionRef: React.MutableRefObject<TSession | null>;
  activeDragIdRef: React.MutableRefObject<string | null>;
  measureItems: () => MeasuredRootGridItem[];
  onExtractDragStart?: (payload: ShortcutExternalDragSessionSeed) => void;
  clearDragRuntimeState: () => void;
}) {
  const {
    delayMs,
    extractHandoffTimerRef,
    latestPointerRef,
    dragSessionRef,
    activeDragIdRef,
    measureItems,
    onExtractDragStart,
    clearDragRuntimeState,
  } = params;

  if (extractHandoffTimerRef.current !== null) {
    return;
  }

  const commitExtractHandoff = () => {
    const latestPointer = latestPointerRef.current;
    if (!latestPointer || !onExtractDragStart) {
      return;
    }

    const activeSession = dragSessionRef.current;
    const activeSortId = activeDragIdRef.current ?? activeSession?.activeSortId ?? null;
    if (!activeSession || !activeSortId) {
      return;
    }

    const snapshot = measureItems();
    const activeMeasuredItem = snapshot.find((item) => item.sortId === activeSortId) ?? null;
    if (!activeMeasuredItem) {
      return;
    }

    onExtractDragStart(buildExtractDragSessionSeed({
      activeMeasuredItem,
      activeSession,
      pointer: latestPointer,
    }));
    clearDragRuntimeState();
  };

  if (delayMs <= 0) {
    commitExtractHandoff();
    return;
  }

  extractHandoffTimerRef.current = window.setTimeout(() => {
    extractHandoffTimerRef.current = null;
    commitExtractHandoff();
  }, delayMs);
}

export function handleRootExtractBoundaryExit<TSession extends RootExtractDragSession>(params: {
  delayMs: number;
  extractHandoffTimerRef: React.MutableRefObject<number | null>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  dragSessionRef: React.MutableRefObject<TSession | null>;
  activeDragIdRef: React.MutableRefObject<string | null>;
  measureItems: () => MeasuredRootGridItem[];
  onExtractDragStart?: (payload: ShortcutExternalDragSessionSeed) => void;
  clearDragRuntimeState: () => void;
  clearCommittedHoverResolution: () => void;
  commitHeatZoneInspector: (inspector: null) => void;
  commitBoundaryHoverState: (hovered: boolean) => void;
}) {
  const {
    delayMs,
    extractHandoffTimerRef,
    latestPointerRef,
    dragSessionRef,
    activeDragIdRef,
    measureItems,
    onExtractDragStart,
    clearDragRuntimeState,
    clearCommittedHoverResolution,
    commitHeatZoneInspector,
    commitBoundaryHoverState,
  } = params;

  commitBoundaryHoverState(true);
  clearCommittedHoverResolution();
  commitHeatZoneInspector(null);
  scheduleRootExtractHandoff({
    delayMs,
    extractHandoffTimerRef,
    latestPointerRef,
    dragSessionRef,
    activeDragIdRef,
    measureItems,
    onExtractDragStart,
    clearDragRuntimeState,
  });
}

export function handleRootExtractBoundaryInside(params: {
  clearExtractHandoffTimer: () => void;
  commitBoundaryHoverState: (hovered: boolean) => void;
}) {
  const { clearExtractHandoffTimer, commitBoundaryHoverState } = params;
  clearExtractHandoffTimer();
  commitBoundaryHoverState(false);
}
