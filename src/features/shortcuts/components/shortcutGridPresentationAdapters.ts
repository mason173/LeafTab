import type { Shortcut } from '@/types';
import type { ResolvedDragHoverState } from '@/features/shortcuts/drag/dragSessionRuntime';
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

export function resolveRootShortcutGridPresentation<T extends RootDragRenderableItem>(params: {
  items: readonly T[];
  shortcuts: Shortcut[];
  layoutSnapshot: Array<MeasuredDragItem<T>> | null;
  activeDragId: string | null;
  hoverState: ResolvedDragHoverState<RootShortcutDropIntent>;
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
  const rootDragRenderState = resolveRootDragRenderState({
    items: params.items,
    shortcuts: params.shortcuts,
    layoutSnapshot: params.layoutSnapshot,
    activeSortId: params.activeDragId,
    interactionIntent: params.hoverState.interactionIntent,
    visualProjectionIntent: params.hoverState.visualProjectionIntent,
    rootElement: params.rootElement,
    usesSpanAwareReorder: params.usesSpanAwareReorder,
    gridColumns: params.gridColumns,
    gridColumnWidth: params.gridColumnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
  });

  return {
    projectionOffsets: rootDragRenderState.projectionOffsets,
    projectedDropPreview: rootDragRenderState.projectedDropPreview,
    rootDragVisualState: rootDragRenderState.visualState,
    activeDragItem: resolveActiveDragPreviewItem({
      items: params.items,
      activeDragId: params.activeDragId,
      getId: (item) => item.sortId,
    }),
    dragPreviewRenderer: createRootDragPreviewRenderer({
      firefox: params.firefox,
      visualOptions: params.visualOptions,
      renderDragPreview: params.renderDragPreview,
    }),
  };
}

export function resolveFolderShortcutGridPresentation<T extends FolderDragRenderableItem & { shortcut: Shortcut }>(params: {
  shortcuts: Shortcut[];
  items: readonly T[];
  layoutSnapshot: Array<MeasuredDragItem<T>> | null;
  activeDragId: string | null;
  hoverState: ResolvedDragHoverState<RootShortcutDropIntent>;
  rootElement: HTMLDivElement | null;
  dragSettlePreview: DragSettlePreview<Shortcut> | null;
  visualOptions: FolderShortcutVisualOptions;
  renderDragPreview: FolderShortcutDragPreviewRenderer;
}) {
  const folderDragRenderState = resolveFolderDragRenderState({
    shortcuts: params.shortcuts,
    items: params.items,
    layoutSnapshot: params.layoutSnapshot,
    activeShortcutId: params.activeDragId,
    visualProjectionIntent: params.hoverState.visualProjectionIntent,
    rootElement: params.rootElement,
  });

  return {
    projectionOffsets: folderDragRenderState.projectionOffsets,
    projectedDropPreview: folderDragRenderState.projectedDropPreview,
    hiddenShortcutId: resolveHiddenDragItemId({
      activeDragId: params.activeDragId,
      settlePreviewItemId: params.dragSettlePreview?.itemId ?? null,
    }),
    activeDragItem: resolveActiveDragPreviewItem({
      items: params.items,
      activeDragId: params.activeDragId,
      getId: (item) => item.shortcut.id,
    }),
    dragPreviewRenderer: createFolderDragPreviewRenderer({
      visualOptions: params.visualOptions,
      renderDragPreview: params.renderDragPreview,
    }),
  };
}
