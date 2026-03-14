import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RiCheckFill } from "@remixicon/react";
import { useTranslation } from "react-i18next";
import { WallpaperMaskOverlay } from "@/components/wallpaper/WallpaperMaskOverlay";
import {
  DYNAMIC_WALLPAPER_LABELS,
  DYNAMIC_WALLPAPER_OPTIONS,
  renderDynamicWallpaper,
} from "@/components/wallpaper/dynamicWallpapers";
import type { DynamicWallpaperEffect, WallpaperMode } from "@/wallpaper/types";

const DYNAMIC_PREVIEW_OVERSCAN_X_PX = 24;
const DYNAMIC_PREVIEW_OVERSCAN_TOP_PX = 24;
const DYNAMIC_PREVIEW_OVERSCAN_BOTTOM_PX = 56;
const DYNAMIC_PREVIEW_SCALE = 1.32;

interface DynamicWallpaperPanelProps {
  mode: WallpaperMode;
  dynamicWallpaperEffect: DynamicWallpaperEffect;
  wallpaperMaskOpacity: number;
  onDynamicWallpaperEffectChange: (effect: DynamicWallpaperEffect) => void;
  onModeChange: (mode: WallpaperMode) => void;
}

export function DynamicWallpaperPanel({
  mode,
  dynamicWallpaperEffect,
  wallpaperMaskOpacity,
  onDynamicWallpaperEffectChange,
  onModeChange,
}: DynamicWallpaperPanelProps) {
  const { t } = useTranslation();

  return (
    <TabsContent value="dynamic" disableAnimation className="mt-0 outline-none">
      <div className="flex flex-col gap-4">
        <div className="relative h-[268px] rounded-[24px] overflow-hidden border border-border/50 bg-background p-3">
          <WallpaperMaskOverlay opacity={wallpaperMaskOpacity} className="absolute inset-0 pointer-events-none" />
          <div className="no-scrollbar relative z-20 h-full overflow-y-auto pr-1">
            <div className="grid grid-cols-2 auto-rows-[118px] gap-2">
              {DYNAMIC_WALLPAPER_OPTIONS.map((effect) => {
                const isSelected = mode === "dynamic" && dynamicWallpaperEffect === effect.id;
                const isLive = mode === "dynamic" && dynamicWallpaperEffect === effect.id;
                return (
                  <button
                    key={effect.id}
                    type="button"
                    className={`no-pill-radius relative h-full w-full overflow-hidden rounded-[20px] border transition-transform duration-200 ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/80"
                        : "border-border/70 hover:scale-[1.02]"
                    }`}
                    onClick={() => {
                      onDynamicWallpaperEffectChange(effect.id);
                      onModeChange("dynamic");
                    }}
                    title={effect.label}
                  >
                    <div className="absolute inset-0 bg-black/10" />
                    <div className="absolute inset-0" style={{ background: effect.staticBackground }}>
                      {isLive ? (
                        <div className="absolute inset-0 overflow-hidden">
                          <div
                            className="absolute"
                            style={{
                              top: -DYNAMIC_PREVIEW_OVERSCAN_TOP_PX,
                              right: -DYNAMIC_PREVIEW_OVERSCAN_X_PX,
                              bottom: -DYNAMIC_PREVIEW_OVERSCAN_BOTTOM_PX,
                              left: -DYNAMIC_PREVIEW_OVERSCAN_X_PX,
                              transform: `scale(${DYNAMIC_PREVIEW_SCALE})`,
                              transformOrigin: "center center",
                            }}
                          >
                            {renderDynamicWallpaper(effect.id, "selector-live")}
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 overflow-hidden">
                          <div
                            className="absolute"
                            style={{
                              top: -DYNAMIC_PREVIEW_OVERSCAN_TOP_PX,
                              right: -DYNAMIC_PREVIEW_OVERSCAN_X_PX,
                              bottom: -DYNAMIC_PREVIEW_OVERSCAN_BOTTOM_PX,
                              left: -DYNAMIC_PREVIEW_OVERSCAN_X_PX,
                              transform: `scale(${DYNAMIC_PREVIEW_SCALE})`,
                              transformOrigin: "center center",
                            }}
                          >
                            {renderDynamicWallpaper(effect.id, "selector-static")}
                          </div>
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
            <h4 className="text-sm font-medium leading-none">{t("weather.wallpaper.dynamic", { defaultValue: "灵动" })}</h4>
            <p className="text-xs text-muted-foreground">
              {DYNAMIC_WALLPAPER_LABELS[dynamicWallpaperEffect]}
            </p>
          </div>
          <div className="flex justify-center">
            {mode === "dynamic" ? (
              <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                <RiCheckFill className="size-3.5" />
                {t("common.current")}
              </Button>
            ) : (
              <Button onClick={() => onModeChange("dynamic")} className="h-9 gap-2 min-w-[160px] text-sm">
                {t("weather.wallpaper.apply")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </TabsContent>
  );
}
