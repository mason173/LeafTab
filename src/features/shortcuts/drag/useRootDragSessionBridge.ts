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
  resolveRootHoverTargetRegions,
} from './dragHoverResolvers';
import type { MeasuredDragItem } from './gridDragEngine';
import type { RootDragRenderableItem } from './rootDragRenderState';
import type { RootDragSessionMeta, RootShortcutDropIntent } from './types';
import { useRootPointerHoverSession } from './useRootPointerHoverSession';
import { useRootResolvedDragSession } from './useRootResolvedDragSession';

const EMPTY_ROOT_HOVER_RESOLUTION = createEmptyDragHoverResolution<RootShortcutDropIntent>();

export function useRootDragSessionBridge<T extends RootDragRenderableItem>(params: {
  pendingDragRef: MutableRefObject<PendingDragSession<string, RootDragSessionMeta> | null>;
  activeDragRef: MutableRefObject<ActiveDragSession<string, RootDragSessionMeta> | null>;
  rootRef: RefObject<HTMLDivElement | null>;
  items: readonly T[];
  shortcuts: Shortcut[];
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
  captureDragLayoutSnapshot: <TResult>(measure: () => TResult) => TResult;
  getDragLayoutSnapshot: <TResult>(measure: () => TResult) => TResult;
  clearDragLayoutSnapshot: () => void;
  measureCurrentItems: () => Array<MeasuredDragItem<T>>;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  onShortcutDropIntent?: (intent: RootShortcutDropIntent) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const resolveRegions = useCallback((item: MeasuredDragItem<T>) => resolveRootHoverTargetRegions({
    item,
    compactIconSize: params.compactIconSize,
    largeFolderEnabled: params.largeFolderEnabled,
    largeFolderPreviewSize: params.largeFolderPreviewSize,
  }), [
    params.compactIconSize,
    params.largeFolderEnabled,
    params.largeFolderPreviewSize,
  ]);

  const {
    resolveHover,
    handleHoverResolved,
    clearHoverState,
  } = useRootPointerHoverSession({
    activeDragRef: params.activeDragRef,
    items: params.items,
    shortcuts: params.shortcuts,
    gridColumns: params.gridColumns,
    gridColumnWidth: params.gridColumnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
    getDragLayoutSnapshot: params.getDragLayoutSnapshot,
    measureCurrentItems: params.measureCurrentItems,
    resolveRootRect: () => measureNullableElementDomRect(params.rootRef.current),
    resolveRegions,
    emptyHoverResolution: EMPTY_ROOT_HOVER_RESOLUTION,
  });

  return useRootResolvedDragSession({
    pendingDragRef: params.pendingDragRef,
    activeDragRef: params.activeDragRef,
    emptyHoverResolution: EMPTY_ROOT_HOVER_RESOLUTION,
    shortcuts: params.shortcuts,
    captureDragLayoutSnapshot: params.captureDragLayoutSnapshot,
    measureCurrentItems: params.measureCurrentItems,
    resolveHover,
    handleHoverResolved,
    clearHoverState,
    clearDragLayoutSnapshot: params.clearDragLayoutSnapshot,
    onShortcutReorder: params.onShortcutReorder,
    onShortcutDropIntent: params.onShortcutDropIntent,
    onDragStart: params.onDragStart,
    onDragEnd: params.onDragEnd,
  });
}
