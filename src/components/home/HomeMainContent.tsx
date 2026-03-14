import type { CSSProperties, ComponentProps } from 'react';
import { useTheme } from 'next-themes';
import { SearchBar } from '@/components/SearchBar';
import { ShortcutGrid } from '@/components/ShortcutGrid';
import { WallpaperClock } from '@/components/WallpaperClock';
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { DisplayMode, DisplayModeLayoutFlags } from '@/displayMode/config';
import { RHYTHM_BACKGROUND_SCALE_AT_FULL_DRAWER } from './quickAccessDrawer.constants';
import { QuickAccessDrawer } from './QuickAccessDrawer';
import { InlineTime } from './InlineTime';
import { useQuickAccessDrawer } from './useQuickAccessDrawer';

type HomeContentFlags = Pick<
  DisplayModeLayoutFlags,
  'showHeroWallpaperClock' | 'showShortcuts' | 'forceWhiteSearchTheme' | 'searchUsesBlankStyle'
>;

interface HomeMainContentProps {
  visible: boolean;
  user: string | null;
  loginBannerVisible: boolean;
  onLoginRequest: () => void;
  onDismissLoginBanner: () => void;
  modeFlags: HomeContentFlags;
  showTime: boolean;
  displayMode: DisplayMode;
  time: string;
  date: Date;
  lunar: string;
  timeFont: string;
  onTimeFontChange: (font: string) => void;
  layout: ResponsiveLayout;
  wallpaperClockProps: ComponentProps<typeof WallpaperClock>;
  searchBarProps: ComponentProps<typeof SearchBar>;
  shortcutGridProps: ComponentProps<typeof ShortcutGrid>;
}

const HOME_BLOCK_ENTER_MIN_DISTANCE_PX = 320;
const HOME_BLOCK_ENTER_EXTRA_OFFSET_PX = 120;
const HOME_BLOCK_ENTER_DURATION_MS = 680;
const HOME_BLOCK_ENTER_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const HOME_TOP_OFFSET_NUDGE_VH = 1.5;
const HOME_WALLPAPER_BLOCK_LIFT_PX = 28;
const HOME_BACKGROUND_SCALE_AT_FULL_DRAWER = 0.965;

export function HomeMainContent({
  visible,
  user: _user,
  loginBannerVisible: _loginBannerVisible,
  onLoginRequest: _onLoginRequest,
  onDismissLoginBanner: _onDismissLoginBanner,
  modeFlags,
  showTime,
  displayMode,
  time,
  date,
  lunar,
  timeFont,
  onTimeFontChange,
  layout,
  wallpaperClockProps,
  searchBarProps,
  shortcutGridProps,
}: HomeMainContentProps) {
  const { resolvedTheme } = useTheme();
  const drawer = useQuickAccessDrawer({
    displayMode,
    showShortcuts: modeFlags.showShortcuts,
    disableScrollInteraction: Boolean(searchBarProps.historyOpen || searchBarProps.dropdownOpen),
  });
  const drawerScrollLocked = Boolean(searchBarProps.historyOpen || searchBarProps.dropdownOpen);

  const homeTopOffsetPercent = Math.max(
    0,
    ((layout.mainTopMargin + 50) / Math.max(layout.viewportHeight, 1)) * 100 - HOME_TOP_OFFSET_NUDGE_VH,
  );
  const homeTopOffsetPx = (homeTopOffsetPercent / 100) * layout.viewportHeight;
  const estimatedHomeBlockHeight = modeFlags.showHeroWallpaperClock
    ? layout.wallpaperHeight
    : Math.max(layout.clockFontSize + 120, 240);
  const homeBlockEnterDistancePx = Math.max(
    HOME_BLOCK_ENTER_MIN_DISTANCE_PX,
    homeTopOffsetPx + estimatedHomeBlockHeight + HOME_BLOCK_ENTER_EXTRA_OFFSET_PX,
  );
  const homeBlockEnterFromTopPx = -homeBlockEnterDistancePx;

  const drawerShortcutFadeHeight = shortcutGridProps.cardVariant === 'compact'
    ? Math.max(66, Math.round(((shortcutGridProps.compactIconSize ?? 72) + 24) * 0.92))
    : Math.max(58, Math.round(((shortcutGridProps.defaultIconSize ?? 36) + (shortcutGridProps.defaultVerticalPadding ?? 8) * 2) * 1.05));
  const drawerShortcutBottomInset = drawerShortcutFadeHeight + 16;

  const homeWallpaperBlockTranslateYPx = -HOME_WALLPAPER_BLOCK_LIFT_PX * drawer.drawerLayoutProgress;
  const homeBackgroundScaleAtFullDrawer = displayMode === 'fresh'
    ? RHYTHM_BACKGROUND_SCALE_AT_FULL_DRAWER
    : HOME_BACKGROUND_SCALE_AT_FULL_DRAWER;
  const homeBackgroundScale = 1 + (homeBackgroundScaleAtFullDrawer - 1) * drawer.drawerLayoutProgress;

  const isLightTheme = resolvedTheme !== 'dark';
  const useExpandedLightSearchSurface = isLightTheme && drawer.isDrawerExpanded;
  const drawerShortcutForceWhiteText = displayMode === 'fresh' && !(isLightTheme && drawer.isDrawerExpanded);
  const drawerSearchSurfaceStyle = useExpandedLightSearchSurface
    ? ({ backgroundColor: 'rgba(0, 0, 0, 0.15)' } as CSSProperties)
    : undefined;

  if (!visible) return null;

  return (
    <>
      <div
        className="flex flex-col items-center flex-1 w-full transform-gpu will-change-transform"
        style={{
          ['--home-block-enter-from' as string]: `${homeBlockEnterFromTopPx}px`,
          marginTop: `${homeTopOffsetPercent}vh`,
          animation: `home-block-enter ${HOME_BLOCK_ENTER_DURATION_MS}ms ${HOME_BLOCK_ENTER_EASE} both`,
          willChange: 'transform, opacity',
        }}
      >
        <div
          className="max-w-full flex flex-col items-stretch"
          style={{
            width: layout.contentWidth,
            gap: layout.mainGap + 12,
            transform: `translate3d(0, ${homeWallpaperBlockTranslateYPx}px, 0) scale(${homeBackgroundScale})`,
            transformOrigin: 'center top',
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
                  time={time}
                  date={date}
                  lunar={lunar}
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
        modeFlags={modeFlags}
        contentWidth={layout.contentWidth}
        quickAccessOpen={drawer.quickAccessOpen}
        quickAccessSnapPoint={drawer.quickAccessSnapPoint}
        isDrawerExpanded={drawer.isDrawerExpanded}
        drawerOverlayOpacity={drawer.drawerOverlayOpacity}
        drawerSurfaceOpacity={drawer.drawerSurfaceOpacity}
        drawerBottomBounceOffsetPx={drawer.drawerBottomBounceOffsetPx}
        drawerContentTopPaddingPx={drawer.drawerContentTopPaddingPx}
        drawerContentBackdropBlurPx={drawer.drawerContentBackdropBlurPx}
        drawerPanelHeightVh={drawer.drawerPanelHeightVh}
        drawerShortcutFadeHeight={drawerShortcutFadeHeight}
        drawerShortcutBottomInset={drawerShortcutBottomInset}
        drawerShortcutForceWhiteText={drawerShortcutForceWhiteText}
        drawerScrollLocked={drawerScrollLocked}
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
}
