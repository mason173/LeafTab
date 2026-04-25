import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Switch, SwitchThumb } from "@/components/animate-ui/primitives/radix/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { googleFonts, getTimeFontScale, loadGoogleFont, toCssFontFamily } from "@/utils/googleFonts";
import { prepareTimeFont } from "@/utils/timeFontMetrics";
import type { TimeAnimationMode } from "@/hooks/useSettings";

interface TimeDisplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFont: string;
  previewTime: string;
  is24Hour: boolean;
  onIs24HourChange: (checked: boolean) => void;
  showDate: boolean;
  onShowDateChange: (checked: boolean) => void;
  showWeekday: boolean;
  onShowWeekdayChange: (checked: boolean) => void;
  showSeconds: boolean;
  onShowSecondsChange: (checked: boolean) => void;
  showLunar: boolean;
  onShowLunarChange: (checked: boolean) => void;
  timeAnimationMode: TimeAnimationMode;
  onTimeAnimationModeChange: (mode: 'inherit' | 'on' | 'off') => void;
  onSelect: (font: string) => void;
}

function TimeFontPreviewSample({
  fontFamily,
  previewTime,
}: {
  fontFamily: string;
  previewTime: string;
}) {
  const previewFontSize = Math.round(36 * getTimeFontScale(fontFamily));

  return (
    <div
      style={{ fontFamily: toCssFontFamily(fontFamily), fontSize: previewFontSize }}
      className="leading-none text-center w-full max-w-full whitespace-nowrap overflow-hidden"
    >
      {previewTime}
    </div>
  );
}

export function TimeDisplayDialog({
  open,
  onOpenChange,
  currentFont,
  previewTime,
  is24Hour,
  onIs24HourChange,
  showDate,
  onShowDateChange,
  showWeekday,
  onShowWeekdayChange,
  showSeconds,
  onShowSecondsChange,
  showLunar,
  onShowLunarChange,
  timeAnimationMode,
  onTimeAnimationModeChange,
  onSelect,
}: TimeDisplayDialogProps) {
  const { t } = useTranslation();
  const animationSettingEnabled = timeAnimationMode !== 'off';
  const handleTimeAnimationModeCheckedChange = (checked: boolean) => {
    if (typeof onTimeAnimationModeChange === 'function') {
      onTimeAnimationModeChange(checked ? 'on' : 'off');
    }
  };
  const invokeCheckedChange = (handler: unknown, checked: boolean) => {
    if (typeof handler === 'function') {
      handler(checked);
    }
  };
  const settingsCards = [
    {
      key: 'show-date',
      title: t("settings.showDate.label", { defaultValue: "显示日期" }),
      checked: showDate,
      onCheckedChange: onShowDateChange,
    },
    {
      key: 'show-weekday',
      title: t("settings.showWeekday.label", { defaultValue: "显示星期" }),
      checked: showWeekday,
      onCheckedChange: onShowWeekdayChange,
    },
    {
      key: 'show-lunar',
      title: t("settings.showLunar.label"),
      checked: showLunar,
      onCheckedChange: onShowLunarChange,
    },
    {
      key: 'time-format',
      title: t("settings.timeFormat.label"),
      checked: is24Hour,
      onCheckedChange: onIs24HourChange,
    },
    {
      key: 'show-seconds',
      title: t("settings.showSeconds.label"),
      checked: showSeconds,
      onCheckedChange: onShowSecondsChange,
    },
    {
      key: 'time-animation',
      title: t("settings.timeAnimation.label"),
      checked: animationSettingEnabled,
      onCheckedChange: handleTimeAnimationModeCheckedChange,
    },
  ];

  useEffect(() => {
    if (!open) return;
    googleFonts.forEach((font) => loadGoogleFont(font.family));
  }, [open]);

  const handleSelectFont = async (fontFamily: string) => {
    await prepareTimeFont(fontFamily);
    onSelect(fontFamily);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-visible bg-background border-border text-foreground rounded-[32px]">
        <DialogHeader className="pb-3 pr-8">
          <DialogTitle>{t("settings.timeDisplay.title")}</DialogTitle>
          <DialogDescription>{t("settings.timeDisplay.description")}</DialogDescription>
        </DialogHeader>
        <ScrollArea
          className="max-h-[62vh]"
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              {settingsCards.map((card) => (
                <div
                  key={card.key}
                  role="button"
                  tabIndex={0}
                  className={`no-pill-radius !rounded-[20px] flex min-h-[64px] items-center border px-4 py-3 text-left transition-colors ${
                    card.checked
                      ? "border-primary/35 bg-primary/10"
                      : "border-border bg-secondary/35 hover:bg-secondary/55"
                  }`}
                  onClick={() => invokeCheckedChange(card.onCheckedChange, !card.checked)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    invokeCheckedChange(card.onCheckedChange, !card.checked);
                  }}
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="text-sm font-medium leading-none">{card.title}</span>
                    <Switch
                      id={`time-display-dialog-${card.key}`}
                      checked={card.checked}
                      onCheckedChange={(checked) => invokeCheckedChange(card.onCheckedChange, checked)}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      className="relative flex h-6 w-10 items-center justify-start rounded-full border border-border p-0.5 transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
                    >
                      <SwitchThumb className="h-full aspect-square rounded-full" pressedAnimation={{ width: 22 }} />
                    </Switch>
                  </div>
                </div>
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
                  className={`no-pill-radius !rounded-[24px] border p-3 transition-all flex flex-col items-center justify-center gap-2 text-center overflow-hidden ${selected ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:bg-secondary/70"}`}
                  onClick={() => {
                    void handleSelectFont(font.family);
                  }}
                >
                  <TimeFontPreviewSample fontFamily={font.family} previewTime={previewTime} />
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
