import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCheckFill, RiDownload2Fill, RiImageFill, RiUpload2Fill } from "@remixicon/react";
import { useTranslation } from "react-i18next";
import { forwardRef, useMemo, useRef, useState } from "react";
import { Magnetic } from "@/components/motion-primitives/magnetic";
import { Beams, Galaxy, Iridescence, LightRays, Prism, Silk } from "@/components/react-bits";
import { saveWallpaper } from "../db";
import imgImage from "../assets/Default_wallpaper.png";
import { WallpaperMaskOverlay } from "./wallpaper/WallpaperMaskOverlay";
import { WallpaperMaskOpacitySlider } from "./wallpaper/WallpaperMaskOpacitySlider";
import { COLOR_WALLPAPER_PRESETS } from "./wallpaper/colorWallpapers";

// Weather Wallpaper Assets
import cloudyVideo from "../assets/weather/Cloudy.mp4";
import foggyVideo from "../assets/weather/Foggy day.mp4";
import sunnyVideo from "../assets/weather/Sunny day.mp4";
import thunderstormVideo from "../assets/weather/Thunderstorm.mp4";
import rainingVideo from "../assets/weather/raining.mp4";
import snowingVideo from "../assets/weather/snowing.mp4";

export const weatherVideoMap: Record<number, string> = {
  0: sunnyVideo,
  1: sunnyVideo,
  2: cloudyVideo,
  3: cloudyVideo,
  45: foggyVideo,
  48: foggyVideo,
  51: rainingVideo,
  53: rainingVideo,
  55: rainingVideo,
  56: rainingVideo,
  57: rainingVideo,
  61: rainingVideo,
  63: rainingVideo,
  65: rainingVideo,
  66: rainingVideo,
  67: rainingVideo,
  71: snowingVideo,
  73: snowingVideo,
  75: snowingVideo,
  77: snowingVideo,
  80: rainingVideo,
  81: rainingVideo,
  82: rainingVideo,
  85: snowingVideo,
  86: snowingVideo,
  95: thunderstormVideo,
  96: thunderstormVideo,
  99: thunderstormVideo,
};

export { sunnyVideo };

type DynamicWallpaperEffect = WallpaperSelectorProps["dynamicWallpaperEffect"];

const DYNAMIC_EFFECTS: Array<{
  id: DynamicWallpaperEffect;
  label: string;
  staticBackground: string;
}> = [
  {
    id: "prism",
    label: "Prism",
    staticBackground: "linear-gradient(140deg, #111827 0%, #1e293b 45%, #64748b 100%)",
  },
  {
    id: "silk",
    label: "Silk",
    staticBackground: "radial-gradient(circle at 20% 15%, #b8acbf 0%, #6b6572 40%, #1f1f23 100%)",
  },
  {
    id: "light-rays",
    label: "Light Rays",
    staticBackground: "linear-gradient(165deg, #f8fafc 0%, #dbeafe 48%, #475569 100%)",
  },
  {
    id: "beams",
    label: "Beams",
    staticBackground: "linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #64748b 100%)",
  },
  {
    id: "galaxy",
    label: "Galaxy",
    staticBackground: "radial-gradient(circle at 30% 18%, #67e8f9 0%, #1e293b 36%, #020617 82%)",
  },
  {
    id: "iridescence",
    label: "Iridescence",
    staticBackground: "linear-gradient(130deg, #fef3c7 0%, #fbcfe8 35%, #bfdbfe 68%, #d9f99d 100%)",
  },
];

const DYNAMIC_EFFECT_LABELS: Record<DynamicWallpaperEffect, string> = {
  prism: "Prism",
  silk: "Silk",
  "light-rays": "Light Rays",
  beams: "Beams",
  galaxy: "Galaxy",
  iridescence: "Iridescence",
};

function renderDynamicLiveEffect(effect: DynamicWallpaperEffect) {
  switch (effect) {
    case "silk":
      return (
        <Silk
          speed={3.8}
          scale={0.9}
          color="#7B7481"
          noiseIntensity={1.2}
          rotation={0}
        />
      );
    case "light-rays":
      return (
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={1.05}
          lightSpread={0.9}
          rayLength={1.5}
          fadeDistance={1}
          saturation={1}
          followMouse={false}
          mouseInfluence={0.06}
          noiseAmount={0.02}
          distortion={0.03}
        />
      );
    case "beams":
      return (
        <Beams
          beamWidth={2}
          beamHeight={15}
          beamNumber={10}
          lightColor="#ffffff"
          speed={1.8}
          noiseIntensity={1.4}
          scale={0.2}
          rotation={0}
        />
      );
    case "galaxy":
      return (
        <Galaxy
          density={1.2}
          glowIntensity={0.35}
          saturation={0.5}
          hueShift={165}
          mouseRepulsion
          mouseInteraction
        />
      );
    case "iridescence":
      return (
        <Iridescence
          color={[1, 1, 1]}
          mouseReact={false}
          amplitude={0.08}
          speed={1}
        />
      );
    case "prism":
    default:
      return (
        <Prism
          animationType="rotate"
          timeScale={0.35}
          scale={3.1}
          noise={0.35}
          glow={1}
          suspendWhenOffscreen
        />
      );
  }
}

function renderDynamicStaticEffect(effect: DynamicWallpaperEffect) {
  switch (effect) {
    case "silk":
      return (
        <Silk
          speed={3.8}
          scale={0.9}
          color="#7B7481"
          noiseIntensity={1.2}
          rotation={0}
          staticFrame
        />
      );
    case "light-rays":
      return (
        <LightRays
          raysOrigin="top-center"
          raysColor="#ffffff"
          raysSpeed={1.05}
          lightSpread={0.9}
          rayLength={1.5}
          fadeDistance={1}
          saturation={1}
          followMouse={false}
          mouseInfluence={0.06}
          noiseAmount={0.02}
          distortion={0.03}
          staticFrame
        />
      );
    case "beams":
      return (
        <Beams
          beamWidth={2}
          beamHeight={15}
          beamNumber={10}
          lightColor="#ffffff"
          speed={1.8}
          noiseIntensity={1.4}
          scale={0.2}
          rotation={0}
          staticFrame
        />
      );
    case "galaxy":
      return (
        <Galaxy
          density={1.2}
          glowIntensity={0.35}
          saturation={0.5}
          hueShift={165}
          mouseRepulsion
          mouseInteraction={false}
          disableAnimation
        />
      );
    case "iridescence":
      return (
        <Iridescence
          color={[1, 1, 1]}
          mouseReact={false}
          amplitude={0.08}
          speed={1}
          staticFrame
        />
      );
    case "prism":
    default:
      return (
        <Prism
          animationType="rotate"
          timeScale={0}
          scale={3.1}
          noise={0}
          glow={1}
          suspendWhenOffscreen
        />
      );
  }
}

const WallpaperDialogTrigger = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function WallpaperDialogTrigger({ className = "", ...props }, ref) {
    return (
      <Magnetic intensity={0.34} range={116}>
        <div
          ref={ref}
          className={`bg-white/10 content-stretch flex items-center justify-center p-[6px] relative rounded-[999px] shrink-0 cursor-pointer hover:bg-white/20 transition-colors text-white/90 backdrop-blur-md transform-gpu ${className}`}
          data-name="Wallpaper"
          {...props}
        >
          <div aria-hidden="true" className="absolute border border-white/10 border-solid inset-0 pointer-events-none rounded-[999px]" />
          <RiImageFill className="size-5" />
        </div>
      </Magnetic>
    );
  },
);

interface WallpaperSelectorProps {
  mode: 'bing' | 'weather' | 'color' | 'dynamic' | 'custom';
  onModeChange: (mode: 'bing' | 'weather' | 'color' | 'dynamic' | 'custom') => void;
  dynamicWallpaperEffect: 'prism' | 'silk' | 'light-rays' | 'beams' | 'galaxy' | 'iridescence';
  onDynamicWallpaperEffectChange: (
    effect: 'prism' | 'silk' | 'light-rays' | 'beams' | 'galaxy' | 'iridescence'
  ) => void;
  bingWallpaper: string;
  weatherCode: number;
  customWallpaper: string | null;
  onCustomWallpaperChange: (url: string) => void;
  colorWallpaperId: string;
  onColorWallpaperIdChange: (id: string) => void;
  wallpaperMaskOpacity: number;
  onWallpaperMaskOpacityChange: (value: number) => void;
  hideWeather?: boolean;
  trigger?: React.ReactNode;
}

export default function WallpaperSelector({ 
  mode, 
  onModeChange,
  dynamicWallpaperEffect,
  onDynamicWallpaperEffectChange,
  bingWallpaper,
  weatherCode,
  customWallpaper,
  onCustomWallpaperChange,
  colorWallpaperId,
  onColorWallpaperIdChange,
  wallpaperMaskOpacity,
  onWallpaperMaskOpacityChange,
  hideWeather = false,
  trigger
}: WallpaperSelectorProps) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [weatherPreviewIndex, setWeatherPreviewIndex] = useState(0);
  const weatherPreviewVideos = useMemo(() => ([
    { id: "sunny", src: sunnyVideo, label: t('weather.codes.0', { defaultValue: 'Sunny' }) },
    { id: "cloudy", src: cloudyVideo, label: t('weather.codes.2', { defaultValue: 'Cloudy' }) },
    { id: "foggy", src: foggyVideo, label: t('weather.codes.45', { defaultValue: 'Foggy' }) },
    { id: "rainy", src: rainingVideo, label: t('weather.codes.61', { defaultValue: 'Rainy' }) },
    { id: "snowy", src: snowingVideo, label: t('weather.codes.71', { defaultValue: 'Snowy' }) },
    { id: "thunderstorm", src: thunderstormVideo, label: t('weather.codes.95', { defaultValue: 'Thunderstorm' }) },
  ]), [t]);
  const currentWeatherPreview = weatherPreviewVideos[weatherPreviewIndex] || weatherPreviewVideos[0];
  const showBingMaskSlider = mode === 'bing';
  const showWeatherMaskSlider = mode === 'weather';
  const showCustomMaskSlider = mode === 'custom' && !!customWallpaper;
  const goPrevWeatherPreview = () => {
    setWeatherPreviewIndex((prev) => (prev - 1 + weatherPreviewVideos.length) % weatherPreviewVideos.length);
  };
  const goNextWeatherPreview = () => {
    setWeatherPreviewIndex((prev) => (prev + 1) % weatherPreviewVideos.length);
  };
  
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed, falling back to direct link:', error);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleBingDownload = async () => {
    try {
      const market = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
      const response = await fetch(`https://bing.biturl.top/?resolution=UHD&format=json&index=0&mkt=${market}`);
      const data = await response.json();
      
      if (data.url) {
        handleDownload(data.url, 'bing-wallpaper-4k.jpg');
      } else {
        handleDownload(bingWallpaper || imgImage, 'bing-wallpaper.jpg');
      }
    } catch (error) {
      console.error('Failed to fetch 4K wallpaper:', error);
      handleDownload(bingWallpaper || imgImage, 'bing-wallpaper.jpg');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const url = event.target?.result as string;
        try {
          await saveWallpaper(url);
          onCustomWallpaperChange(url);
          onModeChange('custom');
        } catch (error) {
          console.error('Failed to save wallpaper:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || <WallpaperDialogTrigger />}
      </DialogTrigger>
      <DialogContent className="max-w-[480px] bg-popover/95 backdrop-blur-xl border-white/10 rounded-[32px] overflow-hidden p-0 shadow-2xl [&>button]:text-foreground [&>button]:opacity-70 [&>button:hover]:opacity-100">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">{t('weather.wallpaper.mode')}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue={mode} className="w-full flex-1 flex flex-col">
            <div className="px-6 pb-4">
              <TabsList className={`grid w-full ${hideWeather ? 'grid-cols-4' : 'grid-cols-5'} rounded-[16px]`}>
                <TabsTrigger value="bing" className="rounded-xl">
                  {t('weather.wallpaper.bing')}
                </TabsTrigger>
                {!hideWeather && (
                  <TabsTrigger value="weather" className="rounded-xl">
                    {t('weather.wallpaper.weather')}
                  </TabsTrigger>
                )}
                <TabsTrigger value="color" className="rounded-xl">
                  {t('weather.wallpaper.color', { defaultValue: '颜色' })}
                </TabsTrigger>
                <TabsTrigger value="dynamic" className="rounded-xl">
                  {t('weather.wallpaper.dynamic', { defaultValue: '灵动' })}
                </TabsTrigger>
                <TabsTrigger value="custom" className="rounded-xl">
                  {t('weather.wallpaper.custom')}
                </TabsTrigger>
              </TabsList>
            </div>
            
            <Separator className="bg-border/40" />

            <div className="p-4">
              <TabsContent value="bing" disableAnimation className="mt-0 outline-none">
                <div className="flex flex-col gap-4">
                  <div className="relative aspect-video rounded-[24px] overflow-hidden border border-border/50 group bg-muted/20">
                    <img src={bingWallpaper || imgImage} alt="Bing" className="w-full h-full object-cover" />
                    <WallpaperMaskOverlay opacity={wallpaperMaskOpacity} className="absolute inset-0 pointer-events-none" />
                    {showBingMaskSlider ? (
                      <div className="absolute left-1/2 top-3 z-20 w-[72%] -translate-x-1/2">
                        <WallpaperMaskOpacitySlider
                          value={wallpaperMaskOpacity}
                          onChange={onWallpaperMaskOpacityChange}
                        />
                      </div>
                    ) : null}
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 text-white border-none"
                        onClick={handleBingDownload}
                        title={t('weather.wallpaper.download')}
                      >
                        <RiDownload2Fill className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium leading-none">{t('weather.wallpaper.bing')}</h4>
                      <p className="text-xs text-muted-foreground">
                        {t('weather.wallpaper.bingDesc')}
                      </p>
                    </div>
                    <div className="flex justify-center">
                      {mode === 'bing' ? (
                        <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                          <RiCheckFill className="size-3.5" />
                          {t('common.current')}
                        </Button>
                      ) : (
                        <Button onClick={() => onModeChange('bing')} className="h-9 gap-2 min-w-[160px] text-sm">
                          {t('weather.wallpaper.apply')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {!hideWeather && (
                <TabsContent value="weather" disableAnimation className="mt-0 outline-none">
                  <div className="flex flex-col gap-4">
                    <div className="relative aspect-video rounded-[24px] overflow-hidden border border-border/50 bg-transparent group">
                      <video
                        key={currentWeatherPreview.id}
                        src={currentWeatherPreview.src}
                        className="h-full w-full object-cover object-center"
                        muted
                        autoPlay
                        playsInline
                      />
                      <WallpaperMaskOverlay opacity={wallpaperMaskOpacity} className="absolute inset-0 pointer-events-none" />
                      {showWeatherMaskSlider ? (
                        <div className="absolute left-1/2 top-3 z-20 w-[72%] -translate-x-1/2">
                          <WallpaperMaskOpacitySlider
                            value={wallpaperMaskOpacity}
                            onChange={onWallpaperMaskOpacityChange}
                          />
                        </div>
                      ) : null}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      <div className="absolute inset-y-0 left-2 flex items-center opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-black/35 text-white border-white/20 hover:bg-black/55"
                          onClick={goPrevWeatherPreview}
                          aria-label={t('common.prev', { defaultValue: 'Previous' })}
                        >
                          <RiArrowLeftSLine className="size-5" />
                        </Button>
                      </div>
                      <div className="absolute inset-y-0 right-2 flex items-center opacity-0 transition-opacity duration-200 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="h-8 w-8 rounded-full bg-black/35 text-white border-white/20 hover:bg-black/55"
                          onClick={goNextWeatherPreview}
                          aria-label={t('common.next', { defaultValue: 'Next' })}
                        >
                          <RiArrowRightSLine className="size-5" />
                        </Button>
                      </div>
                      <div className="absolute left-3 bottom-3 rounded-md border border-white/20 bg-black/35 px-2 py-0.5 text-[11px] text-white">
                        {currentWeatherPreview.label}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium leading-none">{t('weather.wallpaper.weather')}</h4>
                        <p className="text-xs text-muted-foreground">
                          {t('weather.wallpaper.weatherDesc')}
                        </p>
                      </div>
                      <div className="flex justify-center">
                        {mode === 'weather' ? (
                          <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                            <RiCheckFill className="size-3.5" />
                            {t('common.current')}
                          </Button>
                        ) : (
                          <Button onClick={() => onModeChange('weather')} className="h-9 gap-2 min-w-[160px] text-sm">
                            {t('weather.wallpaper.apply')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="color" disableAnimation className="mt-0 outline-none">
                <div className="flex flex-col gap-4">
                  <div className="relative aspect-video rounded-[24px] overflow-hidden border border-border/50 bg-background group p-3">
                    <WallpaperMaskOverlay opacity={wallpaperMaskOpacity} className="absolute inset-0 pointer-events-none" />
                    <div className="relative z-20 grid h-full grid-cols-4 gap-2">
                      {COLOR_WALLPAPER_PRESETS.map((preset) => {
                        const selected = colorWallpaperId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            className={`relative no-pill-radius rounded-[20px] border transition-transform duration-200 ${
                              selected
                                ? 'border-white ring-2 ring-white/90'
                                : 'border-white/40 hover:scale-[1.03]'
                            }`}
                            style={{ backgroundImage: preset.gradient }}
                            onClick={() => {
                              onColorWallpaperIdChange(preset.id);
                              onModeChange('color');
                            }}
                            title={preset.name}
                          >
                            {selected ? (
                              <span className="absolute right-1 top-1 rounded-full bg-black/35 p-0.5 text-white">
                                <RiCheckFill className="size-3" />
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium leading-none">{t('weather.wallpaper.color', { defaultValue: '颜色' })}</h4>
                      <p className="text-xs text-muted-foreground">
                        {t('weather.wallpaper.colorDesc', { defaultValue: '从 12 组淡雅渐变中选择你喜欢的颜色壁纸。' })}
                      </p>
                    </div>
                    <div className="flex justify-center">
                      {mode === 'color' ? (
                        <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                          <RiCheckFill className="size-3.5" />
                          {t('common.current')}
                        </Button>
                      ) : (
                        <Button onClick={() => onModeChange('color')} className="h-9 gap-2 min-w-[160px] text-sm">
                          {t('weather.wallpaper.apply')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="custom" disableAnimation className="mt-0 outline-none">
                <div className="flex flex-col gap-4">
                  <div 
                    onClick={() => !customWallpaper && fileInputRef.current?.click()}
                    className={`relative aspect-video rounded-[24px] overflow-hidden border transition-all group ${
                      !customWallpaper 
                        ? 'border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 cursor-pointer flex flex-col items-center justify-center gap-3' 
                        : 'border-border/50'
                    }`}
                  >
                    {customWallpaper ? (
                      <>
                        <img src={customWallpaper} alt="Custom" className="w-full h-full object-cover" />
                        <WallpaperMaskOverlay opacity={wallpaperMaskOpacity} className="absolute inset-0 pointer-events-none" />
                        {showCustomMaskSlider ? (
                          <div className="absolute left-1/2 top-3 z-20 w-[72%] -translate-x-1/2">
                            <WallpaperMaskOpacitySlider
                              value={wallpaperMaskOpacity}
                              onChange={onWallpaperMaskOpacityChange}
                            />
                          </div>
                        ) : null}
                        <div className="absolute inset-0 z-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <Button 
                            variant="secondary" 
                            className="h-9 gap-2 bg-white/20 backdrop-blur-md text-white hover:bg-white/30 border-none text-sm"
                            onClick={handleUploadClick}
                          >
                            <RiUpload2Fill className="size-3.5" />
                            {t('weather.wallpaper.upload')}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                        <div className="p-3 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                          <RiUpload2Fill className="size-6" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">{t('weather.wallpaper.uploadTitle')}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t('weather.wallpaper.imageSupport')}</p>
                        </div>
                      </div>
                    )}
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium leading-none">{t('weather.wallpaper.custom')}</h4>
                      <p className="text-xs text-muted-foreground">
                        {customWallpaper ? t('weather.wallpaper.customUploaded') : t('weather.wallpaper.customDesc')}
                      </p>
                    </div>
                    <div className="flex justify-center">
                      {mode === 'custom' ? (
                        <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                          <RiCheckFill className="size-3.5" />
                          {t('common.current')}
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => {
                            if (customWallpaper) onModeChange('custom');
                            else fileInputRef.current?.click();
                          }} 
                          disabled={!customWallpaper}
                          className="h-9 gap-2 min-w-[160px] text-sm"
                        >
                          {t('weather.wallpaper.apply')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="dynamic" disableAnimation className="mt-0 outline-none">
                <div className="flex flex-col gap-4">
                  <div className="relative h-[268px] rounded-[24px] overflow-hidden border border-border/50 bg-background p-3">
                    <WallpaperMaskOverlay opacity={wallpaperMaskOpacity} className="absolute inset-0 pointer-events-none" />
                    <div className="no-scrollbar relative z-20 h-full overflow-y-auto pr-1">
                      <div className="grid grid-cols-2 auto-rows-[118px] gap-2">
                        {DYNAMIC_EFFECTS.map((effect) => {
                          const isSelected = mode === 'dynamic' && dynamicWallpaperEffect === effect.id;
                          const isLive = mode === 'dynamic' && dynamicWallpaperEffect === effect.id;
                          return (
                            <button
                              key={effect.id}
                              type="button"
                              className={`no-pill-radius relative h-full w-full overflow-hidden rounded-[20px] border transition-transform duration-200 ${
                                isSelected
                                  ? 'border-primary ring-2 ring-primary/80'
                                  : 'border-border/70 hover:scale-[1.02]'
                              }`}
                              onClick={() => {
                                onDynamicWallpaperEffectChange(effect.id);
                                onModeChange('dynamic');
                              }}
                              title={effect.label}
                            >
                              <div className="absolute inset-0 bg-black/10" />
                              <div className="absolute inset-0" style={{ background: effect.staticBackground }}>
                                {isLive ? (
                                  <div className="absolute inset-0">
                                    {renderDynamicLiveEffect(effect.id)}
                                  </div>
                                ) : (
                                  <div className="absolute inset-0">
                                    {renderDynamicStaticEffect(effect.id)}
                                  </div>
                                )}
                              </div>
                              <span className="absolute bottom-1.5 left-1.5 z-20 rounded-md border border-white/20 bg-black/35 px-1.5 py-0.5 text-[10px] text-white">
                                {effect.label}
                              </span>
                              {isSelected ? (
                                <span className="absolute right-1.5 top-1.5 z-20 rounded-full bg-black/45 p-0.5 text-white">
                                  <RiCheckFill className="size-3" />
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium leading-none">{t('weather.wallpaper.dynamic', { defaultValue: '灵动' })}</h4>
                      <p className="text-xs text-muted-foreground">
                        {DYNAMIC_EFFECT_LABELS[dynamicWallpaperEffect]}
                      </p>
                    </div>
                    <div className="flex justify-center">
                      {mode === 'dynamic' ? (
                        <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                          <RiCheckFill className="size-3.5" />
                          {t('common.current')}
                        </Button>
                      ) : (
                        <Button onClick={() => onModeChange('dynamic')} className="h-9 gap-2 min-w-[160px] text-sm">
                          {t('weather.wallpaper.apply')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
