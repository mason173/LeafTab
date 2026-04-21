import { memo, useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useTheme } from 'next-themes';
import type { RootShortcutGridProps } from '@/features/shortcuts/components/RootShortcutGrid';
import { WallpaperClock, type WallpaperClockProps } from '@/components/WallpaperClock';
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { DisplayMode, DisplayModeLayoutFlags } from '@/displayMode/config';
import type { SearchExperienceProps } from '@/components/search/SearchExperience';
import { isFirefoxBuildTarget } from '@/platform/browserTarget';
import type { TimeAnimationMode } from '@/hooks/useSettings';
import {
  resolveInitialRevealStyle,
} from '@/config/animationTokens';
import { QuickAccessDrawer } from './QuickAccessDrawer';
import { InlineTime } from './InlineTime';
import { useQuickAccessDrawer } from './useQuickAccessDrawer';

export type HomeContentFlags = Pick<
  DisplayModeLayoutFlags,
  'showHeroWallpaperClock' | 'showShortcuts' | 'revealShortcutsOnDrawerExpand' | 'forceWhiteSearchTheme' | 'searchUsesBlankStyle'
>;

export type HomeMainContentWallpaperClockProps = WallpaperClockProps;
export type HomeMainContentSearchExperienceProps = SearchExperienceProps;
export type HomeMainContentShortcutGridProps = RootShortcutGridProps;

export interface HomeMainContentProps {
  initialRevealReady: boolean;
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
  wallpaperClockProps: HomeMainContentWallpaperClockProps;
  searchExperienceProps: HomeMainContentSearchExperienceProps;
  searchInteractionLocked: boolean;
  shortcutGridProps: HomeMainContentShortcutGridProps;
  onDrawerExpandedChange?: (expanded: boolean) => void;
  topNavIntroCompleted?: boolean;
}

export type HomeMainContentBaseProps = Omit<
  HomeMainContentProps,
  'initialRevealReady'
  | 'modeFlags'
  | 'wallpaperClockProps'
  | 'searchExperienceProps'
  | 'searchInteractionLocked'
  | 'shortcutGridProps'
  | 'onDrawerExpandedChange'
>;

const HOME_TOP_OFFSET_NUDGE_VH = 1.5;
const HOME_WALLPAPER_BLOCK_LIFT_PX = 28;
const HOME_DRAWER_LINKED_TRANSITION = '320ms cubic-bezier(0.22, 1, 0.36, 1)';
const HOME_DRAWER_WALLPAPER_SAFE_GAP_PX = 12;
const BLANK_MODE_DRAWER_HINT_SEEN_KEY = 'leaftab_blank_mode_drawer_hint_seen_v1';

export const HomeMainContent = memo(function HomeMainContent({
  initialRevealReady,
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
  topNavIntroCompleted = false,
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
    allowWheelExpandWhenHidden: modeFlags.revealShortcutsOnDrawerExpand,
    disableScrollInteraction: searchInteractionLocked,
    topContentBottomPx: homeWallpaperBottomPx,
    topContentSafeGapPx: HOME_DRAWER_WALLPAPER_SAFE_GAP_PX,
  });

  const drawerShortcutBottomInset = 16;

  const homeWallpaperBlockTranslateYPx = -HOME_WALLPAPER_BLOCK_LIFT_PX * drawer.drawerLayoutProgress;
  const homeInitialRevealStyle = resolveInitialRevealStyle(initialRevealReady, {
    disablePointerEventsUntilReady: true,
  });
  const immersiveTopContentStyle: CSSProperties = {
    opacity: 'var(--leaftab-folder-immersive-inverse-opacity, 1)',
    willChange: 'opacity',
  };

  const isLightTheme = resolvedTheme !== 'dark';
  const useExpandedLightSearchSurface = isLightTheme && drawer.isDrawerExpanded;
  const drawerShortcutForceWhiteText = displayMode === 'fresh' && !(isLightTheme && drawer.isDrawerExpanded);
  const drawerShortcutMonochromeTone = 'theme-adaptive';
  const drawerShortcutMonochromeTileBackdropBlur = false;
  const [blankModeDrawerHintDismissed, setBlankModeDrawerHintDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(BLANK_MODE_DRAWER_HINT_SEEN_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const drawerSearchSurfaceStyle = useExpandedLightSearchSurface
    ? ({ backgroundColor: 'rgba(0, 0, 0, 0.15)' } as CSSProperties)
    : undefined;
  const isDrawerFullyExpanded = drawer.isDrawerExpanded;
  const showBlankModeDrawerHint = initialRevealReady
    && displayMode === 'minimalist'
    && topNavIntroCompleted
    && !drawer.isDrawerExpanded
    && !blankModeDrawerHintDismissed;

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

  useEffect(() => {
    if (displayMode !== 'minimalist' || !drawer.isDrawerExpanded || blankModeDrawerHintDismissed) return;
    setBlankModeDrawerHintDismissed(true);
    try {
      localStorage.setItem(BLANK_MODE_DRAWER_HINT_SEEN_KEY, 'true');
    } catch {}
  }, [blankModeDrawerHintDismissed, displayMode, drawer.isDrawerExpanded]);

  return (
    <>
      <div style={immersiveTopContentStyle}>
        <div
          className={`flex flex-col items-center flex-1 w-full ${firefox ? '' : 'transform-gpu will-change-transform'}`}
          style={{
            marginTop: `${homeTopOffsetPercent}vh`,
            ...homeInitialRevealStyle,
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
        drawerExpandHintVisible={showBlankModeDrawerHint}
        drawerSearchSurfaceStyle={drawerSearchSurfaceStyle}
        subtleDarkTone={useExpandedLightSearchSurface}
        drawerWheelAreaRef={drawer.drawerWheelAreaRef}
        drawerShortcutScrollRef={drawer.drawerShortcutScrollRef}
        searchExperienceProps={searchExperienceProps}
        shortcutGridProps={{
          ...shortcutGridProps,
          onDragStart: handleShortcutGridDragStart,
          onDragEnd: handleShortcutGridDragEnd,
        }}
      />
    </>
  );
});
