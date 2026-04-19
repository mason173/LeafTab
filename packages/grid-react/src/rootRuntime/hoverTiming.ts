import {
  resolveGridInteractionProfileForRoot,
  type GridInteractionProfile,
  type GridInteractionProfileLike,
  type RootShortcutDropIntent,
  type Shortcut,
} from '@leaftab/workspace-core';
import type React from 'react';
import { type CompactRootHoverResolution } from '../compactRootHover';
import { type RootShortcutGridItem } from '../rootShortcutGridHelpers';

export type RootHoverResolution = CompactRootHoverResolution;

export const EMPTY_ROOT_HOVER_RESOLUTION: RootHoverResolution = {
  interactionIntent: null,
  visualProjectionIntent: null,
};

export function isCenterHoverIntent(
  intent: RootShortcutDropIntent | null,
): intent is Extract<RootShortcutDropIntent, { type: 'merge-root-shortcuts' | 'move-root-shortcut-into-folder' }> {
  return intent?.type === 'merge-root-shortcuts' || intent?.type === 'move-root-shortcut-into-folder';
}

export function resolveHoverIntentKey(intent: RootShortcutDropIntent | null): string | null {
  if (!intent) {
    return null;
  }

  switch (intent.type) {
    case 'reorder-root':
      return `reorder:${intent.overShortcutId}:${intent.targetIndex}:${intent.edge}`;
    case 'merge-root-shortcuts':
      return `merge:${intent.targetShortcutId}`;
    case 'move-root-shortcut-into-folder':
      return `folder:${intent.targetFolderId}`;
    default:
      return null;
  }
}

export function buildLatchedReorderResolution(resolution: RootHoverResolution): RootHoverResolution {
  const interactionIntent = resolution.interactionIntent?.type === 'reorder-root'
    ? resolution.interactionIntent
    : null;
  const visualProjectionIntent = resolution.visualProjectionIntent?.type === 'reorder-root'
    ? resolution.visualProjectionIntent
    : interactionIntent;

  if (!interactionIntent && !visualProjectionIntent) {
    return EMPTY_ROOT_HOVER_RESOLUTION;
  }

  return {
    interactionIntent,
    visualProjectionIntent,
  };
}

export function shouldBypassReorderDwell(params: {
  nextIntent: Extract<RootShortcutDropIntent, { type: 'reorder-root' }>;
  previousDisplayIntent: RootShortcutDropIntent | null;
  previousConfirmedIntent: RootShortcutDropIntent | null;
}): boolean {
  const { nextIntent, previousDisplayIntent, previousConfirmedIntent } = params;
  const previousCenterIntent = isCenterHoverIntent(previousDisplayIntent)
    ? previousDisplayIntent
    : isCenterHoverIntent(previousConfirmedIntent)
      ? previousConfirmedIntent
      : null;

  if (!previousCenterIntent) {
    return false;
  }

  const previousTargetId = previousCenterIntent.type === 'merge-root-shortcuts'
    ? previousCenterIntent.targetShortcutId
    : previousCenterIntent.targetFolderId;

  return previousTargetId === nextIntent.overShortcutId;
}

export function shouldSkipReorderDwellForDraggedItem(
  activeItem: Pick<RootShortcutGridItem, 'layout'> | null,
): boolean {
  if (!activeItem) {
    return false;
  }

  return activeItem.layout.columnSpan > 1 || activeItem.layout.rowSpan > 1;
}

export function extractPreviousRootReorderIntents(resolution: RootHoverResolution): {
  interactionIntent: Extract<RootShortcutDropIntent, { type: 'reorder-root' }> | null;
  visualProjectionIntent: Extract<RootShortcutDropIntent, { type: 'reorder-root' }> | null;
} {
  return {
    interactionIntent: resolution.interactionIntent?.type === 'reorder-root'
      ? resolution.interactionIntent
      : null,
    visualProjectionIntent: resolution.visualProjectionIntent?.type === 'reorder-root'
      ? resolution.visualProjectionIntent
      : null,
  };
}

export function resolveRootEffectiveInteractionProfile(params: {
  interactionProfile?: GridInteractionProfileLike | null;
  forceReorderOnly: boolean;
  sourceRootShortcutId: string | null;
  activeShortcut: Shortcut;
}): GridInteractionProfile {
  return resolveGridInteractionProfileForRoot({
    interactionProfile: params.interactionProfile,
    forceReorderOnly: params.forceReorderOnly,
    sourceRootShortcutId: params.sourceRootShortcutId,
    activeShortcut: params.activeShortcut,
  });
}

export function createRootInteractionProfileResolver(params: {
  interactionProfile?: GridInteractionProfileLike | null;
  forceReorderOnly: boolean;
}) {
  return (nextParams: {
    sourceRootShortcutId: string | null;
    activeShortcut: Shortcut;
  }): GridInteractionProfile => resolveRootEffectiveInteractionProfile({
    interactionProfile: params.interactionProfile,
    forceReorderOnly: params.forceReorderOnly,
    sourceRootShortcutId: nextParams.sourceRootShortcutId,
    activeShortcut: nextParams.activeShortcut,
  });
}

export type ResolveCurrentRootInteractionProfile = () => GridInteractionProfile | null;

export type CommitRootHoverResolution = (
  resolution: RootHoverResolution,
  options?: { scheduleConfirm?: boolean },
) => RootHoverResolution;

export function createRootHoverIntentController(params: {
  emptyHoverResolution: RootHoverResolution;
  items: RootShortcutGridItem[];
  activeDragIdRef: React.MutableRefObject<string | null>;
  hoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  confirmedHoverResolutionRef: React.MutableRefObject<RootHoverResolution>;
  hoverConfirmTimerRef: React.MutableRefObject<number | null>;
  pendingHoverIntentKeyRef: React.MutableRefObject<string | null>;
  reorderDwellMs: number;
  mergeDwellMs: number;
  resolveCurrentInteractionProfile?: ResolveCurrentRootInteractionProfile;
  setHoverResolution: React.Dispatch<React.SetStateAction<RootHoverResolution>>;
}) {
  const {
    emptyHoverResolution,
    items,
    activeDragIdRef,
    hoverResolutionRef,
    confirmedHoverResolutionRef,
    hoverConfirmTimerRef,
    pendingHoverIntentKeyRef,
    reorderDwellMs,
    mergeDwellMs,
    resolveCurrentInteractionProfile,
    setHoverResolution,
  } = params;

  const clearHoverConfirmTimer = () => {
    if (hoverConfirmTimerRef.current !== null) {
      window.clearTimeout(hoverConfirmTimerRef.current);
      hoverConfirmTimerRef.current = null;
    }
    pendingHoverIntentKeyRef.current = null;
  };

  const syncConfirmedHoverResolution = (nextResolution: RootHoverResolution) => {
    confirmedHoverResolutionRef.current = nextResolution;
    hoverResolutionRef.current = nextResolution;
    setHoverResolution(nextResolution);
  };

  const clearCommittedHoverResolution = () => {
    clearHoverConfirmTimer();
    syncConfirmedHoverResolution(emptyHoverResolution);
  };

  const commitResolvedHoverResolution: CommitRootHoverResolution = (
    rawResolution,
    options,
  ) => {
    const { scheduleConfirm = true } = options ?? {};
    const rawIntent = rawResolution.interactionIntent;
    const rawIntentKey = resolveHoverIntentKey(rawIntent);
    const previousConfirmedIntent = confirmedHoverResolutionRef.current.interactionIntent;
    const previousConfirmedIntentKey = resolveHoverIntentKey(previousConfirmedIntent);

    if (isCenterHoverIntent(previousConfirmedIntent) && rawIntentKey !== previousConfirmedIntentKey) {
      confirmedHoverResolutionRef.current = emptyHoverResolution;
    }

    const confirmedIntent = confirmedHoverResolutionRef.current.interactionIntent;
    const confirmedIntentKey = resolveHoverIntentKey(confirmedIntent);
    const latchedReorderResolution = buildLatchedReorderResolution(confirmedHoverResolutionRef.current);

    if (!rawIntent) {
      clearHoverConfirmTimer();
      hoverResolutionRef.current = latchedReorderResolution;
      setHoverResolution(latchedReorderResolution);
      return latchedReorderResolution;
    }

    if (rawIntentKey && rawIntentKey === confirmedIntentKey) {
      clearHoverConfirmTimer();
      syncConfirmedHoverResolution(rawResolution);
      return rawResolution;
    }

    const currentInteractionProfile = resolveCurrentInteractionProfile?.() ?? null;
    const shouldConfirmImmediately = rawIntent.type === 'reorder-root'
      && (currentInteractionProfile?.bypassReorderDwellAfterLeavingCore ?? true)
      && shouldBypassReorderDwell({
        nextIntent: rawIntent,
        previousDisplayIntent: hoverResolutionRef.current.interactionIntent,
        previousConfirmedIntent: confirmedIntent,
      });
    const currentActiveDragItem = items.find((item) => item.sortId === activeDragIdRef.current) ?? null;
    const shouldSkipReorderDwell = rawIntent.type === 'reorder-root'
      && shouldSkipReorderDwellForDraggedItem(currentActiveDragItem);

    if (shouldConfirmImmediately || shouldSkipReorderDwell) {
      clearHoverConfirmTimer();
      syncConfirmedHoverResolution(rawResolution);
      return rawResolution;
    }

    const delayMs = rawIntent.type === 'reorder-root'
      ? currentInteractionProfile?.reorderDwellMs ?? reorderDwellMs
      : currentInteractionProfile?.mergeDwellMs ?? mergeDwellMs;

    if (scheduleConfirm && rawIntentKey) {
      if (pendingHoverIntentKeyRef.current !== rawIntentKey) {
        clearHoverConfirmTimer();
        pendingHoverIntentKeyRef.current = rawIntentKey;
        hoverConfirmTimerRef.current = window.setTimeout(() => {
          if (pendingHoverIntentKeyRef.current !== rawIntentKey) {
            return;
          }

          hoverConfirmTimerRef.current = null;
          pendingHoverIntentKeyRef.current = null;
          syncConfirmedHoverResolution(rawResolution);
        }, delayMs);
      }
    } else {
      clearHoverConfirmTimer();
    }

    const displayResolution = isCenterHoverIntent(rawIntent)
      ? rawResolution
      : latchedReorderResolution;
    hoverResolutionRef.current = displayResolution;
    setHoverResolution(displayResolution);
    return displayResolution;
  };

  return {
    clearHoverConfirmTimer,
    syncConfirmedHoverResolution,
    clearCommittedHoverResolution,
    commitResolvedHoverResolution,
  };
}
