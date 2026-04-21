import { useMemo } from 'react';
import type { ShortcutAppContextValue } from '@/features/shortcuts/app/ShortcutAppContext';
import { type ShortcutExperienceRootProps } from '@/features/shortcuts/app/ShortcutExperienceRoot';
import { openCreateShortcutEditor } from '@/features/shortcuts/app/shortcutEditorState';

type ShortcutUiActions = ShortcutAppContextValue['actions']['ui'];

export type UseShortcutExperienceRootPropsParams = {
  setShortcutModalMode: ShortcutUiActions['setShortcutModalMode'];
  setSelectedShortcut: ShortcutUiActions['setSelectedShortcut'];
  setEditingTitle: ShortcutUiActions['setEditingTitle'];
  setEditingUrl: ShortcutUiActions['setEditingUrl'];
  setCurrentInsertIndex: ShortcutUiActions['setCurrentInsertIndex'];
  setShortcutEditOpen: ShortcutUiActions['setShortcutEditOpen'];
  setShortcutDeleteOpen: ShortcutUiActions['setShortcutDeleteOpen'];
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
  wallpaperClockBaseProps: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['wallpaperClockBaseProps'];
  searchExperienceBaseProps: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['searchExperienceBaseProps'];
  baseTimeAnimationEnabled: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['baseTimeAnimationEnabled'];
  freezeDynamicWallpaperBase: ShortcutExperienceRootProps['homeInteractiveSurfaceBaseProps']['freezeDynamicWallpaperBase'];
  compactOverlayShortcut: ShortcutExperienceRootProps['compactOverlayShortcut'];
  compactFolderOverlayBaseProps: ShortcutExperienceRootProps['compactFolderOverlayProps'];
  folderTransitionPhase: ShortcutExperienceRootProps['folderTransitionPhase'];
  folderTransitionProgress: ShortcutExperienceRootProps['folderTransitionProgress'];
  openingSourceSnapshot: ShortcutExperienceRootProps['openingSourceSnapshot'];
  onOpeningLayoutReady: ShortcutExperienceRootProps['onOpeningLayoutReady'];
  onClosingLayoutReady: ShortcutExperienceRootProps['onClosingLayoutReady'];
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
  return useMemo(() => ({
    selectionActions: {
      onCreateShortcut: (insertIndex) => {
        openCreateShortcutEditor({
          setShortcutModalMode: params.setShortcutModalMode,
          setSelectedShortcut: params.setSelectedShortcut,
          setEditingTitle: params.setEditingTitle,
          setEditingUrl: params.setEditingUrl,
          setCurrentInsertIndex: params.setCurrentInsertIndex,
          setShortcutEditOpen: params.setShortcutEditOpen,
        }, insertIndex);
      },
      onEditShortcut: params.onEditShortcut,
      onEditFolderShortcut: params.onEditFolderShortcut,
      onDeleteShortcut: (shortcutIndex, shortcut) => {
        params.setSelectedShortcut({ index: shortcutIndex, shortcut });
        params.setShortcutDeleteOpen(true);
      },
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
      wallpaperClockBaseProps: params.wallpaperClockBaseProps,
      searchExperienceBaseProps: params.searchExperienceBaseProps,
      baseTimeAnimationEnabled: params.baseTimeAnimationEnabled,
      freezeDynamicWallpaperBase: params.freezeDynamicWallpaperBase,
    },
    compactOverlayShortcut: params.compactOverlayShortcut,
    compactFolderOverlayProps: params.compactFolderOverlayBaseProps,
    folderTransitionPhase: params.folderTransitionPhase,
    folderTransitionProgress: params.folderTransitionProgress,
    openingSourceSnapshot: params.openingSourceSnapshot,
    onOpeningLayoutReady: params.onOpeningLayoutReady,
    onClosingLayoutReady: params.onClosingLayoutReady,
    folderNameDialogOpen: params.folderNameDialogOpen,
    onFolderNameDialogOpenChange: (open) => {
      if (open) {
        params.setFolderNameDialogOpen(true);
        return;
      }
      params.closeFolderNameDialog();
    },
    folderNameDialogTitle: params.folderNameDialogTitle,
    folderNameDialogDescription: params.folderNameDialogDescription,
    folderNameDialogInitialName: params.folderNameDialogInitialName,
    onFolderNameSubmit: params.onFolderNameSubmit,
  }), [params]);
}
