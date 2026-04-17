import type { MutableRefObject } from 'react';
import type { Shortcut } from '@/types';
import type { RootDragActiveTarget, RootDragSessionMeta, RootShortcutDropIntent } from './types';
import type { ActiveDragSession, DragHoverResolution, PendingDragSession } from './dragSessionRuntime';
import { applyRootDragRelease, resolveRootDragRelease } from './dragReleaseAdapters';
import { useResolvedPointerDragSession, type ResolvedPointerDragHover } from './useResolvedPointerDragSession';

export function useRootResolvedDragSession(params: {
  pendingDragRef: MutableRefObject<PendingDragSession<string, RootDragSessionMeta> | null>;
  activeDragRef: MutableRefObject<ActiveDragSession<string, RootDragSessionMeta> | null>;
  emptyHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  shortcuts: Shortcut[];
  captureDragLayoutSnapshot: <TResult>(measure: () => TResult) => TResult;
  measureCurrentItems: () => unknown;
  buildDirectionMap: (params: {
    activeDrag: ActiveDragSession<string, RootDragSessionMeta>;
  }) => NonNullable<RootDragSessionMeta['directionMap']>;
  resolveHover: (params: {
    activeDrag: ActiveDragSession<string, RootDragSessionMeta>;
    pointer: { x: number; y: number };
    previousHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  }) => ResolvedPointerDragHover<RootShortcutDropIntent, {
    activeTarget: RootDragActiveTarget | null;
    recognitionPoint: { x: number; y: number } | null;
  }>;
  handleHoverResolved: (resolvedHover: {
    activeTarget: RootDragActiveTarget | null;
    recognitionPoint: { x: number; y: number } | null;
  }) => void;
  clearHoverState: () => void;
  clearDragLayoutSnapshot: () => void;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  onShortcutDropIntent?: (intent: RootShortcutDropIntent) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  return useResolvedPointerDragSession({
    pendingDragRef: params.pendingDragRef,
    activeDragRef: params.activeDragRef,
    emptyHoverResolution: params.emptyHoverResolution,
    resolveHover: ({ activeDrag, pointer, previousHoverResolution }) => params.resolveHover({
      activeDrag,
      pointer,
      previousHoverResolution,
    }),
    onActivated: ({ activeDrag }) => {
      params.captureDragLayoutSnapshot(params.measureCurrentItems);
      params.activeDragRef.current = {
        ...activeDrag,
        directionMap: params.buildDirectionMap({ activeDrag }),
      };
      params.onDragStart?.();
    },
    onHoverResolved: ({ resolvedHover }) => {
      params.handleHoverResolved(resolvedHover.extra);
    },
    onEnded: ({ hoverResolution, clearDragState }) => {
      const release = resolveRootDragRelease({
        shortcuts: params.shortcuts,
        hoverResolution,
      });
      clearDragState();
      applyRootDragRelease({
        release,
        onShortcutReorder: params.onShortcutReorder,
        onShortcutDropIntent: params.onShortcutDropIntent,
      });
      params.onDragEnd?.();
    },
    onCleared: () => {
      params.clearHoverState();
      params.clearDragLayoutSnapshot();
    },
  });
}
