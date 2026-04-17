import type React from 'react';
import type { Shortcut } from '@/types';
import type { ResolvedDragHoverState } from '@/features/shortcuts/drag/dragSessionRuntime';
import type { FolderDragRenderableItem } from '@/features/shortcuts/drag/folderDragRenderState';
import type { MeasuredDragItem, ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';
import type { PackedGridItem } from '@/features/shortcuts/drag/gridLayout';
import type { RootDragRenderableItem } from '@/features/shortcuts/drag/rootDragRenderState';
import type { RootShortcutDropIntent } from '@/features/shortcuts/drag/types';
import type { DragSettlePreview } from '@/features/shortcuts/drag/useDragMotionState';
import type { ProjectedDropPreview } from '@/features/shortcuts/drag/linearReorderProjection';
import {
  buildFolderGridStyle,
  buildRootGridContainerStyle,
  type FolderGridSceneProps,
  type RootGridSceneProps,
} from './shortcutGridSceneAdapters';
import {
  resolveFolderGridSceneComposition,
  resolveRootGridSceneComposition,
} from './shortcutGridSceneCompositionAdapters';
import {
  resolveFolderGridSceneDecorationState,
  resolveRootGridSceneDecorationState,
} from './shortcutGridSceneDecorationAdapters';
import type {
  FolderShortcutContextMenuHandler,
  FolderShortcutDragPreviewRenderer,
  FolderShortcutPendingDragSession,
  FolderShortcutRenderBindings,
  RootShortcutContextMenuHandler,
  RootShortcutDragPreviewRenderer,
  RootShortcutPendingDragSession,
  RootShortcutRenderBindings,
  ShortcutOpenHandler,
} from './shortcutGridSceneSharedTypes';
import type {
  FolderShortcutVisualOptions,
  RootShortcutVisualOptions,
} from './shortcutGridVisualAdapters';

type SceneAssemblyRefs = {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  rootRef: React.RefObject<HTMLDivElement | null>;
};

export type RootSceneAssemblyParams<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}> = SceneAssemblyRefs & {
  items: readonly TItem[];
  shortcuts: Shortcut[];
  layoutSnapshot: Array<MeasuredDragItem<TItem>> | null;
  activeDragId: string | null;
  hoverState: ResolvedDragHoverState<RootShortcutDropIntent>;
  firefox: boolean;
  visualOptions: RootShortcutVisualOptions;
  renderDragPreview: RootShortcutDragPreviewRenderer;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  disableLayoutShiftTransition: boolean;
  pendingDragRef: React.MutableRefObject<RootShortcutPendingDragSession>;
  itemElements: Map<string, HTMLDivElement>;
  ignoreClickRef: React.MutableRefObject<boolean>;
  onShortcutOpen: ShortcutOpenHandler;
  onShortcutContextMenu: RootShortcutContextMenuHandler;
  dragPointer: { x: number; y: number } | null;
  dragPreviewOffset: { x: number; y: number } | null;
  dragOverlayZIndex: number;
  usesSpanAwareReorder: boolean;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  packedItems: Array<PackedGridItem<TItem>>;
  containerHeight: number;
  bottomInset: number;
  gridMinHeight: number;
  onContextMenu: React.MouseEventHandler<HTMLDivElement>;
  compactIconSize: number;
  selectionMode: boolean;
  disableReorderAnimation: boolean;
  selectedShortcutIndexes?: ReadonlySet<number>;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
} & RootShortcutRenderBindings;

export function resolveRootShortcutGridSceneAssembly<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}>(params: RootSceneAssemblyParams<TItem>): RootGridSceneProps {
  const composition = resolveRootGridSceneComposition({
    shortcuts: params.shortcuts,
    items: params.items,
    layoutSnapshot: params.layoutSnapshot,
    activeDragId: params.activeDragId,
    hoverState: params.hoverState,
    rootElement: params.rootRef.current,
    firefox: params.firefox,
    visualOptions: params.visualOptions,
    renderDragPreview: params.renderDragPreview,
    layoutShiftOffsets: params.layoutShiftOffsets,
    disableLayoutShiftTransition: params.disableLayoutShiftTransition,
    pendingDragRef: params.pendingDragRef,
    itemElements: params.itemElements,
    ignoreClickRef: params.ignoreClickRef,
    onShortcutOpen: params.onShortcutOpen,
    onShortcutContextMenu: params.onShortcutContextMenu,
    packedItems: params.packedItems,
    usesSpanAwareReorder: params.usesSpanAwareReorder,
    gridColumns: params.gridColumns,
    gridColumnWidth: params.gridColumnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
    compactIconSize: params.compactIconSize,
    selectionMode: params.selectionMode,
    disableReorderAnimation: params.disableReorderAnimation,
    selectedShortcutIndexes: params.selectedShortcutIndexes,
    onToggleShortcutSelection: params.onToggleShortcutSelection,
    rootVisualOptions: params.rootVisualOptions,
    renderCenterPreview: params.renderCenterPreview,
    renderSelectionIndicator: params.renderSelectionIndicator,
    renderShortcutCard: params.renderShortcutCard,
  });
  const decorations = resolveRootGridSceneDecorationState({
    projectedDropPreview: composition.projectedDropPreview,
    activeDragItem: composition.activeDragItem,
    dragPointer: params.dragPointer,
    dragPreviewOffset: params.dragPreviewOffset,
    dragOverlayZIndex: params.dragOverlayZIndex,
    renderDragPreview: composition.dragPreviewRenderer,
  });

  return {
    wrapperRef: params.wrapperRef,
    rootRef: params.rootRef,
    wrapperClassName: 'w-full',
    rootClassName: 'relative w-full',
    rootStyle: buildRootGridContainerStyle({
      containerHeight: params.containerHeight,
      bottomInset: params.bottomInset,
      gridMinHeight: params.gridMinHeight,
    }),
    rootProps: {
      onContextMenu: params.onContextMenu,
    },
    projectedDropPreviewNode: decorations.projectedDropPreviewNode,
    itemNodes: composition.itemNodes,
    insideRootTrailingNode: decorations.dragPreviewOverlayNode,
  };
}

export type FolderSceneAssemblyParams<TItem extends FolderDragRenderableItem & { shortcutIndex: number }> = SceneAssemblyRefs & {
  items: readonly TItem[];
  shortcuts: Shortcut[];
  layoutSnapshot: Array<MeasuredDragItem<TItem>> | null;
  activeDragId: string | null;
  hoverState: ResolvedDragHoverState<RootShortcutDropIntent>;
  firefox: boolean;
  visualOptions: FolderShortcutVisualOptions;
  renderDragPreview: FolderShortcutDragPreviewRenderer;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  disableLayoutShiftTransition: boolean;
  pendingDragRef: React.MutableRefObject<FolderShortcutPendingDragSession>;
  itemElements: Map<string, HTMLDivElement>;
  ignoreClickRef: React.MutableRefObject<boolean>;
  onShortcutOpen: ShortcutOpenHandler;
  onShortcutContextMenu: FolderShortcutContextMenuHandler;
  dragPointer: { x: number; y: number } | null;
  dragPreviewOffset: { x: number; y: number } | null;
  dragOverlayZIndex: number;
  maskBoundaryRef: React.RefObject<HTMLElement | null>;
  dragSettlePreview: DragSettlePreview<Shortcut> | null;
  suppressProjectionSettleAnimation: boolean;
  columns: number;
  hoveredMask: boolean;
  settleAnimationsEnabled: boolean;
} & FolderShortcutRenderBindings;

export function resolveFolderShortcutSurfaceSceneAssembly<TItem extends FolderDragRenderableItem & { shortcutIndex: number }>(
  params: FolderSceneAssemblyParams<TItem>,
): FolderGridSceneProps {
  const composition = resolveFolderGridSceneComposition({
    shortcuts: params.shortcuts,
    items: params.items,
    layoutSnapshot: params.layoutSnapshot,
    activeDragId: params.activeDragId,
    hoverState: params.hoverState,
    rootElement: params.rootRef.current,
    firefox: params.firefox,
    visualOptions: params.visualOptions,
    renderDragPreview: params.renderDragPreview,
    layoutShiftOffsets: params.layoutShiftOffsets,
    disableLayoutShiftTransition: params.disableLayoutShiftTransition,
    pendingDragRef: params.pendingDragRef,
    itemElements: params.itemElements,
    ignoreClickRef: params.ignoreClickRef,
    onShortcutOpen: params.onShortcutOpen,
    onShortcutContextMenu: params.onShortcutContextMenu,
    dragSettlePreview: params.dragSettlePreview,
    suppressProjectionSettleAnimation: params.suppressProjectionSettleAnimation,
    folderVisualOptions: params.folderVisualOptions,
    renderShortcutCard: params.renderShortcutCard,
  });
  const decorations = resolveFolderGridSceneDecorationState({
    projectedDropPreview: composition.projectedDropPreview,
    showProjectedDropPreview: composition.projectedDropPreview !== null && !params.hoveredMask,
    activeDragItem: composition.activeDragItem,
    dragPointer: params.dragPointer,
    dragPreviewOffset: params.dragPreviewOffset,
    dragOverlayZIndex: params.dragOverlayZIndex,
    renderDragPreview: composition.dragPreviewRenderer,
    dragSettlePreview: params.dragSettlePreview,
    settleAnimationsEnabled: params.settleAnimationsEnabled,
    maskActive: composition.activeDragItem !== null || params.hoveredMask,
    maskHovered: params.hoveredMask,
    maskBoundaryRef: params.maskBoundaryRef,
  });

  return {
    wrapperRef: params.wrapperRef,
    rootRef: params.rootRef,
    beforeRootNode: decorations.maskOverlayNode,
    rootClassName: 'relative grid',
    rootStyle: buildFolderGridStyle(params.columns),
    rootProps: {
      'data-folder-shortcut-grid': true,
    },
    projectedDropPreviewNode: decorations.projectedDropPreviewNode,
    itemNodes: composition.itemNodes,
    afterRootNode: [
      decorations.dragPreviewOverlayNode,
      decorations.settlingDragPreviewOverlayNode,
    ],
  };
}
