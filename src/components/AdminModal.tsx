import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiDownload2Fill } from "@remixicon/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

export function AdminModal({
  open,
  onOpenChange,
  onExportDomains,
  onFetchAdminStats,
  weatherDebugEnabled,
  onWeatherDebugEnabledChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportDomains: () => void;
  onFetchAdminStats: () => Promise<any>;
  weatherDebugEnabled: boolean;
  onWeatherDebugEnabledChange: (enabled: boolean) => void;
}) {
  const { t } = useTranslation();
  const [adminModeEnabled, setAdminModeEnabled] = useState(false);
  const [adminKeyDraft, setAdminKeyDraft] = useState<string>(() => (localStorage.getItem("admin_api_key") || "").trim());
  const [adminKey, setAdminKey] = useState<string>(() => (localStorage.getItem("admin_api_key") || "").trim());
  const [domainQueueCount, setDomainQueueCount] = useState<number>(0);
  const [domainLastFlushAt, setDomainLastFlushAt] = useState<string>("");
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminStatsLoading, setAdminStatsLoading] = useState(false);

  const refreshLocal = () => {
    try {
      setAdminModeEnabled(localStorage.getItem("leaftab_admin_mode_enabled") === "true");
    } catch {}
    const current = (localStorage.getItem("admin_api_key") || "").trim();
    setAdminKey(current);
    setAdminKeyDraft(current);
    try {
      const raw = localStorage.getItem("leaftab_domain_queue_v1");
      const parsed = raw ? JSON.parse(raw) : [];
      setDomainQueueCount(Array.isArray(parsed) ? parsed.length : 0);
    } catch {
      setDomainQueueCount(0);
    }
    setDomainLastFlushAt(localStorage.getItem("leaftab_domain_last_flush_at") || "");
  };

  const refreshAdminStats = async () => {
    if (!adminKey) {
      setAdminStats(null);
      return;
    }
    setAdminStatsLoading(true);
    try {
      const data = await onFetchAdminStats();
      setAdminStats(data || null);
    } catch {
      setAdminStats(null);
      toast.error(t("settings.adminPanel.statsLoadFailed"));
    } finally {
      setAdminStatsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    refreshLocal();
    refreshAdminStats();
    const timer = window.setInterval(() => {
      try {
        const raw = localStorage.getItem("leaftab_domain_queue_v1");
        const parsed = raw ? JSON.parse(raw) : [];
        setDomainQueueCount(Array.isArray(parsed) ? parsed.length : 0);
      } catch {
        setDomainQueueCount(0);
      }
      setDomainLastFlushAt(localStorage.getItem("leaftab_domain_last_flush_at") || "");
    }, 3000);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    const onAdminModeChanged = () => {
      try {
        setAdminModeEnabled(localStorage.getItem("leaftab_admin_mode_enabled") === "true");
      } catch {}
    };
    window.addEventListener("leaftab-admin-mode-changed", onAdminModeChanged);
    return () => window.removeEventListener("leaftab-admin-mode-changed", onAdminModeChanged);
  }, []);

  const disableAdminMode = () => {
    try {
      localStorage.setItem("leaftab_admin_mode_enabled", "false");
    } catch {}
    setAdminModeEnabled(false);
    window.dispatchEvent(new Event("leaftab-admin-mode-changed"));
    toast.success(t("settings.adminMode.disabled"));
    onOpenChange(false);
  };

  const handleSaveAdminKey = () => {
    const next = adminKeyDraft.trim();
    try {
      if (!next) {
        localStorage.removeItem("admin_api_key");
        setAdminKey("");
        setAdminKeyDraft("");
        toast.success(t("settings.iconAssistant.adminKeyCleared"));
        return;
      }
      localStorage.setItem("admin_api_key", next);
      setAdminKey(next);
      setAdminKeyDraft(next);
      toast.success(t("settings.iconAssistant.adminKeySaved"));
      refreshAdminStats();
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-background border-border text-foreground rounded-[24px]">
        <DialogHeader>
          <DialogTitle>{t("settings.adminMode.switchLabel")}</DialogTitle>
          <DialogDescription>{t("settings.adminMode.switchDesc")}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between space-x-2">
          <div className="flex flex-col space-y-1 items-start">
            <span className="text-sm font-medium leading-none">{t("settings.adminMode.switchLabel")}</span>
            <span className="font-normal text-xs text-muted-foreground">{t("settings.adminMode.switchDesc")}</span>
          </div>
          <Switch
            id="admin-mode"
            checked={adminModeEnabled}
            onCheckedChange={(checked: boolean) => {
              if (checked) {
                toast(t("settings.adminPanel.enableHint"));
                refreshLocal();
                return;
              }
              disableAdminMode();
            }}
            className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&_span[data-slot=switch-thumb]]:transition-colors [&_span[data-slot=switch-thumb]]:data-[state=checked]:bg-background [&_span[data-slot=switch-thumb]]:data-[state=unchecked]:bg-foreground"
          />
        </div>

        {!adminModeEnabled ? (
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">{t("settings.adminMode.disabled")}</div>
            <Button variant="secondary" size="sm" className="rounded-xl bg-secondary/50 hover:bg-secondary" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t("settings.adminPanel.statsTitle")}</span>
                <span className="font-normal text-xs text-muted-foreground">{t("settings.adminPanel.statsDesc")}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="gap-2 rounded-xl bg-secondary/50 hover:bg-secondary shrink-0"
                disabled={adminStatsLoading}
                onClick={refreshAdminStats}
              >
                {adminStatsLoading ? t("settings.adminPanel.loading") : t("settings.adminPanel.refresh")}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-secondary/30 px-3 py-2">
                <span className="text-muted-foreground">{t("settings.adminPanel.usersTotal")}</span>
                <span className="font-medium">{adminStats?.summary?.users_total ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-secondary/30 px-3 py-2">
                <span className="text-muted-foreground">{t("settings.adminPanel.domainsUnique")}</span>
                <span className="font-medium">{adminStats?.summary?.domains_unique ?? "—"}</span>
              </div>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t("settings.adminPanel.weatherDebugLabel")}</span>
                <span className="font-normal text-xs text-muted-foreground">{t("settings.adminPanel.weatherDebugDesc")}</span>
              </div>
              <Switch
                id="weather-debug"
                checked={weatherDebugEnabled}
                onCheckedChange={(checked: boolean) => onWeatherDebugEnabledChange(checked)}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&_span[data-slot=switch-thumb]]:transition-colors [&_span[data-slot=switch-thumb]]:data-[state=checked]:bg-background [&_span[data-slot=switch-thumb]]:data-[state=unchecked]:bg-foreground"
              />
            </div>

            <div className="flex flex-col gap-3 py-4 border-y border-border">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t("settings.iconAssistant.adminKeyLabel")}</span>
                <span className="font-normal text-xs text-muted-foreground">{t("settings.iconAssistant.adminKeyDesc")}</span>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="password"
                  value={adminKeyDraft}
                  onChange={(e) => setAdminKeyDraft(e.target.value)}
                  placeholder={t("settings.iconAssistant.adminKeyPlaceholder")}
                  className="bg-secondary border-none text-foreground focus:ring-0 focus:ring-offset-0"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2 rounded-xl bg-secondary/50 hover:bg-secondary shrink-0"
                  onClick={handleSaveAdminKey}
                >
                  {adminKeyDraft.trim() ? t("settings.iconAssistant.adminKeySave") : t("settings.iconAssistant.adminKeyClear")}
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 py-4 border-y border-border">
              <div className="flex flex-col space-y-1 items-start">
                <span className="text-sm font-medium leading-none">{t("settings.iconAssistant.downloadTitle")}</span>
                <span className="font-normal text-xs text-muted-foreground">{t("settings.iconAssistant.downloadDesc")}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1 gap-2 rounded-xl bg-secondary/50 hover:bg-secondary"
                  onClick={() => {
                    if (!adminKey) {
                      toast.error(t("settings.iconAssistant.adminKeyRequired"));
                      return;
                    }
                    onExportDomains();
                  }}
                >
                  <RiDownload2Fill className="size-4" />
                  {t("settings.iconAssistant.downloadButton")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2 rounded-xl bg-secondary/50 hover:bg-secondary"
                  onClick={() => {
                    window.dispatchEvent(new Event("leaftab-domains-flush-now"));
                    toast.success(t("settings.iconAssistant.reportTriggered"));
                  }}
                >
                  {t("settings.iconAssistant.reportNow")}
                </Button>
              </div>
              <div className="text-[11px] text-muted-foreground/80">
                {t("settings.iconAssistant.queueStatus", {
                  count: domainQueueCount,
                  last: domainLastFlushAt ? new Date(domainLastFlushAt).toLocaleString() : "—",
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
