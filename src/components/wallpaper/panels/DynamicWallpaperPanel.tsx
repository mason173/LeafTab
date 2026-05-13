import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RiCheckFill } from "@/icons/ri-compat";
import { useTranslation } from "react-i18next";
import {
  DYNAMIC_WALLPAPER_OPTIONS,
  type DynamicWallpaperId,
} from "@/components/wallpaper/dynamicWallpapers";
import type { WallpaperMode } from "@/wallpaper/types";

interface DynamicWallpaperPanelProps {
  mode: WallpaperMode;
  dynamicWallpaperId: DynamicWallpaperId;
  onDynamicWallpaperIdChange: (id: DynamicWallpaperId) => void;
  onModeChange: (mode: WallpaperMode) => void;
}

export function DynamicWallpaperPanel({
  mode,
  dynamicWallpaperId,
  onDynamicWallpaperIdChange,
  onModeChange,
}: DynamicWallpaperPanelProps) {
  const { t } = useTranslation();

  return (
    <TabsContent value="dynamic" disableAnimation className="mt-0 outline-none">
      <div className="flex flex-col gap-4">
        <div className="relative aspect-video overflow-hidden rounded-[24px] border border-border/50 bg-background">
          <div className="h-full overflow-y-auto p-3 pr-2">
            <div className="grid grid-cols-2 gap-3">
              {DYNAMIC_WALLPAPER_OPTIONS.map((option) => {
                const selected = dynamicWallpaperId === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className="group relative no-pill-radius aspect-[16/10] overflow-hidden rounded-[14px] border border-white/20 text-left transition-transform duration-200 hover:scale-[1.03] hover:border-white/35"
                    onClick={() => {
                      onDynamicWallpaperIdChange(option.id);
                      onModeChange("dynamic");
                    }}
                    title={option.name}
                  >
                    <video
                      src={option.src}
                      className="absolute inset-0 h-full w-full object-cover"
                      autoPlay
                      loop
                    muted
                    playsInline
                    onLoadedData={(event) => {
                      event.currentTarget.playbackRate = option.playbackRate ?? 0.7;
                    }}
                  />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)_40%,rgba(0,0,0,0.16)_100%)]" />
                    {selected ? (
                      <div className="absolute right-2 top-2 z-10 rounded-[8px] bg-black/38 px-1.5 py-1 text-white backdrop-blur-sm">
                        <RiCheckFill className="size-3" />
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex">
          <div className="flex w-full justify-center">
            {mode === "dynamic" ? (
              <Button disabled variant="secondary" className="h-9 min-w-[160px] gap-2 bg-primary/10 text-sm text-primary hover:bg-primary/20">
                <RiCheckFill className="size-3.5" />
                {t("common.current")}
              </Button>
            ) : (
              <Button onClick={() => onModeChange("dynamic")} className="h-9 min-w-[160px] gap-2 text-sm">
                {t("weather.wallpaper.apply")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
