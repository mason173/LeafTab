import React, { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeDisplayDialog } from './TimeDisplayDialog';
import ScenarioModeMenu from './ScenarioModeMenu';
import { ScenarioMode } from "@/scenario/scenario";
import { TopNavBar } from './TopNavBar';
import imgImage from "../assets/Default_wallpaper.png";
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useClock } from '@/hooks/useClock';
import { WallpaperMaskOverlay } from './wallpaper/WallpaperMaskOverlay';
import { getColorWallpaperGradient } from './wallpaper/colorWallpapers';
import { SlidingClockTime } from '@/components/motion-primitives/sliding-clock-time';
import { weatherVideoMap, sunnyWeatherVideo } from './wallpaper/weatherWallpapers';
import type { WallpaperMode } from '@/wallpaper/types';
import { WeatherLoopVideo } from './wallpaper/WeatherLoopVideo';

interface WallpaperClockProps {
  is24Hour: boolean;
  onIs24HourChange: (checked: boolean) => void;
  showSeconds: boolean;
  onShowSecondsChange: (checked: boolean) => void;
  showLunar: boolean;
  onShowLunarChange: (checked: boolean) => void;
  timeAnimationEnabled: boolean;
  onTimeAnimationModeChange: (mode: 'inherit' | 'on' | 'off') => void;
  bingWallpaperUrl: string;
  onSettingsClick?: () => void;
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
  showLunar,
  onShowLunarChange,
  timeAnimationEnabled,
  onTimeAnimationModeChange,
  bingWallpaperUrl,
  onSettingsClick,
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

  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const weekdayFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'long' }), [locale]);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }),
    [locale],
  );
  const weekday = weekdayFormatter.format(date);
  const dateString = dateFormatter.format(date);
  const edgeInset = layout ? Math.max(16, Math.round((layout.wallpaperHeight / 220) * 24)) : 24;

  const weatherVideo = weatherVideoMap[weatherCode] || sunnyWeatherVideo;
  const colorWallpaperGradient = getColorWallpaperGradient(colorWallpaperId);
  const resolvedReduceTopControlsEffects = reduceTopControlsEffects ?? reduceVisualEffects;

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
          {wallpaperMode === 'custom' && customWallpaper ? (
            <img 
              alt="" 
              className="w-full h-full object-cover" 
              src={customWallpaper} 
            />
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

      <div className="absolute z-20 transform-gpu" style={{ left: edgeInset, right: edgeInset, top: edgeInset }}>
        <TopNavBar 
          settingsRevealOnHover
          onSettingsClick={onSettingsClick}
          onWeatherUpdate={onWeatherUpdate}
          reduceVisualEffects={resolvedReduceTopControlsEffects}
          rightSlot={
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
          style={{ fontFamily: timeFont, fontSize: layout?.clockFontSize ?? 100 }}
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
          showSeconds={showSeconds}
          onShowSecondsChange={onShowSecondsChange}
          showLunar={showLunar}
          onShowLunarChange={onShowLunarChange}
          timeAnimationEnabled={timeAnimationEnabled}
          onTimeAnimationModeChange={onTimeAnimationModeChange}
          onSelect={onTimeFontChange}
        />
        <div
          className="flex items-center gap-3 mt-2 font-['PingFang_SC',sans-serif] text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]"
          style={{ fontSize: layout?.clockMetaFontSize ?? 16 }}
        >
          <span>{dateString} {weekday}</span>
          {showLunar && lunar ? <span>{lunar}</span> : null}
        </div>
      </div>

    </div>
  );
});
