import { Dialog, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch, SwitchThumb } from "@/components/animate-ui/primitives/radix/switch";
import { RiImageFill } from "@/icons/ri-compat";
import { useTranslation } from "react-i18next";
import { forwardRef, useEffect, useState } from "react";
import type { BingWallpaperRefreshResult } from "@/hooks/useWallpaper";
import type { WallpaperMode } from "@/wallpaper/types";
import { BackToSettingsButton } from "@/components/BackToSettingsButton";
import { BingWallpaperPanel } from "./wallpaper/panels/BingWallpaperPanel";
import { WeatherWallpaperPanel } from "./wallpaper/panels/WeatherWallpaperPanel";
import { ColorWallpaperPanel } from "./wallpaper/panels/ColorWallpaperPanel";
import { CustomWallpaperPanel } from "./wallpaper/panels/CustomWallpaperPanel";
import { isFirefoxBuildTarget } from "@/platform/browserTarget";
import { SettingsDialogContent } from "@/components/settings/SettingsDialogSurface";

const WallpaperDialogTrigger = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function WallpaperDialogTrigger({ className = "", ...props }, ref) {
    const firefox = isFirefoxBuildTarget();
    return (
      <div
        ref={ref}
        className={`${firefox ? 'bg-white/12 hover:bg-white/18' : 'bg-white/10 hover:bg-white/20 backdrop-blur-md transform-gpu'} content-stretch flex items-center justify-center p-[6px] relative rounded-[999px] shrink-0 cursor-pointer transition-colors text-white/90 ${className}`}
        data-name="Wallpaper"
        {...props}
      >
        <div aria-hidden="true" className="absolute border border-white/10 border-solid inset-0 pointer-events-none rounded-[999px]" />
        <RiImageFill className="size-5" />
      </div>
    );
  },
);

interface WallpaperSelectorProps {
  mode: WallpaperMode;
  onModeChange: (mode: WallpaperMode) => void;
  bingWallpaper: string;
  isBingWallpaperRefreshing?: boolean;
  onRefreshBingWallpaper?: () => Promise<BingWallpaperRefreshResult> | BingWallpaperRefreshResult;
  weatherCode: number;
  customWallpaper: string | null;
  onCustomWallpaperChange: (url: string) => void;
  colorWallpaperId: string;
  onColorWallpaperIdChange: (id: string) => void;
  wallpaperMaskOpacity: number;
  effectiveWallpaperMaskOpacity?: number;
  onWallpaperMaskOpacityChange: (value: number) => void;
  darkModeAutoDimWallpaperEnabled: boolean;
  onDarkModeAutoDimWallpaperEnabledChange: (enabled: boolean) => void;
  hideWeather?: boolean;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onBackToSettings?: () => void;
}

export default function WallpaperSelector({
  mode,
  onModeChange,
  bingWallpaper,
  isBingWallpaperRefreshing = false,
  onRefreshBingWallpaper,
  customWallpaper,
  onCustomWallpaperChange,
  colorWallpaperId,
  onColorWallpaperIdChange,
  wallpaperMaskOpacity,
  effectiveWallpaperMaskOpacity,
  onWallpaperMaskOpacityChange,
  darkModeAutoDimWallpaperEnabled,
  onDarkModeAutoDimWallpaperEnabledChange,
  hideWeather = false,
  trigger,
  open,
  onOpenChange,
  onBackToSettings,
}: WallpaperSelectorProps) {
  const firefox = isFirefoxBuildTarget();
  const { t } = useTranslation();
  const [isMaskSliderInteracting, setIsMaskSliderInteracting] = useState(false);
  const [activeTab, setActiveTab] = useState<WallpaperMode>(mode);
  const isMaskSliderIsolation = isMaskSliderInteracting && (mode === "bing" || mode === "custom" || mode === "weather");
  const isolationFadeClass = "transition-opacity duration-220 ease-out";
  const previewWallpaperMaskOpacity = effectiveWallpaperMaskOpacity ?? wallpaperMaskOpacity;

  useEffect(() => {
    setActiveTab(mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "bing" && mode !== "custom" && mode !== "weather") {
      setIsMaskSliderInteracting(false);
    }
  }, [mode]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setIsMaskSliderInteracting(false);
    }
    onOpenChange?.(nextOpen);
  };

  const handleTabChange = (nextValue: string) => {
    const nextMode = nextValue as WallpaperMode;
    setActiveTab(nextMode);

    if (nextMode === "custom" && !customWallpaper) {
      return;
    }

    onModeChange(nextMode);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <WallpaperDialogTrigger />}
      </DialogTrigger>
      <SettingsDialogContent
        overlayClassName={`transition-opacity duration-220 ease-out ${isMaskSliderIsolation ? "!opacity-0 !bg-black/0" : ""}`}
        fakeBlurDisabled={isMaskSliderIsolation}
        className={`max-w-[480px] rounded-[32px] overflow-hidden p-0 transition-[background-color,border-color,box-shadow] duration-220 ease-out [&>button]:text-foreground ${
          isMaskSliderIsolation
            ? "bg-transparent border-transparent shadow-none backdrop-blur-none [&>button]:opacity-0 [&>button]:pointer-events-none"
            : firefox
              ? "border-white/10 shadow-lg [&>button]:opacity-70 [&>button:hover]:opacity-100"
              : "border-white/10 shadow-2xl [&>button]:opacity-70 [&>button:hover]:opacity-100"
        }`}
      >
        <div className="flex flex-col h-full">
          <DialogHeader className={`px-6 pt-6 pb-2 ${isolationFadeClass} ${isMaskSliderIsolation ? "opacity-0 pointer-events-none select-none" : ""}`}>
            <div className="flex items-center gap-2">
              <BackToSettingsButton onClick={onBackToSettings} />
              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">{t("weather.wallpaper.mode")}</DialogTitle>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex-1 flex flex-col">
            <div className={`px-6 pb-4 ${isolationFadeClass} ${isMaskSliderIsolation ? "opacity-0 pointer-events-none select-none" : ""}`}>
              <TabsList className={`grid w-full ${hideWeather ? "grid-cols-3" : "grid-cols-4"} rounded-[16px]`}>
                <TabsTrigger
                  value="bing"
                  className="rounded-xl truncate text-[13px]"
                  title={t("weather.wallpaper.bing")}
                >
                  {t("weather.wallpaper.bing")}
                </TabsTrigger>
                {!hideWeather && (
                  <TabsTrigger
                    value="weather"
                    className="rounded-xl truncate text-[13px]"
                    title={t("weather.wallpaper.weather")}
                  >
                    {t("weather.wallpaper.weather")}
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="color"
                  className="rounded-xl truncate text-[13px]"
                  title={t("weather.wallpaper.color", { defaultValue: "Color" })}
                >
                  {t("weather.wallpaper.color", { defaultValue: "Color" })}
                </TabsTrigger>
                <TabsTrigger
                  value="custom"
                  className="rounded-xl truncate text-[13px]"
                  title={t("weather.wallpaper.custom")}
                >
                  {t("weather.wallpaper.custom")}
                </TabsTrigger>
              </TabsList>
            </div>

            <div className={`px-6 pb-4 ${isolationFadeClass} ${isMaskSliderIsolation ? "opacity-0 pointer-events-none select-none" : ""}`}>
              <div className="flex items-center justify-between gap-3 px-1 py-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-none">
                    {t("weather.wallpaper.autoDimInDarkMode", { defaultValue: "深色模式自动调暗壁纸" })}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
                    {t("weather.wallpaper.autoDimInDarkModeDesc", { defaultValue: "深色模式下自动额外增加黑色遮罩，提升可读性。" })}
                  </p>
                </div>
                <Switch
                  id="wallpaper-auto-dim-in-dark-mode"
                  checked={darkModeAutoDimWallpaperEnabled}
                  onCheckedChange={onDarkModeAutoDimWallpaperEnabledChange}
                  className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                >
                  <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
                </Switch>
              </div>
            </div>

            <div className="px-6 pb-6">
              <BingWallpaperPanel
                mode={mode}
                bingWallpaper={bingWallpaper}
                isRefreshing={isBingWallpaperRefreshing}
                onRefresh={onRefreshBingWallpaper}
                wallpaperMaskOpacity={wallpaperMaskOpacity}
                wallpaperMaskPreviewOpacity={previewWallpaperMaskOpacity}
                onWallpaperMaskOpacityChange={onWallpaperMaskOpacityChange}
                onModeChange={onModeChange}
                isMaskSliderIsolation={isMaskSliderIsolation}
                onMaskSliderInteractionStart={() => setIsMaskSliderInteracting(true)}
                onMaskSliderInteractionEnd={() => setIsMaskSliderInteracting(false)}
              />

              {!hideWeather && (
                <WeatherWallpaperPanel
                  mode={mode}
                  wallpaperMaskOpacity={wallpaperMaskOpacity}
                  wallpaperMaskPreviewOpacity={previewWallpaperMaskOpacity}
                  onWallpaperMaskOpacityChange={onWallpaperMaskOpacityChange}
                  onModeChange={onModeChange}
                  isMaskSliderIsolation={isMaskSliderIsolation}
                  onMaskSliderInteractionStart={() => setIsMaskSliderInteracting(true)}
                  onMaskSliderInteractionEnd={() => setIsMaskSliderInteracting(false)}
                />
              )}

              <ColorWallpaperPanel
                mode={mode}
                colorWallpaperId={colorWallpaperId}
                wallpaperMaskOpacity={previewWallpaperMaskOpacity}
                onColorWallpaperIdChange={onColorWallpaperIdChange}
                onModeChange={onModeChange}
              />

              <CustomWallpaperPanel
                mode={mode}
                customWallpaper={customWallpaper}
                wallpaperMaskOpacity={wallpaperMaskOpacity}
                wallpaperMaskPreviewOpacity={previewWallpaperMaskOpacity}
                onWallpaperMaskOpacityChange={onWallpaperMaskOpacityChange}
                onCustomWallpaperChange={onCustomWallpaperChange}
                onModeChange={onModeChange}
                isMaskSliderIsolation={isMaskSliderIsolation}
                onMaskSliderInteractionStart={() => setIsMaskSliderInteracting(true)}
                onMaskSliderInteractionEnd={() => setIsMaskSliderInteracting(false)}
              />
            </div>
          </Tabs>
        </div>
      </SettingsDialogContent>
    </Dialog>
  );
}
