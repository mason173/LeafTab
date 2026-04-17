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
import { resolveFolderShortcutGridPresentation, resolveRootShortcutGridPresentation } from './shortcutGridPresentationAdapters';
import {
  buildFolderGridItemNodes,
  buildRootGridItemNodes,
} from './shortcutGridSceneNodeAdapters';
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

type RootSceneCompositionResult<TActiveDragItem> = {
  projectedDropPreview: ProjectedDropPreview | null;
  itemNodes: React.ReactNode;
  activeDragItem: TActiveDragItem | null;
  dragPreviewRenderer: (item: TActiveDragItem) => React.ReactNode;
};
type FolderSceneCompositionResult<TActiveDragItem> = {
  projectedDropPreview: ProjectedDropPreview | null;
  itemNodes: React.ReactNode;
  activeDragItem: TActiveDragItem | null;
  dragPreviewRenderer: (item: TActiveDragItem) => React.ReactNode;
};

type RootSceneCompositionParams<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}> = {
  shortcuts: Shortcut[];
  items: readonly TItem[];
  layoutSnapshot: Array<MeasuredDragItem<TItem>> | null;
  activeDragId: string | null;
  hoverState: ResolvedDragHoverState<RootShortcutDropIntent>;
  rootElement: HTMLDivElement | null;
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
  packedItems: Array<PackedGridItem<TItem>>;
  usesSpanAwareReorder: boolean;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  compactIconSize: number;
  selectionMode: boolean;
  disableReorderAnimation: boolean;
  selectedShortcutIndexes?: ReadonlySet<number>;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
} & RootShortcutRenderBindings;

export function resolveRootGridSceneComposition<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}>(params: RootSceneCompositionParams<TItem>): RootSceneCompositionResult<TItem> {
  const presentation = resolveRootShortcutGridPresentation({
    shortcuts: params.shortcuts,
    items: params.items,
    layoutSnapshot: params.layoutSnapshot,
    activeDragId: params.activeDragId,
    hoverState: params.hoverState,
    rootElement: params.rootElement,
    firefox: params.firefox,
    visualOptions: params.visualOptions,
    renderDragPreview: params.renderDragPreview,
    usesSpanAwareReorder: params.usesSpanAwareReorder,
    gridColumns: params.gridColumns,
    gridColumnWidth: params.gridColumnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
  });

  return {
    projectedDropPreview: presentation.projectedDropPreview,
    itemNodes: buildRootGridItemNodes({
      packedItems: params.packedItems,
      gridColumnWidth: params.gridColumnWidth,
      compactIconSize: params.compactIconSize,
      columnGap: params.columnGap,
      rowHeight: params.rowHeight,
      rowGap: params.rowGap,
      selectionMode: params.selectionMode,
      projectionOffsets: presentation.projectionOffsets,
      rootDragVisualState: presentation.rootDragVisualState,
      disableReorderAnimation: params.disableReorderAnimation,
      selectedShortcutIndexes: params.selectedShortcutIndexes,
      interactionParams: {
        activeDragId: params.activeDragId,
        disableLayoutShiftTransition: params.disableLayoutShiftTransition,
        firefox: params.firefox,
        pendingDragRef: params.pendingDragRef,
        itemElements: params.itemElements,
        ignoreClickRef: params.ignoreClickRef,
        onShortcutOpen: params.onShortcutOpen,
        onShortcutContextMenu: params.onShortcutContextMenu,
      },
      layoutShiftOffsets: params.layoutShiftOffsets,
      onToggleShortcutSelection: params.onToggleShortcutSelection,
      rootVisualOptions: params.visualOptions,
      renderCenterPreview: params.renderCenterPreview,
      renderSelectionIndicator: params.renderSelectionIndicator,
      renderShortcutCard: params.renderShortcutCard,
    }),
    activeDragItem: presentation.activeDragItem,
    dragPreviewRenderer: presentation.dragPreviewRenderer,
  };
}

type FolderSceneCompositionParams<TItem extends FolderDragRenderableItem & { shortcutIndex: number }> = {
  shortcuts: Shortcut[];
  items: readonly TItem[];
  layoutSnapshot: Array<MeasuredDragItem<TItem>> | null;
  activeDragId: string | null;
  hoverState: ResolvedDragHoverState<RootShortcutDropIntent>;
  rootElement: HTMLDivElement | null;
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
  dragSettlePreview: DragSettlePreview<Shortcut> | null;
  suppressProjectionSettleAnimation: boolean;
} & FolderShortcutRenderBindings;

export function resolveFolderGridSceneComposition<TItem extends FolderDragRenderableItem & { shortcutIndex: number }>(
  params: FolderSceneCompositionParams<TItem>,
): FolderSceneCompositionResult<TItem> {
  const presentation = resolveFolderShortcutGridPresentation({
    shortcuts: params.shortcuts,
    items: params.items,
    layoutSnapshot: params.layoutSnapshot,
    activeDragId: params.activeDragId,
    hoverState: params.hoverState,
    rootElement: params.rootElement,
    firefox: params.firefox,
    visualOptions: params.visualOptions,
    renderDragPreview: params.renderDragPreview,
    dragSettlePreview: params.dragSettlePreview,
  });

  return {
    projectedDropPreview: presentation.projectedDropPreview,
    itemNodes: buildFolderGridItemNodes({
      items: params.items,
      hiddenItemId: presentation.hiddenShortcutId,
      projectionOffsets: presentation.projectionOffsets,
      suppressProjectionSettleAnimation: params.suppressProjectionSettleAnimation,
      interactionParams: {
        activeDragId: params.activeDragId,
        disableLayoutShiftTransition: params.disableLayoutShiftTransition,
        firefox: params.firefox,
        pendingDragRef: params.pendingDragRef,
        itemElements: params.itemElements,
        ignoreClickRef: params.ignoreClickRef,
        onShortcutOpen: params.onShortcutOpen,
        onShortcutContextMenu: params.onShortcutContextMenu,
      },
      layoutShiftOffsets: params.layoutShiftOffsets,
      folderVisualOptions: params.visualOptions,
      renderShortcutCard: params.renderShortcutCard,
    }),
    activeDragItem: presentation.activeDragItem,
    dragPreviewRenderer: presentation.dragPreviewRenderer,
  };
}
