import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RiCheckFill, RiDownload2Fill } from "@/icons/ri-compat";
import { useTranslation } from "react-i18next";
import imgImage from "@/assets/Default_wallpaper.png";
import { WallpaperMaskOverlay } from "@/components/wallpaper/WallpaperMaskOverlay";
import { WallpaperMaskOpacitySlider } from "@/components/wallpaper/WallpaperMaskOpacitySlider";
import type { WallpaperMode } from "@/wallpaper/types";

interface BingWallpaperPanelProps {
  mode: WallpaperMode;
  bingWallpaper: string;
  wallpaperMaskOpacity: number;
  onWallpaperMaskOpacityChange: (value: number) => void;
  onModeChange: (mode: WallpaperMode) => void;
  isMaskSliderIsolation?: boolean;
  onMaskSliderInteractionStart?: () => void;
  onMaskSliderInteractionEnd?: () => void;
}

export function BingWallpaperPanel({
  mode,
  bingWallpaper,
  wallpaperMaskOpacity,
  onWallpaperMaskOpacityChange,
  onModeChange,
  isMaskSliderIsolation = false,
  onMaskSliderInteractionStart,
  onMaskSliderInteractionEnd,
}: BingWallpaperPanelProps) {
  const { t, i18n } = useTranslation();
  const showBingMaskSlider = mode === "bing";
  const isolateMaskSlider = isMaskSliderIsolation && showBingMaskSlider;
  const fadeClass = "transition-opacity duration-220 ease-out";

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed, falling back to direct link:", error);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleBingDownload = async () => {
    try {
      const market = i18n.language.startsWith("zh") ? "zh-CN" : "en-US";
      const response = await fetch(`https://bing.biturl.top/?resolution=UHD&format=json&index=0&mkt=${market}`);
      const data = await response.json();

      if (data.url) {
        handleDownload(data.url, "bing-wallpaper-4k.jpg");
      } else {
        handleDownload(bingWallpaper || imgImage, "bing-wallpaper.jpg");
      }
    } catch (error) {
      console.error("Failed to fetch 4K wallpaper:", error);
      handleDownload(bingWallpaper || imgImage, "bing-wallpaper.jpg");
    }
  };

  return (
    <TabsContent value="bing" disableAnimation className="mt-0 outline-none">
      <div className="flex flex-col gap-4">
        <div className={`relative aspect-video rounded-[24px] overflow-hidden border group ${isolateMaskSlider ? "border-transparent bg-transparent" : "border-border/50 bg-muted/20"}`}>
          <img
            src={bingWallpaper || imgImage}
            alt="Bing"
            className={`w-full h-full object-cover ${fadeClass} ${isolateMaskSlider ? "opacity-0" : "opacity-100"}`}
          />
          <WallpaperMaskOverlay
            opacity={wallpaperMaskOpacity}
            className={`absolute inset-0 pointer-events-none ${fadeClass} ${isolateMaskSlider ? "opacity-0" : "opacity-100"}`}
          />
          {showBingMaskSlider ? (
            <div className="absolute left-1/2 top-3 z-20 w-[72%] -translate-x-1/2">
              <WallpaperMaskOpacitySlider
                value={wallpaperMaskOpacity}
                onChange={onWallpaperMaskOpacityChange}
                onInteractionStart={onMaskSliderInteractionStart}
                onInteractionEnd={onMaskSliderInteractionEnd}
              />
            </div>
          ) : null}
          <div className={`absolute bottom-3 right-3 flex gap-2 ${fadeClass} ${isolateMaskSlider ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100"}`}>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 text-white border-none"
              onClick={handleBingDownload}
              title={t("weather.wallpaper.download")}
            >
              <RiDownload2Fill className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className={`flex flex-col gap-3 ${fadeClass} ${isolateMaskSlider ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <div className="space-y-1">
            <h4 className="text-sm font-medium leading-none">{t("weather.wallpaper.bing")}</h4>
            <p className="text-xs text-muted-foreground">{t("weather.wallpaper.bingDesc")}</p>
          </div>
          <div className="flex justify-center">
            {mode === "bing" ? (
              <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                <RiCheckFill className="size-3.5" />
                {t("common.current")}
              </Button>
            ) : (
              <Button onClick={() => onModeChange("bing")} className="h-9 gap-2 min-w-[160px] text-sm">
                {t("weather.wallpaper.apply")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
