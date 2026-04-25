import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeDisplayDialog } from './TimeDisplayDialog';
import ScenarioModeMenu from './ScenarioModeMenu';
import { ScenarioMode } from "@/scenario/scenario";
import { TopNavBar } from './TopNavBar';
import imgImage from "../assets/Default_wallpaper.webp";
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useClock } from '@/hooks/useClock';
import { useResolvedTimeFontScale } from '@/hooks/useResolvedTimeFontScale';
import type { TimeAnimationMode } from '@/hooks/useSettings';
import { WallpaperMaskOverlay } from './wallpaper/WallpaperMaskOverlay';
import { getColorWallpaperGradient } from './wallpaper/colorWallpapers';
import { SlidingClockTime } from '@/components/motion-primitives/sliding-clock-time';
import { weatherVideoMap, sunnyWeatherVideo } from './wallpaper/weatherWallpapers';
import type { WallpaperMode } from '@/wallpaper/types';
import { WeatherLoopVideo } from './wallpaper/WeatherLoopVideo';
import { WeatherCard } from './WeatherCard';
import { toCssFontFamily } from '@/utils/googleFonts';

export interface WallpaperClockProps {
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
  bingWallpaperUrl: string;
  onSettingsClick?: () => void;
  onSyncClick?: () => void;
  syncStatus?: 'idle' | 'syncing' | 'conflict' | 'error';
  showScenarioMode: boolean;
  scenarioModes: ScenarioMode[];
  selectedScenarioId: string;
  scenarioModeOpen: boolean;
  onScenarioModeOpenChange: (open: boolean) => void;
  onScenarioModeSelect: (id: string) => void;
  onScenarioModeCreate: () => void;
  onScenarioModeEdit: (id: string) => void;
  onScenarioModeDelete: (id: string) => void;
  wallpaperMode: WallpaperMode;
  weatherCode: number;
  onWeatherUpdate?: (code: number) => void;
  customWallpaperLoaded?: boolean;
  customWallpaper: string | null;
  colorWallpaperId: string;
  wallpaperMaskOpacity: number;
  pauseDynamicWallpaper?: boolean;
  reduceTopControlsEffects?: boolean;
  reduceVisualEffects?: boolean;
  timeFont: string;
  onTimeFontChange: (font: string) => void;
  layout?: ResponsiveLayout;
}

export const WallpaperClock = memo(function WallpaperClock({ 
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
  bingWallpaperUrl,
  onSettingsClick,
  onSyncClick,
  syncStatus = 'idle',
  showScenarioMode,
  scenarioModes,
  selectedScenarioId,
  scenarioModeOpen,
  onScenarioModeOpenChange,
  onScenarioModeSelect,
  onScenarioModeCreate,
  onScenarioModeEdit,
  onScenarioModeDelete,
  wallpaperMode,
  weatherCode,
  onWeatherUpdate,
  customWallpaperLoaded = true,
  customWallpaper,
  colorWallpaperId,
  wallpaperMaskOpacity,
  pauseDynamicWallpaper = false,
  reduceTopControlsEffects,
  reduceVisualEffects = false,
  timeFont,
  onTimeFontChange,
  layout,
}: WallpaperClockProps) {
  const [timeDisplayDialogOpen, setTimeDisplayDialogOpen] = useState(false);
  const { i18n } = useTranslation();
  const { time, date, lunar } = useClock(is24Hour, showSeconds, i18n.language, showLunar);
  const resolvedTimeFontScale = useResolvedTimeFontScale(timeFont);

  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long' }), [locale]);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }),
    [locale],
  );
  const weekday = weekdayFormatter.format(date);
  const dateString = dateFormatter.format(date);
  const primaryMetaText = showDate && showWeekday
    ? `${dateString}${weekday}`
    : showDate
      ? dateString
      : showWeekday
        ? weekday
        : '';
  const edgeInset = layout ? Math.max(16, Math.round((layout.wallpaperHeight / 220) * 24)) : 24;

  const weatherVideo = weatherVideoMap[weatherCode] || sunnyWeatherVideo;
  const colorWallpaperGradient = getColorWallpaperGradient(colorWallpaperId);
  const resolvedReduceTopControlsEffects = reduceTopControlsEffects ?? reduceVisualEffects;
  const normalizedClockFontSize = (layout?.clockFontSize ?? 100) * resolvedTimeFontScale;

  return (
    <div
      className="relative w-full overflow-hidden group select-none"
      style={{
        height: layout?.wallpaperHeight ?? 220,
        borderRadius: layout?.wallpaperRadius ?? 28,
      }}
    >
      <div className="absolute inset-0 bg-muted">
        <div className="w-full h-full transition-transform duration-[3000ms] ease-out transform-gpu group-hover:scale-[1.1]">
          {wallpaperMode === 'custom' ? (
            customWallpaper ? (
              <img
                alt=""
                className="w-full h-full object-cover"
                src={customWallpaper}
              />
            ) : customWallpaperLoaded ? (
              <img
                alt=""
                className="w-full h-full object-cover"
                src={imgImage}
              />
            ) : null
          ) : wallpaperMode === 'color' ? (
            <div className="absolute inset-0" style={{ backgroundImage: colorWallpaperGradient }} />
          ) : wallpaperMode === 'bing' ? (
            (bingWallpaperUrl && bingWallpaperUrl !== imgImage) ? (
              <img
                key={bingWallpaperUrl}
                alt=""
                className="w-full h-full object-cover"
                src={bingWallpaperUrl}
              />
            ) : (
              <img
                alt=""
                className="w-full h-full object-cover"
                src={imgImage}
              />
            )
          ) : (
            <WeatherLoopVideo
              className="absolute inset-0 w-full h-full object-cover" 
              src={weatherVideo}
              paused={pauseDynamicWallpaper}
            />
          )}
        </div>
      </div>

      <WallpaperMaskOverlay opacity={wallpaperMaskOpacity} />

      <div className="absolute z-[14020] transform-gpu pointer-events-none" style={{ left: edgeInset, right: edgeInset, top: edgeInset, bottom: edgeInset }}>
        <TopNavBar 
          hideWeather
          settingsRevealOnHover
          leftSlotRevealOnHover
          keepControlsVisible={scenarioModeOpen}
          onSettingsClick={onSettingsClick}
          onSyncClick={onSyncClick}
          syncStatus={syncStatus}
          onWeatherUpdate={onWeatherUpdate}
          reduceVisualEffects={resolvedReduceTopControlsEffects}
          leftSlot={
            showScenarioMode ? (
              <ScenarioModeMenu
                scenarioModes={scenarioModes}
                selectedScenarioId={selectedScenarioId}
                open={scenarioModeOpen}
                onOpenChange={onScenarioModeOpenChange}
                onSelect={onScenarioModeSelect}
                onCreate={onScenarioModeCreate}
                onEdit={onScenarioModeEdit}
                onDelete={onScenarioModeDelete}
                reduceVisualEffects={resolvedReduceTopControlsEffects}
              />
            ) : null
          }
        />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 pointer-events-none transform-gpu">
        <button
          type="button"
          className="font-thin leading-none tracking-tight text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)] cursor-pointer hover:opacity-80 transition-opacity pointer-events-auto select-none bg-transparent p-0 border-0"
          style={{ fontFamily: toCssFontFamily(timeFont), fontSize: normalizedClockFontSize }}
          onClick={() => setTimeDisplayDialogOpen(true)}
          aria-label={time}
        >
          {!timeAnimationEnabled ? time : <SlidingClockTime time={time} />}
        </button>
        <TimeDisplayDialog
          open={timeDisplayDialogOpen}
          onOpenChange={setTimeDisplayDialogOpen}
          currentFont={timeFont}
          previewTime={time}
          is24Hour={is24Hour}
          onIs24HourChange={onIs24HourChange}
          showDate={showDate}
          onShowDateChange={onShowDateChange}
          showWeekday={showWeekday}
          onShowWeekdayChange={onShowWeekdayChange}
          showSeconds={showSeconds}
          onShowSecondsChange={onShowSecondsChange}
          showLunar={showLunar}
          onShowLunarChange={onShowLunarChange}
          timeAnimationMode={timeAnimationMode}
          onTimeAnimationModeChange={onTimeAnimationModeChange}
          onSelect={onTimeFontChange}
        />
        <div className="mt-2 flex max-w-full flex-col items-center font-['PingFang_SC',sans-serif] text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]">
          <div
            className="inline-flex w-fit max-w-full self-center items-center justify-center gap-3 text-center"
            style={{ fontSize: layout?.clockMetaFontSize ?? 16 }}
          >
            {primaryMetaText || (showLunar && lunar) ? (
              <div className="inline-flex w-fit items-center gap-3 whitespace-nowrap">
                {primaryMetaText ? <span>{primaryMetaText}</span> : null}
                {showLunar && lunar ? <span>{lunar}</span> : null}
              </div>
            ) : null}
            <WeatherCard
              onWeatherUpdate={onWeatherUpdate}
              variant="inverted"
              displayMode="inline"
              className="w-fit max-w-full"
              textClassName="text-inherit"
            />
          </div>
        </div>
      </div>

    </div>
  );
});
