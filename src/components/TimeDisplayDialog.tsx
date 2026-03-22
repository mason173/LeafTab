import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Switch, SwitchThumb } from "@/components/animate-ui/primitives/radix/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { googleFonts, loadGoogleFont } from "@/utils/googleFonts";

interface TimeDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFont: string;
  previewTime: string;
  is24Hour: boolean;
  onIs24HourChange: (checked: boolean) => void;
  showSeconds: boolean;
  onShowSecondsChange: (checked: boolean) => void;
  showLunar: boolean;
  onShowLunarChange: (checked: boolean) => void;
  timeAnimationEnabled: boolean;
  onTimeAnimationModeChange: (mode: 'inherit' | 'on' | 'off') => void;
  onSelect: (font: string) => void;
}

export function TimeDisplayDialog({
  open,
  onOpenChange,
  currentFont,
  previewTime,
  is24Hour,
  onIs24HourChange,
  showSeconds,
  onShowSecondsChange,
  showLunar,
  onShowLunarChange,
  timeAnimationEnabled,
  onTimeAnimationModeChange,
  onSelect,
}: TimeDisplayDialogProps) {
  const { t } = useTranslation();
  const settingsCards = [
    {
      key: 'time-format',
      title: t("settings.timeFormat.label"),
      description: t("settings.timeFormat.description"),
      checked: is24Hour,
      onCheckedChange: onIs24HourChange,
    },
    {
      key: 'show-seconds',
      title: t("settings.showSeconds.label"),
      description: t("settings.showSeconds.description"),
      checked: showSeconds,
      onCheckedChange: onShowSecondsChange,
    },
    {
      key: 'show-lunar',
      title: t("settings.showLunar.label"),
      description: t("settings.showLunar.description"),
      checked: showLunar,
      onCheckedChange: onShowLunarChange,
    },
    {
      key: 'time-animation',
      title: t("settings.timeAnimation.label"),
      description: t("settings.timeAnimation.description"),
      checked: timeAnimationEnabled,
      onCheckedChange: (checked: boolean) => {
        onTimeAnimationModeChange(checked ? 'on' : 'off');
      },
    },
  ];

  useEffect(() => {
    if (!open) return;
    googleFonts.forEach((font) => loadGoogleFont(font.family));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-visible bg-background border-border text-foreground rounded-[32px]">
        <DialogHeader>
          <DialogTitle>{t("settings.timeDisplay.title")}</DialogTitle>
          <DialogDescription>{t("settings.timeDisplay.description")}</DialogDescription>
        </DialogHeader>
        <ScrollArea
          className="max-h-[62vh]"
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {settingsCards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  className={`no-pill-radius !rounded-[24px] flex min-h-[124px] flex-col justify-between border p-4 text-left transition-colors ${
                    card.checked
                      ? "border-primary/35 bg-primary/10"
                      : "border-border bg-secondary/35 hover:bg-secondary/55"
                  }`}
                  onClick={() => card.onCheckedChange(!card.checked)}
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium leading-none">{card.title}</span>
                    <span className="text-xs leading-5 text-muted-foreground">{card.description}</span>
                  </div>
                  <div className="flex items-end justify-end gap-3 pt-3">
                    <Switch
                      id={`time-display-dialog-${card.key}`}
                      checked={card.checked}
                      onCheckedChange={card.onCheckedChange}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                    >
                      <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
                    </Switch>
                  </div>
                </button>
              ))}
            </div>
            <Separator className="bg-border/60" />
            <div className="grid grid-cols-3 gap-3">
            {googleFonts.map((font) => {
              const selected = currentFont === font.family;
              return (
                <button
                  key={font.family}
                  type="button"
                  className={`no-pill-radius !rounded-[24px] border p-3 transition-all flex flex-col items-center justify-center gap-2 text-center ${selected ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:bg-secondary/70"}`}
                  onClick={() => {
                    onSelect(font.family);
                    onOpenChange(false);
                  }}
                >
                  <div style={{ fontFamily: font.family }} className="text-[36px] leading-none text-center w-full">
                    {previewTime}
                  </div>
                  <div className="text-xs text-muted-foreground truncate w-full text-center">{font.name}</div>
                </button>
              );
            })}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
