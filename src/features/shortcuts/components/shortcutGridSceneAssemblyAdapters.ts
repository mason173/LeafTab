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
import {
  buildFolderGridSceneProps,
  buildRootGridSceneProps,
} from './shortcutGridSceneAdapters';
import {
  resolveFolderGridSceneComposition,
  resolveRootGridSceneComposition,
} from './shortcutGridSceneCompositionAdapters';
import { buildShortcutSceneAssemblyCompositionParams } from './shortcutGridSceneSharedAdapters';
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

type PointerDragAssemblyState<T> = {
  activeDragItem: T | null;
  dragPreviewRenderer: (item: T) => React.ReactNode;
  dragPointer: { x: number; y: number } | null;
  dragPreviewOffset: { x: number; y: number } | null;
  dragOverlayZIndex: number;
};

function buildPointerDragDecorationParams<T>(params: {
  composition: SceneCompositionResult<T>;
  dragPointer: { x: number; y: number } | null;
  dragPreviewOffset: { x: number; y: number } | null;
  dragOverlayZIndex: number;
}): PointerDragAssemblyState<T> & {
  projectedDropPreview: ProjectedDropPreview | null;
} {
  return {
    projectedDropPreview: params.composition.projectedDropPreview,
    activeDragItem: params.composition.activeDragItem,
    dragPointer: params.dragPointer,
    dragPreviewOffset: params.dragPreviewOffset,
    dragOverlayZIndex: params.dragOverlayZIndex,
    dragPreviewRenderer: params.composition.dragPreviewRenderer,
  };
}

function buildSceneDecorationParams<T, TExtra extends object>(params: {
  composition: SceneCompositionResult<T>;
  dragPointer: { x: number; y: number } | null;
  dragPreviewOffset: { x: number; y: number } | null;
  dragOverlayZIndex: number;
  extra?: TExtra;
}): ReturnType<typeof buildPointerDragDecorationParams<T>> & TExtra {
  const extra = params.extra ?? ({} as TExtra);

  return {
    ...buildPointerDragDecorationParams(params),
    ...extra,
  };
}

function resolveSceneDecorations<T, TExtra extends object, TResult>(params: {
  composition: SceneCompositionResult<T>;
  dragPointer: { x: number; y: number } | null;
  dragPreviewOffset: { x: number; y: number } | null;
  dragOverlayZIndex: number;
  extra?: TExtra;
  resolveDecorations: (
    params: ReturnType<typeof buildSceneDecorationParams<T, TExtra>>,
  ) => TResult;
}): TResult {
  return params.resolveDecorations(buildSceneDecorationParams({
    composition: params.composition,
    dragPointer: params.dragPointer,
    dragPreviewOffset: params.dragPreviewOffset,
    dragOverlayZIndex: params.dragOverlayZIndex,
    extra: params.extra,
  }));
}

type SharedSceneShellContent = {
  projectedDropPreviewNode: React.ReactNode;
  itemNodes: React.ReactNode;
  dragPreviewOverlayNode: React.ReactNode;
};

type SceneCompositionResult<TActiveDragItem> = {
  projectedDropPreview: ProjectedDropPreview | null;
  itemNodes: React.ReactNode;
  activeDragItem: TActiveDragItem | null;
  dragPreviewRenderer: (item: TActiveDragItem) => React.ReactNode;
};

function resolveSceneAssembly<TCompositionParams, TActiveDragItem, TDecorations, TResult>(params: {
  compositionParams: TCompositionParams;
  resolveComposition: (params: TCompositionParams) => SceneCompositionResult<TActiveDragItem>;
  resolveDecorations: (params: SceneCompositionResult<TActiveDragItem>) => TDecorations;
  buildResult: (params: {
    itemNodes: React.ReactNode;
    decorations: TDecorations;
  }) => TResult;
}): TResult {
  const composition = params.resolveComposition(params.compositionParams);
  const decorations = params.resolveDecorations(composition);

  return params.buildResult({
    itemNodes: composition.itemNodes,
    decorations,
  });
}

function resolveShortcutSceneAssemblyFlow<
  TAssemblyParams,
  TCompositionParams,
  TActiveDragItem,
  TDecorations,
  TShellContent,
  TResult,
>(params: {
  assemblyParams: TAssemblyParams;
  buildCompositionParams: (params: TAssemblyParams) => TCompositionParams;
  resolveComposition: (params: TCompositionParams) => SceneCompositionResult<TActiveDragItem>;
  resolveDecorations: (params: {
    composition: SceneCompositionResult<TActiveDragItem>;
    assemblyParams: TAssemblyParams;
  }) => TDecorations;
  buildShellContent: (params: {
    itemNodes: React.ReactNode;
    decorations: TDecorations;
  }) => TShellContent;
  buildScene: (params: {
    assemblyParams: TAssemblyParams;
    content: TShellContent;
  }) => TResult;
}): TResult {
  return resolveSceneAssembly({
    compositionParams: params.buildCompositionParams(params.assemblyParams),
    resolveComposition: params.resolveComposition,
    resolveDecorations: (composition) => params.resolveDecorations({
      composition,
      assemblyParams: params.assemblyParams,
    }),
    buildResult: ({ itemNodes, decorations }) => params.buildScene({
      assemblyParams: params.assemblyParams,
      content: params.buildShellContent({
        itemNodes,
        decorations,
      }),
    }),
  });
}

type RootSceneShellParams = SceneAssemblyRefs & {
  containerHeight: number;
  bottomInset: number;
  gridMinHeight: number;
  onContextMenu: React.MouseEventHandler<HTMLDivElement>;
};

type FolderSceneShellParams = SceneAssemblyRefs & {
  columns: number;
};

type SharedSceneShellBuildParams<TDecorations, TResult> = SceneAssemblyRefs & {
  itemNodes: React.ReactNode;
  decorations: TDecorations;
  buildSceneProps: (params: SceneAssemblyRefs & {
    itemNodes: React.ReactNode;
    decorations: TDecorations;
  }) => TResult;
};

function buildSceneShellContent<TDecorations extends {
  projectedDropPreviewNode: React.ReactNode;
  dragPreviewOverlayNode: React.ReactNode;
}, TExtra extends object = {}>(params: {
  itemNodes: React.ReactNode;
  decorations: TDecorations;
  buildExtra?: (decorations: TDecorations) => TExtra;
}): SharedSceneShellContent & TExtra {
  const extra = params.buildExtra ? params.buildExtra(params.decorations) : {} as TExtra;

  return {
    projectedDropPreviewNode: params.decorations.projectedDropPreviewNode,
    itemNodes: params.itemNodes,
    dragPreviewOverlayNode: params.decorations.dragPreviewOverlayNode,
    ...extra,
  };
}

function buildSceneShell<TDecorations, TResult>(params: SharedSceneShellBuildParams<TDecorations, TResult>): TResult {
  return params.buildSceneProps({
    wrapperRef: params.wrapperRef,
    rootRef: params.rootRef,
    itemNodes: params.itemNodes,
    decorations: params.decorations,
  });
}

type SharedSceneAssemblyBaseParams<
  TItem,
  TVisualOptions,
  TRenderDragPreview,
  TPendingDragRef,
  TOnShortcutContextMenu,
> = SceneAssemblyRefs & {
  items: readonly TItem[];
  shortcuts: Shortcut[];
  layoutSnapshot: Array<MeasuredDragItem<TItem>> | null;
  activeDragId: string | null;
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
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
  dragPointer: { x: number; y: number } | null;
  dragPreviewOffset: { x: number; y: number } | null;
  dragOverlayZIndex: number;
};

function buildSceneCompositionParams<
  TItem,
  TVisualOptions,
  TRenderDragPreview,
  TPendingDragRef,
  TOnShortcutContextMenu,
  TExtra extends object,
>(params: SharedSceneAssemblyBaseParams<
  TItem,
  TVisualOptions,
  TRenderDragPreview,
  TPendingDragRef,
  TOnShortcutContextMenu
>, extra: TExtra) {
  return {
    ...buildShortcutSceneAssemblyCompositionParams(params),
    ...extra,
  };
}

export type RootSceneAssemblyParams<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}> = SharedSceneAssemblyBaseParams<
  TItem,
  RootShortcutVisualOptions,
  RootShortcutDragPreviewRenderer,
  RootShortcutPendingDragSession,
  RootShortcutContextMenuHandler
> & {
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

function buildRootSceneShell(
  params: RootSceneShellParams,
  content: SharedSceneShellContent,
) {
  return buildSceneShell({
    wrapperRef: params.wrapperRef,
    rootRef: params.rootRef,
    itemNodes: content.itemNodes,
    decorations: content,
    buildSceneProps: ({ wrapperRef, rootRef, itemNodes, decorations }) => buildRootGridSceneProps({
      wrapperRef,
      rootRef,
      containerHeight: params.containerHeight,
      bottomInset: params.bottomInset,
      gridMinHeight: params.gridMinHeight,
      onContextMenu: params.onContextMenu,
      projectedDropPreviewNode: decorations.projectedDropPreviewNode,
      itemNodes,
      dragPreviewOverlayNode: decorations.dragPreviewOverlayNode,
    }),
  });
}

function resolveRootSceneDecorations<T>(
  params: PointerDragAssemblyState<T> & {
    projectedDropPreview: import('@/features/shortcuts/drag/linearReorderProjection').ProjectedDropPreview | null;
  },
) {
  return resolveRootGridSceneDecorationState({
    projectedDropPreview: params.projectedDropPreview,
    activeDragItem: params.activeDragItem,
    dragPointer: params.dragPointer,
    dragPreviewOffset: params.dragPreviewOffset,
    dragOverlayZIndex: params.dragOverlayZIndex,
    renderDragPreview: params.dragPreviewRenderer,
  });
}

function buildRootSceneCompositionParams<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}>(params: RootSceneAssemblyParams<TItem>) {
  return buildSceneCompositionParams(params, {
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
    renderCenterPreview: params.renderCenterPreview,
    renderSelectionIndicator: params.renderSelectionIndicator,
    renderShortcutCard: params.renderShortcutCard,
  });
}

export function resolveRootShortcutGridSceneAssembly<TItem extends RootDragRenderableItem & {
  shortcutIndex: number;
  layout: { previewWidth: number };
}>(params: RootSceneAssemblyParams<TItem>) {
  return resolveShortcutSceneAssemblyFlow({
    assemblyParams: params,
    buildCompositionParams: buildRootSceneCompositionParams,
    resolveComposition: resolveRootGridSceneComposition,
    resolveDecorations: ({ composition, assemblyParams }) => resolveSceneDecorations({
      composition,
      dragPointer: assemblyParams.dragPointer,
      dragPreviewOffset: assemblyParams.dragPreviewOffset,
      dragOverlayZIndex: assemblyParams.dragOverlayZIndex,
      resolveDecorations: resolveRootSceneDecorations,
    }),
    buildShellContent: buildSceneShellContent,
    buildScene: ({ assemblyParams, content }) => buildRootSceneShell({
      wrapperRef: assemblyParams.wrapperRef,
      rootRef: assemblyParams.rootRef,
      containerHeight: assemblyParams.containerHeight,
      bottomInset: assemblyParams.bottomInset,
      gridMinHeight: assemblyParams.gridMinHeight,
      onContextMenu: assemblyParams.onContextMenu,
    }, content),
  });
}

export type FolderSceneAssemblyParams<TItem extends FolderDragRenderableItem & { shortcutIndex: number }> = SharedSceneAssemblyBaseParams<
  TItem,
  FolderShortcutVisualOptions,
  FolderShortcutDragPreviewRenderer,
  FolderShortcutPendingDragSession,
  FolderShortcutContextMenuHandler
> & {
  maskBoundaryRef: React.RefObject<HTMLElement | null>;
  dragSettlePreview: DragSettlePreview<Shortcut> | null;
  suppressProjectionSettleAnimation: boolean;
  columns: number;
  hoveredMask: boolean;
  settleAnimationsEnabled: boolean;
} & FolderShortcutRenderBindings;

function buildFolderSceneShell(
  params: FolderSceneShellParams,
  content: SharedSceneShellContent & {
    maskOverlayNode?: React.ReactNode;
    settlingDragPreviewOverlayNode: React.ReactNode;
  },
) {
  return buildSceneShell({
    wrapperRef: params.wrapperRef,
    rootRef: params.rootRef,
    itemNodes: content.itemNodes,
    decorations: content,
    buildSceneProps: ({ wrapperRef, rootRef, itemNodes, decorations }) => buildFolderGridSceneProps({
      wrapperRef,
      rootRef,
      maskOverlayNode: decorations.maskOverlayNode,
      columns: params.columns,
      projectedDropPreviewNode: decorations.projectedDropPreviewNode,
      itemNodes,
      dragPreviewOverlayNode: decorations.dragPreviewOverlayNode,
      settlingDragPreviewOverlayNode: decorations.settlingDragPreviewOverlayNode,
    }),
  });
}

function resolveFolderSceneDecorations<T>(
  params: PointerDragAssemblyState<T> & {
    projectedDropPreview: import('@/features/shortcuts/drag/linearReorderProjection').ProjectedDropPreview | null;
    showProjectedDropPreview: boolean;
    dragSettlePreview: DragSettlePreview<{ id: string }> | null;
    settleAnimationsEnabled: boolean;
    maskActive: boolean;
    maskHovered: boolean;
    maskBoundaryRef: React.RefObject<HTMLElement | null>;
  },
) {
  return resolveFolderGridSceneDecorationState({
    projectedDropPreview: params.projectedDropPreview,
    showProjectedDropPreview: params.showProjectedDropPreview,
    activeDragItem: params.activeDragItem,
    dragPointer: params.dragPointer,
    dragPreviewOffset: params.dragPreviewOffset,
    dragOverlayZIndex: params.dragOverlayZIndex,
    renderDragPreview: params.dragPreviewRenderer,
    dragSettlePreview: params.dragSettlePreview,
    settleAnimationsEnabled: params.settleAnimationsEnabled,
    maskActive: params.maskActive,
    maskHovered: params.maskHovered,
    maskBoundaryRef: params.maskBoundaryRef,
  });
}

function buildFolderSceneCompositionParams<TItem extends FolderDragRenderableItem & { shortcutIndex: number }>(
  params: FolderSceneAssemblyParams<TItem>,
) {
  return buildSceneCompositionParams(params, {
    dragSettlePreview: params.dragSettlePreview,
    suppressProjectionSettleAnimation: params.suppressProjectionSettleAnimation,
    renderShortcutCard: params.renderShortcutCard,
  });
}

function buildFolderSceneShellContent(params: {
  itemNodes: React.ReactNode;
  decorations: ReturnType<typeof resolveFolderGridSceneDecorationState>;
}) {
  return buildSceneShellContent({
    itemNodes: params.itemNodes,
    decorations: params.decorations,
    buildExtra: (decorations) => ({
      maskOverlayNode: decorations.maskOverlayNode,
      settlingDragPreviewOverlayNode: decorations.settlingDragPreviewOverlayNode,
    }),
  });
}

export function resolveFolderShortcutSurfaceSceneAssembly<TItem extends FolderDragRenderableItem & { shortcutIndex: number }>(
  params: FolderSceneAssemblyParams<TItem>,
) {
  return resolveShortcutSceneAssemblyFlow({
    assemblyParams: params,
    buildCompositionParams: buildFolderSceneCompositionParams,
    resolveComposition: resolveFolderGridSceneComposition,
    resolveDecorations: ({ composition, assemblyParams }) => resolveSceneDecorations({
      composition,
      dragPointer: assemblyParams.dragPointer,
      dragPreviewOffset: assemblyParams.dragPreviewOffset,
      dragOverlayZIndex: assemblyParams.dragOverlayZIndex,
      extra: {
        showProjectedDropPreview: Boolean(assemblyParams.activeDragId),
        dragSettlePreview: assemblyParams.dragSettlePreview,
        settleAnimationsEnabled: assemblyParams.settleAnimationsEnabled,
        maskActive: Boolean(assemblyParams.activeDragId),
        maskHovered: assemblyParams.hoveredMask,
        maskBoundaryRef: assemblyParams.maskBoundaryRef,
      },
      resolveDecorations: resolveFolderSceneDecorations,
    }),
    buildShellContent: buildFolderSceneShellContent,
    buildScene: ({ assemblyParams, content }) => buildFolderSceneShell({
      wrapperRef: assemblyParams.wrapperRef,
      rootRef: assemblyParams.rootRef,
      columns: assemblyParams.columns,
    }, content),
  });
}
