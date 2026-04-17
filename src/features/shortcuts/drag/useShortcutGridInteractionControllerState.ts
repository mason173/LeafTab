import { useCallback, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import { DRAG_MOTION_ANIMATIONS_ENABLED } from './dragAnimationConfig';
import {
  type ActiveDragSession,
  type PendingDragSession,
} from './dragSessionRuntime';
import type { FolderShortcutRenderableItem, RootShortcutRenderableItem } from './dragRenderableItems';
import type {
  FolderExtractDragStartPayload,
  FolderShortcutDropIntent,
  RootDragSessionMeta,
  RootShortcutDropIntent,
} from './types';
import type { DragSettlePreview } from './useDragMotionState';
import { useDragMotionState } from './useDragMotionState';
import { useProjectionSettleSuppression } from './useProjectionSettleSuppression';
import { useRootDragSessionBridge } from './useRootDragSessionBridge';
import { useFolderDragSessionBridge } from './useFolderDragSessionBridge';
import { useFolderExtractHandoffController } from './useFolderExtractHandoffController';
import { useRootSurfaceEffects } from './useRootSurfaceEffects';
import { useFolderSurfaceEffects } from './useFolderSurfaceEffects';
import { useShortcutGridMeasurementState } from './useShortcutGridMeasurementState';
import type { Shortcut } from '@/types';

type PendingRootDragState = PendingDragSession<string, RootDragSessionMeta>;
type ActiveRootDragState = ActiveDragSession<string, RootDragSessionMeta>;

type FolderDragSessionMeta = {
  activeShortcutIndex: number;
};

type PendingFolderDragState = PendingDragSession<string, FolderDragSessionMeta>;
type ActiveFolderDragSession = ActiveDragSession<string, FolderDragSessionMeta>;

const ROOT_LAYOUT_SHIFT_MIN_DISTANCE_PX = 0.5;
const ROOT_LAYOUT_SHIFT_SETTLE_DURATION_MS = 360;
const FOLDER_LAYOUT_SHIFT_MIN_DISTANCE_PX = 0.5;
const FOLDER_DRAG_RELEASE_SETTLE_DURATION_MS = 220;
const POINTER_MOVE_LISTENER_OPTIONS = { passive: false } as const;
const POINTER_END_LISTENER_OPTIONS = { passive: true } as const;

export function useRootShortcutGridInteractionControllerState(params: {
  rootRef: RefObject<HTMLDivElement | null>;
  items: RootShortcutRenderableItem[];
  shortcuts: Shortcut[];
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
  onShortcutReorder: (nextShortcuts: Shortcut[]) => void;
  onShortcutDropIntent?: (intent: RootShortcutDropIntent) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  externalDragSession?: { token: number } | null;
  onExternalDragSessionConsumed?: (token: number) => void;
}): {
  pendingDragRef: MutableRefObject<PendingRootDragState | null>;
  ignoreClickRef: MutableRefObject<boolean>;
  itemElementsRef: MutableRefObject<Map<string, HTMLDivElement>>;
  activeDragId: string | null;
  dragPointer: { x: number; y: number } | null;
  dragPreviewOffset: { x: number; y: number } | null;
  hoverResolution: ReturnType<typeof useRootDragSessionBridge>['hoverResolution'];
  layoutShiftOffsets: ReturnType<typeof useDragMotionState>['layoutShiftOffsets'];
  disableLayoutShiftTransition: boolean;
  dragLayoutSnapshot: ReturnType<typeof useShortcutGridMeasurementState<RootShortcutRenderableItem>>['dragLayoutSnapshot'];
} {
  const pendingDragRef = useRef<PendingRootDragState | null>(null);
  const activeDragRef = useRef<ActiveRootDragState | null>(null);
  const ignoreClickRef = useRef(false);
  const {
    layoutShiftOffsets,
    disableLayoutShiftTransition,
    commitMeasuredItemRects,
  } = useDragMotionState({
    minLayoutShiftDistancePx: ROOT_LAYOUT_SHIFT_MIN_DISTANCE_PX,
    settleDurationMs: ROOT_LAYOUT_SHIFT_SETTLE_DURATION_MS,
    disabled: !DRAG_MOTION_ANIMATIONS_ENABLED,
  });
  const getRootItemId = useCallback((item: RootShortcutRenderableItem) => item.sortId, []);
  const {
    itemElementsRef,
    dragLayoutSnapshot,
    captureDragLayoutSnapshot,
    getDragLayoutSnapshot,
    clearDragLayoutSnapshot,
    measureCurrentItems,
  } = useShortcutGridMeasurementState({
    items: params.items,
    getId: getRootItemId,
    commitMeasuredItemRects,
    commitSkipped: Boolean(activeDragRef.current),
  });
  const {
    activeDragId,
    dragPointer,
    dragPreviewOffset,
    hoverResolution,
  } = useRootDragSessionBridge({
    pendingDragRef,
    activeDragRef,
    rootRef: params.rootRef,
    items: params.items,
    shortcuts: params.shortcuts,
    gridColumns: params.gridColumns,
    gridColumnWidth: params.gridColumnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
    compactIconSize: params.compactIconSize,
    largeFolderEnabled: params.largeFolderEnabled,
    largeFolderPreviewSize: params.largeFolderPreviewSize,
    captureDragLayoutSnapshot,
    getDragLayoutSnapshot,
    clearDragLayoutSnapshot,
    measureCurrentItems,
    onShortcutReorder: params.onShortcutReorder,
    onShortcutDropIntent: params.onShortcutDropIntent,
    onDragStart: params.onDragStart,
    onDragEnd: params.onDragEnd,
  });

  useRootSurfaceEffects({
    active: Boolean(activeDragId),
    ignoreClickRef,
    externalDragSession: params.externalDragSession,
    onExternalDragSessionConsumed: params.onExternalDragSessionConsumed,
  });

  return {
    pendingDragRef,
    ignoreClickRef,
    itemElementsRef,
    activeDragId,
    dragPointer,
    dragPreviewOffset,
    hoverResolution,
    layoutShiftOffsets,
    disableLayoutShiftTransition,
    dragLayoutSnapshot,
  };
}

export function useFolderShortcutSurfaceInteractionControllerState(params: {
  rootRef: RefObject<HTMLDivElement | null>;
  maskBoundaryRef: RefObject<HTMLElement | null>;
  folderId: string;
  shortcuts: Shortcut[];
  measuredItems: FolderShortcutRenderableItem[];
  columns: number;
  onShortcutDropIntent: (intent: FolderShortcutDropIntent) => void;
  onExtractDragStart?: (payload: FolderExtractDragStartPayload) => void;
  onDragActiveChange?: (active: boolean) => void;
}): {
  pendingDragRef: MutableRefObject<PendingFolderDragState | null>;
  ignoreClickRef: MutableRefObject<boolean>;
  itemElementsRef: MutableRefObject<Map<string, HTMLDivElement>>;
  activeDragId: string | null;
  dragPointer: { x: number; y: number } | null;
  dragPreviewOffset: { x: number; y: number } | null;
  hoverResolution: ReturnType<typeof useFolderDragSessionBridge>['hoverResolution'];
  hoveredMask: ReturnType<typeof useFolderDragSessionBridge>['hoveredMask'];
  layoutShiftOffsets: ReturnType<typeof useDragMotionState<Shortcut>>['layoutShiftOffsets'];
  disableLayoutShiftTransition: boolean;
  suppressProjectionSettleAnimation: boolean;
  dragSettlePreview: DragSettlePreview<Shortcut> | null;
  dragLayoutSnapshot: ReturnType<typeof useShortcutGridMeasurementState<FolderShortcutRenderableItem>>['dragLayoutSnapshot'];
} {
  const ignoreClickRef = useRef(false);
  const pendingDragRef = useRef<PendingFolderDragState | null>(null);
  const dragSessionRef = useRef<ActiveFolderDragSession | null>(null);
  const {
    layoutShiftOffsets,
    disableLayoutShiftTransition,
    dragSettlePreview,
    commitMeasuredItemRects,
    startDragSettlePreview,
    clearDragSettlePreview,
  } = useDragMotionState<Shortcut>({
    minLayoutShiftDistancePx: FOLDER_LAYOUT_SHIFT_MIN_DISTANCE_PX,
    settleDurationMs: FOLDER_DRAG_RELEASE_SETTLE_DURATION_MS,
    disabled: !DRAG_MOTION_ANIMATIONS_ENABLED,
  });
  const {
    suppressProjectionSettleAnimation,
    armProjectionSettleSuppression,
  } = useProjectionSettleSuppression({
    disabled: !DRAG_MOTION_ANIMATIONS_ENABLED,
  });
  const getFolderItemId = useCallback((item: FolderShortcutRenderableItem) => item.shortcut.id, []);
  const {
    itemElementsRef,
    dragLayoutSnapshot,
    captureDragLayoutSnapshot,
    getDragLayoutSnapshot,
    clearDragLayoutSnapshot,
    measureCurrentItems,
  } = useShortcutGridMeasurementState({
    items: params.measuredItems,
    getId: getFolderItemId,
    commitMeasuredItemRects,
    commitSkipped: Boolean(dragSessionRef.current) || suppressProjectionSettleAnimation,
  });
  const {
    clearExtractHandoffTimer,
    ensureExtractHandoffTimer,
    publishLatestPointer,
    bindClearDragState,
  } = useFolderExtractHandoffController({
    folderId: params.folderId,
    activeDragRef: dragSessionRef,
    getDragLayoutSnapshot,
    measureCurrentItems,
    onExtractDragStart: params.onExtractDragStart,
  });

  const {
    activeDragId,
    dragPointer,
    dragPreviewOffset,
    hoverResolution,
    clearDragState,
    hoveredMask,
  } = useFolderDragSessionBridge({
    pendingDragRef,
    activeDragRef: dragSessionRef,
    rootRef: params.rootRef,
    maskBoundaryRef: params.maskBoundaryRef,
    folderId: params.folderId,
    shortcuts: params.shortcuts,
    measuredItems: params.measuredItems,
    dragLayoutSnapshot,
    columns: params.columns,
    captureDragLayoutSnapshot,
    getDragLayoutSnapshot,
    clearDragLayoutSnapshot,
    measureCurrentItems,
    ensureExtractHandoffTimer,
    clearExtractHandoffTimer,
    publishLatestPointer,
    armProjectionSettleSuppression,
    startDragSettlePreview,
    onShortcutDropIntent: params.onShortcutDropIntent,
    setUserSelect: (value) => {
      document.body.style.userSelect = value;
    },
    pointerMoveOptions: POINTER_MOVE_LISTENER_OPTIONS,
    pointerEndOptions: POINTER_END_LISTENER_OPTIONS,
  });
  bindClearDragState(clearDragState);

  useFolderSurfaceEffects({
    active: Boolean(activeDragId),
    ignoreClickRef,
    onDragActiveChange: params.onDragActiveChange,
    clearDragState,
    clearDragSettlePreview,
  });

  return {
    pendingDragRef,
    ignoreClickRef,
    itemElementsRef,
    activeDragId,
    dragPointer,
    dragPreviewOffset,
    hoverResolution,
    hoveredMask,
    layoutShiftOffsets,
    disableLayoutShiftTransition,
    suppressProjectionSettleAnimation,
    dragSettlePreview,
    dragLayoutSnapshot,
  };
}
