import type React from 'react';
import type { Shortcut } from '@/types';
import type { DragHoverResolution } from '@/features/shortcuts/drag/dragSessionRuntime';
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
import {
  buildShortcutSceneCompositionBindings,
  buildFolderShortcutRenderBindings,
  buildRootShortcutRenderBindings,
} from './shortcutGridSceneSharedAdapters';
import type {
  FolderShortcutContextMenuHandler,
  FolderShortcutDragPreviewRenderer,
  FolderShortcutPendingDragSession,
  FolderShortcutRenderBindings,
  RootShortcutContextMenuHandler,
  RootShortcutDragPreviewRenderer,
  RootShortcutPendingDragSession,
  RootShortcutRenderBindings,
  ShortcutSceneInteractionParams,
  ShortcutOpenHandler,
} from './shortcutGridSceneSharedTypes';
import type {
  FolderShortcutVisualOptions,
  RootShortcutVisualOptions,
} from './shortcutGridVisualAdapters';

type SceneCompositionResult<TActiveDragItem> = {
  projectedDropPreview: ProjectedDropPreview | null;
  itemNodes: React.ReactNode;
  activeDragItem: TActiveDragItem | null;
  dragPreviewRenderer: (item: TActiveDragItem) => React.ReactNode;
};

function buildSceneCompositionResult<TActiveDragItem>(
  params: SceneCompositionResult<TActiveDragItem>,
): SceneCompositionResult<TActiveDragItem> {
  return params;
}

type SharedScenePresentation<TActiveDragItem> = {
  projectedDropPreview: ProjectedDropPreview | null;
  activeDragItem: TActiveDragItem | null;
  dragPreviewRenderer: (item: TActiveDragItem) => React.ReactNode;
};

function resolveSceneComposition<TPresentation extends SharedScenePresentation<TActiveDragItem>, TActiveDragItem>(params: {
  resolvePresentation: () => TPresentation;
  buildItemNodes: (presentation: TPresentation) => React.ReactNode;
}): SceneCompositionResult<TActiveDragItem> {
  const presentation = params.resolvePresentation();

  return buildSceneCompositionResult({
    projectedDropPreview: presentation.projectedDropPreview,
    itemNodes: params.buildItemNodes(presentation),
    activeDragItem: presentation.activeDragItem,
    dragPreviewRenderer: presentation.dragPreviewRenderer,
  });
}

type SharedSceneCompositionBaseParams<
  TItem,
  TVisualOptions,
  TRenderDragPreview,
  TPendingDragRef,
  TOnShortcutContextMenu,
> = {
  shortcuts: Shortcut[];
  items: readonly TItem[];
  layoutSnapshot: Array<MeasuredDragItem<TItem>> | null;
  activeDragId: string | null;
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  rootElement: HTMLDivElement | null;
  firefox: boolean;
  visualOptions: TVisualOptions;
  renderDragPreview: TRenderDragPreview;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  disableLayoutShiftTransition: boolean;
  pendingDragRef: React.MutableRefObject<TPendingDragRef>;
  itemElements: Map<string, HTMLDivElement>;
  ignoreClickRef: React.MutableRefObject<boolean>;
  onShortcutOpen: ShortcutOpenHandler;
  onShortcutContextMenu: TOnShortcutContextMenu;
};

function buildSceneCompositionBindings<
  TItem,
  TVisualOptions,
  TRenderDragPreview,
  TPendingDragRef,
  TOnShortcutContextMenu,
>(params: SharedSceneCompositionBaseParams<
  TItem,
  TVisualOptions,
  TRenderDragPreview,
  TPendingDragRef,
  TOnShortcutContextMenu
>) {
  return buildShortcutSceneCompositionBindings(params);
}

type RootSceneCompositionParams<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}> = SharedSceneCompositionBaseParams<
  TItem,
  RootShortcutVisualOptions,
  RootShortcutDragPreviewRenderer,
  RootShortcutPendingDragSession,
  RootShortcutContextMenuHandler
> & {
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
}>(params: RootSceneCompositionParams<TItem>) {
  return resolveSceneComposition({
    resolvePresentation: () => resolveRootShortcutGridPresentation(
      buildRootScenePresentationParams(params),
    ),
    buildItemNodes: (presentation) => buildRootGridItemNodes(
      buildRootSceneItemNodeParams({
        params,
        presentation,
      }),
    ),
  });
}

type FolderSceneCompositionParams<TItem extends FolderDragRenderableItem & { shortcutIndex: number }> = SharedSceneCompositionBaseParams<
  TItem,
  FolderShortcutVisualOptions,
  FolderShortcutDragPreviewRenderer,
  FolderShortcutPendingDragSession,
  FolderShortcutContextMenuHandler
> & {
  dragSettlePreview: DragSettlePreview<Shortcut> | null;
  suppressProjectionSettleAnimation: boolean;
} & FolderShortcutRenderBindings;

export function resolveFolderGridSceneComposition<TItem extends FolderDragRenderableItem & { shortcutIndex: number }>(
  params: FolderSceneCompositionParams<TItem>,
) {
  return resolveSceneComposition({
    resolvePresentation: () => resolveFolderShortcutGridPresentation(
      buildFolderScenePresentationParams(params),
    ),
    buildItemNodes: (presentation) => buildFolderGridItemNodes(
      buildFolderSceneItemNodeParams({
        params,
        presentation,
      }),
    ),
  });
}

function buildRootScenePresentationParams<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}>(params: RootSceneCompositionParams<TItem>) {
  const compositionBindings = buildSceneCompositionBindings(params);

  return {
    ...compositionBindings.presentationParams,
    usesSpanAwareReorder: params.usesSpanAwareReorder,
    gridColumns: params.gridColumns,
    gridColumnWidth: params.gridColumnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
  };
}

function buildRootSceneItemNodeParams<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}>(context: {
  params: RootSceneCompositionParams<TItem>;
  presentation: ReturnType<typeof resolveRootShortcutGridPresentation<TItem>>;
}) {
  const { params, presentation } = context;
  const compositionBindings = buildSceneCompositionBindings(params);

  return {
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
    interactionParams: compositionBindings.itemNodeBindings.interactionParams,
    layoutShiftOffsets: compositionBindings.itemNodeBindings.layoutShiftOffsets,
    onToggleShortcutSelection: params.onToggleShortcutSelection,
    ...buildRootShortcutRenderBindings({
      rootVisualOptions: compositionBindings.itemNodeBindings.visualOptions,
      renderCenterPreview: params.renderCenterPreview,
      renderSelectionIndicator: params.renderSelectionIndicator,
      renderShortcutCard: params.renderShortcutCard,
    }),
  };
}

function buildFolderScenePresentationParams<TItem extends FolderDragRenderableItem & { shortcutIndex: number }>(
  params: FolderSceneCompositionParams<TItem>,
) {
  const compositionBindings = buildSceneCompositionBindings(params);

  return {
    ...compositionBindings.presentationParams,
    dragSettlePreview: params.dragSettlePreview,
  };
}

function buildFolderSceneItemNodeParams<TItem extends FolderDragRenderableItem & { shortcutIndex: number }>(context: {
  params: FolderSceneCompositionParams<TItem>;
  presentation: ReturnType<typeof resolveFolderShortcutGridPresentation<TItem>>;
}) {
  const { params, presentation } = context;
  const compositionBindings = buildSceneCompositionBindings(params);

  return {
    items: params.items,
    hiddenItemId: presentation.hiddenShortcutId,
    projectionOffsets: presentation.projectionOffsets,
    suppressProjectionSettleAnimation: params.suppressProjectionSettleAnimation,
    interactionParams: compositionBindings.itemNodeBindings.interactionParams,
    layoutShiftOffsets: compositionBindings.itemNodeBindings.layoutShiftOffsets,
    ...buildFolderShortcutRenderBindings({
      folderVisualOptions: compositionBindings.itemNodeBindings.visualOptions,
      renderShortcutCard: params.renderShortcutCard,
    }),
  };
}
