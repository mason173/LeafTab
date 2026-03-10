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
      version: "1.2.3",
      date: "2026-03-10",
      notes: [
        t("changelog.items.release123WebdavAccessDialog"),
        t("changelog.items.release123UnifiedSyncSettings"),
        t("changelog.items.release123AutoSyncToggles"),
        t("changelog.items.release123ProviderLabel"),
        t("changelog.items.release123PasswordToggle"),
      ],
    },
    {
      version: "1.2.2",
      date: "2026-03-09",
      notes: [
        t("changelog.items.release122Scrollbar"),
        t("changelog.items.release122WelcomePersist"),
        t("changelog.items.release122RateLimitToast"),
        t("changelog.items.release122WebdavSchedule"),
        t("changelog.items.release122CustomServer"),
        t("changelog.items.release122CustomIconSource"),
        t("changelog.items.release122OnlineIconSource"),
        t("changelog.items.release122DynamicAccent"),
      ],
    },
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
      <DialogContent className="sm:max-w-[560px] max-h-[78vh] overflow-hidden bg-background border-border text-foreground rounded-[24px]">
        <DialogHeader>
          <DialogTitle>{t("changelog.title")}</DialogTitle>
          <DialogDescription>{t("changelog.description")}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[66vh]">
          <div className="flex flex-col gap-4 pb-1">
            {items.map((it) => (
              <section key={it.version} className="rounded-xl border border-border/60 bg-secondary/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("changelog.version")}</span>
                    <span className="text-lg font-semibold leading-none">v{it.version}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("changelog.date")}</span>
                    <div className="mt-1 text-sm text-muted-foreground">{it.date}</div>
                  </div>
                </div>
                <ol className="mt-4 space-y-2">
                  {it.notes.map((n, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background text-[11px] font-medium text-muted-foreground">
                        {idx + 1}
                      </span>
                      <span className="text-sm leading-6 text-foreground/95">{n}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
