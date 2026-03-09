import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { TimeFontDialog } from './TimeFontDialog';
import WallpaperSelector, { weatherVideoMap, sunnyVideo } from './WallpaperSelector';
import ScenarioModeMenu from './ScenarioModeMenu';
import { ScenarioMode } from "@/scenario/scenario";
import { TopNavBar } from './TopNavBar';
import imgImage from "../assets/Default_wallpaper.png";

interface WallpaperClockProps {
  time: string; 
  date: Date; 
  lunar: string; 
  wallpaperUrl: string;
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
  wallpaperMode: 'bing' | 'weather' | 'custom';
  onWallpaperModeChange: (mode: 'bing' | 'weather' | 'custom') => void;
  weatherCode: number;
  onWeatherUpdate?: (code: number) => void;
  bingWallpaper: string;
  customWallpaper: string | null;
  onCustomWallpaperChange: (url: string) => void;
  timeFont: string;
  onTimeFontChange: (font: string) => void;
}

export function WallpaperClock({ 
  time, 
  date, 
  lunar, 
  wallpaperUrl,
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
  onWallpaperModeChange,
  weatherCode,
  onWeatherUpdate,
  bingWallpaper,
  customWallpaper,
  onCustomWallpaperChange,
  timeFont,
  onTimeFontChange
}: WallpaperClockProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [timeFontDialogOpen, setTimeFontDialogOpen] = useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    setIsLoaded(false);
  }, [wallpaperUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = 0.7;

    const handleTimeUpdate = () => {
      const timeLeft = video.duration - video.currentTime;
      if (timeLeft > 0 && timeLeft < 1.5) {
        const newRate = Math.max(0.1, 0.7 * (timeLeft / 1.5));
        video.playbackRate = newRate;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [weatherCode, wallpaperMode]);

  const locale = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
  const dateString = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(date);

  const weatherVideo = weatherVideoMap[weatherCode] || sunnyVideo;

  return (
    <div className="relative w-[803px] h-[220px] rounded-[28px] overflow-hidden group select-none shadow-sm">
      <div className="absolute inset-0 bg-muted">
        <div className="w-full h-full transition-transform duration-[3000ms] ease-out transform-gpu group-hover:scale-[1.1]">
          {wallpaperMode === 'custom' && customWallpaper ? (
            <img 
              alt="" 
              className="w-full h-full object-cover" 
              src={customWallpaper} 
            />
          ) : wallpaperMode === 'bing' ? (
            <>
              <img 
                alt="" 
                className="w-full h-full object-cover" 
                src={imgImage} 
              />
              {wallpaperUrl && wallpaperUrl !== imgImage && (
                <motion.img 
                  key={wallpaperUrl}
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover" 
                  src={wallpaperUrl} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isLoaded ? 1 : 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  onLoad={() => setIsLoaded(true)}
                />
              )}
            </>
          ) : (
            <video 
              ref={videoRef}
              key={weatherVideo}
              className="absolute inset-0 w-full h-full object-cover" 
              src={weatherVideo}
              autoPlay
              muted
              playsInline
            />
          )}
        </div>
      </div>

      <div className="absolute inset-0 bg-black/5 pointer-events-none" />

      <div className="absolute inset-x-6 top-6 z-20 transform-gpu">
        <TopNavBar 
          onSettingsClick={onSettingsClick}
          settingsRevealOnHover
          showScenarioMode={showScenarioMode}
          scenarioModes={scenarioModes}
          selectedScenarioId={selectedScenarioId}
          scenarioModeOpen={scenarioModeOpen}
          onScenarioModeOpenChange={onScenarioModeOpenChange}
          onScenarioModeSelect={onScenarioModeSelect}
          onScenarioModeCreate={onScenarioModeCreate}
          onScenarioModeEdit={onScenarioModeEdit}
          onScenarioModeDelete={onScenarioModeDelete}
          onWeatherUpdate={onWeatherUpdate}
        />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 pointer-events-none transform-gpu">
        <button
          type="button"
          className="text-[100px] font-thin leading-none tracking-tight text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)] cursor-pointer hover:opacity-80 transition-opacity pointer-events-auto select-none bg-transparent p-0 border-0"
          style={{ fontFamily: timeFont }}
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
        <div className="flex items-center gap-3 text-base mt-2 font-['PingFang_SC',sans-serif] text-shadow-[0_0_16.4px_rgba(0,0,0,0.24)]">
          <span>{dateString} {weekday}</span>
          {(i18n.language.startsWith('zh') || i18n.language.startsWith('ja') || i18n.language.startsWith('ko') || i18n.language.startsWith('vi')) && (
            <span>{lunar}</span>
          )}
        </div>
      </div>

      <div className="absolute left-6 bottom-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto transform-gpu">
        {showScenarioMode && (
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
        )}
      </div>

      <div className="absolute right-6 bottom-6 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto transform-gpu">
        <WallpaperSelector 
          mode={wallpaperMode} 
          onModeChange={onWallpaperModeChange} 
          bingWallpaper={bingWallpaper}
          weatherCode={weatherCode}
          customWallpaper={customWallpaper}
          onCustomWallpaperChange={onCustomWallpaperChange}
        />
      </div>
    </div>
  );
}
