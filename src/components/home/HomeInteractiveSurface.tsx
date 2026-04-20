import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { TopNavBar } from '@/components/TopNavBar';
import { HomeMainContent } from '@/components/home/HomeMainContent';
import { WeatherLoopVideo } from '@/components/wallpaper/WeatherLoopVideo';
import { WallpaperMaskOverlay } from '@/components/wallpaper/WallpaperMaskOverlay';
import { toast } from '@/components/ui/sonner';
import { INITIAL_REVEAL_TIMING, resolveInitialRevealOpacity, resolveInitialRevealTransform } from '@/config/animationTokens';
import type { DisplayModeLayoutFlags } from '@/displayMode/config';
import { SearchExperience, type SearchInteractionState } from '@/components/search/SearchExperience';
import { WallpaperClock } from '@/components/WallpaperClock';
import type { WallpaperMode } from '@/wallpaper/types';
import { clamp01 } from '@/components/shortcutFolderCompactAnimation';

const INITIAL_SEARCH_FOCUS_RETRY_MS = 60;
const INITIAL_SEARCH_FOCUS_MAX_ATTEMPTS = 20;
const INITIAL_VISUAL_BOOT_SETTLE_MS = 700;
const FOLDER_IMMERSIVE_BACKGROUND_BLUR_PX = 18;
const FOLDER_IMMERSIVE_BACKGROUND_SCALE = 1.05;

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

type HomeInteractiveSurfaceProps = {
  initialRevealReady: boolean;
  visible: boolean;
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
  topNavModeProps: ComponentProps<typeof TopNavBar>;
  homeMainContentBaseProps: Omit<
    ComponentProps<typeof HomeMainContent>,
    'initialRevealReady' | 'visible' | 'modeFlags' | 'wallpaperClockProps' | 'searchExperienceProps' | 'searchInteractionLocked' | 'onDrawerExpandedChange' | 'shortcutGridProps' | 'folderImmersiveProgress'
  >;
  shortcutGridProps: ComponentProps<typeof HomeMainContent>['shortcutGridProps'];
  wallpaperClockBaseProps: Omit<
    ComponentProps<typeof WallpaperClock>,
    'timeAnimationEnabled' | 'pauseDynamicWallpaper'
  >;
  searchExperienceBaseProps: Omit<
    ComponentProps<typeof SearchExperience>,
    'inputRef' | 'onInteractionStateChange'
  >;
  baseTimeAnimationEnabled: boolean;
  freezeDynamicWallpaperBase: boolean;
  folderImmersiveProgress: number;
};

export const HomeInteractiveSurface = memo(function HomeInteractiveSurface({
  initialRevealReady,
  visible,
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
  shortcutGridProps,
  wallpaperClockBaseProps,
  searchExperienceBaseProps,
  baseTimeAnimationEnabled,
  freezeDynamicWallpaperBase,
  folderImmersiveProgress,
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

  const initialRevealTransform = resolveInitialRevealTransform(initialRevealReady);
  const initialRevealOpacity = resolveInitialRevealOpacity(initialRevealReady);
  const immersiveProgress = clamp01(folderImmersiveProgress);

  const immersiveBackdropLayerStyle = useMemo<CSSProperties | undefined>(() => {
    if (immersiveProgress <= 0.0001) return undefined;

    return {
      opacity: immersiveProgress,
      backdropFilter: `blur(${(FOLDER_IMMERSIVE_BACKGROUND_BLUR_PX * immersiveProgress).toFixed(2)}px)`,
      WebkitBackdropFilter: `blur(${(FOLDER_IMMERSIVE_BACKGROUND_BLUR_PX * immersiveProgress).toFixed(2)}px)`,
      willChange: 'opacity, backdrop-filter',
      pointerEvents: 'none',
    };
  }, [immersiveProgress]);

  const immersiveWallpaperLayerStyle = useMemo<CSSProperties>(() => ({
    transform: `scale(${(1 + ((FOLDER_IMMERSIVE_BACKGROUND_SCALE - 1) * immersiveProgress)).toFixed(4)})`,
    transformOrigin: 'center center',
    willChange: immersiveProgress > 0.0001 ? 'transform' : undefined,
    pointerEvents: 'none',
  }), [immersiveProgress]);

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
          opacity: initialRevealOpacity,
          transform: initialRevealTransform,
          transition: `opacity ${INITIAL_REVEAL_TIMING}, transform ${INITIAL_REVEAL_TIMING}`,
        }}
      >
        <TopNavBar {...effectiveTopNavModeProps} />
      </div>
    );
  }, [
    effectiveTopNavModeProps,
    initialRevealOpacity,
    initialRevealTransform,
    modeFlags.showInlineTopNav,
    modeLayersVisible,
  ]);

  const immersiveUiShellStyle = useMemo<CSSProperties | undefined>(() => {
    if (immersiveProgress <= 0.0001) return undefined;

    return {
      opacity: 1 - immersiveProgress,
      willChange: 'opacity',
      pointerEvents: 'none',
    };
  }, [immersiveProgress]);

  return (
    <>
      {overlayWallpaperLayer}
      {immersiveBackdropLayerStyle ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[15000]"
          style={immersiveBackdropLayerStyle}
        />
      ) : null}
      <div style={immersiveUiShellStyle}>
        {fixedTopNavLayer}
      </div>
      <HomeMainContent
        {...homeMainContentBaseProps}
        initialRevealReady={initialRevealReady}
        visible={visible}
        modeFlags={modeFlags}
        wallpaperClockProps={wallpaperClockProps}
        searchExperienceProps={searchExperienceProps}
        searchInteractionLocked={searchInteractionLocked}
        onDrawerExpandedChange={setDrawerExpanded}
        shortcutGridProps={shortcutGridProps}
        folderImmersiveProgress={folderImmersiveProgress}
      />
    </>
  );
});
