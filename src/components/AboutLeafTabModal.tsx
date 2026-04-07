import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RiChromeFill, RiEdgeFill, RiFirefoxFill, RiGithubFill } from "@/icons/ri-compat";
import { InfiniteSlider } from "@/components/motion-primitives/infinite-slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildChangelogItems } from "@/components/changelog/changelog-data";
import { ChangelogTimeline } from "@/components/changelog/ChangelogTimeline";
import aboutIcon from "@/assets/abouticon.svg";

export type AboutLeafTabModalTab = "about" | "changelog";

export function AboutLeafTabModal({
  open,
  onOpenChange,
  defaultTab = "about",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: AboutLeafTabModalTab;
}) {
  const { t, i18n } = useTranslation();
  const [appVersion, setAppVersion] = useState<string>("—");
  const [activeTab, setActiveTab] = useState<AboutLeafTabModalTab>(defaultTab);

  const acknowledgements = {
    frontend: [
      { name: "React", url: "https://react.dev/" },
      { name: "Vite", url: "https://vite.dev/" },
      { name: "TypeScript", url: "https://www.typescriptlang.org/" },
      { name: "Tailwind CSS", url: "https://tailwindcss.com/" },
      { name: "Radix UI", url: "https://www.radix-ui.com/" },
      { name: "shadcn/ui", url: "https://ui.shadcn.com/" },
      { name: "Framer Motion", url: "https://www.framer.com/motion/" },
      { name: "i18next", url: "https://www.i18next.com/" },
      { name: "next-themes", url: "https://github.com/pacocoursey/next-themes" },
      { name: "Lucide", url: "https://lucide.dev/" },
      { name: "lunar-javascript", url: "https://github.com/6tail/lunar-javascript" },
      { name: "Recharts", url: "https://recharts.org/" },
    ],
    backend: [
      { name: "Node.js", url: "https://nodejs.org/" },
      { name: "Express", url: "https://expressjs.com/" },
      { name: "SQLite", url: "https://www.sqlite.org/" },
      { name: "sqlite3 (Node)", url: "https://github.com/TryGhost/node-sqlite3" },
      { name: "jsonwebtoken", url: "https://github.com/auth0/node-jsonwebtoken" },
      { name: "bcryptjs", url: "https://github.com/dcodeIO/bcrypt.js" },
      { name: "helmet", url: "https://helmetjs.github.io/" },
      { name: "cors", url: "https://github.com/expressjs/cors" },
      { name: "express-session", url: "https://github.com/expressjs/session" },
      { name: "express-rate-limit", url: "https://github.com/express-rate-limit/express-rate-limit" },
      { name: "svg-captcha", url: "https://github.com/produck/svg-captcha" },
      { name: "connect-sqlite3", url: "https://github.com/rawberg/connect-sqlite3" },
    ],
    resources: [
      { name: "shadcn/ui License", url: "https://github.com/shadcn-ui/ui/blob/main/LICENSE.md" },
    ],
  };

  useEffect(() => {
    if (!open) return;
    try {
      if (typeof chrome !== "undefined" && chrome.runtime?.getManifest) {
        const manifest = chrome.runtime.getManifest();
        const version = manifest.version_name || manifest.version || "—";
        setAppVersion(version);
        return;
      }
    } catch {}

    try {
      fetch("/manifest.json")
        .then((resp) => resp.json())
        .then((manifest) => setAppVersion(manifest?.version_name || manifest?.version || "—"))
        .catch(() => setAppVersion("—"));
    } catch {
      setAppVersion("—");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setActiveTab(defaultTab);
  }, [defaultTab, open]);

  const acknowledgementItems = useMemo(
    () => [...acknowledgements.frontend, ...acknowledgements.backend, ...acknowledgements.resources],
    [acknowledgements.backend, acknowledgements.frontend, acknowledgements.resources],
  );
  const acknowledgementRow1 = useMemo(
    () => acknowledgementItems.filter((_, index) => index % 2 === 0),
    [acknowledgementItems],
  );
  const acknowledgementRow2 = useMemo(
    () => acknowledgementItems.filter((_, index) => index % 2 === 1),
    [acknowledgementItems],
  );

  const changelogItems = useMemo(() => buildChangelogItems(t), [t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] w-[calc(100vw-2rem)] h-[630px] max-h-[84vh] overflow-hidden bg-background border-border text-foreground rounded-[32px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="sr-only">{t("settings.about.title")}</DialogTitle>
        </DialogHeader>

        <div className="w-full h-9 rounded-[16px] bg-muted p-[3px] grid grid-cols-2 gap-0.5 shrink-0">
          <button
            type="button"
            className={`rounded-[12px] text-sm font-medium ${
              activeTab === "about" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("about")}
          >
            {t("settings.about.title", { defaultValue: "About" })}
          </button>
          <button
            type="button"
            className={`rounded-[12px] text-sm font-medium ${
              activeTab === "changelog" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("changelog")}
          >
            {t("changelog.title", { defaultValue: "Changelog" })}
          </button>
        </div>

        <div className="min-h-0 flex-1 pt-3">
          {activeTab === "about" ? (
            <div className="h-full min-h-0 flex flex-col">
              <div className="shrink-0 flex flex-col items-center">
                <img src={aboutIcon} alt="LeafTab" className="h-14 w-14 rounded-xl bg-secondary/40 p-1.5 object-contain" />
                <div className="mt-2 text-lg font-semibold text-foreground text-center">LeafTab</div>
                <div className="mt-0.5 text-xs text-foreground/80 text-center">版本 v{appVersion}</div>
                <div className="mt-0.5 text-xs text-muted-foreground text-center">
                  {t("settings.about.qqGroup", { defaultValue: "交流QQ群：1075260794" })}
                </div>
              </div>

              <div className="mt-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-left w-full">
                  {t("settings.about.content")}
                </p>

                <div className="mt-3 w-full rounded-xl border border-border/70 bg-secondary/30 px-3 py-2 text-xs text-muted-foreground break-words [overflow-wrap:anywhere]">
                  <p>
                    {t("settings.about.openSourceNoticePrefix", { defaultValue: "LeafTab Community Edition is open source under " })}
                    <a
                      href="https://github.com/mason173/LeafTab/blob/main/LICENSE"
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground/90 underline-offset-2 hover:underline"
                    >
                      GNU GPL v3.0 (or later)
                    </a>
                    {t("settings.about.openSourceNoticeSuffix", { defaultValue: ". Issues and PRs are welcome on GitHub." })}
                  </p>
                  <p className="mt-1">
                    {t("settings.about.thirdPartyLicenseNotice", {
                      defaultValue: "Some third-party components follow their own licenses.",
                    })}
                  </p>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-semibold">{t("settings.about.ackTitle")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t("settings.about.ackDesc")}</div>
                  <div className="mt-3 space-y-2 overflow-x-hidden">
                    <InfiniteSlider
                      speed={58}
                      speedOnHover={24}
                      gap={8}
                      className="[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
                    >
                      <div className="flex w-max items-center gap-2">
                        {acknowledgementRow1.map((item) => (
                          <a
                            key={item.url}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-xs text-foreground hover:bg-secondary/70 transition-colors whitespace-nowrap"
                          >
                            {item.name}
                          </a>
                        ))}
                      </div>
                    </InfiniteSlider>

                    <InfiniteSlider
                      reverse
                      speed={52}
                      speedOnHover={22}
                      gap={8}
                      className="[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
                    >
                      <div className="flex w-max items-center gap-2">
                        {acknowledgementRow2.map((item) => (
                          <a
                            key={item.url}
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-xs text-foreground hover:bg-secondary/70 transition-colors whitespace-nowrap"
                          >
                            {item.name}
                          </a>
                        ))}
                      </div>
                    </InfiniteSlider>
                  </div>
                </div>
              </div>

              <div className="shrink-0 mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 pb-1">
                <a
                  href="https://chromewebstore.google.com/detail/leaftab/lfogogokkkpmolbfbklchcbgdiboccdf?hl=zh-CN&gl=DE"
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary/80 transition-all text-[11px] font-medium text-foreground whitespace-nowrap"
                >
                  <RiChromeFill className="w-3.5 h-3.5 shrink-0 text-foreground" />
                  <span className="truncate">{t("settings.about.chromeStore")}</span>
                </a>
                <a
                  href="https://microsoftedge.microsoft.com/addons/detail/leaftab/nfbdmggppgfmfbaddobdhdleppgffphn"
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary/80 transition-all text-[11px] font-medium text-foreground whitespace-nowrap"
                >
                  <RiEdgeFill className="w-3.5 h-3.5 shrink-0 text-foreground" />
                  <span className="truncate">{t("settings.about.edgeStore")}</span>
                </a>
                <a
                  href="https://addons.mozilla.org/zh-CN/firefox/addon/leaftab/"
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary/80 transition-all text-[11px] font-medium text-foreground whitespace-nowrap"
                >
                  <RiFirefoxFill className="w-3.5 h-3.5 shrink-0 text-foreground" />
                  <span className="truncate">{t("settings.about.firefoxStore")}</span>
                </a>
                <a
                  href="https://github.com/mason173/LeafTab"
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary/80 transition-all text-[11px] font-medium text-foreground whitespace-nowrap"
                >
                  <RiGithubFill className="w-3.5 h-3.5 shrink-0 text-foreground" />
                  <span className="truncate">{t("settings.about.github")}</span>
                </a>
              </div>
            </div>
          ) : (
            <ScrollArea
              className="h-full min-h-0"
              scrollBarClassName="data-[orientation=vertical]:translate-x-4"
            >
              <ChangelogTimeline items={changelogItems} language={i18n.language} />
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
