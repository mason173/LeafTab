import { buildPreviewOffsetFromAnchor, type PointerPoint, type ShortcutExternalDragSessionSeed } from '@leaftab/workspace-core';
import type React from 'react';
import { findScrollableParent, type MeasuredRootGridItem } from '../rootGeometry/measurement';
import { type RootHoverResolution } from './hoverTiming';

type BaseRootDragSession = {
  activeId: string;
  activeSortId: string;
  pointerId: number;
  pointerType: string;
  pointer: PointerPoint;
  previewOffset: PointerPoint;
  sourceRootShortcutId?: string;
};

type ActivateRootDragSessionParams<TSession extends BaseRootDragSession> = {
  session: TSession;
  rootElement: HTMLDivElement | null;
  measuredItems: MeasuredRootGridItem[];
  emptyHoverResolution: RootHoverResolution;
  dragSessionRef: React.MutableRefObject<TSession | null>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  recognitionPointRef: React.MutableRefObject<PointerPoint | null>;
  dragScrollOriginTopRef: React.MutableRefObject<number>;
  autoScrollContainerRef: React.MutableRefObject<HTMLElement | null>;
  autoScrollVelocityRef: React.MutableRefObject<number>;
  hoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  confirmedHoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  refreshAutoScrollBounds: () => void;
  clearDragSettlePreview: () => void;
  commitDragLayoutSnapshot: (snapshot: MeasuredRootGridItem[] | null) => void;
  clearExtractHandoffTimer: () => void;
  commitBoundaryHoverState: (hovered: boolean) => void;
  clearHoverConfirmTimer: () => void;
  setDragScrollOffsetY: React.Dispatch<React.SetStateAction<number>>;
  setHoverResolution: React.Dispatch<React.SetStateAction<RootHoverResolution>>;
  setDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveSourceRootShortcutId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveDragId: React.Dispatch<React.SetStateAction<string | null>>;
  setDragPreviewOffset: React.Dispatch<React.SetStateAction<PointerPoint | null>>;
  setDragPointer: React.Dispatch<React.SetStateAction<PointerPoint | null>>;
};

type ExternalRootDragItem = {
  sortId: string;
  shortcut: {
    id: string;
  };
};

export function buildRootDragSessionFromExternalSeed(params: {
  externalDragSession: ShortcutExternalDragSessionSeed & { sourceRootShortcutId?: string };
  activeSortId: string;
  measuredActiveItem: MeasuredRootGridItem;
}) {
  const { externalDragSession, activeSortId, measuredActiveItem } = params;
  const previewOffset = buildPreviewOffsetFromAnchor({
    rect: measuredActiveItem.rect,
    anchor: externalDragSession.anchor,
  });

  return {
    session: {
      pointerId: externalDragSession.pointerId,
      pointerType: externalDragSession.pointerType,
      activeId: activeSortId,
      activeSortId,
      sourceRootShortcutId: externalDragSession.sourceRootShortcutId,
      pointer: externalDragSession.pointer,
      previewOffset,
    },
    previewOffset,
  };
}

export function buildRootDragSessionFromPending(params: {
  pending: {
    pointerId: number;
    pointerType: string;
    activeSortId: string;
    previewOffset: PointerPoint;
  };
  pointer: PointerPoint;
}) {
  const { pending, pointer } = params;

  return {
    pointerId: pending.pointerId,
    pointerType: pending.pointerType,
    activeId: pending.activeSortId,
    activeSortId: pending.activeSortId,
    pointer,
    previewOffset: pending.previewOffset,
  };
}

export function activateRootDragSession<TSession extends BaseRootDragSession>(
  params: ActivateRootDragSessionParams<TSession>,
) {
  const {
    session,
    rootElement,
    measuredItems,
    emptyHoverResolution,
    dragSessionRef,
    latestPointerRef,
    recognitionPointRef,
    dragScrollOriginTopRef,
    autoScrollContainerRef,
    autoScrollVelocityRef,
    hoverResolutionRef,
    confirmedHoverResolutionRef,
    refreshAutoScrollBounds,
    clearDragSettlePreview,
    commitDragLayoutSnapshot,
    clearExtractHandoffTimer,
    commitBoundaryHoverState,
    clearHoverConfirmTimer,
    setDragScrollOffsetY,
    setHoverResolution,
    setDragging,
    setActiveSourceRootShortcutId,
    setActiveDragId,
    setDragPreviewOffset,
    setDragPointer,
  } = params;

  dragSessionRef.current = session;
  latestPointerRef.current = session.pointer;
  recognitionPointRef.current = null;
  autoScrollContainerRef.current = findScrollableParent(rootElement);
  dragScrollOriginTopRef.current = autoScrollContainerRef.current?.scrollTop ?? 0;
  refreshAutoScrollBounds();
  setDragScrollOffsetY(0);
  autoScrollVelocityRef.current = 0;
  document.body.style.userSelect = 'none';

  clearDragSettlePreview();
  commitDragLayoutSnapshot(measuredItems);
  clearExtractHandoffTimer();
  commitBoundaryHoverState(false);
  clearHoverConfirmTimer();
  confirmedHoverResolutionRef.current = emptyHoverResolution;
  hoverResolutionRef.current = emptyHoverResolution;
  setHoverResolution(emptyHoverResolution);
  setDragging(true);
  setActiveSourceRootShortcutId(session.sourceRootShortcutId ?? null);
  setActiveDragId(session.activeSortId);
  setDragPreviewOffset(session.previewOffset);
  setDragPointer(session.pointer);
}

export function createRootSessionActivationController<TSession extends BaseRootDragSession>(params: {
  rootRef: React.RefObject<HTMLDivElement | null>;
  emptyHoverResolution: RootHoverResolution;
  dragSessionRef: React.MutableRefObject<TSession | null>;
  latestPointerRef: React.MutableRefObject<PointerPoint | null>;
  recognitionPointRef: React.MutableRefObject<PointerPoint | null>;
  dragScrollOriginTopRef: React.MutableRefObject<number>;
  autoScrollContainerRef: React.MutableRefObject<HTMLElement | null>;
  autoScrollVelocityRef: React.MutableRefObject<number>;
  hoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  confirmedHoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  refreshAutoScrollBounds: () => void;
  clearDragSettlePreview: () => void;
  commitDragLayoutSnapshot: (snapshot: MeasuredRootGridItem[] | null) => void;
  clearExtractHandoffTimer: () => void;
  commitBoundaryHoverState: (hovered: boolean) => void;
  clearHoverConfirmTimer: () => void;
  setDragScrollOffsetY: React.Dispatch<React.SetStateAction<number>>;
  setHoverResolution: React.Dispatch<React.SetStateAction<RootHoverResolution>>;
  setDragging: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveSourceRootShortcutId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveDragId: React.Dispatch<React.SetStateAction<string | null>>;
  setDragPreviewOffset: React.Dispatch<React.SetStateAction<PointerPoint | null>>;
  setDragPointer: React.Dispatch<React.SetStateAction<PointerPoint | null>>;
}) {
  const activateMeasuredDragSession = (activation: {
    session: TSession;
    measuredItems: MeasuredRootGridItem[];
  }) => {
    activateRootDragSession({
      ...activation,
      rootElement: params.rootRef.current,
      emptyHoverResolution: params.emptyHoverResolution,
      dragSessionRef: params.dragSessionRef,
      latestPointerRef: params.latestPointerRef,
      recognitionPointRef: params.recognitionPointRef,
      dragScrollOriginTopRef: params.dragScrollOriginTopRef,
      autoScrollContainerRef: params.autoScrollContainerRef,
      autoScrollVelocityRef: params.autoScrollVelocityRef,
      hoverResolutionRef: params.hoverResolutionRef,
      confirmedHoverResolutionRef: params.confirmedHoverResolutionRef,
      refreshAutoScrollBounds: params.refreshAutoScrollBounds,
      clearDragSettlePreview: params.clearDragSettlePreview,
      commitDragLayoutSnapshot: params.commitDragLayoutSnapshot,
      clearExtractHandoffTimer: params.clearExtractHandoffTimer,
      commitBoundaryHoverState: params.commitBoundaryHoverState,
      clearHoverConfirmTimer: params.clearHoverConfirmTimer,
      setDragScrollOffsetY: params.setDragScrollOffsetY,
      setHoverResolution: params.setHoverResolution,
      setDragging: params.setDragging,
      setActiveSourceRootShortcutId: params.setActiveSourceRootShortcutId,
      setActiveDragId: params.setActiveDragId,
      setDragPreviewOffset: params.setDragPreviewOffset,
      setDragPointer: params.setDragPointer,
    });
  };

  return {
    activateMeasuredDragSession,
  };
}

export function activateExternalRootDragSession<
  TItem extends ExternalRootDragItem,
  TSession extends BaseRootDragSession,
>(params: {
  externalDragSession: (ShortcutExternalDragSessionSeed & { token: number; sourceRootShortcutId?: string }) | null;
  items: TItem[];
  dragSessionRef: React.MutableRefObject<TSession | null>;
  pendingDragRef: React.MutableRefObject<unknown>;
  consumedExternalDragTokenRef: React.MutableRefObject<number | null>;
  measureItems: () => MeasuredRootGridItem[];
  activateMeasuredDragSession: (params: {
    session: TSession;
    measuredItems: MeasuredRootGridItem[];
  }) => void;
  syncHoverResolution: (pointer: PointerPoint) => void;
  onExternalDragSessionConsumed?: (token: number) => void;
}): boolean {
  const {
    externalDragSession,
    items,
    dragSessionRef,
    pendingDragRef,
    consumedExternalDragTokenRef,
    measureItems,
    activateMeasuredDragSession,
    syncHoverResolution,
    onExternalDragSessionConsumed,
  } = params;

  if (!externalDragSession) return false;
  if (dragSessionRef.current || pendingDragRef.current) return false;
  if (consumedExternalDragTokenRef.current === externalDragSession.token) return false;

  const activeItem = items.find((item) => item.shortcut.id === externalDragSession.shortcutId);
  if (!activeItem) return false;

  const measuredItems = measureItems();
  const measuredActiveItem = measuredItems.find((item) => item.sortId === activeItem.sortId);
  if (!measuredActiveItem) return false;

  const { session } = buildRootDragSessionFromExternalSeed({
    externalDragSession,
    activeSortId: activeItem.sortId,
    measuredActiveItem,
  });
  consumedExternalDragTokenRef.current = externalDragSession.token;

  activateMeasuredDragSession({
    session: session as TSession,
    measuredItems,
  });
  syncHoverResolution(externalDragSession.pointer);
  onExternalDragSessionConsumed?.(externalDragSession.token);
  return true;
}

export function createRootExternalDragSessionController<
  TItem extends ExternalRootDragItem,
  TSession extends BaseRootDragSession,
>(params: {
  externalDragSession: (ShortcutExternalDragSessionSeed & { token: number; sourceRootShortcutId?: string }) | null;
  items: TItem[];
  dragSessionRef: React.MutableRefObject<TSession | null>;
  pendingDragRef: React.MutableRefObject<unknown>;
  consumedExternalDragTokenRef: React.MutableRefObject<number | null>;
  measureItems: () => MeasuredRootGridItem[];
  activateMeasuredDragSession: (params: {
    session: TSession;
    measuredItems: MeasuredRootGridItem[];
  }) => void;
  syncHoverResolution: (pointer: PointerPoint) => void;
  onExternalDragSessionConsumed?: (token: number) => void;
}) {
  const activate = () => activateExternalRootDragSession({
    externalDragSession: params.externalDragSession,
    items: params.items,
    dragSessionRef: params.dragSessionRef,
    pendingDragRef: params.pendingDragRef,
    consumedExternalDragTokenRef: params.consumedExternalDragTokenRef,
    measureItems: params.measureItems,
    activateMeasuredDragSession: params.activateMeasuredDragSession,
    syncHoverResolution: params.syncHoverResolution,
    onExternalDragSessionConsumed: params.onExternalDragSessionConsumed,
  });

  return {
    activate,
  };
}
