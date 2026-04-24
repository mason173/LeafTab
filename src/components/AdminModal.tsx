import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  RiCloudFill,
  RiDeleteBinLine,
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
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/sonner";
import { BackToSettingsButton } from "@/components/BackToSettingsButton";
import { normalizeApiBase } from "@/utils";
import { UpdateAvailableDialog } from "@/components/UpdateAvailableDialog";
import {
  getDefaultFrostedSurfaceMaterialTokens,
  resetFrostedSurfaceMaterialTokenOverrides,
  updateFrostedSurfaceMaterialTokenOverride,
  useFrostedSurfaceMaterialTokens,
  type FrostedSurfaceMaterialTokens,
} from "@/components/frosted/frostedSurfacePresets";

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
  const materialTokens = useFrostedSurfaceMaterialTokens();
  const defaultMaterialTokens = getDefaultFrostedSurfaceMaterialTokens();

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

  const updateMaterialToken = (
    key: keyof FrostedSurfaceMaterialTokens,
    value: FrostedSurfaceMaterialTokens[keyof FrostedSurfaceMaterialTokens],
  ) => {
    updateFrostedSurfaceMaterialTokenOverride(key, value);
  };

  const renderMaterialSlider = ({
    label,
    description,
    value,
    min,
    max,
    step,
    onChange,
    formatValue,
  }: {
    label: string;
    description: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (next: number) => void;
    formatValue?: (next: number) => string;
  }) => (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-secondary/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col space-y-1 items-start">
          <span className="text-sm font-medium leading-none">{label}</span>
          <span className="font-normal text-xs text-muted-foreground">{description}</span>
        </div>
        <span className="text-xs font-medium tabular-nums text-foreground/72">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => {
          const first = next[0];
          if (typeof first !== "number" || Number.isNaN(first)) return;
          onChange(first);
        }}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85%] overflow-visible bg-background border-border text-foreground rounded-[32px]">
        <DialogHeader className="pb-3 pr-8">
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
                <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => onOpenChange(false)}>
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
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col space-y-1 items-start">
                      <span className="text-sm font-medium leading-none">
                        {t("settings.adminPanel.materialTuningLabel", { defaultValue: "材质调参" })}
                      </span>
                      <span className="font-normal text-xs text-muted-foreground">
                        {t("settings.adminPanel.materialTuningDesc", { defaultValue: "调试全局共享假模糊材质。改动会实时应用到搜索、弹窗、下拉、Popover，不影响文件夹那套。" })}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2 rounded-xl shrink-0"
                      onClick={() => {
                        resetFrostedSurfaceMaterialTokenOverrides();
                        toast.success(t("settings.adminPanel.materialResetAll", { defaultValue: "已重置全部材质调参" }));
                      }}
                    >
                      <RiDeleteBinLine className="size-4" />
                      {t("settings.adminPanel.materialResetAllButton", { defaultValue: "重置全部" })}
                    </Button>
                  </div>

                  {renderMaterialSlider({
                    label: t("settings.adminPanel.materialBlurLabel", { defaultValue: "模糊强度" }),
                    description: t("settings.adminPanel.materialBlurDesc", { defaultValue: "贴片图再次模糊的强度" }),
                    value: materialTokens.sampleBlurPx,
                    min: 0,
                    max: 24,
                    step: 1,
                    onChange: (next) => updateMaterialToken("sampleBlurPx", Math.round(next)),
                  })}

                  {renderMaterialSlider({
                    label: t("settings.adminPanel.materialLightOverlayLabel", { defaultValue: "表面蒙层强度（浅色）" }),
                    description: t("settings.adminPanel.materialLightOverlayDesc", { defaultValue: "控制浅色模式下的白色雾感蒙层" }),
                    value: materialTokens.lightSurfaceOverlayOpacity,
                    min: 0,
                    max: 1,
                    step: 0.01,
                    onChange: (next) => updateMaterialToken("lightSurfaceOverlayOpacity", Number(next.toFixed(2))),
                    formatValue: (next) => next.toFixed(2),
                  })}

                  {renderMaterialSlider({
                    label: t("settings.adminPanel.materialDarkOverlayLabel", { defaultValue: "表面蒙层强度（深色）" }),
                    description: t("settings.adminPanel.materialDarkOverlayDesc", { defaultValue: "控制深色模式下的黑色雾感蒙层" }),
                    value: materialTokens.darkSurfaceOverlayOpacity,
                    min: 0,
                    max: 1,
                    step: 0.01,
                    onChange: (next) => updateMaterialToken("darkSurfaceOverlayOpacity", Number(next.toFixed(2))),
                    formatValue: (next) => next.toFixed(2),
                  })}

                  {renderMaterialSlider({
                    label: t("settings.adminPanel.materialMaskLabel", { defaultValue: "壁纸遮罩参与度" }),
                    description: t("settings.adminPanel.materialMaskDesc", { defaultValue: "控制这块材质吃多少全局壁纸遮罩" }),
                    value: materialTokens.backdropMaskStrength,
                    min: 0,
                    max: 1.5,
                    step: 0.01,
                    onChange: (next) => updateMaterialToken("backdropMaskStrength", Number(next.toFixed(2))),
                    formatValue: (next) => next.toFixed(2),
                  })}

                  {renderMaterialSlider({
                    label: t("settings.adminPanel.materialScaleLabel", { defaultValue: "采样缩放" }),
                    description: t("settings.adminPanel.materialScaleDesc", { defaultValue: "轻微放大背景贴片，让材质更柔和" }),
                    value: materialTokens.sampleScale,
                    min: 1,
                    max: 1.12,
                    step: 0.005,
                    onChange: (next) => updateMaterialToken("sampleScale", Number(next.toFixed(3))),
                    formatValue: (next) => next.toFixed(3),
                  })}

                  {renderMaterialSlider({
                    label: t("settings.adminPanel.materialOverscanLabel", { defaultValue: "采样外扩" }),
                    description: t("settings.adminPanel.materialOverscanDesc", { defaultValue: "扩大背景取样区域，减少大面板边缘穿帮" }),
                    value: materialTokens.sampleOverscanPx,
                    min: 0,
                    max: 160,
                    step: 1,
                    onChange: (next) => updateMaterialToken("sampleOverscanPx", Math.round(next)),
                  })}

                  <div className="flex items-center justify-between space-x-2 rounded-2xl border border-border/70 bg-secondary/20 p-3">
                    <div className="flex flex-col space-y-1 items-start">
                      <span className="text-sm font-medium leading-none">
                        {t("settings.adminPanel.materialBorderLabel", { defaultValue: "边框" })}
                      </span>
                      <span className="font-normal text-xs text-muted-foreground">
                        {t("settings.adminPanel.materialBorderDesc", { defaultValue: `默认值：${defaultMaterialTokens.borderVisible ? "开" : "关"}` })}
                      </span>
                    </div>
                    <Switch
                      id="material-border-visible"
                      checked={materialTokens.borderVisible}
                      onCheckedChange={(checked: boolean) => updateMaterialToken("borderVisible", checked)}
                      className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-input [&_span[data-slot=switch-thumb]]:transition-colors [&_span[data-slot=switch-thumb]]:data-[state=checked]:bg-background [&_span[data-slot=switch-thumb]]:data-[state=unchecked]:bg-foreground"
                    />
                  </div>
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
                      className="border-none text-foreground focus:ring-0 focus:ring-offset-0"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2 rounded-xl shrink-0"
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
                        className="w-[120px] border-none text-foreground focus:ring-0 focus:ring-offset-0"
                      />
                      <Input
                        value={customApiUrlDraft}
                        onChange={(e) => setCustomApiUrlDraft(e.target.value)}
                        placeholder={t("settings.server.customUrlPlaceholder")}
                        className="flex-1 border-none text-foreground focus:ring-0 focus:ring-offset-0"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="gap-2 rounded-xl shrink-0"
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
                      className="flex-1 gap-2 rounded-xl"
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
                      className="gap-2 rounded-xl"
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
