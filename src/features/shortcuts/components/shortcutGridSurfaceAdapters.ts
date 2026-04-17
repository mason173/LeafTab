import { useMemo } from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import type { ShortcutLayoutDensity } from '@/components/shortcuts/shortcutCardVariant';
import {
  buildFolderShortcutRenderableItems,
  buildRootShortcutRenderableItems,
  type FolderShortcutRenderableItem,
  type RootShortcutRenderableItem,
} from '@/features/shortcuts/drag/dragRenderableItems';
import {
  ROOT_GRID_COLUMN_GAP_PX,
  resolveRootGridRowGap,
} from '@/features/shortcuts/drag/rootGridLayoutState';
import {
  type FolderShortcutVisualOptions,
  type RootShortcutVisualOptions,
} from './shortcutGridVisualAdapters';
import {
  computeLargeFolderPreviewSize,
  resolveLeaftabFolderItemLayout,
  resolveLeaftabRootItemLayout,
} from './leaftabGridVisuals';

function useMemoizedShortcutSurfaceValue<T>(factory: () => T, deps: React.DependencyList): T {
  return useMemo(factory, deps);
}

function useMemoizedShortcutRenderableItems<TItem, TLayout>(params: {
  shortcuts: Shortcut[];
  buildRenderableItems: (params: {
    shortcuts: Shortcut[];
    resolveLayout: (shortcut: Shortcut) => TLayout;
  }) => TItem[];
  resolveLayout: (shortcut: Shortcut) => TLayout;
  deps: React.DependencyList;
}) {
  return useMemoizedShortcutSurfaceValue(() => params.buildRenderableItems({
    shortcuts: params.shortcuts,
    resolveLayout: params.resolveLayout,
  }), params.deps);
}

function buildRootShortcutSurfacePreviewMetrics(params: {
  gridColumns: number;
  layoutDensity: ShortcutLayoutDensity;
}) {
  return {
    previewColumnGap: ROOT_GRID_COLUMN_GAP_PX,
    previewRowGap: resolveRootGridRowGap(params.layoutDensity),
    largeFolderEnabled: params.gridColumns >= 2,
  };
}

export function useRootShortcutSurfaceState(params: {
  shortcuts: Shortcut[];
  gridColumns: number;
  gridWidthPx: number | null;
  layoutDensity: ShortcutLayoutDensity;
  compactShowTitle: boolean;
  compactIconSize: number;
  iconCornerRadius: number;
  iconAppearance: ShortcutIconAppearance;
  compactTitleFontSize: number;
  forceTextWhite: boolean;
}): {
  items: RootShortcutRenderableItem[];
  rootVisualOptions: RootShortcutVisualOptions;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
} {
  const {
    previewColumnGap,
    previewRowGap,
    largeFolderEnabled,
  } = buildRootShortcutSurfacePreviewMetrics({
    gridColumns: params.gridColumns,
    layoutDensity: params.layoutDensity,
  });

  const largeFolderPreviewSize = useMemoizedShortcutSurfaceValue(() => computeLargeFolderPreviewSize({
    compactIconSize: params.compactIconSize,
    columnGap: previewColumnGap,
    rowGap: previewRowGap,
    gridColumns: params.gridColumns,
    gridWidthPx: params.gridWidthPx,
    largeFolderEnabled,
  }), [
    largeFolderEnabled,
    params.compactIconSize,
    params.gridColumns,
    params.gridWidthPx,
    previewColumnGap,
    previewRowGap,
  ]);

  const rootVisualOptions = useMemoizedShortcutSurfaceValue(() => ({
    compactShowTitle: params.compactShowTitle,
    compactIconSize: params.compactIconSize,
    iconCornerRadius: params.iconCornerRadius,
    iconAppearance: params.iconAppearance,
    compactTitleFontSize: params.compactTitleFontSize,
    forceTextWhite: params.forceTextWhite,
    enableLargeFolder: largeFolderEnabled,
    largeFolderPreviewSize,
  }), [
    largeFolderEnabled,
    largeFolderPreviewSize,
    params.compactIconSize,
    params.compactShowTitle,
    params.compactTitleFontSize,
    params.forceTextWhite,
    params.iconAppearance,
    params.iconCornerRadius,
  ]);

  const items = useMemoizedShortcutRenderableItems({
    shortcuts: params.shortcuts,
    buildRenderableItems: buildRootShortcutRenderableItems,
    resolveLayout: (shortcut) => resolveLeaftabRootItemLayout({
      shortcut,
      compactIconSize: params.compactIconSize,
      largeFolderEnabled,
      largeFolderPreviewSize,
      iconCornerRadius: params.iconCornerRadius,
    }),
    deps: [
      largeFolderEnabled,
      largeFolderPreviewSize,
      params.compactIconSize,
      params.iconCornerRadius,
      params.shortcuts,
    ],
  });

  return {
    items,
    rootVisualOptions,
    largeFolderEnabled,
    largeFolderPreviewSize,
  };
}

export function useFolderShortcutSurfaceState(params: {
  shortcuts: Shortcut[];
  compactIconSize: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  forceTextWhite: boolean;
  showShortcutTitles: boolean;
}): {
  items: FolderShortcutRenderableItem[];
  folderVisualOptions: FolderShortcutVisualOptions;
} {
  const folderVisualOptions = useMemoizedShortcutSurfaceValue(() => ({
    compactIconSize: params.compactIconSize,
    iconCornerRadius: params.iconCornerRadius,
    iconAppearance: params.iconAppearance,
    forceTextWhite: params.forceTextWhite,
    showShortcutTitles: params.showShortcutTitles,
  }), [
    params.compactIconSize,
    params.forceTextWhite,
    params.iconAppearance,
    params.iconCornerRadius,
    params.showShortcutTitles,
  ]);

  const items = useMemoizedShortcutRenderableItems({
    shortcuts: params.shortcuts,
    buildRenderableItems: buildFolderShortcutRenderableItems,
    resolveLayout: (shortcut) => resolveLeaftabFolderItemLayout({
      shortcut,
      compactIconSize: params.compactIconSize,
      iconCornerRadius: params.iconCornerRadius,
    }),
    deps: [params.compactIconSize, params.iconCornerRadius, params.shortcuts],
  });

  return {
    items,
    folderVisualOptions,
  };
}
