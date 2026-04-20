import { memo, useCallback, useEffect, type CSSProperties, type ComponentProps } from 'react';
import { useTheme } from 'next-themes';
import { RootShortcutGrid } from '@/features/shortcuts/components/RootShortcutGrid';
import { WallpaperClock } from '@/components/WallpaperClock';
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { DisplayMode, DisplayModeLayoutFlags } from '@/displayMode/config';
import { SearchExperience } from '@/components/search/SearchExperience';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import type { TimeAnimationMode } from '@/hooks/useSettings';
import {
  INITIAL_REVEAL_TIMING,
  resolveInitialRevealOpacity,
  resolveInitialRevealTransform,
} from '@/config/animationTokens';
import { clamp01 } from '@/components/shortcutFolderCompactAnimation';
import { QuickAccessDrawer } from './QuickAccessDrawer';
import { InlineTime } from './InlineTime';
import { useQuickAccessDrawer } from './useQuickAccessDrawer';

type HomeContentFlags = Pick<
  DisplayModeLayoutFlags,
  'showHeroWallpaperClock' | 'showShortcuts' | 'forceWhiteSearchTheme' | 'searchUsesBlankStyle'
>;

interface HomeMainContentProps {
  initialRevealReady: boolean;
  visible: boolean;
  user: string | null;
  loginBannerVisible: boolean;
  onLoginRequest: () => void;
  onDismissLoginBanner: () => void;
  modeFlags: HomeContentFlags;
  showTime: boolean;
  displayMode: DisplayMode;
  is24Hour: boolean;
  onIs24HourChange: (checked: boolean) => void;
  showSeconds: boolean;
  onShowSecondsChange: (checked: boolean) => void;
  showDate: boolean;
  onShowDateChange: (checked: boolean) => void;
  showWeekday: boolean;
  onShowWeekdayChange: (checked: boolean) => void;
  showLunar: boolean;
  onShowLunarChange: (checked: boolean) => void;
  timeAnimationEnabled: boolean;
  timeAnimationMode: TimeAnimationMode;
  onTimeAnimationModeChange: (mode: 'inherit' | 'on' | 'off') => void;
  onWeatherUpdate?: (code: number) => void;
  timeFont: string;
  onTimeFontChange: (font: string) => void;
  layout: ResponsiveLayout;
  reduceMotionVisuals?: boolean;
  wallpaperClockProps: ComponentProps<typeof WallpaperClock>;
  searchExperienceProps: ComponentProps<typeof SearchExperience>;
  searchInteractionLocked: boolean;
  shortcutGridProps: ComponentProps<typeof RootShortcutGrid>;
  onDrawerExpandedChange?: (expanded: boolean) => void;
  folderImmersiveProgress: number;
}

const HOME_TOP_OFFSET_NUDGE_VH = 1.5;
const HOME_WALLPAPER_BLOCK_LIFT_PX = 28;
const HOME_DRAWER_LINKED_TRANSITION = '320ms cubic-bezier(0.22, 1, 0.36, 1)';
const HOME_DRAWER_WALLPAPER_SAFE_GAP_PX = 12;

export const HomeMainContent = memo(function HomeMainContent({
  initialRevealReady,
  visible,
  user: _user,
  loginBannerVisible: _loginBannerVisible,
  onLoginRequest: _onLoginRequest,
  onDismissLoginBanner: _onDismissLoginBanner,
  modeFlags,
  showTime,
  displayMode,
  is24Hour,
  onIs24HourChange,
  showSeconds,
  onShowSecondsChange,
  showDate,
  onShowDateChange,
  showWeekday,
  onShowWeekdayChange,
  showLunar,
  onShowLunarChange,
  timeAnimationEnabled,
  timeAnimationMode,
  onTimeAnimationModeChange,
  onWeatherUpdate,
  timeFont,
  onTimeFontChange,
  layout,
  reduceMotionVisuals = false,
  wallpaperClockProps,
  searchExperienceProps,
  searchInteractionLocked,
  shortcutGridProps,
  onDrawerExpandedChange,
  folderImmersiveProgress,
}: HomeMainContentProps) {
  const firefox = isFirefoxBuildTarget();
  const { resolvedTheme } = useTheme();

  const homeTopOffsetPercent = Math.max(
    0,
    ((layout.mainTopMargin + 50) / Math.max(layout.viewportHeight, 1)) * 100 - HOME_TOP_OFFSET_NUDGE_VH,
  );
  const homeTopOffsetPx = (homeTopOffsetPercent / 100) * Math.max(layout.viewportHeight, 1);
  const homeWallpaperBottomPx = modeFlags.showHeroWallpaperClock
    ? homeTopOffsetPx + layout.wallpaperHeight
    : undefined;
  const drawer = useQuickAccessDrawer({
    viewportHeight: layout.viewportHeight,
    showShortcuts: modeFlags.showShortcuts,
    disableScrollInteraction: searchInteractionLocked,
    topContentBottomPx: homeWallpaperBottomPx,
    topContentSafeGapPx: HOME_DRAWER_WALLPAPER_SAFE_GAP_PX,
  });

  const drawerShortcutBottomInset = 16;

  const homeWallpaperBlockTranslateYPx = -HOME_WALLPAPER_BLOCK_LIFT_PX * drawer.drawerLayoutProgress;
  const homeInitialRevealTransform = resolveInitialRevealTransform(initialRevealReady);
  const homeInitialRevealOpacity = resolveInitialRevealOpacity(initialRevealReady);
  const immersiveProgress = clamp01(folderImmersiveProgress);
  const immersiveTopContentStyle = immersiveProgress <= 0.0001
    ? undefined
    : ({
        opacity: 1 - immersiveProgress,
        willChange: 'opacity',
        pointerEvents: 'none',
      } as CSSProperties);

  const isLightTheme = resolvedTheme !== 'dark';
  const useExpandedLightSearchSurface = isLightTheme && drawer.isDrawerExpanded;
  const drawerShortcutForceWhiteText = displayMode === 'fresh' && !(isLightTheme && drawer.isDrawerExpanded);
  const drawerShortcutMonochromeTone = 'theme-adaptive';
  const drawerShortcutMonochromeTileBackdropBlur = false;
  const drawerSearchSurfaceStyle = useExpandedLightSearchSurface
    ? ({ backgroundColor: 'rgba(0, 0, 0, 0.15)' } as CSSProperties)
    : undefined;
  const isDrawerFullyExpanded = visible && drawer.isDrawerExpanded;

  const handleShortcutGridDragStart = useCallback(() => {
    shortcutGridProps.onDragStart?.();
    drawer.handleShortcutDragStart();
  }, [drawer.handleShortcutDragStart, shortcutGridProps.onDragStart]);

  const handleShortcutGridDragEnd = useCallback(() => {
    shortcutGridProps.onDragEnd?.();
    drawer.handleShortcutDragEnd();
  }, [drawer.handleShortcutDragEnd, shortcutGridProps.onDragEnd]);

  useEffect(() => {
    onDrawerExpandedChange?.(isDrawerFullyExpanded);
  }, [isDrawerFullyExpanded, onDrawerExpandedChange]);

  useEffect(() => () => {
    onDrawerExpandedChange?.(false);
  }, [onDrawerExpandedChange]);

  if (!visible) return null;

  return (
    <>
      <div style={immersiveTopContentStyle}>
        <div
          className={`flex flex-col items-center flex-1 w-full ${firefox ? '' : 'transform-gpu will-change-transform'}`}
          style={{
            marginTop: `${homeTopOffsetPercent}vh`,
            opacity: homeInitialRevealOpacity,
            transform: homeInitialRevealTransform,
            transition: `opacity ${INITIAL_REVEAL_TIMING}, transform ${INITIAL_REVEAL_TIMING}`,
          }}
        >
          <div
            className="max-w-full flex flex-col items-stretch"
            style={{
              width: layout.contentWidth,
              gap: layout.mainGap + 12,
              transform: `translate3d(0, ${homeWallpaperBlockTranslateYPx}px, 0)`,
              transformOrigin: 'center top',
              transition: `transform ${HOME_DRAWER_LINKED_TRANSITION}`,
              willChange: firefox ? undefined : 'transform',
            }}
          >
            {modeFlags.showHeroWallpaperClock ? (
              <div className={`w-full ${firefox ? '' : 'transform-gpu will-change-transform'}`}>
                <WallpaperClock {...wallpaperClockProps} />
              </div>
            ) : (
              showTime && (
                <div className={`w-full ${firefox ? '' : 'transform-gpu will-change-transform'}`}>
                  <InlineTime
                    is24Hour={is24Hour}
                    onIs24HourChange={onIs24HourChange}
                    showSeconds={showSeconds}
                    onShowSecondsChange={onShowSecondsChange}
                    showDate={showDate}
                    onShowDateChange={onShowDateChange}
                    showWeekday={showWeekday}
                    onShowWeekdayChange={onShowWeekdayChange}
                    showLunar={showLunar}
                    onShowLunarChange={onShowLunarChange}
                    timeAnimationEnabled={timeAnimationEnabled}
                    timeAnimationMode={timeAnimationMode}
                    onTimeAnimationModeChange={onTimeAnimationModeChange}
                    onWeatherUpdate={onWeatherUpdate}
                    timeFont={timeFont}
                    onTimeFontChange={onTimeFontChange}
                    forceWhiteText={modeFlags.forceWhiteSearchTheme}
                    layout={layout}
                  />
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <QuickAccessDrawer
        initialRevealReady={initialRevealReady}
        modeFlags={modeFlags}
        contentWidth={layout.contentWidth}
        quickAccessOpen={drawer.quickAccessOpen}
        quickAccessSnapPoint={drawer.quickAccessSnapPoint}
        quickAccessDefaultSnapPoint={drawer.quickAccessDefaultSnapPoint}
        quickAccessFullSnapPoint={drawer.quickAccessFullSnapPoint}
        isDrawerExpanded={drawer.isDrawerExpanded}
        drawerOverlayOpacity={drawer.drawerOverlayOpacity}
        drawerSurfaceOpacity={drawer.drawerSurfaceOpacity}
        drawerLayoutProgress={drawer.drawerLayoutProgress}
        drawerBottomBounceOffsetPx={drawer.drawerBottomBounceOffsetPx}
        drawerContentTopPaddingPx={drawer.drawerContentTopPaddingPx}
        drawerContentBackdropBlurPx={drawer.drawerContentBackdropBlurPx}
        drawerPanelHeightVh={drawer.drawerPanelHeightVh}
        drawerPanelTranslateYPx={drawer.drawerPanelTranslateYPx}
        drawerShortcutBottomInset={drawerShortcutBottomInset}
        drawerShortcutForceWhiteText={drawerShortcutForceWhiteText}
        drawerShortcutMonochromeTone={drawerShortcutMonochromeTone}
        drawerShortcutMonochromeTileBackdropBlur={drawerShortcutMonochromeTileBackdropBlur}
        drawerScrollLocked={drawer.drawerScrollLocked}
        reduceMotionVisuals={reduceMotionVisuals}
        drawerSearchSurfaceStyle={drawerSearchSurfaceStyle}
        subtleDarkTone={useExpandedLightSearchSurface}
        drawerWheelAreaRef={drawer.drawerWheelAreaRef}
        drawerShortcutScrollRef={drawer.drawerShortcutScrollRef}
        searchExperienceProps={searchExperienceProps}
        folderImmersiveProgress={folderImmersiveProgress}
        shortcutGridProps={{
          ...shortcutGridProps,
          onDragStart: handleShortcutGridDragStart,
          onDragEnd: handleShortcutGridDragEnd,
        }}
        onDrawerOpenChange={drawer.handleDrawerOpenChange}
        onActiveSnapPointChange={drawer.handleActiveSnapPointChange}
      />
    </>
  );
});
