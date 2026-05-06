import { useRef, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RiCheckFill, RiUpload2Fill } from "@/icons/ri-compat";
import { WallpaperMaskOverlay } from "@/components/wallpaper/WallpaperMaskOverlay";
import { WallpaperMaskOpacitySlider } from "@/components/wallpaper/WallpaperMaskOpacitySlider";
import type { WallpaperMode } from "@/wallpaper/types";

interface CustomWallpaperPanelProps {
  mode: WallpaperMode;
  customWallpaper: string | null;
  customWallpaperGallery: string[];
  wallpaperMaskOpacity: number;
  wallpaperMaskPreviewOpacity?: number;
  onWallpaperMaskOpacityChange: (value: number) => void;
  onAppendCustomWallpapers: (wallpapers: string[]) => void | Promise<void>;
  onCustomWallpaperChange: (url: string) => void;
  onModeChange: (mode: WallpaperMode) => void;
  isMaskSliderIsolation?: boolean;
  onMaskSliderInteractionStart?: () => void;
  onMaskSliderInteractionEnd?: () => void;
}

export function CustomWallpaperPanel({
  mode,
  customWallpaper,
  customWallpaperGallery,
  wallpaperMaskOpacity,
  wallpaperMaskPreviewOpacity,
  onWallpaperMaskOpacityChange,
  onAppendCustomWallpapers,
  onCustomWallpaperChange,
  onModeChange,
  isMaskSliderIsolation = false,
  onMaskSliderInteractionStart,
  onMaskSliderInteractionEnd,
}: CustomWallpaperPanelProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasCustomWallpaper = customWallpaperGallery.length > 0;
  const showCustomMaskSlider = mode === "custom" && !!customWallpaper;
  const isolateMaskSlider = isMaskSliderIsolation && showCustomMaskSlider;
  const fadeClass = "transition-opacity duration-220 ease-out";
  const previewOpacity = wallpaperMaskPreviewOpacity ?? wallpaperMaskOpacity;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      e.target.value = "";
      return;
    }

    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve((event.target?.result as string) || "");
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    )
      .then(async (wallpapers) => {
        const validWallpapers = wallpapers.filter(Boolean);
        if (validWallpapers.length === 0) return;
        await onAppendCustomWallpapers(validWallpapers);
        onCustomWallpaperChange(validWallpapers[0]);
        onModeChange("custom");
      })
      .catch((error) => {
        console.error("Failed to save wallpapers:", error);
      })
      .finally(() => {
        e.target.value = "";
      });
  };

  const handleSelectWallpaper = (wallpaper: string) => {
    onCustomWallpaperChange(wallpaper);
    onModeChange("custom");
  };

  const uploadCard = (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      className="group relative no-pill-radius aspect-[16/10] overflow-hidden rounded-[14px] border border-dashed border-muted-foreground/25 bg-muted/20 text-left transition-transform duration-200 hover:scale-[1.03] hover:border-primary/45 hover:bg-muted/50"
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground transition-colors group-hover:text-primary">
        <div className="rounded-full bg-background/75 p-3">
          <RiUpload2Fill className="size-5" />
        </div>
        <div className="text-center">
          <p className="text-xs font-medium">{t("weather.wallpaper.uploadTitle")}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{t("weather.wallpaper.imageSupport")}</p>
        </div>
      </div>
    </button>
  );

  const selectedAction = (
    <div className={`flex ${fadeClass} ${isolateMaskSlider ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
      <div className="flex justify-center w-full">
        {mode === "custom" ? (
          <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
            <RiCheckFill className="size-3.5" />
            {t("common.current")}
          </Button>
        ) : (
          <Button
            onClick={() => {
              if (customWallpaper) onModeChange("custom");
            }}
            disabled={!customWallpaper}
            className="h-9 gap-2 min-w-[160px] text-sm"
          >
            {t("weather.wallpaper.apply")}
          </Button>
        )}
      </div>
    </div>
  );

  if (hasCustomWallpaper) {
    return (
      <TabsContent value="custom" disableAnimation className="mt-0 outline-none">
        <div className="flex flex-col gap-4">
          <div className="relative aspect-video overflow-hidden rounded-[24px] border border-border/50 bg-background">
            <div className="h-full overflow-y-auto p-3 pr-2">
              <div className="grid grid-cols-2 gap-3">
                {customWallpaperGallery.map((wallpaper, index) => {
                  const selected = customWallpaper === wallpaper;
                  return (
                    <button
                      key={`${wallpaper}-${index}`}
                      type="button"
                      className="group relative no-pill-radius aspect-[16/10] overflow-hidden rounded-[14px] border border-white/20 text-left transition-transform duration-200 hover:scale-[1.03] hover:border-white/35"
                      onClick={() => handleSelectWallpaper(wallpaper)}
                    >
                      <img
                        src={wallpaper}
                        alt={`Custom wallpaper ${index + 1}`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <WallpaperMaskOverlay opacity={previewOpacity} className="absolute inset-0 pointer-events-none" />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01)_40%,rgba(0,0,0,0.16)_100%)]" />
                      {selected ? (
                        <div className="absolute right-2 top-2 z-10 rounded-[8px] bg-black/38 px-1.5 py-1 text-white backdrop-blur-sm">
                          <RiCheckFill className="size-3" />
                        </div>
                      ) : null}
                    </button>
                  );
                })}
                {uploadCard}
              </div>
            </div>
            {showCustomMaskSlider ? (
              <div className="absolute left-1/2 top-3 z-20 w-[72%] -translate-x-1/2">
                <WallpaperMaskOpacitySlider
                  value={wallpaperMaskOpacity}
                  onChange={onWallpaperMaskOpacityChange}
                  onInteractionStart={onMaskSliderInteractionStart}
                  onInteractionEnd={onMaskSliderInteractionEnd}
                />
              </div>
            ) : null}
          </div>

          {selectedAction}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileChange}
        />
      </TabsContent>
    );
  }

  return (
    <TabsContent value="custom" disableAnimation className="mt-0 outline-none">
      <div className="flex flex-col gap-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative aspect-video rounded-[24px] overflow-hidden border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 cursor-pointer flex flex-col items-center justify-center gap-3 transition-all group"
        >
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
            <div className="p-3 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
              <RiUpload2Fill className="size-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{t("weather.wallpaper.uploadTitle")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("weather.wallpaper.imageSupport")}</p>
            </div>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileChange}
        />
      </div>
    </TabsContent>
  );
}
