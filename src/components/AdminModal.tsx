import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiDownload2Fill } from "@remixicon/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/sonner";
import { normalizeApiBase } from "@/utils";
import { DEFAULT_ICON_LIBRARY_URL, getIconLibraryUrl, normalizeIconLibraryUrl, setIconLibraryUrl } from "@/utils/iconLibrary";

export function AdminModal({
  open,
  onOpenChange,
  onExportDomains,
  onFetchAdminStats,
  weatherDebugEnabled,
  onWeatherDebugEnabledChange,
  customApiUrl,
  onCustomApiUrlChange,
  customApiName,
  onCustomApiNameChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportDomains: () => void;
  onFetchAdminStats: () => Promise<any>;
  weatherDebugEnabled: boolean;
  onWeatherDebugEnabledChange: (enabled: boolean) => void;
  customApiUrl: string;
  onCustomApiUrlChange: (url: string) => void;
  customApiName: string;
  onCustomApiNameChange: (name: string) => void;
}) {
  const { t } = useTranslation();
  const [adminModeEnabled, setAdminModeEnabled] = useState(false);
  const [adminKeyDraft, setAdminKeyDraft] = useState<string>(() => (localStorage.getItem("admin_api_key") || "").trim());
  const [adminKey, setAdminKey] = useState<string>(() => (localStorage.getItem("admin_api_key") || "").trim());
  const [customApiNameDraft, setCustomApiNameDraft] = useState<string>(() => (customApiName || "").trim());
  const [customApiUrlDraft, setCustomApiUrlDraft] = useState<string>(() => (customApiUrl || "").trim());
  const [iconLibraryUrl, setIconLibraryUrlState] = useState<string>(() => (getIconLibraryUrl() || "").trim());
  const [iconLibraryUrlDraft, setIconLibraryUrlDraft] = useState<string>(() => (getIconLibraryUrl() || "").trim());
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
    const currentIconLibrary = (getIconLibraryUrl() || "").trim();
    setIconLibraryUrlState(currentIconLibrary);
    setIconLibraryUrlDraft(currentIconLibrary);
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
    setCustomApiUrlDraft((customApiUrl || "").trim());
    setCustomApiNameDraft((customApiName || "").trim());
    setIconLibraryUrlDraft((getIconLibraryUrl() || "").trim());
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

  const handleSaveCustomApiUrl = () => {
    const nextName = customApiNameDraft.trim();
    const raw = customApiUrlDraft.trim();
    if (!raw) {
      onCustomApiUrlChange("");
      setCustomApiUrlDraft("");
      onCustomApiNameChange("");
      setCustomApiNameDraft("");
      toast.success(t("settings.server.customCleared"));
      return;
    }
    const normalized = normalizeApiBase(raw);
    if (!normalized) {
      toast.error(t("settings.server.customInvalid"));
      return;
    }
    onCustomApiUrlChange(normalized);
    setCustomApiUrlDraft(normalized);
    onCustomApiNameChange(nextName);
    setCustomApiNameDraft(nextName);
    toast.success(t("settings.server.customSaved"));
  };

  const handleSaveIconLibraryUrl = () => {
    const raw = iconLibraryUrlDraft.trim();
    if (!raw) {
      setIconLibraryUrl('');
      setIconLibraryUrlState(DEFAULT_ICON_LIBRARY_URL);
      setIconLibraryUrlDraft(DEFAULT_ICON_LIBRARY_URL);
      toast.success(t("settings.iconLibrary.restored"));
      return;
    }
    const normalized = normalizeIconLibraryUrl(raw);
    if (!normalized) {
      toast.error(t("settings.iconLibrary.invalid"));
      return;
    }
    if (normalized === DEFAULT_ICON_LIBRARY_URL) {
      setIconLibraryUrl('');
      setIconLibraryUrlState(DEFAULT_ICON_LIBRARY_URL);
      setIconLibraryUrlDraft(DEFAULT_ICON_LIBRARY_URL);
      toast.success(t("settings.iconLibrary.restored"));
      return;
    }
    setIconLibraryUrl(normalized);
    setIconLibraryUrlState(normalized);
    setIconLibraryUrlDraft(normalized);
    toast.success(t("settings.iconLibrary.saved"));
  };

  const handleRestoreDefaultIconLibraryUrl = () => {
    setIconLibraryUrl('');
    setIconLibraryUrlState(DEFAULT_ICON_LIBRARY_URL);
    setIconLibraryUrlDraft(DEFAULT_ICON_LIBRARY_URL);
    toast.success(t("settings.iconLibrary.restored"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85%] bg-background border-border text-foreground rounded-[24px]">
        <DialogHeader>
          <DialogTitle>{t("settings.adminMode.switchLabel")}</DialogTitle>
          <DialogDescription>{t("settings.adminMode.switchDesc")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="flex flex-col gap-3">
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

                <div className="h-px bg-border" />

                <div className="flex flex-col gap-3 py-1">
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

                <div className="flex flex-col gap-3 py-1">
                  <div className="flex flex-col space-y-1 items-start">
                    <span className="text-sm font-medium leading-none">{t("settings.server.customUrlLabel")}</span>
                    <span className="font-normal text-xs text-muted-foreground">{t("settings.server.customUrlDesc")}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={customApiNameDraft}
                      maxLength={10}
                      onChange={(e) => setCustomApiNameDraft(e.target.value.slice(0, 10))}
                      placeholder={t("settings.server.customNamePlaceholder")}
                      className="w-[120px] bg-secondary border-none text-foreground focus:ring-0 focus:ring-offset-0"
                    />
                    <Input
                      value={customApiUrlDraft}
                      onChange={(e) => setCustomApiUrlDraft(e.target.value)}
                      placeholder={t("settings.server.customUrlPlaceholder")}
                      className="flex-1 bg-secondary border-none text-foreground focus:ring-0 focus:ring-offset-0"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2 rounded-xl bg-secondary/50 hover:bg-secondary shrink-0"
                      onClick={handleSaveCustomApiUrl}
                    >
                      {customApiUrlDraft.trim() ? t("settings.server.customSave") : t("settings.server.customClear")}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 py-1">
                  <div className="flex flex-col space-y-1 items-start">
                    <span className="text-sm font-medium leading-none">{t("settings.iconLibrary.label")}</span>
                    <span className="font-normal text-xs text-muted-foreground">{t("settings.iconLibrary.desc")}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={iconLibraryUrlDraft}
                      onChange={(e) => setIconLibraryUrlDraft(e.target.value)}
                      placeholder={t("settings.iconLibrary.placeholder")}
                      className="flex-1 bg-secondary border-none text-foreground focus:ring-0 focus:ring-offset-0"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2 rounded-xl bg-secondary/50 hover:bg-secondary shrink-0"
                      onClick={handleSaveIconLibraryUrl}
                    >
                      {t("settings.iconLibrary.save")}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2 rounded-xl bg-secondary/50 hover:bg-secondary shrink-0"
                      onClick={handleRestoreDefaultIconLibraryUrl}
                    >
                      {t("settings.iconLibrary.restore")}
                    </Button>
                  </div>
                  {iconLibraryUrl ? (
                    <div className="text-[11px] text-muted-foreground/80">{iconLibraryUrl}</div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 py-1">
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
