import type { MutableRefObject } from 'react';
import type { Shortcut } from '@/types';
import type { RootShortcutDropIntent } from './types';
import type { ActiveDragSession, DragHoverResolution, PendingDragSession } from './dragSessionRuntime';
import { applyFolderDragRelease, resolveFolderDragRelease } from './dragReleaseAdapters';
import { useResolvedPointerDragSession, type ResolvedPointerDragHover } from './useResolvedPointerDragSession';

type FolderDragSessionMeta = {
  activeShortcutIndex: number;
};

export function useFolderResolvedDragSession<TItem>(params: {
  pendingDragRef: MutableRefObject<PendingDragSession<string, FolderDragSessionMeta> | null>;
  activeDragRef: MutableRefObject<ActiveDragSession<string, FolderDragSessionMeta> | null>;
  emptyHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  folderId: string;
  shortcuts: Shortcut[];
  measuredItems: TItem[];
  dragLayoutSnapshot: Array<(TItem & { rect: { left: number; top: number; right: number; bottom: number; width: number; height: number } })> | null;
  hoveredMaskRef: MutableRefObject<boolean>;
  captureDragLayoutSnapshot: <TResult>(measure: () => TResult) => TResult;
  measureCurrentItems: () => unknown;
  resolveHover: (params: {
    activeDrag: ActiveDragSession<string, FolderDragSessionMeta>;
    pointer: { x: number; y: number };
    previousHoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  }) => ResolvedPointerDragHover<RootShortcutDropIntent, { hoveredMask: boolean; recognitionPoint: { x: number; y: number } | null }>;
  handleHoverResolved: (resolvedHover: { hoveredMask: boolean; recognitionPoint: { x: number; y: number } | null }) => void;
  clearHoverState: () => void;
  armProjectionSettleSuppression: () => void;
  startDragSettlePreview: (preview: {
    itemId: string;
    item: Shortcut;
    fromLeft: number;
    fromTop: number;
    toLeft: number;
    toTop: number;
  }) => void;
  onShortcutDropIntent: (intent: { type: 'reorder-folder-shortcuts'; folderId: string; shortcutId: string; targetIndex: number; edge: 'before' | 'after' } | { type: 'extract-folder-shortcut'; folderId: string; shortcutId: string; }) => void;
  setUserSelect: (value: string) => void;
  pointerMoveOptions: AddEventListenerOptions | boolean;
  pointerEndOptions: AddEventListenerOptions | boolean;
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
    onActivated: ({ event }) => {
      params.captureDragLayoutSnapshot(params.measureCurrentItems);
      params.setUserSelect('none');
      event.preventDefault();
    },
    onHoverResolved: ({ event, resolvedHover }) => {
      params.handleHoverResolved(resolvedHover.extra);
      event.preventDefault();
    },
    onEnded: ({ activeDrag, hoverResolution, clearDragState }) => {
      const release = resolveFolderDragRelease({
        folderId: params.folderId,
        shortcuts: params.shortcuts,
        measuredItems: params.measuredItems,
        layoutSnapshot: params.dragLayoutSnapshot,
        dragSession: activeDrag,
        hoverResolution,
        hoveredMask: params.hoveredMaskRef.current,
      });

      clearDragState();
      applyFolderDragRelease({
        release,
        armProjectionSettleSuppression: params.armProjectionSettleSuppression,
        startDragSettlePreview: params.startDragSettlePreview,
        onShortcutDropIntent: params.onShortcutDropIntent,
      });
    },
    onCleared: () => {
      params.clearHoverState();
    },
    pointerMoveOptions: params.pointerMoveOptions,
    pointerEndOptions: params.pointerEndOptions,
  });
}
