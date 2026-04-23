import { useMemo } from 'react';
import { type ShortcutExperienceRootProps } from '@/features/shortcuts/app/ShortcutExperienceRoot';

export type UseShortcutExperienceRootPropsParams = {
  onEditShortcut: ShortcutExperienceRootProps['selectionActions']['onEditShortcut'];
  onEditFolderShortcut: ShortcutExperienceRootProps['selectionActions']['onEditFolderShortcut'];
  onDeleteFolderShortcut: ShortcutExperienceRootProps['selectionActions']['onDeleteFolderShortcut'];
  onShortcutOpen: ShortcutExperienceRootProps['selectionActions']['onShortcutOpen'];
  onCreateFolder: ShortcutExperienceRootProps['selectionActions']['onCreateFolder'];
  onPinSelectedShortcuts: ShortcutExperienceRootProps['selectionActions']['onPinSelectedShortcuts'];
  onMoveSelectedShortcutsToScenario: ShortcutExperienceRootProps['selectionActions']['onMoveSelectedShortcutsToScenario'];
  onMoveSelectedShortcutsToFolder: ShortcutExperienceRootProps['selectionActions']['onMoveSelectedShortcutsToFolder'];
  onDissolveFolder: ShortcutExperienceRootProps['selectionActions']['onDissolveFolder'];
  onSetFolderDisplayMode: ShortcutExperienceRootProps['selectionActions']['onSetFolderDisplayMode'];
  onDrawerFolderChildShortcutContextMenu?: ShortcutExperienceRootProps['onDrawerFolderChildShortcutContextMenu'];
  homeInteractiveSurfaceVisible: boolean;
  initialRevealReady: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['initialRevealReady'];
  modeLayersVisible: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['modeLayersVisible'];
  modeFlags: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['modeFlags'];
  showOverlayWallpaperLayer: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['showOverlayWallpaperLayer'];
  wallpaperAnimatedLayerStyle: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['wallpaperAnimatedLayerStyle'];
  effectiveWallpaperMode: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['effectiveWallpaperMode'];
  freshWeatherVideo: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['freshWeatherVideo'];
  colorWallpaperGradient: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['colorWallpaperGradient'];
  effectiveOverlayWallpaperSrc: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['effectiveOverlayWallpaperSrc'];
  overlayBackgroundAlt: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['overlayBackgroundAlt'];
  onOverlayImageReady: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['onOverlayImageReady'];
  effectiveWallpaperMaskOpacity: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['effectiveWallpaperMaskOpacity'];
  topNavModeProps: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['topNavModeProps'];
  homeMainContentBaseProps: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['homeMainContentBaseProps'];
  shortcutGridBaseProps: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['shortcutGridBaseProps'];
  shortcutGridHeatZoneInspectorEnabled: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['shortcutGridHeatZoneInspectorEnabled'];
  shortcutGridHiddenShortcutId: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['shortcutGridHiddenShortcutId'];
  shortcutGridOpenFolderPreviewId: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['shortcutGridOpenFolderPreviewId'];
  wallpaperClockBaseProps: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['wallpaperClockBaseProps'];
  searchExperienceBaseProps: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['searchExperienceBaseProps'];
  baseTimeAnimationEnabled: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['baseTimeAnimationEnabled'];
  freezeDynamicWallpaperBase: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['freezeDynamicWallpaperBase'];
  folderTransitionController: ShortcutExperienceRootProps['folderTransitionController'];
  compactFolderOverlayBaseProps: ShortcutExperienceRootProps['compactFolderOverlayProps'];
  folderNameDialogOpen: ShortcutExperienceRootProps['folderNameDialogOpen'];
  setFolderNameDialogOpen: (open: boolean) => void;
  closeFolderNameDialog: () => void;
  folderNameDialogTitle: ShortcutExperienceRootProps['folderNameDialogTitle'];
  folderNameDialogDescription: ShortcutExperienceRootProps['folderNameDialogDescription'];
  folderNameDialogInitialName: ShortcutExperienceRootProps['folderNameDialogInitialName'];
  onFolderNameSubmit: ShortcutExperienceRootProps['onFolderNameSubmit'];
};

export function useShortcutExperienceRootProps(
  params: UseShortcutExperienceRootPropsParams,
): ShortcutExperienceRootProps {
  const onFolderNameDialogOpenChange = useMemo<ShortcutExperienceRootProps['onFolderNameDialogOpenChange']>(() => (
    (open) => {
      if (open) {
        params.setFolderNameDialogOpen(true);
        return;
      }
      params.closeFolderNameDialog();
    }
  ), [params.closeFolderNameDialog, params.setFolderNameDialogOpen]);

  return useMemo(() => ({
    selectionActions: {
      onEditShortcut: params.onEditShortcut,
      onEditFolderShortcut: params.onEditFolderShortcut,
      onDeleteFolderShortcut: params.onDeleteFolderShortcut,
      onShortcutOpen: params.onShortcutOpen,
      onCreateFolder: params.onCreateFolder,
      onPinSelectedShortcuts: params.onPinSelectedShortcuts,
      onMoveSelectedShortcutsToScenario: params.onMoveSelectedShortcutsToScenario,
      onMoveSelectedShortcutsToFolder: params.onMoveSelectedShortcutsToFolder,
      onDissolveFolder: params.onDissolveFolder,
      onSetFolderDisplayMode: params.onSetFolderDisplayMode,
    },
    homeInteractiveSurfaceVisible: params.homeInteractiveSurfaceVisible,
    homeInteractiveSurfaceBaseProps: {
      initialRevealReady: params.initialRevealReady,
      modeLayersVisible: params.modeLayersVisible,
      modeFlags: params.modeFlags,
      showOverlayWallpaperLayer: params.showOverlayWallpaperLayer,
      wallpaperAnimatedLayerStyle: params.wallpaperAnimatedLayerStyle,
      effectiveWallpaperMode: params.effectiveWallpaperMode,
      freshWeatherVideo: params.freshWeatherVideo,
      colorWallpaperGradient: params.colorWallpaperGradient,
      effectiveOverlayWallpaperSrc: params.effectiveOverlayWallpaperSrc,
      overlayBackgroundAlt: params.overlayBackgroundAlt,
      onOverlayImageReady: params.onOverlayImageReady,
      effectiveWallpaperMaskOpacity: params.effectiveWallpaperMaskOpacity,
      topNavModeProps: params.topNavModeProps,
      homeMainContentBaseProps: params.homeMainContentBaseProps,
      shortcutGridBaseProps: params.shortcutGridBaseProps,
      shortcutGridHeatZoneInspectorEnabled: params.shortcutGridHeatZoneInspectorEnabled,
      shortcutGridHiddenShortcutId: params.shortcutGridHiddenShortcutId,
      shortcutGridOpenFolderPreviewId: params.shortcutGridOpenFolderPreviewId,
      wallpaperClockBaseProps: params.wallpaperClockBaseProps,
      searchExperienceBaseProps: params.searchExperienceBaseProps,
      baseTimeAnimationEnabled: params.baseTimeAnimationEnabled,
      freezeDynamicWallpaperBase: params.freezeDynamicWallpaperBase,
    },
    onDrawerFolderChildShortcutContextMenu: params.onDrawerFolderChildShortcutContextMenu,
    folderTransitionController: params.folderTransitionController,
    compactFolderOverlayProps: params.compactFolderOverlayBaseProps,
    folderNameDialogOpen: params.folderNameDialogOpen,
    onFolderNameDialogOpenChange,
    folderNameDialogTitle: params.folderNameDialogTitle,
    folderNameDialogDescription: params.folderNameDialogDescription,
    folderNameDialogInitialName: params.folderNameDialogInitialName,
    onFolderNameSubmit: params.onFolderNameSubmit,
  }), [
    onFolderNameDialogOpenChange,
    params.baseTimeAnimationEnabled,
    params.closeFolderNameDialog,
    params.colorWallpaperGradient,
    params.compactFolderOverlayBaseProps,
    params.onDrawerFolderChildShortcutContextMenu,
    params.effectiveOverlayWallpaperSrc,
    params.effectiveWallpaperMaskOpacity,
    params.effectiveWallpaperMode,
    params.folderNameDialogDescription,
    params.folderNameDialogInitialName,
    params.folderNameDialogOpen,
    params.folderNameDialogTitle,
    params.folderTransitionController,
    params.freezeDynamicWallpaperBase,
    params.freshWeatherVideo,
    params.homeInteractiveSurfaceVisible,
    params.homeMainContentBaseProps,
    params.initialRevealReady,
    params.modeFlags,
    params.modeLayersVisible,
    params.onCreateFolder,
    params.onDeleteFolderShortcut,
    params.onDissolveFolder,
    params.onEditFolderShortcut,
    params.onEditShortcut,
    params.onFolderNameSubmit,
    params.onMoveSelectedShortcutsToFolder,
    params.onMoveSelectedShortcutsToScenario,
    params.onOverlayImageReady,
    params.onPinSelectedShortcuts,
    params.onSetFolderDisplayMode,
    params.onShortcutOpen,
    params.overlayBackgroundAlt,
    params.searchExperienceBaseProps,
    params.shortcutGridBaseProps,
    params.shortcutGridHeatZoneInspectorEnabled,
    params.shortcutGridHiddenShortcutId,
    params.shortcutGridOpenFolderPreviewId,
    params.showOverlayWallpaperLayer,
    params.topNavModeProps,
    params.wallpaperAnimatedLayerStyle,
    params.wallpaperClockBaseProps,
  ]);
}
