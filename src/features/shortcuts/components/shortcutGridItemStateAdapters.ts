import type { ProjectionOffset } from '@/features/shortcuts/drag/gridDragEngine';
import type { PackedGridItem } from '@/features/shortcuts/drag/gridLayout';
import {
  resolveFolderGridItemRenderState,
  type FolderGridItemRenderState,
} from '@/features/shortcuts/drag/folderDragRenderState';
import {
  resolveRootGridItemRenderState,
  type RootDragVisualState,
  type RootGridItemRenderState,
} from '@/features/shortcuts/drag/rootDragRenderState';

export type RootGridItemState<T> = {
  item: T;
  itemRenderState: RootGridItemRenderState;
  selected: boolean;
};

export type FolderGridItemState<T> = {
  item: T;
  itemRenderState: FolderGridItemRenderState;
};

function mapGridItemStates<TItem, TState>(items: readonly TItem[], resolveState: (item: TItem) => TState): TState[] {
  return items.map(resolveState);
}

export function resolveRootGridItemStates<T extends {
  sortId: string;
  shortcutIndex: number;
  layout: { width: number; height: number };
}>(params: {
  packedItems: Array<PackedGridItem<T>>;
  gridColumnWidth: number | null;
  compactIconSize: number;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  selectionMode: boolean;
  activeDragId: string | null;
  projectionOffsets: ReadonlyMap<string, ProjectionOffset>;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
  rootDragVisualState: RootDragVisualState;
  selectedShortcutIndexes?: ReadonlySet<number>;
}): RootGridItemState<T>[] {
  return mapGridItemStates(params.packedItems, (placedItem) => {
    const item = placedItem as typeof placedItem & T;
    return {
      item,
      itemRenderState: resolveRootGridItemRenderState({
        item,
        placedItem,
        gridColumnWidth: params.gridColumnWidth ?? params.compactIconSize,
        columnGap: params.columnGap,
        rowHeight: params.rowHeight,
        rowGap: params.rowGap,
        selectionMode: params.selectionMode,
        activeDragId: params.activeDragId,
        projectionOffsets: params.projectionOffsets,
        layoutShiftOffsets: params.layoutShiftOffsets,
        rootDragVisualState: params.rootDragVisualState,
      }),
      selected: params.selectedShortcutIndexes?.has(item.shortcutIndex) ?? false,
    };
  });
}

export function resolveFolderGridItemStates<T extends { shortcut: { id: string } }>(params: {
  items: readonly T[];
  hiddenItemId: string | null;
  activeDragId: string | null;
  projectionOffsets: ReadonlyMap<string, ProjectionOffset>;
  layoutShiftOffsets?: ReadonlyMap<string, ProjectionOffset>;
}): FolderGridItemState<T>[] {
  return mapGridItemStates(params.items, (item) => ({
    item,
    itemRenderState: resolveFolderGridItemRenderState({
      item,
      hiddenItemId: params.hiddenItemId,
      activeDragId: params.activeDragId,
      projectionOffsets: params.projectionOffsets,
      layoutShiftOffsets: params.layoutShiftOffsets,
    }),
  }));
}
