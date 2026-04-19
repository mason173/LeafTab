import { hasPointerDragActivated, type PointerPoint } from '@leaftab/workspace-core';
import type React from 'react';
import { type MeasuredRootGridItem } from '../rootGeometry/measurement';
import { buildRootDragSessionFromPending } from './sessionStart';
import { type RootHoverResolution } from './hoverTiming';

type PendingRootPointerDrag = {
  pointerId: number;
  pointerType: string;
  activeSortId: string;
  origin: PointerPoint;
  current: PointerPoint;
  previewOffset: PointerPoint;
};

type ActiveRootPointerSession = {
  pointerId: number;
  pointer: PointerPoint;
  activeSortId: string;
  previewOffset: PointerPoint;
  sourceRootShortcutId?: string;
};

export function activatePendingRootDragSession<
  TPending extends PendingRootPointerDrag,
  TSession extends ActiveRootPointerSession,
>(params: {
  pendingDragRef: React.MutableRefObject<TPending | null>;
  pointer: PointerPoint;
  dropCleanupRafRef: React.MutableRefObject<number | null>;
  measureItems: () => MeasuredRootGridItem[];
  activateMeasuredDragSession: (params: {
    session: TSession;
    measuredItems: MeasuredRootGridItem[];
  }) => void;
}): TSession | null {
  const {
    pendingDragRef,
    pointer,
    dropCleanupRafRef,
    measureItems,
    activateMeasuredDragSession,
  } = params;
  const pending = pendingDragRef.current;
  if (!pending) {
    return null;
  }

  pending.current = pointer;
  if (!hasPointerDragActivated({ origin: pending.origin, pointer })) {
    return null;
  }

  pendingDragRef.current = null;
  const nextSession = buildRootDragSessionFromPending({ pending, pointer }) as unknown as TSession;

  if (dropCleanupRafRef.current !== null) {
    window.cancelAnimationFrame(dropCleanupRafRef.current);
    dropCleanupRafRef.current = null;
  }

  activateMeasuredDragSession({
    session: nextSession,
    measuredItems: measureItems(),
  });

  return nextSession;
}

export function updateRootDragSessionPointer<TSession extends ActiveRootPointerSession>(params: {
  session: TSession;
  pointer: PointerPoint;
  setDragPointer: React.Dispatch<React.SetStateAction<PointerPoint | null>>;
  updateAutoScrollVelocity: (clientY: number) => void;
  syncHoverResolution: (pointer: PointerPoint) => void;
}) {
  const {
    session,
    pointer,
    setDragPointer,
    updateAutoScrollVelocity,
    syncHoverResolution,
  } = params;

  session.pointer = pointer;
  setDragPointer(pointer);
  updateAutoScrollVelocity(pointer.y);
  syncHoverResolution(pointer);
}

export function finalizeReleasedRootHoverResolution<TSession extends ActiveRootPointerSession>(params: {
  eventType: string;
  pointer: PointerPoint;
  session: TSession;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  confirmedHoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  resolveHoverResolutionFromPointer: (pointer: PointerPoint) => RootHoverResolution;
  commitResolvedHoverResolution: (
    resolution: RootHoverResolution,
    options: { scheduleConfirm: boolean },
  ) => RootHoverResolution;
}) {
  const {
    eventType,
    pointer,
    session,
    latestPointerRef,
    confirmedHoverResolutionRef,
    resolveHoverResolutionFromPointer,
    commitResolvedHoverResolution,
  } = params;

  if (eventType === 'pointercancel') {
    return confirmedHoverResolutionRef.current;
  }

  session.pointer = pointer;
  latestPointerRef.current = pointer;
  return commitResolvedHoverResolution(resolveHoverResolutionFromPointer(pointer), {
    scheduleConfirm: false,
  });
}

export function handleRootPointerMove<
  TPending extends PendingRootPointerDrag,
  TSession extends ActiveRootPointerSession,
>(params: {
  event: PointerEvent;
  pendingDragRef: React.MutableRefObject<TPending | null>;
  dragSessionRef: React.MutableRefObject<TSession | null>;
  dropCleanupRafRef: React.MutableRefObject<number | null>;
  measureItems: () => MeasuredRootGridItem[];
  activateMeasuredDragSession: (params: {
    session: TSession;
    measuredItems: MeasuredRootGridItem[];
  }) => void;
  setDragPointer: React.Dispatch<React.SetStateAction<PointerPoint | null>>;
  updateAutoScrollVelocity: (clientY: number) => void;
  syncHoverResolution: (pointer: PointerPoint) => void;
}): boolean {
  const {
    event,
    pendingDragRef,
    dragSessionRef,
    dropCleanupRafRef,
    measureItems,
    activateMeasuredDragSession,
    setDragPointer,
    updateAutoScrollVelocity,
    syncHoverResolution,
  } = params;

  const pending = pendingDragRef.current;
  const session = dragSessionRef.current;

  if (pending && event.pointerId === pending.pointerId) {
    const nextPointer = { x: event.clientX, y: event.clientY };
    const nextSession = activatePendingRootDragSession({
      pendingDragRef,
      pointer: nextPointer,
      dropCleanupRafRef,
      measureItems,
      activateMeasuredDragSession,
    });
    if (!nextSession) {
      return false;
    }

    syncHoverResolution(nextPointer);
    event.preventDefault();
    return true;
  }

  if (!session || event.pointerId !== session.pointerId) {
    return false;
  }

  const nextPointer = { x: event.clientX, y: event.clientY };
  updateRootDragSessionPointer({
    session,
    pointer: nextPointer,
    setDragPointer,
    updateAutoScrollVelocity,
    syncHoverResolution,
  });
  event.preventDefault();
  return true;
}

export function finishRootPointerInteraction<
  TPending extends { pointerId: number },
  TSession extends ActiveRootPointerSession,
>(params: {
  event: PointerEvent;
  pendingDragRef: React.MutableRefObject<TPending | null>;
  dragSessionRef: React.MutableRefObject<TSession | null>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  confirmedHoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  resolveHoverResolutionFromPointer: (pointer: PointerPoint) => RootHoverResolution;
  commitResolvedHoverResolution: (
    resolution: RootHoverResolution,
    options: { scheduleConfirm: boolean },
  ) => RootHoverResolution;
  onRelease: (session: TSession) => void;
}): boolean {
  const {
    event,
    pendingDragRef,
    dragSessionRef,
    latestPointerRef,
    confirmedHoverResolutionRef,
    resolveHoverResolutionFromPointer,
    commitResolvedHoverResolution,
    onRelease,
  } = params;

  const pending = pendingDragRef.current;
  const session = dragSessionRef.current;

  if (pending && event.pointerId === pending.pointerId) {
    pendingDragRef.current = null;
    return true;
  }

  if (!session || event.pointerId !== session.pointerId) {
    return false;
  }

  finalizeReleasedRootHoverResolution({
    eventType: event.type,
    pointer: { x: event.clientX, y: event.clientY },
    session,
    latestPointerRef,
    confirmedHoverResolutionRef,
    resolveHoverResolutionFromPointer,
    commitResolvedHoverResolution,
  });
  onRelease(session);
  return true;
}

export function bindRootPointerSessionListeners<
  TPending extends PendingRootPointerDrag,
  TSession extends ActiveRootPointerSession,
>(params: {
  pendingDragRef: React.MutableRefObject<TPending | null>;
  dragSessionRef: React.MutableRefObject<TSession | null>;
  dropCleanupRafRef: React.MutableRefObject<number | null>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  confirmedHoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  measureItems: () => MeasuredRootGridItem[];
  activateMeasuredDragSession: (params: {
    session: TSession;
    measuredItems: MeasuredRootGridItem[];
  }) => void;
  setDragPointer: React.Dispatch<React.SetStateAction<PointerPoint | null>>;
  updateAutoScrollVelocity: (clientY: number) => void;
  syncHoverResolution: (pointer: PointerPoint) => void;
  resolveHoverResolutionFromPointer: (pointer: PointerPoint) => RootHoverResolution;
  commitResolvedHoverResolution: (
    resolution: RootHoverResolution,
    options: { scheduleConfirm: boolean },
  ) => RootHoverResolution;
  onRelease: (session: TSession) => void;
  onUnexpectedError?: (error: unknown) => void;
}) {
  const {
    pendingDragRef,
    dragSessionRef,
    dropCleanupRafRef,
    latestPointerRef,
    confirmedHoverResolutionRef,
    measureItems,
    activateMeasuredDragSession,
    setDragPointer,
    updateAutoScrollVelocity,
    syncHoverResolution,
    resolveHoverResolutionFromPointer,
    commitResolvedHoverResolution,
    onRelease,
    onUnexpectedError,
  } = params;

  const handlePointerMove = (event: PointerEvent) => {
    try {
      handleRootPointerMove({
        event,
        pendingDragRef,
        dragSessionRef,
        dropCleanupRafRef,
        measureItems,
        activateMeasuredDragSession,
        setDragPointer,
        updateAutoScrollVelocity,
        syncHoverResolution,
      });
    } catch (error) {
      console.error('[RootShortcutGrid] pointer move failed', error);
      onUnexpectedError?.(error);
    }
  };

  const finishPointerInteraction = (event: PointerEvent) => {
    try {
      finishRootPointerInteraction({
        event,
        pendingDragRef,
        dragSessionRef,
        latestPointerRef,
        confirmedHoverResolutionRef,
        resolveHoverResolutionFromPointer,
        commitResolvedHoverResolution,
        onRelease,
      });
    } catch (error) {
      console.error('[RootShortcutGrid] pointer release failed', error);
      onUnexpectedError?.(error);
    }
  };

  window.addEventListener('pointermove', handlePointerMove, { passive: false });
  window.addEventListener('pointerup', finishPointerInteraction, { passive: true });
  window.addEventListener('pointercancel', finishPointerInteraction, { passive: true });

  return () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', finishPointerInteraction);
    window.removeEventListener('pointercancel', finishPointerInteraction);
  };
}

export function createRootPointerSessionController<
  TPending extends PendingRootPointerDrag,
  TSession extends ActiveRootPointerSession,
>(params: {
  pendingDragRef: React.MutableRefObject<TPending | null>;
  dragSessionRef: React.MutableRefObject<TSession | null>;
  dropCleanupRafRef: React.MutableRefObject<number | null>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  confirmedHoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  measureItems: () => MeasuredRootGridItem[];
  activateMeasuredDragSession: (params: {
    session: TSession;
    measuredItems: MeasuredRootGridItem[];
  }) => void;
  setDragPointer: React.Dispatch<React.SetStateAction<PointerPoint | null>>;
  updateAutoScrollVelocity: (clientY: number) => void;
  syncHoverResolution: (pointer: PointerPoint) => void;
  resolveHoverResolutionFromPointer: (pointer: PointerPoint) => RootHoverResolution;
  commitResolvedHoverResolution: (
    resolution: RootHoverResolution,
    options: { scheduleConfirm: boolean },
  ) => RootHoverResolution;
  onRelease: (session: TSession) => void;
  onUnexpectedError?: (error: unknown) => void;
}) {
  const bindListeners = () => bindRootPointerSessionListeners({
    pendingDragRef: params.pendingDragRef,
    dragSessionRef: params.dragSessionRef,
    dropCleanupRafRef: params.dropCleanupRafRef,
    latestPointerRef: params.latestPointerRef,
    confirmedHoverResolutionRef: params.confirmedHoverResolutionRef,
    measureItems: params.measureItems,
    activateMeasuredDragSession: params.activateMeasuredDragSession,
    setDragPointer: params.setDragPointer,
    updateAutoScrollVelocity: params.updateAutoScrollVelocity,
    syncHoverResolution: params.syncHoverResolution,
    resolveHoverResolutionFromPointer: params.resolveHoverResolutionFromPointer,
    commitResolvedHoverResolution: params.commitResolvedHoverResolution,
    onRelease: params.onRelease,
    onUnexpectedError: params.onUnexpectedError,
  });

  return {
    bindListeners,
  };
}
