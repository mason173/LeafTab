import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { googleFonts, loadGoogleFont } from "@/utils/googleFonts";

interface TimeFontDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFont: string;
  previewTime: string;
  onSelect: (font: string) => void;
}

export function TimeFontDialog({ open, onOpenChange, currentFont, previewTime, onSelect }: TimeFontDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    googleFonts.forEach((font) => loadGoogleFont(font.family));
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[85vh] overflow-visible bg-background border-border text-foreground rounded-[32px]">
        <DialogHeader>
          <DialogTitle>{t("settings.timeFont.title")}</DialogTitle>
          <DialogDescription>{t("settings.timeFont.description")}</DialogDescription>
        </DialogHeader>
        <ScrollArea
          className="max-h-[62vh]"
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
          <div className="grid grid-cols-3 gap-3">
            {googleFonts.map((font) => {
              const selected = currentFont === font.family;
              return (
                <button
                  key={font.family}
                  type="button"
                  className={`rounded-xl border p-3 transition-all flex flex-col items-center justify-center gap-2 text-center ${selected ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:bg-secondary/70"}`}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
