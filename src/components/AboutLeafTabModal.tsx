import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RiChromeFill, RiEdgeFill, RiFirefoxFill, RiGithubFill } from "@remixicon/react";
import { InfiniteSlider } from "@/components/motion-primitives/infinite-slider";
import { ShinyText } from "@/components/react-bits";
import aboutIcon from "@/assets/abouticon.svg";

export function AboutLeafTabModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const [appVersion, setAppVersion] = useState<string>("—");

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
      { name: "Remix Icon", url: "https://remixicon.com/" },
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
      { name: "Unsplash Photos", url: "https://unsplash.com/" },
      { name: "Unsplash License", url: "https://unsplash.com/license" },
      { name: "shadcn/ui License", url: "https://github.com/shadcn-ui/ui/blob/main/LICENSE.md" },
    ],
  };

  useEffect(() => {
    if (!open) return;
    try {
      if (typeof chrome !== "undefined" && chrome.runtime?.getManifest) {
        const v = chrome.runtime.getManifest().version || "—";
        setAppVersion(v);
        return;
      }
    } catch {}
    try {
      fetch("/manifest.json")
        .then((r) => r.json())
        .then((m) => setAppVersion(m?.version || "—"))
        .catch(() => setAppVersion("—"));
    } catch {
      setAppVersion("—");
    }
  }, [open]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] overflow-visible bg-background border-border text-foreground rounded-[32px]">
        <DialogHeader>
          <DialogTitle className="sr-only">{t("settings.about.title")}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[74vh] overflow-y-auto overflow-x-hidden pr-1">
          <div className="flex flex-col items-center">
            <img src={aboutIcon} alt="LeafTab" className="h-16 w-16" />
            <div className="mt-3 text-lg font-semibold text-center">LeafTab</div>
            <div className="mt-1 text-xs text-muted-foreground text-center">
              <ShinyText text={`v${appVersion}`} className="text-xs" speed={2.2} spread={95} />
            </div>
            <div className="mt-5 text-sm text-muted-foreground whitespace-pre-line text-left w-full">
              {t("settings.about.content")}
            </div>
            <div className="mt-3 w-full rounded-xl border border-border/70 bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
              <p>
                {t("settings.about.openSourceNoticePrefix", { defaultValue: "LeafTab Community Edition is open source under " })}
                <a
                  href="https://github.com/mason173/LeafTab/blob/main/LICENSE"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground/90 underline-offset-2 hover:underline"
                >
                  MIT License
                </a>
                {t("settings.about.openSourceNoticeSuffix", { defaultValue: ". Issues and PRs are welcome on GitHub." })}
              </p>
              <p className="mt-1">
                {t("settings.about.thirdPartyLicenseNotice", {
                  defaultValue: "Some third-party components follow their own licenses (for example, react-bits under MIT + Commons Clause).",
                })}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold">{t("settings.about.ackTitle")}</div>
            <div className="mt-1 text-xs text-muted-foreground">{t("settings.about.ackDesc")}</div>

            <div className="mt-4 space-y-2">
              <InfiniteSlider speed={72} speedOnHover={24} gap={8} className="[mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
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
              <InfiniteSlider reverse speed={66} speedOnHover={22} gap={8} className="[mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
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

          <div className="mt-8 pt-6 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2">
            <a
              href="https://chromewebstore.google.com/detail/leaftab/lfogogokkkpmolbfbklchcbgdiboccdf?hl=zh-CN&gl=DE"
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary/80 transition-all text-[11px] font-medium text-foreground/80 hover:text-foreground"
            >
              <RiChromeFill className="w-3.5 h-3.5" />
              {t("settings.about.chromeStore")}
            </a>
            <a
              href="https://microsoftedge.microsoft.com/addons/detail/leaftab/nfbdmggppgfmfbaddobdhdleppgffphn"
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary/80 transition-all text-[11px] font-medium text-foreground/80 hover:text-foreground"
            >
              <RiEdgeFill className="w-3.5 h-3.5" />
              {t("settings.about.edgeStore")}
            </a>
            <a
              href="https://addons.mozilla.org/zh-CN/firefox/addon/leaftab/"
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary/80 transition-all text-[11px] font-medium text-foreground/80 hover:text-foreground"
            >
              <RiFirefoxFill className="w-3.5 h-3.5" />
              {t("settings.about.firefoxStore")}
            </a>
            <a
              href="https://github.com/mason173/LeafTab"
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full bg-secondary/50 hover:bg-secondary/80 transition-all text-[11px] font-medium text-foreground/80 hover:text-foreground"
            >
              <RiGithubFill className="w-3.5 h-3.5" />
              {t("settings.about.github")}
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
