import type { FolderShortcutSurfaceProps } from '@leaftab/workspace-react';
import { LEAFTAB_COMPACT_GRID_METRICS } from './constants';
import { resolveLeaftabFolderItemLayout } from './layout';
import {
  renderLeaftabDropPreview,
  renderLeaftabFolderSurfaceDragPreview,
  renderLeaftabFolderSurfaceItem,
} from './renderers';

type LeaftabFolderSurfacePresetBindings = {
  resolveItemLayout: FolderShortcutSurfaceProps['resolveItemLayout'];
  renderItem: FolderShortcutSurfaceProps['renderItem'];
  renderDragPreview: FolderShortcutSurfaceProps['renderDragPreview'];
  renderDropPreview: NonNullable<FolderShortcutSurfaceProps['renderDropPreview']>;
};

export type CreateLeaftabFolderSurfacePresetOptions = {
  compactIconSize?: number;
  iconCornerRadius?: number;
  largeFolderPreviewSize?: number;
  dropPreviewBorderRadius?: string;
};

export type LeaftabFolderSurfacePreset = LeaftabFolderSurfacePresetBindings;

export function createLeaftabFolderSurfacePreset(
  options: CreateLeaftabFolderSurfacePresetOptions = {},
): LeaftabFolderSurfacePreset {
  const {
    compactIconSize = LEAFTAB_COMPACT_GRID_METRICS.iconSize,
    iconCornerRadius = LEAFTAB_COMPACT_GRID_METRICS.iconCornerRadius,
    largeFolderPreviewSize,
    dropPreviewBorderRadius,
  } = options;

  return {
    resolveItemLayout: (shortcut) => resolveLeaftabFolderItemLayout({
      shortcut,
      compactIconSize,
      iconCornerRadius,
    }),
    renderItem: (params) => renderLeaftabFolderSurfaceItem(params, {
      largeFolderPreviewSize,
      iconCornerRadius,
    }),
    renderDragPreview: (params) => renderLeaftabFolderSurfaceDragPreview(params, {
      largeFolderPreviewSize,
      iconCornerRadius,
    }),
    renderDropPreview: (params) => renderLeaftabDropPreview(params, {
      borderRadius: dropPreviewBorderRadius,
    }),
  };
}
