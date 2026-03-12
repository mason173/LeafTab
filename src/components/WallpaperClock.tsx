import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { TimeFontDialog } from './TimeFontDialog';
import WallpaperSelector, { weatherVideoMap, sunnyVideo } from './WallpaperSelector';
import ScenarioModeMenu from './ScenarioModeMenu';
import { ScenarioMode } from "@/scenario/scenario";
import { TopNavBar } from './TopNavBar';
import imgImage from "../assets/Default_wallpaper.png";
import type { ResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { WallpaperMaskOverlay } from './wallpaper/WallpaperMaskOverlay';
import { getColorWallpaperGradient } from './wallpaper/colorWallpapers';
import { SlidingClockTime } from '@/components/motion-primitives/sliding-clock-time';
import { Beams, Galaxy, Iridescence, LightRays, Prism, Silk } from '@/components/react-bits';

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
  wallpaperMode: 'bing' | 'weather' | 'color' | 'dynamic' | 'custom';
  onWallpaperModeChange: (mode: 'bing' | 'weather' | 'color' | 'dynamic' | 'custom') => void;
  dynamicWallpaperEffect: 'prism' | 'silk' | 'light-rays' | 'beams' | 'galaxy' | 'iridescence';
  onDynamicWallpaperEffectChange: (
    effect: 'prism' | 'silk' | 'light-rays' | 'beams' | 'galaxy' | 'iridescence'
  ) => void;
  weatherCode: number;
  onWeatherUpdate?: (code: number) => void;
  bingWallpaper: string;
  customWallpaper: string | null;
  onCustomWallpaperChange: (url: string) => void;
  colorWallpaperId: string;
  onColorWallpaperIdChange: (id: string) => void;
  wallpaperMaskOpacity: number;
  onWallpaperMaskOpacityChange: (value: number) => void;
  timeFont: string;
  onTimeFontChange: (font: string) => void;
  layout?: ResponsiveLayout;
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
  dynamicWallpaperEffect,
  onDynamicWallpaperEffectChange,
  weatherCode,
  onWeatherUpdate,
  bingWallpaper,
  customWallpaper,
  onCustomWallpaperChange,
  colorWallpaperId,
  onColorWallpaperIdChange,
  wallpaperMaskOpacity,
  onWallpaperMaskOpacityChange,
  timeFont,
  onTimeFontChange,
  layout,
}: WallpaperClockProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [overlayFailed, setOverlayFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [timeFontDialogOpen, setTimeFontDialogOpen] = useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    setIsLoaded(false);
    setOverlayFailed(false);
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
  const edgeInset = layout ? Math.max(16, Math.round((layout.wallpaperHeight / 220) * 24)) : 24;

  const weatherVideo = weatherVideoMap[weatherCode] || sunnyVideo;
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
            dynamicWallpaperEffect === 'silk' ? (
              <Silk
                speed={4.4}
                scale={0.95}
                color="#7B7481"
                noiseIntensity={1.2}
                rotation={0}
              />
            ) : dynamicWallpaperEffect === 'light-rays' ? (
              <LightRays
                raysOrigin="top-center"
                raysColor="#ffffff"
                raysSpeed={1.15}
                lightSpread={0.95}
                rayLength={1.6}
                fadeDistance={1}
                saturation={1}
                followMouse
                mouseInfluence={0.08}
                noiseAmount={0.04}
                distortion={0.04}
              />
            ) : dynamicWallpaperEffect === 'beams' ? (
              <Beams
                beamWidth={2}
                beamHeight={15}
                beamNumber={12}
                lightColor="#ffffff"
                speed={2}
                noiseIntensity={1.75}
                scale={0.2}
                rotation={0}
              />
            ) : dynamicWallpaperEffect === 'galaxy' ? (
              <Galaxy
                density={1.2}
                glowIntensity={0.35}
                saturation={0.5}
                hueShift={165}
                mouseRepulsion
                mouseInteraction
              />
            ) : dynamicWallpaperEffect === 'iridescence' ? (
              <Iridescence
                color={[1, 1, 1]}
                mouseReact
                amplitude={0.08}
                speed={1.0}
              />
            ) : (
              <Prism
                animationType="rotate"
                timeScale={0.35}
                scale={3.4}
                noise={0.35}
                glow={1}
              />
            )
          ) : wallpaperMode === 'color' ? (
            <div className="absolute inset-0" style={{ backgroundImage: colorWallpaperGradient }} />
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
                  animate={{ opacity: isLoaded || overlayFailed ? 1 : 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  onLoad={() => setIsLoaded(true)}
                  onError={() => {
                    setOverlayFailed(true);
                    setIsLoaded(false);
                  }}
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

      <WallpaperMaskOverlay opacity={wallpaperMaskOpacity} />

      <div className="absolute z-20 transform-gpu" style={{ left: edgeInset, right: edgeInset, top: edgeInset }}>
        <TopNavBar 
          onSettingsClick={onSettingsClick}
          settingsRevealOnHover
          onWeatherUpdate={onWeatherUpdate}
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

      <div
        className="absolute z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto transform-gpu"
        style={{ left: edgeInset, bottom: edgeInset }}
      >
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

      <div
        className="absolute z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto transform-gpu"
        style={{ right: edgeInset, bottom: edgeInset }}
      >
        <WallpaperSelector 
          mode={wallpaperMode} 
          onModeChange={onWallpaperModeChange} 
          dynamicWallpaperEffect={dynamicWallpaperEffect}
          onDynamicWallpaperEffectChange={onDynamicWallpaperEffectChange}
          bingWallpaper={bingWallpaper}
          weatherCode={weatherCode}
          customWallpaper={customWallpaper}
          onCustomWallpaperChange={onCustomWallpaperChange}
          colorWallpaperId={colorWallpaperId}
          onColorWallpaperIdChange={onColorWallpaperIdChange}
          wallpaperMaskOpacity={wallpaperMaskOpacity}
          onWallpaperMaskOpacityChange={onWallpaperMaskOpacityChange}
        />
      </div>
    </div>
  );
}
