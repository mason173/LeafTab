import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RiArrowLeftSLine, RiArrowRightSLine, RiCheckFill } from "@remixicon/react";
import { WEATHER_PREVIEW_VIDEOS } from "@/components/wallpaper/weatherWallpapers";
import { WallpaperMaskOverlay } from "@/components/wallpaper/WallpaperMaskOverlay";
import { WallpaperMaskOpacitySlider } from "@/components/wallpaper/WallpaperMaskOpacitySlider";
import type { WallpaperMode } from "@/wallpaper/types";

interface WeatherWallpaperPanelProps {
  mode: WallpaperMode;
  wallpaperMaskOpacity: number;
  onWallpaperMaskOpacityChange: (value: number) => void;
  onModeChange: (mode: WallpaperMode) => void;
}

export function WeatherWallpaperPanel({
  mode,
  wallpaperMaskOpacity,
  onWallpaperMaskOpacityChange,
  onModeChange,
}: WeatherWallpaperPanelProps) {
  const { t } = useTranslation();
  const [weatherPreviewIndex, setWeatherPreviewIndex] = useState(0);
  const weatherPreviewVideos = useMemo(() => ([
    { id: "sunny", src: WEATHER_PREVIEW_VIDEOS.sunny, label: t("weather.codes.0", { defaultValue: "Sunny" }) },
    { id: "cloudy", src: WEATHER_PREVIEW_VIDEOS.cloudy, label: t("weather.codes.2", { defaultValue: "Cloudy" }) },
    { id: "foggy", src: WEATHER_PREVIEW_VIDEOS.foggy, label: t("weather.codes.45", { defaultValue: "Foggy" }) },
    { id: "rainy", src: WEATHER_PREVIEW_VIDEOS.rainy, label: t("weather.codes.61", { defaultValue: "Rainy" }) },
    { id: "snowy", src: WEATHER_PREVIEW_VIDEOS.snowy, label: t("weather.codes.71", { defaultValue: "Snowy" }) },
    { id: "thunderstorm", src: WEATHER_PREVIEW_VIDEOS.thunderstorm, label: t("weather.codes.95", { defaultValue: "Thunderstorm" }) },
  ]), [t]);
  const currentWeatherPreview = weatherPreviewVideos[weatherPreviewIndex] || weatherPreviewVideos[0];
  const showWeatherMaskSlider = mode === "weather";

  const goPrevWeatherPreview = () => {
    setWeatherPreviewIndex((prev) => (prev - 1 + weatherPreviewVideos.length) % weatherPreviewVideos.length);
  };

  const goNextWeatherPreview = () => {
    setWeatherPreviewIndex((prev) => (prev + 1) % weatherPreviewVideos.length);
  };

  return (
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
              aria-label={t("common.prev", { defaultValue: "Previous" })}
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
              aria-label={t("common.next", { defaultValue: "Next" })}
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
            <h4 className="text-sm font-medium leading-none">{t("weather.wallpaper.weather")}</h4>
            <p className="text-xs text-muted-foreground">{t("weather.wallpaper.weatherDesc")}</p>
          </div>
          <div className="flex justify-center">
            {mode === "weather" ? (
              <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                <RiCheckFill className="size-3.5" />
                {t("common.current")}
              </Button>
            ) : (
              <Button onClick={() => onModeChange("weather")} className="h-9 gap-2 min-w-[160px] text-sm">
                {t("weather.wallpaper.apply")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
