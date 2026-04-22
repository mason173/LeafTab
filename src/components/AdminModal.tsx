import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RiCloudFill,
  RiExternalLinkFill,
  RiRainyFill,
  RiSnowyFill,
  RiSunFill,
  RiThunderstormsFill,
} from "@/icons/ri-compat";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/sonner";
import { BackToSettingsButton } from "@/components/BackToSettingsButton";
import { normalizeApiBase } from "@/utils";
import { UpdateAvailableDialog } from "@/components/UpdateAvailableDialog";

export function AdminModal({
  open,
  onOpenChange,
  onExportDomains,
  gridHitDebugEnabled,
  onGridHitDebugEnabledChange,
  weatherDebugEnabled,
  onWeatherDebugEnabledChange,
  onWeatherDebugApply,
  customApiUrl,
  onCustomApiUrlChange,
  customApiName,
  onCustomApiNameChange,
  allowCustomApiServer = true,
  onBackToSettings,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportDomains: () => void;
  gridHitDebugEnabled: boolean;
  onGridHitDebugEnabledChange: (enabled: boolean) => void;
  weatherDebugEnabled: boolean;
  onWeatherDebugEnabledChange: (enabled: boolean) => void;
  onWeatherDebugApply: (code: number) => void;
  customApiUrl: string;
  onCustomApiUrlChange: (url: string) => void;
  customApiName: string;
  onCustomApiNameChange: (name: string) => void;
  allowCustomApiServer?: boolean;
  onBackToSettings?: () => void;
}) {
  const { t } = useTranslation();
  const [adminModeEnabled, setAdminModeEnabled] = useState(false);
  const [adminKeyDraft, setAdminKeyDraft] = useState<string>(() => (localStorage.getItem("admin_api_key") || "").trim());
  const [adminKey, setAdminKey] = useState<string>(() => (localStorage.getItem("admin_api_key") || "").trim());
  const [customApiNameDraft, setCustomApiNameDraft] = useState<string>(() => (customApiName || "").trim());
  const [customApiUrlDraft, setCustomApiUrlDraft] = useState<string>(() => (customApiUrl || "").trim());
  const [domainQueueCount, setDomainQueueCount] = useState<number>(0);
  const [domainLastFlushAt, setDomainLastFlushAt] = useState<string>("");
  const [updateDebugOpen, setUpdateDebugOpen] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    refreshLocal();
    setCustomApiUrlDraft((customApiUrl || "").trim());
    setCustomApiNameDraft((customApiName || "").trim());
    setUpdateDebugOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85%] overflow-visible bg-background border-border text-foreground rounded-[32px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <BackToSettingsButton onClick={onBackToSettings} />
            <DialogTitle>{t("settings.adminMode.switchLabel")}</DialogTitle>
          </div>
          <DialogDescription>{t("settings.adminMode.switchDesc")}</DialogDescription>
        </DialogHeader>

        <ScrollArea
          className="max-h-[60vh]"
          scrollBarClassName="data-[orientation=vertical]:translate-x-4"
        >
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
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex flex-col space-y-1 items-start">
                    <span className="text-sm font-medium leading-none">
                      {t("settings.adminPanel.gridHitDebugLabel", { defaultValue: "网格命中调试" })}
                    </span>
                    <span className="font-normal text-xs text-muted-foreground">
                      {t("settings.adminPanel.gridHitDebugDesc", { defaultValue: "显示主页网格命中调试悬浮窗（仅当前会话）" })}
                    </span>
                  </div>
                  <Switch
                    id="grid-hit-debug"
                    checked={gridHitDebugEnabled}
                    onCheckedChange={(checked: boolean) => onGridHitDebugEnabledChange(checked)}
                    className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&_span[data-slot=switch-thumb]]:transition-colors [&_span[data-slot=switch-thumb]]:data-[state=checked]:bg-background [&_span[data-slot=switch-thumb]]:data-[state=unchecked]:bg-foreground"
                  />
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
                {weatherDebugEnabled ? (
                  <div className="rounded-2xl border border-border/70 bg-secondary/30 p-2">
                    <div className="grid grid-cols-5 gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => onWeatherDebugApply(0)}
                        title="Sunny"
                      >
                        <RiSunFill className="size-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => onWeatherDebugApply(2)}
                        title="Cloudy"
                      >
                        <RiCloudFill className="size-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => onWeatherDebugApply(61)}
                        title="Rain"
                      >
                        <RiRainyFill className="size-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => onWeatherDebugApply(71)}
                        title="Snow"
                      >
                        <RiSnowyFill className="size-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => onWeatherDebugApply(95)}
                        title="Thunderstorm"
                      >
                        <RiThunderstormsFill className="size-4" />
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between space-x-2">
                  <div className="flex flex-col space-y-1 items-start">
                    <span className="text-sm font-medium leading-none">
                      {t("settings.adminPanel.debugUpdateDialogLabel", { defaultValue: "调试：更新弹窗" })}
                    </span>
                    <span className="font-normal text-xs text-muted-foreground">
                      {t("settings.adminPanel.debugUpdateDialogDesc", { defaultValue: "打开后展示“检查更新”弹窗，方便调试顶部卡片排版" })}
                    </span>
                  </div>
                  <Switch
                    id="debug-update-dialog"
                    checked={updateDebugOpen}
                    onCheckedChange={(checked: boolean) => setUpdateDebugOpen(checked)}
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

                {allowCustomApiServer ? (
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
                ) : null}

                <div className="flex flex-col gap-3 py-1">
                  <div className="flex flex-col space-y-1 items-start">
                    <span className="text-sm font-medium leading-none">
                      {t("settings.iconAssistant.viewerTitle", { defaultValue: t("settings.iconAssistant.downloadTitle") })}
                    </span>
                    <span className="font-normal text-xs text-muted-foreground">
                      {t("settings.iconAssistant.viewerDesc", { defaultValue: t("settings.iconAssistant.downloadDesc") })}
                    </span>
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
                      <RiExternalLinkFill className="size-4" />
                      {t("settings.iconAssistant.viewerButton", { defaultValue: t("settings.iconAssistant.downloadButton") })}
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

        <UpdateAvailableDialog
          open={updateDebugOpen}
          onOpenChange={setUpdateDebugOpen}
          latestVersion=""
          releaseUrl=""
          notes={[]}
          onLater={() => setUpdateDebugOpen(false)}
          debugSample
        />
      </DialogContent>
    </Dialog>
  );
}
