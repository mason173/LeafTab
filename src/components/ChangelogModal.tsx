/// <reference types="chrome" />
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChangelogItem {
  version: string;
  date: string;
  notes: string[];
}

export function ChangelogModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const items: ChangelogItem[] = [
    {
      version: "1.2.1",
      date: "2026-03-07",
      notes: [
        t("changelog.items.release121Webdav"),
        t("changelog.items.release121Ui"),
        t("changelog.items.release121Fixes"),
      ],
    },
    {
      version: "1.2.0",
      date: "2026-03-05",
      notes: [
        t("changelog.items.grid"),
        t("changelog.items.carousel"),
        t("changelog.items.entrance"),
        t("changelog.items.dots"),
      ],
    },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-background border-border text-foreground rounded-[24px]">
        <DialogHeader>
          <DialogTitle>{t("changelog.title")}</DialogTitle>
          <DialogDescription>{t("changelog.description")}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="flex flex-col gap-4">
            {items.map((it) => (
              <div key={it.version} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("changelog.version")}: {it.version}</span>
                  <span className="text-xs text-muted-foreground">{t("changelog.date")}: {it.date}</span>
                </div>
                <ul className="list-disc pl-5 text-sm">
                  {it.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
