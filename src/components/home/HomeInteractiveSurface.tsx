import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { TopNavBar, type TopNavBarProps } from '@/components/TopNavBar';
import {
  HomeMainContent,
  type HomeMainContentBaseProps,
  type HomeMainContentSearchExperienceProps,
  type HomeMainContentShortcutGridProps,
  type HomeMainContentWallpaperClockProps,
} from '@/components/home/HomeMainContent';
import { WeatherLoopVideo } from '@/components/wallpaper/WeatherLoopVideo';
import { WallpaperMaskOverlay } from '@/components/wallpaper/WallpaperMaskOverlay';
import { toast } from '@/components/ui/sonner';
import { resolveInitialRevealStyle } from '@/config/animationTokens';
import { RenderProfileBoundary } from '@/dev/renderProfiler';
import type { DisplayModeLayoutFlags } from '@/displayMode/config';
import { type SearchInteractionState } from '@/components/search/SearchExperience';
import type { WallpaperMode } from '@/wallpaper/types';

const INITIAL_SEARCH_FOCUS_RETRY_MS = 60;
const INITIAL_SEARCH_FOCUS_MAX_ATTEMPTS = 20;
const INITIAL_VISUAL_BOOT_SETTLE_MS = 700;
const FOLDER_IMMERSIVE_PROGRESS_VAR = 'var(--leaftab-folder-immersive-progress, 0)';
const FOLDER_IMMERSIVE_SCALE_VAR = 'var(--leaftab-folder-immersive-scale, 1)';

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
  shortcutGridBaseProps: Omit<
    HomeMainContentShortcutGridProps,
    'heatZoneInspectorEnabled' | 'hiddenShortcutId' | 'selectionMode' | 'selectedShortcutIndexes' | 'onToggleShortcutSelection'
  >;
  shortcutGridHeatZoneInspectorEnabled: HomeMainContentShortcutGridProps['heatZoneInspectorEnabled'];
  shortcutGridHiddenShortcutId: HomeMainContentShortcutGridProps['hiddenShortcutId'];
  shortcutGridSelectionMode: HomeMainContentShortcutGridProps['selectionMode'];
  shortcutGridSelectedShortcutIndexes: HomeMainContentShortcutGridProps['selectedShortcutIndexes'];
  onToggleShortcutSelection: HomeMainContentShortcutGridProps['onToggleShortcutSelection'];
  wallpaperClockBaseProps: Omit<
    HomeMainContentWallpaperClockProps,
    'timeAnimationEnabled' | 'pauseDynamicWallpaper'
  >;
  searchExperienceBaseProps: Omit<
    HomeMainContentSearchExperienceProps,
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
  shortcutGridBaseProps,
  shortcutGridHeatZoneInspectorEnabled,
  shortcutGridHiddenShortcutId,
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
  const [searchInteractionState, setSearchInteractionState] = useState<SearchInteractionState>({
    historyOpen: false,
    dropdownOpen: false,
    typingBurst: false,
  });
  const [visualBootSettled, setVisualBootSettled] = useState(initialRevealReady);
  const [drawerExpanded, setDrawerExpanded] = useState(false);

  const handleSearchInteractionStateChange = useCallback((nextState: SearchInteractionState) => {
    setSearchInteractionState((prevState) => (
      prevState.historyOpen === nextState.historyOpen
      && prevState.dropdownOpen === nextState.dropdownOpen
      && prevState.typingBurst === nextState.typingBurst
    ) ? prevState : nextState);
  }, []);

  useEffect(() => {
    let attempts = 0;
    let retryTimer: number | null = null;
    let rafId: number | null = null;

    const scheduleRetry = () => {
      if (attempts >= INITIAL_SEARCH_FOCUS_MAX_ATTEMPTS) return;
      if (retryTimer !== null) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        tryFocusSearchInput();
      }, INITIAL_SEARCH_FOCUS_RETRY_MS);
    };

    const tryFocusSearchInput = () => {
      attempts += 1;
      const input = searchInputRef.current;
      if (!input) {
        scheduleRetry();
        return;
      }

      const activeElement = document.activeElement as HTMLElement | null;
      const activeTag = activeElement?.tagName?.toLowerCase() || '';
      const activeIsEditable = Boolean(
        activeElement
        && (
          activeElement.isContentEditable
          || activeTag === 'input'
          || activeTag === 'textarea'
          || activeTag === 'select'
        ),
      );
      if (activeElement && activeElement !== input && activeIsEditable) {
        return;
      }

      try {
        input.focus({ preventScroll: true });
      } catch {
        input.focus();
      }

      const cursor = input.value.length;
      try {
        input.setSelectionRange(cursor, cursor);
      } catch {}

      if (document.activeElement !== input) {
        scheduleRetry();
      }
    };

    rafId = window.requestAnimationFrame(() => {
      tryFocusSearchInput();
    });

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
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

  const searchPerformanceModeActive = searchInteractionState.historyOpen
    || searchInteractionState.typingBurst;
  const effectiveTopTimeAnimationEnabled = baseTimeAnimationEnabled
    && visualBootSettled
    && !searchPerformanceModeActive;
  const shouldFreezeDynamicWallpaper = freezeDynamicWallpaperBase
    || !visualBootSettled
    || searchPerformanceModeActive;
  const searchInteractionLocked = searchInteractionState.historyOpen || searchInteractionState.dropdownOpen;

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
      onInteractionStateChange: handleSearchInteractionStateChange,
    }),
    [handleSearchInteractionStateChange, searchExperienceBaseProps],
  );
  const shortcutGridProps = useMemo(
    () => ({
      ...shortcutGridBaseProps,
      heatZoneInspectorEnabled: shortcutGridHeatZoneInspectorEnabled,
      hiddenShortcutId: shortcutGridHiddenShortcutId,
      selectionMode: shortcutGridSelectionMode,
      selectedShortcutIndexes: shortcutGridSelectedShortcutIndexes,
      onToggleShortcutSelection,
    }),
    [
      onToggleShortcutSelection,
      shortcutGridBaseProps,
      shortcutGridHeatZoneInspectorEnabled,
      shortcutGridHiddenShortcutId,
      shortcutGridSelectedShortcutIndexes,
      shortcutGridSelectionMode,
    ],
  );

  const fixedTopNavRevealStyle = useMemo(() => resolveInitialRevealStyle(initialRevealReady, {
    disablePointerEventsUntilReady: true,
  }), [initialRevealReady]);
  const immersiveBackdropLayerStyle = useMemo<CSSProperties>(() => ({
    opacity: FOLDER_IMMERSIVE_PROGRESS_VAR,
    willChange: 'opacity',
    pointerEvents: 'none',
  }), []);

  const immersiveBackdropTintStyle = useMemo<CSSProperties>(() => ({
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.06) 28%, rgba(10,14,20,0.16) 100%)',
  }), []);

  const immersiveBackdropHighlightStyle = useMemo<CSSProperties>(() => ({
    background:
      'radial-gradient(circle at 50% 18%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 24%, rgba(255,255,255,0) 62%)',
  }), []);

  const immersiveBackdropNoiseStyle = useMemo<CSSProperties>(() => ({
    background:
      'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 34%, rgba(255,255,255,0.04) 68%, rgba(255,255,255,0.08) 100%)',
    mixBlendMode: 'screen',
    opacity: 0.55,
  }), []);

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
            <WallpaperMaskOverlay opacity={effectiveWallpaperMaskOpacity} />
          </div>
        </div>
      </div>
    );
  }, [
    colorWallpaperGradient,
    effectiveOverlayWallpaperSrc,
    effectiveWallpaperMaskOpacity,
    effectiveWallpaperMode,
    freshWeatherVideo,
    immersiveWallpaperLayerStyle,
    onOverlayImageReady,
    overlayBackgroundAlt,
    shouldFreezeDynamicWallpaper,
    showOverlayWallpaperLayer,
    wallpaperAnimatedLayerStyle,
  ]);

  const fixedTopNavLayer = useMemo(() => {
    if (!(modeLayersVisible && modeFlags.showInlineTopNav)) return null;

    return (
      <div
        className="fixed inset-6 z-[14020] pointer-events-none"
        style={{
          ...fixedTopNavRevealStyle,
        }}
      >
        <TopNavBar {...effectiveTopNavModeProps} />
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

  return (
    <RenderProfileBoundary id="HomeInteractiveSurface">
      <>
        {overlayWallpaperLayer}
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[15000]"
          style={immersiveBackdropLayerStyle}
        >
          <div className="absolute inset-0" style={immersiveBackdropTintStyle} />
          <div className="absolute inset-0" style={immersiveBackdropHighlightStyle} />
          <div className="absolute inset-0" style={immersiveBackdropNoiseStyle} />
        </div>
        <div style={immersiveUiShellStyle}>
          {fixedTopNavLayer}
        </div>
        <HomeMainContent
          {...homeMainContentBaseProps}
          initialRevealReady={initialRevealReady}
          modeFlags={modeFlags}
          wallpaperClockProps={wallpaperClockProps}
          searchExperienceProps={searchExperienceProps}
          searchInteractionLocked={searchInteractionLocked}
          onDrawerExpandedChange={setDrawerExpanded}
          shortcutGridProps={shortcutGridProps}
        />
      </>
    </RenderProfileBoundary>
  );
});
