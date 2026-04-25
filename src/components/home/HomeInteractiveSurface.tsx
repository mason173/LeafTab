import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { RiArrowUpSLine } from '@/icons/ri-compat';
import { TopNavBar, type TopNavBarProps } from '@/components/TopNavBar';
import {
  HomeMainContent,
  type HomeMainContentBaseProps,
  type HomeMainContentShortcutGridProps,
  type HomeMainContentWallpaperClockProps,
} from '@/components/home/HomeMainContent';
import { WeatherLoopVideo } from '@/components/wallpaper/WeatherLoopVideo';
import { WallpaperBackdropProvider } from '@/components/wallpaper/WallpaperBackdropContext';
import { WallpaperMaskOverlay } from '@/components/wallpaper/WallpaperMaskOverlay';
import { toast } from '@/components/ui/sonner';
import {
  LIMESTART_ATMOSPHERE_OVERLAY_DELAY_MS,
  LIMESTART_ATMOSPHERE_OVERLAY_DURATION_MS,
  LIMESTART_FRONT_CONTENT_REVEAL_TIMING,
  resolveInitialRevealStyle,
} from '@/config/animationTokens';
import { RenderProfileBoundary } from '@/dev/renderProfiler';
import type { DisplayModeLayoutFlags } from '@/displayMode/config';
import { useBlurredWallpaperAsset } from '@/hooks/useBlurredWallpaperAsset';
import type { SearchExperienceProps, SearchInteractionState } from '@/components/search/SearchExperience';
import { BottomCropFadeOverlay, resolveBottomCropFadeHeight } from '@/components/home/BottomCropFadeOverlay';
import {
  FloatingSearchDock,
  resolveFloatingSearchMotionPhase,
  resolveFloatingSearchOffsetPx,
} from '@/components/home/FloatingSearchDock';
import { DrawerShortcutSearchBar } from '@/components/home/DrawerShortcutSearchBar';
import { HomeSearchBar } from '@/components/home/HomeSearchBar';
import { useGlobalSearchActivation } from '@/components/home/useGlobalSearchActivation';
import { useSearchBootstrapFocus } from '@/components/home/useSearchBootstrapFocus';
import {
  focusSearchInputElement,
  type SearchActivationHandle,
} from '@/components/search/searchActivation.shared';
import { useDrawerShortcutSearchController } from '@/components/home/useDrawerShortcutSearchController';
import { HOME_ROOT_SHORTCUT_GRID_ANCHOR } from '@/features/shortcuts/selection/shortcutSelectionLayout';
import type { Shortcut } from '@/types';
import type { WallpaperMode } from '@/wallpaper/types';

const INITIAL_VISUAL_BOOT_SETTLE_MS = 700;
const FOLDER_IMMERSIVE_PROGRESS_VAR = 'var(--leaftab-folder-immersive-progress, 0)';
const FOLDER_IMMERSIVE_SCALE_VAR = 'var(--leaftab-folder-immersive-scale, 1)';
const FOLDER_IMMERSIVE_BLUR_OVERSCAN_PX = 72;
const FOLDER_IMMERSIVE_BLUR_SCALE = 1.06;
const FLOATING_BOTTOM_SEARCH_Z_INDEX = 15030;
const FLOATING_BOTTOM_SEARCH_ARROW_Z_INDEX = 15035;
const FLOATING_BOTTOM_SEARCH_CROP_Z_INDEX = 15025;
const FLOATING_BOTTOM_SEARCH_HIDE_DURATION_MS = 300;
const FLOATING_BOTTOM_SEARCH_HIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const FLOATING_BOTTOM_SEARCH_HEIGHT_PX = 44;
const FLOATING_BOTTOM_SEARCH_HORIZONTAL_PADDING_PX = 16;

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function useTrackedInputSnapshot(inputRef: RefObject<HTMLInputElement | null>) {
  const [snapshot, setSnapshot] = useState({
    isFocused: false,
    hasValue: false,
  });
  const deferredSyncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const syncFromInput = () => {
      if (deferredSyncTimerRef.current !== null) {
        window.clearTimeout(deferredSyncTimerRef.current);
        deferredSyncTimerRef.current = null;
      }

      const input = inputRef.current;
      const nextSnapshot = {
        isFocused: Boolean(input && document.activeElement === input),
        hasValue: Boolean(input?.value.trim()),
      };

      setSnapshot((current) => (
        current.isFocused === nextSnapshot.isFocused
        && current.hasValue === nextSnapshot.hasValue
      ) ? current : nextSnapshot);
    };

    const scheduleSyncFromInput = () => {
      if (deferredSyncTimerRef.current !== null) {
        window.clearTimeout(deferredSyncTimerRef.current);
      }
      deferredSyncTimerRef.current = window.setTimeout(syncFromInput, 0);
    };

    syncFromInput();
    document.addEventListener('focusin', syncFromInput, true);
    document.addEventListener('focusout', scheduleSyncFromInput, true);
    document.addEventListener('input', scheduleSyncFromInput, true);
    document.addEventListener('change', scheduleSyncFromInput, true);

    return () => {
      if (deferredSyncTimerRef.current !== null) {
        window.clearTimeout(deferredSyncTimerRef.current);
        deferredSyncTimerRef.current = null;
      }
      document.removeEventListener('focusin', syncFromInput, true);
      document.removeEventListener('focusout', scheduleSyncFromInput, true);
      document.removeEventListener('input', scheduleSyncFromInput, true);
      document.removeEventListener('change', scheduleSyncFromInput, true);
    };
  }, [inputRef]);

  return snapshot;
}

function useOpenDialogOverlayActivity() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const overlaySelector = [
      '[data-slot="dialog-overlay"][data-state="open"]',
      '[data-slot="alert-dialog-overlay"][data-state="open"]',
    ].join(',');

    const syncActivity = () => {
      setActive(Boolean(document.querySelector(overlaySelector)));
    };

    syncActivity();

    const observer = new MutationObserver(() => {
      syncActivity();
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return active;
}

const resolveEventTargetElement = (target: EventTarget | null): Element | null => {
  if (target instanceof Element) return target;
  if (target instanceof Node) return target.parentElement;
  return null;
};

const isEditableTarget = (target: EventTarget | null): boolean => {
  const element = resolveEventTargetElement(target);
  if (!element) return false;
  if (element instanceof HTMLElement && element.isContentEditable) return true;

  return Boolean(
    element.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
    ),
  );
};

export type HomeInteractiveSurfaceProps = {
  initialRevealReady: boolean;
  modeLayersVisible: boolean;
  modeFlags: DisplayModeLayoutFlags;
  showOverlayWallpaperLayer: boolean;
  wallpaperAnimatedLayerStyle: CSSProperties;
  effectiveWallpaperMode: WallpaperMode;
  freshWeatherVideo: string;
  colorWallpaperGradient: string;
  effectiveOverlayWallpaperSrc: string;
  overlayBackgroundAlt: string;
  onOverlayImageReady: () => void;
  effectiveWallpaperMaskOpacity: number;
  topNavModeProps: TopNavBarProps;
  homeMainContentBaseProps: HomeMainContentBaseProps;
  onDrawerFolderChildShortcutContextMenu?: (
    event: ReactMouseEvent<HTMLDivElement>,
    folderId: string,
    shortcut: Shortcut,
  ) => void;
  shortcutGridBaseProps: Omit<
    HomeMainContentShortcutGridProps,
    'heatZoneInspectorEnabled' | 'hiddenShortcutId' | 'selectionMode' | 'selectedShortcutIndexes' | 'onToggleShortcutSelection'
  >;
  shortcutGridSelectionMode: HomeMainContentShortcutGridProps['selectionMode'];
  shortcutGridHeatZoneInspectorEnabled: HomeMainContentShortcutGridProps['heatZoneInspectorEnabled'];
  shortcutGridHiddenShortcutId: HomeMainContentShortcutGridProps['hiddenShortcutId'];
  shortcutGridOpenFolderPreviewId: HomeMainContentShortcutGridProps['openFolderPreviewId'];
  shortcutGridSelectedShortcutIndexes: HomeMainContentShortcutGridProps['selectedShortcutIndexes'];
  onToggleShortcutSelection: HomeMainContentShortcutGridProps['onToggleShortcutSelection'];
  wallpaperClockBaseProps: Omit<
    HomeMainContentWallpaperClockProps,
    'timeAnimationEnabled' | 'pauseDynamicWallpaper'
  >;
  searchExperienceBaseProps: Omit<
    SearchExperienceProps,
    'inputRef' | 'onInteractionStateChange'
  >;
  baseTimeAnimationEnabled: boolean;
  freezeDynamicWallpaperBase: boolean;
};

export const HomeInteractiveSurface = memo(function HomeInteractiveSurface({
  initialRevealReady,
  modeLayersVisible,
  modeFlags,
  showOverlayWallpaperLayer,
  wallpaperAnimatedLayerStyle,
  effectiveWallpaperMode,
  freshWeatherVideo,
  colorWallpaperGradient,
  effectiveOverlayWallpaperSrc,
  overlayBackgroundAlt,
  onOverlayImageReady,
  effectiveWallpaperMaskOpacity,
  topNavModeProps,
  homeMainContentBaseProps,
  onDrawerFolderChildShortcutContextMenu,
  shortcutGridBaseProps,
  shortcutGridHeatZoneInspectorEnabled,
  shortcutGridHiddenShortcutId,
  shortcutGridOpenFolderPreviewId,
  shortcutGridSelectionMode,
  shortcutGridSelectedShortcutIndexes,
  onToggleShortcutSelection,
  wallpaperClockBaseProps,
  searchExperienceBaseProps,
  baseTimeAnimationEnabled,
  freezeDynamicWallpaperBase,
}: HomeInteractiveSurfaceProps) {
  const { t } = useTranslation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const drawerShortcutSearchInputRef = useRef<HTMLInputElement>(null);
  const previousDrawerExpandedRef = useRef(false);
  const [searchInteractionState, setSearchInteractionState] = useState<SearchInteractionState>({
    historyOpen: false,
    dropdownOpen: false,
    typingBurst: false,
  });
  const [visualBootSettled, setVisualBootSettled] = useState(initialRevealReady);
  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const [requestDrawerExpand, setRequestDrawerExpand] = useState<(() => void) | null>(null);
  const [globalSearchActivationHandle, setGlobalSearchActivationHandle] = useState<SearchActivationHandle | null>(null);
  const [wallpaperAtmosphereReady, setWallpaperAtmosphereReady] = useState(false);

  const handleSearchInteractionStateChange = useCallback((nextState: SearchInteractionState) => {
    setSearchInteractionState((prevState) => (
      prevState.historyOpen === nextState.historyOpen
      && prevState.dropdownOpen === nextState.dropdownOpen
      && prevState.typingBurst === nextState.typingBurst
    ) ? prevState : nextState);
  }, []);

  useEffect(() => {
    if (initialRevealReady && visualBootSettled) return;
    if (!initialRevealReady) {
      setVisualBootSettled(false);
      return;
    }

    const settleTimer = window.setTimeout(() => {
      setVisualBootSettled(true);
    }, INITIAL_VISUAL_BOOT_SETTLE_MS);

    return () => {
      window.clearTimeout(settleTimer);
    };
  }, [initialRevealReady, visualBootSettled]);

  useEffect(() => {
    if (!initialRevealReady || !showOverlayWallpaperLayer) {
      setWallpaperAtmosphereReady(false);
      return;
    }

    const timerId = window.setTimeout(() => {
      setWallpaperAtmosphereReady(true);
    }, LIMESTART_ATMOSPHERE_OVERLAY_DELAY_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [initialRevealReady, showOverlayWallpaperLayer]);

  useEffect(() => {
    const handleSwitchScenarioShortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.isComposing) return;
      if (!(event.metaKey || event.ctrlKey) || !event.altKey || event.shiftKey) return;
      const pressedScenarioHotkey = event.code === 'KeyS' || event.key.toLowerCase() === 's';
      if (!pressedScenarioHotkey) return;
      if (wallpaperClockBaseProps.scenarioModes.length <= 1) return;

      const activeElement = document.activeElement;
      const activeElementIsSearchInput = activeElement === searchInputRef.current;
      const searchInputBusy = searchInteractionState.historyOpen
        || searchInteractionState.dropdownOpen
        || searchInteractionState.typingBurst;

      if (!activeElementIsSearchInput && (isEditableTarget(event.target) || isEditableTarget(activeElement))) return;
      if (activeElementIsSearchInput && searchInputBusy) return;

      const currentIndex = wallpaperClockBaseProps.scenarioModes.findIndex(
        (mode) => mode.id === wallpaperClockBaseProps.selectedScenarioId,
      );
      const nextMode = currentIndex < 0
        ? wallpaperClockBaseProps.scenarioModes[0]
        : wallpaperClockBaseProps.scenarioModes[(currentIndex + 1) % wallpaperClockBaseProps.scenarioModes.length];
      if (!nextMode) return;

      event.preventDefault();
      wallpaperClockBaseProps.onScenarioModeSelect(nextMode.id);
      toast(t('scenario.toast.switched', { name: nextMode.name }));
    };

    window.addEventListener('keydown', handleSwitchScenarioShortcut, true);
    return () => {
      window.removeEventListener('keydown', handleSwitchScenarioShortcut, true);
    };
  }, [
    searchInteractionState,
    t,
    wallpaperClockBaseProps,
  ]);

  useEffect(() => {
    if (!drawerExpanded || !wallpaperClockBaseProps.scenarioModeOpen) return;
    wallpaperClockBaseProps.onScenarioModeOpenChange(false);
  }, [drawerExpanded, wallpaperClockBaseProps]);

  useEffect(() => {
    if (!shortcutGridSelectionMode) return;
    searchInputRef.current?.blur();
    setSearchInteractionState({
      historyOpen: false,
      dropdownOpen: false,
      typingBurst: false,
    });
  }, [shortcutGridSelectionMode]);

  const searchPerformanceModeActive = searchInteractionState.historyOpen
    || searchInteractionState.typingBurst;
  const effectiveTopTimeAnimationEnabled = baseTimeAnimationEnabled
    && visualBootSettled
    && !searchPerformanceModeActive;
  const shouldFreezeDynamicWallpaper = freezeDynamicWallpaperBase
    || !visualBootSettled
    || searchPerformanceModeActive;
  const searchInteractionLocked = searchInteractionState.historyOpen
    || searchInteractionState.dropdownOpen
    || Boolean(shortcutGridSelectionMode);
  const wallpaperBlurSourceUrl = effectiveWallpaperMode === 'weather'
    ? freshWeatherVideo
    : effectiveWallpaperMode === 'color'
      ? ''
      : effectiveOverlayWallpaperSrc;
  const imageWallpaperBlurEnabled = showOverlayWallpaperLayer
    && effectiveWallpaperMode !== 'color'
    && Boolean(wallpaperBlurSourceUrl);
  const {
    blurredWallpaperSrc,
    blurredWallpaperAverageLuminance,
    blurredWallpaperReady,
  } = useBlurredWallpaperAsset({
    sourceUrl: wallpaperBlurSourceUrl,
    enabled: imageWallpaperBlurEnabled,
  });

  const wallpaperClockProps = useMemo(
    () => ({
      ...wallpaperClockBaseProps,
      timeAnimationEnabled: effectiveTopTimeAnimationEnabled,
      pauseDynamicWallpaper: shouldFreezeDynamicWallpaper,
      showScenarioMode: drawerExpanded ? false : wallpaperClockBaseProps.showScenarioMode,
      scenarioModeOpen: drawerExpanded ? false : wallpaperClockBaseProps.scenarioModeOpen,
      onSettingsClick: drawerExpanded ? undefined : wallpaperClockBaseProps.onSettingsClick,
      onSyncClick: drawerExpanded ? undefined : wallpaperClockBaseProps.onSyncClick,
    }),
    [drawerExpanded, effectiveTopTimeAnimationEnabled, shouldFreezeDynamicWallpaper, wallpaperClockBaseProps],
  );

  const effectiveTopNavModeProps = useMemo(
    () => (drawerExpanded
      ? {
          ...topNavModeProps,
          leftSlot: null,
          keepControlsVisible: false,
          onSettingsClick: undefined,
          onSyncClick: undefined,
        }
      : topNavModeProps),
    [drawerExpanded, topNavModeProps],
  );

  const searchExperienceProps = useMemo(
    () => ({
      ...searchExperienceBaseProps,
      inputRef: searchInputRef,
      interactionDisabled: Boolean(shortcutGridSelectionMode || drawerExpanded),
      onInteractionStateChange: handleSearchInteractionStateChange,
      onActivationHandleChange: setGlobalSearchActivationHandle,
    }),
    [
      drawerExpanded,
      handleSearchInteractionStateChange,
      searchExperienceBaseProps,
      shortcutGridSelectionMode,
    ],
  );
  const floatingBottomSearchExperienceProps = useMemo(
    () => ({
      ...searchExperienceProps,
      searchHeight: FLOATING_BOTTOM_SEARCH_HEIGHT_PX,
      searchHorizontalPadding: FLOATING_BOTTOM_SEARCH_HORIZONTAL_PADDING_PX,
    }),
    [searchExperienceProps],
  );
  const shortcutGridProps = useMemo(
    () => ({
      ...shortcutGridBaseProps,
      heatZoneInspectorEnabled: shortcutGridHeatZoneInspectorEnabled,
      hiddenShortcutId: shortcutGridHiddenShortcutId,
      openFolderPreviewId: shortcutGridOpenFolderPreviewId,
      surfaceAnchorId: HOME_ROOT_SHORTCUT_GRID_ANCHOR,
      selectionMode: shortcutGridSelectionMode,
      selectedShortcutIndexes: shortcutGridSelectedShortcutIndexes,
      onToggleShortcutSelection,
    }),
    [
      onToggleShortcutSelection,
      shortcutGridBaseProps,
      shortcutGridHeatZoneInspectorEnabled,
      shortcutGridHiddenShortcutId,
      shortcutGridOpenFolderPreviewId,
      shortcutGridSelectedShortcutIndexes,
      shortcutGridSelectionMode,
    ],
  );
  const drawerShortcutSearchController = useDrawerShortcutSearchController({
    enabled: drawerExpanded,
    interactionDisabled: Boolean(shortcutGridSelectionMode),
    shortcutGridProps,
    onFolderChildShortcutContextMenu: onDrawerFolderChildShortcutContextMenu,
  });

  useEffect(() => {
    drawerShortcutSearchInputRef.current = drawerShortcutSearchController.inputRef.current;
  }, [drawerShortcutSearchController.inputRef]);

  const drawerSearchActivationHandle = useMemo<SearchActivationHandle | null>(() => {
    if (!drawerExpanded || shortcutGridSelectionMode) return null;
    return {
      id: 'drawer-search',
      inputRef: drawerShortcutSearchController.inputRef,
      anyKeyCaptureEnabled: searchExperienceBaseProps.searchAnyKeyCaptureEnabled,
      focusInput: (options) => {
        const input = drawerShortcutSearchController.inputRef.current;
        if (!input) return;
        focusSearchInputElement(input, options);
      },
      appendText: (text) => {
        if (text.length === 0) return;
        const input = drawerShortcutSearchController.inputRef.current;
        if (input) {
          focusSearchInputElement(input);
        }
        drawerShortcutSearchController.setSearchValue((prev) => `${prev}${text}`);
      },
    };
  }, [
    drawerExpanded,
    drawerShortcutSearchController.inputRef,
    drawerShortcutSearchController.setSearchValue,
    searchExperienceBaseProps.searchAnyKeyCaptureEnabled,
    shortcutGridSelectionMode,
  ]);

  const drawerShortcutSearchProps = useMemo(() => ({
    normalizedShortcutSearchQuery: drawerShortcutSearchController.normalizedShortcutSearchQuery,
    activeIndexLetter: drawerShortcutSearchController.activeIndexLetter,
    availableLetters: drawerShortcutSearchController.availableLetters,
    showAlphabetRail: drawerShortcutSearchController.showAlphabetRail,
    showShortcutSearchEmptyState: drawerShortcutSearchController.showShortcutSearchEmptyState,
    filteredShortcutGridProps: drawerShortcutSearchController.filteredShortcutGridProps,
    onLetterSelect: drawerShortcutSearchController.onLetterSelect,
    onBlankAreaExitLetterFilter: drawerShortcutSearchController.handleBlankAreaExitLetterFilter,
  }), [
    drawerShortcutSearchController.activeIndexLetter,
    drawerShortcutSearchController.availableLetters,
    drawerShortcutSearchController.filteredShortcutGridProps,
    drawerShortcutSearchController.handleBlankAreaExitLetterFilter,
    drawerShortcutSearchController.normalizedShortcutSearchQuery,
    drawerShortcutSearchController.onLetterSelect,
    drawerShortcutSearchController.showAlphabetRail,
    drawerShortcutSearchController.showShortcutSearchEmptyState,
    shortcutGridOpenFolderPreviewId,
  ]);
  const globalSearchSnapshot = useTrackedInputSnapshot(searchInputRef);
  const drawerSearchSnapshot = useTrackedInputSnapshot(drawerShortcutSearchController.inputRef);
  const dialogOverlayActive = useOpenDialogOverlayActivity();
  const folderImmersiveOpen = Boolean(shortcutGridOpenFolderPreviewId);
  const floatingSearchHiddenByDialog = dialogOverlayActive || wallpaperClockBaseProps.scenarioModeOpen;
  const floatingSearchHiddenByAlphabetIndex = drawerExpanded && drawerShortcutSearchController.activeIndexLetter !== null;
  const floatingSearchHidden = floatingSearchHiddenByDialog || floatingSearchHiddenByAlphabetIndex || folderImmersiveOpen;
  const activeFloatingSearchSnapshot = drawerExpanded
    ? drawerSearchSnapshot
    : globalSearchSnapshot;
  const activeSearchActivationHandle = drawerExpanded
    ? drawerSearchActivationHandle
    : globalSearchActivationHandle;
  const floatingSearchPhase = useMemo(() => (
    drawerExpanded
      ? 'active'
      : resolveFloatingSearchMotionPhase({
          isFocused: activeFloatingSearchSnapshot.isFocused,
          hasValue: activeFloatingSearchSnapshot.hasValue,
          interactionState: searchInteractionState,
        })
  ), [
    activeFloatingSearchSnapshot.hasValue,
    activeFloatingSearchSnapshot.isFocused,
    drawerExpanded,
    searchInteractionState,
  ]);

  useGlobalSearchActivation(activeSearchActivationHandle);
  useSearchBootstrapFocus(activeSearchActivationHandle, !floatingSearchHidden);

  useEffect(() => {
    const wasDrawerExpanded = previousDrawerExpandedRef.current;
    previousDrawerExpandedRef.current = drawerExpanded;

    if (!wasDrawerExpanded && drawerExpanded) {
      searchInputRef.current?.blur();
    }
    if (wasDrawerExpanded && !drawerExpanded) {
      drawerShortcutSearchInputRef.current?.blur();
    }
  }, [drawerExpanded]);

  useEffect(() => {
    if (!floatingSearchHidden) return;
    searchInputRef.current?.blur();
    drawerShortcutSearchInputRef.current?.blur();
  }, [floatingSearchHidden]);

  const fixedTopNavRevealStyle = useMemo(() => resolveInitialRevealStyle(initialRevealReady, {
    offsetPx: 0,
    timing: LIMESTART_FRONT_CONTENT_REVEAL_TIMING,
    disablePointerEventsUntilReady: true,
  }), [initialRevealReady]);
  const wallpaperAtmosphereRevealStyle = useMemo<CSSProperties>(() => ({
    opacity: wallpaperAtmosphereReady ? 1 : 0,
    transition: `opacity ${LIMESTART_ATMOSPHERE_OVERLAY_DURATION_MS}ms linear`,
    willChange: wallpaperAtmosphereReady ? undefined : 'opacity',
    pointerEvents: 'none',
  }), [wallpaperAtmosphereReady]);
  const normalizedBackdropLuminance = clamp01(blurredWallpaperAverageLuminance ?? 0.52);

  const immersiveBackdropLayerStyle = useMemo<CSSProperties>(() => ({
    opacity: FOLDER_IMMERSIVE_PROGRESS_VAR,
    willChange: 'opacity',
    pointerEvents: 'none',
  }), []);

  const immersiveBackdropTintStyle = useMemo<CSSProperties>(() => ({
    backgroundColor: `rgba(18,22,30,${(0.08 + (normalizedBackdropLuminance * 0.12)).toFixed(3)})`,
  }), [normalizedBackdropLuminance]);
  const immersiveWallpaperBlurLayerStyle = useMemo<CSSProperties>(() => ({
    opacity: FOLDER_IMMERSIVE_PROGRESS_VAR,
    willChange: 'opacity',
    pointerEvents: 'none',
  }), []);
  const immersiveWallpaperBlurFallbackStyle = useMemo<CSSProperties>(() => ({
    opacity: FOLDER_IMMERSIVE_PROGRESS_VAR,
    willChange: 'opacity',
    pointerEvents: 'none',
    top: `-${FOLDER_IMMERSIVE_BLUR_OVERSCAN_PX}px`,
    right: `-${FOLDER_IMMERSIVE_BLUR_OVERSCAN_PX}px`,
    bottom: `-${FOLDER_IMMERSIVE_BLUR_OVERSCAN_PX}px`,
    left: `-${FOLDER_IMMERSIVE_BLUR_OVERSCAN_PX}px`,
    backgroundImage: effectiveWallpaperMode === 'color' ? colorWallpaperGradient : undefined,
    backgroundColor: effectiveWallpaperMode === 'color' ? 'rgba(18,22,30,0.12)' : 'rgba(26,32,44,0.22)',
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    transform: `translateZ(0) scale(${FOLDER_IMMERSIVE_BLUR_SCALE})`,
    transformOrigin: 'center center',
  }), [colorWallpaperGradient, effectiveWallpaperMode]);
  const immersiveBlurOverlayStyle = useMemo<CSSProperties>(() => {
    if (normalizedBackdropLuminance > 0.56) {
      const darkAlpha = 0.05 + ((normalizedBackdropLuminance - 0.56) / 0.44) * 0.11;
      return {
        backgroundColor: `rgba(18,22,30,${darkAlpha.toFixed(3)})`,
      };
    }

    const lightAlpha = 0.08 - (normalizedBackdropLuminance / 0.56) * 0.03;
    return {
      backgroundColor: `rgba(244,246,248,${lightAlpha.toFixed(3)})`,
    };
  }, [normalizedBackdropLuminance]);

  const immersiveWallpaperLayerStyle = useMemo<CSSProperties>(() => ({
    transform: `scale(${FOLDER_IMMERSIVE_SCALE_VAR})`,
    transformOrigin: 'center center',
    willChange: 'transform',
    pointerEvents: 'none',
  }), []);

  const overlayWallpaperLayer = useMemo(() => {
    if (!showOverlayWallpaperLayer) return null;

    return (
      <div
        className="fixed z-0 pointer-events-none"
        style={{
          top: '-2px',
          right: '-2px',
          bottom: '-2px',
          left: '-2px',
          backgroundColor: 'var(--initial-reveal-surface)',
          backfaceVisibility: 'hidden',
        }}
      >
        <div className="absolute inset-0" style={immersiveWallpaperLayerStyle}>
          <div className="absolute inset-0" style={wallpaperAnimatedLayerStyle}>
            {effectiveWallpaperMode === 'weather' && freshWeatherVideo ? (
              <WeatherLoopVideo src={freshWeatherVideo} paused={shouldFreezeDynamicWallpaper} />
            ) : effectiveWallpaperMode === 'color' ? (
              <div className="absolute w-full h-full" style={{ backgroundImage: colorWallpaperGradient }} />
            ) : effectiveOverlayWallpaperSrc ? (
              <img
                src={effectiveOverlayWallpaperSrc}
                alt={overlayBackgroundAlt}
                className="absolute w-full h-full object-cover"
                onLoad={onOverlayImageReady}
                onError={onOverlayImageReady}
              />
            ) : null}
          </div>
          <div className="absolute inset-0" style={wallpaperAtmosphereRevealStyle}>
            <WallpaperMaskOverlay opacity={effectiveWallpaperMaskOpacity} />
          </div>
          {blurredWallpaperReady && blurredWallpaperSrc ? (
            <div className="absolute inset-0" style={immersiveWallpaperBlurLayerStyle}>
              <img
                src={blurredWallpaperSrc}
                alt=""
                aria-hidden="true"
                className="absolute h-full w-full object-cover"
                draggable={false}
                style={{
                  top: -FOLDER_IMMERSIVE_BLUR_OVERSCAN_PX,
                  left: -FOLDER_IMMERSIVE_BLUR_OVERSCAN_PX,
                  width: `calc(100% + ${FOLDER_IMMERSIVE_BLUR_OVERSCAN_PX * 2}px)`,
                  height: `calc(100% + ${FOLDER_IMMERSIVE_BLUR_OVERSCAN_PX * 2}px)`,
                  transform: `translateZ(0) scale(${FOLDER_IMMERSIVE_BLUR_SCALE})`,
                  transformOrigin: 'center center',
                  backfaceVisibility: 'hidden',
                  willChange: 'transform',
                }}
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={immersiveBlurOverlayStyle}
              />
              <WallpaperMaskOverlay opacity={Math.min(100, effectiveWallpaperMaskOpacity + 8)} />
            </div>
          ) : effectiveWallpaperMode === 'color' || effectiveWallpaperMode === 'weather' ? (
            <div className="absolute inset-0" style={immersiveWallpaperBlurFallbackStyle} />
          ) : null}
        </div>
      </div>
    );
  }, [
    colorWallpaperGradient,
    effectiveOverlayWallpaperSrc,
    effectiveWallpaperMaskOpacity,
    effectiveWallpaperMode,
    freshWeatherVideo,
    blurredWallpaperReady,
    blurredWallpaperSrc,
    wallpaperAtmosphereRevealStyle,
    immersiveWallpaperLayerStyle,
    immersiveWallpaperBlurFallbackStyle,
    immersiveWallpaperBlurLayerStyle,
    onOverlayImageReady,
    overlayBackgroundAlt,
    shouldFreezeDynamicWallpaper,
    showOverlayWallpaperLayer,
    wallpaperAnimatedLayerStyle,
  ]);

  const fixedTopNavLayer = useMemo(() => {
    if (!(modeLayersVisible && modeFlags.showInlineTopNav)) return null;
    const topNavLayerHeight = effectiveTopNavModeProps.introGuide ? 220 : 40;

    return (
      <div
        className="fixed left-6 right-6 top-6 z-[14020] overflow-visible pointer-events-auto"
        style={{
          height: topNavLayerHeight,
          ...fixedTopNavRevealStyle,
        }}
      >
        <div className="relative h-full overflow-visible">
          <TopNavBar {...effectiveTopNavModeProps} />
        </div>
      </div>
    );
  }, [
    effectiveTopNavModeProps,
    modeFlags.showInlineTopNav,
    modeLayersVisible,
    fixedTopNavRevealStyle,
  ]);

  const immersiveUiShellStyle = useMemo<CSSProperties>(() => ({
    opacity: 'var(--leaftab-folder-immersive-inverse-opacity, 1)',
    willChange: 'opacity',
  }), []);
  const showFloatingBottomSearch = true;
  const floatingBottomSearchOffsetPx = resolveFloatingSearchOffsetPx(FLOATING_BOTTOM_SEARCH_HEIGHT_PX);
  const floatingBottomSearchHiddenTranslateYPx = FLOATING_BOTTOM_SEARCH_HEIGHT_PX + floatingBottomSearchOffsetPx + 48;
  const blankModeExpandArrowBottomPx = floatingBottomSearchOffsetPx + FLOATING_BOTTOM_SEARCH_HEIGHT_PX + 6;
  const showBlankModeExpandArrow = modeFlags.searchUsesBlankStyle
    && !drawerExpanded
    && !floatingSearchHidden
    && !searchInteractionState.historyOpen
    && !searchInteractionState.dropdownOpen;
  const floatingBottomSearchCropLayer = useMemo(() => {
    if (!showFloatingBottomSearch) return null;

    const cropHeightPx = resolveBottomCropFadeHeight(FLOATING_BOTTOM_SEARCH_HEIGHT_PX);

    return (
      <div
        aria-hidden="true"
        className="fixed inset-x-0"
        style={{
          zIndex: FLOATING_BOTTOM_SEARCH_CROP_Z_INDEX,
          bottom: '0px',
          ...fixedTopNavRevealStyle,
          opacity: floatingSearchHiddenByDialog ? 0 : 1,
          transition: `opacity ${FLOATING_BOTTOM_SEARCH_HIDE_DURATION_MS}ms ${FLOATING_BOTTOM_SEARCH_HIDE_EASING}`,
          pointerEvents: 'none',
        }}
      >
        <BottomCropFadeOverlay heightPx={cropHeightPx} />
      </div>
    );
  }, [
    fixedTopNavRevealStyle,
    floatingSearchHiddenByDialog,
    showFloatingBottomSearch,
  ]);

  const floatingBottomSearchLayer = useMemo(() => {
    if (!showFloatingBottomSearch) return null;

    return (
      <div
        className="fixed inset-x-0 pointer-events-none px-5 sm:px-6"
        style={{
          zIndex: FLOATING_BOTTOM_SEARCH_Z_INDEX,
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${floatingBottomSearchOffsetPx}px)`,
          ...fixedTopNavRevealStyle,
        }}
      >
        <div
          className="mx-auto max-w-full"
          style={{
            width: homeMainContentBaseProps.layout.contentWidth,
            opacity: floatingSearchHidden ? 0 : 1,
            transform: floatingSearchHidden
              ? `translate3d(0, ${floatingBottomSearchHiddenTranslateYPx}px, 0) scale3d(0.2, 1, 1)`
              : 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
            transformOrigin: 'center bottom',
            transition: [
              `opacity ${FLOATING_BOTTOM_SEARCH_HIDE_DURATION_MS}ms ${FLOATING_BOTTOM_SEARCH_HIDE_EASING}`,
              `transform ${FLOATING_BOTTOM_SEARCH_HIDE_DURATION_MS}ms ${FLOATING_BOTTOM_SEARCH_HIDE_EASING}`,
            ].join(', '),
            willChange: 'opacity, transform',
            pointerEvents: floatingSearchHidden ? 'none' : 'auto',
          }}
        >
          <FloatingSearchDock
            phase={floatingSearchPhase}
            reduceMotionVisuals={homeMainContentBaseProps.reduceMotionVisuals}
            maxWidthPx={homeMainContentBaseProps.layout.contentWidth}
          >
            {drawerExpanded ? (
              <DrawerShortcutSearchBar
                inputRef={drawerShortcutSearchController.inputRef}
                value={drawerShortcutSearchController.searchValue}
                onValueChange={drawerShortcutSearchController.setSearchValue}
                height={FLOATING_BOTTOM_SEARCH_HEIGHT_PX}
                horizontalPadding={FLOATING_BOTTOM_SEARCH_HORIZONTAL_PADDING_PX}
                interactionDisabled={Boolean(shortcutGridSelectionMode || !drawerExpanded)}
                withDock={false}
              />
            ) : (
              <HomeSearchBar
                searchExperienceProps={floatingBottomSearchExperienceProps}
                interactionState={searchInteractionState}
                blankMode={modeFlags.searchUsesBlankStyle}
                forceWhiteTheme={modeFlags.forceWhiteSearchTheme}
                searchSurfaceTone="default"
                suggestionsPlacement="top"
                withDock={false}
              />
            )}
          </FloatingSearchDock>
        </div>
      </div>
    );
  }, [
    drawerShortcutSearchController.inputRef,
    drawerShortcutSearchController.searchValue,
    drawerShortcutSearchController.setSearchValue,
    fixedTopNavRevealStyle,
    folderImmersiveOpen,
    floatingSearchPhase,
    floatingBottomSearchHiddenTranslateYPx,
    floatingSearchHidden,
    floatingBottomSearchOffsetPx,
    floatingBottomSearchExperienceProps,
    homeMainContentBaseProps.layout.contentWidth,
    homeMainContentBaseProps.reduceMotionVisuals,
    modeFlags.forceWhiteSearchTheme,
    modeFlags.searchUsesBlankStyle,
    searchInteractionState,
    showFloatingBottomSearch,
    shortcutGridSelectionMode,
    drawerExpanded,
  ]);

  const floatingBottomExpandArrowLayer = useMemo(() => {
    if (!showBlankModeExpandArrow) return null;

    return (
      <div
        className="fixed inset-x-0 pointer-events-none px-5 sm:px-6"
        style={{
          zIndex: FLOATING_BOTTOM_SEARCH_ARROW_Z_INDEX,
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${blankModeExpandArrowBottomPx}px)`,
          ...fixedTopNavRevealStyle,
        }}
      >
        <div
          className="mx-auto flex max-w-full justify-center"
          style={{
            width: homeMainContentBaseProps.layout.contentWidth,
            opacity: floatingSearchHidden ? 0 : 1,
            transform: floatingSearchHidden
              ? `translate3d(0, ${floatingBottomSearchHiddenTranslateYPx}px, 0)`
              : 'translate3d(0, 0, 0)',
            transition: [
              `opacity ${FLOATING_BOTTOM_SEARCH_HIDE_DURATION_MS}ms ${FLOATING_BOTTOM_SEARCH_HIDE_EASING}`,
              `transform ${FLOATING_BOTTOM_SEARCH_HIDE_DURATION_MS}ms ${FLOATING_BOTTOM_SEARCH_HIDE_EASING}`,
            ].join(', '),
            willChange: 'opacity, transform',
          }}
        >
          <button
            type="button"
            aria-label={t('home.expandDrawerHint.ariaLabel', { defaultValue: '展开快捷方式抽屉' })}
            className="pointer-events-auto inline-flex items-center justify-center px-2 py-1 text-white/50 transition-[opacity,color] duration-300 hover:text-white/72 focus-visible:outline-none focus-visible:text-white/78 disabled:cursor-default disabled:opacity-35"
            onClick={() => requestDrawerExpand?.()}
            disabled={!requestDrawerExpand}
          >
            <RiArrowUpSLine className="size-7 motion-safe:animate-[leaftab-drawer-hint-float_2.8s_ease-in-out_infinite]" />
          </button>
        </div>
      </div>
    );
  }, [
    blankModeExpandArrowBottomPx,
    fixedTopNavRevealStyle,
    floatingBottomSearchHiddenTranslateYPx,
    floatingSearchHidden,
    homeMainContentBaseProps.layout.contentWidth,
    requestDrawerExpand,
    showBlankModeExpandArrow,
    t,
  ]);

  return (
    <RenderProfileBoundary id="HomeInteractiveSurface">
      <WallpaperBackdropProvider
        value={{
          wallpaperMode: effectiveWallpaperMode,
          colorWallpaperGradient,
          blurredWallpaperSrc,
          blurredWallpaperAverageLuminance,
          effectiveWallpaperMaskOpacity,
        }}
      >
        <>
          {overlayWallpaperLayer}
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[15000]"
            style={immersiveBackdropLayerStyle}
          >
            <div className="absolute inset-0" style={immersiveBackdropTintStyle} />
          </div>
          <div style={immersiveUiShellStyle}>
            {fixedTopNavLayer}
          </div>
          <HomeMainContent
            {...homeMainContentBaseProps}
            initialRevealReady={initialRevealReady}
            modeFlags={modeFlags}
            wallpaperClockProps={wallpaperClockProps}
            searchInteractionLocked={searchInteractionLocked}
            drawerShortcutSearchProps={drawerShortcutSearchProps}
            onFolderChildShortcutContextMenu={onDrawerFolderChildShortcutContextMenu}
            onDrawerExpandedChange={setDrawerExpanded}
            onDrawerExpandActionChange={(action) => {
              setRequestDrawerExpand(() => action);
            }}
            shortcutGridProps={shortcutGridProps}
          />
          {floatingBottomSearchCropLayer}
          {floatingBottomExpandArrowLayer}
          {floatingBottomSearchLayer}
        </>
      </WallpaperBackdropProvider>
    </RenderProfileBoundary>
  );
});
