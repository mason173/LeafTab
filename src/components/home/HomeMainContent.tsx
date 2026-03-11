import { motion } from 'framer-motion';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { LoginBanner } from '@/components/LoginBanner';
import { SearchBar } from '@/components/SearchBar';
import { ShortcutsCarousel } from '@/components/ShortcutsCarousel';
import { TimeFontDialog } from '@/components/TimeFontDialog';
import { WallpaperClock } from '@/components/WallpaperClock';
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
          <motion.div className="w-full" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <LoginBanner
              onLogin={onLoginRequest}
              onClose={onDismissLoginBanner}
            />
          </motion.div>
        )}

        {modeFlags.showHeroWallpaperClock ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full transform-gpu will-change-transform"
          >
            <WallpaperClock {...wallpaperClockProps} />
          </motion.div>
        ) : (
          showTime && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.12 }}
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
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.24 }}
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
        >
          {time}
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
