import type React from 'react';
import type { Shortcut, ShortcutIconAppearance } from '@/types';
import type { ShortcutActionRenderParams } from './shortcutGridSceneSharedTypes';

type SharedShortcutVisualBase = {
  compactIconSize: number;
  iconCornerRadius?: number;
  iconAppearance?: ShortcutIconAppearance;
  forceTextWhite: boolean;
};

type RootShortcutVisualBase = SharedShortcutVisualBase & {
  compactShowTitle: boolean;
  compactTitleFontSize: number;
  enableLargeFolder: boolean;
  largeFolderPreviewSize?: number;
};

export type RootShortcutVisualOptions = RootShortcutVisualBase & {
  compactIconSize: number;
  iconCornerRadius: number;
  iconAppearance: ShortcutIconAppearance;
};

export type RootShortcutGridCardRenderParams = RootShortcutVisualOptions & {
  shortcut: Shortcut;
  folderDropTargetActive?: boolean;
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  selectionDisabled: boolean;
  onOpen: () => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export type RootShortcutGridDragPreviewRenderParams = RootShortcutVisualOptions & {
  shortcut: Shortcut;
  firefox: boolean;
};

export type RootShortcutGridSelectionIndicatorRenderParams = {
  sortId: string;
  selected: boolean;
  compactPreviewSize: number;
};

export type RootGridCenterPreviewRenderParams = {
  shortcut: Shortcut;
  compactIconSize: number;
  iconCornerRadius: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
};

export type FolderShortcutVisualOptions = SharedShortcutVisualBase & {
  showShortcutTitles: boolean;
};

type FolderShortcutSharedRenderParams = SharedShortcutVisualBase & {
  shortcut: Shortcut;
};

type RootShortcutSharedRenderParams = RootShortcutVisualOptions & {
  shortcut: Shortcut;
};

export type FolderShortcutItemRenderParams = FolderShortcutSharedRenderParams & {
  showShortcutTitles: boolean;
  onOpen: ShortcutActionRenderParams['onOpen'];
  onContextMenu: ShortcutActionRenderParams['onContextMenu'];
};

export type FolderShortcutDragPreviewRenderParams = FolderShortcutSharedRenderParams;

function buildShortcutVisualParams<TVisualOptions extends object, TExtra extends object>(
  visualOptions: TVisualOptions,
  extra: TExtra,
): TVisualOptions & TExtra {
  return {
    ...visualOptions,
    ...extra,
  };
}

function buildFolderShortcutSharedRenderParams(params: {
  shortcut: Shortcut;
  visualOptions: FolderShortcutVisualOptions;
}): FolderShortcutSharedRenderParams {
  return {
    shortcut: params.shortcut,
    compactIconSize: params.visualOptions.compactIconSize,
    iconCornerRadius: params.visualOptions.iconCornerRadius,
    iconAppearance: params.visualOptions.iconAppearance,
    forceTextWhite: params.visualOptions.forceTextWhite,
  };
}

function buildShortcutActionRenderParams(
  params: ShortcutActionRenderParams,
): ShortcutActionRenderParams {
  return {
    onOpen: params.onOpen,
    onContextMenu: params.onContextMenu,
  };
}

function buildRootShortcutSharedRenderParams(params: {
  shortcut: Shortcut;
  visualOptions: RootShortcutVisualOptions;
}): RootShortcutSharedRenderParams {
  return buildShortcutVisualParams(params.visualOptions, {
    shortcut: params.shortcut,
  });
}

function buildRootGridCenterPreviewVisualParams(
  visualOptions: RootShortcutVisualOptions,
): Omit<RootGridCenterPreviewRenderParams, 'shortcut'> {
  return {
    compactIconSize: visualOptions.compactIconSize,
    iconCornerRadius: visualOptions.iconCornerRadius,
    largeFolderEnabled: visualOptions.enableLargeFolder,
    largeFolderPreviewSize: visualOptions.largeFolderPreviewSize,
  };
}

export function buildRootShortcutVisualOptions(params: RootShortcutVisualOptions): RootShortcutVisualOptions {
  return params;
}

export function buildFolderShortcutVisualOptions(params: FolderShortcutVisualOptions): FolderShortcutVisualOptions {
  return params;
}

export function buildRootShortcutCardRenderParams(params: {
  shortcut: Shortcut;
  visualOptions: RootShortcutVisualOptions;
  folderDropTargetActive?: boolean;
  onPreviewShortcutOpen?: (shortcut: Shortcut) => void;
  selectionDisabled: boolean;
  onOpen: ShortcutActionRenderParams['onOpen'];
  onContextMenu: ShortcutActionRenderParams['onContextMenu'];
}): RootShortcutGridCardRenderParams {
  return {
    ...buildRootShortcutSharedRenderParams({
      shortcut: params.shortcut,
      visualOptions: params.visualOptions,
    }),
    folderDropTargetActive: params.folderDropTargetActive,
    onPreviewShortcutOpen: params.onPreviewShortcutOpen,
    selectionDisabled: params.selectionDisabled,
    ...buildShortcutActionRenderParams(params),
  };
}

export function buildRootShortcutDragPreviewRenderParams(params: {
  shortcut: Shortcut;
  visualOptions: RootShortcutVisualOptions;
  firefox: boolean;
}): RootShortcutGridDragPreviewRenderParams {
  return {
    ...buildRootShortcutSharedRenderParams({
      shortcut: params.shortcut,
      visualOptions: params.visualOptions,
    }),
    firefox: params.firefox,
  };
}

export function buildRootShortcutSelectionIndicatorRenderParams(
  params: RootShortcutGridSelectionIndicatorRenderParams,
): RootShortcutGridSelectionIndicatorRenderParams {
  return params;
}

export function buildRootGridCenterPreviewRenderParams(params: {
  shortcut: Shortcut;
  visualOptions: RootShortcutVisualOptions;
}): RootGridCenterPreviewRenderParams {
  return {
    shortcut: params.shortcut,
    ...buildRootGridCenterPreviewVisualParams(params.visualOptions),
  };
}

export function buildFolderShortcutItemRenderParams(params: {
  shortcut: Shortcut;
  visualOptions: FolderShortcutVisualOptions;
  onOpen: ShortcutActionRenderParams['onOpen'];
  onContextMenu: ShortcutActionRenderParams['onContextMenu'];
}): FolderShortcutItemRenderParams {
  return {
    ...buildFolderShortcutSharedRenderParams({
      shortcut: params.shortcut,
      visualOptions: params.visualOptions,
    }),
    showShortcutTitles: params.visualOptions.showShortcutTitles,
    ...buildShortcutActionRenderParams(params),
  };
}

export function buildFolderShortcutDragPreviewRenderParams(params: {
  shortcut: Shortcut;
  visualOptions: FolderShortcutVisualOptions;
}): FolderShortcutDragPreviewRenderParams {
  return buildFolderShortcutSharedRenderParams({
    shortcut: params.shortcut,
    visualOptions: params.visualOptions,
  });
}
