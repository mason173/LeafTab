import { motion } from 'framer-motion';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { LoginBanner } from '@/components/LoginBanner';
import { SearchBar } from '@/components/SearchBar';
import { ShortcutsCarousel } from '@/components/ShortcutsCarousel';
import { TimeFontDialog } from '@/components/TimeFontDialog';
import { WallpaperClock } from '@/components/WallpaperClock';
import { SlidingClockTime } from '@/components/motion-primitives/sliding-clock-time';
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { DisplayMode, DisplayModeLayoutFlags } from '@/displayMode/config';

type HomeContentFlags = Pick<
  DisplayModeLayoutFlags,
  'showHeroWallpaperClock' | 'showShortcuts' | 'forceWhiteSearchTheme' | 'searchUsesMinimalStyle'
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
  shortcutsCarouselProps: ComponentProps<typeof ShortcutsCarousel>;
}

const HOME_REVEAL_HIDDEN = { opacity: 0, y: 20, filter: 'blur(12px)' };
const HOME_REVEAL_SHOWN = { opacity: 1, y: 0, filter: 'blur(0px)' };

export function HomeMainContent({
  visible,
  user,
  loginBannerVisible,
  onLoginRequest,
  onDismissLoginBanner,
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
  shortcutsCarouselProps,
}: HomeMainContentProps) {
  if (!visible) return null;

  return (
    <div className="flex flex-col items-center flex-1 w-full" style={{ marginTop: layout.mainTopMargin + 50 }}>
      <div
        className="max-w-full flex flex-col items-stretch"
        style={{ width: layout.contentWidth, gap: layout.mainGap + 12 }}
      >
        {!user && loginBannerVisible && (
          <motion.div
            className="w-full transform-gpu will-change-transform"
            initial={HOME_REVEAL_HIDDEN}
            animate={HOME_REVEAL_SHOWN}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.02 }}
          >
            <LoginBanner
              onLogin={onLoginRequest}
              onClose={onDismissLoginBanner}
            />
          </motion.div>
        )}

        {modeFlags.showHeroWallpaperClock ? (
          <motion.div
            initial={HOME_REVEAL_HIDDEN}
            animate={HOME_REVEAL_SHOWN}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
            className="w-full transform-gpu will-change-transform"
          >
            <WallpaperClock {...wallpaperClockProps} />
          </motion.div>
        ) : (
          showTime && (
            <motion.div
              initial={HOME_REVEAL_HIDDEN}
              animate={HOME_REVEAL_SHOWN}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="w-full transform-gpu will-change-transform"
            >
              <InlineTime
                time={time}
                date={date}
                lunar={lunar}
                timeFont={timeFont}
                onTimeFontChange={onTimeFontChange}
                forceWhiteText={modeFlags.forceWhiteSearchTheme}
                layout={layout}
              />
            </motion.div>
          )
        )}

        <motion.div
          className="relative w-full z-20 transform-gpu will-change-transform"
          initial={HOME_REVEAL_HIDDEN}
          animate={HOME_REVEAL_SHOWN}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: 0.22 }}
        >
          <SearchBar
            {...searchBarProps}
            minimalistMode={modeFlags.searchUsesMinimalStyle}
            forceWhiteTheme={modeFlags.forceWhiteSearchTheme}
          />
        </motion.div>

        {modeFlags.showShortcuts && (
          <motion.div
            className="relative w-full z-10 transform-gpu will-change-transform"
            initial={HOME_REVEAL_HIDDEN}
            animate={HOME_REVEAL_SHOWN}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1], delay: 0.34 }}
          >
            <ShortcutsCarousel {...shortcutsCarouselProps} forceTextWhite={displayMode === 'fresh'} />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function InlineTime({
  time,
  date,
  lunar,
  timeFont,
  onTimeFontChange,
  forceWhiteText,
  layout,
}: {
  time: string;
  date: Date;
  lunar: string;
  timeFont: string;
  onTimeFontChange: (font: string) => void;
  forceWhiteText: boolean;
  layout: ResponsiveLayout;
}) {
  const { i18n } = useTranslation();
  const [timeFontDialogOpen, setTimeFontDialogOpen] = useState(false);
  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  const dateString = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  return (
    <div className="relative w-full rounded-[28px] overflow-hidden group select-none">
      <div className="absolute inset-0 pointer-events-none opacity-0" />
      <div className="relative z-10 pointer-events-none transform-gpu flex flex-col items-center justify-center py-6">
        <button
          type="button"
          className={`${forceWhiteText ? 'text-white text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]' : 'text-muted-foreground dark:text-foreground dark:text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]'} font-thin leading-none tracking-tight cursor-pointer hover:opacity-80 transition-opacity pointer-events-auto select-none bg-transparent p-0 border-0`}
          style={{ fontFamily: timeFont, fontSize: layout.clockFontSize }}
          onClick={() => setTimeFontDialogOpen(true)}
          aria-label={time}
        >
          <SlidingClockTime time={time} />
        </button>
        <TimeFontDialog
          open={timeFontDialogOpen}
          onOpenChange={setTimeFontDialogOpen}
          currentFont={timeFont}
          previewTime={time}
          onSelect={onTimeFontChange}
        />
        <div
          className={`flex items-center gap-3 mt-2 font-['PingFang_SC',sans-serif] ${forceWhiteText ? 'text-white' : 'text-muted-foreground'}`}
          style={{ fontSize: layout.clockMetaFontSize }}
        >
          <span>{dateString} {weekday}</span>
          {lunar && <span>{lunar}</span>}
        </div>
      </div>
    </div>
  );
}
