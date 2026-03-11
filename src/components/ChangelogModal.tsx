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
      version: "1.2.6",
      date: "2026-03-11",
      notes: [
        t("changelog.items.release126UnifiedCompareDialog"),
        t("changelog.items.release126ConflictStrategyTabs"),
        t("changelog.items.release126ConflictPendingPersist"),
        t("changelog.items.release126ConflictFreezeAutoSync"),
        t("changelog.items.release126CompareUiRefine"),
      ],
    },
    {
      version: "1.2.5",
      date: "2026-03-11",
      notes: [
        t("changelog.items.release125ImportLocalFirstSync"),
        t("changelog.items.release125ManualCloudLocalFirst"),
        t("changelog.items.release125SyncSettingsUi"),
        t("changelog.items.release125WebdavCorsPermission"),
        t("changelog.items.release125WebdavAuthHint"),
      ],
    },
    {
      version: "1.2.4",
      date: "2026-03-11",
      notes: [
        t("changelog.items.release124UpdateNotice"),
        t("changelog.items.release124Snooze24h"),
        t("changelog.items.release124ChangelogEntry"),
        t("changelog.items.release124ReleasePackaging"),
        t("changelog.items.release124FirefoxCompat"),
      ],
    },
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
        <ScrollArea
          className="max-h-[66vh]"
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
          <div className="pb-1 pr-1">
            {items.map((it) => (
              <section key={it.version} className="border-b border-border/50 py-4 first:pt-0 last:border-b-0 last:pb-0">
                <div className="flex items-end justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold leading-none">v{it.version}</span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("changelog.version")}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{it.date}</div>
                </div>
                <ol className="mt-3 space-y-1.5 pl-5 list-decimal marker:text-muted-foreground">
                  {it.notes.map((n, idx) => (
                    <li key={idx} className="text-sm leading-6 text-foreground/95">{n}</li>
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
