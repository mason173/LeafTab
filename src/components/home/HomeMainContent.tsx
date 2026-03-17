import { memo, useEffect, type CSSProperties, type ComponentProps } from 'react';
import { useTheme } from 'next-themes';
import { SearchBar } from '@/components/SearchBar';
import { ShortcutGrid } from '@/components/ShortcutGrid';
import { WallpaperClock } from '@/components/WallpaperClock';
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { DisplayMode, DisplayModeLayoutFlags } from '@/displayMode/config';
import {
  INITIAL_REVEAL_TIMING,
  resolveInitialRevealOpacity,
  resolveInitialRevealTransform,
} from '@/config/animationTokens';
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
  showSeconds: boolean;
  disableSecondTickMotion: boolean;
  disableBottomGradualBlur: boolean;
  timeFont: string;
  onTimeFontChange: (font: string) => void;
  layout: ResponsiveLayout;
  wallpaperClockProps: ComponentProps<typeof WallpaperClock>;
  searchBarProps: ComponentProps<typeof SearchBar>;
  shortcutGridProps: ComponentProps<typeof ShortcutGrid>;
  onDrawerExpandedChange?: (expanded: boolean) => void;
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
  showSeconds,
  disableSecondTickMotion,
  disableBottomGradualBlur,
  timeFont,
  onTimeFontChange,
  layout,
  wallpaperClockProps,
  searchBarProps,
  shortcutGridProps,
  onDrawerExpandedChange,
}: HomeMainContentProps) {
  const { resolvedTheme } = useTheme();

  const homeTopOffsetPercent = Math.max(
    0,
    ((layout.mainTopMargin + 50) / Math.max(layout.viewportHeight, 1)) * 100 - HOME_TOP_OFFSET_NUDGE_VH,
  );
  const homeTopOffsetPx = (homeTopOffsetPercent / 100) * Math.max(layout.viewportHeight, 1);
  const homeWallpaperBottomPx = modeFlags.showHeroWallpaperClock
    ? homeTopOffsetPx + layout.wallpaperHeight
    : undefined;
  const drawerScrollLocked = Boolean(searchBarProps.historyOpen || searchBarProps.dropdownOpen);
  const drawer = useQuickAccessDrawer({
    viewportHeight: layout.viewportHeight,
    showShortcuts: modeFlags.showShortcuts,
    disableScrollInteraction: drawerScrollLocked,
    topContentBottomPx: homeWallpaperBottomPx,
    topContentSafeGapPx: HOME_DRAWER_WALLPAPER_SAFE_GAP_PX,
  });

  const drawerShortcutFadeHeight = shortcutGridProps.cardVariant === 'compact'
    ? Math.max(66, Math.round(((shortcutGridProps.compactIconSize ?? 72) + 24) * 0.92))
    : Math.max(58, Math.round(((shortcutGridProps.defaultIconSize ?? 36) + (shortcutGridProps.defaultVerticalPadding ?? 8) * 2) * 1.05));
  const drawerShortcutBottomInset = drawerShortcutFadeHeight + 16;

  const homeWallpaperBlockTranslateYPx = -HOME_WALLPAPER_BLOCK_LIFT_PX * drawer.drawerLayoutProgress;
  const homeInitialRevealTransform = resolveInitialRevealTransform(initialRevealReady);
  const homeInitialRevealOpacity = resolveInitialRevealOpacity(initialRevealReady);

  const isLightTheme = resolvedTheme !== 'dark';
  const useExpandedLightSearchSurface = isLightTheme && drawer.isDrawerExpanded;
  const drawerShortcutForceWhiteText = displayMode === 'fresh' && !(isLightTheme && drawer.isDrawerExpanded);
  const drawerSearchSurfaceStyle = useExpandedLightSearchSurface
    ? ({ backgroundColor: 'rgba(0, 0, 0, 0.15)' } as CSSProperties)
    : undefined;
  const isDrawerFullyExpanded = visible && drawer.isDrawerExpanded;

  useEffect(() => {
    onDrawerExpandedChange?.(isDrawerFullyExpanded);
  }, [isDrawerFullyExpanded, onDrawerExpandedChange]);

  useEffect(() => () => {
    onDrawerExpandedChange?.(false);
  }, [onDrawerExpandedChange]);

  if (!visible) return null;

  return (
    <>
      <div
        className="flex flex-col items-center flex-1 w-full transform-gpu will-change-transform"
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
            willChange: 'transform',
          }}
        >
          {modeFlags.showHeroWallpaperClock ? (
            <div className="w-full transform-gpu will-change-transform">
              <WallpaperClock {...wallpaperClockProps} />
            </div>
          ) : (
            showTime && (
              <div className="w-full transform-gpu will-change-transform">
                <InlineTime
                  is24Hour={is24Hour}
                  showSeconds={showSeconds}
                  disableSecondTickMotion={disableSecondTickMotion}
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
        drawerShortcutFadeHeight={drawerShortcutFadeHeight}
        drawerShortcutBottomInset={drawerShortcutBottomInset}
        drawerShortcutForceWhiteText={drawerShortcutForceWhiteText}
        drawerScrollLocked={drawerScrollLocked}
        disableBottomGradualBlur={disableBottomGradualBlur}
        drawerSearchSurfaceStyle={drawerSearchSurfaceStyle}
        subtleDarkTone={useExpandedLightSearchSurface}
        drawerWheelAreaRef={drawer.drawerWheelAreaRef}
        drawerShortcutScrollRef={drawer.drawerShortcutScrollRef}
        searchBarProps={searchBarProps}
        shortcutGridProps={shortcutGridProps}
        onDrawerOpenChange={drawer.handleDrawerOpenChange}
        onActiveSnapPointChange={drawer.handleActiveSnapPointChange}
      />
    </>
  );
});
