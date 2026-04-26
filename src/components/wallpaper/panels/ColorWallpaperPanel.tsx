import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RiCheckFill } from "@/icons/ri-compat";
import { useTranslation } from "react-i18next";
import { COLOR_WALLPAPER_PRESETS } from "@/components/wallpaper/colorWallpapers";
import { WallpaperMaskOverlay } from "@/components/wallpaper/WallpaperMaskOverlay";
import type { WallpaperMode } from "@/wallpaper/types";

interface ColorWallpaperPanelProps {
  mode: WallpaperMode;
  colorWallpaperId: string;
  wallpaperMaskOpacity: number;
  onColorWallpaperIdChange: (id: string) => void;
  onModeChange: (mode: WallpaperMode) => void;
}

export function ColorWallpaperPanel({
  mode,
  colorWallpaperId,
  wallpaperMaskOpacity,
  onColorWallpaperIdChange,
  onModeChange,
}: ColorWallpaperPanelProps) {
  const { t } = useTranslation();

  return (
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
                  className="relative no-pill-radius rounded-[20px] border border-white/40 transition-transform duration-200 hover:scale-[1.03]"
                  style={{ backgroundImage: preset.gradient }}
                  onClick={() => {
                    onColorWallpaperIdChange(preset.id);
                    onModeChange("color");
                  }}
                  title={t(`weather.wallpaper.colorPresets.${preset.id}`, { defaultValue: preset.name })}
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

        <div className="flex">
          <div className="flex justify-center w-full">
            {mode === "color" ? (
              <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                <RiCheckFill className="size-3.5" />
                {t("common.current")}
              </Button>
            ) : (
              <Button onClick={() => onModeChange("color")} className="h-9 gap-2 min-w-[160px] text-sm">
                {t("weather.wallpaper.apply")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
