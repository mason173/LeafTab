import type { Shortcut } from '@/types';
import type { DragHoverResolution } from './dragSessionRuntime';
import { resolveGridDragFrameState } from './dragFrameRenderState';
import { buildDragPlaceholderStyle } from './dragItemLayout';
import { buildLinearProjectedDropPreview, resolveLinearReorderTargetIndex } from './linearReorderProjection';
import { buildReorderProjectionOffsets, type MeasuredDragItem, type ProjectionOffset } from './gridDragEngine';
import type { RootShortcutDropIntent } from './types';

export type FolderDragRenderableLayout = {
  previewOffsetX: number;
  previewOffsetY: number;
  previewWidth: number;
  previewHeight: number;
  previewBorderRadius?: string;
};

export type FolderDragRenderableItem = {
  shortcut: Shortcut;
  layout: FolderDragRenderableLayout;
};

export type FolderGridItemRenderState = {
  frameState: ReturnType<typeof resolveGridDragFrameState>;
  placeholderStyle: ReturnType<typeof buildDragPlaceholderStyle>;
};

export function resolveFolderGridItemRenderState<T extends FolderDragRenderableItem>(params: {
  item: T;
  hiddenItemId: string | null;
  activeDragId: string | null;
  projectionOffsets: ReadonlyMap<string, ProjectionOffset>;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
}): FolderGridItemRenderState {
  return {
    frameState: resolveGridDragFrameState({
      itemId: params.item.shortcut.id,
      hiddenItemId: params.hiddenItemId,
      activeDragId: params.activeDragId,
      reorderProjectionOffsets: params.projectionOffsets,
      layoutShiftOffsets: params.layoutShiftOffsets,
    }),
    placeholderStyle: buildDragPlaceholderStyle(params.item.layout),
  };
}

export function buildFolderReorderProjectionOffsets<T extends FolderDragRenderableItem>(params: {
  shortcuts: Shortcut[];
  layoutSnapshot: Array<MeasuredDragItem<T>> | null;
  activeShortcutId: string | null;
  hoverIntent: RootShortcutDropIntent | null;
}): Map<string, ProjectionOffset> {
  const { shortcuts, layoutSnapshot, activeShortcutId, hoverIntent } = params;
  if (!layoutSnapshot || !activeShortcutId || hoverIntent?.type !== 'reorder-root') {
    return new Map();
  }

  const items = shortcuts.map((shortcut, shortcutIndex) => ({ shortcut, shortcutIndex }));
  const targetIndex = resolveLinearReorderTargetIndex({
    items,
    activeId: activeShortcutId,
    overId: hoverIntent.overShortcutId,
    edge: hoverIntent.edge,
    getId: (item) => item.shortcut.id,
  });

  return buildReorderProjectionOffsets({
    items,
    layoutSnapshot,
    activeId: activeShortcutId,
    hoveredId: hoverIntent.overShortcutId,
    targetIndex,
    getId: (item) => item.shortcut.id,
  });
}

export function resolveFolderDragRenderState<T extends FolderDragRenderableItem>(params: {
  shortcuts: Shortcut[];
  items: readonly T[];
  layoutSnapshot: Array<MeasuredDragItem<T>> | null;
  activeShortcutId: string | null;
  hoverResolution: DragHoverResolution<RootShortcutDropIntent>;
  rootElement: HTMLDivElement | null;
}) {
  return {
    projectionOffsets: buildFolderReorderProjectionOffsets({
      shortcuts: params.shortcuts,
      layoutSnapshot: params.layoutSnapshot,
      activeShortcutId: params.activeShortcutId,
      hoverIntent: params.hoverResolution.visualProjectionIntent,
    }),
    projectedDropPreview: buildLinearProjectedDropPreview({
      items: params.items,
      layoutSnapshot: params.layoutSnapshot,
      activeId: params.activeShortcutId,
      hoverIntent: params.hoverResolution.visualProjectionIntent,
      rootElement: params.rootElement,
      getId: (item) => item.shortcut.id,
      getLayout: (item) => item.layout,
    }),
  };
}
