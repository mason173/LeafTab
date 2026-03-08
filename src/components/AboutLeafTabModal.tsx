import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-background border-border text-foreground rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="sr-only">{t("settings.about.title")}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[74vh] overflow-auto pr-1">
          <div className="flex flex-col items-center text-center">
            <img src="/icons/icon32.png" alt="LeafTab" className="h-8 w-8" />
            <div className="mt-3 text-lg font-semibold">LeafTab</div>
            <div className="mt-1 text-xs text-muted-foreground">v{appVersion}</div>
            <div className="mt-5 text-sm text-muted-foreground whitespace-pre-line">
              {t("settings.about.content")}
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold">{t("settings.about.ackTitle")}</div>
            <div className="mt-1 text-xs text-muted-foreground">{t("settings.about.ackDesc")}</div>

            <div className="mt-4">
              <div className="text-xs font-medium text-muted-foreground">{t("settings.about.frontend")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {acknowledgements.frontend.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-xs text-foreground hover:bg-secondary/70 transition-colors"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-medium text-muted-foreground">{t("settings.about.backend")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {acknowledgements.backend.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-xs text-foreground hover:bg-secondary/70 transition-colors"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-medium text-muted-foreground">{t("settings.about.resources")}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {acknowledgements.resources.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-border bg-secondary/40 px-2.5 py-1 text-xs text-foreground hover:bg-secondary/70 transition-colors"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
