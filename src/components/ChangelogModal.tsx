/// <reference types="chrome" />
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildChangelogItems } from "@/components/changelog/changelog-data";
import { ChangelogTimeline } from "@/components/changelog/ChangelogTimeline";

export function ChangelogModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const items = buildChangelogItems(t);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[78vh] overflow-hidden bg-background border-border text-foreground rounded-[32px]">
        <DialogHeader>
          <DialogTitle>{t("changelog.title")}</DialogTitle>
          <DialogDescription>{t("changelog.description")}</DialogDescription>
        </DialogHeader>
        <ScrollArea
          className="max-h-[66vh]"
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
          <ChangelogTimeline items={items} language={i18n.language} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
