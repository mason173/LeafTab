import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SettingsDialogContent } from "@/components/settings/SettingsDialogSurface";
import { getScenarioIconByKey, scenarioColorOptions, scenarioIconOptions, type ScenarioIconKey, type ScenarioMode } from "@/scenario/scenario";

function ScenarioModeCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  description,
  submitText,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (mode: Omit<ScenarioMode, "id">) => void;
  title?: string;
  description?: string;
  submitText?: string;
  mode?: ScenarioMode | null;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [color, setColor] = useState(scenarioColorOptions[0]);
  const [icon, setIcon] = useState<ScenarioIconKey>("home");

  useEffect(() => {
    if (!open) return;
    setName(mode?.name ?? "");
    setColor(mode?.color ?? scenarioColorOptions[0]);
    setIcon(mode?.icon ?? "home");
  }, [open, mode]);

  const trimmedName = useMemo(() => name.trim().slice(0, 12), [name]);
  const canSubmit = trimmedName.length > 0;
  const Icon = useMemo(() => getScenarioIconByKey(icon), [icon]);

  const displayTitle = title ?? t('scenario.createTitle');
  const displayDescription = description ?? t('scenario.createDescription');
  const displaySubmitText = submitText ?? t('scenario.addButton');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SettingsDialogContent className="sm:max-w-[420px] rounded-[32px] p-0 max-h-[80vh] overflow-visible">
        <ScrollArea
          className="max-h-[80vh]"
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
          <div className="p-[16px] flex flex-col gap-[14px]">
            <DialogHeader>
              <DialogTitle className="text-foreground">{displayTitle}</DialogTitle>
              <DialogDescription className="text-muted-foreground">{displayDescription}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-[10px]">
              <div
                className="size-[56px] rounded-[999px] flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: color }}
              >
                <Icon className="size-[24px]" />
              </div>
            </div>

            <div className="flex flex-col gap-[6px]">
              <div className="flex justify-between items-center">
                <label className="text-muted-foreground text-[12px]">{t('scenario.nameLabel')}</label>
                <span className="text-muted-foreground text-[12px]">{trimmedName.length}/12</span>
              </div>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={12}
                placeholder={t('scenario.namePlaceholder')}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (!canSubmit) return;
                  onSubmit({ name: trimmedName, color, icon });
                  onOpenChange(false);
                }}
              />
            </div>

            <div className="flex flex-col gap-[8px]">
              <p className="text-[12px] text-muted-foreground leading-none px-[2px]">{t('scenario.colorLabel')}</p>
              <div className="bg-secondary rounded-[16px] p-[12px]">
                <div className="grid grid-cols-6 gap-[8px] w-full place-items-center">
                  {scenarioColorOptions.map((c) => {
                    const selected = c === color;
                    return (
                      <button
                        key={c}
                        type="button"
                        className={`size-[28px] rounded-[999px] flex items-center justify-center transition-[box-shadow,transform] ${selected ? "ring-2 ring-ring ring-offset-2 ring-offset-secondary" : ""}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setColor(c)}
                        aria-label={t('scenario.colorPicker')}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-[8px]">
              <p className="text-[12px] text-muted-foreground leading-none px-[2px]">{t('scenario.iconLabel')}</p>
              <div className="bg-secondary rounded-[16px] p-[12px]">
                <ScrollArea
                  className="h-fit max-h-[168px]"
                  scrollBarClassName="data-[orientation=vertical]:translate-x-4"
                >
                  <div className="grid grid-cols-6 gap-[8px]">
                    {scenarioIconOptions.map(({ key, Icon: OptIcon }) => {
                      const selected = key === icon;
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`size-[40px] rounded-[999px] flex items-center justify-center transition-[background-color,transform]  ${selected ? "bg-primary hover:bg-primary/90" : "bg-background/40 hover:bg-background/70"}`}
                          onClick={() => setIcon(key)}
                          aria-label={t('scenario.iconPicker')}
                        >
                          <OptIcon className={`size-[16px] ${selected ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter className="px-[16px] pb-[16px] pt-[0px] flex w-full gap-3 sm:gap-3">
            <Button className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-[14px] h-[40px]" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[14px] h-[40px]"
              disabled={!canSubmit}
              onClick={() => {
                if (!canSubmit) return;
                onSubmit({ name: trimmedName, color, icon });
                onOpenChange(false);
              }}
            >
              {displaySubmitText}
            </Button>
          </DialogFooter>
        </ScrollArea>
      </SettingsDialogContent>
    </Dialog>
  );
}

export default ScenarioModeCreateDialog;
