import type { Shortcut } from '@/types';
import { normalizeDragPreviewLayout, type DragPreviewLayoutSpec, type NormalizedDragPreviewLayout } from './dragItemLayout';

export type ShortcutRenderableItem<TLayout> = {
  sortId: string;
  shortcut: Shortcut;
  shortcutIndex: number;
  layout: TLayout;
};

export type RootRenderableItemLayout = NormalizedDragPreviewLayout & {
  columnSpan: number;
  rowSpan: number;
};

export type FolderRenderableItemLayout = NormalizedDragPreviewLayout;

export type RootShortcutRenderableItem = ShortcutRenderableItem<RootRenderableItemLayout>;
export type FolderShortcutRenderableItem = ShortcutRenderableItem<FolderRenderableItemLayout>;

export function normalizeRootRenderableItemLayout(
  layout: DragPreviewLayoutSpec & {
    columnSpan?: number;
    rowSpan?: number;
  },
): RootRenderableItemLayout {
  return {
    ...normalizeDragPreviewLayout(layout),
    columnSpan: Math.max(1, layout.columnSpan ?? 1),
    rowSpan: Math.max(1, layout.rowSpan ?? 1),
  };
}

export function normalizeFolderRenderableItemLayout(
  layout: DragPreviewLayoutSpec,
): FolderRenderableItemLayout {
  return normalizeDragPreviewLayout(layout);
}

export function buildDuplicateAwareShortcutSortIdResolver(shortcuts: Shortcut[]): (shortcut: Shortcut, shortcutIndex: number) => string {
  const usedIds = new Map<string, number>();
  const sortIds = shortcuts.map((shortcut, shortcutIndex) => {
    const baseId = (shortcut.id || `${shortcut.url}::${shortcut.title}` || `shortcut-${shortcutIndex}`).trim();
    const duplicateCount = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, duplicateCount + 1);
    return duplicateCount === 0 ? baseId : `${baseId}::dup-${duplicateCount}`;
  });

  return (_shortcut, shortcutIndex) => sortIds[shortcutIndex] ?? `shortcut-${shortcutIndex}`;
}

export function buildShortcutRenderableItems<TLayout>(params: {
  shortcuts: Shortcut[];
  resolveSortId: (shortcut: Shortcut, shortcutIndex: number) => string;
  resolveLayout: (shortcut: Shortcut, shortcutIndex: number) => TLayout;
}): Array<ShortcutRenderableItem<TLayout>> {
  return params.shortcuts.map((shortcut, shortcutIndex) => ({
    sortId: params.resolveSortId(shortcut, shortcutIndex),
    shortcut,
    shortcutIndex,
    layout: params.resolveLayout(shortcut, shortcutIndex),
  }));
}

export function buildRootShortcutRenderableItems(params: {
  shortcuts: Shortcut[];
  resolveLayout: (shortcut: Shortcut, shortcutIndex: number) => DragPreviewLayoutSpec & {
    columnSpan?: number;
    rowSpan?: number;
  };
}): RootShortcutRenderableItem[] {
  const resolveSortId = buildDuplicateAwareShortcutSortIdResolver(params.shortcuts);

  return buildShortcutRenderableItems({
    shortcuts: params.shortcuts,
    resolveSortId,
    resolveLayout: (shortcut, shortcutIndex) => normalizeRootRenderableItemLayout(
      params.resolveLayout(shortcut, shortcutIndex),
    ),
  });
}

export function buildFolderShortcutRenderableItems(params: {
  shortcuts: Shortcut[];
  resolveLayout: (shortcut: Shortcut, shortcutIndex: number) => DragPreviewLayoutSpec;
}): FolderShortcutRenderableItem[] {
  return buildShortcutRenderableItems({
    shortcuts: params.shortcuts,
    resolveSortId: (shortcut) => shortcut.id,
    resolveLayout: (shortcut, shortcutIndex) => normalizeFolderRenderableItemLayout(
      params.resolveLayout(shortcut, shortcutIndex),
    ),
  });
}
