import { lazy, memo, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeDisplayDialog } from './TimeDisplayDialog';
import ScenarioModeMenu from './ScenarioModeMenu';
import { ScenarioMode } from "@/scenario/scenario";
import { TopNavBar } from './TopNavBar';
import imgImage from "../assets/Default_wallpaper.webp";
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useClockDate, useClockTime } from '@/hooks/useClock';
import { useResolvedTimeFontScale } from '@/hooks/useResolvedTimeFontScale';
import type { TimeAnimationMode } from '@/hooks/useSettings';
import { WallpaperMaskOverlay } from './wallpaper/WallpaperMaskOverlay';
import { getColorWallpaperGradient } from './wallpaper/colorWallpapers';
import { SlidingClockTime } from '@/components/motion-primitives/sliding-clock-time';
import { weatherVideoMap, sunnyWeatherVideo } from './wallpaper/weatherWallpapers';
import type { WallpaperMode } from '@/wallpaper/types';
import { WeatherLoopVideo } from './wallpaper/WeatherLoopVideo';
import { toCssFontFamily } from '@/utils/googleFonts';

const LazyWeatherCard = lazy(() => import('./WeatherCard').then((module) => ({
  default: module.WeatherCard,
})));

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
  dynamicWallpaperVideoSrc: string;
  dynamicWallpaperPosterSrc: string;
  dynamicWallpaperPlaybackRate: number;
  wallpaperMaskOpacity: number;
  pauseDynamicWallpaper?: boolean;
  reduceTopControlsEffects?: boolean;
  reduceVisualEffects?: boolean;
  timeFont: string;
  onTimeFontChange: (font: string) => void;
  layout?: ResponsiveLayout;
}

type ClockTimeButtonProps = {
  is24Hour: boolean;
  showSeconds: boolean;
  timeAnimationEnabled: boolean;
  timeFont: string;
  fontSize: number;
  onClick: (time: string) => void;
};

const ClockTimeButton = memo(function ClockTimeButton({
  is24Hour,
  showSeconds,
  timeAnimationEnabled,
  timeFont,
  fontSize,
  onClick,
}: ClockTimeButtonProps) {
  const time = useClockTime(is24Hour, showSeconds);

  return (
    <button
      type="button"
      className="hero-tint-text-hover cursor-pointer bg-transparent border-0 p-0 font-thin leading-none tracking-tight text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)] transition-opacity hover:opacity-80 pointer-events-auto select-none"
      style={{ fontFamily: toCssFontFamily(timeFont), fontSize }}
      onClick={() => onClick(time)}
      aria-label={time}
    >
      {!timeAnimationEnabled ? time : <SlidingClockTime time={time} />}
    </button>
  );
});

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
  dynamicWallpaperVideoSrc,
  dynamicWallpaperPosterSrc,
  dynamicWallpaperPlaybackRate,
  wallpaperMaskOpacity,
  pauseDynamicWallpaper = false,
  reduceTopControlsEffects,
  reduceVisualEffects = false,
  timeFont,
  onTimeFontChange,
  layout,
	}: WallpaperClockProps) {
		const [timeDisplayDialogOpen, setTimeDisplayDialogOpen] = useState(false);
	  const [timeDisplayPreviewTime, setTimeDisplayPreviewTime] = useState(() => '');
	  const { i18n } = useTranslation();
	  const { date, lunar } = useClockDate(i18n.language, showLunar);
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
  const topNavLayerHeight = 40;

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
          ) : wallpaperMode === 'dynamic' ? (
            <WeatherLoopVideo
              className="absolute inset-0 w-full h-full object-cover"
              src={dynamicWallpaperVideoSrc}
              posterSrc={dynamicWallpaperPosterSrc}
              paused={pauseDynamicWallpaper}
              playbackRate={dynamicWallpaperPlaybackRate}
              smoothEndRamp={false}
            />
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

      <div
        className="absolute z-[14020] overflow-visible transform-gpu pointer-events-auto"
        style={{ left: edgeInset, right: edgeInset, top: edgeInset, height: topNavLayerHeight }}
      >
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

      <div className="hero-tint-text absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none transform-gpu">
	        <ClockTimeButton
	          is24Hour={is24Hour}
	          showSeconds={showSeconds}
	          timeAnimationEnabled={timeAnimationEnabled}
	          timeFont={timeFont}
	          fontSize={normalizedClockFontSize}
	          onClick={(time) => {
	            setTimeDisplayPreviewTime(time);
	            setTimeDisplayDialogOpen(true);
	          }}
	        />
	        <TimeDisplayDialog
          open={timeDisplayDialogOpen}
          onOpenChange={setTimeDisplayDialogOpen}
          currentFont={timeFont}
	          previewTime={timeDisplayPreviewTime}
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
            <Suspense fallback={null}>
              <LazyWeatherCard
                onWeatherUpdate={onWeatherUpdate}
                variant="inverted"
                displayMode="inline"
                className="w-fit max-w-full"
                textClassName="text-inherit"
              />
            </Suspense>
          </div>
        </div>
      </div>

    </div>
  );
});
