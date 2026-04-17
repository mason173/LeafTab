import type React from 'react';
import { DRAG_MOTION_ANIMATIONS_ENABLED } from '@/features/shortcuts/drag/dragAnimationConfig';
import type {
  FolderSceneAssemblyParams,
  RootSceneAssemblyParams,
} from './shortcutGridSceneAssemblyAdapters';
import type {
  FolderShortcutSurfaceSceneControllerParams,
} from './folderShortcutSurfaceSceneController';
import type {
  RootShortcutGridSceneControllerParams,
} from './rootShortcutGridSceneController';
import type { FolderDragRenderableItem } from '@/features/shortcuts/drag/folderDragRenderState';
import type { MeasuredDragItem, ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';
import type { PackedGridItem } from '@/features/shortcuts/drag/gridLayout';
import type { RootDragRenderableItem } from '@/features/shortcuts/drag/rootDragRenderState';
import type { ResolvedDragHoverState } from '@/features/shortcuts/drag/dragSessionRuntime';
import type { RootShortcutDropIntent } from '@/features/shortcuts/drag/types';
import type { DragSettlePreview } from '@/features/shortcuts/drag/useDragMotionState';
import type { Shortcut } from '@/types';
import type {
  FolderShortcutPendingDragSession,
  RootShortcutPendingDragSession,
} from './shortcutGridSceneSharedTypes';

const ROOT_DRAG_OVERLAY_Z_INDEX = 90;
const FOLDER_DRAG_OVERLAY_Z_INDEX = 2147483000;

type SceneAssemblyRefs = {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
};

type PointerDragAssemblyState = {
  activeDragId: string | null;
  dragPointer: { x: number; y: number } | null;
  dragPreviewOffset: { x: number; y: number } | null;
  hoverState: ResolvedDragHoverState<RootShortcutDropIntent>;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  disableLayoutShiftTransition: boolean;
};

type AssemblyRegistryState<TPendingDragRef> = {
  pendingDragRef: React.MutableRefObject<TPendingDragRef>;
  itemElements: Map<string, HTMLDivElement>;
  ignoreClickRef: React.MutableRefObject<boolean>;
};

type RootSceneInteractionState<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}> =
  PointerDragAssemblyState
  & AssemblyRegistryState<RootShortcutPendingDragSession>
  & {
    layoutSnapshot: Array<MeasuredDragItem<TItem>> | null;
  };

type RootSceneLayoutState<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}> = {
  items: readonly TItem[];
  packedItems: Array<PackedGridItem<TItem>>;
  gridMinHeight: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  usesSpanAwareReorder: boolean;
};

function buildRootSceneAssemblySessionParams<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}>(params: {
  refs: SceneAssemblyRefs;
  controllerParams: RootShortcutGridSceneControllerParams;
  firefox: boolean;
  visualOptions: RootSceneAssemblyParams<TItem>['visualOptions'];
  interactionState: RootSceneInteractionState<TItem>;
}) {
  return {
    ...params.refs,
    shortcuts: params.controllerParams.shortcuts,
    layoutSnapshot: params.interactionState.layoutSnapshot,
    activeDragId: params.interactionState.activeDragId,
    hoverState: params.interactionState.hoverState,
    dragPointer: params.interactionState.dragPointer,
    dragPreviewOffset: params.interactionState.dragPreviewOffset,
    layoutShiftOffsets: params.interactionState.layoutShiftOffsets,
    disableLayoutShiftTransition: params.interactionState.disableLayoutShiftTransition,
    dragOverlayZIndex: ROOT_DRAG_OVERLAY_Z_INDEX,
    firefox: params.firefox,
    visualOptions: params.visualOptions,
    renderDragPreview: params.controllerParams.renderDragPreview,
    pendingDragRef: params.interactionState.pendingDragRef,
    itemElements: params.interactionState.itemElements,
    ignoreClickRef: params.interactionState.ignoreClickRef,
    onShortcutOpen: params.controllerParams.onShortcutOpen,
    onShortcutContextMenu: params.controllerParams.onShortcutContextMenu,
  };
}

export function buildRootShortcutGridSceneAssemblyParams<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}>(params: {
  refs: SceneAssemblyRefs;
  controllerParams: RootShortcutGridSceneControllerParams;
  firefox: boolean;
  visualOptions: RootSceneAssemblyParams<TItem>['visualOptions'];
  layoutState: RootSceneLayoutState<TItem>;
  interactionState: RootSceneInteractionState<TItem>;
  renderCenterPreview: RootSceneAssemblyParams<TItem>['renderCenterPreview'];
}): RootSceneAssemblyParams<TItem> {
  return {
    ...buildRootSceneAssemblySessionParams(params),
    items: params.layoutState.items,
    usesSpanAwareReorder: params.layoutState.usesSpanAwareReorder,
    gridColumns: params.controllerParams.gridColumns,
    gridColumnWidth: params.layoutState.gridColumnWidth,
    columnGap: params.layoutState.columnGap,
    rowHeight: params.layoutState.rowHeight,
    rowGap: params.layoutState.rowGap,
    packedItems: params.layoutState.packedItems,
    containerHeight: params.controllerParams.containerHeight,
    bottomInset: params.controllerParams.bottomInset,
    gridMinHeight: params.layoutState.gridMinHeight,
    onContextMenu: params.controllerParams.onGridContextMenu,
    compactIconSize: params.controllerParams.compactIconSize,
    selectionMode: params.controllerParams.selectionMode,
    disableReorderAnimation: params.controllerParams.disableReorderAnimation,
    selectedShortcutIndexes: params.controllerParams.selectedShortcutIndexes,
    onToggleShortcutSelection: params.controllerParams.onToggleShortcutSelection,
    renderCenterPreview: params.renderCenterPreview,
    renderSelectionIndicator: params.controllerParams.renderSelectionIndicator,
    renderShortcutCard: params.controllerParams.renderShortcutCard,
  };
}

type FolderSceneLayoutState<TItem extends FolderDragRenderableItem & { shortcutIndex: number }> = {
  items: readonly TItem[];
  columns: number;
};

type FolderSceneInteractionState<TItem extends FolderDragRenderableItem & { shortcutIndex: number }> =
  PointerDragAssemblyState
  & AssemblyRegistryState<FolderShortcutPendingDragSession>
  & {
    layoutSnapshot: Array<MeasuredDragItem<TItem>> | null;
    suppressProjectionSettleAnimation: boolean;
    dragSettlePreview: DragSettlePreview<Shortcut> | null;
    hoveredMask: boolean;
  };

function buildFolderSceneAssemblySessionParams<TItem extends FolderDragRenderableItem & { shortcutIndex: number }>(params: {
  refs: SceneAssemblyRefs;
  controllerParams: FolderShortcutSurfaceSceneControllerParams;
  firefox: boolean;
  visualOptions: FolderSceneAssemblyParams<TItem>['visualOptions'];
  interactionState: FolderSceneInteractionState<TItem>;
}) {
  return {
    ...params.refs,
    shortcuts: params.controllerParams.shortcuts,
    layoutSnapshot: params.interactionState.layoutSnapshot,
    activeDragId: params.interactionState.activeDragId,
    hoverState: params.interactionState.hoverState,
    dragPointer: params.interactionState.dragPointer,
    dragPreviewOffset: params.interactionState.dragPreviewOffset,
    layoutShiftOffsets: params.interactionState.layoutShiftOffsets,
    disableLayoutShiftTransition: params.interactionState.disableLayoutShiftTransition,
    dragOverlayZIndex: FOLDER_DRAG_OVERLAY_Z_INDEX,
    firefox: params.firefox,
    visualOptions: params.visualOptions,
    renderDragPreview: params.controllerParams.renderDragPreview,
    pendingDragRef: params.interactionState.pendingDragRef,
    itemElements: params.interactionState.itemElements,
    ignoreClickRef: params.interactionState.ignoreClickRef,
    onShortcutOpen: params.controllerParams.onShortcutOpen,
    onShortcutContextMenu: params.controllerParams.onShortcutContextMenu,
  };
}

export function buildFolderShortcutSurfaceSceneAssemblyParams<TItem extends FolderDragRenderableItem & { shortcutIndex: number }>(params: {
  refs: SceneAssemblyRefs;
  controllerParams: FolderShortcutSurfaceSceneControllerParams;
  firefox: boolean;
  visualOptions: FolderSceneAssemblyParams<TItem>['visualOptions'];
  layoutState: FolderSceneLayoutState<TItem>;
  interactionState: FolderSceneInteractionState<TItem>;
}): FolderSceneAssemblyParams<TItem> {
  return {
    ...buildFolderSceneAssemblySessionParams(params),
    items: params.layoutState.items,
    maskBoundaryRef: params.controllerParams.maskBoundaryRef,
    dragSettlePreview: params.interactionState.dragSettlePreview,
    suppressProjectionSettleAnimation: params.interactionState.suppressProjectionSettleAnimation,
    columns: params.layoutState.columns,
    hoveredMask: params.interactionState.hoveredMask,
    settleAnimationsEnabled: DRAG_MOTION_ANIMATIONS_ENABLED,
    renderShortcutCard: params.controllerParams.renderShortcutCard,
  };
}
