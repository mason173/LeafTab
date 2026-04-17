import type React from 'react';
import type { DragHoverResolution } from '@/features/shortcuts/drag/dragSessionRuntime';
import type { MeasuredDragItem, ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';
import type { RootShortcutDropIntent } from '@/features/shortcuts/drag/types';
import type { Shortcut } from '@/types';
import type {
  FolderShortcutRenderBindings,
  ShortcutOpenHandler,
  ShortcutInteractionBindings,
  ShortcutSceneInteractionParams,
  RootShortcutRenderBindings,
} from './shortcutGridSceneSharedTypes';

export function buildShortcutInteractionBindings<TPendingDragRef, TOnShortcutContextMenu>(
  params: ShortcutInteractionBindings<TPendingDragRef, TOnShortcutContextMenu>,
) {
  return params;
}

export function buildShortcutSceneInteractionParams<TPendingDragRef, TOnShortcutContextMenu>(
  params: ShortcutSceneInteractionParams<TPendingDragRef, TOnShortcutContextMenu>,
) {
  return params;
}

export function buildShortcutVisualBindings<TInteractionParams, TVisualOptions>(params: {
  interactionParams: TInteractionParams;
  visualOptions: TVisualOptions;
}) {
  return {
    interactionParams: params.interactionParams,
    visualOptions: params.visualOptions,
  };
}

export function buildShortcutSceneItemNodeBindings<TPendingDragRef, TOnShortcutContextMenu, TVisualOptions>(params: {
  interactionParams: ShortcutSceneInteractionParams<TPendingDragRef, TOnShortcutContextMenu>;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  visualOptions: TVisualOptions;
}) {
  return {
    interactionParams: buildShortcutSceneInteractionParams(params.interactionParams),
    layoutShiftOffsets: params.layoutShiftOffsets,
    visualOptions: params.visualOptions,
  };
}

export function buildShortcutGridItemStateBindings(params: {
  interactionParams: ShortcutSceneInteractionParams<unknown, unknown>;
  projectionOffsets: ReadonlyMap<string, ProjectionOffset>;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
}) {
  return {
    activeDragId: params.interactionParams.activeDragId,
    projectionOffsets: params.projectionOffsets,
    layoutShiftOffsets: params.layoutShiftOffsets,
  };
}

export function buildShortcutSceneCompositionBindings<
  TItem,
  TVisualOptions,
  TRenderDragPreview,
  TPendingDragRef,
  TOnShortcutContextMenu,
>(params: {
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
}) {
  return {
    presentationParams: {
      shortcuts: params.shortcuts,
      items: params.items,
      layoutSnapshot: params.layoutSnapshot,
      activeDragId: params.activeDragId,
      hoverResolution: params.hoverResolution,
      rootElement: params.rootElement,
      firefox: params.firefox,
      visualOptions: params.visualOptions,
      renderDragPreview: params.renderDragPreview,
    },
    itemNodeBindings: buildShortcutSceneItemNodeBindings({
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
      visualOptions: params.visualOptions,
    }),
  };
}

export function buildShortcutSceneAssemblyCompositionParams<
  TItem,
  TVisualOptions,
  TRenderDragPreview,
  TPendingDragRef,
  TOnShortcutContextMenu,
>(params: {
  shortcuts: Shortcut[];
  items: readonly TItem[];
  layoutSnapshot: Array<MeasuredDragItem<TItem>> | null;
  activeDragId: string | null;
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  rootRef: React.RefObject<HTMLDivElement | null>;
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
}) {
  return {
    shortcuts: params.shortcuts,
    items: params.items,
    layoutSnapshot: params.layoutSnapshot,
    activeDragId: params.activeDragId,
    hoverResolution: params.hoverResolution,
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
  };
}

export function buildRootShortcutRenderBindings(
  params: RootShortcutRenderBindings,
): RootShortcutRenderBindings {
  return params;
}

export function buildFolderShortcutRenderBindings(
  params: FolderShortcutRenderBindings,
): FolderShortcutRenderBindings {
  return params;
}
