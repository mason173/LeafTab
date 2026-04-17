import type { ReactNode } from 'react';
import type { Shortcut } from '@/types';
import type { DragHoverResolution } from '@/features/shortcuts/drag/dragSessionRuntime';
import { resolveActiveDragPreviewItem } from '@/features/shortcuts/drag/dragPreviewRenderState';
import { resolveHiddenDragItemId } from '@/features/shortcuts/drag/dragFrameRenderState';
import {
  resolveFolderDragRenderState,
  type FolderDragRenderableItem,
} from '@/features/shortcuts/drag/folderDragRenderState';
import type { MeasuredDragItem } from '@/features/shortcuts/drag/gridDragEngine';
import {
  resolveRootDragRenderState,
  type RootDragRenderableItem,
} from '@/features/shortcuts/drag/rootDragRenderState';
import type { RootShortcutDropIntent } from '@/features/shortcuts/drag/types';
import type { DragSettlePreview } from '@/features/shortcuts/drag/useDragMotionState';
import {
  createFolderDragPreviewRenderer,
  createRootDragPreviewRenderer,
} from './shortcutGridRenderAdapters';
import type {
  FolderShortcutVisualOptions,
  RootShortcutVisualOptions,
} from './shortcutGridVisualAdapters';
import type {
  FolderShortcutDragPreviewRenderer,
  RootShortcutDragPreviewRenderer,
} from './shortcutGridSceneSharedTypes';

function buildProjectedDragPresentation<TProjectionOffsets>(params: {
  projectionOffsets: TProjectionOffsets;
  projectedDropPreview: ReturnType<typeof resolveRootDragRenderState>['projectedDropPreview'];
}) {
  return {
    projectionOffsets: params.projectionOffsets,
    projectedDropPreview: params.projectedDropPreview,
  };
}

function buildDragPreviewPresentation<TItem, TActiveDragItem>(params: {
  items: readonly TItem[];
  activeDragId: string | null;
  getId: (item: TItem) => string;
  createDragPreviewRenderer: () => (item: TActiveDragItem) => ReactNode;
}) {
  return {
    activeDragItem: resolveActiveDragPreviewItem({
      items: params.items,
      activeDragId: params.activeDragId,
      getId: params.getId,
    }),
    dragPreviewRenderer: params.createDragPreviewRenderer(),
  };
}

function buildScenePresentation<TDragRenderState extends {
  projectionOffsets: TProjectionOffsets;
  projectedDropPreview: ReturnType<typeof resolveRootDragRenderState>['projectedDropPreview'];
}, TProjectionOffsets, TItem, TActiveDragItem, TExtra extends object = {}>(params: {
  resolveDragRenderState: () => TDragRenderState;
  buildExtra: (dragRenderState: TDragRenderState) => TExtra;
  items: readonly TItem[];
  activeDragId: string | null;
  getId: (item: TItem) => string;
  createDragPreviewRenderer: () => (item: TActiveDragItem) => ReactNode;
}) {
  const dragRenderState = params.resolveDragRenderState();

  return {
    ...buildProjectedDragPresentation({
      projectionOffsets: dragRenderState.projectionOffsets,
      projectedDropPreview: dragRenderState.projectedDropPreview,
    }),
    ...params.buildExtra(dragRenderState),
    ...buildDragPreviewPresentation({
      items: params.items,
      activeDragId: params.activeDragId,
      getId: params.getId,
      createDragPreviewRenderer: params.createDragPreviewRenderer,
    }),
  };
}

export function resolveRootShortcutGridPresentation<T extends RootDragRenderableItem>(params: {
  items: readonly T[];
  shortcuts: Shortcut[];
  layoutSnapshot: Array<MeasuredDragItem<T>> | null;
  activeDragId: string | null;
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  rootElement: HTMLDivElement | null;
  usesSpanAwareReorder: boolean;
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  firefox: boolean;
  visualOptions: RootShortcutVisualOptions;
  renderDragPreview: RootShortcutDragPreviewRenderer;
}) {
  return buildScenePresentation({
    resolveDragRenderState: () => resolveRootDragRenderState({
      items: params.items,
      shortcuts: params.shortcuts,
      layoutSnapshot: params.layoutSnapshot,
      activeSortId: params.activeDragId,
      hoverResolution: params.hoverResolution,
      rootElement: params.rootElement,
      usesSpanAwareReorder: params.usesSpanAwareReorder,
      gridColumns: params.gridColumns,
      gridColumnWidth: params.gridColumnWidth,
      columnGap: params.columnGap,
      rowHeight: params.rowHeight,
      rowGap: params.rowGap,
    }),
    buildExtra: (rootDragRenderState) => ({
      rootDragVisualState: rootDragRenderState.visualState,
    }),
    items: params.items,
    activeDragId: params.activeDragId,
    getId: (item) => item.sortId,
    createDragPreviewRenderer: () => createRootDragPreviewRenderer({
      firefox: params.firefox,
      visualOptions: params.visualOptions,
      renderDragPreview: params.renderDragPreview,
    }),
  });
}

export function resolveFolderShortcutGridPresentation<T extends FolderDragRenderableItem & { shortcut: Shortcut }>(params: {
  shortcuts: Shortcut[];
  items: readonly T[];
  layoutSnapshot: Array<MeasuredDragItem<T>> | null;
  activeDragId: string | null;
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  rootElement: HTMLDivElement | null;
  dragSettlePreview: DragSettlePreview<Shortcut> | null;
  visualOptions: FolderShortcutVisualOptions;
  renderDragPreview: FolderShortcutDragPreviewRenderer;
}) {
  return buildScenePresentation({
    resolveDragRenderState: () => resolveFolderDragRenderState({
      shortcuts: params.shortcuts,
      items: params.items,
      layoutSnapshot: params.layoutSnapshot,
      activeShortcutId: params.activeDragId,
      hoverResolution: params.hoverResolution,
      rootElement: params.rootElement,
    }),
    buildExtra: () => ({
      hiddenShortcutId: resolveHiddenDragItemId({
        activeDragId: params.activeDragId,
        settlePreviewItemId: params.dragSettlePreview?.itemId ?? null,
      }),
    }),
    items: params.items,
    activeDragId: params.activeDragId,
    getId: (item) => item.shortcut.id,
    createDragPreviewRenderer: () => createFolderDragPreviewRenderer({
      visualOptions: params.visualOptions,
      renderDragPreview: params.renderDragPreview,
    }),
  });
}
