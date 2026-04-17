import type {
  FolderShortcutSurfaceSceneControllerParams,
} from './folderShortcutSurfaceSceneController';
import type {
  RootShortcutGridSceneControllerParams,
} from './rootShortcutGridSceneController';
import type { ShortcutLayoutDensity } from '@/components/shortcuts/shortcutCardVariant';
import type { Shortcut } from '@/types';

function buildShortcutSurfaceStateParams<TExtra extends object>(params: {
  shortcuts: Shortcut[];
} & TExtra) {
  return params;
}

function buildShortcutSurfaceInteractionParams<TExtra extends object>(params: {
  rootRef: React.RefObject<HTMLDivElement | null>;
} & TExtra) {
  return params;
}

export function buildRootShortcutSurfaceStateParams(params: {
  controllerParams: RootShortcutGridSceneControllerParams;
  gridWidthPx: number | null;
}) {
  return buildShortcutSurfaceStateParams({
    shortcuts: params.controllerParams.shortcuts,
    gridColumns: params.controllerParams.gridColumns,
    gridWidthPx: params.gridWidthPx,
    layoutDensity: params.controllerParams.layoutDensity,
    compactShowTitle: params.controllerParams.compactShowTitle,
    compactIconSize: params.controllerParams.compactIconSize,
    iconCornerRadius: params.controllerParams.iconCornerRadius,
    iconAppearance: params.controllerParams.iconAppearance,
    compactTitleFontSize: params.controllerParams.compactTitleFontSize,
    forceTextWhite: params.controllerParams.forceTextWhite,
  });
}

export function buildRootGridLayoutStateParams<TItem extends {
  layout: { columnSpan: number; rowSpan: number };
}>(params: {
  items: readonly TItem[];
  gridColumns: number;
  minRows: number;
  gridWidthPx: number | null;
  compactIconSize: number;
  layoutDensity: ShortcutLayoutDensity;
}) {
  return {
    items: params.items,
    gridColumns: params.gridColumns,
    minRows: params.minRows,
    gridWidthPx: params.gridWidthPx,
    compactIconSize: params.compactIconSize,
    layoutDensity: params.layoutDensity,
  };
}

export function buildRootShortcutGridInteractionParams<TItem>(params: {
  rootRef: React.RefObject<HTMLDivElement | null>;
  items: readonly TItem[];
  shortcuts: Shortcut[];
  gridColumns: number;
  gridColumnWidth: number | null;
  columnGap: number;
  rowHeight: number;
  rowGap: number;
  compactIconSize: number;
  largeFolderEnabled: boolean;
  largeFolderPreviewSize?: number;
  controllerParams: RootShortcutGridSceneControllerParams;
}) {
  return buildShortcutSurfaceInteractionParams({
    rootRef: params.rootRef,
    items: params.items,
    shortcuts: params.shortcuts,
    gridColumns: params.gridColumns,
    gridColumnWidth: params.gridColumnWidth,
    columnGap: params.columnGap,
    rowHeight: params.rowHeight,
    rowGap: params.rowGap,
    compactIconSize: params.compactIconSize,
    largeFolderEnabled: params.largeFolderEnabled,
    largeFolderPreviewSize: params.largeFolderPreviewSize,
    onShortcutReorder: params.controllerParams.onShortcutReorder,
    onShortcutDropIntent: params.controllerParams.onShortcutDropIntent,
    onDragStart: params.controllerParams.onDragStart,
    onDragEnd: params.controllerParams.onDragEnd,
    externalDragSession: params.controllerParams.externalDragSession,
    onExternalDragSessionConsumed: params.controllerParams.onExternalDragSessionConsumed,
  });
}

export function buildFolderShortcutSurfaceStateParams(
  controllerParams: FolderShortcutSurfaceSceneControllerParams,
) {
  return buildShortcutSurfaceStateParams({
    shortcuts: controllerParams.shortcuts,
    compactIconSize: controllerParams.compactIconSize,
    iconCornerRadius: controllerParams.iconCornerRadius,
    iconAppearance: controllerParams.iconAppearance,
    forceTextWhite: controllerParams.forceTextWhite,
    showShortcutTitles: controllerParams.showShortcutTitles,
  });
}

export function buildFolderShortcutSurfaceInteractionParams<TItem>(params: {
  rootRef: React.RefObject<HTMLDivElement | null>;
  measuredItems: readonly TItem[];
  columns: number;
  controllerParams: FolderShortcutSurfaceSceneControllerParams;
}) {
  return buildShortcutSurfaceInteractionParams({
    rootRef: params.rootRef,
    maskBoundaryRef: params.controllerParams.maskBoundaryRef,
    folderId: params.controllerParams.folderId,
    shortcuts: params.controllerParams.shortcuts,
    measuredItems: params.measuredItems,
    columns: params.columns,
    onShortcutDropIntent: params.controllerParams.onShortcutDropIntent,
    onExtractDragStart: params.controllerParams.onExtractDragStart,
    onDragActiveChange: params.controllerParams.onDragActiveChange,
  });
}
