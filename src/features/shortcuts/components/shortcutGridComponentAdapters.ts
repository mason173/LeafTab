import type { FolderShortcutSurfaceProps } from '@/features/shortcuts/components/FolderShortcutSurface';
import type { RootShortcutGridProps } from '@/features/shortcuts/components/RootShortcutGrid';
import {
  defaultFolderShortcutSurfaceRenderers,
  defaultRootShortcutGridRenderers,
} from '@/features/shortcuts/components/shortcutGridDefaultRenderers';
import type { FolderShortcutSurfaceSceneControllerParams } from '@/features/shortcuts/components/folderShortcutSurfaceSceneController';
import type { RootShortcutGridSceneControllerParams } from '@/features/shortcuts/components/rootShortcutGridSceneController';

const ROOT_SHORTCUT_GRID_DEFAULTS = {
  bottomInset: 0,
  compactShowTitle: true,
  layoutDensity: 'regular' as const,
  compactIconSize: 72,
  iconCornerRadius: 22,
  iconAppearance: 'colorful' as const,
  compactTitleFontSize: 12,
  forceTextWhite: false,
  monochromeTone: 'theme-adaptive' as const,
  monochromeTileBackdropBlur: false,
  disableReorderAnimation: false,
  selectionMode: false,
};

const FOLDER_SHORTCUT_SURFACE_DEFAULTS = {
  compactIconSize: 72,
  iconCornerRadius: 22,
  forceTextWhite: false,
  showShortcutTitles: true,
};

export function resolveRootShortcutGridComponentState(
  props: RootShortcutGridProps,
): { controllerParams: RootShortcutGridSceneControllerParams } {
  return {
    controllerParams: {
      containerHeight: props.containerHeight,
      bottomInset: props.bottomInset ?? ROOT_SHORTCUT_GRID_DEFAULTS.bottomInset,
      shortcuts: props.shortcuts,
      gridColumns: props.gridColumns,
      minRows: props.minRows,
      onShortcutOpen: props.onShortcutOpen,
      onShortcutContextMenu: props.onShortcutContextMenu,
      onShortcutReorder: props.onShortcutReorder,
      onShortcutDropIntent: props.onShortcutDropIntent,
      onGridContextMenu: props.onGridContextMenu,
      compactShowTitle: props.compactShowTitle ?? ROOT_SHORTCUT_GRID_DEFAULTS.compactShowTitle,
      layoutDensity: props.layoutDensity ?? ROOT_SHORTCUT_GRID_DEFAULTS.layoutDensity,
      compactIconSize: props.compactIconSize ?? ROOT_SHORTCUT_GRID_DEFAULTS.compactIconSize,
      iconCornerRadius: props.iconCornerRadius ?? ROOT_SHORTCUT_GRID_DEFAULTS.iconCornerRadius,
      iconAppearance: props.iconAppearance ?? ROOT_SHORTCUT_GRID_DEFAULTS.iconAppearance,
      compactTitleFontSize: props.compactTitleFontSize ?? ROOT_SHORTCUT_GRID_DEFAULTS.compactTitleFontSize,
      forceTextWhite: props.forceTextWhite ?? ROOT_SHORTCUT_GRID_DEFAULTS.forceTextWhite,
      monochromeTone: props.monochromeTone ?? ROOT_SHORTCUT_GRID_DEFAULTS.monochromeTone,
      monochromeTileBackdropBlur:
        props.monochromeTileBackdropBlur ?? ROOT_SHORTCUT_GRID_DEFAULTS.monochromeTileBackdropBlur,
      onDragStart: props.onDragStart,
      onDragEnd: props.onDragEnd,
      disableReorderAnimation:
        props.disableReorderAnimation ?? ROOT_SHORTCUT_GRID_DEFAULTS.disableReorderAnimation,
      selectionMode: props.selectionMode ?? ROOT_SHORTCUT_GRID_DEFAULTS.selectionMode,
      selectedShortcutIndexes: props.selectedShortcutIndexes,
      onToggleShortcutSelection: props.onToggleShortcutSelection,
      externalDragSession: props.externalDragSession,
      onExternalDragSessionConsumed: props.onExternalDragSessionConsumed,
      renderShortcutCard: props.renderShortcutCard ?? defaultRootShortcutGridRenderers.renderShortcutCard,
      renderDragPreview: props.renderDragPreview ?? defaultRootShortcutGridRenderers.renderDragPreview,
      renderSelectionIndicator:
        props.renderSelectionIndicator ?? defaultRootShortcutGridRenderers.renderSelectionIndicator,
    },
  };
}

export function resolveFolderShortcutSurfaceComponentState(
  props: FolderShortcutSurfaceProps,
): {
  controllerParams: FolderShortcutSurfaceSceneControllerParams;
  emptyText: string;
  hasShortcuts: boolean;
} {
  return {
    controllerParams: {
      folderId: props.folderId,
      shortcuts: props.shortcuts,
      compactIconSize: props.compactIconSize ?? FOLDER_SHORTCUT_SURFACE_DEFAULTS.compactIconSize,
      iconCornerRadius: props.iconCornerRadius ?? FOLDER_SHORTCUT_SURFACE_DEFAULTS.iconCornerRadius,
      iconAppearance: props.iconAppearance,
      forceTextWhite: props.forceTextWhite ?? FOLDER_SHORTCUT_SURFACE_DEFAULTS.forceTextWhite,
      showShortcutTitles:
        props.showShortcutTitles ?? FOLDER_SHORTCUT_SURFACE_DEFAULTS.showShortcutTitles,
      maskBoundaryRef: props.maskBoundaryRef,
      onShortcutOpen: props.onShortcutOpen,
      onShortcutContextMenu: props.onShortcutContextMenu,
      onShortcutDropIntent: props.onShortcutDropIntent,
      onExtractDragStart: props.onExtractDragStart,
      onDragActiveChange: props.onDragActiveChange,
      renderShortcutCard:
        props.renderShortcutCard ?? defaultFolderShortcutSurfaceRenderers.renderShortcutCard,
      renderDragPreview:
        props.renderDragPreview ?? defaultFolderShortcutSurfaceRenderers.renderDragPreview,
    },
    emptyText: props.emptyText,
    hasShortcuts: props.shortcuts.length > 0,
  };
}
