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
import type { DragHoverResolution } from '@/features/shortcuts/drag/dragSessionRuntime';
import type { RootShortcutDropIntent } from '@/features/shortcuts/drag/types';
import type { DragSettlePreview } from '@/features/shortcuts/drag/useDragMotionState';
import type { Shortcut } from '@/types';
import type {
  FolderShortcutPendingDragSession,
  RootShortcutPendingDragSession,
} from './shortcutGridSceneSharedTypes';

const ROOT_DRAG_OVERLAY_Z_INDEX = 90;
const FOLDER_DRAG_OVERLAY_Z_INDEX = 2147483000;

type SharedSceneAssemblyRefs = {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
};

type SharedPointerDragAssemblyState = {
  activeDragId: string | null;
  dragPointer: { x: number; y: number } | null;
  dragPreviewOffset: { x: number; y: number } | null;
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  disableLayoutShiftTransition: boolean;
};

type SharedAssemblyRegistryState<TPendingDragRef> = {
  pendingDragRef: React.MutableRefObject<TPendingDragRef>;
  itemElements: Map<string, HTMLDivElement>;
  ignoreClickRef: React.MutableRefObject<boolean>;
};

type SharedSceneInteractionState<TItem, TPendingDragRef, TExtra extends object = {}> =
  SharedPointerDragAssemblyState
  & SharedAssemblyRegistryState<TPendingDragRef>
  & {
    layoutSnapshot: Array<MeasuredDragItem<TItem>> | null;
  }
  & TExtra;

type SharedSceneLayoutState<TItem, TExtra extends object = {}> = {
  items: readonly TItem[];
} & TExtra;

function buildSharedPointerDragAssemblyParams(
  params: SharedPointerDragAssemblyState & { dragOverlayZIndex: number },
) {
  return {
    activeDragId: params.activeDragId,
    hoverResolution: params.hoverResolution,
    dragPointer: params.dragPointer,
    dragPreviewOffset: params.dragPreviewOffset,
    layoutShiftOffsets: params.layoutShiftOffsets,
    disableLayoutShiftTransition: params.disableLayoutShiftTransition,
    dragOverlayZIndex: params.dragOverlayZIndex,
  };
}

function buildSharedAssemblyRegistryState<TPendingDragRef>(
  state: SharedAssemblyRegistryState<TPendingDragRef>,
) {
  return {
    pendingDragRef: state.pendingDragRef,
    itemElements: state.itemElements,
    ignoreClickRef: state.ignoreClickRef,
  };
}

function buildSharedSceneAssemblyBaseParams<TItem, TPendingDragRef, TVisualOptions, TRenderDragPreview, TOnShortcutContextMenu>(params: {
  refs: SharedSceneAssemblyRefs;
  items: readonly TItem[];
  shortcuts: Shortcut[];
  interactionState: SharedSceneInteractionState<TItem, TPendingDragRef>;
  firefox: boolean;
  visualOptions: TVisualOptions;
  renderDragPreview: TRenderDragPreview;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: TOnShortcutContextMenu;
  dragOverlayZIndex: number;
}) {
  return {
    ...params.refs,
    items: params.items,
    shortcuts: params.shortcuts,
    layoutSnapshot: params.interactionState.layoutSnapshot,
    ...buildSharedPointerDragAssemblyParams({
      ...params.interactionState,
      dragOverlayZIndex: params.dragOverlayZIndex,
    }),
    firefox: params.firefox,
    visualOptions: params.visualOptions,
    renderDragPreview: params.renderDragPreview,
    ...buildSharedAssemblyRegistryState(params.interactionState),
    onShortcutOpen: params.onShortcutOpen,
    onShortcutContextMenu: params.onShortcutContextMenu,
  };
}

function buildShortcutSceneAssemblyParams<
  TItem,
  TPendingDragRef,
  TVisualOptions,
  TRenderDragPreview,
  TOnShortcutContextMenu,
  TResult,
  TExtra extends object,
>(params: {
  refs: SharedSceneAssemblyRefs;
  items: readonly TItem[];
  shortcuts: Shortcut[];
  interactionState: SharedSceneInteractionState<TItem, TPendingDragRef>;
  firefox: boolean;
  visualOptions: TVisualOptions;
  renderDragPreview: TRenderDragPreview;
  onShortcutOpen: (shortcut: Shortcut) => void;
  onShortcutContextMenu: TOnShortcutContextMenu;
  dragOverlayZIndex: number;
  buildExtraParams: () => TExtra;
  buildResult: (params: ReturnType<typeof buildSharedSceneAssemblyBaseParams<
    TItem,
    TPendingDragRef,
    TVisualOptions,
    TRenderDragPreview,
    TOnShortcutContextMenu
  >> & TExtra) => TResult;
}): TResult {
  return params.buildResult({
    ...buildSharedSceneAssemblyBaseParams({
      refs: params.refs,
      items: params.items,
      shortcuts: params.shortcuts,
      interactionState: params.interactionState,
      firefox: params.firefox,
      visualOptions: params.visualOptions,
      renderDragPreview: params.renderDragPreview,
      onShortcutOpen: params.onShortcutOpen,
      onShortcutContextMenu: params.onShortcutContextMenu,
      dragOverlayZIndex: params.dragOverlayZIndex,
    }),
    ...params.buildExtraParams(),
  });
}

type RootSceneLayoutState<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}> = SharedSceneLayoutState<TItem, {
  packedItems: Array<PackedGridItem<TItem>>;
  gridMinHeight: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  usesSpanAwareReorder: boolean;
}>;

type RootSceneInteractionState<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}> = SharedSceneInteractionState<
  TItem,
  RootShortcutPendingDragSession
>;

export function buildRootShortcutGridSceneAssemblyParams<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}>(params: {
  refs: SharedSceneAssemblyRefs;
  controllerParams: RootShortcutGridSceneControllerParams;
  firefox: boolean;
  visualOptions: RootSceneAssemblyParams<TItem>['visualOptions'];
  layoutState: RootSceneLayoutState<TItem>;
  interactionState: RootSceneInteractionState<TItem>;
  renderCenterPreview: RootSceneAssemblyParams<TItem>['renderCenterPreview'];
}): RootSceneAssemblyParams<TItem> {
  return buildShortcutSceneAssemblyParams({
    refs: params.refs,
    items: params.layoutState.items,
    shortcuts: params.controllerParams.shortcuts,
    interactionState: params.interactionState,
    firefox: params.firefox,
    visualOptions: params.visualOptions,
    renderDragPreview: params.controllerParams.renderDragPreview,
    onShortcutOpen: params.controllerParams.onShortcutOpen,
    onShortcutContextMenu: params.controllerParams.onShortcutContextMenu,
    dragOverlayZIndex: ROOT_DRAG_OVERLAY_Z_INDEX,
    buildExtraParams: () => ({
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
    }),
    buildResult: (result) => result,
  });
}

type FolderSceneLayoutState<TItem extends FolderDragRenderableItem & { shortcutIndex: number }> = SharedSceneLayoutState<TItem, {
  columns: number;
}>;

type FolderSceneInteractionState<TItem extends FolderDragRenderableItem & { shortcutIndex: number }> = SharedSceneInteractionState<
  TItem,
  FolderShortcutPendingDragSession,
  {
    suppressProjectionSettleAnimation: boolean;
    dragSettlePreview: DragSettlePreview<Shortcut> | null;
    hoveredMask: boolean;
  }
>;

export function buildFolderShortcutSurfaceSceneAssemblyParams<TItem extends FolderDragRenderableItem & { shortcutIndex: number }>(params: {
  refs: SharedSceneAssemblyRefs;
  controllerParams: FolderShortcutSurfaceSceneControllerParams;
  firefox: boolean;
  visualOptions: FolderSceneAssemblyParams<TItem>['visualOptions'];
  layoutState: FolderSceneLayoutState<TItem>;
  interactionState: FolderSceneInteractionState<TItem>;
}): FolderSceneAssemblyParams<TItem> {
  return buildShortcutSceneAssemblyParams({
    refs: params.refs,
    items: params.layoutState.items,
    shortcuts: params.controllerParams.shortcuts,
    interactionState: params.interactionState,
    firefox: params.firefox,
    visualOptions: params.visualOptions,
    renderDragPreview: params.controllerParams.renderDragPreview,
    onShortcutOpen: params.controllerParams.onShortcutOpen,
    onShortcutContextMenu: params.controllerParams.onShortcutContextMenu,
    dragOverlayZIndex: FOLDER_DRAG_OVERLAY_Z_INDEX,
    buildExtraParams: () => ({
      maskBoundaryRef: params.controllerParams.maskBoundaryRef,
      dragSettlePreview: params.interactionState.dragSettlePreview,
      suppressProjectionSettleAnimation: params.interactionState.suppressProjectionSettleAnimation,
      columns: params.layoutState.columns,
      hoveredMask: params.interactionState.hoveredMask,
      settleAnimationsEnabled: DRAG_MOTION_ANIMATIONS_ENABLED,
      renderShortcutCard: params.controllerParams.renderShortcutCard,
    }),
    buildResult: (result) => result,
  });
}
