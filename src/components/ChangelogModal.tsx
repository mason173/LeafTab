/// <reference types="chrome" />
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildChangelogSections } from "@/components/changelog/changelog-data";
import { ChangelogTimeline } from "@/components/changelog/ChangelogTimeline";
import { SettingsDialogContent } from "@/components/settings/SettingsDialogSurface";

export function ChangelogModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const sections = buildChangelogSections(t);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <SettingsDialogContent className="sm:max-w-[680px] max-h-[78vh] overflow-hidden rounded-[32px]">
        <DialogHeader>
          <DialogTitle>{t("changelog.title")}</DialogTitle>
          <DialogDescription>{t("changelog.description")}</DialogDescription>
        </DialogHeader>
        <ScrollArea
          className="max-h-[66vh]"
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
          <div className="space-y-8 pr-1">
            {sections.map((section) => (
              <section key={section.id} className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
                  {section.description ? (
                    <p className="text-xs leading-5 text-muted-foreground">{section.description}</p>
                  ) : null}
                </div>
                <ChangelogTimeline items={section.items} language={i18n.language} />
              </section>
            ))}
          </div>
        </ScrollArea>
      </SettingsDialogContent>
    </Dialog>
  );
}
