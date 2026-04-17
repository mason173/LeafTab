import { useCallback } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import type { Shortcut } from '@/types';
import {
  createEmptyDragHoverResolution,
  type ActiveDragSession,
  type PendingDragSession,
} from './dragSessionRuntime';
import {
  measureNullableElementDomRect,
  resolveFolderHoverTargetRegions,
} from './dragHoverResolvers';
import type { MeasuredDragItem } from './gridDragEngine';
import type { FolderDragRenderableItem } from './folderDragRenderState';
import type { DragPoint, RootShortcutDropIntent } from './types';
import { useFolderPointerHoverSession } from './useFolderPointerHoverSession';
import { useFolderResolvedDragSession } from './useFolderResolvedDragSession';

type FolderDragSessionMeta = {
  activeShortcutIndex: number;
};

const EMPTY_FOLDER_HOVER_RESOLUTION = createEmptyDragHoverResolution<RootShortcutDropIntent>();

export function useFolderDragSessionBridge<T extends FolderDragRenderableItem & { shortcut: Shortcut; shortcutIndex: number }>(params: {
  pendingDragRef: MutableRefObject<PendingDragSession<string, FolderDragSessionMeta> | null>;
  activeDragRef: MutableRefObject<ActiveDragSession<string, FolderDragSessionMeta> | null>;
  rootRef: RefObject<HTMLDivElement | null>;
  maskBoundaryRef: RefObject<HTMLElement | null>;
  folderId: string;
  shortcuts: Shortcut[];
  measuredItems: T[];
  dragLayoutSnapshot: Array<MeasuredDragItem<T>> | null;
  columns: number;
  captureDragLayoutSnapshot: <TResult>(measure: () => TResult) => TResult;
  getDragLayoutSnapshot: <TResult>(measure: () => TResult) => TResult;
  clearDragLayoutSnapshot: () => void;
  measureCurrentItems: () => Array<MeasuredDragItem<T>>;
  ensureExtractHandoffTimer: () => void;
  clearExtractHandoffTimer: () => void;
  publishLatestPointer: (pointer: DragPoint | null) => void;
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
  const resolveRegions = useCallback((item: MeasuredDragItem<T>) => resolveFolderHoverTargetRegions({
    item,
    columns: params.columns,
    rootRect: measureNullableElementDomRect(params.rootRef.current),
  }), [params.columns, params.rootRef]);

  const {
    hoveredMask,
    hoveredMaskRef,
    resolveHover,
    handleHoverResolved,
    clearHoverState,
  } = useFolderPointerHoverSession({
    shortcuts: params.shortcuts,
    getDragLayoutSnapshot: params.getDragLayoutSnapshot,
    measureCurrentItems: params.measureCurrentItems,
    resolveRegions,
    resolveBoundaryRect: () => measureNullableElementDomRect(params.maskBoundaryRef.current),
    ensureExtractHandoffTimer: params.ensureExtractHandoffTimer,
    clearExtractHandoffTimer: params.clearExtractHandoffTimer,
    emptyHoverResolution: EMPTY_FOLDER_HOVER_RESOLUTION,
  });

  const clearResolvedDragState = useCallback(() => {
    params.clearExtractHandoffTimer();
    params.publishLatestPointer(null);
    clearHoverState();
    params.clearDragLayoutSnapshot();
    params.setUserSelect('');
  }, [
    clearHoverState,
    params,
  ]);

  const dragSession = useFolderResolvedDragSession({
    pendingDragRef: params.pendingDragRef,
    activeDragRef: params.activeDragRef,
    emptyHoverResolution: EMPTY_FOLDER_HOVER_RESOLUTION,
    folderId: params.folderId,
    shortcuts: params.shortcuts,
    measuredItems: params.measuredItems,
    dragLayoutSnapshot: params.dragLayoutSnapshot,
    hoveredMaskRef,
    captureDragLayoutSnapshot: params.captureDragLayoutSnapshot,
    measureCurrentItems: params.measureCurrentItems,
    resolveHover: ({ activeDrag, pointer, previousHoverResolution }) => {
      params.publishLatestPointer(pointer);
      return resolveHover({
        activeDrag,
        pointer,
        previousHoverResolution,
      });
    },
    handleHoverResolved,
    clearHoverState: clearResolvedDragState,
    armProjectionSettleSuppression: params.armProjectionSettleSuppression,
    startDragSettlePreview: params.startDragSettlePreview,
    onShortcutDropIntent: params.onShortcutDropIntent,
    setUserSelect: params.setUserSelect,
    pointerMoveOptions: params.pointerMoveOptions,
    pointerEndOptions: params.pointerEndOptions,
  });

  return {
    hoveredMask,
    hoveredMaskRef,
    ...dragSession,
  };
}
