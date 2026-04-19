import type { RootShortcutGridProps } from '@leaftab/workspace-react';
import { LEAFTAB_COMPACT_GRID_METRICS } from './constants';
import {
  createLeaftabRootDropResolvers,
  resolveLeaftabRootItemLayout,
  type LeaftabRootDropResolverConfig,
} from './layout';
import {
  renderLeaftabDropPreview,
  renderLeaftabRootGridCenterPreview,
  renderLeaftabRootGridDragPreview,
  renderLeaftabRootGridItem,
} from './renderers';

type LeaftabRootGridPresetBindings = {
  resolveItemLayout: RootShortcutGridProps['resolveItemLayout'];
  resolveCompactTargetRegions: NonNullable<RootShortcutGridProps['resolveCompactTargetRegions']>;
  resolveDropTargetRects: NonNullable<RootShortcutGridProps['resolveDropTargetRects']>;
  renderItem: RootShortcutGridProps['renderItem'];
  renderDragPreview: RootShortcutGridProps['renderDragPreview'];
  renderCenterPreview: NonNullable<RootShortcutGridProps['renderCenterPreview']>;
  renderDropPreview: NonNullable<RootShortcutGridProps['renderDropPreview']>;
};

export type CreateLeaftabRootGridPresetOptions = LeaftabRootDropResolverConfig & {
  compactIconSize?: number;
  iconCornerRadius?: number;
  compactFallbackLargeFolderPreviewSize?: number;
  dropPreviewBorderRadius?: string;
};

export type LeaftabRootGridPreset = LeaftabRootGridPresetBindings & {
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
};

export function createLeaftabRootGridPreset(
  options: CreateLeaftabRootGridPresetOptions,
): LeaftabRootGridPreset {
  const {
    compactIconSize = LEAFTAB_COMPACT_GRID_METRICS.iconSize,
    columnGap = LEAFTAB_COMPACT_GRID_METRICS.columnGap,
    iconCornerRadius = LEAFTAB_COMPACT_GRID_METRICS.iconCornerRadius,
    largeFolderPreviewSize,
    largeFolderEnabled = options.gridColumns >= LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan,
    compactFallbackLargeFolderPreviewSize = compactIconSize * LEAFTAB_COMPACT_GRID_METRICS.largeFolderGridSpan + columnGap,
    dropPreviewBorderRadius,
  } = options;

  const rootDropResolvers = createLeaftabRootDropResolvers({
    ...options,
    columnGap,
    compactIconSize,
    largeFolderPreviewSize,
    largeFolderEnabled,
  });

  return {
    largeFolderEnabled,
    largeFolderPreviewSize,
    resolveItemLayout: (shortcut) => resolveLeaftabRootItemLayout({
      shortcut,
      compactIconSize,
      columnGap,
      iconCornerRadius,
      largeFolderPreviewSize,
      largeFolderEnabled,
      compactFallbackLargeFolderPreviewSize,
    }),
    resolveCompactTargetRegions: rootDropResolvers.resolveCompactTargetRegions,
    resolveDropTargetRects: rootDropResolvers.resolveDropTargetRects,
    renderItem: (params) => renderLeaftabRootGridItem(params, {
      largeFolderPreviewSize,
      iconCornerRadius,
    }),
    renderDragPreview: (params) => renderLeaftabRootGridDragPreview(params, {
      largeFolderPreviewSize,
      iconCornerRadius,
    }),
    renderCenterPreview: (params) => renderLeaftabRootGridCenterPreview(params, {
      largeFolderPreviewSize,
      iconCornerRadius,
    }),
    renderDropPreview: (params) => renderLeaftabDropPreview(params, {
      borderRadius: dropPreviewBorderRadius,
    }),
  };
}
