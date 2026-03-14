import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RiCheckFill, RiUpload2Fill } from "@remixicon/react";
import { saveWallpaper } from "@/db";
import { WallpaperMaskOverlay } from "@/components/wallpaper/WallpaperMaskOverlay";
import { WallpaperMaskOpacitySlider } from "@/components/wallpaper/WallpaperMaskOpacitySlider";
import type { WallpaperMode } from "@/wallpaper/types";

interface CustomWallpaperPanelProps {
  mode: WallpaperMode;
  customWallpaper: string | null;
  wallpaperMaskOpacity: number;
  onWallpaperMaskOpacityChange: (value: number) => void;
  onCustomWallpaperChange: (url: string) => void;
  onModeChange: (mode: WallpaperMode) => void;
}

export function CustomWallpaperPanel({
  mode,
  customWallpaper,
  wallpaperMaskOpacity,
  onWallpaperMaskOpacityChange,
  onCustomWallpaperChange,
  onModeChange,
}: CustomWallpaperPanelProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const showCustomMaskSlider = mode === "custom" && !!customWallpaper;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const url = event.target?.result as string;
        try {
          await saveWallpaper(url);
          onCustomWallpaperChange(url);
          onModeChange("custom");
        } catch (error) {
          console.error("Failed to save wallpaper:", error);
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
    <TabsContent value="custom" disableAnimation className="mt-0 outline-none">
      <div className="flex flex-col gap-4">
        <div
          onClick={() => !customWallpaper && fileInputRef.current?.click()}
          className={`relative aspect-video rounded-[24px] overflow-hidden border transition-all group ${
            !customWallpaper
              ? "border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 cursor-pointer flex flex-col items-center justify-center gap-3"
              : "border-border/50"
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
                  {t("weather.wallpaper.upload")}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
              <div className="p-3 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                <RiUpload2Fill className="size-6" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{t("weather.wallpaper.uploadTitle")}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t("weather.wallpaper.imageSupport")}</p>
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
            <h4 className="text-sm font-medium leading-none">{t("weather.wallpaper.custom")}</h4>
            <p className="text-xs text-muted-foreground">
              {customWallpaper ? t("weather.wallpaper.customUploaded") : t("weather.wallpaper.customDesc")}
            </p>
          </div>
          <div className="flex justify-center">
            {mode === "custom" ? (
              <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                <RiCheckFill className="size-3.5" />
                {t("common.current")}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (customWallpaper) onModeChange("custom");
                  else fileInputRef.current?.click();
                }}
                disabled={!customWallpaper}
                className="h-9 gap-2 min-w-[160px] text-sm"
              >
                {t("weather.wallpaper.apply")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
