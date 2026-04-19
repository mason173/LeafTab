import type { Shortcut } from '@/types';
import {
  computeLeaftabLargeFolderPreviewSize as computeSharedLeaftabLargeFolderPreviewSize,
  resolveLeaftabRootItemLayout as resolveSharedLeaftabRootItemLayout,
} from '@leaftab/workspace-preset-leaftab';

export {
  renderLeaftabDropPreview,
  renderLeaftabFolderDragPreview,
  renderLeaftabFolderDropPreview,
  renderLeaftabFolderEmptyState,
  renderLeaftabFolderItem,
  renderRootGridCenterPreview,
  renderRootShortcutGridCard,
  renderRootShortcutGridDragPreview,
  renderRootShortcutGridSelectionIndicator,
  resolveLeaftabFolderItemLayout,
  resolveLeaftabShadowPreviewGeometry,
} from './leaftabShortcutVisualAdapter';

export function resolveLeaftabRootItemLayout(params: {
  shortcut: Shortcut;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
  iconCornerRadius: number;
}) {
  return resolveSharedLeaftabRootItemLayout({
    shortcut: params.shortcut,
    compactIconSize: params.compactIconSize,
    largeFolderEnabled: params.largeFolderEnabled,
    largeFolderPreviewSize: params.largeFolderPreviewSize,
    iconCornerRadius: params.iconCornerRadius,
  });
}

export function computeLargeFolderPreviewSize(params: {
  compactIconSize: number;
  columnGap: number;
  rowGap: number;
  gridColumns: number;
  gridWidthPx: number | null;
  largeFolderEnabled: boolean;
}) {
  return computeSharedLeaftabLargeFolderPreviewSize({
    compactIconSize: params.compactIconSize,
    columnGap: params.columnGap,
    rowGap: params.rowGap,
    gridColumns: params.gridColumns,
    gridWidthPx: params.gridWidthPx,
    largeFolderEnabled: params.largeFolderEnabled,
  });
}
