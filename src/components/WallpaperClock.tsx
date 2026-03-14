import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TimeFontDialog } from './TimeFontDialog';
import ScenarioModeMenu from './ScenarioModeMenu';
import { ScenarioMode } from "@/scenario/scenario";
import { TopNavBar } from './TopNavBar';
import imgImage from "../assets/Default_wallpaper.png";
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { WallpaperMaskOverlay } from './wallpaper/WallpaperMaskOverlay';
import { getColorWallpaperGradient } from './wallpaper/colorWallpapers';
import { SlidingClockTime } from '@/components/motion-primitives/sliding-clock-time';
import { weatherVideoMap, sunnyWeatherVideo } from './wallpaper/weatherWallpapers';
import { renderDynamicWallpaper } from './wallpaper/dynamicWallpapers';
import type { DynamicWallpaperEffect, WallpaperMode } from '@/wallpaper/types';
import { WeatherLoopVideo } from './wallpaper/WeatherLoopVideo';

interface WallpaperClockProps {
  time: string; 
  date: Date; 
  lunar: string; 
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
  dynamicWallpaperEffect: DynamicWallpaperEffect;
  weatherCode: number;
  onWeatherUpdate?: (code: number) => void;
  customWallpaper: string | null;
  colorWallpaperId: string;
  wallpaperMaskOpacity: number;
  timeFont: string;
  onTimeFontChange: (font: string) => void;
  layout?: ResponsiveLayout;
}

export function WallpaperClock({ 
  time, 
  date, 
  lunar, 
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
  dynamicWallpaperEffect,
  weatherCode,
  onWeatherUpdate,
  customWallpaper,
  colorWallpaperId,
  wallpaperMaskOpacity,
  timeFont,
  onTimeFontChange,
  layout,
}: WallpaperClockProps) {
  const [timeFontDialogOpen, setTimeFontDialogOpen] = useState(false);
  const { i18n } = useTranslation();

  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  const dateString = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
  const edgeInset = layout ? Math.max(16, Math.round((layout.wallpaperHeight / 220) * 24)) : 24;

  const weatherVideo = weatherVideoMap[weatherCode] || sunnyWeatherVideo;
  const colorWallpaperGradient = getColorWallpaperGradient(colorWallpaperId);

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
          ) : wallpaperMode === 'dynamic' ? (
            renderDynamicWallpaper(dynamicWallpaperEffect, 'hero')
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
          className="flex items-center gap-3 mt-2 font-['PingFang_SC',sans-serif] text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]"
          style={{ fontSize: layout?.clockMetaFontSize ?? 16 }}
        >
          <span>{dateString} {weekday}</span>
          {(i18n.language.startsWith('zh') || i18n.language.startsWith('ja') || i18n.language.startsWith('ko') || i18n.language.startsWith('vi')) && (
            <span>{lunar}</span>
          )}
        </div>
      </div>

    </div>
  );
}
