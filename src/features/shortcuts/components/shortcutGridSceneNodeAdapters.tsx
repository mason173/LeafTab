import React from 'react';
import type { FolderDragRenderableItem } from '@/features/shortcuts/drag/folderDragRenderState';
import type { ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';
import type { PackedGridItem } from '@/features/shortcuts/drag/gridLayout';
import type { RootDragRenderableItem, RootDragVisualState } from '@/features/shortcuts/drag/rootDragRenderState';
import type { Shortcut } from '@/types';
import { DragPreviewOverlay, SettlingDragPreviewOverlay } from './DragPreviewOverlay';
import { FolderMaskDropZones } from './FolderMaskDropZones';
import { ProjectedDropPreviewLayer } from './ProjectedDropPreviewLayer';
import { renderFolderGridItemNodes, renderRootGridItemNodes } from './shortcutGridItemRenderers';
import {
  buildShortcutGridItemStateBindings,
  buildShortcutSceneItemNodeBindings,
  buildFolderShortcutRenderBindings,
  buildRootShortcutRenderBindings,
  buildShortcutSceneInteractionParams,
} from './shortcutGridSceneSharedAdapters';
import {
  resolveFolderGridItemStates,
  resolveRootGridItemStates,
} from './shortcutGridItemStateAdapters';
import type {
  FolderShortcutContextMenuHandler,
  FolderShortcutPendingDragSession,
  FolderShortcutRenderBindings,
  RootShortcutContextMenuHandler,
  RootShortcutPendingDragSession,
  RootShortcutRenderBindings,
  ShortcutSceneInteractionParams,
} from './shortcutGridSceneSharedTypes';
import type {
  FolderShortcutVisualOptions,
  RootShortcutVisualOptions,
} from './shortcutGridVisualAdapters';

export function buildSharedSceneNodeInteractionParams<TPendingDragRef, TOnShortcutContextMenu>(
  params: ShortcutSceneInteractionParams<TPendingDragRef, TOnShortcutContextMenu>,
) {
  return buildShortcutSceneInteractionParams(params);
}

function buildSceneItemNodes<TItemState, TResult>(params: {
  resolveItemStates: () => TItemState[];
  renderItemNodes: (itemStates: TItemState[]) => TResult;
}): TResult {
  return params.renderItemNodes(params.resolveItemStates());
}

function resolveGridItemNodes<TItemState, TRenderParams>(params: {
  resolveItemStates: () => TItemState[];
  buildRenderParams: () => TRenderParams;
  renderItemNodes: (params: { itemStates: TItemState[] } & TRenderParams) => React.ReactNode;
}) {
  return buildSceneItemNodes({
    resolveItemStates: params.resolveItemStates,
    renderItemNodes: (itemStates) => params.renderItemNodes({
      itemStates,
      ...params.buildRenderParams(),
    }),
  });
}

export function renderProjectedDropPreviewNode(params: {
  preview: import('@/features/shortcuts/drag/linearReorderProjection').ProjectedDropPreview | null;
  visible?: boolean;
  testId?: string;
}) {
  if (params.visible === false) {
    return null;
  }

  return (
    <ProjectedDropPreviewLayer
      preview={params.preview}
      testId={params.testId}
    />
  );
}

export function renderPointerDragPreviewOverlayNode<T>(params: {
  item: T | null;
  pointer: import('@/features/shortcuts/drag/types').DragPoint | null;
  previewOffset: import('@/features/shortcuts/drag/types').DragPoint | null;
  zIndex: number;
  renderPreview: (item: T) => React.ReactNode;
  threeDimensional?: boolean;
  className?: string;
}) {
  return (
    <DragPreviewOverlay
      item={params.item}
      pointer={params.pointer}
      previewOffset={params.previewOffset}
      zIndex={params.zIndex}
      threeDimensional={params.threeDimensional}
      className={params.className}
      renderPreview={params.renderPreview}
    />
  );
}

export function renderSettlingDragPreviewOverlayNode<T>(params: {
  preview: import('@/features/shortcuts/drag/useDragMotionState').DragSettlePreview<T> | null;
  zIndex: number;
  transition?: string;
  renderPreview: (item: T) => React.ReactNode;
}) {
  return (
    <SettlingDragPreviewOverlay
      preview={params.preview}
      zIndex={params.zIndex}
      transition={params.transition}
      renderPreview={params.renderPreview}
    />
  );
}

export function renderFolderMaskOverlayNode(params: {
  active: boolean;
  hovered: boolean;
  boundaryRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <FolderMaskDropZones
      active={params.active}
      hovered={params.hovered}
      boundaryRef={params.boundaryRef}
    />
  );
}

type RootGridItemNodeParams<T extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}> = {
  packedItems: Array<PackedGridItem<T>>;
  gridColumnWidth: number | null;
  compactIconSize: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  selectionMode: boolean;
  projectionOffsets: ReadonlyMap<string, ProjectionOffset>;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  rootDragVisualState: RootDragVisualState;
  disableReorderAnimation: boolean;
  selectedShortcutIndexes?: ReadonlySet<number>;
  interactionParams: ShortcutSceneInteractionParams<
    RootShortcutPendingDragSession,
    RootShortcutContextMenuHandler
  >;
  onToggleShortcutSelection?: (shortcutIndex: number) => void;
} & RootShortcutRenderBindings;

function buildRootGridItemStateParams<T extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}>(params: RootGridItemNodeParams<T>) {
  return {
    packedItems: params.packedItems,
    gridColumnWidth: params.gridColumnWidth,
    compactIconSize: params.compactIconSize,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
    selectionMode: params.selectionMode,
    ...buildShortcutGridItemStateBindings(params),
    rootDragVisualState: params.rootDragVisualState,
    selectedShortcutIndexes: params.selectedShortcutIndexes,
  };
}

function buildRootGridItemRenderNodeParams<T extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}>(params: RootGridItemNodeParams<T>) {
  const itemNodeBindings = buildShortcutSceneItemNodeBindings({
    interactionParams: params.interactionParams,
    visualOptions: params.rootVisualOptions,
    layoutShiftOffsets: params.layoutShiftOffsets,
  });

  return {
    selectionMode: params.selectionMode,
    disableReorderAnimation: params.disableReorderAnimation,
    activeDragId: params.interactionParams.activeDragId,
    interactionParams: itemNodeBindings.interactionParams,
    onToggleShortcutSelection: params.onToggleShortcutSelection,
    ...buildRootShortcutRenderBindings({
      rootVisualOptions: itemNodeBindings.visualOptions,
      renderCenterPreview: params.renderCenterPreview,
      renderSelectionIndicator: params.renderSelectionIndicator,
      renderShortcutCard: params.renderShortcutCard,
    }),
  };
}

export function buildRootGridItemNodes<T extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}>(params: RootGridItemNodeParams<T>) {
  return resolveGridItemNodes({
    resolveItemStates: () => resolveRootGridItemStates(
      buildRootGridItemStateParams(params),
    ),
    buildRenderParams: () => buildRootGridItemRenderNodeParams(params),
    renderItemNodes: renderRootGridItemNodes,
  });
}

type FolderGridItemNodeParams<T extends FolderDragRenderableItem & { shortcutIndex: number }> = {
  items: readonly T[];
  hiddenItemId: string | null;
  projectionOffsets: ReadonlyMap<string, ProjectionOffset>;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  suppressProjectionSettleAnimation: boolean;
  interactionParams: ShortcutSceneInteractionParams<
    FolderShortcutPendingDragSession,
    FolderShortcutContextMenuHandler
  >;
} & FolderShortcutRenderBindings;

function buildFolderGridItemStateParams<T extends FolderDragRenderableItem & { shortcutIndex: number }>(
  params: FolderGridItemNodeParams<T>,
) {
  return {
    items: params.items,
    hiddenItemId: params.hiddenItemId,
    ...buildShortcutGridItemStateBindings(params),
  };
}

function buildFolderGridItemRenderNodeParams<T extends FolderDragRenderableItem & { shortcutIndex: number }>(
  params: FolderGridItemNodeParams<T>,
) {
  const itemNodeBindings = buildShortcutSceneItemNodeBindings({
    interactionParams: params.interactionParams,
    visualOptions: params.folderVisualOptions,
    layoutShiftOffsets: params.layoutShiftOffsets,
  });

  return {
    suppressProjectionSettleAnimation: params.suppressProjectionSettleAnimation,
    interactionParams: itemNodeBindings.interactionParams,
    ...buildFolderShortcutRenderBindings({
      folderVisualOptions: itemNodeBindings.visualOptions,
      renderShortcutCard: params.renderShortcutCard,
    }),
  };
}

export function buildFolderGridItemNodes<T extends FolderDragRenderableItem & { shortcutIndex: number }>(params: FolderGridItemNodeParams<T>) {
  return resolveGridItemNodes({
    resolveItemStates: () => resolveFolderGridItemStates(
      buildFolderGridItemStateParams(params),
    ),
    buildRenderParams: () => buildFolderGridItemRenderNodeParams(params),
    renderItemNodes: renderFolderGridItemNodes,
  });
}
